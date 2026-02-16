/**
 * Règles de validation communes à toutes les catégories
 */
const CommonRules = {
  /**
   * Retourne toutes les règles communes
   * @returns {Array} Liste des fonctions de validation
   */
  getRules() {
    return [
      this.checkDotSeparators,
      this.checkAccentsAndSpecialChars,
      this.checkTeamTag
    ];
  },

  /**
   * Vérifie que les mots sont séparés uniquement par des points
   */
  checkDotSeparators(title) {
    // Vérifie la présence d'espaces
    if (/\s/.test(title)) {
      return {
        rule: '❌ Espaces au lieu de points',
        message: 'Le titre contient des espaces. Les mots doivent être séparés uniquement par des points.',
        suggestion: 'Remplace tous les espaces par des points (.).'
      };
    }
    return null;
  },

  /**
   * Vérifie l'absence d'accents et de caractères spéciaux
   */
  checkAccentsAndSpecialChars(title) {
    // Détecte les accents
    const accents = /[àâäéèêëïîôùûüÿçæœÀÂÄÉÈÊËÏÎÔÙÛÜŸÇÆŒ]/g;
    if (accents.test(title)) {
      return {
        rule: '❌ Présence d\'accents',
        message: 'Le titre contient des accents.',
        suggestion: 'Remplace les caractères accentués par leurs équivalents sans accent (é → e, à → a, etc.).'
      };
    }

    // Détecte les caractères spéciaux (sauf points, tirets, underscore et apostrophes)
    // Exclut aussi les espaces qui sont déjà gérés par checkDotSeparators
    // Exclut le "+" de HDR10+ car il est géré spécifiquement par checkHDR10PlusNotation
    // Exclut les parenthèses et tirets de l'intervalle d'années des collections (YYYY-YYYY)
    const specialChars = /[^\w.\-'\s]/g;
    const matches = title.match(specialChars);

    if (matches) {
      // Filtre les caractères autorisés dans des contextes spécifiques
      const filteredMatches = matches.filter((char, index) => {
        // Filtre le "+" de HDR10+ (géré par une règle spécifique)
        if (char === '+') {
          const position = title.indexOf(char);
          return !title.substring(Math.max(0, position - 5), position).toUpperCase().endsWith('HDR10');
        }

        // Filtre les parenthèses et tiret de l'intervalle d'années dans les collections
        // Format attendu : COLLECTION.(YYYY-YYYY)
        if (char === '(' || char === ')') {
          // Cherche si ce caractère fait partie d'un intervalle d'années valide
          const yearRangePattern = /\((\d{4})-(\d{4})\)/;
          const yearRangeMatch = title.match(yearRangePattern);
          if (yearRangeMatch && yearRangeMatch[0].includes(char)) {
            return false; // Autorisé
          }
        }

        return true;
      });

      if (filteredMatches.length > 0) {
        return {
          rule: '❌ Caractères interdits',
          message: 'Le titre contient des caractères spéciaux non autorisés.',
          suggestion: 'Supprime ou remplace les caractères spéciaux. Seuls les lettres, chiffres, points, tirets et apostrophes sont autorisés (sauf pour l\'intervalle d\'années des collections).'
        };
      }
    }

    return null;
  },

  /**
   * Vérifie la présence du tag de la team à la fin du titre
   */
  checkTeamTag(title) {
    // Extrait le tag après le dernier tiret
    const tagMatch = title.match(/-([^-]+)$/);

    if (!tagMatch) {
      return {
        rule: '❌ Tag manquant',
        message: 'Le titre ne contient pas de tag de team à la fin.',
        suggestion: 'Ajoute le tag de la team à la fin du titre (ex: -TeamName) ou -NOTAG si le tag n\'est pas connu.'
      };
    }

    const tag = tagMatch[1];

    // Vérifie si le tag contient des caractères interdits (points, underscores, espaces, etc.)
    const invalidCharsInTag = /[^A-Za-z0-9]/;
    if (invalidCharsInTag.test(tag)) {
      // Trouve les caractères interdits présents
      const foundChars = tag.match(/[^A-Za-z0-9]/g);
      const uniqueChars = [...new Set(foundChars)].join(' ');

      return {
        rule: `❌ Tag invalide (${uniqueChars})`,
        message: `Le tag de team contient des caractères interdits : ${uniqueChars}`,
        suggestion: 'Reformate le tag de la team pour supprimer les caractères interdits (points, underscores, espaces, etc.). Seuls les lettres et chiffres sont autorisés dans le tag. Exemples : -DreadTeam au lieu de -Dread.Team, -Bender37 au lieu de -Bender_37'
      };
    }

    return null;
  }
};

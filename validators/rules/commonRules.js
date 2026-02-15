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
        rule: 'Séparateur incorrect',
        message: 'Le titre contient des espaces. Les mots doivent être séparés uniquement par des points.',
        suggestion: 'Remplacez tous les espaces par des points (.).'
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
        rule: 'Accents interdits',
        message: 'Le titre contient des accents.',
        suggestion: 'Remplacez les caractères accentués par leurs équivalents sans accent (é → e, à → a, etc.).'
      };
    }

    // Détecte les caractères spéciaux (sauf points, tirets, underscore et apostrophes)
    const specialChars = /[^\w.\-']/g;
    if (specialChars.test(title)) {
      return {
        rule: 'Caractères spéciaux interdits',
        message: 'Le titre contient des caractères spéciaux non autorisés.',
        suggestion: 'Supprimez ou remplacez les caractères spéciaux. Seuls les lettres, chiffres, points, tirets et apostrophes sont autorisés.'
      };
    }

    return null;
  },

  /**
   * Vérifie la présence du tag de la team à la fin du titre
   */
  checkTeamTag(title) {
    // Vérifie si le titre se termine par un tag (format -XXXXX ou -NOTAG)
    // Accepte majuscules, minuscules et chiffres
    const tagPattern = /-[A-Za-z0-9]+$/;

    if (!tagPattern.test(title)) {
      return {
        rule: 'Tag de team manquant',
        message: 'Le titre ne contient pas de tag de team à la fin.',
        suggestion: 'Ajoutez le tag de la team à la fin du titre (ex: -TeamName) ou -NOTAG si le tag n\'est pas connu.'
      };
    }

    return null;
  }
};

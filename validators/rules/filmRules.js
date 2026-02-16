/**
 * Règles de validation spécifiques aux Films
 * Format attendu : [Titre].ANNEE.[Flags?].[Langue].[Résolution].[Source].[Détails?].[Audio].[Vidéo]-[TAG]
 */
const FilmRules = {
  /**
   * Retourne toutes les règles spécifiques aux films
   * @returns {Array} Liste des fonctions de validation
   */
  getRules() {
    return [
      (title) => SharedRules.checkTmdbTitle(title, FilmTitleParser),
      this.checkCollectionYearRange,
      (title) => SharedRules.checkLanguage(title, FilmTitleParser),
      (title) => SharedRules.checkResolution(title, FilmTitleParser),
      (title) => SharedRules.checkSource(title, FilmTitleParser),
      (title) => SharedRules.checkMultiLanguage(title),
      (title) => SharedRules.checkWebDLNotation(title),
      (title) => SharedRules.checkHDR10PlusNotation(title),
      (title) => SharedRules.checkAudioCodec(title, FilmTitleParser),
      (title) => SharedRules.checkVideoCodec(title),
      (title) => SharedRules.checkGPUEncoder(title),
      (title) => SharedRules.checkCodecOrder(title, FilmTitleParser),
      this.checkElementOrder
    ];
  },

  /**
   * Vérifie que les collections ont un intervalle d'années valide
   */
  checkCollectionYearRange(title) {
    const parsed = FilmTitleParser.parse(title);

    // Si c'est une collection
    if (parsed.isCollection) {
      // L'intervalle d'années est obligatoire
      if (!parsed.yearRange) {
        return {
          rule: '❌ Intervalle d\'années manquant',
          message: 'Le mot COLLECTION est détecté mais l\'intervalle d\'années est absent ou invalide.',
          suggestion: 'Pour une collection, l\'intervalle d\'années au format (YYYY-YYYY) est obligatoire juste après le mot COLLECTION. Exemple : Batman.COLLECTION.(1989-2022).MULTI.1080p.BluRay.x264-TAG'
        };
      }

      // Vérifier que l'intervalle est bien formé
      const yearRangeMatch = parsed.yearRange.match(/^\((\d{4})-(\d{4})\)$/);
      if (!yearRangeMatch) {
        return {
          rule: '❌ Format d\'intervalle invalide',
          message: 'L\'intervalle d\'années n\'est pas au bon format.',
          suggestion: 'L\'intervalle d\'années doit être au format (YYYY-YYYY) avec des parenthèses et un tiret. Exemple : (1989-2022)'
        };
      }

      // Vérifier que l'année de début est inférieure à l'année de fin
      const startYear = parseInt(yearRangeMatch[1], 10);
      const endYear = parseInt(yearRangeMatch[2], 10);
      if (startYear >= endYear) {
        return {
          rule: '❌ Intervalle d\'années invalide',
          message: 'L\'année de début doit être inférieure à l\'année de fin.',
          suggestion: `L\'intervalle ${parsed.yearRange} est invalide. L\'année de début (${startYear}) doit être inférieure à l\'année de fin (${endYear}).`
        };
      }
    }
    // Si ce n'est pas une collection, l'année simple est obligatoire
    else if (!parsed.year) {
      return {
        rule: '❌ Année absente ou invalide',
        message: 'L\'année n\'a pas été détectée dans le titre.',
        suggestion: 'L\'année (format YYYY) est obligatoire pour les films. Elle doit être placée juste après le titre. Pour une collection, utilise le format COLLECTION.(YYYY-YYYY).'
      };
    }

    return null;
  },

  /**
   * Vérifie l'ordre correct des éléments dans le titre
   * Format attendu : [Titre].ANNEE.[Flags?].[Langue].[Résolution].[Source].[Détails?].[Audio].[Vidéo]-[TAG]
   * Format collection : [Titre].COLLECTION.(YYYY-YYYY).[Langue].[Résolution].[Source].[Détails?].[Audio].[Vidéo]-[TAG]
   */
  checkElementOrder(title) {
    const parsed = FilmTitleParser.parse(title);

    // Ordre attendu : Année/Collection → Langue → Résolution → Source
    const issues = [];

    // Déterminer l'index de référence (année ou yearRange)
    const yearOrCollectionIndex = parsed.isCollection ? parsed.yearRangeIndex : parsed.yearIndex;

    // 1. La langue doit être après l'année/collection et les flags
    if (parsed.languageIndex !== -1 && yearOrCollectionIndex !== -1) {
      if (parsed.languageIndex < yearOrCollectionIndex) {
        issues.push(parsed.isCollection ?
          'La langue doit être placée après l\'intervalle d\'années' :
          'La langue doit être placée après l\'année');
      }
    }

    if (parsed.languageIndex !== -1 && parsed.flagsIndex.length > 0) {
      const maxFlagIndex = Math.max(...parsed.flagsIndex);
      if (parsed.languageIndex < maxFlagIndex) {
        issues.push('La langue doit être placée après les flags');
      }
    }

    // 2. La résolution doit être après la langue et avant la source
    if (parsed.resolutionIndex !== -1 && parsed.languageIndex !== -1) {
      if (parsed.resolutionIndex < parsed.languageIndex) {
        return {
          rule: '❌ Résolution mal placée',
          message: 'La résolution est mal placée dans le titre.',
          suggestion: 'La résolution doit toujours être après la langue et juste avant la source. Ordre attendu : [Langue].[Résolution].[Source]'
        };
      }
    }

    if (parsed.resolutionIndex !== -1 && parsed.sourceIndex !== -1) {
      if (parsed.resolutionIndex > parsed.sourceIndex) {
        return {
          rule: '❌ Résolution mal placée',
          message: 'La résolution est mal placée dans le titre.',
          suggestion: 'La résolution doit être juste avant la source. Ordre attendu : [Langue].[Résolution].[Source]'
        };
      }
    }

    // 3. La source doit être après la résolution
    if (parsed.sourceIndex !== -1 && parsed.languageIndex !== -1) {
      if (parsed.sourceIndex < parsed.languageIndex) {
        issues.push('La source doit être placée après la langue');
      }
    }

    if (issues.length > 0) {
      return {
        rule: '❌ Ordre des éléments incorrect',
        message: issues.join('. ') + '.',
        suggestion: 'Respecte l\'ordre : [Titre].[Année].[Flags].[Langue].[Résolution].[Source].[Détails].[Audio].[Vidéo]-[TAG]'
      };
    }

    return null;
  }
};

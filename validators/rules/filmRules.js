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
   * Vérifie l'ordre correct des éléments dans le titre
   * Format attendu : [Titre].ANNEE.[Flags?].[Langue].[Résolution].[Source].[Détails?].[Audio].[Vidéo]-[TAG]
   */
  checkElementOrder(title) {
    const parsed = FilmTitleParser.parse(title);

    // Ordre attendu : Année/Flags → Langue → Résolution → Source
    const issues = [];

    // 1. La langue doit être après l'année et les flags
    if (parsed.languageIndex !== -1 && parsed.yearIndex !== -1) {
      if (parsed.languageIndex < parsed.yearIndex) {
        issues.push('La langue doit être placée après l\'année');
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

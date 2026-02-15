/**
 * Règles de validation spécifiques aux Séries
 * Format attendu : [Titre].ANNEE.[Saison/Episode/INTEGRALE].[Flags?].[Langue].[Résolution].[Source].[Détails?].[Audio].[Vidéo]-[TAG]
 */
const SerieRules = {
  /**
   * Retourne toutes les règles spécifiques aux séries
   * @returns {Array} Liste des fonctions de validation
   */
  getRules() {
    return [
      this.checkSeasonEpisode,
      (title) => SharedRules.checkLanguage(title, SerieTitleParser),
      (title) => SharedRules.checkResolution(title, SerieTitleParser),
      (title) => SharedRules.checkSource(title, SerieTitleParser),
      (title) => SharedRules.checkMultiLanguage(title),
      (title) => SharedRules.checkWebDLNotation(title),
      (title) => SharedRules.checkHDR10PlusNotation(title),
      (title) => SharedRules.checkAudioCodec(title, SerieTitleParser),
      (title) => SharedRules.checkVideoCodec(title),
      (title) => SharedRules.checkGPUEncoder(title),
      (title) => SharedRules.checkCodecOrder(title, SerieTitleParser)
    ];
  },

  /**
   * Vérifie la présence du numéro de saison/épisode ou INTEGRALE
   */
  checkSeasonEpisode(title) {
    const parsed = SerieTitleParser.parse(title);

    if (!parsed.seasonEpisode && !parsed.isIntegrale) {
      return {
        rule: '❌ Saison/Episode manquant',
        message: 'Le titre ne contient ni indication de saison/épisode ni le mot INTEGRALE.',
        suggestion: 'Ajoute le numéro de saison (S01, S02...), de saison et épisode (S01E01, S02E05...) ou le mot INTEGRALE pour une série complète.'
      };
    }

    return null;
  }
};

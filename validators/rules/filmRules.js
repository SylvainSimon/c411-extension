/**
 * Règles de validation spécifiques aux Films
 */
const FilmRules = {
  /**
   * Retourne toutes les règles spécifiques aux films
   * @returns {Array} Liste des fonctions de validation
   */
  getRules() {
    return [
      // Ajouter ici les règles spécifiques aux films
      // Exemple : this.checkYearFormat, this.checkQuality, etc.
    ];
  }

  // Exemple de règle spécifique (à décommenter et adapter selon vos besoins)
  /*
  checkYearFormat(title) {
    // Vérifie la présence d'une année au format (YYYY)
    if (!/\(\d{4}\)/.test(title)) {
      return {
        rule: 'Format année',
        message: 'Le titre devrait contenir l\'année de sortie au format (YYYY).',
        suggestion: 'Ajoutez l\'année de sortie du film au format (2024) par exemple.'
      };
    }
    return null;
  }
  */
};

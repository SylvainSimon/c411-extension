/**
 * Factory pour obtenir les bonnes règles de validation selon la catégorie
 */
const ValidatorFactory = {
  /**
   * Obtient les règles de validation pour une catégorie/sous-catégorie donnée
   * @param {Object} categoryInfo - { category: string, subcategory: string }
   * @returns {Array} Liste des fonctions de validation à appliquer
   */
  getRulesForCategory(categoryInfo) {
    const rules = [];

    // Toujours appliquer les règles communes
    rules.push(...CommonRules.getRules());

    // Ajouter les règles spécifiques selon la sous-catégorie
    if (!categoryInfo) {
      return rules;
    }

    switch (categoryInfo.subcategory) {
      case 'Film':
      case 'Animation':
        rules.push(...FilmRules.getRules());
        break;

      case 'Série TV':
      case 'Animation Série':
        rules.push(...SerieRules.getRules());
        break;

      default:
        // Pas de règles spécifiques pour cette sous-catégorie
        break;
    }

    // Possibilité d'ajouter des règles spécifiques à la catégorie principale
    if (categoryInfo.category === 'Films & Vidéos') {
      // rules.push(...FilmsVideosRules.getRules());
    }

    return rules;
  }
};

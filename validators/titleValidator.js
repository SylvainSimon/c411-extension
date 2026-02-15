/**
 * Validation du titre du torrent
 */
const TitleValidator = {
  /**
   * Valide le titre en fonction de la catégorie détectée
   * @param {string} title - Le titre à valider
   * @param {Object} categoryInfo - { category: string, subcategory: string }
   * @returns {Array} Liste des problèmes détectés
   */
  validate(title, categoryInfo) {
    const issues = [];

    // Récupère les règles appropriées selon la catégorie
    const rules = ValidatorFactory.getRulesForCategory(categoryInfo);

    // Applique chaque règle
    rules.forEach(ruleFunction => {
      const result = ruleFunction(title);
      if (result !== null) {
        issues.push(result);
      }
    });

    return issues;
  }
};

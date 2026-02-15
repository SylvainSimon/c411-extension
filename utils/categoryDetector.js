/**
 * Détection de la catégorie et sous-catégorie du torrent
 */
const CategoryDetector = {
  /**
   * Détecte la catégorie et sous-catégorie du torrent actuel
   * @returns {Object|null} { category: string, subcategory: string } ou null si non trouvé
   */
  detect() {
    // Recherche le lien de catégorie avec le format spécifique
    const categoryLink = document.querySelector('a[href^="/torrents?cat="]');

    if (!categoryLink) {
      return null;
    }

    // Récupère les spans contenant la catégorie et sous-catégorie
    const spans = categoryLink.querySelectorAll('span');

    if (spans.length < 2) {
      return null;
    }

    const category = spans[0].textContent.trim();
    const subcategory = spans[1].textContent.trim();

    return {
      category: category,
      subcategory: subcategory
    };
  },

  /**
   * Vérifie si le torrent appartient à une catégorie donnée
   * @param {string} categoryName - Nom de la catégorie à vérifier
   * @returns {boolean}
   */
  isCategory(categoryName) {
    const detected = this.detect();
    return detected && detected.category === categoryName;
  },

  /**
   * Vérifie si le torrent appartient à une sous-catégorie donnée
   * @param {string} subcategoryName - Nom de la sous-catégorie à vérifier
   * @returns {boolean}
   */
  isSubcategory(subcategoryName) {
    const detected = this.detect();
    return detected && detected.subcategory === subcategoryName;
  }
};

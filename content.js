/**
 * Script principal de l'extension C411 Conformité
 * Analyse le titre des torrents et affiche les résultats de validation
 * Gère les changements de page pour les applications SPA (Nuxt/Vue)
 */
(function() {
  'use strict';

  let currentUrl = window.location.href;

  /**
   * Vérifie si on est sur une page de torrent
   */
  function isTorrentPage() {
    return window.location.pathname.startsWith('/torrents/') &&
           window.location.pathname !== '/torrents';
  }

  /**
   * Supprime le panneau s'il existe
   */
  function removePanel() {
    const existingPanel = document.getElementById('c411-compliance-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
  }

  /**
   * Initialise le panneau de conformité
   */
  function initPanel() {
    // Supprime l'ancien panneau s'il existe
    removePanel();

    // Vérifie qu'on est sur une page de torrent
    if (!isTorrentPage()) {
      return;
    }

    // Récupère le titre H1
    const h1Element = document.querySelector('h1');
    if (!h1Element) {
      return;
    }

    const title = h1Element.textContent.trim();

    // Détecte la catégorie et sous-catégorie
    const categoryInfo = CategoryDetector.detect();

    // On ne gère que les films (incluant Animation) et les séries
    const supportedCategories = ['Film', 'Animation', 'Série TV', 'Animation Série'];
    if (!categoryInfo || !supportedCategories.includes(categoryInfo.subcategory)) {
      return;
    }

    // Valide le titre en fonction de la catégorie
    const issues = TitleValidator.validate(title, categoryInfo);

    // Affiche le panneau avec les résultats
    CompliancePanel.create(title, issues, categoryInfo);
  }

  /**
   * Détecte les changements de page dans une SPA
   */
  function observePageChanges() {
    // Écoute les changements d'URL (pour pushState/replaceState)
    const observer = new MutationObserver(() => {
      if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;

        // Petit délai pour laisser Vue/Nuxt charger le contenu
        setTimeout(() => {
          initPanel();
        }, 300);
      }
    });

    // Observe les changements dans le DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Écoute également les événements de navigation
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        initPanel();
      }, 300);
    });
  }

  // Initialisation au chargement
  initPanel();

  // Surveillance des changements de page
  observePageChanges();

})();

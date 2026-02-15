/**
 * Gestion de l'interface du panneau de conformité
 */
const CompliancePanel = {
  /**
   * Crée et affiche le panneau de validation
   * @param {string} title - Le titre analysé
   * @param {Array} issues - Liste des problèmes détectés
   * @param {Object} categoryInfo - Informations sur la catégorie
   */
  create(title, issues, categoryInfo) {
    const panel = document.createElement('div');
    panel.id = 'c411-compliance-panel';

    const isValid = issues.length === 0;

    // Détermine le titre du panneau selon la catégorie
    let panelTitle = 'Vérification du titre';
    let categoryLabel = '';

    if (categoryInfo) {
      categoryLabel = `<div class="c411-meta" style="margin-bottom: 8px;">Catégorie : <strong>${categoryInfo.category}</strong> › <strong>${categoryInfo.subcategory}</strong></div>`;

      // Personnalise le titre selon la sous-catégorie
      switch (categoryInfo.subcategory) {
        case 'Film':
          panelTitle = 'Vérification Film';
          break;
        case 'Série TV':
          panelTitle = 'Vérification Série TV';
          break;
        default:
          panelTitle = `Vérification ${categoryInfo.subcategory}`;
          break;
      }
    }

    let issuesHTML = '';
    if (!isValid) {
      issuesHTML = '<ul class="c411-issues">';
      issues.forEach(issue => {
        issuesHTML += `
          <li class="c411-issue">
            ${issue.rule}
          </li>
        `;
      });
      issuesHTML += '</ul>';
    }

    panel.innerHTML = `
      <div class="c411-head">
        <div class="c411-head-title">${panelTitle}</div>
      </div>
      <div class="c411-body">
        ${categoryLabel}

        ${isValid
          ? '<div class="c411-ok">✓ Le titre est conforme</div>'
          : issuesHTML
        }

        ${!isValid ? `
          <div class="c411-actions">
            <button id="c411-copy-issues">Copier le message d'erreur</button>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(panel);

    // Gestion du bouton de copie
    if (!isValid) {
      this.setupCopyButton(title, issues);
    }
  },

  /**
   * Configure le bouton de copie du message d'erreur
   * @param {string} title - Le titre analysé
   * @param {Array} issues - Liste des problèmes détectés
   */
  setupCopyButton(title, issues) {
    const copyButton = document.getElementById('c411-copy-issues');
    copyButton.addEventListener('click', () => {
      const message = MessageGenerator.generate(title, issues);
      navigator.clipboard.writeText(message).then(() => {
        copyButton.textContent = '✓ Copié !';
        setTimeout(() => {
          copyButton.textContent = 'Copier le message d\'erreur';
        }, 2000);
      });
    });
  },

  /**
   * Échappe les caractères HTML pour éviter les injections
   * @param {string} text - Texte à échapper
   * @returns {string} Texte échappé
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

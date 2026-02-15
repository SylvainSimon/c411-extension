/**
 * Gestion de l'interface du panneau de conformité
 */
const CompliancePanel = {
  /**
   * Crée et affiche le panneau de validation
   * @param {string} title - Le titre analysé
   * @param {Array} issues - Liste des problèmes détectés
   */
  create(title, issues) {
    const panel = document.createElement('div');
    panel.id = 'c411-compliance-panel';

    const isValid = issues.length === 0;

    let issuesHTML = '';
    if (!isValid) {
      issuesHTML = '<ul class="c411-issues">';
      issues.forEach(issue => {
        issuesHTML += `
          <li class="c411-issue">
            <strong>${issue.rule}</strong>
            ${issue.message}
          </li>
        `;
      });
      issuesHTML += '</ul>';
    }

    panel.innerHTML = `
      <div class="c411-head">
        <div class="c411-head-title">Vérification du titre</div>
      </div>
      <div class="c411-body">
        <div class="c411-meta">Titre analysé :</div>
        <div class="c411-title" style="color: #1e293b;">${this.escapeHtml(title)}</div>

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

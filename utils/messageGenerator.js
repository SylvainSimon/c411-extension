/**
 * Génération des messages d'erreur pour l'utilisateur
 */
const MessageGenerator = {
  /**
   * Génère un message formaté avec toutes les erreurs détectées
   * @param {string} title - Le titre analysé
   * @param {Array} issues - Liste des problèmes détectés
   * @returns {string} Message formaté prêt à être copié
   */
  generate(title, issues) {
    let message = `Salut,\n\n`;
    message += `Merci pour ta participation et d'avoir proposé ce torrent ! `;
    message += `Cependant, on a détecté quelques erreurs dans le nommage :\n\n`;

    issues.forEach((issue, index) => {
      message += `${index + 1}. ${issue.rule} : ${issue.suggestion}\n`;
    });

    message += `\nN'hésite pas à consulter les règles de nommage complètes sur https://c411.org/wiki/nommage\n\n`;
    message += `Une fois les modifications effectuées, ton torrent sera de nouveau analysé pour validation. `;
    message += `Merci de bien vérifier toutes les règles pour gagner du temps pour toi et pour les autres, `;
    message += `car il y a beaucoup de torrents à valider !`;

    return message;
  }
};

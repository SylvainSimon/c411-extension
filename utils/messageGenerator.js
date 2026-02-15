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
    let message = `Bonjour,\n\nLe titre de votre torrent présente les problèmes suivants :\n\n`;

    issues.forEach((issue, index) => {
      message += `${index + 1}. ${issue.rule} : ${issue.suggestion}\n`;
    });

    message += `\nTitre actuel : "${title}"\n\nMerci de corriger ces problèmes.`;

    return message;
  }
};

/**
 * Analyseur d'URL pour l'extension
 */
export const UrlParser = {
  /**
   * Vérifie si on est sur une page de profil utilisateur
   */
  isUserProfilePage(): boolean {
    const path = window.location.pathname;
    return path.startsWith('/user/') || path.startsWith('/users/');
  },

  /**
   * Extrait le pseudo depuis l'URL (ex: corridor depuis /user/corridor)
   */
  getUsernameFromUrl(): string | null {
    const match = window.location.pathname.match(/\/(?:user|users)\/([^/]+)/);
    // On ignore si c'est un ID numérique pur (cas rares d'anciennes URLs)
    if (match && isNaN(match[1] as any)) {
      return match[1];
    }
    return null;
  }
};

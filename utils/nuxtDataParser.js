/**
 * Utilitaire pour extraire des données du JSON __NUXT_DATA__
 */
const NuxtDataParser = {
  /**
   * Récupère l'ID de l'utilisateur depuis le profil visité
   * @returns {number|null} L'ID de l'utilisateur ou null si non trouvé
   */
  getUserId() {
    try {
      const scriptElement = document.getElementById('__NUXT_DATA__');
      if (!scriptElement) {
        console.warn('[NuxtDataParser] Élément __NUXT_DATA__ non trouvé');
        return null;
      }

      const jsonData = JSON.parse(scriptElement.textContent);

      // Dans le JSON Nuxt, l'ID utilisateur est stocké comme une valeur numérique
      // qui précède directement le username dans le tableau
      // Structure: [..., ID_NUMBER, "username_string", ...]

      // Récupère le username depuis l'URL
      const pathParts = window.location.pathname.split('/');
      const usernameFromUrl = pathParts[pathParts.length - 1];

      const findUserId = (arr, depth = 0) => {
        if (depth > 20) return null; // Limite de profondeur pour éviter les boucles infinies

        for (let i = 0; i < arr.length; i++) {
          // Si on trouve le username dans le tableau
          if (arr[i] === usernameFromUrl) {
            console.log('[NuxtDataParser] Username trouvé à l\'index', i, 'dans le tableau');

            // L'ID est généralement juste avant le username (index i-1)
            // Vérifie d'abord la position directement avant
            if (i > 0 && typeof arr[i - 1] === 'number' && arr[i - 1] > 100) {
              console.log('[NuxtDataParser] ID trouvé directement avant username:', arr[i - 1]);
              return arr[i - 1];
            }

            // Sinon cherche dans les 15 positions précédentes
            for (let j = i - 2; j >= Math.max(0, i - 15); j--) {
              if (typeof arr[j] === 'number' && arr[j] > 100) {
                console.log('[NuxtDataParser] ID trouvé à l\'index', j, ':', arr[j]);
                return arr[j];
              }
            }

            console.warn('[NuxtDataParser] Username trouvé mais aucun ID valide dans les 15 positions précédentes');
          }

          // Recherche récursive dans les sous-tableaux
          if (Array.isArray(arr[i])) {
            const result = findUserId(arr[i], depth + 1);
            if (result !== null) return result;
          }
        }
        return null;
      };

      const userId = findUserId(jsonData);

      if (userId) {
        console.log('[NuxtDataParser] ID utilisateur trouvé:', userId);
        return userId;
      } else {
        console.warn('[NuxtDataParser] Impossible de trouver l\'ID utilisateur');
        return null;
      }

    } catch (error) {
      console.error('[NuxtDataParser] Erreur lors du parsing:', error);
      return null;
    }
  },

  /**
   * Vérifie si on est sur une page de profil utilisateur
   * @returns {boolean}
   */
  isUserProfilePage() {
    return window.location.pathname.startsWith('/user/');
  }
};

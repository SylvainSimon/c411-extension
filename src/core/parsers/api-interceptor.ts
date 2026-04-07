/**
 * Intercepteur API via PerformanceObserver
 */
export const ApiInterceptor = {
  capturedUserId: null as number | null,

  isUserProfilePage(): boolean {
    const path = window.location.pathname;
    return path.startsWith('/user/') || path.startsWith('/users/');
  },

  getUserIdFromUrl(): number | null {
    const match = window.location.pathname.match(/\/(?:user|users)\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  },

  /**
   * Récupère l'ID utilisateur
   */
  async getUserId(): Promise<number | null> {
    if (this.capturedUserId) return this.capturedUserId;
    
    // Fallback sur l'URL
    const idFromUrl = this.getUserIdFromUrl();
    if (idFromUrl) return idFromUrl;

    // Sinon on attend un peu (capture asynchrone)
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (this.capturedUserId) {
          clearInterval(interval);
          resolve(this.capturedUserId);
        } else if (attempts > 20) { // 2 secondes max
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    });
  },

  clearCache() {
    this.capturedUserId = null;
  },

  init() {
    console.log('[ApiInterceptor] Initialisation...');
    
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const url = entry.name;
        // Recherche des appels aux rangs utilisateur qui contiennent l'ID
        const userRankMatch = url.match(/\/api\/ranks\/user\/(\d+)/);
        if (userRankMatch) {
          const userId = parseInt(userRankMatch[1], 10);
          this.capturedUserId = userId;
          // Partage via window pour les autres bundles
          (window as any).__c411_captured_user_id = userId;
          console.log('[ApiInterceptor] ID Utilisateur capturé via API:', userId);
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  }
};

// Récupération initiale si déjà présent sur window
if ((window as any).__c411_captured_user_id) {
  ApiInterceptor.capturedUserId = (window as any).__c411_captured_user_id;
}

// Auto-initialisation car chargé à document_start
ApiInterceptor.init();

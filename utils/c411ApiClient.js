/**
 * Client API pour C411 - utilise le contexte et cookies du site
 */
const C411ApiClient = {
  /**
   * Récupère le CSRF token depuis le DOM ou les cookies
   * @returns {string|null}
   */
  getCsrfToken() {
    try {
      // Méthode 1: Chercher dans les meta tags
      const metaCsrf = document.querySelector('meta[name="csrf-token"]');
      if (metaCsrf) {
        return metaCsrf.getAttribute('content');
      }

      // Méthode 2: Chercher dans __NUXT_DATA__
      const scriptElement = document.getElementById('__NUXT_DATA__');
      if (scriptElement) {
        const content = scriptElement.textContent;
        // Chercher un pattern qui ressemble à un CSRF token
        const csrfMatch = content.match(/"csrf[^"]*":"([^"]+)"/i);
        if (csrfMatch) {
          return csrfMatch[1];
        }
      }

      // Méthode 3: Chercher dans les cookies
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === '__csrf') {
          return decodeURIComponent(value);
        }
      }

      console.warn('[C411ApiClient] CSRF token non trouvé');
      return null;
    } catch (error) {
      console.error('[C411ApiClient] Erreur lors de la récupération du CSRF token:', error);
      return null;
    }
  },

  /**
   * Appel API générique
   * @param {string} endpoint - L'endpoint de l'API (ex: '/api/users/123/downloads')
   * @param {Object} options - Options fetch supplémentaires
   * @returns {Promise<any>}
   */
  async call(endpoint, options = {}) {
    const csrfToken = this.getCsrfToken();

    const defaultOptions = {
      method: 'GET',
      credentials: 'include', // Inclut automatiquement les cookies
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(csrfToken && { 'csrf-token': csrfToken }),
        ...options.headers
      }
    };

    const fetchOptions = { ...defaultOptions, ...options };

    try {
      const url = endpoint.startsWith('http') ? endpoint : `https://c411.org${endpoint}`;
      console.log('[C411ApiClient] Appel API:', url);

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        console.error('[C411ApiClient] Erreur HTTP:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('[C411ApiClient] Réponse reçue:', data);
      return data;

    } catch (error) {
      console.error('[C411ApiClient] Erreur lors de l\'appel API:', error);
      return null;
    }
  },

  /**
   * Récupère les téléchargements d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} params - Paramètres de pagination/tri
   * @returns {Promise<Object|null>}
   */
  async getUserDownloads(userId, params = {}) {
    const {
      page = 1,
      perPage = 20,
      sortBy = 'uploaded',
      sortOrder = 'desc'
    } = params;

    const endpoint = `/api/users/${userId}/downloads?page=${page}&perPage=${perPage}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    return await this.call(endpoint);
  },

  /**
   * Récupère les informations d'un torrent
   * @param {string} infoHash - Hash du torrent
   * @returns {Promise<Object|null>}
   */
  async getTorrentInfo(infoHash) {
    const endpoint = `/api/torrents/${infoHash}`;
    return await this.call(endpoint);
  },

  /**
   * Récupère les snatchers d'un torrent avec pagination automatique
   * @param {string} infoHash - Hash du torrent
   * @returns {Promise<Array>} Liste de tous les snatchers
   */
  async getTorrentSnatchers(infoHash) {
    let allSnatchers = [];
    let page = 1;
    let totalPages = 1;

    console.log(`[C411ApiClient] Récupération des snatchers pour ${infoHash}...`);

    while (page <= totalPages) {
      const endpoint = `/api/torrents/${infoHash}/snatchers?page=${page}&perPage=50&sortBy=uploaded&sortOrder=desc`;
      const response = await this.call(endpoint);

      if (!response || !response.data) {
        console.error(`[C411ApiClient] Erreur lors de la récupération des snatchers page ${page}`);
        break;
      }

      allSnatchers = allSnatchers.concat(response.data);
      totalPages = response.meta.totalPages;
      page++;

      // Petit délai pour ne pas surcharger l'API
      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[C411ApiClient] ${allSnatchers.length} snatchers récupérés`);
    return allSnatchers;
  },

  /**
   * Trouve les données précises d'un utilisateur pour un torrent spécifique
   * @param {string} infoHash - Hash du torrent
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Object|null>} Données du snatcher ou null
   */
  async findUserSnatcherData(infoHash, userId) {
    const snatchers = await this.getTorrentSnatchers(infoHash);
    return snatchers.find(s => s.userId === userId) || null;
  },

  /**
   * Récupère TOUS les téléchargements d'un utilisateur (pagination automatique)
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} params - Paramètres de tri
   * @returns {Promise<Array>} Tous les téléchargements
   */
  async getAllUserDownloads(userId, params = {}) {
    const {
      sortBy = 'uploaded',
      sortOrder = 'desc'
    } = params;

    let allDownloads = [];
    let page = 1;
    let totalPages = 1;

    console.log('[C411ApiClient] Récupération de tous les téléchargements...');

    while (page <= totalPages) {
      console.log(`[C411ApiClient] Page ${page}/${totalPages}`);

      const response = await this.getUserDownloads(userId, {
        page,
        perPage: 50,
        sortBy,
        sortOrder
      });

      if (!response || !response.data) {
        console.error('[C411ApiClient] Erreur lors de la récupération de la page', page);
        break;
      }

      allDownloads = allDownloads.concat(response.data);
      totalPages = response.meta.totalPages;
      page++;

      // Petit délai pour ne pas surcharger l'API
      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`[C411ApiClient] ${allDownloads.length} téléchargements récupérés`);
    return allDownloads;
  },

  /**
   * Analyse les téléchargements et trouve les torrents suspects
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} thresholds - Seuils de détection
   * @returns {Promise<Object>} Statistiques et torrents suspects
   */
  async analyzeSuspiciousDownloads(userId, thresholds = {}) {
    const {
      minRatio = 50,           // Ratio minimum pour être suspect
      minUploadedTB = 2,       // Upload minimum en TB pour être suspect
    } = thresholds;

    console.log('[C411ApiClient] Analyse des téléchargements suspects...');
    console.log('[C411ApiClient] Seuils:', { minRatio, minUploadedTB });

    const downloads = await this.getAllUserDownloads(userId, {
      sortBy: 'uploaded',
      sortOrder: 'desc'
    });

    if (!downloads || downloads.length === 0) {
      console.warn('[C411ApiClient] Aucun téléchargement trouvé');
      return null;
    }

    const ONE_TB = 1024 * 1024 * 1024 * 1024; // 1 TB en octets
    const suspiciousTorrents = [];
    let totalUploaded = 0;
    let totalDownloaded = 0;

    // Analyse chaque téléchargement
    for (const download of downloads) {
      totalUploaded += download.uploaded;
      totalDownloaded += download.size;

      // Évite la division par zéro
      if (download.size === 0) continue;

      const ratio = download.uploaded / download.size;
      const uploadedTB = download.uploaded / ONE_TB;

      // Calcule le temps écoulé depuis le téléchargement
      const downloadedAt = new Date(download.downloadedAt);
      const now = new Date();
      const elapsedSeconds = (now - downloadedAt) / 1000;
      const elapsedHours = elapsedSeconds / 3600;
      const elapsedDays = elapsedHours / 24;

      // Calcule le débit moyen d'upload (en octets par seconde)
      const uploadSpeedBps = elapsedSeconds > 0 ? download.uploaded / elapsedSeconds : 0;
      const uploadSpeedMbps = (uploadSpeedBps * 8) / (1024 * 1024); // Convertit en Mbps

      // Critères de suspicion
      const isSuspiciousRatio = ratio >= minRatio;
      const isSuspiciousUpload = uploadedTB >= minUploadedTB;
      const isSuspiciousSpeed = uploadSpeedMbps > 1000; // Plus de 1 Gbps en moyenne est suspect

      if (isSuspiciousRatio || isSuspiciousUpload || isSuspiciousSpeed) {
        // Prépare l'objet avec les données de base
        const suspiciousData = {
          ...download,
          ratio: ratio,
          ratioFormatted: ratio.toFixed(2),
          uploadedTB: uploadedTB.toFixed(2),
          elapsedDays: elapsedDays.toFixed(1),
          uploadSpeedMbps: uploadSpeedMbps.toFixed(0),
          suspicionReasons: [
            isSuspiciousRatio && `Ratio élevé (${ratio.toFixed(2)})`,
            isSuspiciousUpload && `Upload élevé (${uploadedTB.toFixed(2)} TB)`,
            isSuspiciousSpeed && `Débit suspect (${uploadSpeedMbps.toFixed(0)} Mbps)`
          ].filter(Boolean),
          snatcherData: null, // Sera rempli plus tard
          hasSnatcherData: false
        };

        suspiciousTorrents.push(suspiciousData);
      }
    }

    // Récupère les données précises des snatchers pour les torrents suspects
    console.log(`[C411ApiClient] Récupération des données snatchers pour ${suspiciousTorrents.length} torrents suspects...`);
    for (const suspiciousTorrent of suspiciousTorrents) {
      try {
        const snatcherData = await this.findUserSnatcherData(suspiciousTorrent.infoHash, userId);

        if (snatcherData) {
          // Recalcule avec les données précises
          const actualUploaded = snatcherData.actualUploaded;
          const actualDownloaded = snatcherData.actualDownloaded || suspiciousTorrent.size;
          const actualRatio = actualDownloaded > 0 ? actualUploaded / actualDownloaded : -1;

          // Calcule le temps écoulé entre firstAction et lastAction (dernière réannonce)
          const firstAction = new Date(snatcherData.firstAction);
          const lastAction = new Date(snatcherData.lastAction);
          const elapsedSeconds = (lastAction - firstAction) / 1000;
          const elapsedDays = elapsedSeconds / (3600 * 24);

          // Utilise seedingTime (temps réel de seed) pour calculer le débit réel nécessaire
          // seedingTime est en secondes et représente le temps effectif où l'utilisateur a seedé
          const seedingTimeSeconds = snatcherData.seedingTime || 0;
          const seedingTimeDays = seedingTimeSeconds / (3600 * 24);

          // Calcule le débit moyen basé sur le temps de seed réel
          const uploadSpeedBps = seedingTimeSeconds > 0 ? actualUploaded / seedingTimeSeconds : 0;
          const uploadSpeedMbps = (uploadSpeedBps * 8) / (1024 * 1024);

          // Met à jour les données
          suspiciousTorrent.snatcherData = snatcherData;
          suspiciousTorrent.hasSnatcherData = true;
          suspiciousTorrent.actualUploaded = actualUploaded;
          suspiciousTorrent.actualDownloaded = actualDownloaded;
          suspiciousTorrent.actualRatio = actualRatio;
          suspiciousTorrent.actualRatioFormatted = actualRatio >= 0 ? actualRatio.toFixed(2) : 'N/A';
          suspiciousTorrent.elapsedDays = elapsedDays.toFixed(1);
          suspiciousTorrent.seedingTimeDays = seedingTimeDays.toFixed(1);
          suspiciousTorrent.uploadSpeedMbps = uploadSpeedMbps.toFixed(0);
          suspiciousTorrent.firstAction = snatcherData.firstAction;
          suspiciousTorrent.lastAction = snatcherData.lastAction;
          suspiciousTorrent.completedAt = snatcherData.completedAt;
          suspiciousTorrent.seedingTime = snatcherData.seedingTime;

          console.log(`[C411ApiClient] Données snatcher trouvées pour ${suspiciousTorrent.name.substring(0, 50)}...`);
        } else {
          console.warn(`[C411ApiClient] Utilisateur non trouvé dans les snatchers pour ${suspiciousTorrent.infoHash}`);
        }
      } catch (error) {
        console.error(`[C411ApiClient] Erreur lors de la récupération des snatchers pour ${suspiciousTorrent.infoHash}:`, error);
      }

      // Petit délai entre chaque appel
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Trie par ratio décroissant
    suspiciousTorrents.sort((a, b) => b.ratio - a.ratio);

    // Calcule un score de suspicion global
    // Plus il y a de torrents suspects, plus le score est élevé
    const suspicionScore = this.calculateSuspicionScore(suspiciousTorrents, downloads.length);

    const result = {
      totalDownloads: downloads.length,
      totalUploaded,
      totalDownloaded,
      globalRatio: totalDownloaded > 0 ? (totalUploaded / totalDownloaded).toFixed(2) : '0',
      suspiciousTorrents,
      mostSuspicious: suspiciousTorrents[0] || null,
      suspicionScore: suspicionScore.score,
      suspicionLevel: suspicionScore.level,
      suspicionMessage: suspicionScore.message
    };

    console.log('[C411ApiClient] Analyse terminée:', {
      totalDownloads: result.totalDownloads,
      suspiciousCount: suspiciousTorrents.length,
      globalRatio: result.globalRatio,
      suspicionScore: result.suspicionScore,
      suspicionLevel: result.suspicionLevel
    });

    return result;
  },

  /**
   * Calcule un score de suspicion basé sur le nombre et la gravité des torrents suspects
   * @param {Array} suspiciousTorrents - Liste des torrents suspects
   * @param {number} totalDownloads - Nombre total de téléchargements
   * @returns {Object} Score, niveau et message
   */
  calculateSuspicionScore(suspiciousTorrents, totalDownloads) {
    if (suspiciousTorrents.length === 0) {
      return { score: 0, level: 'clean', message: 'Aucun comportement suspect' };
    }

    const suspectCount = suspiciousTorrents.length;
    const suspectPercentage = (suspectCount / totalDownloads) * 100;

    // Calcule un score basé sur:
    // - Le nombre de torrents suspects
    // - Le pourcentage de torrents suspects
    // - La moyenne des ratios suspects
    const avgSuspiciousRatio = suspiciousTorrents.reduce((sum, t) => sum + t.ratio, 0) / suspectCount;

    let score = 0;
    score += suspectCount * 10; // 10 points par torrent suspect
    score += suspectPercentage * 2; // Bonus si beaucoup de torrents sont suspects
    score += Math.min(avgSuspiciousRatio, 200) / 2; // Bonus basé sur le ratio moyen (max 100)

    // Détermine le niveau de suspicion et message adapté
    let level, message;
    if (score >= 150) {
      level = 'critical';
      message = suspectCount > 1
        ? 'Triche très probable - Multiples torrents suspects'
        : 'Triche très probable - Upload extrêmement suspect';
    } else if (score >= 80) {
      level = 'high';
      message = suspectCount > 1
        ? 'Comportement très suspect - Plusieurs torrents problématiques'
        : 'Comportement très suspect - Investigation recommandée';
    } else if (score >= 40) {
      level = 'medium';
      message = suspectCount > 1
        ? 'Comportement suspect - Plusieurs torrents à surveiller'
        : 'Comportement suspect - À surveiller';
    } else {
      level = 'low';
      message = 'Légèrement suspect';
    }

    return {
      score: Math.round(score),
      level,
      message
    };
  }
};

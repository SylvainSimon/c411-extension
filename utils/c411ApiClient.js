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
   * Récupère l'historique des snatches d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} params - Paramètres de pagination/tri
   * @returns {Promise<Object|null>}
   */
  async getUserSnatchHistory(userId, params = {}) {
    const {
      page = 1,
      perPage = 50,
      sortBy = 'lastAction',
      sortOrder = 'desc'
    } = params;

    const endpoint = `/api/users/${userId}/snatch-history?page=${page}&perPage=${perPage}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    return await this.call(endpoint);
  },

  /**
   * Récupère TOUT l'historique des snatches d'un utilisateur (pagination automatique)
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} params - Paramètres de tri
   * @returns {Promise<Array>} Tous les snatches
   */
  async getAllUserSnatchHistory(userId, params = {}) {
    const {
      sortBy = 'lastAction',
      sortOrder = 'desc'
    } = params;

    let allSnatches = [];
    let page = 1;
    let totalPages = 1;

    console.log('[C411ApiClient] Récupération de tout l\'historique des snatches...');

    while (page <= totalPages) {
      console.log(`[C411ApiClient] Page ${page}/${totalPages}`);

      const response = await this.getUserSnatchHistory(userId, {
        page,
        perPage: 50,
        sortBy,
        sortOrder
      });

      if (!response || !response.data) {
        console.error('[C411ApiClient] Erreur lors de la récupération de la page', page);
        break;
      }

      allSnatches = allSnatches.concat(response.data);
      totalPages = response.meta.totalPages;
      page++;

      // Petit délai pour ne pas surcharger l'API
      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`[C411ApiClient] ${allSnatches.length} snatches récupérés`);
    return allSnatches;
  },

  /**
   * Analyse l'historique des snatches et trouve les torrents suspects
   * @param {number} userId - ID de l'utilisateur
   * @param {Object} thresholds - Seuils de détection
   * @returns {Promise<Object>} Statistiques et torrents suspects
   */
  async analyzeSuspiciousDownloads(userId, thresholds = {}) {
    const {
      minRatio = 25,           // Ratio minimum pour être suspect (25+ est très suspect)
      minUploadedTB = null,    // Désactivé par défaut, le ratio suffit
    } = thresholds;

    console.log('[C411ApiClient] Analyse des snatches suspects...');
    console.log('[C411ApiClient] Seuils:', { minRatio, minUploadedTB: minUploadedTB || 'désactivé' });

    const snatches = await this.getAllUserSnatchHistory(userId, {
      sortBy: 'lastAction',
      sortOrder: 'desc'
    });

    if (!snatches || snatches.length === 0) {
      console.warn('[C411ApiClient] Aucun snatch trouvé');
      return null;
    }

    const ONE_TB = 1024 * 1024 * 1024 * 1024; // 1 TB en octets
    const suspiciousTorrents = [];
    let totalUploaded = 0;
    let totalDownloaded = 0;

    // Première passe : calcule tous les débits pour analyse statistique
    const speedsData = [];
    for (const snatch of snatches) {
      if (snatch.size === 0 || snatch.actualUploaded === 0) continue;

      const firstAction = new Date(snatch.firstAction);
      const lastAction = new Date(snatch.lastAction);
      const elapsedSeconds = Math.max((lastAction - firstAction) / 1000, 60);
      const uploadSpeedBps = snatch.actualUploaded / elapsedSeconds;
      const uploadSpeedMbps = (uploadSpeedBps * 8) / (1024 * 1024);

      speedsData.push({
        torrentId: snatch.torrentId,
        speedMbps: uploadSpeedMbps
      });
    }

    // Calcule la médiane et l'écart-type des débits
    let medianSpeed = 0;
    let avgSpeed = 0;
    let stdDevSpeed = 0;

    if (speedsData.length > 0) {
      const sortedSpeeds = speedsData.map(d => d.speedMbps).sort((a, b) => a - b);
      medianSpeed = sortedSpeeds[Math.floor(sortedSpeeds.length / 2)];
      avgSpeed = sortedSpeeds.reduce((sum, s) => sum + s, 0) / sortedSpeeds.length;

      // Écart-type
      const variance = sortedSpeeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / sortedSpeeds.length;
      stdDevSpeed = Math.sqrt(variance);
    }

    console.log('[C411ApiClient] Statistiques de débit:', {
      medianSpeed: medianSpeed.toFixed(2) + ' Mbps',
      avgSpeed: avgSpeed.toFixed(2) + ' Mbps',
      stdDevSpeed: stdDevSpeed.toFixed(2) + ' Mbps',
      totalSnatches: speedsData.length
    });

    // Deuxième passe : analyse chaque snatch avec détection d'anomalie de débit
    for (const snatch of snatches) {
      totalUploaded += snatch.actualUploaded;
      totalDownloaded += snatch.size;

      // Évite la division par zéro
      if (snatch.size === 0) continue;

      // Calcule les deux types de ratio pour affichage
      const ratioBasedOnSize = snatch.actualUploaded / snatch.size; // Ratio basé sur taille du fichier
      const ratioBasedOnDownload = snatch.ratio; // Ratio API basé sur actualDownloaded

      // Pour la détection de suspicion, utilise le ratio le plus pertinent :
      // - Si completed = true : utilise ratioBasedOnSize (cas où l'utilisateur avait déjà le fichier)
      // - Si completed = false ET ratio API valide (>= 0) : utilise ratioBasedOnDownload (téléchargement partiel suspect)
      // - Sinon (ratio API = -1 ou invalide) : utilise ratioBasedOnSize
      const ratio = snatch.completed || snatch.ratio < 0
        ? ratioBasedOnSize
        : ratioBasedOnDownload;
      const uploadedTB = snatch.actualUploaded / ONE_TB;

      // Détecte si le téléchargement dépasse la taille du torrent
      const downloadRatio = snatch.size > 0 ? snatch.actualDownloaded / snatch.size : 0;

      // Vérifie si c'est un multiple entier (téléchargements multiples légitimes)
      // Ex: 2.00x, 3.00x, 4.00x (avec marge de 5% pour les arrondis)
      const toleranceMargin = 0.05; // 5%
      const nearestMultiple = Math.round(downloadRatio);
      const isNearMultiple = nearestMultiple > 1 &&
                             Math.abs(downloadRatio - nearestMultiple) <= toleranceMargin;

      // Suspect si dépasse ET n'est pas un multiple entier ET qu'il y a de l'upload
      // Si actualUploaded = 0, l'anomalie de download n'est pas importante (pas de triche possible)
      const downloadExceedsTorrentSize = snatch.actualUploaded > 0 &&
                                          downloadRatio > (1 + toleranceMargin) &&
                                          !isNearMultiple;
      const isMultipleDownload = isNearMultiple && nearestMultiple > 1;

      // Calcule le temps écoulé entre firstAction et lastAction (période totale)
      const firstAction = new Date(snatch.firstAction);
      const lastAction = new Date(snatch.lastAction);
      const elapsedMs = lastAction - firstAction;
      const elapsedSeconds = elapsedMs / 1000;

      // Utilise seedingTime (temps réel de seed) pour calculer le débit réel nécessaire
      const seedingTimeSeconds = snatch.seedingTime || 0;

      // Calcul du débit moyen sur toute la période (incluant download + seed)
      // Car l'upload peut commencer dès le téléchargement
      const effectiveSeedingTime = Math.max(elapsedSeconds, 60);
      const uploadSpeedBps = effectiveSeedingTime > 0 ? snatch.actualUploaded / effectiveSeedingTime : 0;
      const uploadSpeedMbps = (uploadSpeedBps * 8) / (1024 * 1024);

      // Détecte si ce débit est anormalement élevé par rapport aux autres torrents de l'utilisateur
      // Utilise un seuil de 3 écarts-types au-dessus de la médiane (anomalie statistique)
      const isAbnormalSpeed = speedsData.length >= 3 &&
                              uploadSpeedMbps > (medianSpeed + 3 * stdDevSpeed) &&
                              uploadSpeedMbps > medianSpeed * 2; // Au moins 2x la médiane

      // Critères de suspicion (l'anomalie de download n'est PAS un critère, juste une info)
      const isSuspiciousRatio = ratio >= minRatio;
      const isSuspiciousUpload = minUploadedTB !== null && uploadedTB >= minUploadedTB;
      const isSuspiciousSpeed = uploadSpeedMbps > 1000; // Plus de 1 Gbps en moyenne est suspect

      if (isSuspiciousRatio || isSuspiciousUpload || isSuspiciousSpeed || isAbnormalSpeed) {
        // Prépare l'objet avec toutes les données (déjà précises depuis snatch-history)
        const suspiciousData = {
          ...snatch,
          ratio: ratio,
          ratioFormatted: ratio.toFixed(2),
          ratioBasedOnSize: ratioBasedOnSize,
          ratioBasedOnSizeFormatted: ratioBasedOnSize.toFixed(2),
          ratioBasedOnDownload: ratioBasedOnDownload,
          ratioBasedOnDownloadFormatted: ratioBasedOnDownload >= 0 ? ratioBasedOnDownload.toFixed(2) : '-1',
          uploadedTB: uploadedTB.toFixed(2),
          elapsedSeconds: elapsedSeconds,
          seedingTimeSeconds: seedingTimeSeconds,
          uploadSpeedMbps: uploadSpeedMbps,
          isAbnormalSpeed: isAbnormalSpeed,
          userMedianSpeed: medianSpeed,
          userAvgSpeed: avgSpeed,
          downloadExceedsTorrentSize: downloadExceedsTorrentSize,
          downloadRatio: downloadRatio,
          downloadRatioFormatted: downloadRatio.toFixed(2),
          isMultipleDownload: isMultipleDownload,
          multipleCount: isMultipleDownload ? nearestMultiple : 0,
          suspicionReasons: [
            isSuspiciousRatio && `Ratio élevé (${ratio.toFixed(2)})`,
            isSuspiciousUpload && `Upload élevé (${uploadedTB.toFixed(2)} TB)`,
            isSuspiciousSpeed && `Débit suspect (${(uploadSpeedMbps / 8).toFixed(2)} Mo/s)`,
            isAbnormalSpeed && `Débit anormal (${(uploadSpeedMbps / 8).toFixed(2)} Mo/s vs médiane ${(medianSpeed / 8).toFixed(2)} Mo/s)`
          ].filter(Boolean),
          hasSnatcherData: true, // Toujours vrai car on vient de snatch-history
          actualRatio: ratio,
          actualRatioFormatted: ratio.toFixed(2)
        };

        suspiciousTorrents.push(suspiciousData);
        console.log(`[C411ApiClient] Torrent suspect: ${snatch.name.substring(0, 50)}... (ratio: ${ratio.toFixed(2)}, upload: ${uploadedTB.toFixed(2)} TB${downloadExceedsTorrentSize ? ', DL > taille!' : ''}${isMultipleDownload ? `, ${nearestMultiple}x DL (légitime)` : ''})`);
      }
    }

    // Trie par ratio décroissant
    suspiciousTorrents.sort((a, b) => b.ratio - a.ratio);

    // Calcule un score de suspicion global
    const suspicionScore = this.calculateSuspicionScore(suspiciousTorrents, snatches.length);

    const result = {
      totalDownloads: snatches.length,
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
      totalSnatches: result.totalDownloads,
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

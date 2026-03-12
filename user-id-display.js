/**
 * Affiche l'ID utilisateur et analyse les téléchargements suspects sur les pages profil
 */
(function() {
  'use strict';

  /**
   * Formate un nombre avec séparateurs français (espaces pour milliers)
   */
  function formatNumber(num) {
    return num.toLocaleString('fr-FR');
  }

  /**
   * Formate une taille en octets en format lisible avec notation française
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 o';
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po', 'Eo', 'Zo', 'Yo'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Limite l'index au maximum disponible dans le tableau
    const index = Math.min(i, sizes.length - 1);
    const value = (bytes / Math.pow(k, index)).toFixed(2);
    return formatNumber(parseFloat(value)) + ' ' + sizes[index];
  }

  /**
   * Formate une durée en format lisible à partir de secondes
   * @param {number} seconds - Durée en secondes
   * @returns {string} Durée formatée
   */
  function formatDurationFromSeconds(seconds) {
    if (seconds < 0) return '0 sec';

    if (seconds < 60) {
      // Moins d'une minute : affiche en secondes
      return `${Math.round(seconds)} sec`;
    } else if (seconds < 3600) {
      // Moins d'une heure : affiche en minutes et secondes
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return secs > 0 ? `${minutes} min ${secs} sec` : `${minutes} min`;
    } else if (seconds < 86400) {
      // Moins d'un jour : affiche en heures et minutes
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h${minutes}` : `${hours}h`;
    } else if (seconds < 604800) {
      // Moins d'une semaine : affiche en jours avec décimale
      const days = seconds / 86400;
      return `${days.toFixed(1)} jour${days >= 2 ? 's' : ''}`;
    } else {
      // Plus d'une semaine : affiche en jours arrondis
      const days = Math.round(seconds / 86400);
      return `${days} jours`;
    }
  }

  /**
   * Formate une durée en format lisible (ancienne méthode avec jours en entrée)
   * @deprecated Utiliser formatDurationFromSeconds à la place
   */
  function formatDuration(days) {
    return formatDurationFromSeconds(days * 86400);
  }

  /**
   * Formate un débit en format lisible (Mb/s et Mo/s ou Gb/s et Go/s)
   */
  function formatSpeed(mbps) {
    const MOps = mbps / 8; // Convertit Mb/s en Mo/s (mégaoctets par seconde)

    if (mbps >= 1000) {
      // >= 1 Gb/s : affiche en Gb/s et Go/s
      const Gbps = mbps / 1000;
      const GOps = MOps / 1000;
      return `${formatNumber(Gbps.toFixed(1))} Gb/s (${formatNumber(GOps.toFixed(2))} Go/s)`;
    } else {
      // < 1 Gb/s : affiche en Mb/s et Mo/s
      return `${formatNumber(Math.round(mbps))} Mb/s (${formatNumber(MOps.toFixed(1))} Mo/s)`;
    }
  }

  /**
   * Affiche l'ID utilisateur dans le DOM
   */
  async function displayUserId() {
    // Vérifie qu'on est sur une page de profil utilisateur
    if (!NuxtDataParser.isUserProfilePage()) {
      return;
    }

    // Récupère l'ID utilisateur
    const userId = NuxtDataParser.getUserId();
    if (!userId) {
      console.warn('[UserIdDisplay] Impossible de récupérer l\'ID utilisateur');
      return;
    }

    // Cherche le h1 contenant le pseudo
    const h1Element = document.querySelector('h1.text-2xl.font-bold');
    if (!h1Element) {
      console.warn('[UserIdDisplay] Élément h1 non trouvé');
      return;
    }

    // Vérifie qu'on n'a pas déjà ajouté l'ID
    if (document.getElementById('c411-user-id-badge')) {
      return;
    }

    // Crée un badge avec l'ID
    const idBadge = document.createElement('span');
    idBadge.id = 'c411-user-id-badge';
    idBadge.className = 'inline-flex items-center font-semibold rounded-full border transition-all px-2.5 py-1 text-sm gap-1.5';
    idBadge.style.cssText = 'background-color: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: rgb(59, 130, 246);';
    idBadge.innerHTML = `<span aria-hidden="true">🆔</span><span>ID: ${userId}</span>`;
    idBadge.title = `User ID: ${userId}`;

    // Insère le badge après le h1
    h1Element.parentElement.appendChild(idBadge);

    console.log('[UserIdDisplay] ID utilisateur affiché:', userId);

    // Lance l'analyse des téléchargements en arrière-plan
    analyzeSuspiciousDownloads(userId);
  }

  /**
   * Analyse les téléchargements de l'utilisateur et affiche le torrent le plus suspect
   */
  async function analyzeSuspiciousDownloads(userId) {
    // Crée un bouton d'analyse
    const h1Element = document.querySelector('h1.text-2xl.font-bold');
    if (!h1Element) return;

    const analyzeButton = document.createElement('button');
    analyzeButton.id = 'c411-analyze-button';
    analyzeButton.className = 'inline-flex items-center font-semibold rounded-full border transition-all px-2.5 py-1 text-sm gap-1.5 cursor-pointer';
    analyzeButton.style.cssText = 'background-color: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: rgb(239, 68, 68);';
    analyzeButton.innerHTML = `<span aria-hidden="true">🔍</span><span>Analyser tricheur</span>`;
    analyzeButton.title = 'Analyse les téléchargements pour trouver le ratio le plus suspect';

    h1Element.parentElement.appendChild(analyzeButton);

    analyzeButton.addEventListener('click', async () => {
      // Change le texte du bouton
      analyzeButton.innerHTML = `<span aria-hidden="true">⏳</span><span>Analyse en cours...</span>`;
      analyzeButton.disabled = true;

      // Supprime l'ancien résultat s'il existe
      const oldResult = document.getElementById('c411-suspicious-result');
      if (oldResult) oldResult.remove();

      // Lance l'analyse avec les seuils
      const analysis = await C411ApiClient.analyzeSuspiciousDownloads(userId, {
        minRatio: 25,
        minUploadedTB: null // Désactivé : le ratio seul suffit
      });

      if (!analysis || !analysis.mostSuspicious) {
        analyzeButton.innerHTML = `<span aria-hidden="true">✅</span><span>Aucun suspect (${analysis ? analysis.totalDownloads : 0})</span>`;
        analyzeButton.style.cssText = 'background-color: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: rgb(34, 197, 94);';
        return;
      }

      // Réactive le bouton avec le nombre de suspects
      const suspectCount = analysis.suspiciousTorrents.length;
      analyzeButton.innerHTML = `<span aria-hidden="true">⚠️</span><span>${suspectCount} suspect${suspectCount > 1 ? 's' : ''}</span>`;
      analyzeButton.disabled = false;

      // Affiche le résultat
      displaySuspiciousResult(analysis);
    });
  }

  /**
   * Génère un motif de ban simple pour copier/coller
   */
  function generateDetailedBanReason(analysis, top5Torrents) {
    const suspectCount = analysis.suspiciousTorrents.length;
    const topTorrent = top5Torrents[0];
    const displayRatio = topTorrent.actualRatioFormatted;
    const displayUploaded = topTorrent.actualUploaded;

    return `Triche détectée : ${suspectCount} torrent${suspectCount > 1 ? 's' : ''} suspect${suspectCount > 1 ? 's' : ''}, ratio max ${formatNumber(parseFloat(displayRatio))}, ${formatBytes(displayUploaded)} uploadé, débit ${formatSpeed(parseFloat(topTorrent.uploadSpeedMbps))} (API snatch-history).`;
  }

  /**
   * Affiche le résultat de l'analyse dans une card
   */
  function displaySuspiciousResult(analysis) {
    // Trouve le bloc des informations utilisateur
    const userInfoContainer = document.querySelector('.flex.flex-wrap.items-center.gap-4.text-sm.text-gray-500');
    if (!userInfoContainer) {
      console.warn('[UserIdDisplay] Conteneur d\'infos utilisateur non trouvé');
      return;
    }

    // Supprime l'ancien résultat s'il existe
    const oldResult = document.getElementById('c411-suspicious-result');
    if (oldResult) oldResult.remove();

    const suspectCount = analysis.suspiciousTorrents.length;
    const top5Torrents = analysis.suspiciousTorrents.slice(0, 5);

    // Couleurs selon le niveau de suspicion (style C411)
    const levelColors = {
      critical: {
        bgStyle: 'background-color: rgba(239, 68, 68, 0.12);',
        borderStyle: 'border-color: rgba(239, 68, 68, 0.25);',
        textColor: 'rgb(252, 165, 165)',
        badgeBg: 'background-color: rgba(239, 68, 68, 0.18);',
        emoji: '🛡️'
      },
      high: {
        bgStyle: 'background-color: rgba(249, 115, 22, 0.12);',
        borderStyle: 'border-color: rgba(249, 115, 22, 0.25);',
        textColor: 'rgb(253, 186, 116)',
        badgeBg: 'background-color: rgba(249, 115, 22, 0.18);',
        emoji: '⚠️'
      },
      medium: {
        bgStyle: 'background-color: rgba(234, 179, 8, 0.12);',
        borderStyle: 'border-color: rgba(234, 179, 8, 0.25);',
        textColor: 'rgb(250, 204, 21)',
        badgeBg: 'background-color: rgba(234, 179, 8, 0.18);',
        emoji: '⚡'
      },
      low: {
        bgStyle: 'background-color: rgba(59, 130, 246, 0.12);',
        borderStyle: 'border-color: rgba(59, 130, 246, 0.25);',
        textColor: 'rgb(147, 197, 253)',
        badgeBg: 'background-color: rgba(59, 130, 246, 0.18);',
        emoji: 'ℹ️'
      }
    };

    const colors = levelColors[analysis.suspicionLevel] || levelColors.medium;

    // Crée le bloc de résultat intégré
    const resultBlock = document.createElement('div');
    resultBlock.id = 'c411-suspicious-result';
    resultBlock.className = 'mt-4 rounded-lg border transition-all';
    resultBlock.style.cssText = `${colors.bgStyle} ${colors.borderStyle}`;

    // Génère la liste des torrents suspects
    const torrentsListHTML = top5Torrents.map((torrent, index) => {
      // Toutes les données viennent maintenant de snatch-history (API précise)
      const displayRatio = torrent.actualRatioFormatted;
      const displayUploaded = torrent.actualUploaded;
      const displaySize = torrent.size;
      const actuallyDownloaded = torrent.actualDownloaded;

      // Calcule le vrai temps de téléchargement si completedAt existe
      let downloadTimeSeconds = 0;
      if (torrent.completedAt) {
        const firstActionDate = new Date(torrent.firstAction);
        const completedDate = new Date(torrent.completedAt);
        downloadTimeSeconds = (completedDate - firstActionDate) / 1000;
      }

      // Alerte ou info selon le type de téléchargement
      let downloadAlert = '';
      if (torrent.isMultipleDownload) {
        // Téléchargements multiples légitimes (2x, 3x, 4x...)
        downloadAlert = `
          <div class="mt-2 p-2 rounded text-[11px] leading-relaxed" style="background-color: rgba(59, 130, 246, 0.12); border-left: 3px solid rgba(59, 130, 246, 0.5);">
            <div class="font-bold text-blue-400">ℹ️ Téléchargements multiples détectés</div>
            <div class="text-blue-300 mt-1">Le fichier a été téléchargé ${torrent.multipleCount}x (${formatBytes(actuallyDownloaded)} total). Cela indique probablement plusieurs seedbox ou serveurs distincts (comportement légitime).</div>
          </div>
        `;
      } else if (torrent.downloadExceedsTorrentSize) {
        // Téléchargement suspect (pas un multiple)
        downloadAlert = `
          <div class="mt-2 p-2 rounded text-[11px] leading-relaxed" style="background-color: rgba(239, 68, 68, 0.12); border-left: 3px solid rgba(239, 68, 68, 0.5);">
            <div class="font-bold text-red-400">🚨 ANOMALIE : Téléchargement anormal</div>
            <div class="text-red-300 mt-1">Le téléchargement (${formatBytes(actuallyDownloaded)}) dépasse la taille du torrent (${formatBytes(displaySize)}) de ${torrent.downloadRatioFormatted}x mais n'est pas un multiple entier. Cela peut indiquer une manipulation des données.</div>
          </div>
        `;
      }

      return `
      <div class="p-3 ${index > 0 ? 'border-t border-gray-700/30' : ''}" style="background-color: rgba(0, 0, 0, 0.15);">
        <div class="flex gap-2">
          <div class="flex-shrink-0 w-6 text-center font-bold text-gray-500">${index + 1}</div>
          <div class="flex-1 text-xs space-y-2">
            <!-- En-tête avec nom du torrent -->
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <div class="text-gray-300 font-medium leading-tight mb-1">${torrent.name}</div>
                <div class="flex items-center gap-2 flex-wrap">
                  <a href="/torrents/${torrent.infoHash}" target="_blank" class="inline-flex items-center gap-1 transition-colors text-[11px]" style="color: rgb(96, 165, 250);" onmouseover="this.style.color='rgb(147, 197, 253)'" onmouseout="this.style.color='rgb(96, 165, 250)'">
                    <span>🔗</span>
                    ${torrent.infoHash}
                  </a>
                  <span class="text-[10px] text-gray-500">• Taille: ${formatBytes(displaySize)}</span>
                </div>
              </div>
            </div>

            <!-- Raisons de la suspicion -->
            ${torrent.suspicionReasons && torrent.suspicionReasons.length > 0 ? `
              <div class="p-2 rounded text-[11px] leading-relaxed" style="background-color: rgba(239, 68, 68, 0.08); border-left: 3px solid rgba(239, 68, 68, 0.4);">
                <div class="font-bold mb-1" style="color: ${colors.textColor};">⚠️ Raisons de la suspicion :</div>
                <ul class="space-y-0.5 text-gray-300">
                  ${torrent.suspicionReasons.map(reason => `<li>• ${reason}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <!-- Métriques clés -->
            <div class="space-y-1.5 text-[11px]">
              <!-- Ligne 1: Volumes et ratios -->
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                ${torrent.isMultipleDownload ? `<span class="text-blue-400">ℹ️ Download: ${formatBytes(actuallyDownloaded)} (${torrent.multipleCount}x téléchargements)</span>` : torrent.downloadExceedsTorrentSize ? `<span class="text-red-400 font-bold">⚠️ Download: ${formatBytes(actuallyDownloaded)} (${torrent.downloadRatioFormatted}x)</span>` : actuallyDownloaded > 0 ? `<span class="text-gray-400">Download: ${formatBytes(actuallyDownloaded)}</span>` : `<span class="text-yellow-400">Download: 0 o (déjà possédé)</span>`}
                <span class="text-gray-300">Upload: ${formatBytes(displayUploaded)}</span>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <span class="font-bold" style="color: ${colors.textColor};">Ratio utilisé: ${formatNumber(parseFloat(displayRatio))}</span>
                <span class="text-gray-400">Ratio base fichier: ${formatNumber(parseFloat(torrent.ratioBasedOnSizeFormatted))}</span>
                ${torrent.ratioBasedOnDownload >= 0 ? `<span class="text-gray-400">Ratio base DL: ${formatNumber(parseFloat(torrent.ratioBasedOnDownloadFormatted))}</span>` : ''}
              </div>

              <!-- Ligne 2: Dates -->
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-gray-400">
                <span>📅 Début: ${new Date(torrent.firstAction).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                ${torrent.completedAt ? `<span>✅ Complété: ${new Date(torrent.completedAt).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>` : ''}
                <span>🏁 Dernière annonce: ${new Date(torrent.lastAction).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
              </div>

              <!-- Ligne 3: Durées et débit -->
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                ${downloadTimeSeconds > 0 ? `<span class="text-gray-400">📥 Temps de téléchargement: ${formatDurationFromSeconds(downloadTimeSeconds)}</span>` : ''}
                <span class="text-gray-400">🌱 Temps de seed: ${torrent.seedingTimeSeconds > 0 ? formatDurationFromSeconds(torrent.seedingTimeSeconds) : '0 sec (upload pendant DL)'}</span>
                <span class="${torrent.isAbnormalSpeed ? 'font-bold text-orange-400' : parseFloat(torrent.uploadSpeedMbps) > 1000 ? 'font-bold' : 'text-gray-400'}" style="${torrent.isAbnormalSpeed ? 'color: #fb923c' : parseFloat(torrent.uploadSpeedMbps) > 1000 ? 'color: ' + colors.textColor : ''}">
                  ${torrent.isAbnormalSpeed ? '⚠️' : '⚡'} Débit moyen${torrent.usedElapsedTime ? ' (estimé)' : ''}: ${formatSpeed(parseFloat(torrent.uploadSpeedMbps))}
                  ${torrent.isAbnormalSpeed ? ` <span class="text-[10px] text-orange-300">(médiane utilisateur: ${formatSpeed(torrent.userMedianSpeed)})</span>` : ''}
                </span>
              </div>
            </div>

            <!-- Alerte anomalie -->
            ${downloadAlert}
          </div>
        </div>
      </div>
    `;
    }).join('');

    resultBlock.innerHTML = `
      <div class="p-3 border-b border-gray-700/30">
        <div class="flex items-center gap-2 mb-2">
          <span style="font-size: 18px;">${colors.emoji}</span>
          <div class="font-semibold text-sm flex-1" style="color: ${colors.textColor};">${analysis.suspicionMessage}</div>
        </div>
        <div class="flex gap-2 text-xs text-gray-400">
          <span>${formatNumber(suspectCount)} torrent${suspectCount > 1 ? 's' : ''} suspect${suspectCount > 1 ? 's' : ''}</span>
          <span>•</span>
          <span>${formatNumber(analysis.totalDownloads)} téléchargements au total</span>
          <span>•</span>
          <span>Ratio moyen: ${formatNumber(parseFloat(analysis.globalRatio))}</span>
        </div>
      </div>
      <div>
        ${torrentsListHTML}
        ${suspectCount > 5 ? `<div class="p-2 text-center text-xs text-gray-500">+${suspectCount - 5} autre${suspectCount - 5 > 1 ? 's' : ''} torrent${suspectCount - 5 > 1 ? 's' : ''} suspect${suspectCount - 5 > 1 ? 's' : ''}</div>` : ''}
      </div>
      <div class="p-3 border-t border-gray-700/30" style="background-color: rgba(0, 0, 0, 0.1);">
        <div class="text-xs text-gray-400 mb-2">Motif de ban :</div>
        <div class="flex gap-2">
          <input type="text" id="c411-ban-reason" readonly class="flex-1 px-2 py-1 text-xs rounded border bg-gray-800 text-gray-300 border-gray-600" value="${generateDetailedBanReason(analysis, top5Torrents)}">
          <button id="c411-copy-ban-reason" class="px-3 py-1 text-xs rounded border transition-colors" style="background-color: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: rgb(59, 130, 246);" onmouseover="this.style.backgroundColor='rgba(59, 130, 246, 0.2)'" onmouseout="this.style.backgroundColor='rgba(59, 130, 246, 0.1)'">
            📋 Copier
          </button>
        </div>
      </div>
    `;

    // Insère après le conteneur d'infos utilisateur
    userInfoContainer.parentElement.insertBefore(resultBlock, userInfoContainer.nextSibling);

    // Ajoute le listener pour copier le motif de ban
    const copyButton = document.getElementById('c411-copy-ban-reason');
    const banReasonInput = document.getElementById('c411-ban-reason');

    if (copyButton && banReasonInput) {
      copyButton.addEventListener('click', () => {
        banReasonInput.select();
        navigator.clipboard.writeText(banReasonInput.value).then(() => {
          const originalText = copyButton.innerHTML;
          copyButton.innerHTML = '✅ Copié !';
          copyButton.style.cssText = 'background-color: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: rgb(34, 197, 94);';

          setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.style.cssText = 'background-color: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: rgb(59, 130, 246);';
          }, 2000);
        }).catch(err => {
          console.error('[C411] Erreur lors de la copie:', err);
          copyButton.innerHTML = '❌ Erreur';
          setTimeout(() => {
            copyButton.innerHTML = '📋 Copier';
          }, 2000);
        });
      });
    }
  }

  /**
   * Observe les changements de page pour réafficher l'ID si nécessaire
   */
  function observePageChanges() {
    let currentUrl = window.location.href;

    const observer = new MutationObserver(() => {
      if (currentUrl !== window.location.href) {
        currentUrl = window.location.href;
        setTimeout(displayUserId, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener('popstate', () => {
      setTimeout(displayUserId, 300);
    });
  }

  // Initialisation au chargement
  setTimeout(displayUserId, 500);

  // Surveillance des changements de page
  observePageChanges();

})();

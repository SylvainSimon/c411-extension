import { ApiInterceptor } from '../../core/parsers/api-interceptor';
import { CheatAnalyzer } from './cheat-analyzer';
import { C411ApiClient } from '../../core/api/c411-client';
import { AnalysisResult } from '../../types/cheat-detection';
import { TemplateEngine } from '../../core/utils/template-engine';
import { FormatUtils } from '../../core/utils/format-utils';

// Importation du template global (Vite ?raw)
import resultCardTemplate from '../../templates/cheater-detection/result-card.twig?raw';

function formatSpeed(mbps: number): string {
  const MOps = mbps / 8;
  if (mbps >= 1000) {
    const Gbps = mbps / 1000;
    const GOps = MOps / 1000;
    return `${FormatUtils.formatNumber(parseFloat(Gbps.toFixed(1)))} Gb/s (${FormatUtils.formatNumber(parseFloat(GOps.toFixed(2)))} Go/s)`;
  } else {
    return `${FormatUtils.formatNumber(Math.round(mbps))} Mb/s (${FormatUtils.formatNumber(parseFloat(MOps.toFixed(1)))} Mo/s)`;
  }
}

function formatSpeedBytesOnly(mbps: number): string {
  const MOps = mbps / 8;
  return mbps >= 1000 ? `${FormatUtils.formatNumber(parseFloat((MOps / 1000).toFixed(2)))} Go/s` : `${FormatUtils.formatNumber(parseFloat(MOps.toFixed(1)))} Mo/s`;
}

/**
 * Génère le motif de ban complet et détaillé en synthétisant toutes les preuves
 */
function generateDetailedBanReason(analysis: AnalysisResult): string {
  const suspectCount = analysis.suspiciousTorrents.length;
  const allReasons = new Set<string>();
  analysis.suspiciousTorrents.forEach(t => t.suspicionReasons?.forEach(r => allReasons.add(r)));

  const reasonsArray = Array.from(allReasons);
  let synthesized: string[] = [];
  const many = suspectCount > 1;
  const prefix = many ? 'jusqu\'à ' : '';

  // 1. Synthèse des Ratios
  if (reasonsArray.some(r => r.includes('Ratio élevé'))) {
    const maxRatio = Math.max(...analysis.suspiciousTorrents.map(t => t.actualRatio));
    synthesized.push(`ratio ${prefix}${FormatUtils.formatNumber(maxRatio)}`);
  }

  // 2. Synthèse de l'Upload
  if (reasonsArray.some(r => r.includes('Upload élevé'))) {
    const maxUpload = Math.max(...analysis.suspiciousTorrents.map(t => t.uploadedTB));
    synthesized.push(`upload ${prefix}${FormatUtils.formatNumber(maxUpload)} TB`);
  }

  // 3. Synthèse des Débits
  if (reasonsArray.some(r => r.includes('Débit suspect'))) {
    const maxSpeed = Math.max(...analysis.suspiciousTorrents.map(t => t.uploadSpeedMbps));
    synthesized.push(`débit ${prefix}${formatSpeedBytesOnly(maxSpeed)}`);
  }

  // 4. Activité tardive
  if (reasonsArray.some(r => r.includes('Activité tardive'))) {
    const lateTorrents = analysis.suspiciousTorrents.filter(t => t.isLateActivity);
    const maxDays = Math.max(...lateTorrents.map(t => t.delayFromCreationDays || 0));
    if (maxDays > 0) {
      synthesized.push(`activité tardive (${prefix}${Math.round(maxDays)}j après publication)`);
    }
  }

  // 5. Domination
  if (reasonsArray.some(r => r.includes('Domination'))) {
    const dominantTorrents = analysis.suspiciousTorrents.filter(t => t.isDominant);
    const maxDominance = Math.max(...dominantTorrents.map(t => parseFloat(t.dominanceRatio || '0')));
    if (maxDominance > 0) {
      synthesized.push(`domination suspecte (${prefix}${FormatUtils.formatNumber(maxDominance)}x plus que le 2ème)`);
    }
  }

  // 6. Ratio Impossible
  if (reasonsArray.some(r => r.includes('Ratio impossible'))) {
    const impossibleTorrents = analysis.suspiciousTorrents.filter(t => t.isImpossibleRatio);
    const worst = impossibleTorrents.reduce((a, b) => (a.actualRatio > b.actualRatio) ? a : b);
    if (worst && worst.torrentCompletions) {
      synthesized.push(`ratio impossible (${FormatUtils.formatNumber(worst.actualRatio)} pour ${FormatUtils.formatNumber(worst.torrentCompletions)} complétions)`);
    }
  }

  return `Triche détectée sur ${suspectCount} torrent${many ? 's' : ''} : ${synthesized.join(', ')}.`;
}

function smartFormatDate(dateStr: string, referenceDateStr?: string): string {
  const date = FormatUtils.parseDate(dateStr);
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  if (!referenceDateStr) {
    return date.toLocaleString('fr-FR');
  }

  const refDate = FormatUtils.parseDate(referenceDateStr);
  const isSameDay = date.toLocaleDateString() === refDate.toLocaleDateString();

  return isSameDay ? timeStr : date.toLocaleString('fr-FR');
}

function displaySuspiciousResult(analysis: AnalysisResult) {
  const userInfoContainer = document.querySelector('.flex.flex-wrap.items-center.gap-4.text-sm.text-gray-500');
  if (!userInfoContainer) return;

  document.getElementById('c411-suspicious-result')?.remove();

  const levelColors: Record<string, any> = {
    critical: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: 'rgb(252, 165, 165)', emoji: '🛡️' },
    high: { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.25)', text: 'rgb(253, 186, 116)', emoji: '⚠️' },
    medium: { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.25)', text: 'rgb(250, 204, 21)', emoji: '⚡' },
    low: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)', text: 'rgb(147, 197, 253)', emoji: 'ℹ️' },
    clean: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)', text: 'rgb(187, 247, 208)', emoji: '✅' }
  };

  const colors = levelColors[analysis.suspicionLevel] || levelColors.medium;
  
  const topSuspects = analysis.suspiciousTorrents.slice(0, 5).map(torrent => {
    let downloadTimeSeconds = 0;
    if (torrent.completedAt) {
      downloadTimeSeconds = (FormatUtils.parseDate(torrent.completedAt).getTime() - FormatUtils.parseDate(torrent.firstAction).getTime()) / 1000;
    }

    const refDate = torrent.firstAction;

    return {
      ...torrent,
      formattedSize: FormatUtils.formatBytes(torrent.size),
      formattedDownloaded: FormatUtils.formatBytes(torrent.actualDownloaded),
      formattedUploaded: FormatUtils.formatBytes(torrent.actualUploaded),
      
      // Chronologie intelligente
      mainDate: FormatUtils.parseDate(torrent.firstAction).toLocaleDateString('fr-FR'),
      formattedFirstAction: smartFormatDate(torrent.firstAction),
      formattedLastAction: smartFormatDate(torrent.lastAction, refDate),
      formattedCreatedAt: torrent.torrentCreatedAt ? FormatUtils.parseDate(torrent.torrentCreatedAt).toLocaleString('fr-FR') : null,
      formattedCompletedAt: torrent.completedAt ? smartFormatDate(torrent.completedAt, refDate) : null,
      
      formattedDelay: torrent.delayFromCreationDays ? (torrent.delayFromCreationDays >= 1 ? `+${Math.round(torrent.delayFromCreationDays)}j` : `+${Math.round(torrent.delayFromCreationDays * 24)}h`) : null,
      formattedDownloadTime: FormatUtils.formatDuration(downloadTimeSeconds),
      formattedSeedingTime: FormatUtils.formatDuration(torrent.seedingTimeSeconds),
      formattedActiveTime: FormatUtils.formatDuration(torrent.totalActiveTime),
      formattedUploadSpeed: formatSpeed(torrent.uploadSpeedMbps),
      formattedCompletions: torrent.torrentCompletions !== undefined ? FormatUtils.formatNumber(torrent.torrentCompletions) : null,
      formattedSecondUpload: torrent.secondUpload ? FormatUtils.formatBytes(torrent.secondUpload) : null,
      actualRatioFormatted: FormatUtils.formatNumber(parseFloat(torrent.actualRatioFormatted)),
      ratioBySizeFormatted: FormatUtils.formatNumber(parseFloat(torrent.ratioBySizeFormatted)),
      downloadTimeSeconds
    };
  });

  const templateData = {
    analysis,
    colors,
    topSuspects,
    totalDownloadsFormatted: FormatUtils.formatNumber(analysis.totalDownloads),
    suspectCountFormatted: FormatUtils.formatNumber(analysis.suspiciousTorrents.length),
    banReason: generateDetailedBanReason(analysis)
  };

  const resultHtml = TemplateEngine.render(resultCardTemplate, templateData);
  
  const target = userInfoContainer.parentElement?.parentElement;
  if (target) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = resultHtml;
    const resultElement = tempDiv.firstElementChild!;
    target.parentElement?.insertBefore(resultElement, target.nextSibling);
  }

  // Écouteur pour le bouton de ban
  const banButton = document.getElementById('c411-ban-button');
  banButton?.addEventListener('click', async () => {
    const reason = (document.getElementById('c411-ban-reason') as HTMLInputElement).value;

    if (!confirm(`⚠️ Confirmer le bannissement définitif ?\n\nMotif :\n${reason}`)) return;

    // Animation et état désactivé
    const originalContent = banButton.innerHTML;
    banButton.innerHTML = '<span>⏳</span> Bannissement...';
    (banButton as HTMLButtonElement).disabled = true;
    banButton.style.opacity = '0.7';
    banButton.style.cursor = 'not-allowed';

    try {
      const res = await C411ApiClient.banUser(analysis.userId, reason);

      if (res) {
        banButton.innerHTML = '<span>✅</span> Utilisateur banni !';
        banButton.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
        banButton.style.color = 'rgb(34, 197, 94)';

        // Délai avant actualisation pour laisser le temps de lire le succès
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error('Erreur API');
      }
    } catch (error) {
      console.error('[UserProfile] Erreur lors du ban:', error);
      alert('❌ Erreur lors du bannissement. Vérifiez vos permissions.');
      banButton.innerHTML = originalContent;
      (banButton as HTMLButtonElement).disabled = false;
      banButton.style.opacity = '1';
      banButton.style.cursor = 'pointer';
    }
  });
}

async function analyzeSuspiciousDownloads(userId: number) {
  const h1 = document.querySelector('h1.text-2xl.font-bold') || document.querySelector('h1');
  if (!h1 || document.getElementById('c411-analyze-button')) return;

  const btn = document.createElement('button');
  btn.id = 'c411-analyze-button';
  btn.className = 'inline-flex items-center font-semibold rounded-full border px-2.5 py-1 text-sm gap-1.5 ml-2 cursor-pointer transition-all';
  btn.style.cssText = 'background-color: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: rgb(239, 68, 68);';
  btn.innerHTML = `<span>🔍</span><span>Analyser tricheur</span>`;
  
  h1.parentElement?.appendChild(btn);

  btn.addEventListener('click', async () => {
    btn.innerHTML = `<span>⏳</span><span>Analyse en cours...</span>`;
    btn.disabled = true;
    
    document.getElementById('c411-suspicious-result')?.remove();
    
    const analysis = await CheatAnalyzer.analyze(userId);
    if (analysis && analysis.suspiciousTorrents.length > 0) {
      btn.innerHTML = `<span>⚠️</span><span>${analysis.suspiciousTorrents.length} suspects</span>`;
      btn.disabled = false;
      displaySuspiciousResult(analysis);
    } else {
      btn.innerHTML = `<span>✅</span><span>Aucun suspect</span>`;
      btn.style.cssText = 'background-color: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: rgb(34, 197, 94);';
    }
  });
}

async function displayUserId() {
  if (!ApiInterceptor.isUserProfilePage()) return;

  const userId = await ApiInterceptor.getUserId();
  if (!userId) return;

  const h1 = document.querySelector('h1.text-2xl.font-bold') || document.querySelector('h1');
  if (!h1 || document.getElementById('c411-user-id-badge')) return;

  const idBadge = document.createElement('span');
  idBadge.id = 'c411-user-id-badge';
  idBadge.className = 'inline-flex items-center font-semibold rounded-full border px-2.5 py-1 text-sm gap-1.5 ml-2';
  idBadge.style.cssText = 'background-color: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: rgb(59, 130, 246);';
  idBadge.innerHTML = `<span>🆔</span><span>ID: ${userId}</span>`;
  
  h1.parentElement?.appendChild(idBadge);
  analyzeSuspiciousDownloads(userId);
}

export function initializeUserProfile() {
  setTimeout(displayUserId, 500);
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      ApiInterceptor.clearCache();
      setTimeout(displayUserId, 300);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

import { C411Swal as Swal } from '../../core/utils/sweetalert-theme';
import { CheatAnalyzer } from './cheat-analyzer';
import { C411ApiClient } from '../../core/api/c411-client';
import { AnalysisResult } from '../../types/cheat-detection';
import { TemplateEngine } from '../../core/utils/template-engine';
import { FormatUtils } from '../../core/utils/format-utils';
import { UrlParser } from '../../core/utils/url-parser';
import { BanUtils } from '../../core/utils/ban-utils';

// Importation du template global (Vite ?raw)
import resultCardTemplate from '../../templates/cheater-detection/result-card.twig?raw';

function smartFormatDate(dateStr: string, referenceDateStr?: string): string {
  const date = FormatUtils.parseDate(dateStr);
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  if (!referenceDateStr) return date.toLocaleString('fr-FR');

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
  
  const topSuspects = analysis.suspiciousTorrents.slice(0, 10).map(torrent => {
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
      
      mainDate: FormatUtils.parseDate(torrent.firstAction).toLocaleDateString('fr-FR'),
      formattedFirstAction: smartFormatDate(torrent.firstAction),
      formattedLastAction: smartFormatDate(torrent.lastAction, refDate),
      formattedCreatedAt: torrent.torrentCreatedAt ? FormatUtils.parseDate(torrent.torrentCreatedAt).toLocaleString('fr-FR') : null,
      formattedCompletedAt: torrent.completedAt ? smartFormatDate(torrent.completedAt, refDate) : null,
      
      formattedDelay: torrent.delayFromCreationDays ? (torrent.delayFromCreationDays >= 1 ? `+${Math.round(torrent.delayFromCreationDays)}j` : `+${Math.round(torrent.delayFromCreationDays * 24)}h`) : null,
      formattedDownloadTime: FormatUtils.formatDuration(downloadTimeSeconds),
      formattedSeedingTime: FormatUtils.formatDuration(torrent.seedingTimeSeconds),
      formattedUploadSpeed: FormatUtils.formatSpeed(torrent.uploadSpeedMbps),
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
    banReason: BanUtils.generateBanReason(analysis)
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

    const { isConfirmed } = await Swal.fire({
      title: 'Confirmer le bannissement ?',
      text: `Motif : ${reason}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, bannir !',
      cancelButtonText: 'Annuler'
    });

    if (!isConfirmed) return;

    const originalContent = banButton.innerHTML;
    banButton.innerHTML = '<span>⏳</span> Bannissement...';
    (banButton as HTMLButtonElement).disabled = true;

    try {
      const res = await C411ApiClient.banUser(analysis.userId, reason);
      if (res) {
        banButton.innerHTML = '<span>✅</span> Utilisateur banni !';
        await Swal.fire({ title: 'Banni !', text: 'Succès.', icon: 'success', timer: 1500, showConfirmButton: false });
        window.location.reload();
      } else {
        throw new Error('Erreur API');
      }
    } catch (error) {
      Swal.fire({ title: 'Erreur', text: 'Permissions insuffisantes.', icon: 'error' });
      banButton.innerHTML = originalContent;
      (banButton as HTMLButtonElement).disabled = false;
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
  if (!UrlParser.isUserProfilePage()) return;
  const username = UrlParser.getUsernameFromUrl();
  if (!username) return;

  try {
    const profile = await C411ApiClient.getUserProfile(username);
    if (!profile) return;

    const h1 = document.querySelector('h1.text-2xl.font-bold') || document.querySelector('h1');
    if (!h1 || document.getElementById('c411-user-id-badge')) return;

    const idBadge = document.createElement('span');
    idBadge.id = 'c411-user-id-badge';
    idBadge.className = 'inline-flex items-center font-semibold rounded-full border px-2.5 py-1 text-sm gap-1.5 ml-2';
    idBadge.style.cssText = 'background-color: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: rgb(59, 130, 246);';
    idBadge.innerHTML = `<span>🆔</span><span>ID: ${profile.id}</span>`;
    
    h1.parentElement?.appendChild(idBadge);
    analyzeSuspiciousDownloads(profile.id);
  } catch (error) {}
}

export function initializeUserProfile() {
  setTimeout(displayUserId, 500);
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      setTimeout(displayUserId, 300);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

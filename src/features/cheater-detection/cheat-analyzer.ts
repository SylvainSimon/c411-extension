import { C411ApiClient } from '../../core/api/c411-client';
import { SnatchData } from '../../types/api';
import { Config } from '../../core/config/config';
import { AppConfig } from '../../types/config';
import { CheatRuleRegistry } from './cheat-rule-registry';
import { FormatUtils } from '../../core/utils/format-utils';
import { SnatchStats, SuspiciousTorrent, AnalysisResult, RuleContext } from '../../types/cheat-detection';

export const CheatStats = {
  ONE_TB: 1024 * 1024 * 1024 * 1024,
  calculateRatioBySize(uploaded: number, size: number): number { return size > 0 ? uploaded / size : 0; },
  calculateSpeedMbps(bytes: number, seconds: number): number {
    if (seconds <= 0) return 0;
    return (bytes * 8) / (1024 * 1024 * seconds);
  },
  analyzeMultiples(downloaded: number, size: number) {
    if (size <= 0) return { isMultiple: false, count: 0, ratio: 0 };
    const ratio = downloaded / size;
    const isMultiple = Math.round(ratio) > 1 && Math.abs(ratio - Math.round(ratio)) <= 0.05;
    return { isMultiple, count: isMultiple ? Math.round(ratio) : 0, ratio };
  }
};

export const CheatAnalyzer = {
  async analyze(userId: number, thresholds: AppConfig | null = null, maxPages = 999, minTorrentSize = 50): Promise<AnalysisResult | null> {
    if (!thresholds) thresholds = await Config.getAll();
    let snatches = await C411ApiClient.getAllUserSnatchHistory(userId, thresholds.apiRateLimit, maxPages);
    if (!snatches || snatches.length === 0) return null;

    // Filtrage par taille minimum
    const minSizeBytes = minTorrentSize * 1024 * 1024;
    snatches = snatches.filter(s => s.size >= minSizeBytes);
    if (snatches.length === 0) return null;

    let totalUploaded = 0; let totalDownloaded = 0;
    const suspiciousTorrents: SuspiciousTorrent[] = [];
    const globalWarnings: string[] = [];
    const allRules = CheatRuleRegistry.getRules();
    const accountRules = allRules.filter(r => r.type === 'account');
    const torrentRules = allRules.filter(r => r.type === 'torrent');

    const accountContext: RuleContext = { allSnatches: snatches, thresholds, userId };
    for (const rule of accountRules) {
      const warning = rule.check(accountContext);
      if (warning) globalWarnings.push(warning);
    }

    for (const snatch of snatches) {
      totalUploaded += snatch.actualUploaded;
      totalDownloaded += snatch.size;
      const stats = this._calculateSnatchStats(snatch);
      const context: RuleContext = { snatch, allSnatches: snatches, stats, thresholds, userId };
      const reasons = torrentRules.map(rule => rule.check(context)).filter((r): r is string => r !== null);

      if (reasons.length > 0) {
        suspiciousTorrents.push({
          ...snatch, ...stats, suspicionReasons: reasons,
          isLateActivity: false, isImpossibleRatio: false, isDominant: false
        });
      }
    }

    // ENRICHISSEMENT DE TOUS LES TORRENTS SUSPECTS
    // (Crucial pour avoir la date de post dans l'interface)
    for (const torrent of suspiciousTorrents) {
      await this._enrichWithDeepAnalysis(torrent, userId, thresholds, snatches, torrentRules);
    }

    const scoring = this._calculateGlobalScore(suspiciousTorrents, globalWarnings);
    const totalSuspiciousUploaded = suspiciousTorrents.reduce((sum, t) => sum + t.actualUploaded, 0);

    return {
      userId, totalDownloads: snatches.length, totalUploaded, totalDownloaded,
      totalSuspiciousUploaded,
      globalRatio: totalDownloaded > 0 ? (totalUploaded / totalDownloaded).toFixed(2) : '0',
      suspiciousTorrents, globalWarnings, mostSuspicious: suspiciousTorrents[0] || null,
      ...scoring
    };
  },

  _calculateSnatchStats(snatch: SnatchData): SnatchStats {
    const ratioBySize = CheatStats.calculateRatioBySize(snatch.actualUploaded, snatch.size);
    const multiples = CheatStats.analyzeMultiples(snatch.actualDownloaded, snatch.size);
    const seedingTimeSeconds = snatch.seedingTime || 0;
    
    // 1. Calcul de la fenêtre de téléchargement (Leech)
    let leechTimeSeconds = 0;
    if (snatch.completedAt) {
        const tFirst = FormatUtils.parseDate(snatch.firstAction).getTime();
        const tDone = FormatUtils.parseDate(snatch.completedAt).getTime();
        leechTimeSeconds = Math.max(0, (tDone - tFirst) / 1000);
    }

    // 2. Temps actif total estimé (Leech + Seed)
    // On considère que l'utilisateur peut uploader dès la première seconde du download
    let effectiveTime = leechTimeSeconds + seedingTimeSeconds;

    // 3. Garde-fou (Fenêtre globale)
    // Si l'utilisateur est un cross-seeder (pas de completedAt) ou si les données sont
    // incohérentes, on vérifie par rapport à la fenêtre temporelle réelle du tracker.
    const tFirst = FormatUtils.parseDate(snatch.firstAction).getTime();
    const tLast = FormatUtils.parseDate(snatch.lastAction).getTime();
    const elapsedSeconds = Math.max(1, (tLast - tFirst) / 1000);

    // Si le temps calculé est ridiculement bas (< 5% du temps passé sur le site)
    // alors qu'il y a un upload significatif (> 10 Mo), on utilise la fenêtre globale.
    if (snatch.actualUploaded > 1024 * 1024 * 10 && effectiveTime < (elapsedSeconds * 0.05)) {
        effectiveTime = elapsedSeconds;
    }

    effectiveTime = Math.max(effectiveTime, 1);
    const uploadSpeedMbps = CheatStats.calculateSpeedMbps(snatch.actualUploaded, effectiveTime);

    return {
      ratioBySize, ratioBySizeFormatted: ratioBySize.toFixed(2),
      uploadSpeedMbps, 
      seedingTimeSeconds, isCrossSeed: !snatch.completedAt,
      downloadRatio: multiples.ratio, downloadRatioFormatted: multiples.ratio.toFixed(2),
      isMultipleDownload: multiples.isMultiple, multipleCount: multiples.count,
      actualRatio: ratioBySize, actualRatioFormatted: ratioBySize.toFixed(2)
    };
  },

  async _enrichWithDeepAnalysis(torrent: SuspiciousTorrent, userId: number, thresholds: AppConfig, allSnatches: SnatchData[], torrentRules: any[]) {
    try {
      const [metadata, torrentStats, topSnatchers] = await Promise.all([
        C411ApiClient.getTorrentMetadata(torrent.infoHash),
        C411ApiClient.getTorrentStats(torrent.infoHash),
        C411ApiClient.getTorrentTopSnatchers(torrent.infoHash)
      ]);

      const context: RuleContext = { snatch: torrent, allSnatches, stats: torrent, thresholds, userId, metadata: metadata || undefined, torrentStats: torrentStats || undefined, topSnatchers };
      const allReasons = torrentRules.map(rule => rule.check(context)).filter((r): r is string => r !== null);
      
      // ASSIGNATION DES METADONNEES POUR L'INTERFACE
      if (metadata) {
        torrent.torrentCreatedAt = metadata.createdAt;
        torrent.name = metadata.name;
        
        // CALCUL DU DELAI POUR LE BADGE TARDIF
        const tCreate = FormatUtils.parseDate(metadata.createdAt).getTime();
        const uFirst = FormatUtils.parseDate(torrent.firstAction).getTime();
        torrent.delayFromCreationDays = Math.max(0, (uFirst - tCreate) / 86400000);
      }
      if (torrentStats) {
        torrent.torrentCompletions = torrentStats.completions;
      }
      if (topSnatchers) {
        const userSnatcher = topSnatchers.find(s => s.userId === userId);
        const secondSnatcher = topSnatchers[0]?.userId === userId ? topSnatchers[1] : topSnatchers[0];
        if (userSnatcher && secondSnatcher && secondSnatcher.actualUploaded > 0) {
            torrent.dominanceRatio = (userSnatcher.actualUploaded / secondSnatcher.actualUploaded).toFixed(1);
            torrent.secondUpload = secondSnatcher.actualUploaded;
        }
        torrent.userRank = topSnatchers.findIndex(s => s.userId === userId) + 1;
      }

      torrent.suspicionReasons = Array.from(new Set([...torrent.suspicionReasons, ...allReasons]));
      torrent.isLateActivity = torrent.suspicionReasons.some(r => r.includes('Activité tardive'));
      torrent.isImpossibleRatio = torrent.suspicionReasons.some(r => r.includes('Ratio impossible'));
      torrent.isDominant = torrent.suspicionReasons.some(r => r.includes('Domination'));

      await new Promise(resolve => setTimeout(resolve, 50));
    } catch {}
  },

  _calculateGlobalScore(suspiciousTorrents: SuspiciousTorrent[], globalWarnings: string[]) {
    if (suspiciousTorrents.length === 0 && globalWarnings.length === 0) {
      return { suspicionScore: 0, suspicionLevel: 'clean' as const, suspicionMessage: 'Aucun comportement suspect' };
    }

    let score = 0;
    score += globalWarnings.length * 50;

    for (const t of suspiciousTorrents) {
      if (t.isImpossibleRatio) score += 100;
      if (t.isDominant) score += 60;
      if (t.userRank === 1) score += 30;
      if (t.isLateActivity) score += 40;
      if (t.uploadSpeedMbps > 8000) score += 150;
      else if (t.uploadSpeedMbps > 1000) score += 50;
    }

    score = Math.round(score);
    let level: AnalysisResult['suspicionLevel'] = 'low';
    if (score >= 120) level = 'critical';
    else if (score >= 70) level = 'high';
    else if (score >= 30) level = 'medium';

    return { suspicionScore: score, suspicionLevel: level, suspicionMessage: 'Analyse comportementale' };
  }
};

import { C411ApiClient } from '../../core/api/c411-client';
import { SnatchData } from '../../types/api';
import { Config } from '../../core/config/config';
import { CheatRuleRegistry } from './cheat-rule-registry';
import { AppConfig } from '../../types/config';
import { SnatchStats, SuspiciousTorrent, AnalysisResult, RuleContext } from '../../types/cheat-detection';

export const CheatStats = {
  ONE_TB: 1024 * 1024 * 1024 * 1024,

  calculateRatioBySize(uploaded: number, size: number): number {
    return size > 0 ? uploaded / size : 0;
  },

  calculateSpeedMbps(bytes: number, seconds: number): number {
    if (seconds <= 0) return 0;
    const bits = bytes * 8;
    return bits / (1024 * 1024 * seconds);
  },

  analyzeMultiples(downloaded: number, size: number) {
    if (size <= 0) return { isMultiple: false, count: 0, ratio: 0 };
    const ratio = downloaded / size;
    const tolerance = 0.05;
    const nearestMultiple = Math.round(ratio);
    const isMultiple = nearestMultiple > 1 && Math.abs(ratio - nearestMultiple) <= tolerance;
    return { isMultiple, count: isMultiple ? nearestMultiple : 0, ratio };
  }
};

export const CheatAnalyzer = {
  async analyze(userId: number, thresholds: AppConfig | null = null): Promise<AnalysisResult | null> {
    console.log('[CheatAnalyzer] Lancement de l\'analyse pour l\'ID:', userId);

    if (!thresholds) {
      thresholds = await Config.getAll();
    }

    const snatches = await C411ApiClient.getAllUserSnatchHistory(userId, thresholds.apiRateLimit);
    if (!snatches || snatches.length === 0) return null;

    let totalUploaded = 0;
    let totalDownloaded = 0;
    const suspiciousTorrents: SuspiciousTorrent[] = [];
    const globalWarnings: string[] = [];
    const allRules = CheatRuleRegistry.getRules();
    
    const accountRules = allRules.filter(r => r.type === 'account');
    const torrentRules = allRules.filter(r => r.type === 'torrent');

    // 1. Analyse au niveau du compte
    const accountContext: RuleContext = { allSnatches: snatches, thresholds, userId };
    for (const rule of accountRules) {
      const warning = rule.check(accountContext);
      if (warning) globalWarnings.push(warning);
    }

    // 2. Analyse au niveau des torrents (Passe rapide)
    for (const snatch of snatches) {
      totalUploaded += snatch.actualUploaded;
      totalDownloaded += snatch.size;

      const stats = this._calculateSnatchStats(snatch);
      const context: RuleContext = { snatch, allSnatches: snatches, stats, thresholds, userId };
      
      const reasons = torrentRules
        .map(rule => rule.check(context))
        .filter((r): r is string => r !== null);

      if (reasons.length > 0) {
        suspiciousTorrents.push({
          ...snatch,
          ...stats,
          suspicionReasons: reasons,
          isLateActivity: false,
          isImpossibleRatio: false,
          isDominant: false
        });
      }
    }

    // 3. Analyse approfondie (Top 5 suspects)
    suspiciousTorrents.sort((a, b) => b.ratioBySize - a.ratioBySize);
    const topSuspects = suspiciousTorrents.slice(0, 5);

    for (const torrent of topSuspects) {
      await this._enrichWithDeepAnalysis(torrent, userId, thresholds, snatches, torrentRules);
    }

    const scoring = this._calculateGlobalScore(suspiciousTorrents, snatches.length, globalWarnings);

    return {
      userId,
      totalDownloads: snatches.length,
      totalUploaded,
      totalDownloaded,
      globalRatio: totalDownloaded > 0 ? (totalUploaded / totalDownloaded).toFixed(2) : '0',
      suspiciousTorrents,
      globalWarnings,
      mostSuspicious: suspiciousTorrents[0] || null,
      ...scoring
    };
  },

  _calculateSnatchStats(snatch: SnatchData): SnatchStats {
    const ratioBySize = CheatStats.calculateRatioBySize(snatch.actualUploaded, snatch.size);
    const multiples = CheatStats.analyzeMultiples(snatch.actualDownloaded, snatch.size);
    const firstAction = new Date(snatch.firstAction).getTime();
    const lastAction = new Date(snatch.lastAction).getTime();
    const seedingTimeSeconds = snatch.seedingTime || 0;
    
    const elapsedSeconds = (lastAction - firstAction) / 1000;

    let downloadTimeSeconds = 0;
    if (snatch.completedAt) {
      downloadTimeSeconds = (new Date(snatch.completedAt).getTime() - firstAction) / 1000;
    }

    let uploadSpeedMbps = 0;
    let totalActiveTime = 0;
    let isCrossSeed = false;

    if (snatch.completedAt && downloadTimeSeconds > 0) {
      totalActiveTime = downloadTimeSeconds + seedingTimeSeconds;
      uploadSpeedMbps = CheatStats.calculateSpeedMbps(snatch.actualUploaded, totalActiveTime);
    } else if (seedingTimeSeconds > 0) {
      totalActiveTime = seedingTimeSeconds;
      uploadSpeedMbps = CheatStats.calculateSpeedMbps(snatch.actualUploaded, seedingTimeSeconds);
      isCrossSeed = true;
    } else if (elapsedSeconds > 0) {
      totalActiveTime = elapsedSeconds;
      uploadSpeedMbps = CheatStats.calculateSpeedMbps(snatch.actualUploaded, elapsedSeconds);
    }

    return {
      ratioBySize,
      ratioBySizeFormatted: ratioBySize.toFixed(2),
      uploadedTB: snatch.actualUploaded / CheatStats.ONE_TB,
      uploadSpeedMbps,
      totalActiveTime,
      seedingTimeSeconds,
      isCrossSeed,
      downloadRatio: multiples.ratio,
      downloadRatioFormatted: multiples.ratio.toFixed(2),
      isMultipleDownload: multiples.isMultiple,
      multipleCount: multiples.count,
      downloadExceedsTorrentSize: snatch.actualUploaded > 0 && multiples.ratio > 1.05 && !multiples.isMultiple,
      actualRatio: ratioBySize,
      actualRatioFormatted: ratioBySize.toFixed(2)
    };
  },

  async _enrichWithDeepAnalysis(torrent: SuspiciousTorrent, userId: number, thresholds: AppConfig, allSnatches: SnatchData[], torrentRules: any[]) {
    try {
      const [metadata, torrentStats, topSnatchers] = await Promise.all([
        C411ApiClient.getTorrentMetadata(torrent.infoHash),
        C411ApiClient.getTorrentStats(torrent.infoHash),
        C411ApiClient.getTorrentTopSnatchers(torrent.infoHash)
      ]);

      const context: RuleContext = { 
        snatch: torrent, 
        allSnatches,
        stats: torrent, 
        thresholds, 
        userId, 
        metadata: metadata || undefined, 
        torrentStats: torrentStats || undefined, 
        topSnatchers 
      };

      const allReasons = torrentRules
        .map(rule => rule.check(context))
        .filter((r): r is string => r !== null);

      torrent.suspicionReasons = Array.from(new Set([...torrent.suspicionReasons, ...allReasons]));

      if (metadata && metadata.createdAt) {
        torrent.torrentCreatedAt = metadata.createdAt;
        if (metadata.name) {
          torrent.name = metadata.name;
        }
      }
      
      const completions = torrentStats?.completions ?? metadata?.completions;
      if (completions !== undefined) {
        torrent.torrentCompletions = completions;
      }

      torrent.isLateActivity = torrent.suspicionReasons.some(r => r.includes('Activité tardive'));
      torrent.isImpossibleRatio = torrent.suspicionReasons.some(r => r.includes('Ratio impossible'));
      torrent.isDominant = torrent.suspicionReasons.some(r => r.includes('Domination'));

      if (torrent.isLateActivity && metadata && metadata.createdAt) {
        torrent.delayFromCreationDays = (new Date(torrent.firstAction).getTime() - new Date(metadata.createdAt).getTime()) / 86400000;
      }

      if (torrent.isDominant && topSnatchers && topSnatchers.length >= 2) {
        const userSnatcher = topSnatchers.find(s => s.userId === userId);
        const secondSnatcher = topSnatchers[1];
        if (userSnatcher && secondSnatcher) {
          torrent.dominanceRatio = (userSnatcher.actualUploaded / secondSnatcher.actualUploaded).toFixed(1);
          torrent.secondUpload = secondSnatcher.actualUploaded;
        }
      }

      if (topSnatchers) {
        torrent.userRank = topSnatchers.findIndex(s => s.userId === userId) + 1;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('[CheatAnalyzer] Erreur enrichissement:', error);
    }
  },

  _calculateGlobalScore(suspiciousTorrents: SuspiciousTorrent[], totalDownloads: number, globalWarnings: string[]) {
    const suspectCount = suspiciousTorrents.length;
    const suspectPercentage = (suspectCount / totalDownloads) * 100;
    const avgSuspiciousRatio = suspectCount > 0 ? suspiciousTorrents.reduce((sum, t) => sum + t.ratioBySize, 0) / suspectCount : 0;

    let score = (suspectCount * 10) + (suspectPercentage * 2) + (Math.min(avgSuspiciousRatio, 200) / 2);
    
    // Bonus pour les alertes globales
    score += globalWarnings.length * 50;
    
    score = Math.round(score);

    let level: AnalysisResult['suspicionLevel'];
    let message: string;

    if (score >= 150) {
      level = 'critical';
      message = score > 200 ? 'Triche avérée - Pattern global suspect' : 'Triche très probable - Multiples preuves';
    } else if (score >= 80) {
      level = 'high';
      message = 'Comportement très suspect - Investigation recommandée';
    } else if (score >= 40) {
      level = 'medium';
      message = 'Comportement suspect - À surveiller';
    } else {
      level = 'low';
      message = 'Légèrement suspect';
    }

    if (score === 0) {
      return { suspicionScore: 0, suspicionLevel: 'clean' as const, suspicionMessage: 'Aucun comportement suspect' };
    }

    return { suspicionScore: score, suspicionLevel: level, suspicionMessage: message };
  }
};

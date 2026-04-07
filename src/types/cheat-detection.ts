import { SnatchData } from './api';
import { AppConfig } from './config';

export interface SnatchStats {
  ratioBySize: number;
  ratioBySizeFormatted: string;
  uploadedTB: number;
  uploadSpeedMbps: number;
  totalActiveTime: number;
  seedingTimeSeconds: number;
  isCrossSeed: boolean;
  downloadRatio: number;
  downloadRatioFormatted: string;
  isMultipleDownload: boolean;
  multipleCount: number;
  downloadExceedsTorrentSize: boolean;
  actualRatio: number;
  actualRatioFormatted: string;
}

export interface SuspiciousTorrent extends SnatchData, SnatchStats {
  suspicionReasons: string[];
  isLateActivity: boolean;
  isImpossibleRatio: boolean;
  isDominant: boolean;
  torrentCreatedAt?: string;
  delayFromCreationDays?: number;
  torrentCompletions?: number;
  dominanceRatio?: string;
  secondUpload?: number;
  userRank?: number;
}

export interface AnalysisResult {
  userId: number;
  totalDownloads: number;
  totalUploaded: number;
  totalDownloaded: number;
  globalRatio: string;
  suspiciousTorrents: SuspiciousTorrent[];
  mostSuspicious: SuspiciousTorrent | null;
  suspicionScore: number;
  suspicionLevel: 'clean' | 'low' | 'medium' | 'high' | 'critical';
  suspicionMessage: string;
}

export interface RuleContext {
  snatch: SnatchData;
  stats: SnatchStats;
  thresholds: AppConfig;
  userId: number;
  metadata?: any;
  torrentStats?: any;
  topSnatchers?: any[];
}

export interface CheatRule {
  id: string;
  name: string;
  check: (context: RuleContext) => string | null;
}

import { SnatchData } from './api';
import { AppConfig } from './config';

export interface SnatchStats {
  ratioBySize: number;
  ratioBySizeFormatted: string;
  uploadSpeedMbps: number;
  seedingTimeSeconds: number;
  isCrossSeed: boolean;
  downloadRatio: number;
  downloadRatioFormatted: string;
  isMultipleDownload: boolean;
  multipleCount: number;
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
  globalWarnings: string[]; // Nouvelles alertes au niveau du compte
  mostSuspicious: SuspiciousTorrent | null;
  suspicionScore: number;
  suspicionLevel: 'clean' | 'low' | 'medium' | 'high' | 'critical';
  suspicionMessage: string;
}

export interface RuleContext {
  snatch?: SnatchData; // Optionnel pour les règles globales
  allSnatches: SnatchData[];
  stats?: SnatchStats; // Optionnel pour les règles globales
  thresholds: AppConfig;
  userId: number;
  metadata?: any;
  torrentStats?: any;
  topSnatchers?: any[];
}

export interface CheatRule {
  id: string;
  name: string;
  type: 'torrent' | 'account'; // Nouveau : permet de distinguer les règles
  check: (context: RuleContext) => string | null;
}

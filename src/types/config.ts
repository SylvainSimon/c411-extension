export interface AppConfig {
  tmdbApiKey: string;
  minRatio: number;
  minUploadedTB: number | null;
  apiRateLimit: number;
  deepAnalysisLimit: number;
  maxSpeedMbps?: number;
}

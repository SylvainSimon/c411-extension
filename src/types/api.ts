export interface SnatchData {
  infoHash: string;
  name: string;
  size: number;
  actualUploaded: number;
  actualDownloaded: number;
  firstAction: string;
  lastAction: string;
  completedAt?: string;
  seedingTime?: number;
  ratio: number;
}

export interface UserSnatchResponse {
  data: SnatchData[];
  meta: {
    totalPages: number;
    currentPage: number;
    totalItems: number;
  };
}

export interface TorrentMetadata {
  infoHash: string;
  name: string;
  size: number;
  createdAt: string;
  completions: number;
}

export interface TorrentStats {
  infoHash: string;
  seeders: number;
  leechers: number;
  completions: number;
}

export interface Snatcher {
  userId: number;
  actualUploaded: number;
  actualDownloaded: number;
}

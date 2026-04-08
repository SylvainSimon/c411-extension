export interface SnatchData {
  infoHash: string;
  name: string;
  size: number;
  uploaded: number;
  downloaded: number;
  actualUploaded: number;
  actualDownloaded: number;
  ratio: number;
  seedingTime: number;
  isSeeding: boolean;
  completed: boolean;
  completedAt?: string;
  firstAction: string;
  lastAction: string;
}

export interface UserSnatchResponse {
  data: SnatchData[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface UserProfileData {
  id: number;
  username: string;
  avatar: string;
  banner: string | null;
  bio: string | null;
  role: string;
  uploaded: number;
  downloaded: number;
  ratio: number;
  torrentsUploaded: number;
  memberSince: string;
  validatedUploadsCount: number;
  trackerBanned: boolean;
  uploaderTier?: {
    name: string;
    slug: string;
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

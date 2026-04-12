export interface Rank {
  id: number;
  slug: string;
  name: string;
  color: string;
  level: number;
}

export interface RanksResponse {
  enabled: boolean;
  ranks: Rank[];
}

export interface LeaderboardUser {
  id: number;
  username: string;
  avatar: string | null;
  uploaded: number;
  downloaded: number;
  ratio: number;
  torrentsUploaded: number;
  rank: {
    id: number;
    name: string;
    icon: string;
    color: string;
    level: number;
  };
}

export interface LeaderboardResponse {
  users: LeaderboardUser[];
  totalCount: number;
}

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
  isParked: boolean;
  isTeam: boolean;
  teamName: string | null;
  isDonor: boolean;
  isEarlyAdopter: boolean;
  isHelper: boolean;
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

export interface UserListData {
  id: number;
  username: string;
  role: string;
  validatedUploadsCount: number;
  warnings: number;
  isWarned: boolean;
  parked: boolean;
  createdAt: string;
  uploaded: number;
  downloaded: number;
  ratio: number | null;
  trackerBanned: boolean;
  fraudScore: number | null;
  fraudFlagged: boolean;
  fraudDetails: string | null;
  rankName: string | null;
  rankIcon: string | null;
  rankColor: string | null;
  rankLevel: number | null;
  isTeam: boolean;
  teamName: string | null;
  torrentsUploaded: number;
}

export interface UserListResponse {
  data: UserListData[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

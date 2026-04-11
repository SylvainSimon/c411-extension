import { SnatchData, UserSnatchResponse, TorrentMetadata, TorrentStats, Snatcher, UserProfileData, LeaderboardResponse, RanksResponse, UserListResponse, UserListData } from '../../types/api';

export const C411ApiClient = {
  // ...
  async getLeaderboard(rankId?: number): Promise<LeaderboardResponse | null> {
    const endpoint = rankId ? `/api/ranks/leaderboard?rankId=${rankId}` : '/api/ranks/leaderboard';
    return await C411ApiClient.call<LeaderboardResponse>(endpoint);
  },

  async getRanks(): Promise<RanksResponse | null> {
    return await C411ApiClient.call<RanksResponse>('/api/ranks');
  },

  async getUsersByDateRange(createdAfter: string, createdBefore: string, page = 1): Promise<UserListResponse | null> {
    const endpoint = `/api/team-pending/users?page=${page}&perPage=100&trackerBanned=false&createdAfter=${createdAfter}&createdBefore=${createdBefore}&sortBy=createdAt&sortOrder=desc`;
    return await C411ApiClient.call<UserListResponse>(endpoint);
  },

  getCsrfToken(): string | null {
    const metaCsrf = document.querySelector('meta[name="csrf-token"]');
    return metaCsrf ? metaCsrf.getAttribute('content') : null;
  },

  async call<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    const csrfToken = C411ApiClient.getCsrfToken();
    const baseUrl = window.location.origin;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const fetchOptions: RequestInit = {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(csrfToken && { 'csrf-token': csrfToken }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  async getUserProfile(username: string): Promise<UserProfileData | null> {
    return await C411ApiClient.call<UserProfileData>(`/api/users/${username}`);
  },

  async getUserSnatchHistory(userId: number, page = 1, sortBy = 'lastAction', sortOrder = 'desc'): Promise<UserSnatchResponse | null> {
    // Par défaut chronologique, mais configurable pour le scan rapide
    const endpoint = `/api/users/${userId}/snatch-history?page=${page}&perPage=50&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    return await C411ApiClient.call<UserSnatchResponse>(endpoint);
  },

  async getTorrentMetadata(infoHash: string): Promise<TorrentMetadata | null> {
    return await C411ApiClient.call<TorrentMetadata>(`/api/torrents/${infoHash}`);
  },

  async getTorrentStats(infoHash: string): Promise<TorrentStats | null> {
    return await C411ApiClient.call<TorrentStats>(`/api/torrents/${infoHash}/stats`);
  },

  async getTorrentTopSnatchers(infoHash: string): Promise<Snatcher[]> {
    const response = await C411ApiClient.call<{ data: Snatcher[] }>(`/api/torrents/${infoHash}/snatchers?page=1&perPage=10&sortBy=uploaded&sortOrder=desc`);
    return response?.data || [];
  },

  async getAllUserSnatchHistory(userId: number, rateLimit = 200, maxPages = 999): Promise<SnatchData[]> {
    let allSnatches: SnatchData[] = [];
    let page = 1;
    let totalPages = 1;

    // Si on limite les pages (Scan Rapide), on trie par Upload pour maximiser les chances
    const sortBy = maxPages < 10 ? 'uploaded' : 'lastAction';

    while (page <= totalPages && page <= maxPages) {
      const response = await C411ApiClient.getUserSnatchHistory(userId, page, sortBy);
      if (!response || !response.data) break;

      allSnatches = allSnatches.concat(response.data);
      totalPages = response.meta.totalPages;
      page++;

      if (page <= totalPages && page <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, rateLimit));
      }
    }
    return allSnatches;
  },

  async banUser(userId: number, reason: string): Promise<{ success: boolean } | null> {
    const payload = {
      reasonCode: 'manual_ban',
      reasonDetails: reason,
      isPermanent: true
    };

    return await C411ApiClient.call<{ success: boolean }>(`/api/team-pending/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

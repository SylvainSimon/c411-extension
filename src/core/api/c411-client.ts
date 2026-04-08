import { SnatchData, UserSnatchResponse, TorrentMetadata, TorrentStats, Snatcher, UserProfileData } from '../../types/api';

export const C411ApiClient = {
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

  async getUserSnatchHistory(userId: number, page = 1): Promise<UserSnatchResponse | null> {
    const endpoint = `/api/users/${userId}/snatch-history?page=${page}&perPage=50&sortBy=lastAction&sortOrder=desc`;
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

  async getAllUserSnatchHistory(userId: number, rateLimit = 200): Promise<SnatchData[]> {
    let allSnatches: SnatchData[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await C411ApiClient.getUserSnatchHistory(userId, page);
      if (!response || !response.data) break;

      allSnatches = allSnatches.concat(response.data);
      totalPages = response.meta.totalPages;
      page++;

      if (page <= totalPages) {
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

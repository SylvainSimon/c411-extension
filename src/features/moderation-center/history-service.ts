import { AnalysisResult } from '../../types/cheat-detection';
import { UserListData } from '../../types/api';

export interface HistoryEntry {
    user: UserListData;
    analysis: AnalysisResult;
    timestamp: number;
}

export interface ScanSession {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    rankId?: number; // Nouveau
    createdAt: number;
    quickScan: boolean;
    minTorrentSize: number;
    entries: HistoryEntry[];
    }

    export interface ScanState {
    sessionId: string;
    startDate: string;
    endDate: string;
    rankId?: number;
    currentPage: number;
    quickScan: boolean;
    minTorrentSize: number;
    }

const INDEX_KEY = 'c411_mod_sessions_index';
const STATE_KEY = 'c411_current_scan_state';

export const HistoryService = {
    async getSessionsList(): Promise<Omit<ScanSession, 'entries'>[]> {
        const data = await chrome.storage.local.get(INDEX_KEY) as any;
        return data[INDEX_KEY] || [];
    },

    async getSession(id: string): Promise<ScanSession | null> {
        const key = `session_data_${id}`;
        const data = await chrome.storage.local.get(key) as any;
        return data[key] || null;
    },

    async saveSession(session: ScanSession): Promise<void> {
        const dataKey = `session_data_${session.id}`;
        await chrome.storage.local.set({ [dataKey]: session });

        const list = await this.getSessionsList();
        const { entries, ...summary } = session;
        const index = list.findIndex(s => s.id === session.id);
        
        if (index !== -1) {
            list[index] = summary;
        } else {
            list.unshift(summary);
        }
        await chrome.storage.local.set({ [INDEX_KEY]: list.slice(0, 50) });
    },

    async addEntryToSession(sessionId: string, user: UserListData, analysis: AnalysisResult): Promise<void> {
        const session = await this.getSession(sessionId);
        if (session) {
            session.entries = session.entries.filter(e => e.user.id !== user.id);
            session.entries.unshift({ user, analysis, timestamp: Date.now() });
            await this.saveSession(session);
        }
    },

    async deleteSession(id: string): Promise<void> {
        const list = await this.getSessionsList();
        const filtered = list.filter(s => s.id !== id);
        await chrome.storage.local.set({ [INDEX_KEY]: filtered });
        await chrome.storage.local.remove(`session_data_${id}`);
    },

    async clearAllSessions(): Promise<void> {
        const list = await this.getSessionsList();
        for (const session of list) {
            await chrome.storage.local.remove(`session_data_${session.id}`);
        }
        await chrome.storage.local.remove(INDEX_KEY);
        await this.clearScanState();
    },

    async saveScanState(state: ScanState): Promise<void> {
        await chrome.storage.local.set({ [STATE_KEY]: state });
    },

    async getScanState(): Promise<ScanState | null> {
        const data = await chrome.storage.local.get(STATE_KEY) as any;
        return data[STATE_KEY] || null;
    },

    async clearScanState(): Promise<void> {
        await chrome.storage.local.remove(STATE_KEY);
    }
};

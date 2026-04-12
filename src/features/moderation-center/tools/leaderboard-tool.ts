import { C411ApiClient } from '../../../core/api/c411-client';
import { UserScanner } from '../user-scanner';
import { HistoryService, ScanSession } from '../history-service';
import toolTemplate from '../../../templates/moderation-center/tool-leaderboard.twig?raw';
import { TemplateEngine } from '../../../core/utils/template-engine';

export class LeaderboardTool {
    constructor(private shadow: ShadowRoot, private parent: any) {}

    async render() {
        const container = this.shadow.getElementById('tool-container')!;
        const ranksResponse = await C411ApiClient.getRanks();
        const ranks = ranksResponse?.ranks || [];
        container.innerHTML = TemplateEngine.render(toolTemplate, { ranks });
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.shadow.getElementById('c411-start-leaderboard-scan')?.addEventListener('click', () => this.startScan());
    }

    private async startScan() {
        const rankSelect = this.shadow.getElementById('c411-leaderboard-rank') as HTMLSelectElement;
        const quickScanCheckbox = this.shadow.getElementById('c411-quick-scan') as HTMLInputElement;
        const minSizeInput = this.shadow.getElementById('c411-min-torrent-size') as HTMLInputElement;
        
        const rankId = parseInt(rankSelect.value);
        const minTorrentSize = parseInt(minSizeInput.value) || 0;
        const rankName = rankSelect.options[rankSelect.selectedIndex].text;
        const now = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const name = `Class. ${rankName} (le ${now})`;

        const sessionId = `lead_${Date.now()}`;
        const newSession: ScanSession = { 
            id: sessionId, name, startDate: '', endDate: '', 
            rankId, 
            createdAt: Date.now(), 
            quickScan: quickScanCheckbox.checked, 
            minTorrentSize,
            entries: [] 
        };
        await HistoryService.saveSession(newSession);
        this.parent.setCurrentSessionId(sessionId);
        this.shadow.getElementById('c411-current-title')!.textContent = name;
        this.shadow.getElementById('c411-mod-results')!.innerHTML = '';
        this.shadow.getElementById('c411-mod-empty')!.style.display = 'none';

        const scanner = new UserScanner(this.shadow);
        this.parent.setScanner(scanner);

        this.parent.toggleScanUI(true);
        const data = await C411ApiClient.getLeaderboard(rankId === 0 ? undefined : rankId);
        if (data && data.users) {
            // @ts-ignore
            scanner.totalToScan = data.users.length;
            // @ts-ignore
            scanner.showProgress(true);
            for (let i = 0; i < data.users.length; i++) {
                // @ts-ignore
                if (scanner.isCancelled) break;
                const user = data.users[i];
                const adaptedUser: any = { 
                    id: user.id, 
                    username: user.username, 
                    createdAt: new Date().toISOString(), 
                    uploaded: user.uploaded, 
                    downloaded: user.downloaded, 
                    ratio: user.ratio,
                    torrentsUploaded: user.torrentsUploaded || 0,
                    isTeam: (user as any).isTeam || false,
                    teamName: (user as any).teamName || null
                };
                // @ts-ignore
                scanner.processedCount = i + 1;
                // @ts-ignore
                scanner.updateProgressBar();
                // @ts-ignore
                await scanner.processUser(adaptedUser, quickScanCheckbox.checked ? 2 : 999, sessionId, minTorrentSize);
            }
        }
        this.parent.toggleScanUI(false);
        // @ts-ignore
        scanner.updateStatus('Scan terminé.');
        // @ts-ignore
        setTimeout(() => scanner.showProgress(false), 3000);
    }
}

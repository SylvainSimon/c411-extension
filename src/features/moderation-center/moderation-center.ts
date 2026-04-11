import { C411Swal as Swal } from '../../core/utils/sweetalert-theme';
import floatingButtonTemplate from '../../templates/moderation-center/floating-button.twig?raw';
import overlayTemplate from '../../templates/moderation-center/overlay.twig?raw';
import detailsModalTemplate from '../../templates/moderation-center/details-modal.twig?raw';
import { TemplateEngine } from '../../core/utils/template-engine';
import { UserScanner } from './user-scanner';
import { AnalysisResult } from '../../types/cheat-detection';
import { FormatUtils } from '../../core/utils/format-utils';
import { C411ApiClient } from '../../core/api/c411-client';
import { HistoryService, HistoryEntry } from './history-service';
import { BanUtils } from '../../core/utils/ban-utils';

// Tools
import { RegistrationTool } from './tools/registration-tool';
import { LeaderboardTool } from './tools/leaderboard-tool';

export class ModerationCenter {
    private root: HTMLElement | null = null;
    private shadow: ShadowRoot | null = null;
    private isVisible = false;
    private currentScanner: UserScanner | null = null;
    private currentSessionId: string | null = null;
    private activePatternFlags: Set<string> = new Set();
    private allSessionEntries: HistoryEntry[] = []; 
    private static instance: ModerationCenter;

    constructor() {
        this.injectFloatingButton();
        ModerationCenter.instance = this;
    }

    public static getInstance(): ModerationCenter { return ModerationCenter.instance; }
    public getCurrentSessionId(): string | null { return this.currentSessionId; }
    public setCurrentSessionId(id: string) { this.currentSessionId = id; }
    public getScanner(): UserScanner | null { return this.currentScanner; }
    public setScanner(s: UserScanner) { this.currentScanner = s; }

    public clearLiveSession() {
        this.allSessionEntries = [];
        if (this.shadow) this.shadow.getElementById('c411-mod-results')!.innerHTML = '';
    }

    public addLiveEntry(user: any, analysis: any) {
        if (analysis.suspicionScore === 0) return; 
        const entry = { user, analysis, timestamp: Date.now() };
        this.allSessionEntries.push(entry);
        if (this.activePatternFlags.size > 0) this.applyAllFilters();
        else this.updateGlobalStats();
    }

    public async toggleScanUI(isScanning: boolean) {
        if (!this.shadow) return;
        const startBtns = this.shadow.querySelectorAll('[id^="c411-start-"]');
        const stopBtn = this.shadow.getElementById('c411-stop-scan') as HTMLElement;
        const resumeBtn = this.shadow.getElementById('c411-resume-scan') as HTMLElement;

        if (isScanning) {
            startBtns.forEach(btn => (btn as HTMLElement).style.display = 'none');
            if (stopBtn) {
                stopBtn.style.display = 'block';
                stopBtn.textContent = '⏸ PAUSE LE SCAN';
            }
            if (resumeBtn) resumeBtn.style.display = 'none';
        } else {
            startBtns.forEach(btn => (btn as HTMLElement).style.display = 'block');
            if (stopBtn) stopBtn.style.display = 'none';
            await this.checkResumeState();
        }
    }

    private injectFloatingButton() {
        if (document.getElementById('c411-moderation-trigger-root')) return;
        const container = document.createElement('div');
        container.id = 'c411-moderation-trigger-root';
        const shadow = container.attachShadow({ mode: 'open' });
        shadow.innerHTML = TemplateEngine.render(floatingButtonTemplate, {});
        document.body.appendChild(container);
        shadow.getElementById('c411-moderation-trigger')?.addEventListener('click', () => this.toggleOverlay());
    }

    private toggleOverlay() {
        if (this.isVisible) this.hideOverlay();
        else this.showOverlay();
    }

    private async showOverlay() {
        if (!this.root) {
            this.root = document.createElement('div');
            this.root.id = 'c411-moderation-center-root';
            this.shadow = this.root.attachShadow({ mode: 'open' });
            this.shadow.innerHTML = TemplateEngine.render(overlayTemplate, {});
            document.body.appendChild(this.root);
            this.setupEventListeners();
            await this.switchTool('registration');
        }
        this.root.style.display = 'block';
        this.isVisible = true;
        document.body.style.overflow = 'hidden';
        await this.checkResumeState();
        await this.refreshSessionList();
    }

    private hideOverlay() {
        if (this.root) this.root.style.display = 'none';
        this.isVisible = false;
        document.body.style.overflow = '';
    }

    public async checkResumeState() {
        if (!this.shadow) return;
        const state = await HistoryService.getScanState();
        const resumeBtn = this.shadow.getElementById('c411-resume-scan');
        const resumeName = this.shadow.getElementById('resume-scan-name');
        if (state && resumeBtn && resumeName) {
            const sessions = await HistoryService.getSessionsList();
            const session = sessions.find(s => s.id === state.sessionId);
            resumeName.textContent = session ? `${session.name} (page ${state.currentPage})` : `Page ${state.currentPage}`;
            resumeBtn.style.display = 'block';
        } else if (resumeBtn) resumeBtn.style.display = 'none';
    }

    private setupEventListeners() {
        if (!this.shadow) return;
        this.shadow.getElementById('c411-mod-close')?.addEventListener('click', () => this.hideOverlay());
        this.shadow.getElementById('c411-mod-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.hideOverlay(); });
        this.shadow.getElementById('c411-current-tool')?.addEventListener('change', (e) => this.switchTool((e.target as HTMLSelectElement).value));
        
        this.shadow.querySelectorAll('.c411-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab((e.currentTarget as HTMLElement).getAttribute('data-tab') || 'scan'));
        });

        this.shadow.querySelectorAll('.pat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const flag = target.getAttribute('data-flag')!;
                if (this.activePatternFlags.has(flag)) this.activePatternFlags.delete(flag);
                else this.activePatternFlags.add(flag);
                target.classList.toggle('active', this.activePatternFlags.has(flag));
                this.applyAllFilters();
            });
        });

        this.shadow.getElementById('c411-resume-scan')?.addEventListener('click', () => this.resumeScan());
        this.shadow.getElementById('c411-stop-scan')?.addEventListener('click', () => this.stopScan());
        this.shadow.getElementById('c411-clean-list')?.addEventListener('click', () => this.refreshAllUsers());
        this.shadow.getElementById('c411-delete-session')?.addEventListener('click', () => this.deleteCurrentSession());
        this.shadow.getElementById('c411-clear-all-sessions')?.addEventListener('click', () => this.clearAllSessions());
        this.shadow.getElementById('c411-session-selector')?.addEventListener('change', (e) => this.loadSession((e.target as HTMLSelectElement).value));

        this.shadow.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const banBtn = target.closest('.ban-user') as HTMLButtonElement;
            const refreshBtn = target.closest('.refresh-user') as HTMLButtonElement;

            if (banBtn) {
                const userId = parseInt(banBtn.getAttribute('data-user-id') || '0');
                const username = banBtn.getAttribute('data-username') || '';
                const reason = banBtn.getAttribute('data-reason') || '';
                
                if (!userId) return;

                const { isConfirmed } = await Swal.fire({
                    title: `Bannir ${username} ?`,
                    text: `Motif : ${reason}`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Oui, bannir !',
                    cancelButtonText: 'Annuler'
                });

                if (!isConfirmed) return;
                banBtn.disabled = true; banBtn.innerHTML = '⏳...';
                try {
                    const res = await C411ApiClient.banUser(userId, reason);
                    if (res) {
                        banBtn.innerHTML = '✅ Banni'; banBtn.style.background = '#1b5e20';
                        setTimeout(() => this.removeUserFromList(userId), 1000);
                    }
                } catch { banBtn.disabled = false; banBtn.innerHTML = '🚫'; }
            }

            if (refreshBtn) {
                const row = refreshBtn.closest('.c411-mod-user-row') as HTMLElement;
                const userId = parseInt(row.getAttribute('data-user-id') || '0');
                const username = row.querySelector('.username')?.textContent || '';
                refreshBtn.innerHTML = '⏳';
                await this.refreshUserStatus(userId, username);
            }
        });
    }

    private async switchTool(toolId: string) {
        if (!this.shadow) return;
        if (toolId === 'registration') await new RegistrationTool(this.shadow, this).render();
        else if (toolId === 'leaderboard') await new LeaderboardTool(this.shadow, this).render();
    }

    public applyAllFilters() {
        if (!this.shadow) return;
        const filtered = this.allSessionEntries.filter(entry => {
            if (this.activePatternFlags.size === 0) return true;
            const flags = this.calculateFlags(entry.analysis);
            let match = true;
            this.activePatternFlags.forEach(f => { if (!flags.includes(f)) match = false; });
            return match;
        });
        const resultsTable = this.shadow.getElementById('c411-mod-results')!;
        resultsTable.innerHTML = '';
        const tempScanner = new UserScanner(this.shadow);
        this.renderEntriesInChunks(filtered, tempScanner);
    }

    private calculateFlags(analysis: AnalysisResult): string[] {
        const flags = [];
        const st = analysis.suspiciousTorrents || [];
        if (st.some(t => t.isLateActivity)) flags.push('late');
        if (st.some(t => (t as any).userRank === 1)) flags.push('rank1');
        if (st.some(t => t.isDominant)) flags.push('dominant');
        if (st.some(t => t.uploadSpeedMbps > 1000)) flags.push('fast');
        if (st.some(t => t.actualRatio > 50)) flags.push('ratio');
        if ((analysis.globalWarnings || []).some(w => w.includes('identiques'))) flags.push('identical');
        return flags;
    }

    private switchTab(tab: string) {
        if (!this.shadow) return;
        this.shadow.querySelectorAll('.c411-tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
        this.shadow.getElementById('tab-scan-controls')!.style.display = tab === 'scan' ? 'block' : 'none';
        this.shadow.getElementById('tab-history-controls')!.style.display = tab === 'history' ? 'block' : 'none';
        if (tab === 'history') this.refreshSessionList();
    }

    private async refreshSessionList() {
        if (!this.shadow) return;
        const sessions = await HistoryService.getSessionsList();
        const selector = this.shadow.getElementById('c411-session-selector') as HTMLSelectElement;
        selector.innerHTML = '<option value="">-- Choisir une analyse passée --</option>';
        const regGroup = document.createElement('optgroup'); regGroup.label = '🕒 SCANS INSCRIPTIONS';
        const leadGroup = document.createElement('optgroup'); leadGroup.label = '🥇 SCANS CLASSEMENTS';
        sessions.forEach(s => {
            const opt = document.createElement('option'); opt.value = s.id;
            opt.textContent = `${s.name} (${new Date(s.createdAt).toLocaleDateString()})`;
            if (s.id.startsWith('reg_')) regGroup.appendChild(opt); else leadGroup.appendChild(opt);
        });
        if (regGroup.children.length > 0) selector.appendChild(regGroup);
        if (leadGroup.children.length > 0) selector.appendChild(leadGroup);
    }

    private async loadSession(sessionId: string) {
        if (!sessionId || !this.shadow) return;
        const session = await HistoryService.getSession(sessionId);
        if (!session) return;
        this.currentSessionId = session.id;
        this.shadow.getElementById('c411-current-title')!.textContent = session.name;
        
        const toolId = sessionId.startsWith('reg_') ? 'registration' : 'leaderboard';
        (this.shadow.getElementById('c411-current-tool') as HTMLSelectElement).value = toolId;
        await this.switchTool(toolId);

        if (toolId === 'registration') {
            (this.shadow.getElementById('c411-scan-date-start') as HTMLInputElement).value = session.startDate;
            (this.shadow.getElementById('c411-scan-date-end') as HTMLInputElement).value = session.endDate;
        } else {
            (this.shadow.getElementById('c411-leaderboard-rank') as HTMLSelectElement).value = (session.rankId || 0).toString();
        }
        (this.shadow.getElementById('c411-quick-scan') as HTMLInputElement).checked = session.quickScan;

        this.allSessionEntries = session.entries;
        const resultsTable = this.shadow.getElementById('c411-mod-results')!;
        resultsTable.innerHTML = '';
        this.shadow.getElementById('c411-mod-empty')!.style.display = 'none';
        const tempScanner = new UserScanner(this.shadow);
        const sortedEntries = [...session.entries].sort((a,b) => a.timestamp - b.timestamp);
        this.renderEntriesInChunks(sortedEntries, tempScanner);
        this.switchTab('scan');
    }

    private async deleteCurrentSession() {
        if (!this.currentSessionId) return;
        
        const { isConfirmed } = await Swal.fire({
            title: 'Supprimer cette analyse ?',
            text: 'Cette action est irréversible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler'
        });

        if (isConfirmed) {
            await HistoryService.deleteSession(this.currentSessionId);
            this.currentSessionId = null;
            this.allSessionEntries = [];
            this.shadow!.getElementById('c411-mod-results')!.innerHTML = '';
            await this.refreshSessionList();
        }
    }

    private async clearAllSessions() {
        const { isConfirmed } = await Swal.fire({
            title: 'Tout supprimer ?',
            text: 'Toutes les analyses sauvegardées seront effacées.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, tout supprimer',
            cancelButtonText: 'Annuler'
        });

        if (isConfirmed) {
            await HistoryService.clearAllSessions();
            this.currentSessionId = null;
            this.allSessionEntries = [];
            this.shadow!.getElementById('c411-mod-results')!.innerHTML = '';
            await this.refreshSessionList();
            await this.checkResumeState();
        }
    }

    private updateGlobalStats() {
        if (!this.shadow) return;
        const filtered = this.allSessionEntries.filter(entry => {
            if (this.activePatternFlags.size === 0) return true;
            const flags = this.calculateFlags(entry.analysis);
            let match = true;
            this.activePatternFlags.forEach(f => { if (!flags.includes(f)) match = false; });
            return match;
        });
        this.shadow.getElementById('c411-stat-total')!.textContent = filtered.length.toString();
        this.shadow.getElementById('c411-stat-suspect')!.textContent = filtered.filter(e => e.analysis.suspicionScore >= 30 && e.analysis.suspicionScore < 120).length.toString();
        this.shadow.getElementById('c411-stat-critical')!.textContent = filtered.filter(e => e.analysis.suspicionScore >= 120).length.toString();
    }

    public showDetails(analysis: AnalysisResult, username: string) {
        if (!this.shadow) return;
        this.shadow.getElementById('c411-details-modal')?.parentElement?.remove();
        const modalContainer = document.createElement('div');
        const banReason = BanUtils.generateBanReason(analysis);
        const html = TemplateEngine.render(detailsModalTemplate, {
            analysis, username, banReason,
            totalUploadedFormatted: FormatUtils.formatBytes(analysis.totalUploaded),
            totalDownloadedFormatted: FormatUtils.formatBytes(analysis.totalDownloaded),
            suspiciousTorrents: (analysis.suspiciousTorrents || []).map(t => ({
                ...t, uploadedFormatted: FormatUtils.formatBytes(t.actualUploaded),
                uploadSpeedFormatted: FormatUtils.formatSpeed(t.uploadSpeedMbps)
            }))
        });
        modalContainer.innerHTML = html;
        this.shadow.appendChild(modalContainer);
        modalContainer.querySelector('#c411-close-details')?.addEventListener('click', () => modalContainer.remove());
        modalContainer.querySelector('.c411-modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) modalContainer.remove(); });
    }

    private async resumeScan() {
        const state = await HistoryService.getScanState();
        if (!state || !this.shadow) return;
        this.currentSessionId = state.sessionId;
        const session = await HistoryService.getSession(state.sessionId);
        if (session) { 
            this.allSessionEntries = session.entries;
            this.shadow.getElementById('c411-current-title')!.textContent = session.name; 
            const resultsTable = this.shadow.getElementById('c411-mod-results')!;
            resultsTable.innerHTML = '';
            const tempScanner = new UserScanner(this.shadow);
            const sortedEntries = [...session.entries].sort((a,b) => a.timestamp - b.timestamp);
            this.renderEntriesInChunks(sortedEntries, tempScanner);
        }
        const toolId = state.sessionId.startsWith('reg_') ? 'registration' : 'leaderboard';
        (this.shadow.getElementById('c411-current-tool') as HTMLSelectElement).value = toolId;
        await this.switchTool(toolId);
        if (toolId === 'registration') {
            (this.shadow.getElementById('c411-scan-date-start') as HTMLInputElement).value = state.startDate;
            (this.shadow.getElementById('c411-scan-date-end') as HTMLInputElement).value = state.endDate;
        } else {
            (this.shadow.getElementById('c411-leaderboard-rank') as HTMLSelectElement).value = (state.rankId || 0).toString();
        }
        (this.shadow.getElementById('c411-quick-scan') as HTMLInputElement).checked = state.quickScan;
        this.toggleScanUI(true);
        this.currentScanner = new UserScanner(this.shadow);
        if (toolId === 'registration') await this.currentScanner.scanInterval(state.startDate, state.endDate, state.quickScan ? 2 : 999, state.currentPage);
        this.toggleScanUI(false);
        this.currentScanner = null;
    }

    private stopScan() { if (this.currentScanner) this.currentScanner.cancel(); }

    private async refreshUserStatus(userId: number, username: string) {
        if (!username) return;
        try {
            const profile = await C411ApiClient.getUserProfile(username);
            if (profile && profile.trackerBanned) {
                this.removeUserFromList(userId);
            } else {
                const row = this.shadow!.querySelector(`[data-user-id="${userId}"]`) as HTMLElement;
                const btn = row?.querySelector('.refresh-user');
                if (btn) btn.innerHTML = '🔄';
            }
        } catch {}
    }

    private async refreshAllUsers() {
        const rows = Array.from(this.shadow!.querySelectorAll('.c411-mod-user-row')) as HTMLElement[];
        const status = this.shadow!.getElementById('c411-scan-status')!;
        const originalStatus = status.textContent;
        status.textContent = 'Nettoyage en cours...';
        for (const row of rows) {
            const userId = parseInt(row.getAttribute('data-user-id') || '0');
            const username = row.querySelector('.username')?.textContent || '';
            await this.refreshUserStatus(userId, username);
            await new Promise(r => setTimeout(r, 100));
        }
        status.textContent = 'Nettoyage terminé.';
        setTimeout(() => status.textContent = originalStatus, 2000);
    }

    private removeUserFromList(userId: number) {
        this.allSessionEntries = this.allSessionEntries.filter(e => e.user.id !== userId);
        const row = this.shadow!.querySelector(`[data-user-id="${userId}"]`) as HTMLElement;
        if (row) {
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            row.style.transition = 'all 0.3s';
            setTimeout(() => row.remove(), 300);
        }
        this.updateGlobalStats();
        if (this.currentSessionId) {
            HistoryService.getSession(this.currentSessionId).then(s => {
                if (s) { s.entries = s.entries.filter(e => e.user.id !== userId); HistoryService.saveSession(s); }
            });
        }
    }

    private renderEntriesInChunks(entries: HistoryEntry[], scanner: UserScanner) {
        const CHUNK_SIZE = 100;
        const MAX_DISPLAY = 5000;
        let index = 0;
        const resultsTable = this.shadow!.getElementById('c411-mod-results')!;
        const warning = this.shadow!.getElementById('c411-limit-warning')!;
        warning.style.display = entries.length > MAX_DISPLAY ? 'block' : 'none';
        const renderNext = () => {
            const chunk = entries.slice(index, Math.min(index + CHUNK_SIZE, MAX_DISPLAY));
            const fragment = document.createDocumentFragment();
            chunk.forEach(entry => {
                const html = scanner.prepareRowHtml(entry.user, entry.analysis);
                const temp = document.createElement('tbody');
                temp.innerHTML = html;
                const row = temp.firstElementChild as HTMLElement;
                scanner.attachRowEvents(row, entry.user, entry.analysis);
                fragment.appendChild(row);
            });
            resultsTable.appendChild(fragment);
            index += CHUNK_SIZE;
            if (index < entries.length && index < MAX_DISPLAY) requestAnimationFrame(renderNext);
            else this.updateGlobalStats();
        };
        requestAnimationFrame(renderNext);
    }
}

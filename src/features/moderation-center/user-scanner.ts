import { C411ApiClient } from '../../core/api/c411-client';
import { CheatAnalyzer } from '../cheater-detection/cheat-analyzer';
import { TemplateEngine } from '../../core/utils/template-engine';
import userRowTemplate from '../../templates/moderation-center/user-row.twig?raw';
import { FormatUtils } from '../../core/utils/format-utils';
import { UserListData } from '../../types/api';
import { ModerationCenter } from './moderation-center';
import { AnalysisResult } from '../../types/cheat-detection';
import { HistoryService } from './history-service';
import { BanUtils } from '../../core/utils/ban-utils';

export class UserScanner {
    public isCancelled = false;
    private processedCount = 0;
    private totalToScan = 0;

    constructor(private shadow: ShadowRoot) {}

    public cancel() { 
        this.isCancelled = true; 
        this.updateStatus('Mise en pause...');
    }

    async scanInterval(startDate: string, endDate: string, snatchMaxPages = 999, startPage = 1) {
        this.isCancelled = false;
        this.processedCount = (startPage - 1) * 100;
        if (startPage === 1) ModerationCenter.getInstance().clearLiveSession();

        const localStart = new Date(`${startDate}T00:00:00`);
        const localEnd = new Date(`${endDate}T23:59:59.999`);
        const afterStr = localStart.toISOString();
        const beforeStr = localEnd.toISOString();

        let page = startPage;
        let totalPages = startPage;
        this.showProgress(true);
        const sessionId = ModerationCenter.getInstance().getCurrentSessionId();

        while (page <= totalPages) {
            if (this.isCancelled) break;

            if (sessionId) { 
                await HistoryService.saveScanState({ sessionId, startDate, endDate, currentPage: page, quickScan: snatchMaxPages === 2 }); 
            }
            
            this.updateStatus(`Récupération page ${page}...`);
            const response = await C411ApiClient.getUsersByDateRange(afterStr, beforeStr, page);
            if (!response || !response.data || response.data.length === 0) break;
            
            totalPages = response.meta.totalPages;
            this.totalToScan = response.meta.total;

            let pastLowerBound = false;
            for (const user of response.data) {
                if (this.isCancelled) break;

                const userCreatedAt = user.createdAt;
                if (userCreatedAt >= afterStr && userCreatedAt <= beforeStr) {
                    this.processedCount++; this.updateProgressBar();
                    await this.processUser(user, snatchMaxPages, sessionId);
                } else if (userCreatedAt < afterStr) { 
                    pastLowerBound = true; break; 
                } else {
                    this.processedCount++; this.updateProgressBar();
                }
            }

            if (this.isCancelled || pastLowerBound) break;
            page++;
            if (page > 1000) break;
        }

        if (this.isCancelled) {
            this.updateStatus('Scan en pause.');
        } else {
            this.updateStatus('Scan terminé.');
            await HistoryService.clearScanState();
            setTimeout(() => this.showProgress(false), 3000);
        }
    }

    public async processUser(user: UserListData, snatchMaxPages: number, sessionId: string | null) {
        if (!user.downloaded && !user.uploaded) return;
        if (this.isCancelled) return;
        try {
            const analysis = await CheatAnalyzer.analyze(user.id, null, snatchMaxPages);
            if (this.isCancelled) return;
            if (analysis && analysis.suspicionScore > 0) {
                if (sessionId) await HistoryService.addEntryToSession(sessionId, user, analysis);
                this.renderUserRow(user, analysis);
            }
        } catch (e) {}
    }

    public renderUserRow(user: UserListData, analysis: AnalysisResult) {
        ModerationCenter.getInstance().addLiveEntry(user, analysis);
        const resultsTable = this.shadow.getElementById('c411-mod-results');
        if (!resultsTable) return;
        
        // En mode live, on injecte directement via le template
        if (resultsTable.children.length < 1000) {
            const html = this.prepareRowHtml(user, analysis);
            const temp = document.createElement('tbody');
            temp.innerHTML = html;
            Array.from(temp.children).forEach(child => resultsTable.appendChild(child));
        }
    }

    public prepareRowHtml(user: UserListData, analysis: AnalysisResult) {
        const flags: Record<string, string> = {};
        const st = analysis.suspiciousTorrents || [];
        const gw = analysis.globalWarnings || [];
        
        if (st.some(t => t.isLateActivity)) {
            const lateTorrents = st.filter(t => t.isLateActivity);
            lateTorrents.forEach(t => {
                if (!t.delayFromCreationDays && t.torrentCreatedAt) {
                    const tCreate = FormatUtils.parseDate(t.torrentCreatedAt).getTime();
                    const uFirst = FormatUtils.parseDate(t.firstAction).getTime();
                    t.delayFromCreationDays = Math.max(0, (uFirst - tCreate) / 86400000);
                }
            });
            const maxDays = Math.max(...lateTorrents.map(t => t.delayFromCreationDays || 0));
            flags.late = `${Math.round(maxDays)}j`;
        }
        if (st.some(t => t.userRank === 1)) flags.rank1 = '#1';
        if (st.some(t => t.isDominant)) {
            const maxDom = Math.max(...st.filter(t => t.isDominant).map(t => parseFloat(t.dominanceRatio || '0')));
            flags.dominant = `${FormatUtils.formatNumber(maxDom)}x`;
        }
        if (st.some(t => t.uploadSpeedMbps > 1000)) {
            const maxSpeed = Math.max(...st.map(t => t.uploadSpeedMbps));
            flags.fast = FormatUtils.formatSpeed(maxSpeed); 
        }
        if (st.some(t => t.actualRatio > 50)) {
            const maxRatio = Math.max(...st.map(t => t.actualRatio));
            flags.ratio = FormatUtils.formatNumber(maxRatio);
        }
        if (gw.some(w => w.includes('identiques'))) flags.identical = 'SYNCHRO';

        const banReason = BanUtils.generateBanReason(analysis);

        // On formate les vitesses pour l'accordéon afin d'avoir la même unité que le badge
        const enrichedTorrents = st.map(t => ({
            ...t,
            uploadSpeedFormatted: FormatUtils.formatSpeed(t.uploadSpeedMbps)
        }));

        return TemplateEngine.render(userRowTemplate, { 
            user, flags, 
            createdAtFormatted: FormatUtils.formatDate(user.createdAt), 
            suspicionScore: analysis.suspicionScore, 
            suspicionLevel: analysis.suspicionLevel, 
            banReason, 
            analysis: { ...analysis, suspiciousTorrents: enrichedTorrents }
        });
    }

    private updateProgressBar() {
        const text = this.shadow.getElementById('c411-progress-text');
        const percentText = this.shadow.getElementById('c411-progress-percent');
        const barFill = this.shadow.getElementById('c411-progress-bar-fill');
        if (!text || !percentText || !barFill) return;
        const total = Math.max(this.totalToScan, this.processedCount);
        const percent = total > 0 ? Math.round((this.processedCount / total) * 100) : 0;
        text.textContent = `${this.processedCount} / ${total}`;
        percentText.textContent = `${percent}%`;
        barFill.style.width = `${percent}%`;
    }

    private showProgress(show: boolean) {
        const progressBox = this.shadow.getElementById('c411-scan-progress-box');
        if (progressBox) progressBox.style.display = show ? 'flex' : 'none';
    }

    private updateStatus(text: string) {
        const statusElem = this.shadow.getElementById('c411-scan-status')!;
        if (statusElem) statusElem.textContent = text;
    }
}

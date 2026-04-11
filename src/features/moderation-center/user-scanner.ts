import { C411ApiClient } from '../../core/api/c411-client';
import { CheatAnalyzer } from '../cheater-detection/cheat-analyzer';
import { TemplateEngine } from '../../core/utils/template-engine';
import userRowTemplate from '../../templates/moderation-center/user-row.twig?raw';
import { FormatUtils } from '../../core/utils/format-utils';
import { UserListData } from '../../types/api';
import { ModerationCenter } from './moderation-center';
import { AnalysisResult } from '../../types/cheat-detection';
import { HistoryService } from './history-service';

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
        this.processedCount = (startPage - 1) * 100; // Estimation base
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
            // ON NE NETTOIE QUE SI LE SCAN EST VRAIMENT FINI
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
        if (resultsTable.children.length < 500) {
            const rowHtml = this.prepareRowHtml(user, analysis);
            const temp = document.createElement('tbody');
            temp.innerHTML = rowHtml;
            const row = temp.firstElementChild as HTMLElement;
            this.attachRowEvents(row, user, analysis);
            resultsTable.appendChild(row);
        }
    }

    public prepareRowHtml(user: UserListData, analysis: AnalysisResult) {
        const flags: string[] = [];
        const st = analysis.suspiciousTorrents || [];
        const gw = analysis.globalWarnings || [];
        if (st.some(t => t.isLateActivity)) flags.push('late');
        if (st.some(t => (t as any).userRank === 1)) flags.push('rank1');
        if (st.some(t => t.isDominant)) flags.push('dominant');
        if (st.some(t => t.uploadSpeedMbps > 1000)) flags.push('fast');
        if (st.some(t => t.actualRatio > 50)) flags.push('ratio');
        if (gw.some(w => w.includes('identiques'))) flags.push('identical');
        return TemplateEngine.render(userRowTemplate, { user, flags, createdAtFormatted: FormatUtils.formatDate(user.createdAt), totalSnatches: analysis.totalDownloads || 0, suspicionScore: analysis.suspicionScore, suspicionLevel: analysis.suspicionLevel, suspicionMessage: analysis.suspicionMessage });
    }

    public attachRowEvents(row: HTMLElement, user: UserListData, analysis: AnalysisResult) {
        row.setAttribute('data-score', analysis.suspicionScore.toString());
        const flags = [];
        const st = analysis.suspiciousTorrents || [];
        if (st.some(t => t.isLateActivity)) flags.push('late');
        if (st.some(t => (t as any).userRank === 1)) flags.push('rank1');
        if (st.some(t => t.isDominant)) flags.push('dominant');
        if (st.some(t => t.uploadSpeedMbps > 1000)) flags.push('fast');
        if (st.some(t => t.actualRatio > 50)) flags.push('ratio');
        if ((analysis.globalWarnings || []).some(w => w.includes('identiques'))) flags.push('identical');
        row.setAttribute('data-flags', flags.join(','));
        row.querySelector('.view-details')?.addEventListener('click', () => { ModerationCenter.getInstance().showDetails(analysis, user.username); });
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

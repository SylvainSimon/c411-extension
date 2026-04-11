import { UserScanner } from '../user-scanner';
import { HistoryService, ScanSession } from '../history-service';
import toolTemplate from '../../../templates/moderation-center/tool-registration.twig?raw';
import { TemplateEngine } from '../../../core/utils/template-engine';

export class RegistrationTool {
    constructor(private shadow: ShadowRoot, private parent: any) {}

    render() {
        const container = this.shadow.getElementById('tool-container')!;
        container.innerHTML = TemplateEngine.render(toolTemplate, {});
        this.setupEventListeners();
    }

    private setupEventListeners() {
        const setDates = (start: Date, end: Date) => {
            const formatDate = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            (this.shadow!.getElementById('c411-scan-date-start') as HTMLInputElement).value = formatDate(start);
            (this.shadow!.getElementById('c411-scan-date-end') as HTMLInputElement).value = formatDate(end);
        };

        // GESTION DU DROPDOWN DE PÉRIODES
        this.shadow.getElementById('c411-date-presets')?.addEventListener('change', (e) => {
            const val = (e.target as HTMLSelectElement).value;
            const now = new Date();
            
            switch(val) {
                case 'today':
                    setDates(now, now);
                    break;
                case 'yesterday':
                    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
                    setDates(yesterday, yesterday);
                    break;
                case 'this-week':
                    const startWeek = new Date(now);
                    const day = now.getDay() || 7;
                    startWeek.setDate(now.getDate() - (day - 1));
                    setDates(startWeek, now);
                    break;
                case 'last-week':
                    const startLastWeek = new Date(now);
                    const dayL = now.getDay() || 7;
                    startLastWeek.setDate(now.getDate() - (dayL - 1) - 7);
                    const endLastWeek = new Date(startLastWeek);
                    endLastWeek.setDate(startLastWeek.getDate() + 6);
                    setDates(startLastWeek, endLastWeek);
                    break;
                case 'this-month':
                    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    setDates(startMonth, now);
                    break;
                case 'last-month':
                    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    setDates(startPrevMonth, endPrevMonth);
                    break;
            }
        });

        this.shadow.getElementById('c411-start-scan')?.addEventListener('click', () => this.startScan());
    }

    private async startScan() {
        const startInput = this.shadow.getElementById('c411-scan-date-start') as HTMLInputElement;
        const endInput = this.shadow.getElementById('c411-scan-date-end') as HTMLInputElement;
        const quickScanCheckbox = this.shadow.getElementById('c411-quick-scan') as HTMLInputElement;
        
        const startDate = startInput.value; const endDate = endInput.value;
        if (!startDate || !endDate) return;

        const now = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const name = `Inscr. ${startDate} au ${endDate} (le ${now})`;

        const sessionId = `reg_${Date.now()}`;
        const newSession: ScanSession = { id: sessionId, name, startDate, endDate, createdAt: Date.now(), quickScan: quickScanCheckbox.checked, entries: [] };
        
        await HistoryService.saveSession(newSession);
        this.parent.setCurrentSessionId(sessionId);
        
        this.shadow.getElementById('c411-current-title')!.textContent = name;
        this.shadow.getElementById('c411-mod-results')!.innerHTML = '';
        this.shadow.getElementById('c411-mod-empty')!.style.display = 'none';

        const scanner = new UserScanner(this.shadow);
        this.parent.setScanner(scanner);
        
        this.parent.toggleScanUI(true);
        await scanner.scanInterval(startDate, endDate, quickScanCheckbox?.checked ? 2 : 999, 1);
        this.parent.toggleScanUI(false);
    }
}

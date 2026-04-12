import { CheatRuleRegistry } from '../../cheat-rule-registry';
import { FormatUtils } from '../../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'aggregate-speed',
  name: 'Débit global suspect',
  type: 'account',
  check({ allSnatches, thresholds }) {
    if (!allSnatches || allSnatches.length < 2) return null;

    // 1. On calcule les métriques réelles pour chaque torrent
    const windows = allSnatches.map(s => {
      const start = new Date(s.firstAction).getTime();
      const end = new Date(s.lastAction).getTime();
      const durationSec = Math.max(1, (end - start) / 1000);
      const speedMbps = (s.actualUploaded * 8) / (1024 * 1024 * durationSec);

      return {
        name: s.name,
        start,
        end,
        speedMbps,
        firstAction: s.firstAction,
        lastAction: s.lastAction
      };
    }).filter(w => w.speedMbps > 5); // On ignore les torrents à débit négligeable (< 5 Mbps)

    if (windows.length < 2) return null;

    const maxSpeedThresholdMbps = thresholds?.maxSpeedMbps || 1000;
    
    // Helper pour formater une date [DD/MM HH:mm]
    const fmt = (iso?: string) => {
        if (!iso) return "--/-- --:--";
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // 2. On cherche les points de collision (chaque début de torrent est un candidat)
    for (const ref of windows) {
        const timeToTest = ref.start + 1000; // 1 seconde après le début
        const concurrents = windows.filter(w => timeToTest >= w.start && timeToTest <= w.end);
        
        if (concurrents.length >= 2) {
            const totalSpeed = concurrents.reduce((sum, w) => sum + w.speedMbps, 0);
            
            if (totalSpeed > maxSpeedThresholdMbps) {
                let detail = `Débit global suspect détecté : ${FormatUtils.formatSpeed(totalSpeed)} cumulés le ${fmt(new Date(timeToTest).toISOString())} sur ${concurrents.length} torrents simultanés :`;
                
                // Trier par débit décroissant pour le détail
                concurrents.sort((a, b) => b.speedMbps - a.speedMbps);
                concurrents.forEach(c => {
                    detail += `\n • [${fmt(c.firstAction)}] au [${fmt(c.lastAction)}] - ${FormatUtils.formatSpeed(c.speedMbps)} - ${c.name}`;
                });

                return detail;
            }
        }
    }

    return null;

    return null;
  }
});

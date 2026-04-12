import { CheatRuleRegistry } from '../../cheat-rule-registry';
import { FormatUtils } from '../../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'identical-upload',
  name: 'Upload synchronisé',
  type: 'account',
  check({ allSnatches }) {
    const processed = new Set<string>();
    const patterns: string[] = [];

    // On trie par volume décroissant
    const sortedSnatches = [...allSnatches].sort((a, b) => b.actualUploaded - a.actualUploaded);

    for (const s1 of sortedSnatches) {
      // Pour les très petits comptes (<= 3 snatches), on baisse le seuil de volume à 100 Mo pour détecter les tests
      const minVolTrigger = allSnatches.length <= 3 ? 100 * 1024 * 1024 : 1024 * 1024 * 1024;
      if (processed.has(s1.infoHash) || s1.actualUploaded < minVolTrigger) continue;

      // Tolérance équilibrée : 0.5% ou 500 Mo
      const volTolerance = Math.min(s1.actualUploaded * 0.005, 500 * 1024 * 1024); 
      const timeTolerance = 120; // 2 minutes de marge pour le tracker

      const group = sortedSnatches.filter(s2 => {
        if (processed.has(s2.infoHash)) return false;
        
        const sameVol = Math.abs(s2.actualUploaded - s1.actualUploaded) <= volTolerance;
        
        const s1Time = s1.seedingTime || 0;
        const s2Time = s2.seedingTime || 0;
        const sameTime = (s1Time === 0 && s2Time === 0) || 
                         (s1Time > 0 && s2Time > 0 && Math.abs(s1Time - s2Time) <= timeTolerance);
        
        return sameVol && sameTime;
      });

      // Seuil de déclenchement :
      // - Soit 3 torrents identiques (Preuve solide)
      // - Soit TOUS les torrents du compte si celui-ci en a au moins 2 (Suspicion maximale dès le début)
      const isTotalMatch = group.length === allSnatches.length && group.length >= 2;
      
      if (group.length >= 3 || isTotalMatch) {
        const volumeStr = FormatUtils.formatBytes(s1.actualUploaded);
        const s1Time = s1.seedingTime || 0;
        const timeStr = s1Time === 0 ? "sans seed" : `~${FormatUtils.formatDuration(s1Time)} de seed`;
        
        const suffix = isTotalMatch && group.length < 3 ? " (100% de l'activité)" : "";
        patterns.push(`~${volumeStr} ${timeStr} sur ${group.length} torrents${suffix}`);
        group.forEach(g => processed.add(g.infoHash));
      }
    }

    if (patterns.length > 0) {
      return `Pattern de triche automatique détecté (volumes et temps de seed identiques) : ${patterns.join(', ')}.`;
    }

    return null;
  }
});


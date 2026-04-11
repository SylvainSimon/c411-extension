import { AnalysisResult } from '../../types/cheat-detection';

export const BanUtils = {
    /**
     * Génère un motif de bannissement factuel et détaillé sans score technique
     */
    generateBanReason(analysis: AnalysisResult): string {
        const reasons = new Set<string>();
        
        // 1. Collecter toutes les raisons uniques des torrents suspects
        if (analysis.suspiciousTorrents) {
            analysis.suspiciousTorrents.forEach(t => {
                t.suspicionReasons.forEach(r => {
                    // On nettoie la raison pour garder le texte brut sans les chiffres entre parenthèses
                    const cleanReason = r.split('(')[0].trim();
                    reasons.add(cleanReason);
                });
            });
        }

        // 2. Ajouter les alertes globales (Patterns répétitifs, etc.)
        if (analysis.globalWarnings) {
            analysis.globalWarnings.forEach(w => reasons.add(w.trim()));
        }

        const motifsList = Array.from(reasons).join(', ');
        
        // Construction de la phrase finale
        let finalReason = `Traces de triche détectées sur vos transferts. `;
        
        if (motifsList) {
            finalReason += `Comportements identifiés : ${motifsList}. `;
        } else {
            finalReason += `Activité anormale et incohérente détectée. `;
        }

        finalReason += `Décision prise après analyse de ${analysis.totalDownloads} snatches récents.`;

        return finalReason;
    }
};

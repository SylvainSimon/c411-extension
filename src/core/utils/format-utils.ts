/**
 * Utilitaires de formatage partagés
 */
export const FormatUtils = {
  /**
   * Formate un nombre avec séparateurs français (espaces)
   * Arrondit à l'entier si >= 1000
   */
  formatNumber(num: number): string {
    const valueToFormat = Math.abs(num) >= 1000 ? Math.round(num) : num;
    return valueToFormat.toLocaleString('fr-FR').replace(/\s/g, '\u00A0');
  },

  /**
   * Formate une taille en octets avec espaces sur les milliers
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 o';
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po', 'Eo'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const index = Math.min(i, sizes.length - 1);
    const value = (bytes / Math.pow(k, index)).toFixed(2);
    
    return this.formatNumber(parseFloat(value)) + ' ' + sizes[index];
  },

  /**
   * Formate un débit en Mbps vers un format lisible (Mo/s ou Go/s)
   */
  formatSpeed(mbps: number): string {
    const MOps = mbps / 8;
    if (mbps >= 1000) {
      const GOps = MOps / 1000;
      return `${this.formatNumber(parseFloat(GOps.toFixed(2)))} Go/s`;
    }
    return `${this.formatNumber(parseFloat(MOps.toFixed(1)))} Mo/s`;
  },

  /**
   * Parse une date en s'assurant qu'elle est traitée comme du UTC si aucun fuseau n'est spécifié
   */
  parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // Si la date n'a pas de fuseau horaire (pas de Z ou de +/-), on ajoute Z pour forcer UTC
    const normalized = (dateStr.includes('Z') || dateStr.includes('+') || (dateStr.match(/-/g) || []).length > 2) 
      ? dateStr 
      : dateStr.replace(' ', 'T') + 'Z';
    return new Date(normalized);
  },

  /**
   * Formate une date au format français (JJ/MM/AAAA HH:mm)
   */
  formatDate(dateStr: string): string {
    const date = this.parseDate(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Formate une durée depuis des secondes avec padding des 0
   */
  formatDuration(seconds?: number): string {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
    if (seconds < 0) return '0 sec';

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (seconds < 60) {
      return `${Math.round(seconds)} sec`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return secs > 0 ? `${minutes} min ${pad(secs)} sec` : `${minutes} min`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours}h${pad(minutes)}`;
    } else {
      const days = seconds / 86400;
      if (days < 7) {
        return `${days.toFixed(1)} jour${days >= 2 ? 's' : ''}`;
      }
      return `${this.formatNumber(Math.round(days))} jours`;
    }
  }
};

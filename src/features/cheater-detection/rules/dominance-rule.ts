import { CheatRuleRegistry } from '../cheat-rule-registry';
import { FormatUtils } from '../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'dominance',
  name: 'Domination suspecte',
  check({ topSnatchers, userId }) {
    if (!topSnatchers || topSnatchers.length < 2) return null;

    const userSnatcher = topSnatchers.find(s => s.userId === userId);
    const isFirst = topSnatchers[0].userId === userId;

    if (isFirst && userSnatcher) {
      const secondSnatcher = topSnatchers[1];
      const userUpload = userSnatcher.actualUploaded;
      const secondUpload = secondSnatcher.actualUploaded;

      if (secondUpload > 0 && userUpload >= secondUpload * 10) {
        const dominanceRatio = userUpload / secondUpload;
        const formattedRatio = FormatUtils.formatNumber(parseFloat(dominanceRatio.toFixed(1)));
        const secondUploadFormatted = FormatUtils.formatBytes(secondUpload);
        
        return `Domination suspecte (${formattedRatio} fois plus d'envoi que le 2ème qui a ${secondUploadFormatted})`;
      }
    }
    return null;
  }
});

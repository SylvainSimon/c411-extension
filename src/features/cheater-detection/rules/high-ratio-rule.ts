import { CheatRuleRegistry } from '../cheat-rule-registry';
import { FormatUtils } from '../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'high-ratio',
  name: 'Ratio élevé',
  check({ stats, thresholds }) {
    if (stats.ratioBySize >= thresholds.minRatio) {
      const formatted = FormatUtils.formatNumber(stats.ratioBySize);
      return `Ratio élevé (${formatted})`;
    }
    return null;
  }
});

import { CheatRuleRegistry } from '../cheat-rule-registry';
import { FormatUtils } from '../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'suspicious-speed',
  name: 'Débit suspect',
  check({ stats }) {
    if (stats.uploadSpeedMbps > 1000) {
      const formatted = FormatUtils.formatSpeed(stats.uploadSpeedMbps);
      return `Débit suspect (${formatted})`;
    }
    return null;
  }
});

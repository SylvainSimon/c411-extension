import { CheatRuleRegistry } from '../cheat-rule-registry';
import { FormatUtils } from '../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'high-upload',
  name: 'Upload élevé',
  check({ stats, thresholds }) {
    if (thresholds.minUploadedTB && stats.uploadedTB >= thresholds.minUploadedTB) {
      const formatted = FormatUtils.formatNumber(stats.uploadedTB);
      return `Upload élevé (${formatted} TB)`;
    }
    return null;
  }
});

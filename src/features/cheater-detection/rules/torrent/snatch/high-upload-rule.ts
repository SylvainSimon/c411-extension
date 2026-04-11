import { CheatRuleRegistry } from '../../../cheat-rule-registry';
import { FormatUtils } from '../../../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'high-upload',
  name: 'Upload élevé',
  type: 'torrent',
  check({ snatch, thresholds }) {
    if (snatch && thresholds.minUploadedTB) {
      const uploadedTB = snatch.actualUploaded / (1024 * 1024 * 1024 * 1024);
      if (uploadedTB >= thresholds.minUploadedTB) {
        const formatted = FormatUtils.formatNumber(uploadedTB);
        return `Upload élevé (${formatted} TB)`;
      }
    }
    return null;
  }
});



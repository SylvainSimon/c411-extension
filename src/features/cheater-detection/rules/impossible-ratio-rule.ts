import { CheatRuleRegistry } from '../cheat-rule-registry';
import { FormatUtils } from '../../../core/utils/format-utils';

CheatRuleRegistry.register({
  id: 'impossible-ratio',
  name: 'Ratio impossible',
  type: 'torrent',
  check({ stats, metadata, torrentStats }) {
    if (!stats) return null;
    const completions = torrentStats?.completions ?? metadata?.completions;
    if (completions === undefined || completions <= 0) return null;

    if (stats.ratioBySize > completions) {
      const formattedRatio = FormatUtils.formatNumber(stats.ratioBySize);
      const formattedCompletions = FormatUtils.formatNumber(completions);
      return `Ratio impossible (${formattedRatio} > ${formattedCompletions} complétions)`;
    }
    return null;
  }
});

import { CheatRuleRegistry } from '../cheat-rule-registry';

CheatRuleRegistry.register({
  id: 'late-activity',
  name: 'Activité tardive',
  check({ snatch, metadata }) {
    if (!metadata || !metadata.createdAt) return null;

    const torrentCreatedAt = new Date(metadata.createdAt).getTime();
    const userFirstAction = new Date(snatch.firstAction).getTime();
    const delayHours = (userFirstAction - torrentCreatedAt) / 3600000;

    if (delayHours > 24) {
      const delayDays = delayHours / 24;
      const timeStr = delayDays >= 1 
        ? `${Math.round(delayDays)} jour${delayDays >= 2 ? 's' : ''}` 
        : `${Math.round(delayHours)}h`;
      return `Activité tardive (${timeStr} après la publication)`;
    }
    return null;
  }
});

import { CheatRule } from '../../types/cheat-detection';

const rules: CheatRule[] = [];

export const CheatRuleRegistry = {
  register(rule: CheatRule) {
    if (!rule.id || typeof rule.check !== 'function') {
      console.error('[CheatRuleRegistry] Règle invalide:', rule);
      return;
    }
    rules.push(rule);
    console.log(`[CheatRuleRegistry] Règle enregistrée: ${rule.id}`);
  },

  getRules(): CheatRule[] {
    return rules;
  }
};

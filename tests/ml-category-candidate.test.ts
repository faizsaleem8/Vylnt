import { expect, it } from 'vitest';
import { categoryCandidateDecision, categoryCandidateSchema } from '../packages/ml/category-candidate';
import { evidenceRules } from '../packages/core/evidence-context';

const policy = () => ({ version: 1, safetyPolicy: 'controlled-category-v4', categories: Object.fromEntries(evidenceRules.map(rule => [rule,
  rule === 'JS-002' ? { supported: true, calibration: { temperature: 1 }, thresholds: { contextual: .2, change: .8 }, logisticCalibration: { temperature: 2 }, logisticThresholds: { contextual: .1, change: .9 }, validationCount: 20 }
    : { supported: false, reason: 'missing-development-class' }])) });

it('abstains on unsupported categories even at saturated logits', () => {
  for (const logit of [-1000, 0, 1000]) {
    expect(categoryCandidateDecision(logit, 'CK-002', policy())).toBe('needs-review');
    expect(categoryCandidateDecision(logit, 'unsupported', policy())).toBe('needs-review');
  }
});
it('uses the selected category and comparator calibration without a global fallback', () => {
  expect(categoryCandidateDecision(2, 'JS-002', policy())).toBe('change-warranted');
  expect(categoryCandidateDecision(2, 'JS-002', policy(), true)).toBe('needs-review');
  expect(categoryCandidateDecision(-2, 'JS-002', policy())).toBe('contextual');
  const changed = policy(); changed.categories['JS-002'].thresholds = { contextual: 0, change: 1 };
  expect(categoryCandidateDecision(1000, 'JS-002', changed)).toBe('needs-review');
});
it('rejects missing categories, corrupt thresholds and nonfinite input', () => {
  const changed = policy(); delete changed.categories['CK-002'];
  expect(() => categoryCandidateSchema.parse(changed)).toThrow();
  expect(() => categoryCandidateDecision(NaN, 'JS-002', policy())).toThrow('Non-finite');
  const bad = policy(); bad.categories['JS-002'].thresholds = { contextual: .9, change: .1 };
  expect(() => categoryCandidateSchema.parse(bad)).toThrow();
});

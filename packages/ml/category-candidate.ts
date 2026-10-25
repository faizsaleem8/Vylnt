// Developer candidate policy only. Not a runtime release or assessment authority.
import { z } from 'zod';
import { evidenceRules } from '../core/evidence-context';
const calibration = z.object({ temperature: z.number().finite().min(.05).max(20) }).strict();
const thresholds = z.object({ contextual: z.number().finite().min(0).lt(.5), change: z.number().finite().gt(.5).max(1) }).strict();
const entry = z.discriminatedUnion('supported', [
  z.object({ supported: z.literal(false), reason: z.literal('missing-development-class') }).strict(),
  z.object({ supported: z.literal(true), calibration, thresholds, logisticCalibration: calibration, logisticThresholds: thresholds, validationCount: z.number().int().min(2).max(50000) }).strict(),
]);
export const categoryCandidateSchema = z.object({ version: z.literal(1), safetyPolicy: z.literal('controlled-category-v4'),
  categories: z.record(z.enum(evidenceRules), entry),
}).strict();
export function categoryCandidateDecision(logit: number, rule: string, input: unknown, logistic = false) {
  const policy = categoryCandidateSchema.parse(input);
  if (!Number.isFinite(logit)) throw new Error('Non-finite logit');
  const e = policy.categories[rule as typeof evidenceRules[number]];
  if (!e?.supported) return 'needs-review';
  const c = logistic ? e.logisticCalibration : e.calibration, t = logistic ? e.logisticThresholds : e.thresholds;
  if (t.contextual === 0 && t.change === 1) return 'needs-review';
  const score = 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, logit / c.temperature))));
  return score >= t.change ? 'change-warranted' : score <= t.contextual ? 'contextual' : 'needs-review';
}

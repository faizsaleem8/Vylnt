import { z } from 'zod';
import type { Report } from './index';
import { prepareEvidenceContexts, evidenceFeatureNames, evidenceRules, evidenceStepLimit } from './evidence-context';
import { evidenceVersion } from './insight-contracts';
import { predictSequence } from './ml-lstm';

const p = z.number().finite().min(-100).max(100);
const schema = z.object({
  schemaVersion: z.literal(evidenceVersion), kind: z.literal('evidence-lstm'), rulesetVersion: z.string().max(30),
  hiddenSize: z.literal(8), maxSteps: z.literal(evidenceStepLimit), gateOrder: z.literal('ifgo'),
  featureNames: z.array(z.string()).length(evidenceFeatureNames.length).refine(names => names.every((n, i) => n === evidenceFeatureNames[i])),
  weightInput: z.array(z.array(p).length(evidenceFeatureNames.length)).length(32), weightHidden: z.array(z.array(p).length(8)).length(32),
  biasInput: z.array(p).length(32), biasHidden: z.array(p).length(32), outputWeight: z.array(p).length(8), outputBias: p,
  calibration: z.object({ temperature: z.number().finite().min(.05).max(20) }).strict(),
  thresholds: z.object({ contextual: z.number().finite().min(0).lt(.5), change: z.number().finite().gt(.5).max(1) }).strict(),
  datasetHash: z.string().regex(/^[0-9a-f]{64}$/), splitHash: z.string().regex(/^[0-9a-f]{64}$/),
  provenance: z.enum(['controlled', 'human-reviewed']), releaseStatus: z.literal('experimental'),
  conflictVariants: z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(500),
}).strict();
export type EvidenceLstm = z.infer<typeof schema>;
export function parseEvidenceLstm(value: unknown): EvidenceLstm {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 128 * 1024) throw new Error('Model exceeds 128 KiB');
  return schema.parse(value);
}
/** Developer candidate inspection only. Experimental scores cannot affect production assessments. */
export function inspectEvidenceLstm(model: EvidenceLstm, report: Report) {
  if (model.rulesetVersion !== report.rulesetVersion) throw new Error('Model and scan ruleset versions differ');
  const variants = new Map<string, number>();
  const extract = prepareEvidenceContexts(report);
  return report.findings.map(finding => {
    const context = extract(finding);
    if (!evidenceRules.includes(finding.ruleId as typeof evidenceRules[number]) || ['missing', 'ambiguous'].includes(context.matching)) return { findingId: finding.id, state: 'needs-review' as const };
    let score = variants.get(context.variant);
    if (score === undefined) {
      const raw = Math.min(1 - 1e-15, Math.max(1e-15, predictSequence(model, context.sequence)));
      score = 1 / (1 + Math.exp(-Math.log(raw / (1 - raw)) / model.calibration.temperature));
      variants.set(context.variant, score);
    }
    return { findingId: finding.id, score, state: 'needs-review' as const };
  });
}

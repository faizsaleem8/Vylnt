import { z } from 'zod';
import type { Report } from '../core';
import { RULESET_VERSION } from '../core';
import { prepareEvidenceContexts, contextRequiresReview, evidenceRules } from '../core/evidence-context';
import { parseEvidenceLstm } from '../core/evidence-lstm';
import { predictSequence } from '../core/ml-lstm';
import { buildInsightAnalysis } from './insight-analysis';

const hex = z.string().regex(/^[0-9a-f]{64}$/);
export const experimentalReleaseSchema = z.object({
  qualificationPolicy: z.literal('vynlt-controlled-signal-v1'), effect: z.literal('display-only'),
  name: z.string().trim().min(1).max(160), scope: z.string().trim().min(1).max(512),
  candidateHash: hex, evaluationHash: hex, modelHash: hex, datasetHash: hex, splitHash: hex,
  modelJson: z.string().max(128 * 1024),
  supportedRules: z.array(z.enum(evidenceRules)).min(1).max(8),
  supportVariants: z.array(hex).min(1).max(500),
  evaluation: z.object({ testFamilies: z.number().int().min(1), testExamples: z.number().int().min(1), qualifiedCategories: z.literal(0) }).strict(),
}).strict();
export type ExperimentalEvidenceRelease = z.infer<typeof experimentalReleaseSchema>;
const sha = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');

/** An experimental signal cannot assign contextual states or change rule evidence. */
export async function analyseExperimentalEvidence(report: Report, input: ExperimentalEvidenceRelease) {
  const release = experimentalReleaseSchema.parse(input);
  if (new Set(release.supportVariants).size !== release.supportVariants.length || new Set(release.supportedRules).size !== release.supportedRules.length) throw new Error('Duplicate experimental scope identities');
  if (await sha(release.modelJson) !== release.modelHash) throw new Error('Experimental model hash mismatch');
  const model = parseEvidenceLstm(JSON.parse(release.modelJson));
  if (model.schemaVersion !== 'vynlt-evidence-v2' || model.provenance !== 'controlled' || model.datasetHash !== release.datasetHash || model.splitHash !== release.splitHash || model.rulesetVersion !== RULESET_VERSION || report.rulesetVersion !== model.rulesetVersion) throw new Error('Experimental model provenance or schema differs');
  const analysis = buildInsightAnalysis(report);
  const byId = new Map(report.findings.map(f => [f.id, f]));
  const extract = prepareEvidenceContexts(report);
  const scores = new Map<string, number | null>();
  const support = new Set(release.supportVariants), conflicts = new Set(model.conflictVariants);
  for (const issue of analysis.issues) {
    if (!release.supportedRules.includes(issue.category as typeof evidenceRules[number])) continue;
    const variants = new Map<string, typeof report.findings[number]>();
    for (const id of issue.findingIds) { const finding = byId.get(id)!; const context = extract(finding); variants.set(context.variant, finding); }
    const valid: number[] = [];
    for (const [variant, finding] of variants) {
      if (!scores.has(variant)) {
        const context = extract(finding), identity = await sha(variant);
        if (contextRequiresReview(report, context) || conflicts.has(identity) || !support.has(identity)) scores.set(variant, null);
        else {
          const raw = Math.min(1 - 1e-15, Math.max(1e-15, predictSequence(model, context.sequence)));
          const score = 1 / (1 + Math.exp(-Math.log(raw / (1 - raw)) / model.calibration.temperature));
          if (!Number.isFinite(score)) throw new Error('Non-finite experimental signal');
          // Freeze a bounded decimal signal, not engine-specific float tails.
          scores.set(variant, Math.round(score * 10000) / 10000);
        }
      }
      const score = scores.get(variant); if (typeof score === 'number') valid.push(score);
    }
    if (valid.length) issue.experimentalSignal = { minScore: Math.min(...valid), maxScore: Math.max(...valid), scoredVariants: valid.length, reviewOnlyVariants: variants.size - valid.length };
  }
  analysis.mode = 'experimental-model'; analysis.decisionPolicy = 'vynlt-controlled-signal-v1';
  analysis.model = { name: release.name, hash: release.modelHash, status: 'experimental', approvedCategories: [], evaluationHash: release.evaluationHash, candidateHash: release.candidateHash, scope: release.scope };
  analysis.limitations = [`Experimental LSTM scope: ${release.scope}. Frozen test: ${release.evaluation.testExamples} examples across ${release.evaluation.testFamilies} families; no category is qualified for de-emphasis.`,
    'Scores describe controlled scenario labels, not exploit probability or cookie purpose. Findings, severities, assessments and evidence-based recommendations remain unchanged. Unknown, conflicting and unfamiliar input variants receive no score.', ...analysis.limitations.filter(line => !line.includes('independently reviewed model'))];
  return analysis;
}

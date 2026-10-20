import { z } from 'zod';
import type { Report } from './index';
import { extractMlFeatures, featureNames, featureVersion, mlRules } from './ml-features';

const vector = (schema: z.ZodNumber) => z.array(schema).length(featureNames.length);
const modelSchema = z.object({
  schemaVersion: z.literal(featureVersion), kind: z.literal('experimental-logistic'),
  rulesetVersion: z.string().min(1).max(30),
  featureNames: z.array(z.string()).length(featureNames.length).refine(names => names.every((name, i) => name === featureNames[i])),
  mean: vector(z.number().finite().min(0).max(1)),
  scale: vector(z.number().finite().min(1e-12).max(1e6)),
  coefficients: vector(z.number().finite().min(-1e6).max(1e6)), intercept: z.number().finite().min(-1e6).max(1e6),
  threshold: z.number().finite().gt(0).lt(1), provenance: z.enum(['synthetic', 'reviewed']),
  liveUseApproved: z.literal(false),
}).strict();
export type MlModel = z.infer<typeof modelSchema>;
export const modelFileByteLimit = 64 * 1024;
export function parseMlModel(value: unknown): MlModel {
  const parsed = modelSchema.safeParse(value);
  if (!parsed.success) throw new Error('Unsupported model. Load a VYNLT experimental logistic model.json with matching features, finite parameters and liveUseApproved set to false.');
  return parsed.data;
}
export function predictFeatures(model: MlModel, features: Record<string, number>): number {
  if (Object.keys(features).length !== featureNames.length) throw new Error('Feature schema mismatch');
  let logit = model.intercept;
  featureNames.forEach((name, i) => {
    const value = features[name];
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid feature value');
    logit += (value - model.mean[i]) / model.scale[i] * model.coefficients[i];
  });
  if (!Number.isFinite(logit)) throw new Error('Model calculation is not finite');
  return logit >= 0 ? 1 / (1 + Math.exp(-logit)) : Math.exp(logit) / (1 + Math.exp(logit));
}
export type MlPrediction = { findingId: string; score: number; label: 'actionable' | 'contextual' } | { findingId: string; reason: string };
export function predictReport(model: MlModel, report: Report): MlPrediction[] {
  if (model.rulesetVersion !== report.rulesetVersion) throw new Error('Model and scan ruleset versions differ. Load a compatible model before running ML.');
  return report.findings.map(finding => {
    if (!mlRules.includes(finding.ruleId as typeof mlRules[number])) return { findingId: finding.id, reason: 'This rule is outside the model feature schema.' };
    try {
      const score = predictFeatures(model, extractMlFeatures(report, finding.id));
      return { findingId: finding.id, score, label: score >= model.threshold ? 'actionable' : 'contextual' };
    } catch { return { findingId: finding.id, reason: 'Observation metadata is incomplete or invalid for this model.' }; }
  });
}

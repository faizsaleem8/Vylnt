import { z } from 'zod';
import type { Report } from './index';
import type { MlPrediction } from './ml-inference';
import { mlRules } from './ml-features';
import { extractMlSequence, sequenceFeatureNames, sequenceLimit, sequenceVersion } from './ml-sequence';

const parameter = z.number().finite().min(-100).max(100);
const lstmSchema = z.object({
  schemaVersion: z.literal(sequenceVersion), kind: z.literal('experimental-lstm'),
  rulesetVersion: z.string().min(1).max(30), hiddenSize: z.literal(8),
  featureNames: z.array(z.string()).length(sequenceFeatureNames.length).refine(names => names.every((name, i) => name === sequenceFeatureNames[i])),
  maxSteps: z.literal(sequenceLimit), gateOrder: z.literal('ifgo'),
  supportedRules: z.array(z.enum(mlRules)).min(1).max(8).refine(values => new Set(values).size === values.length),
  weightInput: z.array(z.array(parameter).length(sequenceFeatureNames.length)).length(32),
  weightHidden: z.array(z.array(parameter).length(8)).length(32),
  biasInput: z.array(parameter).length(32), biasHidden: z.array(parameter).length(32),
  outputWeight: z.array(parameter).length(8), outputBias: parameter,
  threshold: z.number().finite().gt(0).lt(1), provenance: z.enum(['synthetic', 'reviewed']), liveUseApproved: z.literal(false),
}).strict();
export type LstmModel = z.infer<typeof lstmSchema>;
export function parseLstmModel(value: unknown): LstmModel {
  const parsed = lstmSchema.safeParse(value);
  if (!parsed.success) throw new Error('Unsupported model. Expected a bounded VYNLT experimental LSTM with matching sequence features.');
  return parsed.data;
}
const sigmoid = (x: number) => x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
/** PyTorch LSTM gate layout: input, forget, candidate, output. State resets per target. */
export function predictSequence(model: LstmModel, sequence: number[][]): number {
  if (sequence.length < 2 || sequence.length > sequenceLimit) throw new Error('Invalid sequence length');
  let hidden = Array<number>(8).fill(0), cell = Array<number>(8).fill(0);
  for (const input of sequence) {
    if (input.length !== sequenceFeatureNames.length || input.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error('Invalid sequence feature');
    const gates = model.weightInput.map((weights, k) => weights.reduce((sum, w, j) => sum + w * input[j], model.biasInput[k] + model.biasHidden[k]) + model.weightHidden[k].reduce((sum, w, j) => sum + w * hidden[j], 0));
    cell = cell.map((value, j) => sigmoid(gates[8 + j]) * value + sigmoid(gates[j]) * Math.tanh(gates[16 + j]));
    hidden = cell.map((value, j) => sigmoid(gates[24 + j]) * Math.tanh(value));
  }
  const logit = model.outputWeight.reduce((sum, w, j) => sum + w * hidden[j], model.outputBias);
  if (!Number.isFinite(logit)) throw new Error('Invalid LSTM calculation');
  return sigmoid(logit);
}
export function predictLstmReport(model: LstmModel, report: Report): MlPrediction[] {
  if (model.rulesetVersion !== report.rulesetVersion) throw new Error('Model and scan ruleset versions differ.');
  return report.findings.map(finding => {
    if (!model.supportedRules.includes(finding.ruleId as typeof mlRules[number])) return { findingId: finding.id, reason: 'This rule has no supported training coverage in this LSTM release.' };
    try {
      const score = predictSequence(model, extractMlSequence(report, finding.id));
      return { findingId: finding.id, score, label: score >= model.threshold ? 'actionable' : 'contextual' };
    } catch { return { findingId: finding.id, reason: 'Snapshot metadata is incomplete or invalid for LSTM analysis.' }; }
  });
}

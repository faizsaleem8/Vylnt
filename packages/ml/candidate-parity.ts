// Developer release check; uses the same numeric implementation as the worker.
import { z } from 'zod';
import type { EvidenceLstm } from '../core/evidence-lstm';
import { evidenceRules } from '../core/evidence-context';
import { predictSequence } from '../core/ml-lstm';

const fixtureSchema = (width: number) => z.object({
  modelHash: z.string().regex(/^[0-9a-f]{64}$/), tolerance: z.literal(1e-6),
  cases: z.array(z.object({ sequence: z.array(z.array(z.union([z.literal(-1), z.literal(0), z.literal(1)])).length(width)).min(2).max(74), rawScore: z.number().finite().min(0).max(1) }).strict()).min(2).max(32),
}).strict();

/** Hash binding alone cannot establish Python/JavaScript numerical agreement. */
export function verifyCandidateParity(model: EvidenceLstm, modelHash: string, input: unknown, requiredCategories: string[]) {
  const fixture = fixtureSchema(model.featureNames.length).parse(input);
  if (fixture.modelHash !== modelHash) throw new Error('Parity identifies another model');
  const categories = new Set<string>();
  let maximumError = 0;
  for (const item of fixture.cases) {
    const kinds = item.sequence.map(row => {
      if (row.slice(0, 5).filter(n => n === 1).length !== 1) throw new Error('Invalid parity structural sequence');
      return row.slice(0, 5).indexOf(1);
    });
    if (kinds[0] !== 0 || kinds.at(-1) !== 4 || kinds.some((k, i) => i > 0 && k < kinds[i - 1]) || [0, 4].some(k => kinds.filter(n => n === k).length !== 1) || [1, 2, 3].some(k => kinds.filter(n => n === k).length > 24)) throw new Error('Invalid parity structural order or context bounds');
    const target = item.sequence.at(-1)!.slice(-8);
    const category = evidenceRules.find((_, i) => target.every((n, j) => n === (i === j ? 1 : -1)));
    if (!category) throw new Error('Invalid parity target category');
    categories.add(category);
    const actual = predictSequence(model, item.sequence);
    const error = Math.abs(actual - item.rawScore);
    if (!Number.isFinite(actual) || error > fixture.tolerance) throw new Error('Python/browser LSTM parity failed');
    maximumError = Math.max(maximumError, error);
  }
  if (!requiredCategories.every(category => categories.has(category))) throw new Error('Parity cases do not cover every approved category');
  return { cases: fixture.cases.length, maximumError, tolerance: fixture.tolerance };
}

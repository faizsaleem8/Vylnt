import { expect, it } from 'vitest';
import fixture from '../ml/fixtures/evidence-lstm-parity.json';
import boundaries from '../ml/fixtures/evidence-lstm-boundary-parity.json';
import { evidenceRules } from '../packages/core/evidence-context';
import { parseEvidenceLstm } from '../packages/core/evidence-lstm';
import { verifyCandidateParity } from '../packages/ml/candidate-parity';

const model = parseEvidenceLstm(fixture.model);
it('agrees with PyTorch for all eight categories at 2, 26, 50 and 74 structural steps', () => {
  const result = verifyCandidateParity(model, boundaries.modelHash, boundaries, [...evidenceRules]);
  expect(result.cases).toBe(32);
  expect(result.maximumError).toBeLessThan(1e-6);
});
it('checks PyTorch reference scores through the browser numeric implementation', () => {
  expect(verifyCandidateParity(model, fixture.parity.modelHash, fixture.parity, ['HDR-001']).maximumError).toBeLessThan(1e-6);
});
it('rejects a numerically incorrect score even with valid model and case identities', () => {
  const changed = structuredClone(fixture.parity); changed.cases[0].rawScore = .1;
  expect(() => verifyCandidateParity(model, changed.modelHash, changed, ['HDR-001'])).toThrow('parity failed');
});
it('requires the fixed tolerance, correct model and every approved category', () => {
  expect(() => verifyCandidateParity(model, '0'.repeat(64), fixture.parity, ['HDR-001'])).toThrow('another model');
  expect(() => verifyCandidateParity(model, fixture.parity.modelHash, { ...fixture.parity, tolerance: .1 }, ['HDR-001'])).toThrow();
  expect(() => verifyCandidateParity(model, fixture.parity.modelHash, fixture.parity, ['JS-002'])).toThrow('every approved category');
});
it('rejects oversized contexts and invalid structural target vectors', () => {
  const changed = structuredClone(fixture.parity);
  changed.cases[0].sequence.at(-1)!.fill(-1);
  expect(() => verifyCandidateParity(model, changed.modelHash, changed, ['HDR-001'])).toThrow('structural');
  const target = structuredClone(fixture.parity);
  target.cases[0].sequence.at(-1)![38] = 1;
  expect(() => verifyCandidateParity(model, target.modelHash, target, ['HDR-001'])).toThrow('target category');
});

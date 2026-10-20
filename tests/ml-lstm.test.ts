import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { parseLstmModel, predictSequence, predictLstmReport } from '../packages/core/ml-lstm';
import { extractMlSequence, sequenceFeatureNames, sequenceLimit } from '../packages/core/ml-sequence';
import { sequenceDatasetExample } from '../packages/ml/sequence-dataset';
import { parseSubmission } from '../packages/core/validation';

const fixture = () => parseSubmission({ scanId: '00000000-0000-4000-8000-000000000001', observation: { url: 'https://example.test/path?secret=hidden#private', scannedAt: '2026-10-21T00:00:00Z', headers: {}, resources: Array.from({ length: 30 }, () => ({ url: 'http://cdn.test/a?key=secret', type: 'image', outcome: 'failed' })), scripts: Array.from({ length: 30 }, () => ({ url: 'https://cdn.test/a.js?secret=hidden', integrity: false })), cookies: Array.from({ length: 30 }, () => ({ name: 'session-private', secure: false, httpOnly: false, sameSite: 'lax', session: true })), domCollected: true } });
const reference = async () => JSON.parse(await readFile('ml/fixtures/lstm-parity.json', 'utf8'));

it('matches independent PyTorch recurrent predictions including short/max sequences and resets state', async () => {
  const ref = await reference(), model = parseLstmModel(ref.model);
  expect(ref.cases.some((row: { sequence: number[][] }) => row.sequence.length === sequenceLimit)).toBe(true);
  expect(model.weightHidden.flat().some(x => x !== 0)).toBe(true);
  for (const row of ref.cases) expect(predictSequence(model, row.sequence)).toBeCloseTo(row.score, 6);
  const first = predictSequence(model, ref.cases[0].sequence);
  predictSequence(model, ref.cases.at(-1).sequence);
  expect(predictSequence(model, ref.cases[0].sequence)).toBe(first);
});
it('bounds metadata groups, preserves target and coverage, and exports no raw identifiers or secrets', () => {
  const report = fixture(), before = structuredClone(report);
  const rows = extractMlSequence(report, report.findings[0].id);
  expect(rows).toHaveLength(sequenceLimit); expect(rows.every(row => row.length === sequenceFeatureNames.length)).toBe(true);
  expect(rows[0][15]).toBe(1); expect(rows.at(-1)![4]).toBe(1);
  const example = sequenceDatasetExample(report, 0, { familyId: 'private-family', label: 'unreviewed', provenance: 'synthetic', reason: 'insufficient-evidence' }, 'a'.repeat(32));
  expect(example.sequence).toEqual(rows);
  for (const secret of ['hidden', 'private', 'cdn.test', 'example.test', 'session', 'notes']) expect(JSON.stringify(example)).not.toContain(secret);
  expect(example).not.toHaveProperty('evidence');
  expect(report).toEqual(before);
  const missing = extractMlSequence({ ...report, observation: { ...report.observation, cookies: undefined, domCollected: false } }, report.findings[0].id);
  expect(missing[0][6]).toBe(0); expect(missing[0][7]).toBe(0);
  expect(missing.filter(row => row[2] || row[3])).toHaveLength(0);
});
it('rejects malformed artifacts, unsupported dimensions/versions, nonfinite weights and approval claims', async () => {
  const ref = await reference();
  for (const mutation of [{ hiddenSize: 9 }, { gateOrder: 'igfo' }, { maxSteps: 1000 }, { featureNames: [] }, { weightInput: [] }, { outputBias: Infinity }, { liveUseApproved: true }, { extra: 'code' }, { supportedRules: ['FUTURE'] }]) expect(() => parseLstmModel({ ...ref.model, ...mutation })).toThrow('Unsupported model');
  const model = parseLstmModel(ref.model);
  expect(() => predictSequence(model, [])).toThrow();
  expect(() => predictSequence(model, [[NaN], [0]])).toThrow();
});
it('abstains without training coverage, preserves reports and rejects incompatible rulesets', async () => {
  const model = parseLstmModel((await reference()).model), report = fixture(), before = structuredClone(report);
  expect(predictLstmReport(model, report)).toHaveLength(report.findings.length);
  expect(report).toEqual(before);
  expect(predictLstmReport(model, { ...report, findings: [] })).toEqual([]);
  expect(predictLstmReport({ ...model, supportedRules: ['JS-002'] }, report)[0]).toHaveProperty('reason');
  expect(() => predictLstmReport(model, { ...report, rulesetVersion: 'future' })).toThrow('versions differ');
});

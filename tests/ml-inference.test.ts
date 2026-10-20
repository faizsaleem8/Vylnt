import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { demoModel } from '../packages/ml/demo-model';
import { parseMlModel, predictFeatures, predictReport } from '../packages/core/ml-inference';
import { extractMlFeatures, featureNames } from '../packages/core/ml-features';
import { parseSubmission } from '../packages/core/validation';

const fixture = () => parseSubmission({ scanId: '00000000-0000-4000-8000-000000000001', observation: { url: 'https://example.test/', scannedAt: '2026-10-20T00:00:00Z', headers: {}, resources: [], scripts: [], domCollected: true } });
it('matches independent scikit-learn predictions with nonzero weights and scaling', async () => {
  const reference = JSON.parse(await readFile('ml/fixtures/browser-parity.json', 'utf8'));
  const model = parseMlModel(reference.model);
  for (const row of reference.cases) expect(predictFeatures(model, row.features)).toBeCloseTo(row.score, 12);
});
it('rejects unknown/malformed models, feature order drift, zero scales and promotion claims', () => {
  for (const mutation of [
    { kind: 'executable-model' }, { schemaVersion: 'future' }, { featureNames: [...demoModel.featureNames].reverse() },
    { coefficients: [1] }, { scale: Array(featureNames.length).fill(0) }, { intercept: Infinity },
    { mean: Array(featureNames.length).fill(-1) }, { threshold: 0 }, { liveUseApproved: true }, { script: 'bad' },
  ]) expect(() => parseMlModel({ ...demoModel, ...mutation })).toThrow('Unsupported model');
});
it('uses a stable sigmoid for extreme inputs and rejects invalid feature values', () => {
  const report = fixture(), features = extractMlFeatures(report, report.findings[0].id);
  expect(predictFeatures(parseMlModel({ ...demoModel, intercept: 1000 }), features)).toBe(1);
  expect(predictFeatures(parseMlModel({ ...demoModel, intercept: -1000 }), features)).toBe(0);
  expect(() => predictFeatures(parseMlModel(demoModel), { ...features, cookie_count: NaN })).toThrow('Invalid feature');
});
it('preserves report evidence/score, abstains on unsupported rules and rejects mismatched rulesets', () => {
  const report = fixture(); report.findings.push({ ...report.findings[0], id: 'future', ruleId: 'DOM-001' });
  const before = structuredClone(report), values = predictReport(parseMlModel(demoModel), report);
  expect(values).toHaveLength(report.findings.length); expect(values.at(-1)).toMatchObject({ findingId: 'future', reason: expect.any(String) });
  expect(report).toEqual(before);
  expect(() => predictReport(parseMlModel(demoModel), { ...report, rulesetVersion: 'future' })).toThrow('versions differ');
  expect(predictReport(parseMlModel(demoModel), { ...report, findings: [] })).toEqual([]);
});

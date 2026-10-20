import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { analyseScan } from '../packages/ml/automatic-analysis';
import { bundledModel } from '../packages/ml/bundled-model';
import { canonicalJson } from '../packages/core/integrity';
import { parseAnalysisModel } from '../packages/core/ml-model';
import { parseSubmission } from '../packages/core/validation';

const fixture = () => parseSubmission({ scanId: '00000000-0000-4000-8000-000000000001', observation: { url: 'https://example.test/', scannedAt: '2026-10-21T00:00:00Z', headers: {}, resources: [], scripts: [], domCollected: true } });
it('automatically analyses with the bundled release without modifying the original report', async () => {
  const report = fixture(), before = structuredClone(report), result = await analyseScan(report);
  expect(result.scanId).toBe(report.scanId); expect(result.values).toHaveLength(report.findings.length);
  expect(result.values.map(value => value.findingId)).toEqual(report.findings.map(finding => finding.id));
  expect(result.modelHash).toBe(createHash('sha256').update(canonicalJson(parseAnalysisModel(bundledModel.model))).digest('hex'));
  expect(result.provenance).toBe('synthetic'); expect(report).toEqual(before);
});
it('rejects invalid releases and incompatible scans instead of silently changing models', async () => {
  const report = fixture();
  await expect(analyseScan(report, { name: 'invalid', model: {} })).rejects.toThrow('Unsupported model');
  await expect(analyseScan({ ...report, rulesetVersion: 'other' })).rejects.toThrow('versions differ');
});
it('handles no findings and retains unsupported-rule abstention', async () => {
  const report = fixture();
  expect((await analyseScan({ ...report, findings: [] })).values).toEqual([]);
  report.findings.push({ ...report.findings[0], id: 'future', ruleId: 'FUTURE' });
  expect((await analyseScan(report)).values.at(-1)).toMatchObject({ findingId: 'future', reason: expect.any(String) });
});

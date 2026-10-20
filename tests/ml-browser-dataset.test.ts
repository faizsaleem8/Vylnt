import { expect, it } from 'vitest';
import { prepareBrowserDataset } from '../packages/ml/browser-dataset';
import { datasetExample, datasetEnvelope } from '../packages/ml/dataset';
import { parseSubmission } from '../packages/core/validation';

const fixture = () => parseSubmission({ scanId: '00000000-0000-4000-8000-000000000001', observation: { url: 'https://person:secret@example.test/page?token=secret#secret', scannedAt: '2026-10-20T00:00:00Z', headers: {}, scripts: [], resources: [], domCollected: true } });
const key = 'private-random-dataset-key-'.repeat(3), family = 'private-family';
it('matches the offline preparer exactly and exports no raw metadata or key', async () => {
  const report = fixture(), before = structuredClone(report);
  const labels = Object.fromEntries(report.findings.map(finding => [finding.id, 'actionable' as const]));
  const browser = await prepareBrowserDataset(report, labels, family, key);
  const offline = datasetEnvelope(report.findings.map((_, i) => datasetExample(report, i, { familyId: family, label: 'actionable', reason: 'security-impact-confirmed', provenance: 'reviewed' }, key)));
  expect(browser).toEqual(offline); expect(report).toEqual(before);
  expect(JSON.stringify(browser)).not.toMatch(/example\.test|private-family|private-random|token=|secret|observation|evidence|notes/);
});
it('defaults to unreviewed and preserves grouping across scans with different IDs', async () => {
  const report = fixture(), first = await prepareBrowserDataset(report, {}, family, key);
  const second = await prepareBrowserDataset({ ...report, scanId: '00000000-0000-4000-8000-000000000002', findings: [] }, {}, family, key);
  expect(first.examples.every(row => row.label === 'unreviewed' && row.reason === 'insufficient-evidence')).toBe(true);
  expect(first.examples[0].siteGroup).toBe(second.examples[0].siteGroup);
  expect(first.examples[0].scanGroup).toBe(second.examples[0].scanGroup);
  expect(first.examples[0].sampleId).not.toBe(second.examples[0].sampleId);
});
it('rejects stale labels/rulesets, missing grouping and weak keys instead of guessing annotations', async () => {
  const report = fixture();
  await expect(prepareBrowserDataset(report, { missing: 'actionable' }, family, key)).rejects.toThrow('outside');
  await expect(prepareBrowserDataset({ ...report, rulesetVersion: 'old' }, {}, family, key)).rejects.toThrow('current ruleset');
  await expect(prepareBrowserDataset(report, {}, ' ', key)).rejects.toThrow();
  await expect(prepareBrowserDataset(report, {}, family, 'short')).rejects.toThrow('dataset key');
});

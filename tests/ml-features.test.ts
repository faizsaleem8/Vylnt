import { expect, it } from 'vitest';
import { parseSubmission } from '../packages/core/validation';
import { extractMlFeatures, featureNames } from '../packages/core/ml-features';
import { datasetExample, datasetEnvelope } from '../packages/ml/dataset';

const fixture = () => parseSubmission({ scanId: '00000000-0000-4000-8000-000000000001', observation: { url: 'https://user:secret@example.test/page?token=private#fragment', scannedAt: '2026-10-20T00:00:00Z', headers: {}, resources: [{ url: 'http://cdn.example.test/pixel?private=removed', type: 'image', outcome: 'referenced' }], scripts: [{ url: 'https://cdn.example.test/app.js?private=removed', integrity: false }], domCollected: true } });
const annotation = { familyId: 'private-family-name', label: 'actionable' as const, provenance: 'reviewed' as const, reason: 'security-impact-confirmed' as const };
const key = 'private-dataset-key-'.repeat(4);

it('extracts bounded numeric features without raw evidence, labels, identifiers or secrets', () => {
  const report = fixture(), before = structuredClone(report);
  const values = extractMlFeatures(report, report.findings[0].id);
  expect(Object.keys(values)).toEqual(featureNames);
  expect(Object.values(values).every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  expect(values).toMatchObject({ headers_collected: 1, dom_collected: 1, cookies_collected: 0, https: 1, external_script_fraction: 1, mixed_resource_fraction: 1 });
  expect(JSON.stringify(values)).not.toMatch(/private|secret|example\.test|scanId|score|label/);
  expect(report).toEqual(before);
  expect(() => extractMlFeatures(report, 'missing')).toThrow('supported rule');
});
it('keeps availability indicators distinct from zero-count collection', () => {
  const report = fixture(); const first = extractMlFeatures(report, report.findings[0].id);
  report.observation.cookies = []; report.observation.domCollected = false;
  const second = extractMlFeatures(report, report.findings[0].id);
  expect(first.cookie_count).toBe(second.cookie_count);
  expect(first.cookies_collected).toBe(0); expect(second.cookies_collected).toBe(1);
  expect(second.external_script_fraction).toBe(0); expect(second.dom_collected).toBe(0);
});
it('creates stable private family groups, recalculates findings and excludes annotation notes/raw metadata', () => {
  const report = fixture(), row = datasetExample(report, 0, annotation, key);
  const next = { ...report, scanId: '00000000-0000-4000-8000-000000000002', findings: [], score: 100 };
  const other = datasetExample(next, 0, annotation, key);
  expect(row.siteGroup).toBe(other.siteGroup); expect(row.sampleId).not.toBe(other.sampleId);
  expect(row.scanGroup).toBe(other.scanGroup);
  expect(row.features).toEqual(other.features);
  expect(datasetExample(report, 0, { ...annotation, familyId: 'other-family' }, key).siteGroup).not.toBe(row.siteGroup);
  expect(JSON.stringify(datasetEnvelope([row]))).not.toMatch(/private-family-name|private-dataset-key|example\.test|token=|fragment|cookieName/);
});
it('requires explicit compatible labels and current ruleset rather than auto-labeling review verdicts', () => {
  const report = fixture();
  expect(() => datasetExample(report, 0, { ...annotation, label: 'fixed' as never }, key)).toThrow();
  expect(() => datasetExample(report, 0, { ...annotation, reason: 'intended-configuration' }, key)).toThrow();
  expect(() => datasetExample(report, 999, annotation, key)).toThrow('out of range');
  expect(() => datasetExample({ ...report, rulesetVersion: 'old' }, 0, annotation, key)).toThrow('current ruleset');
  expect(() => datasetExample(report, 0, annotation, 'short')).toThrow('key');
});

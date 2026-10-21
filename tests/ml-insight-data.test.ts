import { describe, expect, it } from 'vitest';
import { prepareInsightData } from '../packages/ml/prepare-insight-data';
import { assertPrivateMlPath } from '../packages/ml/private-path';
const secret = 'developer-key-unit-test-only'.repeat(2);
const report = () => ({ scanId: crypto.randomUUID(), observation: { url: 'https://app.test/', scannedAt: '2026-10-21T00:00:00Z', headers: {}, cookies: [], resources: [], scripts: [], domCollected: true } });
const review = (reviewer: string, label = 'change-warranted') => ({ findingIndex: 0, familyId: 'same-related-template', label, provenance: 'human-reviewed', reviewer,
  evidenceRecord: 'PRIVATE REVIEW REFERENCE', reviewedAt: '2026-10-21T00:00:00Z', reviewScope: 'Unit mechanics only; not an actual application review' });
describe('reviewed evidence preparation', () => {
  it('blocks private review output in dashboard source/public directories', () => {
    expect(() => assertPrivateMlPath('apps/dashboard/public/reviews.json')).toThrow('Private ML');
    expect(() => assertPrivateMlPath('ml/data/private.json')).not.toThrow();
  });
  it('collapses paired agreement and keeps private attribution out of numeric data', () => {
    const r = report(); const result = prepareInsightData([{ report: r, annotation: review('one') }, { report: r, annotation: review('two') }], secret);
    expect(result.dataset.examples).toHaveLength(1); expect(result.audit).toMatchObject({ independentReviewedTargets: 1, exactAgreement: 1 });
    expect(JSON.stringify(result.dataset)).not.toContain('PRIVATE REVIEW'); expect(JSON.stringify(result.dataset)).not.toContain('app.test');
  });
  it('represents reviewer disagreement as one uncertain example without voting', () => {
    const r = report(); const result = prepareInsightData([{ report: r, annotation: review('one') }, { report: r, annotation: review('two', 'contextual') }, { report: r, annotation: review('three') }], secret);
    expect(result.dataset.examples).toHaveLength(1); expect(result.dataset.examples[0].label).toBe('needs-review'); expect(result.audit.exactAgreement).toBe(0);
  });
  it('rejects single-review targets and splitting the same scan across families', () => {
    const r = report(); expect(() => prepareInsightData([{ report: r, annotation: review('one') }], secret)).toThrow('two distinct');
    expect(() => prepareInsightData([{ report: r, annotation: review('one') }, { report: r, annotation: { ...review('two'), familyId: 'different' } }], secret)).toThrow('multiple');
  });
});

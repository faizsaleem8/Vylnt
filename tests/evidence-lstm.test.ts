import { describe, expect, it, vi } from 'vitest';
import fixture from '../ml/fixtures/evidence-lstm-parity.json';
import { createReport } from '../packages/core';
import { parseEvidenceLstm, inspectEvidenceLstm } from '../packages/core/evidence-lstm';
import { predictSequence } from '../packages/core/ml-lstm';
import * as runtime from '../packages/core/ml-lstm';
import { aggregateAssessment } from '../packages/ml/insight-analysis';
import { analyseEvidenceReport, archivedEvidenceReleases, type EvidenceRelease } from '../packages/ml/evidence-release';
import { contentHash, verifyFrozenInsights } from '../packages/ml/frozen-insights';

describe('evidence-v2 numeric runtime and qualification', () => {
  it('agrees with independent PyTorch reference within 1e-6', () => {
    const model = parseEvidenceLstm(fixture.model);
    for (const item of fixture.parity.cases) expect(Math.abs(predictSequence(model, item.sequence) - item.rawScore)).toBeLessThanOrEqual(fixture.parity.tolerance);
    expect(() => parseEvidenceLstm({ ...fixture.model, extra: 'x'.repeat(128 * 1024) })).toThrow('128 KiB');
  });
  it('runs once per unique variant while linking all 71 observations', () => {
    const r = createReport(crypto.randomUUID(), { url: 'https://app.test/', scannedAt: '2026-10-21T00:00:00Z', domCollected: true, resources: [], scripts: Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/${i}`, integrity: false })) });
    const spy = vi.spyOn(runtime, 'predictSequence');
    try {
      const results = inspectEvidenceLstm(parseEvidenceLstm(fixture.model), r);
      expect(results).toHaveLength(71); expect(spy).toHaveBeenCalledTimes(1);
      expect(results.every(r => r.state === 'needs-review')).toBe(true);
    } finally { spy.mockRestore(); }
  });
  it('never majority-votes away change-required or uncertain group members', () => {
    expect(aggregateAssessment([...Array(70).fill('contextual'), 'change-warranted'])).toBe('change-warranted');
    expect(aggregateAssessment([...Array(70).fill('contextual'), 'needs-review'])).toBe('needs-review');
    expect(aggregateAssessment(['contextual'], true)).toBe('needs-review');
    expect(aggregateAssessment(['contextual'])).toBe('contextual');
  });
  it('applies scope gates and safety guards before contextual de-emphasis', async () => {
    // Fabricated metrics test gate mechanics only; this fixture is NEVER a shipped/reviewed release.
    const model = { ...fixture.model, provenance: 'human-reviewed', weightInput: fixture.model.weightInput.map(r => r.map(() => 0)), outputWeight: Array(8).fill(0), outputBias: -10, thresholds: { contextual: .1, change: .9 } };
    const modelJson = JSON.stringify(model), hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(modelJson)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const metrics = { changeCount: 30, contextualCount: 30, changeFamilies: 3, contextualFamilies: 3, precision: .95, recall: .98, coverage: .6, highCriticalContextual: 0, rulePrecision: .5, ruleRecall: 1, testFamilies: 10 };
    const release: EvidenceRelease = { name: 'UNIT TEST ONLY', modelJson, modelHash: hash, datasetHash: model.datasetHash, splitHash: model.splitHash, reviewRecordHash: 'a'.repeat(64), reviewedScope: 'Fabricated unit mechanics only', categories: { 'JS-002': metrics, 'CK-001': metrics } };
    const report = createReport(crypto.randomUUID(), { url: 'https://app.test/', headers: {}, cookies: [{ name: 'session', secure: false, httpOnly: true, session: true, sameSite: 'lax' }], domCollected: true, resources: [], scripts: [{ url: 'https://cdn.test/a', integrity: false, scriptType: 'classic', async: false, defer: true }], scannedAt: '2026-10-21T00:00:00Z' });
    const qualified = await analyseEvidenceReport(report, release);
    expect(qualified.mode).toBe('qualified-model'); expect(qualified.contextual.map(g => g.category)).toEqual(['JS-002']);
    expect(qualified.issues.find(g => g.category === 'CK-001')?.assessment).toBe('needs-review');
    const content = { version: 'vynlt-frozen-insights-v1' as const, originalScan: structuredClone(report), originalScanHash: await contentHash(report), analysis: qualified };
    const frozen = { id: await contentHash(content), hash: await contentHash(content), content, createdAt: '2026-10-21T00:00:00Z' };
    expect(await verifyFrozenInsights(frozen)).toBe(false);
    archivedEvidenceReleases.push(release);
    try { expect(await verifyFrozenInsights(frozen)).toBe(true); }
    finally { archivedEvidenceReleases.pop(); }
    report.observation.scripts[0].async = undefined;
    expect((await analyseEvidenceReport(report, release)).contextual).toHaveLength(0);
    expect((await analyseEvidenceReport(report, { ...release, modelHash: '0'.repeat(64) })).mode).toBe('evidence-summary');
    expect((await analyseEvidenceReport(report, { ...release, categories: { 'JS-002': { ...metrics, recall: .5 } } })).mode).toBe('evidence-summary');
  });
});

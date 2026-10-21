import { describe, expect, it, vi } from 'vitest';
import fixture from '../ml/fixtures/evidence-lstm-parity.json';
import { createReport } from '../packages/core';
import { prepareEvidenceContexts } from '../packages/core/evidence-context';
import { contentHash } from '../packages/core/integrity';
import { buildInsightAnalysis } from '../packages/ml/insight-analysis';
import { analyseEvidenceReport, archivedEvidenceReleases } from '../packages/ml/evidence-release';
import type { ExperimentalEvidenceRelease } from '../packages/ml/experimental-evidence';
import { verifyFrozenInsights } from '../packages/ml/frozen-insights';
import { insightHtml } from '../apps/server/insight-html';
import * as numeric from '../packages/core/ml-lstm';

async function setup() {
  // Numeric mechanics fixture only; not security accuracy or review evidence.
  const report = createReport(crypto.randomUUID(), { url: 'https://app.test/', scannedAt: '2026-10-22T00:00:00Z', headers: {}, cookies: [], domCollected: true, resources: [], scripts: Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/${i}.js`, integrity: false, scriptType: 'classic', async: false, defer: true })) });
  const finding = report.findings.find(f => f.ruleId === 'JS-002')!;
  const context = prepareEvidenceContexts(report)(finding);
  const shaText = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const modelJson = JSON.stringify(fixture.model);
  const release: ExperimentalEvidenceRelease = { qualificationPolicy: 'vynlt-controlled-signal-v1', effect: 'display-only', name: 'UNIT MECHANICS ONLY', scope: 'Controlled test only',
    candidateHash: 'a'.repeat(64), evaluationHash: 'b'.repeat(64), modelHash: await shaText(modelJson), datasetHash: fixture.model.datasetHash, splitHash: fixture.model.splitHash, modelJson,
    supportedRules: ['JS-002'], supportVariants: [await shaText(context.variant)], evaluation: { testFamilies: 1, testExamples: 1, qualifiedCategories: 0 } };
  return { report, release };
}

describe('controlled experimental LSTM integration', () => {
  it('runs once for 71 equivalent observations and never changes evidence assessments or severity', async () => {
    const { report, release } = await setup(), original = structuredClone(report), baseline = buildInsightAnalysis(report);
    const spy = vi.spyOn(numeric, 'predictSequence');
    try {
      const analysis = await analyseEvidenceReport(report, release);
      expect(analysis.mode).toBe('experimental-model'); expect(analysis.model.status).toBe('experimental'); expect(analysis.model.approvedCategories).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(analysis.issues.map(i => [i.category, i.assessment, i.originalSeverity, i.findingIds])).toEqual(baseline.issues.map(i => [i.category, i.assessment, i.originalSeverity, i.findingIds]));
      expect(analysis.contextual).toEqual([]); expect(report).toEqual(original);
      const issue = analysis.issues.find(i => i.category === 'JS-002')!;
      expect(issue.findingIds).toHaveLength(71); expect(issue.experimentalSignal?.scoredVariants).toBe(1);
      expect(issue.experimentalSignal!.minScore).toBe(issue.experimentalSignal!.maxScore);
      const content = { version: 'vynlt-frozen-insights-v1' as const, originalScan: report, originalScanHash: await contentHash(report), analysis };
      const hash = await contentHash(content), frozen = { id: hash, hash, createdAt: '2026-10-22T00:00:00Z', content };
      const html = insightHtml(frozen, '');
      expect(html.match(/Experimental LSTM signal:/g)).toHaveLength(1);
      expect(html).toContain('not exploit probabilities'); expect(html).toContain(release.modelHash);
    } finally { spy.mockRestore(); }
  });
  it('does not score unfamiliar, missing, conflicting or tampered inputs', async () => {
    const { report, release } = await setup();
    expect((await analyseEvidenceReport(report, { ...release, supportVariants: ['f'.repeat(64)] })).issues.every(i => !i.experimentalSignal)).toBe(true);
    const missing = structuredClone(report); missing.observation.cookies = undefined;
    expect((await analyseEvidenceReport(missing, release)).issues.every(i => !i.experimentalSignal)).toBe(true);
    const model = { ...fixture.model, conflictVariants: release.supportVariants }, modelJson = JSON.stringify(model);
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(modelJson)))].map(b => b.toString(16).padStart(2, '0')).join('');
    expect((await analyseEvidenceReport(report, { ...release, modelJson, modelHash: sha })).issues.every(i => !i.experimentalSignal)).toBe(true);
    expect((await analyseEvidenceReport(report, { ...release, modelHash: '0'.repeat(64) })).mode).toBe('evidence-summary');
    expect((await analyseEvidenceReport(report, { ...release, effect: 'hide-findings' } as unknown as ExperimentalEvidenceRelease)).mode).toBe('evidence-summary');
  });
  it('verifies archived scope versions even when they share weights, and rejects forged signals', async () => {
    const { report, release } = await setup();
    const analysis = await analyseEvidenceReport(report, release);
    const content = { version: 'vynlt-frozen-insights-v1' as const, originalScan: report, originalScanHash: await contentHash(report), analysis };
    const hash = await contentHash(content), frozen = { id: hash, hash, createdAt: '2026-10-22T00:00:00Z', content };
    archivedEvidenceReleases.push({ ...release, name: 'A different frozen scope' }, release);
    try {
      expect(await verifyFrozenInsights(frozen)).toBe(true);
      const forged = structuredClone(frozen); forged.content.analysis.issues.find(i => i.experimentalSignal)!.experimentalSignal!.minScore = .123456789;
      forged.id = forged.hash = await contentHash(forged.content);
      expect(await verifyFrozenInsights(forged)).toBe(false);
    } finally { archivedEvidenceReleases.splice(-2); }
  });
});

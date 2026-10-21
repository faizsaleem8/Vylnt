import type { Report } from '../core';
import { canonicalJson, contentHash } from '../core/integrity';
export { contentHash } from '../core/integrity';
import { reportStorageBytes } from '../core/report-size';
import type { InsightReport, StoredInsightReport } from '../core/insight-contracts';
import { analyseEvidenceReport, archivedEvidenceReleases, bundledEvidenceRelease } from './evidence-release';

export const insightByteLimit = 1024 * 1024;
export class InsightSizeError extends Error {
  constructor(readonly bytes: number) { super('The combined insights report exceeds 1 MiB. No issues were dropped. Keep the full-data export and create a smaller scan.'); }
}
export async function freezeInsights(report: Report): Promise<InsightReport> {
  const content: InsightReport = { version: 'vynlt-frozen-insights-v1', originalScan: structuredClone(report), originalScanHash: await contentHash(report), analysis: await analyseEvidenceReport(report) };
  const bytes = reportStorageBytes(content);
  if (bytes > insightByteLimit) throw new InsightSizeError(bytes);
  return content;
}
/** Verify both canonical integrity and trusted evidence/template derivation, including direct database writes. */
export async function verifyFrozenInsights(stored: StoredInsightReport): Promise<boolean> {
  if (stored.id !== stored.hash || await contentHash(stored.content) !== stored.hash) return false;
  if (stored.content.version !== 'vynlt-frozen-insights-v1') return false;
  const modelHash = stored.content.analysis.model.hash;
  const release = modelHash === null ? null : [bundledEvidenceRelease, ...archivedEvidenceReleases].find(r => r?.modelHash === modelHash);
  if (release === undefined) return false;
  const trusted: InsightReport = { version: 'vynlt-frozen-insights-v1', originalScan: stored.content.originalScan,
    originalScanHash: await contentHash(stored.content.originalScan), analysis: await analyseEvidenceReport(stored.content.originalScan, release) };
  return canonicalJson(trusted) === canonicalJson(stored.content);
}

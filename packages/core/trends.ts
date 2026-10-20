import type { ScanSummary } from './summary';

export const trendLimit = 30;
export const coverageLabel = (scan: ScanSummary) =>
  (['headers', 'dom', 'cookies'] as const).map(key => `${key === 'dom' ? 'DOM' : key}: ${scan.coverage[key] ? 'collected' : 'not collected'}`).join(' · ');

/** Chronological, same-page observations; never infer fixes from missing collection. */
export function historyTrend(selected: ScanSummary, others: readonly ScanSummary[]) {
  const unique = new Map<string, ScanSummary>();
  for (const scan of others) if (scan.url === selected.url && scan.scanId !== selected.scanId) unique.set(scan.scanId, scan);
  const recent = [...unique.values()].sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt) || b.scanId.localeCompare(a.scanId)).slice(0, trendLimit);
  const scans = [...recent, selected].sort((a, b) => Date.parse(a.scannedAt) - Date.parse(b.scannedAt) || a.scanId.localeCompare(b.scanId));
  const start = Date.parse(scans[0].scannedAt), duration = Date.parse(scans.at(-1)!.scannedAt) - start;
  return {
    points: scans.map(scan => ({ scan, fraction: duration ? (Date.parse(scan.scannedAt) - start) / duration : 0.5 })),
    partial: scans.some(scan => !scan.coverage.headers || !scan.coverage.dom || !scan.coverage.cookies),
    coverageChanged: scans.some(scan => coverageLabel(scan) !== coverageLabel(selected))
  };
}

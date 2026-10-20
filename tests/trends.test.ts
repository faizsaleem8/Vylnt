import { expect, it } from 'vitest';
import { historyTrend, coverageLabel } from '../packages/core/trends';
import type { ScanSummary } from '../packages/core/summary';

const scan = (n: number): ScanSummary => ({ scanId: String(n).padStart(3, '0'), url: 'https://example.test/page', scannedAt: new Date(n * 60000).toISOString(), score: 85, findingCount: 2, highCount: 0, coverage: { headers: true, dom: true, cookies: true }, hash: '', receivedAt: '' });
it('keeps the selected old scan and only the most recent 30 distinct same-page scans without mutating input', () => {
  const others = Array.from({ length: 40 }, (_, i) => scan(i + 1));
  const original = structuredClone(others);
  const trend = historyTrend(scan(0), [...others, scan(40), { ...scan(50), url: 'https://example.test/other' }, { ...scan(0), score: 1 }]);
  expect(trend.points).toHaveLength(31);
  expect(trend.points[0].scan.score).toBe(85);
  expect(trend.points[1].scan.scanId).toBe('011');
  expect(trend.points.at(-1)?.scan.scanId).toBe('040');
  expect(others).toEqual(original);
});
it('spaces observations by elapsed time and keeps timestamp ties deterministic', () => {
  const trend = historyTrend(scan(0), [scan(10), scan(1), { ...scan(2), scannedAt: scan(1).scannedAt }]);
  expect(trend.points.map(p => p.fraction)).toEqual([0, .1, .1, 1]);
  expect(trend.points.map(p => p.scan.scanId)).toEqual(['000', '001', '002', '010']);
});
it('handles a single point and equal timestamps without invalid coordinates', () => {
  expect(historyTrend(scan(1), []).points[0].fraction).toBe(.5);
  expect(historyTrend(scan(1), [{ ...scan(2), scannedAt: scan(1).scannedAt }]).points.map(p => p.fraction)).toEqual([.5, .5]);
});
it('distinguishes incomplete collection from changes in collection', () => {
  const partial = { ...scan(1), coverage: { headers: true, dom: false, cookies: true } };
  expect(historyTrend(partial, []).partial).toBe(true);
  expect(historyTrend(partial, []).coverageChanged).toBe(false);
  expect(historyTrend(scan(0), [partial]).coverageChanged).toBe(true);
  expect(historyTrend(scan(0), [scan(1)]).partial).toBe(false);
  expect(coverageLabel(partial)).toContain('DOM: not collected');
});

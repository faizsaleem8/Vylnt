import { expect, it } from 'vitest';
import { parseSubmission } from '../packages/core/validation';
import { groupMlInsights } from '../packages/ml/grouped-insights';

it('shows one issue/fix for 71 scripts and preserves mixed predictions and every affected ID', () => {
  const report = parseSubmission({ scanId: '00000000-0000-4000-8000-000000000071', observation: { url: 'https://example.test/', scannedAt: '2026-10-21T00:00:00Z', scripts: Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/${i}.js`, integrity: false })), resources: [], domCollected: true } });
  const before = structuredClone(report);
  const predictions = report.findings.map((finding, i) => i === 0 ? { findingId: finding.id, reason: 'Unavailable' } : { findingId: finding.id, score: .49, label: 'contextual' as const });
  const groups = groupMlInsights(report, predictions.reverse());
  expect(groups).toHaveLength(1); expect(groups[0].count).toBe(71);
  expect(groups[0].contextual).toBe(70); expect(groups[0].abstained).toBe(1);
  expect(groups[0].findingIds).toHaveLength(71); expect(groups[0].samples).toHaveLength(3);
  expect(groupMlInsights(report, [])[0].abstained).toBe(71);
  expect(report).toEqual(before);
  report.findings.push({ ...report.findings[0], id: 'different', recommendation: 'Different remedy' });
  expect(groupMlInsights(report, predictions)).toHaveLength(2);
});

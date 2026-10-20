import { expect, it } from 'vitest';
import { parseSubmission } from '../packages/core/validation';
import { summarizeReport } from '../packages/core/report-insights';

it('groups repeated fixes with counts and bounded samples without mutating or suppressing saved evidence', () => {
  const report = parseSubmission({ scanId: '00000000-0000-4000-8000-000000000001', observation: { url: 'https://example.test/', scannedAt: '2026-10-21T00:00:00Z', headers: {}, resources: [], scripts: [], domCollected: true } });
  const finding = report.findings[0];
  report.findings = Array.from({ length: 71 }, (_, i) => ({ ...finding, id: `${i}`, url: `https://example.test/${i}?secret=x`, evidence: { sample: 'a'.repeat(500) } }));
  const before = structuredClone(report), groups = summarizeReport(report);
  expect(groups).toHaveLength(1); expect(groups[0].count).toBe(71); expect(groups[0].samples).toHaveLength(3);
  expect(groups[0].samples.every(sample => sample.evidence.length <= 240 && !sample.url.includes('?'))).toBe(true);
  expect(report).toEqual(before);
  report.findings.push({ ...finding, recommendation: 'A distinct fix' });
  expect(summarizeReport(report)).toHaveLength(2);
});

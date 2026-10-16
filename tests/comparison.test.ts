import { expect, it } from 'vitest';
import { parseSubmission } from '../packages/core/validation';
import { compareReports, comparisonCaveat } from '../packages/core/comparison';

const report = (n: number) => parseSubmission({ scanId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, observation: {
  url: 'https://example.test/page?secret=removed', scannedAt: `2026-10-${n === 1 ? '15' : '16'}T00:00:00Z`, headers: {}, resources: [], scripts: [], domCollected: true
} });
it('ignores observation time and evidence key order when findings are unchanged', () => {
  const before = report(1), after = report(2);
  before.findings[0].evidence = { one: true, two: false }; after.findings[0].evidence = { two: false, one: true };
  expect(compareReports(after, before)).toMatchObject({ added: [], removed: [], changed: [], scoreChange: 0, coverageChanged: false, rulesetChanged: false });
});
it('identifies additions, removals and evidence/severity/confidence changes by stable finding identity', () => {
  const before = report(1), after = report(2);
  const removed = before.findings[0]; after.findings.shift();
  after.findings[0] = { ...after.findings[0], severity: 'high', confidence: 'low', evidence: { changed: true } };
  after.findings.push({ ...removed, id: 'new-finding', title: 'New observation' }); after.score = 70;
  const result = compareReports(after, before);
  expect(result.added.map(f => f.id)).toEqual(['new-finding']);
  expect(result.removed.map(f => f.id)).toEqual([removed.id]);
  expect(result.changed).toHaveLength(1); expect(result.changed[0].before.severity).toBe('medium');
  expect(result.scoreChange).toBe(-15);
});
it('warns about coverage and ruleset differences without declaring fixes', () => {
  const before = report(1), after = report(2); after.observation.domCollected = false; after.rulesetVersion = 'future-test';
  const result = compareReports(after, before);
  expect(result.coverageChanged).toBe(true); expect(result.rulesetChanged).toBe(true);
  expect(comparisonCaveat(result)).toContain('Collection coverage differs.');
  expect(comparisonCaveat(result)).toContain('does not establish that it was fixed');
});
it('rejects identical scan IDs and different page URLs', () => {
  const before = report(1), after = report(2);
  expect(() => compareReports(before, before)).toThrow('different scan');
  after.observation.url = 'https://example.test/other';
  expect(() => compareReports(after, before)).toThrow('same page URL');
});

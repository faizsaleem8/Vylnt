import { describe, expect, it } from 'vitest';
import { createReport, type Observation } from '../packages/core';
import { evidenceContext } from '../packages/core/evidence-context';
import { buildInsightAnalysis } from '../packages/ml/insight-analysis';

const observation = (): Observation => ({ url: 'https://app.test/', scannedAt: '2026-10-21T00:00:00.000Z', resources: [], scripts: [], domCollected: true });
describe('v2 insight evidence and safety contracts', () => {
  it('matches the target resource outcome without confusing a DOM reference with a completed request', () => {
    const o = observation(); o.resources = [{ url: 'http://cdn.test/a.js', type: 'script', outcome: 'completed' }, { url: 'http://cdn.test/a.js', type: 'script', outcome: 'referenced' }];
    const report = createReport(crypto.randomUUID(), o), finding = report.findings[0];
    expect(evidenceContext(report, finding)).toMatchObject({ matching: 'unique', facts: { completed: true, referenced: false } });
    expect(buildInsightAnalysis(report).issues[0].assessment).toBe('change-warranted');
    delete finding.evidence.observedOutcome;
    expect(evidenceContext(report, finding)).toMatchObject({ matching: 'ambiguous', facts: { https: false } });
  });
  it('retains 71 equivalent script references in one review issue', () => {
    const o = observation(); o.scripts = Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/${i}.js`, integrity: false }));
    const r = createReport(crypto.randomUUID(), o), analysis = buildInsightAnalysis(r);
    expect(analysis.issues).toHaveLength(1); expect(analysis.issues[0].findingIds).toHaveLength(71);
    expect(analysis.issues[0].variants).toHaveLength(1); expect(analysis.issues[0].assessment).toBe('needs-review');
    expect(analysis.contextual).toEqual([]);
  });
  it('uses target script attributes, preserves late targets and ignores identity changes', () => {
    const o = observation(); o.scripts = Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/${i}`, integrity: false, scriptType: 'classic', async: false, defer: true }));
    const r = createReport(crypto.randomUUID(), o), target = r.findings.at(-1)!;
    const before = evidenceContext(r, target);
    o.scripts.find(s => s.url === target.url)!.async = true;
    expect(evidenceContext(r, target).variant).not.toBe(before.variant);
    const renamed = structuredClone(r); renamed.observation.scripts.forEach(s => s.url = s.url.replace('cdn.test', 'other.test')); renamed.findings.forEach(f => f.url = f.url.replace('cdn.test', 'other.test'));
    expect(evidenceContext(renamed, renamed.findings.at(-1)!).variant).toBe(evidenceContext(r, target).variant);
  });
  it('abstains on ambiguous cookie matches and leaves original severity untouched', () => {
    const o = observation(); o.cookies = [{ name: 'session', secure: false, httpOnly: false, session: true, sameSite: 'lax' }, { name: 'session', secure: true, httpOnly: false, session: false, sameSite: 'strict' }];
    const r = createReport(crypto.randomUUID(), o); const c = evidenceContext(r, r.findings[0]);
    expect(c.matching).toBe('ambiguous'); expect(c.facts.secure).toBeUndefined();
    expect(buildInsightAnalysis(r).issues[0]).toMatchObject({ assessment: 'needs-review', originalSeverity: 'high' });
  });
  it('does not fabricate attributes on legacy scans or infer cookie purpose from names', () => {
    const o = observation(); o.scripts = [{ url: 'https://cdn.test/a', integrity: false }];
    const r = createReport(crypto.randomUUID(), o), c = evidenceContext(r, r.findings[0]);
    expect(c.facts.async).toBe('unknown'); expect(c.sequence.length).toBeLessThanOrEqual(74);
    expect(c.variant).not.toContain('cdn.test'); expect(c.missingContext.join(' ')).toContain('not collected');
  });
});

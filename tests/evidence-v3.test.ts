import { describe, expect, it } from 'vitest';
import { createReport, cspEvidenceComplete, securityHeaders, type Report } from '../packages/core';
import { evidenceContext } from '../packages/core/evidence-context';
import { evidenceFeatureNames3, prepareEvidenceContexts3, scriptSourceConstraint } from '../packages/core/evidence-v3';
import { parseEvidenceLstm, inspectEvidenceLstm } from '../packages/core/evidence-lstm';
import { prepareInsightData } from '../packages/ml/prepare-insight-data';
import { analyseEvidenceReport } from '../packages/ml/evidence-release';
import fixture from '../ml/fixtures/evidence-lstm-parity.json';
import parity3 from '../ml/fixtures/evidence-lstm-v3-parity.json';
import { verifyCandidateParity } from '../packages/ml/candidate-parity';
import { evidenceRules } from '../packages/core/evidence-context';

const scan = (policy: string | undefined, extraHeaders: Record<string, string> = {}): Report => createReport(crypto.randomUUID(), {
  url: 'https://app.test/', scannedAt: '2026-10-22T00:00:00Z', headers: { ...(policy === undefined ? {} : { 'content-security-policy': policy }), ...extraHeaders },
  cspEvidenceComplete: true, cookies: [], resources: [], domCollected: true, scripts: [{ url: 'https://cdn.test/file.js', integrity: false, scriptType: 'classic', async: false, defer: true }],
});
const target = (r: Report) => r.findings.find(f => f.ruleId === 'JS-002')!;
const constraint = (policy: string | undefined) => { const r = scan(policy); return scriptSourceConstraint(r, target(r)); };

describe('conservative target CSP evidence v3', () => {
  it('agrees with PyTorch on every category at 2, 26, 50 and 74 steps', () => {
    const result = verifyCandidateParity(parseEvidenceLstm(parity3.model), parity3.parity.modelHash, parity3.parity, [...evidenceRules]);
    expect(result.cases).toBe(32); expect(result.maximumError).toBeLessThanOrEqual(1e-6);
    const malformed = structuredClone(parity3.parity);
    malformed.cases[0].sequence[0].pop();
    expect(() => verifyCandidateParity(parseEvidenceLstm(parity3.model), parity3.parity.modelHash, malformed, [])).toThrow();
  });
  it.each([
    ["script-src 'self'", 'excluded'], ["default-src 'none'", 'excluded'],
    ['script-src https://cdn.test', 'permitted'], ['script-src https://cdn.test:443', 'permitted'],
    ['script-src https://cdn.test/', 'permitted'],
    ["default-src 'none'; script-src https://cdn.test", 'permitted'],
    ["script-src https://cdn.test; script-src-elem 'none'", 'excluded'],
    ["script-src 'none'; script-src https://cdn.test", 'excluded'],
    ["script-src https://cdn.test, script-src 'self'", 'excluded'],
    ["SCRIPT-SRC 'self' 'sha256-YWJjZA=='", 'excluded'], ['script-src', 'excluded'],
  ])('matches only supported response policies: %s', (policy, expected) => expect(constraint(policy)).toBe(expected));

  it.each([undefined, '', "script-src 'nonce-YWJj'", "script-src 'strict-dynamic'", 'script-src https:', 'script-src *',
    'script-src https://*.test', 'script-src https://cdn.test/a', 'script-src cdn.test', "script-src 'unsafe-inline'",
    "script-src 'none' https://cdn.test", 'script-src https://cdn.test:99999', "script-src 'self', report-uri /report",
    'script-src https://cdn.test\n', "script-src 'self' 'invalid'", "script-src 'self',", 'script-src https://cdn.test.'])
    ('abstains on unavailable/unsupported policy: %s', policy => expect(constraint(policy)).toBe('unknown'));

  it('does not treat report-only, incomplete metadata or completed contradictions as exclusion', () => {
    const r = scan(undefined, { 'content-security-policy-report-only': "script-src 'none'" });
    expect(scriptSourceConstraint(r, target(r))).toBe('unknown');
    r.observation.headers!['content-security-policy'] = "script-src 'self'";
    r.observation.resources.push({ url: target(r).url, type: 'script', outcome: 'completed' });
    expect(scriptSourceConstraint(r, target(r))).toBe('contradictory');
    expect(prepareEvidenceContexts3(r)(target(r)).sequence.at(-1)![37]).toBe(-1);
    r.observation.domCollected = false;
    expect(scriptSourceConstraint(r, target(r))).toBe('unknown');
  });

  it('requires explicit collection coverage; truncated or privacy-transformed sources cannot become exclusions', () => {
    const r = scan("script-src 'self'"); delete r.observation.cspEvidenceComplete;
    expect(scriptSourceConstraint(r, target(r))).toBe('unknown');
    const headers = (value: string) => [{ name: 'Content-Security-Policy', value }];
    expect(cspEvidenceComplete(headers('script-src https://cdn.test'))).toBe(true);
    expect(cspEvidenceComplete(headers('script-src https://user:pass@cdn.test/?token=secret'))).toBe(false);
    expect(cspEvidenceComplete(headers("script-src 'nonce-secret'"))).toBe(false);
    expect(cspEvidenceComplete(headers("script-src 'self'; report-uri https://report.test/" + ' '.repeat(8192)))).toBe(false);
    expect(cspEvidenceComplete(headers("script-src 'self'".repeat(600)))).toBe(false);
    expect(cspEvidenceComplete([])).toBe(false);
    r.observation.headers = securityHeaders(headers('script-src https://cdn.test'));
    r.observation.cspEvidenceComplete = true;
    expect(scriptSourceConstraint(r, target(r))).toBe('permitted');
  });

  it('changes relevant inputs while keeping renamed identifiers and historical v2 unchanged', () => {
    const a = scan("script-src 'self'"), b = scan('script-src https://cdn.test');
    const extract = (r: Report) => prepareEvidenceContexts3(r)(target(r));
    const original = evidenceContext(a, target(a));
    expect(extract(a).sequence.at(-1)![37]).toBe(1);
    expect(extract(b).sequence.at(-1)![37]).toBe(0);
    expect(extract(a).variant).not.toBe(extract(b).variant);
    const renamed = structuredClone(a);
    renamed.observation.url = 'https://renamed.test/';
    renamed.observation.scripts[0].url = 'https://different.test/renamed.js';
    target(renamed).url = renamed.observation.scripts[0].url;
    expect(extract(renamed).variant).toBe(extract(a).variant);
    expect(evidenceContext(a, target(a))).toEqual(original);
    expect(original.sequence[0]).toHaveLength(45);
    expect(extract(a).sequence[0]).toHaveLength(46);
    expect(extract(a).sequence.at(-1)!.slice(-8)).toEqual(original.sequence.at(-1)!.slice(-8));
  });

  it('groups equivalent targets, preserves every link and emits numeric-only private training data', () => {
    const r = scan("script-src 'self'");
    r.observation.scripts = Array.from({ length: 71 }, (_, i) => ({ ...r.observation.scripts[0], url: `https://cdn.test/${i}.js` }));
    const full = createReport(r.scanId, r.observation);
    const findings = full.findings.filter(f => f.ruleId === 'JS-002');
    expect(findings).toHaveLength(71);
    expect(new Set(findings.map(f => prepareEvidenceContexts3(full)(f).variant)).size).toBe(1);
    const inputs = findings.map(f => ({ report: full, annotation: { findingIndex: full.findings.indexOf(f), familyId: 'same-app',
      label: 'contextual', provenance: 'controlled', evidenceRecord: 'private-source-record', oracleVersion: 'unit-only', oraclePassed: true } }));
    const { dataset, audit } = prepareInsightData(inputs, 'unit-only-private-key'.repeat(2), 'vynlt-evidence-v3');
    expect(dataset.examples).toHaveLength(1); expect(audit.repeatedContextLabelsRemoved).toBe(70);
    expect(dataset.featureNames).toEqual(evidenceFeatureNames3);
    expect(JSON.stringify(dataset)).not.toMatch(/cdn\.test|private-source-record|same-app/);
  });

  it('marks unsupported policy context uncertain before training rather than learning a contextual shortcut', () => {
    const r = scan("script-src 'nonce-YWJj' 'strict-dynamic'");
    const { dataset } = prepareInsightData([{ report: r, annotation: { findingIndex: r.findings.indexOf(target(r)), familyId: 'test-app',
      label: 'contextual', provenance: 'controlled', evidenceRecord: 'unit-record', oracleVersion: 'unit-only', oraclePassed: true } }],
    'unit-only-private-key'.repeat(2), 'vynlt-evidence-v3');
    expect(dataset.examples[0].uncertain).toBe(true);
  });

  it('parses a distinct bounded model but cannot promote v3 through the historical release policy', async () => {
    const model = { ...fixture.model, schemaVersion: 'vynlt-evidence-v3', featureNames: [...evidenceFeatureNames3],
      weightInput: fixture.model.weightInput.map(row => [...row.slice(0, 37), 0, ...row.slice(37)]) };
    const parsed = parseEvidenceLstm(model), r = scan("script-src 'self'");
    expect(inspectEvidenceLstm(parsed, r).find(p => p.findingId === target(r).id)?.score).toBeTypeOf('number');
    expect(() => parseEvidenceLstm({ ...model, featureNames: fixture.model.featureNames })).toThrow();
    const { bundledEvidenceRelease } = await import('../packages/ml/evidence-release');
    if (!bundledEvidenceRelease) throw new Error('Expected bundled v2 experimental fixture');
    const json = JSON.stringify(model), hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))).toString('hex');
    const result = await analyseEvidenceReport(r, { ...bundledEvidenceRelease, modelJson: json, modelHash: hash });
    expect(result.mode).toBe('evidence-summary');
  });
});

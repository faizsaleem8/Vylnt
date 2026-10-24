import { describe, it, expect } from 'vitest';
import { createReport } from '../packages/core';
import { evaluateGate } from '../packages/core/gate';
import { gateConfigSchema, outgoingCommits } from '../apps/cli/gate-config';

const report = () => createReport(crypto.randomUUID(), { url: 'https://127.0.0.1/', scannedAt: new Date().toISOString(), headers: {}, cookies: [{ name: 'session', secure: false, httpOnly: false, sameSite: 'lax', session: true }], domCollected: true, resources: [{ url: 'http://127.0.0.1/script.js', type: 'script', outcome: 'failed' }], scripts: [] });
describe('fresh commit gate policy', () => {
  it('blocks high/high resource warnings, retains lower-confidence high and medium warnings', () => {
    const verdict = evaluateGate(report());
    expect(verdict.blocking.map(f => f.ruleId)).toEqual(['NET-001']);
    expect(verdict.warnings.some(f => f.ruleId === 'CK-001' && f.severity === 'high')).toBe(true);
    expect(verdict.warnings.some(f => f.ruleId === 'HDR-001')).toBe(true);
  });
  it('does not let annotations/model fields change the policy and fails on unknown coverage', () => {
    const scan = Object.assign(report(), { review: 'fixed', ml: { contextual: true } });
    expect(evaluateGate(scan).blocking.length).toBe(1);
    scan.observation.cookies = undefined; expect(() => evaluateGate(scan)).toThrow();
    const other = report(); other.rulesetVersion = 'unknown'; expect(() => evaluateGate(other)).toThrow();
  });
  it('accepts warnings-only scans without claiming vulnerabilities', () => {
    const scan = report(); scan.findings = scan.findings.filter(f => f.ruleId !== 'NET-001');
    expect(evaluateGate(scan).blocking).toEqual([]); expect(evaluateGate(scan).warnings.length).toBeGreaterThan(0);
  });
});
describe('gate configuration and outgoing updates', () => {
  const config = { version: 1, directory: '.', startScript: 'start', routes: ['/'] };
  it('uses bounded local defaults and refuses weakened policies, paths, scripts and remote routes', () => {
    expect(gateConfigSchema.parse(config).port).toBe(0);
    for (const edit of [{ directory: '../outside' }, { directory: 'C:/outside' }, { startScript: 'start & echo secret' }, { routes: ['//example.org'] }, { routes: ['/x?token=secret'] }, { routes: ['/x#secret'] }, { exceptions: [] }, { failOn: 'none' }, { commandTimeoutMs: 0 }]) expect(gateConfigSchema.safeParse({ ...config, ...edit }).success).toBe(false);
  });
  it('deduplicates outgoing tips, ignores deletions/tags, rejects malformed updates', () => {
    const a = 'a'.repeat(40), b = 'b'.repeat(40), zero = '0'.repeat(40);
    expect(outgoingCommits(`refs/heads/one ${a} refs/heads/one ${b}\nrefs/heads/two ${a} refs/heads/two ${zero}\n(delete) ${zero} refs/heads/three ${a}\nrefs/tags/v1 ${b} refs/tags/v1 ${zero}\n`)).toEqual([a]);
    expect(() => outgoingCommits('invalid input')).toThrow();
  });
});

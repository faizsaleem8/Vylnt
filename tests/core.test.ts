import { describe, expect, it } from 'vitest';
import { cookieMetadata, createReport, evaluate, safeUrl, scoreFindings, securityHeaders, type Observation } from '../packages/core';

const base = (): Observation => ({ url: 'https://example.test/', scannedAt: '2026-10-14T10:00:00Z',
  headers: { 'strict-transport-security': 'max-age=31536000', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'" },
  cookies: [], resources: [], scripts: [], domCollected: true });
const ids = (o: Observation) => evaluate(o).map(f => f.ruleId);
describe('configuration rules', () => {
  it('does not flag deliberately hardened observations', () => expect(evaluate(base())).toEqual([]));
  it('finds all three missing HTTPS header controls', () => expect(ids({ ...base(), headers: {} })).toEqual(['HDR-001', 'HDR-002', 'HDR-003']));
  it('does not infer missing headers when collection did not happen', () => expect(ids({ ...base(), headers: undefined })).toEqual([]));
  it('does not require HSTS over HTTP and detects max-age=0 over HTTPS', () => {
    expect(ids({ ...base(), url: 'http://example.test/', headers: {} })).not.toContain('HDR-001');
    expect(ids({ ...base(), headers: { ...base().headers, 'strict-transport-security': 'max-age=0' } })).toContain('HDR-001');
  });
  it('accepts X-Frame-Options and detects broad CSP', () => {
    const found = ids({ ...base(), headers: { 'x-frame-options': 'SAMEORIGIN', 'content-security-policy': "script-src * 'unsafe-inline'" } });
    expect(found).not.toContain('HDR-002'); expect(found).toContain('HDR-003');
  });
  it('uses the first duplicate directive and enforces multiple policies together', () => {
    expect(ids({ ...base(), headers: { 'content-security-policy': "script-src *; script-src 'none'" } })).toContain('HDR-003');
    expect(ids({ ...base(), headers: { 'content-security-policy': "script-src *, script-src 'none'; frame-ancestors 'none'" } })).not.toContain('HDR-003');
  });
  it('checks sensitive names and does not call unspecified SameSite unsafe', () => {
    const cookie = { name: 'session_id', secure: false, httpOnly: false, sameSite: 'no_restriction' as const, session: true };
    expect(ids({ ...base(), cookies: [cookie] })).toEqual(['CK-001', 'CK-002', 'CK-003']);
    expect(ids({ ...base(), cookies: [{ ...cookie, name: 'theme' }] })).toEqual([]);
    expect(ids({ ...base(), cookies: [{ ...cookie, sameSite: 'unspecified' }] })).not.toContain('CK-003');
  });
  it('records insecure references without claiming successful execution', () => {
    const o: Observation = { ...base(), resources: [{ url: 'http://cdn.test/app.js?token=secret', type: 'script', outcome: 'referenced' }] };
    expect(evaluate(o)[0]).toMatchObject({ ruleId: 'NET-001', url: 'http://cdn.test/app.js', evidence: { observedOutcome: 'referenced' } });
    expect(ids({ ...o, url: 'http://example.test/' })).not.toContain('NET-001');
  });
  it('treats missing external SRI as informational and ignores same-origin scripts', () => {
    expect(evaluate({ ...base(), scripts: [{ url: 'https://cdn.test/a.js', integrity: false }] })[0].severity).toBe('info');
    expect(ids({ ...base(), scripts: [{ url: 'https://example.test/a.js', integrity: false }, { url: 'https://cdn.test/b.js', integrity: true }] })).toEqual([]);
  });
  it('deduplicates evidence and caps score penalties once per rule', () => {
    const script = { url: 'http://cdn.test/a.js', type: 'script', outcome: 'referenced' as const };
    const findings = evaluate({ ...base(), resources: [script, script, { ...script, url: 'http://cdn.test/b.js' }] });
    expect(findings).toHaveLength(2); expect(scoreFindings(findings)).toBe(90);
    expect(createReport('test', base())).toEqual(createReport('test', base()));
  });
});
describe('privacy boundaries', () => {
  it('drops credentials, queries and fragments from URLs', () => {
    expect(safeUrl('https://user:password@example.test/path?code=secret#token')).toBe('https://example.test/path');
    expect(safeUrl('data:text/plain,secret')).toBe('[unsupported URL]');
    expect(safeUrl('invalid')).toBe('[invalid URL]');
  });
  it('retains only security response headers', () => expect(securityHeaders([
    { name: 'Set-Cookie', value: 'secret=value' }, { name: 'Authorization', value: 'Bearer secret' }, { name: 'X-Frame-Options', value: 'DENY' }
  ])).toEqual({ 'x-frame-options': 'DENY' }));
  it('explicitly projects cookie metadata without values or arbitrary properties', () => {
    const cookie = { name: 'session', secure: true, httpOnly: true, sameSite: 'strict' as const, session: false, value: 'secret', domain: 'example.test' };
    expect(cookieMetadata(cookie)).toEqual({ name: 'session', secure: true, httpOnly: true, sameSite: 'strict', session: false });
  });
});

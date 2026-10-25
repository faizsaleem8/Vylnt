import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import sources from '../ml/applications/sources.lock.json';
import { parseApplicationLock, applicationAsset, applicationProfiles, controlledResponse, assertControlledResponse, controlledTargetIndexes, loadVerifiedApplication, sourceDigest } from '../packages/ml/application-corpus';
import { createReport } from '../packages/core';
import { scanPage } from '../apps/cli/scanner';
const dirs: string[] = [];
afterEach(async () => { for (const dir of dirs.splice(0)) { if (!dir.startsWith(resolve('.local') + sep)) throw new Error('Invalid cleanup path'); await rm(dir, { recursive: true, force: true }); } });

describe('pinned controlled application corpus', () => {
  it('pins distinct upstream families, bounded files and retained declared licences', () => {
    const parsed = parseApplicationLock(sources);
    expect(parsed.length).toBeGreaterThanOrEqual(3); expect(parsed.flatMap(a => a.files).length).toBeGreaterThanOrEqual(23);
    expect(parsed.every(a => a.files.some(f => f.path === a.licenseFile))).toBe(true);
    const changed = structuredClone(sources); changed.applications[0].familyId += '-variant';
    expect(() => parseApplicationLock(changed)).toThrow('upstream repository');
  });
  it('never labels unrelated upstream inventory or cookies with the controlled fixture label', () => {
    const report = createReport(crypto.randomUUID(), { url: 'https://localhost:1234/index.html', scannedAt: '2026-10-22T00:00:00Z',
      headers: {}, domCollected: true, resources: [], scripts: [{ url: 'https://analytics.test/loader.js', integrity: false }, { url: 'https://127.0.0.1:1234/vylnt-fixture.js', integrity: false }],
      cookies: [{ name: 'upstream_cookie', secure: true, httpOnly: false, session: true, sameSite: 'lax' }, { name: 'session_fixture', secure: true, httpOnly: false, session: true, sameSite: 'lax' }] });
    const script = applicationProfiles.find(p => p.id === 'script-permitted-defer')!;
    const cookie = applicationProfiles.find(p => p.id === 'cookie-no-httponly')!;
    expect(controlledTargetIndexes(report, script).map(i => report.findings[i].url)).toEqual(['https://127.0.0.1:1234/vylnt-fixture.js']);
    expect(controlledTargetIndexes(report, cookie).map(i => report.findings[i].evidence.cookieName)).toEqual(['session_fixture']);
    expect(controlledTargetIndexes(report, applicationProfiles[0])).toEqual([]);
  });
  it('hashes existing event handlers without granting general inline execution', () => {
    const result = controlledResponse('<button onclick="start();">Play</button>', applicationProfiles[0], 'https://localhost:1234', 'http://127.0.0.1:1235');
    expect(result.headers['Content-Security-Policy']).toContain("script-src-attr 'unsafe-hashes' 'sha256-");
    expect(result.headers['Content-Security-Policy']).not.toContain("'unsafe-inline'");
  });
  it('does not encode cookie purpose in lifetime, names or client code', () => {
    for (const [preference, server] of [['readable-preference', 'persistent-server-cookie'], ['session-readable-preference', 'cookie-no-httponly']]) {
      const a = applicationProfiles.find(p => p.id === preference)!;
      const b = applicationProfiles.find(p => p.id === server)!;
      expect(a.label).toBe('contextual'); expect(b.label).toBe('change-warranted');
      expect(controlledResponse('<html></html>', a, 'https://localhost:1234', 'http://127.0.0.1:1235'))
        .toEqual(controlledResponse('<html></html>', b, 'https://localhost:1234', 'http://127.0.0.1:1235'));
    }
  });
  it('serves only allowlisted assets and rejects encoded traversal or checkout metadata', () => {
    const app = parseApplicationLock(sources)[1];
    expect(applicationAsset(app, '/')).toBe('examples/javascript-es6/dist/index.html');
    for (const path of ['/.git/config', '/%2e%2e/LICENSE', '/..%5csecret', '/%00index.html', '/package-lock.json', '/%invalid']) expect(applicationAsset(app, path)).toBeUndefined();
    const changed = structuredClone(sources); changed.applications[0].files[0].path = '../secret';
    expect(() => parseApplicationLock(changed)).toThrow();
  });
  it('uses configuration oracles independent of findings for all eight categories', () => {
    expect(new Set(applicationProfiles.map(p => p.rule).filter(Boolean)).size).toBe(8);
    for (const profile of applicationProfiles) {
      const response = controlledResponse('<html><script>void 0;</script></html>', profile, 'https://localhost:1234', 'http://127.0.0.1:1235');
      expect(assertControlledResponse(profile, response.headers, response.html).configurationPassed).toBe(true);
      if (profile.id !== 'broad-script-policy') expect(response.headers['Content-Security-Policy']).toContain("'sha256-");
      expect(() => assertControlledResponse(profile, { ...response.headers, 'Strict-Transport-Security': profile.id === 'missing-hsts' ? 'max-age=300' : 'tampered' }, response.html)).toThrow();
      if (profile.id === 'baseline') expect(response.headers['Set-Cookie']).toBeUndefined();
      if (profile.id === 'readable-preference') {
        expect(response.headers['Set-Cookie']).toContain('Max-Age=3600');
        expect(() => assertControlledResponse(profile, { ...response.headers, 'Set-Cookie': response.headers['Set-Cookie'].replace('; Max-Age=3600', '') }, response.html)).toThrow();
      }
    }
    expect(() => controlledResponse('', applicationProfiles[0], 'https://remote.example', 'http://localhost:1')).toThrow('loopback');
  });
  it('rejects changed cached bytes before application execution', async () => {
    await mkdir('.local', { recursive: true });
    const dir = await mkdtemp(resolve('.local/corpus-test-')); dirs.push(dir);
    const data = { 'LICENSE': 'Permission is hereby granted; test fixture only.', 'index.html': '<html></html>' };
    const app = parseApplicationLock({ version: 1, applications: [{ id: 'test', familyId: 'upstream:test/application', repository: 'test/application', revision: 'a'.repeat(40), license: 'MIT', licenseFile: 'LICENSE', root: '.', entry: 'index.html', files: Object.entries(data).map(([path, value]) => ({ path, sha256: sourceDigest(value), bytes: Buffer.byteLength(value) })) }] })[0];
    await mkdir(`${dir}/test`);
    for (const [path, value] of Object.entries(data)) await writeFile(`${dir}/test/${path}`, value);
    expect((await loadVerifiedApplication(app, dir)).size).toBe(2);
    await writeFile(`${dir}/test/index.html`, '<html>changed</html>');
    await expect(loadVerifiedApplication(app, dir)).rejects.toThrow('Pinned source mismatch');
  });
  it('rejects remote or unbounded corpus origin scopes before launching a browser', async () => {
    await expect(scanPage('http://localhost:1234', { allowedLocalOrigins: ['https://remote.example'] })).rejects.toThrow('Local origin scope');
    await expect(scanPage('http://localhost:1234', { allowRemote: true, allowedLocalOrigins: ['http://localhost:1234'] })).rejects.toThrow('Local origin scope');
    await expect(scanPage('http://localhost:1234', { allowedLocalOrigins: ['http://localhost:1234/private'] })).rejects.toThrow('Local origin scope');
  });
});

// Controlled localhost applications and a network oracle independent of VYNLT rules.
import https from 'node:https';
import http from 'node:http';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { parseArgs } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
const out = resolve(values.output ?? `.local/ml-controlled/runs/${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
if (!out.startsWith(resolve('.local') + '\\') && !out.startsWith(resolve('.local') + '/')) throw new Error('Controlled runs must remain in the private .local directory');
await mkdir(resolve(out, '..'), { recursive: true });
await mkdir(out);
const rules = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001', 'JS-002'];
const labels = ['change-warranted', 'contextual', 'needs-review'];
const specs = rules.flatMap(rule => labels.map(label => ({ id: `${rule}-${label}`, rule, label, family: 'controlled-network-template-v1', assumedIntent: label === 'change-warranted' ? 'The controlled specification requires a configuration change.' : label === 'contextual' ? 'This controlled application intentionally uses this configuration with independent compensating requirements.' : 'Application intent is deliberately unspecified.' })));
for (const [rule, variant, label] of [['CK-001', 'misleading-name', 'contextual'], ['JS-002', 'module', 'change-warranted'], ['JS-002', 'async', 'change-warranted'], ['JS-002', 'restricted-policy', 'needs-review'], ['NET-001', 'completed', 'change-warranted'], ['NET-001', 'failed', 'change-warranted'], ['HDR-001', 'zero-lifetime', 'change-warranted'], ['HDR-003', 'unsafe-eval', 'needs-review']]) {
  specs.push({ id: `${rule}-${variant}`, rule, label, variant, family: 'controlled-network-template-v1', assumedIntent: variant === 'misleading-name' ? 'This inert cookie is deliberately named auth_theme; the name does not make it authentication state.' : 'Configuration variant; application impact is not inferred from the scanner.' });
}
specs.push({ id: 'CK-002-persistent-preference', rule: 'CK-002', label: 'contextual', variant: 'persistent-preference', family: 'controlled-network-template-v1', assumedIntent: 'This controlled persistent preference intentionally requires JavaScript access. Persistence does not establish cookie purpose outside this fixture.' });
const tls = { key: await readFile('.local/tls/key.pem'), cert: await readFile('.local/tls/cert.pem') };
let port, resourcePort;
const handler = (req, res) => {
  if (req.url.startsWith('/asset')) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end('/* Controlled empty fixture. No application or user data. */'); return; }
  const spec = specs.find(s => `/${s.id}` === req.url);
  if (!spec) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'text/html');
  if (spec.rule !== 'HDR-001') res.setHeader('Strict-Transport-Security', 'max-age=300');
  if (spec.variant === 'zero-lifetime') res.setHeader('Strict-Transport-Security', 'max-age=0');
  if (spec.rule !== 'HDR-002') res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', spec.rule === 'HDR-003' || spec.rule === 'JS-002' ? "script-src https: 'unsafe-inline'" : "script-src 'self'");
  if (spec.variant === 'restricted-policy') res.setHeader('Content-Security-Policy', `script-src https://127.0.0.1:${port}`);
  if (spec.variant === 'unsafe-eval') res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-eval'");
  if (spec.rule.startsWith('CK-')) res.setHeader('Set-Cookie', `${spec.variant === 'misleading-name' ? 'auth_theme' : 'session_fixture'}=controlled-placeholder; Path=/; ${spec.rule === 'CK-001' ? '' : 'Secure; '}${spec.rule === 'CK-002' ? '' : 'HttpOnly; '}${spec.rule === 'CK-003' ? 'SameSite=None' : 'SameSite=Lax'}${spec.variant === 'persistent-preference' ? '; Max-Age=3600' : ''}`);
  const preferenceCode = 'document.documentElement.dataset.readable=String(document.cookie.split(";").some(c=>c.trim().startsWith("session_fixture=")));';
  if (spec.variant === 'persistent-preference') res.setHeader('Content-Security-Policy', `script-src 'self' 'sha256-${createHash('sha256').update(preferenceCode).digest('base64')}'`);
  const body = spec.variant === 'persistent-preference' ? `<script>${preferenceCode}</script>` : spec.rule === 'JS-002' ? `<script src="https://127.0.0.1:${port}/asset.js" ${spec.variant === 'module' ? 'type="module"' : spec.variant === 'async' ? 'async' : 'defer'}></script>` : spec.rule === 'NET-001' ? `<img alt="Controlled fixture" src="http://127.0.0.1:${resourcePort}/${spec.variant ?? 'failed'}/asset.png">` : '';
  res.end(`<!doctype html><html lang="en"><title>VYNLT controlled fixture</title><body><h1>Controlled fixture</h1>${body}</body></html>`);
};
const server = https.createServer(tls, handler);
const resources = http.createServer((req, res) => {
  if (req.url.startsWith('/failed/')) { req.socket.destroy(); return; }
  res.writeHead(200, { 'Content-Type': 'image/gif' }); res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'));
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); port = server.address().port;
await new Promise(r => resources.listen(0, '127.0.0.1', r)); resourcePort = resources.address().port;
const modulePath = resolve(out, 'controlled-scanner.mjs');
await build({ entryPoints: ['apps/cli/scanner.ts'], bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { scanPage } = await import(pathToFileURL(modulePath).href);
const manifest = { version: 2, examples: [] }, records = [];
try {
  for (const spec of specs) {
    // Network header/HTML assertions use Node's TLS client, not evaluate()/VYNLT rule findings.
    const result = await new Promise((resolveResult, reject) => https.get(`https://127.0.0.1:${port}/${spec.id}`, { rejectUnauthorized: false }, res => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => resolveResult({ headers: res.headers, body })); }).on('error', reject));
    if (spec.rule === 'HDR-001') assert.equal(result.headers['strict-transport-security'], spec.variant === 'zero-lifetime' ? 'max-age=0' : undefined);
    if (spec.rule === 'HDR-002') assert.equal(result.headers['x-frame-options'], undefined);
    if (spec.rule === 'HDR-003') assert.match(result.headers['content-security-policy'], spec.variant === 'unsafe-eval' ? /unsafe-eval/ : /unsafe-inline/);
    if (spec.rule.startsWith('CK-')) {
      const cookie = result.headers['set-cookie'][0];
      if (spec.rule === 'CK-001') assert.ok(!cookie.includes('Secure'));
      if (spec.rule === 'CK-002') assert.ok(!cookie.includes('HttpOnly'));
      if (spec.rule === 'CK-003') assert.ok(cookie.includes('SameSite=None') && cookie.includes('Secure'));
      assert.equal(cookie.includes('Max-Age=3600'), spec.variant === 'persistent-preference');
    }
    if (spec.rule === 'NET-001') assert.ok(result.body.includes('src="http:'));
    if (spec.rule === 'JS-002') {
      assert.ok(result.body.includes('<script') && !result.body.includes('integrity='));
      if (spec.variant === 'module') assert.ok(result.body.includes('type="module"'));
      if (spec.variant === 'async') assert.ok(result.body.includes(' async>'));
      if (spec.variant === 'restricted-policy') assert.ok(!result.headers['content-security-policy'].includes('unsafe-inline'));
    }
    if (spec.rule === 'NET-001' && spec.variant) {
      const outcome = await new Promise(resolveOutcome => http.get(`http://127.0.0.1:${resourcePort}/${spec.variant}/asset.png`, res => { res.resume(); res.on('end', () => resolveOutcome('completed')); }).on('error', () => resolveOutcome('failed')));
      assert.equal(outcome, spec.variant);
    }
    // localhost page + 127.0.0.1 script creates an explicit cross-origin controlled script.
    const report = await scanPage(`https://localhost:${port}/${spec.id}`, { ignoreHTTPSErrors: true, waitMs: 50 });
    if (spec.variant === 'persistent-preference') {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ channel: 'chromium', headless: true });
      try {
        const page = await browser.newPage({ ignoreHTTPSErrors: true });
        await page.goto(`https://localhost:${port}/${spec.id}`);
        assert.equal(await page.evaluate(() => document.documentElement.dataset.readable), 'true');
        assert.ok((await page.context().cookies()).find(c => c.name === 'session_fixture')?.expires > Date.now() / 1000);
      } finally { await browser.close(); }
    }
    const index = report.findings.findIndex(f => f.ruleId === spec.rule);
    assert.ok(index >= 0, `Scanner did not collect target ${spec.id}`);
    await writeFile(`${out}/${spec.id}.json`, JSON.stringify(report), { mode: 0o600 });
    const evidenceRecord = `network-oracle-v1/${spec.id}`;
    records.push({ ...spec, evidenceRecord, oracleVersion: 'network-oracle-v1', oraclePassed: true, limits: 'Only response/DOM configuration assertions are verified. Labels express controlled intent, not independently reviewed real-application security.' });
    manifest.examples.push({ reportFile: `${spec.id}.json`, findingIndex: index, familyId: spec.family, label: spec.label, provenance: 'controlled', evidenceRecord, oracleVersion: 'network-oracle-v1', oraclePassed: true });
  }
  await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  await writeFile(`${out}/oracle-records.json`, JSON.stringify(records, null, 2), { mode: 0o600 });
  console.log(`PASS ${specs.length} localhost scenarios and independent network configuration assertions. One shared template family only; no reviewed model approval. Prepare/audit will expose unobservable intent conflicts.`);
  console.log(`Saved exclusive controlled run: ${out}`);
} finally { await Promise.all([new Promise(r => server.close(r)), new Promise(r => resources.close(r))]); }

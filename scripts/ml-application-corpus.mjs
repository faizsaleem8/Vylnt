// Runs only the approved pinned applications on ephemeral loopback servers.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import http from 'node:http';
import https from 'node:https';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { holdoutSmoke } from './ml-holdout-smoke.mjs';

const { values } = parseArgs({ options: { application: { type: 'string' }, profiles: { type: 'string' }, 'source-lock': { type: 'string' }, holdout: { type: 'boolean', default: false } } });

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
const output = resolve('.local/ml-applications/runs', runId);
await mkdir(output, { recursive: true });
const save = (name, value) => writeFile(resolve(output, name), JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
const modulePath = resolve(output, 'corpus-runtime.mjs');
await build({ stdin: { contents: "export * from './packages/ml/application-corpus'; export { createReviewPacket, reviewReadiness } from './packages/ml/review-workflow'; export { scanPage } from './apps/cli/scanner'; export { scriptSourceConstraint } from './packages/core/evidence-v3';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { parseApplicationLock, loadVerifiedApplication, applicationAsset, controlledResponse, assertControlledResponse, controlledTargetIndexes, applicationProfiles, applicationRequirement, readablePreference, persistentCookie, scriptAttributes, createReviewPacket, reviewReadiness, sourceDigest, scanPage, scriptSourceConstraint } = await import(pathToFileURL(modulePath).href);
const lockBytes = await readFile(values['source-lock'] ?? 'ml/applications/sources.lock.json');
const allApps = parseApplicationLock(JSON.parse(lockBytes.toString()));
const apps = values.application !== undefined ? allApps.filter(app => app.id === values.application) : allApps;
if (!apps.length) throw new Error('Unknown application');
const profiles = values.profiles !== undefined ? applicationProfiles.filter(p => values.profiles.split(',').includes(p.id)) : values.holdout ? applicationProfiles.filter(p => p.id === 'baseline' || p.rule === 'JS-002') : applicationProfiles;
if (!profiles.length || (values.profiles !== undefined && profiles.length !== new Set(values.profiles.split(',')).size)) throw new Error('Unknown or empty profile selection');
if (values.holdout && profiles.some(p => p.id !== 'baseline' && p.rule !== 'JS-002')) throw new Error('External holdout scope is JS-002 only');
const lockHash = sourceDigest(lockBytes);
const harnessHash = sourceDigest(JSON.stringify(await Promise.all(['packages/ml/application-corpus.ts', 'scripts/ml-application-corpus.mjs', 'scripts/ml-holdout-smoke.mjs', 'apps/cli/scanner.ts', 'packages/core/evidence-v3.ts'].map(async path => ({ path, sha256: sourceDigest(await readFile(path)) })))));
const tls = { key: await readFile('.local/tls/key.pem'), cert: await readFile('.local/tls/cert.pem') };
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.local/browsers');
const { chromium } = await import('playwright');
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const manifest = { version: 2, examples: [] }, records = [], packetPaths = [];
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon', '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const request = url => new Promise((done, reject) => https.get(url, { rejectUnauthorized: false, agent: false }, res => { let body = ''; res.on('data', chunk => { body += chunk; if (body.length > 2 * 1024 * 1024) res.destroy(new Error('Oracle response too large')); }); res.on('error', reject); res.on('end', () => done({ status: res.statusCode, headers: res.headers, body })); }).on('error', reject));
const listen = server => new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
const close = server => new Promise(done => { server.closeAllConnections(); server.close(done); });
try {
  for (const app of apps) {
    const files = await loadVerifiedApplication(app, resolve('.local/ml-applications/cache'));
    const entry = app.root === '.' ? app.entry : `${app.root}/${app.entry}`;
    for (const profile of profiles) {
      let origin, insecureOrigin;
      const resources = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'image/gif' }); res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')); });
      const server = https.createServer(tls, (req, res) => {
        let pathname; try { pathname = new URL(req.url, 'https://localhost').pathname; } catch { res.writeHead(400); res.end(); return; }
        if (pathname === '/vylnt-fixture-authorized') {
          const serverPurpose = ['cookie-no-httponly', 'persistent-server-cookie'].includes(profile.id);
          const present = (req.headers.cookie ?? '').split(';').some(c => c.trim() === 'session_fixture=controlled-placeholder');
          res.writeHead(serverPurpose && present ? 204 : 401, { 'Cache-Control': 'no-store' }); res.end(); return;
        }
        if (pathname === '/vylnt-fixture.js') { res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' }); res.end('document.documentElement.dataset.vylntFixtureExecuted="true";'); return; }
        const path = applicationAsset(app, pathname);
        if (!path) { res.writeHead(404); res.end(); return; }
        if (path === entry) {
          const result = controlledResponse(files.get(path).toString(), profile, origin, insecureOrigin);
          res.writeHead(200, result.headers); res.end(result.html);
        } else { res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(files.get(path)); }
      });
      try {
        await listen(resources); insecureOrigin = `http://127.0.0.1:${resources.address().port}`;
        await listen(server); origin = `https://localhost:${server.address().port}`;
        const target = `${origin}/${app.entry}`;
        const response = await request(target); assert.equal(response.status, 200);
        const oracle = assertControlledResponse(profile, response.headers, response.body);
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        const allowed = new Set([origin, origin.replace('localhost', '127.0.0.1'), insecureOrigin]);
        let blockedExternal = 0, scriptErrors = 0;
        try {
          await context.route('**/*', route => { const url = new URL(route.request().url()); if (!allowed.has(url.origin)) { blockedExternal++; return route.abort(); } return route.continue(); });
          const page = await context.newPage(); page.on('pageerror', error => { scriptErrors++; if (process.env.VYLNT_ML_DIAG === '1') console.error('Controlled application runtime error:', error.name, error.message.slice(0, 220)); });
          await page.addInitScript(() => {
            globalThis.vylntFixturePolicyViolations = 0;
            document.addEventListener('securitypolicyviolation', event => {
              if (event.blockedURI.endsWith('/vylnt-fixture.js') && event.effectiveDirective === 'script-src-elem' && event.disposition === 'enforce') globalThis.vylntFixturePolicyViolations++;
            });
          });
          await page.goto(target, { waitUntil: 'load' });
          // Only booleans/counts persist. Synthetic interaction text is not collected.
          if (app.id === 'game-2048') { await page.locator('.tile').first().waitFor(); await page.keyboard.press('ArrowLeft'); assert.ok(await page.locator('.tile').count() >= 2); }
          if (app.id === 'todomvc') { await page.locator('.new-todo').fill('VYLNT controlled task'); await page.locator('.new-todo').press('Enter'); await page.locator('.todo-list li').first().waitFor(); assert.equal(await page.locator('.todo-list li').count(), 1); }
          if (app.id === 'reveal') { await page.waitForFunction(() => window.Reveal?.isReady()); await page.keyboard.press('ArrowRight'); await page.waitForFunction(() => window.Reveal.getIndices().h === 1); }
          if (!['game-2048', 'todomvc', 'reveal'].includes(app.id) && !app.smoke) throw new Error('Application needs an explicit functional smoke test');
          if (app.smoke?.startsWith('q1-')) await holdoutSmoke(page, app.smoke);
          if (app.smoke === 'jake-tetris') {
            await page.keyboard.press('Space'); await page.waitForFunction(() => window.playing === true);
            await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('#start').isVisible(), false);
          }
          if (app.smoke === 'canvas-tetris') {
            await page.locator('#playbutton').click(); await page.waitForFunction(() => Array.isArray(window.current));
            const before = await page.evaluate(() => window.currentX); await page.keyboard.press('ArrowLeft');
            assert.equal(await page.evaluate(() => window.currentX), before - 1);
          }
          if (app.smoke === 'impress') {
            await page.locator('.impress-enabled').waitFor(); const first = await page.locator('.step.active').getAttribute('id');
            await page.keyboard.press('ArrowRight'); await page.waitForFunction(id => document.querySelector('.step.active')?.id !== id, first);
          }
          if (app.smoke === 'chess') {
            await page.locator('#local-mode').click();
            await page.locator('.square[data-row="6"][data-col="4"]').click(); await page.locator('.square[data-row="4"][data-col="4"]').click();
            assert.equal(await page.locator('.square[data-row="6"][data-col="4"] .piece').count(), 0);
            assert.equal(await page.locator('.square[data-row="4"][data-col="4"] .piece').count(), 1);
          }
          if (app.smoke === 'dropzone') {
            await page.locator('#btnPlay').click(); await page.locator('#menu.hidden').waitFor({ state: 'attached' });
            assert.ok(await page.locator('#c').evaluate(canvas => canvas.width > 0 && canvas.height > 0)); await page.keyboard.press('w');
          }
          if (app.smoke === 'fluid') {
            await page.locator('canvas').waitFor(); const before = await page.evaluate(() => config.PAUSED);
            await page.keyboard.press('p'); assert.equal(await page.evaluate(() => config.PAUSED), !before);
            await page.keyboard.press('p'); assert.equal(await page.evaluate(() => config.PAUSED), before);
          }
          if (app.smoke === 'froggy') {
            await page.locator('#code').fill('justify-content: flex-end;');
            await page.waitForFunction(() => !document.getElementById('next').classList.contains('disabled'));
            await page.locator('#next').click(); await page.waitForFunction(() => game.level === 1);
          }
          if (readablePreference(profile) || ['persistent-server-cookie', 'cookie-no-httponly'].includes(profile.id)) {
            assert.equal(await page.evaluate(() => document.documentElement.dataset.vylntPreferenceReadable), 'true');
            const cookie = (await context.cookies()).find(c => c.name === 'session_fixture');
            assert.ok(cookie);
            assert.equal(cookie.expires > Date.now() / 1000, persistentCookie(profile));
            assert.equal((await request(`${origin}/vylnt-fixture-authorized`)).status, 401, 'Unauthenticated oracle must be rejected');
            const authorized = await context.request.get(`${origin}/vylnt-fixture-authorized`);
            assert.equal(authorized.status(), readablePreference(profile) ? 401 : 204, 'Cookie purpose comes from controlled server behavior, never lifetime/name');
          }
          if (profile.id === 'cookie-no-httponly' || profile.id === 'unspecified-cookie-purpose') assert.equal(await page.evaluate(() => document.cookie.split(';').some(c => c.trim().startsWith('session_fixture='))), true);
          if (profile.id === 'cookie-cross-site') assert.equal((await context.cookies()).find(c => c.name === 'session_fixture')?.sameSite, 'None');
          if (profile.id.startsWith('script-permitted-') || profile.id === 'unpinned-script') await page.waitForFunction(() => document.documentElement.dataset.vylntFixtureExecuted === 'true');
          if (profile.id.startsWith('script-excluded-')) {
            await page.waitForFunction(() => globalThis.vylntFixturePolicyViolations > 0);
            assert.equal(await page.evaluate(() => document.documentElement.dataset.vylntFixtureExecuted === 'true'), false);
          }
          if (profile.id.startsWith('script-') || profile.id === 'unpinned-script') {
            const attributes = await page.locator('script[src$="/vylnt-fixture.js"]').evaluate(node => ({ module: node.getAttribute('type') === 'module', async: node.hasAttribute('async'), defer: node.hasAttribute('defer') }));
            assert.deepEqual(attributes, scriptAttributes(profile));
          }
          assert.equal(scriptErrors, 0, `Application script error: ${app.id}/${profile.id}`);
        } finally { await context.close(); }
        const report = await scanPage(target, { ignoreHTTPSErrors: true, waitMs: 100, allowedLocalOrigins: [...allowed] });
        assert.ok(!JSON.stringify(report).includes('controlled-placeholder') && !JSON.stringify(report).includes('VYLNT controlled task'), 'Collection must omit fixture cookie values and page interaction text');
        const name = `${app.id}-${profile.id}`;
        const targetIndexes = controlledTargetIndexes(report, profile);
        if (profile.rule) assert.ok(targetIndexes.length > 0, `Controlled target absent: ${name}`);
        else if (!values.holdout) assert.ok(report.findings.every(f => f.ruleId === 'JS-002' && f.severity === 'info'), `Unexpected non-inventory baseline findings: ${name}`);
        if (profile.id.startsWith('script-')) {
          const finding = report.findings[targetIndexes[0]];
          assert.ok(finding, 'Target fixture finding missing');
          assert.equal(scriptSourceConstraint(report, finding), profile.id.startsWith('script-excluded-') ? 'excluded' : 'permitted', 'Captured metadata must agree with independent browser/configuration oracle');
        }
        await save(`${name}.scan.json`, report);
        const packet = createReviewPacket(report, app.familyId, 'controlled');
        await save(`${name}.packet.json`, packet); packetPaths.push(`${name}.packet.json`);
        const record = { version: 1, application: app.id, repository: app.repository, revision: app.revision, familyId: app.familyId, sourceLockHash: lockHash, harnessHash,
          profile: profile.id, requirement: values.holdout && profile.id === 'baseline' ? 'Original application interaction passes; unrelated upstream observations remain unlabelled.' : applicationRequirement(profile), label: profile.label, targetCategory: profile.rule, reportHash: sourceDigest(JSON.stringify(report)),
          oracle, unlabelledFindingCount: report.findings.length - targetIndexes.length, behavior: { passed: true, scriptErrors, blockedExternalRequests: blockedExternal, readablePreferenceVerified: readablePreference(profile), cookiePurposeVerified: readablePreference(profile) || ['persistent-server-cookie', 'cookie-no-httponly'].includes(profile.id), serverCookieAuthorizationExpected: ['persistent-server-cookie', 'cookie-no-httponly'].includes(profile.id), scriptExecutionVerified: profile.id.startsWith('script-') || profile.id === 'unpinned-script', scriptExecutionExpected: profile.id.startsWith('script-permitted-') || profile.id === 'unpinned-script' },
          review: reviewReadiness(packet), limitation: 'Locally imposed configuration and optional VYLNT fixture assets. No human review, no upstream deployment assessment, no production safety claim.' };
        const evidenceRecord = `upstream-local-oracle-v1:${sourceDigest(JSON.stringify(record))}`;
        await save(`${name}.oracle.json`, record); records.push({ ...record, evidenceRecord });
        targetIndexes.forEach(findingIndex => { manifest.examples.push({ reportFile: `${name}.scan.json`, findingIndex, familyId: app.familyId, label: profile.label,
          provenance: 'controlled', evidenceRecord, oracleVersion: oracle.version, oraclePassed: true }); });
        console.log(`PASS ${name}: configuration, application interaction, scanner, private packet`);
      } finally { await Promise.all([close(server), close(resources)]); }
    }
  }
  await save('manifest.json', manifest); await save('oracle-records.json', records); await save('packet-paths.json', packetPaths);
  await save('summary.json', { version: 1, passed: records.length, sourceFamilies: apps.length, annotations: manifest.examples.length, independentHumanReviews: 0, sourceLockHash: lockHash, harnessHash, provenance: 'controlled', limitations: ['Counts are before input grouping and frozen splits.', 'Upstream browser source with VYLNT-controlled local deployment configurations, not reviewed real-application labels.', 'Only locked browser assets are served; omitted optional fonts/images can return 404.'] });
  console.log(`Saved private corpus to ${output}. Controlled provenance only; no model release or dataset preparation by users.`);
} catch (error) { await save('failure.json', { status: 'failed', reason: 'Controlled corpus run failed; inspect the developer console. No exception/page content is persisted.', completedScenarios: records.length, sourceLockHash: lockHash }); throw error; }
finally { await browser.close(); }

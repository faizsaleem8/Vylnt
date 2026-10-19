import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { startLabs } from '../labs/server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
const { chromium } = await import('playwright');
await mkdir('test-results', { recursive: true });
const token = randomBytes(32).toString('hex');
const dataFile = resolve(`.local/browser-tests-${randomUUID()}.json`);
const apiOrigin = 'http://127.0.0.1:4319';
let apiProcess, context, dashboardBrowser, reportPage, servers = [];
const logs = [];
const run = (args) => new Promise((resolveRun, reject) => {
  const child = spawn(process.execPath, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; });
  child.once('error', reject); child.once('exit', code => resolveRun({ code, output }));
});
async function until(work, label, timeout = 15000) {
  const start = Date.now(); let last;
  while (Date.now() - start < timeout) { try { const value = await work(); if (value) return value; } catch (error) { last = error; } await new Promise(r => setTimeout(r, 150)); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
}
const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
try {
  servers = await startLabs(); assert.equal(servers.length, 2, 'Run npm run lab:tls first');
  apiProcess = spawn(process.execPath, ['dist/server/index.js'], { env: { ...process.env, PORT: '4319', HOST: '127.0.0.1', VYNLT_STORAGE: 'local', VYNLT_API_TOKEN: token, VYNLT_DATA_FILE: dataFile, VYNLT_ALLOWED_ORIGINS: apiOrigin, VYNLT_RATE_WRITE_MAX: '200' }, stdio: ['ignore', 'pipe', 'pipe'] });
  apiProcess.stderr.on('data', d => logs.push(d.toString()));
  await until(async () => (await fetch(`${apiOrigin}/api/health`)).ok, 'API readiness');
  const extension = resolve('dist/extension');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, ignoreHTTPSErrors: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  let worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  await until(async () => (await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts())).length, 'content script registration');
  const history = () => worker.evaluate(async () => (await chrome.storage.session.get('history')).history ?? []);
  // An ungranted site must still be identifiable after switching tabs with the panel open.
  // Route controlled fixtures locally; no request goes to these test domains.
  const permissionPanel = await context.newPage();
  await permissionPanel.goto(`chrome-extension://${extensionId}/report.html`);
  const ungrantedPage = await context.newPage();
  await ungrantedPage.route('https://*.vynlt-permission.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Permission fixture</title><p>Controlled fixture</p>' }));
  await ungrantedPage.goto('https://first.vynlt-permission.test/'); await ungrantedPage.bringToFront();
  await until(async () => await permissionPanel.locator('#site').textContent() === 'first.vynlt-permission.test', 'ungranted tab address visible');
  assert.equal(await permissionPanel.locator('#enable').isEnabled(), true, 'A new site must offer Enable this site');
  assert.equal(await permissionPanel.locator('#rescan').isDisabled(), true, 'Scanning still requires explicit host permission');
  assert.equal(await worker.evaluate(() => chrome.permissions.contains({ origins: ['https://first.vynlt-permission.test/*'] })), false);
  await ungrantedPage.goto('https://second.vynlt-permission.test/');
  await until(async () => await permissionPanel.locator('#site').textContent() === 'second.vynlt-permission.test', 'cross-origin navigation updates panel');
  assert.equal(await permissionPanel.locator('#enable').isEnabled(), true);
  assert.ok(!(await history()).some(r => r.observation.url.includes('vynlt-permission.test')), 'Reading the active URL must not authorize collection');
  await ungrantedPage.goto('chrome://settings/');
  await until(async () => (await permissionPanel.locator('#monitor-status').textContent()).includes('cannot be scanned'), 'restricted-page explanation');
  assert.equal(await permissionPanel.locator('#enable').isDisabled(), true);
  assert.equal(await permissionPanel.locator('#rescan').isDisabled(), true);
  await ungrantedPage.close(); await permissionPanel.close();
  console.log('PASS permissions: ungranted tabs remain identifiable, site access stays opt-in, cross-origin navigation updates controls, restricted pages explain disabled controls');
  const page = await context.newPage();
  await page.goto('https://127.0.0.1:5443/insecure?token=private');
  let insecure = await until(async () => (await history()).find(r => r.observation.url === 'https://127.0.0.1:5443/insecure' && r.observation.domCollected && r.observation.cookies && r.observation.headers), 'insecure scan');
  for (const rule of ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'NET-001']) assert.ok(insecure.findings.some(f => f.ruleId === rule), `Missing ${rule}`);
  assert.ok(!JSON.stringify(insecure).includes('private')); assert.ok(!JSON.stringify(insecure).includes('lab-only'));
  await page.reload();
  await until(async () => (await history()).find(r => r.observation.url.endsWith('/insecure') && r.scanId !== insecure.scanId && r.observation.domCollected), 'refresh gets new scan ID');
  const securePage = await context.newPage(); await securePage.goto('https://127.0.0.1:5443/secure');
  const secure = await until(async () => (await history()).find(r => r.observation.url.endsWith('/secure') && r.observation.domCollected && r.observation.headers), 'secure scan');
  assert.equal(secure.findings.length, 0, `Secure fixture findings: ${JSON.stringify(secure.findings)}`);
  reportPage = await context.newPage(); await reportPage.setViewportSize({ width: 380, height: 900 });
  await reportPage.goto('chrome-extension://' + extensionId + '/report.html');
  assert.equal(await worker.evaluate(async () => (await chrome.sidePanel.getPanelBehavior()).openPanelOnActionClick), true);
  assert.equal(await worker.evaluate(() => chrome.runtime.getManifest().action.default_popup), undefined);
  await reportPage.locator('#connection').evaluate(d => { d.open = true; });
  await reportPage.locator('#api-settings').evaluate(d => { d.open = true; });
  await reportPage.locator('#api-url').fill(apiOrigin);
  await reportPage.getByRole('button', { name: 'Load workspace connection', exact: true }).click();
  await reportPage.locator('#api-token').fill(token); await reportPage.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await reportPage.getByText('Signed in. New scans sync automatically.', { exact: false }).waitFor();
  await page.bringToFront(); await page.reload();
  insecure = await until(async () => {
    const rows = (await (await fetch(apiOrigin + '/api/scans', { headers: authHeaders })).json()).scans;
    if (!rows.length) return;
    return (await history()).find(r => r.scanId === rows[0].scanId);
  }, 'automatic scan upload');
  await reportPage.getByRole('button', { name: 'Saved scans', exact: true }).click();
  await reportPage.getByRole('button').filter({ hasText: 'https://127.0.0.1:5443/insecure' }).click();
  await reportPage.getByText(insecure.findings.length + ' findings', { exact: true }).waitFor();
  await reportPage.locator('.finding-card summary').first().click();
  const review = reportPage.locator('.finding-review').first();
  await review.getByLabel('Review decision', { exact: true }).selectOption('false_positive');
  await review.getByLabel('Review notes', { exact: true }).fill('Controlled fixture review, no secrets.');
  const reviewRoute = apiOrigin + '/api/scans/*/findings/**/feedback';
  let reviewFailures = 1;
  await reportPage.route(reviewRoute, async route => {
    if (reviewFailures-- > 0) await route.fulfill({ status: 503, json: { error: 'Temporary review fixture failure' } });
    else await route.continue();
  });
  await review.getByRole('button', { name: 'Save decision', exact: true }).click();
  await review.getByText('Temporary review fixture failure', { exact: true }).waitFor();
  assert.equal(await review.getByLabel('Review notes', { exact: true }).inputValue(), 'Controlled fixture review, no secrets.');
  await review.getByRole('button', { name: 'Save decision', exact: true }).click();
  await review.getByText('Review decision saved.', { exact: false }).waitFor();
  await reportPage.unroute(reviewRoute);
  const reviewed = await (await fetch(`${apiOrigin}/api/scans/${insecure.scanId}`, { headers: authHeaders })).json();
  assert.equal(reviewed.feedback[0].verdict, 'false_positive');
  await reportPage.locator('#history .history-item').first().click();
  await reportPage.locator('.finding-card summary').first().click();
  assert.equal(await reportPage.locator('.finding-review').first().getByLabel('Review notes', { exact: true }).inputValue(), 'Controlled fixture review, no secrets.');
  await reportPage.getByText('Saved decision: False positive', { exact: false }).waitFor();
  // Create older snapshots beyond one comparison page, then clean only these fixtures.
  const baselineIds = [];
  for (let n = 0; n < 13; n++) {
    const scanId = randomUUID(); baselineIds.push(scanId);
    const response = await fetch(`${apiOrigin}/api/scans`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ scanId,
      observation: { ...insecure.observation, scannedAt: new Date(Date.parse(insecure.observation.scannedAt) - (n + 1) * 60000).toISOString(), cookies: [], resources: [], domCollected: false } }) });
    assert.equal(response.status, 201);
  }
  await reportPage.locator('.comparison-panel > summary').click();
  await reportPage.getByText('Page 1 / 13 other scans', { exact: true }).waitFor();
  await reportPage.getByRole('button', { name: 'Next comparisons', exact: true }).click();
  await reportPage.getByText('Page 2 / 13 other scans', { exact: true }).waitFor();
  await reportPage.getByLabel('Compare with', { exact: true }).selectOption(baselineIds[12]);
  await reportPage.locator('.comparison-result').getByText('Collection coverage differs.', { exact: false }).waitFor();
  assert.match(await reportPage.locator('.comparison-result').textContent(), /newly observed.*no longer observed.*changed/);
  assert.ok(await reportPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await reportPage.screenshot({ path: 'test-results/extension-review-comparison.png', fullPage: true });
  await reportPage.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.ok(await reportPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Review and comparison fit enlarged text');
  await reportPage.screenshot({ path: 'test-results/extension-review-large-text.png', fullPage: true });
  await reportPage.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await reportPage.getByRole('button', { name: 'Clear comparison', exact: true }).click();
  assert.equal(await reportPage.locator('.comparison-result').textContent(), '');
  // A delayed comparison response must not replace the current-page view.
  let releaseBaseline;
  const delayedBaseline = new Promise(resolveReply => { releaseBaseline = resolveReply; });
  let baselineRequested = false;
  await reportPage.route(`${apiOrigin}/api/scans/${baselineIds[12]}`, async route => { baselineRequested = true; await delayedBaseline; await route.continue(); });
  await reportPage.getByLabel('Compare with', { exact: true }).selectOption(baselineIds[12]);
  await until(() => baselineRequested, 'delayed baseline request');
  await reportPage.getByRole('button', { name: 'Current scan', exact: true }).click();
  releaseBaseline(); await reportPage.waitForTimeout(300);
  assert.equal(await reportPage.locator('.comparison-panel').count(), 0);
  assert.equal(await reportPage.locator('.finding-review').count(), 0);
  await reportPage.unroute(`${apiOrigin}/api/scans/${baselineIds[12]}`);
  for (const scanId of baselineIds) assert.equal((await fetch(`${apiOrigin}/api/scans/${scanId}`, { method: 'DELETE', headers: authHeaders })).status, 204);
  await reportPage.getByRole('button', { name: 'Saved scans', exact: true }).click();
  await reportPage.locator('#history .history-item').first().click();
  await reportPage.getByRole('button', { name: 'Verify hash', exact: true }).click();
  await reportPage.getByText('Stored report matches its SHA-256 hash.', { exact: false }).waitFor();
  const panelDownload = reportPage.waitForEvent('download');
  await reportPage.getByRole('button', { name: 'Export JSON', exact: false }).click();
  assert.match((await panelDownload).suggestedFilename(), /^vynlt-.*\.json$/);
  assert.ok(await reportPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Panel must fit narrow viewport');
  await reportPage.evaluate(() => window.scrollTo(0, 0)); await reportPage.screenshot({ path: 'test-results/extension-side-panel.png', fullPage: true });
  assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get('history')).history), undefined);
  await reportPage.getByRole('button', { name: 'Sign out', exact: true }).click();
  const otherPanel = await context.newPage();
  await otherPanel.goto('chrome-extension://' + extensionId + '/report.html');
  await otherPanel.locator('#connection').evaluate(d => { d.open = true; });
  await otherPanel.locator('#api-settings').evaluate(d => { d.open = true; });
  await otherPanel.locator('#api-url').fill(apiOrigin);
  await otherPanel.getByRole('button', { name: 'Load workspace connection', exact: true }).click();
  await otherPanel.locator('#api-token').fill(token);
  await otherPanel.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await otherPanel.getByText('Signed in. New scans sync automatically.', { exact: false }).waitFor();
  // The original panel must not establish a second account/sync session.
  await reportPage.locator('#api-token').fill(token);
  await reportPage.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await reportPage.getByText('Another VYNLT panel is connected.', { exact: false }).waitFor();
  await otherPanel.close();
  const count = (await history()).length;
  await reportPage.evaluate(() => chrome.runtime.sendMessage({ type: 'PAUSE', paused: true })); await page.reload();
  await page.waitForTimeout(700); assert.equal((await history()).length, count, 'Paused navigation must not be stored');
  await reportPage.evaluate(() => chrome.runtime.sendMessage({ type: 'PAUSE', paused: false }));
  await page.goto('https://127.0.0.1:5443/dynamic');
  await until(async () => (await history()).some(r => r.observation.url.endsWith('/dynamic') && r.observation.domCollected), 'dynamic scan');
  await page.getByRole('button', { name: 'Change SPA route' }).click();
  await until(async () => (await history()).some(r => r.observation.url.endsWith('/dynamic/next')), 'SPA path scan');
  // Recreate service worker via CDP; history must remain available after a wake-up.
  const session = await context.newCDPSession(page); await session.send('ServiceWorker.enable'); await session.send('ServiceWorker.stopAllWorkers');
  await reportPage.reload(); assert.ok((await reportPage.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'STATE', tabId: -1 })).history)).length > 0);
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  console.log('PASS extension: TLS rules, navigation, two tabs, privacy, automatic API sync, side-panel history/detail/export/hash, no disk history, pause/resume, SPA, worker restart');
  const secureUpload = await fetch(`${apiOrigin}/api/scans`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ scanId: secure.scanId, observation: secure.observation }) }); assert.equal(secureUpload.status, 201);
  const secureCLI = await run(['dist/cli/index.js', '--url', 'https://127.0.0.1:5443/secure', '--ignore-https-errors', '--fail-on', 'medium', '--output', 'test-results/secure.json']);
  const insecureCLI = await run(['dist/cli/index.js', '--url', 'https://127.0.0.1:5443/insecure', '--ignore-https-errors', '--fail-on', 'medium', '--output', 'test-results/insecure.json']);
  assert.equal(secureCLI.code, 0, secureCLI.output); assert.equal(insecureCLI.code, 1, insecureCLI.output);
  const cliReport = JSON.parse(await readFile('test-results/insecure.json', 'utf8'));
  assert.deepEqual([...new Set(cliReport.findings.map(f => f.ruleId))].sort(), [...new Set(insecure.findings.map(f => f.ruleId))].sort());
  console.log('PASS CLI: secure passes, insecure fails confidence/severity gate, rule IDs agree with extension');
  dashboardBrowser = await chromium.launch({ channel: 'chromium', headless: true });
  const dashboard = await dashboardBrowser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; dashboard.on('pageerror', error => errors.push(error.message));
  await dashboard.goto(apiOrigin); await dashboard.getByLabel('Local API token from your .env file').fill(token); await dashboard.getByRole('button', { name: 'Connect workspace' }).click();
  await dashboard.getByText('Workspace connected', { exact: false }).waitFor();
  await dashboard.screenshot({ path: 'test-results/dashboard-overview.png', fullPage: true });
  await dashboard.getByRole('button', { name: 'History', exact: false }).first().click();
  await dashboard.getByRole('button', { name: 'https://127.0.0.1:5443/insecure', exact: true }).click();
  await dashboard.locator('.finding').first().locator('summary').click();
  await dashboard.locator('.finding').first().getByLabel('Review decision').selectOption('accepted_risk');
  await dashboard.locator('.finding').first().getByLabel('Review notes').fill('Controlled local lab; reviewed during automated test.');
  await dashboard.getByRole('button', { name: 'Save decision' }).first().click();
  await dashboard.getByText('Review decision saved.', { exact: false }).waitFor();
  await dashboard.getByRole('button', { name: 'Verify hash', exact: true }).click(); await dashboard.getByText('Stored report matches', { exact: false }).waitFor();
  const downloadPromise = dashboard.waitForEvent('download'); await dashboard.getByRole('button', { name: 'Export JSON', exact: false }).click(); assert.match((await downloadPromise).suggestedFilename(), /^vynlt-.*\.json$/);
  await dashboard.screenshot({ path: 'test-results/dashboard-report.png', fullPage: true });
  await dashboard.setViewportSize({ width: 390, height: 844 });
  assert.ok(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile page must not overflow horizontally');
  await dashboard.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await dashboard.setViewportSize({ width: 1440, height: 1000 });
  await dashboard.locator('input[type=file]').setInputFiles('test-results/insecure.json');
  await dashboard.getByText('Report imported.', { exact: false }).waitFor();
  const dashboardBaselines = [];
  for (let n = 0; n < 12; n++) {
    const scanId = randomUUID(); dashboardBaselines.push(scanId);
    const response = await fetch(apiOrigin + '/api/scans', { method: 'POST', headers: authHeaders, body: JSON.stringify({ scanId,
      observation: { ...cliReport.observation, scannedAt: new Date(Date.parse(cliReport.observation.scannedAt) - (n + 1) * 60000).toISOString(), domCollected: false } }) });
    assert.equal(response.status, 201);
  }
  await dashboard.locator('.comparison-picker > summary').click();
  await until(() => dashboard.getByLabel('Compare with', { exact: true }).locator(`option[value="${insecure.scanId}"]`).count(), 'dashboard comparison candidates');
  await dashboard.getByLabel('Compare with').selectOption(insecure.scanId);
  await dashboard.getByText('Compared with', { exact: false }).waitFor();
  await dashboard.getByRole('button', { name: 'Next comparisons', exact: true }).click();
  await dashboard.getByText('Page 2 / 13 other scans', { exact: true }).waitFor();
  await dashboard.getByLabel('Compare with', { exact: true }).selectOption(dashboardBaselines[11]);
  await dashboard.locator('.comparison-result').getByText('Collection coverage differs.', { exact: false }).waitFor();
  await dashboard.setViewportSize({ width: 390, height: 844 });
  assert.ok(await dashboard.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await dashboard.screenshot({ path: 'test-results/dashboard-comparison-mobile.png', fullPage: true });
  await dashboard.emulateMedia({ media: 'print' });
  assert.equal(await dashboard.locator('.comparison-picker').isVisible(), false);
  assert.equal(await dashboard.locator('.comparison-result').isVisible(), true);
  await dashboard.emulateMedia({ media: 'screen' });
  await dashboard.setViewportSize({ width: 1440, height: 1000 });
  for (const scanId of dashboardBaselines) assert.equal((await fetch(apiOrigin + '/api/scans/' + scanId, { method: 'DELETE', headers: authHeaders })).status, 204);
  await dashboard.getByRole('button', { name: 'Clear comparison', exact: true }).click();
  assert.equal(await dashboard.locator('.comparison-result').count(), 0);
  await dashboard.getByLabel('Filter findings').selectOption('high'); assert.equal(await dashboard.locator('.finding').count(), 1);
  await dashboard.getByRole('button', { name: 'Settings', exact: false }).click();
  dashboard.once('dialog', dialog => dialog.accept()); await dashboard.getByRole('button', { name: 'Delete', exact: true }).first().click();
  await until(async () => (await (await fetch(`${apiOrigin}/api/scans`, { headers: authHeaders })).json()).total === 2, 'dashboard deletion');
  assert.deepEqual(errors, []); console.log('PASS dashboard: auth, history/detail, feedback, integrity, JSON download/import, comparison, severity filter, deletion, mobile layout, no JS errors');
  console.log('Browser acceptance passed. Screenshots and CLI reports: test-results/');
} catch (error) { console.error(error); if (reportPage && !reportPage.isClosed()) { console.error('Extension status:', await reportPage.locator('#message').textContent().catch(() => 'unavailable')); console.error('Review controls:', await reportPage.locator('.finding-review').first().evaluate(node => node.outerHTML).catch(() => 'unavailable')); await reportPage.screenshot({ path: 'test-results/browser-failure.png', fullPage: true }).catch(() => {}); } if (logs.length) console.error(logs.join('')); process.exitCode = 1; }
finally {
  await dashboardBrowser?.close(); await context?.close();
  if (apiProcess) { const stopped = new Promise(resolveStop => { if (apiProcess.exitCode !== null) resolveStop(); else apiProcess.once('exit', resolveStop); }); apiProcess.kill(); await stopped; }
  for (const server of servers) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
  await unlink(dataFile).catch(() => {});
}




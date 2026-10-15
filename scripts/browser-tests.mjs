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
  apiProcess = spawn(process.execPath, ['dist/server/index.js'], { env: { ...process.env, PORT: '4319', HOST: '127.0.0.1', VYNLT_STORAGE: 'local', VYNLT_API_TOKEN: token, VYNLT_DATA_FILE: dataFile, VYNLT_ALLOWED_ORIGINS: apiOrigin }, stdio: ['ignore', 'pipe', 'pipe'] });
  apiProcess.stderr.on('data', d => logs.push(d.toString()));
  await until(async () => (await fetch(`${apiOrigin}/api/health`)).ok, 'API readiness');
  const extension = resolve('dist/extension');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, ignoreHTTPSErrors: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  let worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  await until(async () => (await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts())).length, 'content script registration');
  const history = () => worker.evaluate(async () => (await chrome.storage.local.get('history')).history ?? []);
  const page = await context.newPage();
  await page.goto('https://127.0.0.1:5443/insecure?token=private');
  const insecure = await until(async () => (await history()).find(r => r.observation.url === 'https://127.0.0.1:5443/insecure' && r.observation.domCollected && r.observation.cookies && r.observation.headers), 'insecure scan');
  for (const rule of ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'NET-001']) assert.ok(insecure.findings.some(f => f.ruleId === rule), `Missing ${rule}`);
  assert.ok(!JSON.stringify(insecure).includes('private')); assert.ok(!JSON.stringify(insecure).includes('lab-only'));
  await page.reload();
  await until(async () => (await history()).find(r => r.observation.url.endsWith('/insecure') && r.scanId !== insecure.scanId && r.observation.domCollected), 'refresh gets new scan ID');
  const securePage = await context.newPage(); await securePage.goto('https://127.0.0.1:5443/secure');
  const secure = await until(async () => (await history()).find(r => r.observation.url.endsWith('/secure') && r.observation.domCollected && r.observation.headers), 'secure scan');
  assert.equal(secure.findings.length, 0, `Secure fixture findings: ${JSON.stringify(secure.findings)}`);
  reportPage = await context.newPage(); await reportPage.goto(`chrome-extension://${extensionId}/report.html#${insecure.scanId}`);
  await reportPage.getByText(`${insecure.findings.length} findings`, { exact: true }).waitFor();
  await reportPage.locator('.sync-panel summary').click(); await reportPage.locator('#api-url').fill(apiOrigin); await reportPage.locator('#api-token').fill(token); await reportPage.getByRole('button', { name: 'Send scan', exact: true }).click();
  await reportPage.getByText('Scan saved to your workspace.', { exact: false }).waitFor();
  const saved = await (await fetch(`${apiOrigin}/api/scans/${insecure.scanId}`, { headers: authHeaders })).json();
  assert.equal(saved.report.scanId, insecure.scanId);
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
  await reportPage.reload(); await reportPage.locator('.history-item').first().waitFor();
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  console.log('PASS extension: TLS rules, navigation, two tabs, privacy, explicit API upload, pause/resume, SPA, worker restart');
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
  await dashboard.getByLabel('Compare with').selectOption(insecure.scanId);
  await dashboard.getByText('Compared with', { exact: false }).waitFor();
  await dashboard.getByLabel('Filter findings').selectOption('high'); assert.equal(await dashboard.locator('.finding').count(), 1);
  await dashboard.getByRole('button', { name: 'Settings', exact: false }).click();
  dashboard.once('dialog', dialog => dialog.accept()); await dashboard.getByRole('button', { name: 'Delete', exact: true }).first().click();
  await until(async () => (await (await fetch(`${apiOrigin}/api/scans`, { headers: authHeaders })).json()).total === 2, 'dashboard deletion');
  assert.deepEqual(errors, []); console.log('PASS dashboard: auth, history/detail, feedback, integrity, JSON download/import, comparison, severity filter, deletion, mobile layout, no JS errors');
  console.log('Browser acceptance passed. Screenshots and CLI reports: test-results/');
} catch (error) { console.error(error); if (reportPage && !reportPage.isClosed()) console.error('Extension status:', await reportPage.locator('#message').textContent().catch(() => 'unavailable')); if (logs.length) console.error(logs.join('')); process.exitCode = 1; }
finally {
  await dashboardBrowser?.close(); await context?.close();
  if (apiProcess) { const stopped = new Promise(resolveStop => { if (apiProcess.exitCode !== null) resolveStop(); else apiProcess.once('exit', resolveStop); }); apiProcess.kill(); await stopped; }
  for (const server of servers) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
  await unlink(dataFile).catch(() => {});
}

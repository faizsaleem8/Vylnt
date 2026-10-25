import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
const { chromium } = await import('playwright');
const out = resolve('test-results/scanner-acceptance');
await mkdir(out, { recursive: true }); await mkdir('.local', { recursive: true });
const profile = await mkdtemp(resolve('.local/scanner-acceptance-'));
const requests = []; let version = 1;
const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const cacheable = path === '/cache';
  const etag = `"vylnt-${version}"`;
  const revalidated = cacheable && req.headers['if-none-match'] === etag;
  requests.push({ path, version, revalidated });
  const headers = { 'Content-Type': 'text/html', 'Cache-Control': cacheable ? 'public, max-age=600' : 'no-store', ETag: etag };
  if (!revalidated) { headers['X-Frame-Options'] = version === 1 ? 'DENY' : 'SAMEORIGIN'; headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"; }
  res.writeHead(revalidated ? 304 : 200, headers);
  res.end(revalidated ? undefined : `<!doctype html><title>VYLNT scanner acceptance</title><h1>Controlled fixture ${version}</h1>${path === '/stress' ? Array.from({ length: 2000 }, (_, i) => `<script type="application/json" src="/inert-${i}.json?secret=redacted#private"></script>`).join('') : ''}`);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const launch = (directory, enabled = true) => chromium.launchPersistentContext(directory, { channel: 'chromium', headless: true, args: enabled ? [`--disable-extensions-except=${resolve('dist/extension')}`, `--load-extension=${resolve('dist/extension')}`] : ['--disable-extensions'] });
async function until(work, label) {
  const start = performance.now();
  while (performance.now() - start < 15000) { const value = await work(); if (value) return value; await new Promise(r => setTimeout(r, 75)); }
  throw new Error(`Timed out: ${label}`);
}
let context;
const results = { fixture: 'localhost only; disposable Chromium profile; no user account or cloud', checks: [], performance: [], limitations: ['Headless Chromium is not native installed-Edge/Chrome acceptance.', '6x CDP CPU slowdown is simulated, not a physical low-end device.', 'Page CDP metrics exclude background-process CPU and do not establish peak memory.', 'Temporary profiles are retained under ignored .local/ for inspection.'] };
try {
  context = await launch(profile);
  let worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  let extensionId = new URL(worker.url()).host;
  await until(() => worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length), 'registration');
  let panel = await context.newPage(); await panel.goto(`chrome-extension://${extensionId}/report.html`);
  let page = await context.newPage(); const client = await context.newCDPSession(page);
  const history = () => worker.evaluate(async () => (await chrome.storage.session.get('history')).history ?? []);
  const scan = async (suffix, previousId) => until(async () => {
    const report = await worker.evaluate(async target => { const tabs = await chrome.tabs.query({}); const tab = tabs.find(t => t.url?.split(/[?#]/)[0] === target); return tab ? (await chrome.storage.session.get(`tab:${tab.id}`))[`tab:${tab.id}`]?.report : undefined; }, origin + suffix);
    return report?.observation.domCollected && report.scanId !== previousId ? report : undefined;
  }, `collected ${suffix}`);
  await page.goto(origin + '/cache?secret=redacted#private');
  const initial = await scan('/cache'); assert.equal(initial.observation.headers?.['x-frame-options'], 'DENY');
  await page.reload(); const refreshed = await scan('/cache', initial.scanId);
  assert.equal(refreshed.observation.headers?.['x-frame-options'], 'DENY', 'revalidation must retain effective security headers');
  assert.ok(requests.some(r => r.path === '/cache' && r.revalidated), 'must actually exercise HTTP 304');
  results.checks.push('normal reload / HTTP 304 preserves effective headers and creates a new scan');
  version = 2; await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.reload(); const hard = await scan('/cache', refreshed.scanId);
  assert.equal(hard.observation.headers?.['x-frame-options'], 'SAMEORIGIN');
  await client.send('Network.setCacheDisabled', { cacheDisabled: false });
  results.checks.push('cache-bypassed reload captures changed headers without retaining the previous value');
  await page.goto(origin + '/other'); await scan('/other'); await page.goBack();
  await until(async () => {
    const state = await panel.evaluate(async target => { const tabs = await chrome.tabs.query({}); const tab = tabs.find(t => t.url?.startsWith(target)); return tab ? chrome.runtime.sendMessage({ type: 'STATE', tabId: tab.id }) : {}; }, origin + '/cache');
    return state.scan?.observation.url === origin + '/cache' && state.scan.observation.domCollected;
  }, 'back navigation restores current-page observation');
  results.checks.push('back navigation has a collected observation for the current page');
  assert.ok(!JSON.stringify(await history()).match(/secret=|#private/));
  await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'PAUSE', paused: true }));
  await context.close(); context = undefined;
  context = await launch(profile); worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
  panel = await context.newPage(); await panel.goto(`chrome-extension://${extensionId}/report.html`);
  assert.equal((await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'STATE', tabId: -1 }))).paused, true);
  assert.equal((await history()).length, 0, 'browser restart clears session-only observations');
  assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get('history')).history), undefined);
  page = await context.newPage(); await page.goto(origin + '/paused');
  await page.waitForTimeout(400); assert.equal((await history()).length, 0);
  await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'PAUSE', paused: false }));
  await page.reload(); await scan('/paused');
  results.checks.push('full browser restart retains pause preference, clears scan session, and resumes collection after explicit unpause');
  await context.close(); context = undefined;
  console.log('PASS cache and browser restart acceptance');
  // Alternate paired baseline/full-extension order; no mocked Chrome transport.
  for (const rate of [1, 6]) for (const enabled of rate === 1 ? [false, true] : [true, false]) {
    const benchProfile = await mkdtemp(resolve('.local/scanner-performance-'));
    context = await launch(benchProfile, enabled);
    let benchWorker, control;
    if (enabled) {
      benchWorker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      await until(() => benchWorker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length), 'benchmark registration');
      control = await context.newPage(); await control.goto(`chrome-extension://${new URL(benchWorker.url()).host}/report.html`);
    }
    const benchPage = await context.newPage(), cdp = await context.newCDPSession(benchPage);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate }); await cdp.send('Performance.enable');
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const before = await metrics(), start = performance.now();
    await benchPage.goto(origin + '/stress');
    await benchPage.evaluate(async () => {
      for (let n = 1; n <= 120; n++) { document.querySelector('script').src = `/changed-${n}.json?secret=redacted#private`; const node = document.createElement('span'); document.body.append(node); await new Promise(r => setTimeout(r, 20)); }
      await new Promise(r => setTimeout(r, 1100));
    });
    let ipcRoundTripMs = null, capturedScripts = 0, lastAutomaticMutation = null, explicitCollectionMs = null;
    if (enabled) {
      const report = await until(async () => (await benchWorker.evaluate(async () => (await chrome.storage.session.get('history')).history ?? [])).find(r => /\/changed-\d+\.json$/.test(r.observation.scripts[0]?.url ?? '')), 'real IPC and background budget snapshot');
      capturedScripts = report.observation.scripts.length;
      lastAutomaticMutation = Number(report.observation.scripts[0].url.match(/changed-(\d+)/)[1]);
      assert.ok(lastAutomaticMutation >= 100 && lastAutomaticMutation <= 120, 'budget snapshot captures the observed burst; later mutations can require an explicit rescan');
      assert.equal(capturedScripts, 150); assert.ok(report.observation.resources.length <= 600);
      assert.ok(!JSON.stringify(report).match(/secret=|#private/));
      ipcRoundTripMs = await control.evaluate(async () => { const start = performance.now(); await chrome.runtime.sendMessage({ type: 'STATE', tabId: -1 }); return performance.now() - start; });
      const collectStart = performance.now();
      await control.evaluate(async target => { const tabs = await chrome.tabs.query({}); const tab = tabs.find(t => t.url === target); await chrome.tabs.sendMessage(tab.id, { type: 'COLLECT' }); }, origin + '/stress');
      await until(async () => (await benchWorker.evaluate(async () => (await chrome.storage.session.get('history')).history ?? [])).some(r => r.observation.scripts[0]?.url === origin + '/changed-120.json'), 'explicit collection persists latest observation after observer budget');
      explicitCollectionMs = performance.now() - collectStart;
    }
    const after = await metrics();
    const row = { cpuSlowdown: rate, extensionEnabled: enabled, elapsedMs: Math.round(performance.now() - start), pageTaskMs: Number(((after.TaskDuration - before.TaskDuration) * 1000).toFixed(2)), pageScriptMs: Number(((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(2)), heapDeltaBytes: after.JSHeapUsedSize - before.JSHeapUsedSize, ipcRoundTripMs, explicitCollectionMs, lastAutomaticMutation, capturedScripts };
    results.performance.push(row); console.log(JSON.stringify(row));
    await context.close(); context = undefined;
  }
  results.checks.push('real content-script IPC/background rule evaluation/session persistence under normal and simulated 6x CPU slowdown; bounded sanitized final snapshots');
} catch (error) { results.failure = error.message; console.error(error); process.exitCode = 1; }
finally {
  await context?.close(); server.closeAllConnections(); await new Promise(r => server.close(r));
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ measuredAt: new Date().toISOString(), node: process.version, ...results }, null, 2));
}

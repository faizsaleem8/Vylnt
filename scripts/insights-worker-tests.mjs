import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
await mkdir('.local', { recursive: true });
const modulePath = resolve('.local/worker-fixture.mjs');
await build({ stdin: { contents: "export { createReport } from './packages/core'; export { assertReportSize, reportStorageBytes } from './packages/core/report-size';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm' });
const { createReport, assertReportSize, reportStorageBytes } = await import(pathToFileURL(modulePath).href);
const report = createReport('00000000-0000-4000-8000-000000000099', { url: 'https://large.test/', scannedAt: '2026-10-21T00:00:00Z', headers: {}, domCollected: true,
  cookies: Array.from({ length: 30 }, (_, i) => ({ name: `session_${i}`, secure: false, httpOnly: false, session: true, sameSite: 'no_restriction' })),
  resources: Array.from({ length: 150 }, (_, i) => ({ url: `http://resource.test/${i}`, type: i % 2 ? 'script' : 'image', outcome: 'failed' })),
  scripts: Array.from({ length: 75 }, (_, i) => ({ url: `https://script.test/${i}.js`, integrity: false, scriptType: i % 2 ? 'module' : 'classic', async: Boolean(i % 3), defer: false })) });
assertReportSize(report);
const workerFile = (await readdir('dist/dashboard/assets')).find(f => /^insight-worker-.*\.js$/.test(f));
assert.ok(workerFile, 'Build the dashboard first');
const source = await readFile(`dist/dashboard/assets/${workerFile}`);
const server = createServer((req, res) => {
  if (req.url === '/worker.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(source); }
  else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><html lang="en"><title>VYNLT worker fixture</title><button id="counter">0</button></html>'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { chromium } = await import('playwright');
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(), page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async report => {
    const worker = new Worker('/worker.js', { type: 'module' });
    const start = performance.now(), button = document.getElementById('counter');
    let ticks = 0, previous = start, maxGap = 0;
    button.onclick = () => { button.textContent = String(++ticks); };
    const interval = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - previous); previous = now; button.click(); }, 10);
    const analysis = await new Promise((accept, reject) => { worker.onmessage = event => accept(event.data); worker.onerror = reject; worker.postMessage(report); });
    clearInterval(interval); worker.terminate();
    return { ticks, maxGap, durationMs: performance.now() - start, analysis };
  }, report);
  assert.ok(!result.analysis.error);
  assert.equal(result.analysis.analysis.scanId, report.scanId);
  assert.equal(result.analysis.analysis.issues.reduce((sum, i) => sum + i.findingIds.length, 0), report.findings.length);
  assert.ok(result.ticks > 0, 'Main-thread controls remain responsive during worker analysis');
  assert.ok(result.maxGap < 1500, 'No long main-thread inference task');
  const lifecycle = await page.evaluate(async report => {
    let obsoleteMessages = 0;
    const oldWorker = new Worker('/worker.js', { type: 'module' });
    oldWorker.onmessage = () => obsoleteMessages++;
    oldWorker.postMessage(report); oldWorker.terminate();
    const replacement = new Worker('/worker.js', { type: 'module' });
    const response = await new Promise(resolveResult => { replacement.onmessage = e => resolveResult(e.data); replacement.postMessage({ invalid: true }); });
    replacement.terminate(); await new Promise(r => setTimeout(r, 100));
    return { obsoleteMessages, response };
  }, report);
  assert.equal(lifecycle.obsoleteMessages, 0); assert.ok(lifecycle.response.error);
  const evidence = { findings: report.findings.length, bytes: reportStorageBytes(report), issues: result.analysis.analysis.issues.length, durationMs: result.durationMs, mainThreadMaxGapMs: result.maxGap, controlTicks: result.ticks, obsoleteMessages: lifecycle.obsoleteMessages, errorsHandled: true, scope: 'Local automated Chromium; not a physical low-end-device certification' };
  await mkdir('test-results', { recursive: true }); await writeFile('test-results/insights-worker.json', JSON.stringify(evidence, null, 2));
  console.log('PASS worker stress, interaction, termination and malformed-input handling:', JSON.stringify(evidence));
} finally { await browser?.close(); await new Promise(r => server.close(r)); }

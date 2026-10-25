import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { values } = parseArgs({ options: { report: { type: 'string' } } });
if (!values.report) throw new Error('Use --report <completed controlled unpinned-script scan.json>; no private data is bundled');
await mkdir('.local', { recursive: true }); await mkdir('test-results/pdf', { recursive: true });
const modulePath = resolve('.local/experimental-report-test.mjs');
await build({ stdin: { contents: "export { createReport } from './packages/core'; export { reportHash, FileStore } from './apps/server/store'; export { createApp } from './apps/server/app'; export { generatePdf } from './apps/server/pdf'; export { freezeInsights, contentHash, verifyFrozenInsights } from './packages/ml/frozen-insights';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { createReport, reportHash, FileStore, createApp, generatePdf, freezeInsights, contentHash, verifyFrozenInsights } = await import(pathToFileURL(modulePath).href);
const source = JSON.parse(await readFile(values.report, 'utf8'));
const original = source.observation;
const external = original.scripts.find(s => new URL(s.url).origin !== new URL(original.url).origin && !s.integrity);
assert.ok(external, 'Use a controlled unpinned-script scan');
// Acceptance-only duplicated metadata; never training data or a second source family.
const report = createReport(randomUUID(), { ...original, scripts: [...original.scripts.filter(s => s !== external), ...Array.from({ length: 71 }, (_, i) => ({ ...external, url: `${new URL(external.url).origin}/repeated-${i}.js` }))] });
const content = await freezeInsights(report), hash = await contentHash(content), frozen = { id: hash, hash, createdAt: '2026-10-22T00:00:00Z', content };
assert.equal(content.analysis.mode, 'qualified-model'); assert.equal(content.analysis.model.status, 'qualified');
assert.deepEqual(content.analysis.model.approvedCategories, ['JS-002']);
const scripts = [...content.analysis.issues, ...content.analysis.contextual].find(i => i.category === 'JS-002');
assert.equal(scripts.findingIds.length, 71); assert.equal(scripts.variants.length, 1);
assert.ok(await verifyFrozenInsights(frozen));
await writeFile('test-results/pdf/experimental-insights.json', JSON.stringify(frozen, null, 2));
const reloaded = JSON.parse(await readFile('test-results/pdf/experimental-insights.json', 'utf8'));
assert.ok(await verifyFrozenInsights(reloaded));
const row = { report, hash: reportHash(report), receivedAt: frozen.createdAt, feedback: [] };
await writeFile('test-results/pdf/experimental-insights.pdf', await generatePdf(row, 'insights', undefined, reloaded));
await writeFile('test-results/pdf/experimental-raw.pdf', await generatePdf(row, 'full'));
// Numeric score serialization must match the built browser Worker and trusted API.
const store = new FileStore(), identity = { ownerId: 'fixture', token: 'fixture' };
await store.put(identity, report);
const origins = [];
const app = createApp({ store, auth: { authenticate: async token => token === 'fixture' ? identity : undefined }, dashboardDir: resolve('dist/dashboard'), origins });
const server = await new Promise(done => { const listener = app.listen(0, '127.0.0.1', () => done(listener)); });
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
const { chromium } = await import('playwright'); const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  const page = await browser.newPage(); const origin = `http://127.0.0.1:${server.address().port}`;
  origins.push(origin);
  await page.goto(origin);
  const workerFile = (await readdir('dist/dashboard/assets')).find(name => /^insight-worker-.*\.js$/.test(name)); assert.ok(workerFile);
  const workerAnalysis = await page.evaluate(({ report, workerFile }) => new Promise((done, reject) => {
    const worker = new Worker(`/assets/${workerFile}`, { type: 'module' });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Worker timed out')); }, 15000);
    worker.onmessage = event => { clearTimeout(timer); worker.terminate(); event.data.analysis ? done(event.data.analysis) : reject(new Error('Worker analysis failed')); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error('Worker failed')); };
    worker.postMessage(report);
  }), { report, workerFile });
  const workerHash = await contentHash(workerAnalysis); assert.equal(workerHash, await contentHash(content.analysis));
  const path = `/api/scans/${report.scanId}/insight-reports`;
  const save = () => page.evaluate(async ({ path, analysisHash }) => {
    const response = await fetch(path, { method: 'POST', headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json' }, body: JSON.stringify({ analysisHash }) });
    return { status: response.status, body: await response.json() };
  }, { path, analysisHash: workerHash });
  const saved = await save(); assert.equal(saved.status, 201); assert.equal(saved.body.hash, hash); assert.equal((await save()).status, 200);
  await page.reload();
  const restored = await page.evaluate(async id => (await fetch(`/api/insight-reports/${id}.json`, { headers: { Authorization: 'Bearer fixture' } })).json(), saved.body.id);
  assert.equal(restored.hash, hash); assert.ok(await verifyFrozenInsights(restored));
} finally { await browser.close(); server.closeAllConnections(); await new Promise(done => server.close(done)); }
console.log(`PASS active category report: ${scripts.findingIds.length} repeated script observations -> one issue / one variant; frozen JSON survives reload, actual insights/raw PDFs generated. Model ${content.analysis.model.hash}`);

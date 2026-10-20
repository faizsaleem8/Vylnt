import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
const { chromium } = await import('playwright');
const runs = Number(process.env.VYNLT_OBSERVER_BENCH_RUNS ?? 3);
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('VYNLT_OBSERVER_BENCH_RUNS must be 1..10');
const source = await readFile('dist/extension/content.js', 'utf8');
await mkdir('test-results/observer-benchmark', { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const results = [];
try {
  for (let run = 1; run <= runs; run++) for (const enabled of (run % 2 ? [false, true] : [true, false])) {
    const context = await browser.newContext();
    try {
      await context.route('**/*', route => route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>VYNLT synthetic observer benchmark</title></head><body></body></html>' }) : route.abort());
      const page = await context.newPage();
      await page.goto('http://127.0.0.1/observer-benchmark');
      await page.evaluate(() => {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 2000; i++) {
          const script = document.createElement('script'); script.type = 'application/json'; script.src = `https://cdn.example.test/${i}.js?secret=removed#private`; fragment.append(script);
        }
        document.body.append(fragment);
        globalThis.bench = { messages: [], listener: undefined };
        globalThis.chrome = { runtime: { id: 'fixture', onMessage: { addListener: listener => { bench.listener = listener; } }, sendMessage: async message => {
          // Test-only transport; no page text or raw resource URLs leave this fixture.
          bench.messages.push(message);
        } } };
      });
      const client = await context.newCDPSession(page);
      await client.send('Performance.enable');
      const metrics = async () => Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
      const before = await metrics();
      if (enabled) await page.addScriptTag({ content: source });
      const elapsedMs = await page.evaluate(async () => {
        const start = performance.now();
        for (let n = 1; n <= 120; n++) {
          document.querySelector('script').src = `https://cdn.example.test/change-${n}.js?secret=removed#private`;
          const node = document.createElement('span'); node.textContent = 'Synthetic mutation'; document.body.append(node);
          await new Promise(r => setTimeout(r, 20));
        }
        await new Promise(r => setTimeout(r, 1000));
        return performance.now() - start;
      });
      const after = await metrics();
      const automatic = await page.evaluate(() => bench.messages);
      if (enabled) {
        assert.equal(automatic.length, 2, 'Busy page must produce initial and final snapshots');
        assert.equal(automatic.at(-1).scripts[0].url, 'https://cdn.example.test/change-120.js');
        assert.equal(automatic.at(-1).scripts.length, 150); assert.equal(automatic.at(-1).resources.length, 300);
        assert.ok(!JSON.stringify(automatic).includes('secret=')); assert.ok(!JSON.stringify(automatic).includes('#private'));
        await page.evaluate(() => { document.querySelector('script').src = 'https://cdn.example.test/after-budget.js'; });
        await page.waitForTimeout(850);
        assert.equal(await page.evaluate(() => bench.messages.length), 2, 'Observer stays disconnected after budget');
        await page.evaluate(() => bench.listener({ type: 'COLLECT' }, { id: 'fixture' }));
        assert.equal(await page.evaluate(() => bench.messages.at(-1).scripts[0].url), 'https://cdn.example.test/after-budget.js', 'Explicit collection still works');
      } else assert.equal(automatic.length, 0);
      results.push({ run, collector: enabled, workloadScripts: 2000, mutationBatches: 120, elapsedMs: Math.round(elapsedMs), taskMs: Number(((after.TaskDuration - before.TaskDuration) * 1000).toFixed(2)), scriptMs: Number(((after.ScriptDuration - before.ScriptDuration) * 1000).toFixed(2)), heapDeltaBytes: after.JSHeapUsedSize - before.JSHeapUsedSize, automaticMessages: automatic.length, serializedMessageBytes: Buffer.byteLength(JSON.stringify(automatic)) });
      console.log(JSON.stringify(results.at(-1)));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
await writeFile('test-results/observer-benchmark/results.json', JSON.stringify({ measuredAt: new Date().toISOString(), node: process.version, methodology: 'Paired baseline/collector runs with alternating order; actual built content script in a controlled page with mocked Chrome messaging. CDP page task/script time and heap deltas include workload and test instrumentation. Heap deltas are GC-sensitive, not peak memory. No real extension IPC, background rule evaluation/storage, live website, or native Chrome overhead is measured. 120 mutation batches at 20 ms plus a 1 s settle interval; all network requests are intercepted.', results }, null, 2));
console.log('PASS observer: final snapshot at mutation cap, bounded payload, sanitized URLs, disconnection and explicit rescan.');

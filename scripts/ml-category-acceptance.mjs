// Integration fixtures exercise release behavior; never count these as qualification examples.
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
export async function acceptCategoryRelease({ modulePath, dashboardDir, release, previous, stage }) {
  const { createReport, FileStore, reportHash, createApp, generatePdf, insightHtml, freezeInsights, contentHash, verifyFrozenInsights, analyseEvidenceReport, evaluateGate } = await import(pathToFileURL(modulePath).href);
  const report = createReport(randomUUID(), { url: 'https://qualified-fixture.test/', scannedAt: '2026-10-26T00:00:00Z', headers: { 'content-security-policy': "script-src 'self'" }, cspEvidenceComplete: true, domCollected: true, cookies: [], resources: [], scripts: Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/script-${i}.js`, integrity: false, scriptType: 'classic', async: false, defer: true })) });
  const before = JSON.stringify(report), gateBefore = evaluateGate(report);
  const content = await freezeInsights(report), analysis = content.analysis, hash = await contentHash(content);
  const frozen = { id: hash, hash, createdAt: '2026-10-26T00:00:00Z', content };
  assert.equal(analysis.mode, 'qualified-model'); assert.equal(analysis.inputSchema, 'vynlt-evidence-v3');
  assert.deepEqual(analysis.model.approvedCategories, ['JS-002']); assert.equal(analysis.model.hash, release.modelHash);
  const scripts = [...analysis.issues, ...analysis.contextual].filter(i => i.category === 'JS-002');
  assert.equal(scripts.length, 1); assert.equal(scripts[0].findingIds.length, 71); assert.equal(scripts[0].variants.length, 1);
  assert.equal(JSON.stringify(report), before); assert.deepEqual(evaluateGate(report), gateBefore);
  assert.ok(await verifyFrozenInsights(frozen));
  const oldAnalysis = await analyseEvidenceReport(report, previous);
  const oldContent = { version: content.version, originalScan: report, originalScanHash: content.originalScanHash, analysis: oldAnalysis };
  const oldHash = await contentHash(oldContent), old = { id: oldHash, hash: oldHash, createdAt: frozen.createdAt, content: oldContent };
  assert.notEqual(hash, oldHash); assert.ok(await verifyFrozenInsights(old), 'Previous release still verifies unchanged');
  assert.equal((await analyseEvidenceReport(report, { ...release, modelJson: release.modelJson + ' ' })).mode, 'evidence-summary');
  const incomplete = structuredClone(report); delete incomplete.observation.cspEvidenceComplete;
  assert.ok(!(await analyseEvidenceReport(incomplete)).contextual.some(i => i.category === 'JS-002'));
  const elevated = structuredClone(report); elevated.findings.find(f => f.ruleId === 'JS-002').severity = 'high';
  assert.ok((await analyseEvidenceReport(elevated)).issues.some(i => i.category === 'JS-002'));
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
  const storePath = resolve(stage, 'saved-reports.json'), store = new FileStore(storePath), identity = { ownerId: 'category-fixture', token: 'category-fixture' };
  await store.put(identity, report); await store.putInsight(identity, oldContent);
  const origins = [], app = createApp({ store, auth: { authenticate: async token => token === identity.token ? identity : undefined }, dashboardDir, origins });
  const server = await new Promise(done => { const s = app.listen(0, '127.0.0.1', () => done(s)); });
  const origin = `http://127.0.0.1:${server.address().port}`; origins.push(origin);
  const { chromium } = await import('playwright'); let browser;
  try {
    browser = await chromium.launch({ headless: true }); const context = await browser.newContext(); const page = await context.newPage();
    await page.goto(origin);
    const workerFile = (await readdir(resolve(dashboardDir, 'assets'))).find(n => /^insight-worker-.*\.js$/.test(n)); assert.ok(workerFile);
    const workerResult = await page.evaluate(({ report, workerFile }) => new Promise((done, reject) => {
      const worker = new Worker(`/assets/${workerFile}`, { type: 'module' });
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('Worker timeout')); }, 15000);
      worker.onmessage = event => { clearTimeout(timer); worker.terminate(); done(event.data); };
      worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error('Worker failed')); }; worker.postMessage(report);
    }), { report, workerFile });
    assert.equal(await contentHash(workerResult.analysis), await contentHash(analysis), 'Worker/API results agree exactly');
    await page.getByLabel('Local API token from your .env file').fill(identity.token);
    await page.getByRole('button', { name: 'Connect workspace' }).click();
    await page.getByRole('button', { name: 'History', exact: false }).first().click();
    await page.getByRole('button', { name: report.observation.url, exact: true }).click();
    await page.getByText('Script integrity qualified on controlled applications.', { exact: false }).first().waitFor();
    await page.getByText('Report saved. Blockchain status below.', { exact: true }).waitFor();
    const headers = { Authorization: `Bearer ${identity.token}`, 'Content-Type': 'application/json' };
    const saved = await (await fetch(`${origin}/api/insight-reports/${hash}.json`, { headers })).json();
    assert.equal(saved.hash, hash); assert.ok(await verifyFrozenInsights(saved));
    const again = await fetch(`${origin}/api/scans/${report.scanId}/insight-reports`, { method: 'POST', headers, body: JSON.stringify({ analysisHash: await contentHash(analysis) }) });
    assert.equal(again.status, 200);
    const reopened = new FileStore(storePath); assert.ok(await verifyFrozenInsights(await reopened.getInsight(identity, hash)));
    assert.ok(await verifyFrozenInsights(await reopened.getInsight(identity, oldHash)));
    await page.reload();
    await page.getByLabel('Local API token from your .env file').fill(identity.token);
    await page.getByRole('button', { name: 'Connect workspace' }).click();
    await page.getByText('Workspace connected', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'History', exact: false }).first().click();
    await page.getByRole('button', { name: report.observation.url, exact: true }).click();
    await page.getByText('Script integrity qualified on controlled applications.', { exact: false }).first().waitFor();
    for (const format of ['json', 'pdf']) {
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: `Download insights ${format.toUpperCase()}`, exact: true }).click();
      await (await download).saveAs(resolve(stage, `insights.${format}`));
    }
    assert.equal(JSON.parse(await readFile(resolve(stage, 'insights.json'), 'utf8')).hash, hash);
    assert.equal((await readFile(resolve(stage, 'insights.pdf'))).subarray(0, 4).toString(), '%PDF');
    const row = { report, hash: reportHash(report), receivedAt: frozen.createdAt, feedback: [] };
    await writeFile(resolve(stage, 'raw.pdf'), await generatePdf(row, 'full'));
    await writeFile(resolve(stage, 'archived-insights.pdf'), await generatePdf(row, 'insights', undefined, old));
    const access = await new AxeBuilder({ page }).analyze(); assert.deepEqual(access.violations.map(v => v.id), []);
    await page.screenshot({ path: resolve(stage, 'qualified-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: resolve(stage, 'qualified-narrow.png'), fullPage: true });
    // Print layout uses the exact frozen snapshot and trusted template.
    await page.setContent(insightHtml(frozen, (await readFile('packages/ui/fonts/plex-sans.ttf')).toString('base64')));
    await page.screenshot({ path: resolve(stage, 'insights-layout.png'), fullPage: true });
    return { passed: true, modelHash: release.modelHash, checks: ['React automatic save', 'Worker/API equality', '71 observations / one issue / one variant', 'file-store reload', 'idempotent save', 'new and archived versions', 'JSON and PDF downloads', 'raw PDF', 'missing evidence and high severity', 'altered-model fallback', 'unchanged raw/gate decisions', 'automated accessibility', 'narrow layout'], reportHash: hash, archivedHash: oldHash };
  } finally { await browser?.close(); server.closeAllConnections(); await new Promise(done => server.close(done)); }
}

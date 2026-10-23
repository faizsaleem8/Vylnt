import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { Contract, ContractFactory, JsonRpcProvider, Wallet, keccak256, hexlify } from 'ethers';
import { AnchorService, anchorAbi, verifyAnchor, verifyExport } from '../apps/server/anchor';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { createReport } from '../packages/core';
import { contentHash, freezeInsights } from '../packages/ml/frozen-insights';
import type { StoredInsightReport } from '../packages/core/insight-contracts';
import type { AnchorProof } from '../packages/core/anchor';
import type { Server } from 'node:http';

const dir = resolve('.local/blockchain-acceptance-' + randomUUID()); await mkdir(dir, { recursive: true });
const rpcUrl = 'http://127.0.0.1:18545';
const results: string[] = [];
function pass(name: string) { results.push(name); console.log('PASS:', name); }
const provider = new JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1, batchMaxCount: 1 });
let node: ChildProcess | undefined, service: AnchorService | undefined, server: Server | undefined, browser: any, context: any;
async function until<T>(work: () => Promise<T>, label: string, ms = 15000): Promise<T> {
  const start = Date.now(); let error: unknown;
  while (Date.now() - start < ms) { try { const value = await work(); if (value) return value; } catch (e) { error = e; } await new Promise(r => setTimeout(r, 150)); }
  throw new Error('Timeout: ' + label + ' ' + String(error ?? ''));
}
async function startNode() {
  node = spawn(process.execPath, ['node_modules/hardhat/dist/src/cli.js', 'node', '--hostname', '127.0.0.1', '--port', '18545'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  // Consume development key/RPC output without printing it or writing credentials.
  node.stdout?.on('data', () => {}); node.stderr?.on('data', () => {});
  await until(async () => { const r = await fetch(rpcUrl, { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }), headers: { 'Content-Type': 'application/json' } }); return (await r.json()).result === '0x7a69'; }, 'isolated EVM');
}
async function stopNode() { if (node && node.exitCode === null) { const exited = once(node, 'exit'); node.kill(); await exited; } node = undefined; }
const config = { journal: join(dir, 'anchors.json'), manifest: join(dir, 'deployment.json'), signer: join(dir, 'signer.json'), autoStart: false };
const owner = { ownerId: 'a', token: 'a' };
const store = new FileStore(join(dir, 'reports.json'));
const scan = (url = 'https://m5.test/') => createReport(randomUUID(), { url, scannedAt: new Date().toISOString(), domCollected: true, scripts: [], resources: [], headers: {} });
async function listen() {
  const app = createApp({ store, anchors: service, mode: 'local', origins: ['http://127.0.0.1:18546'], auth: { authenticate: async token => ['a', 'b'].includes(token) ? { ownerId: token, token } : undefined }, dashboardDir: 'dist/dashboard', rateLimits: { windowMs: 60000, ipMax: 2000, userMax: 2000, writeMax: 1000 } });
  server = app.listen(18546, '127.0.0.1'); await once(server, 'listening');
  return `http://127.0.0.1:${(server.address() as any).port}`;
}
async function stopApi() { if (server) await new Promise<void>(r => server!.close(() => r())); server = undefined; }
try {
  // Never reset or reuse a user's existing local EVM.
  let occupied = false; try { await fetch(rpcUrl, { signal: AbortSignal.timeout(700) }); occupied = true; } catch {}
  assert.equal(occupied, false, 'Port 18545 must be free for isolated acceptance');
  await startNode();
  const artifact = JSON.parse(await readFile('.local/blockchain/contract.json', 'utf8'));
  const wallet = Wallet.fromPhrase('test test test test test test test test test test test junk').connect(provider);
  const contract = await new ContractFactory(artifact.abi, artifact.bytecode, wallet).deploy(hexlify(randomBytes(32)));
  const deployed = await contract.deploymentTransaction()!.wait(1); assert.ok(deployed);
  const address = await contract.getAddress(), c = new Contract(address, anchorAbi, provider);
  const d = { version: 1 as const, rpcUrl, chainId: 31337 as const, address, instanceId: await c.instanceId(), writer: wallet.address, runtimeHash: keccak256(await provider.getCode(address)), deploymentTx: deployed.hash, deploymentBlockHash: deployed.blockHash, sourceHash: artifact.sourceHash };
  await writeFile(config.manifest, JSON.stringify(d)); await writeFile(config.signer, JSON.stringify({ privateKey: wallet.privateKey }), { mode: 0o600 });
  await assert.rejects(() => c.connect(wallet).getFunction('anchor')('0x' + '0'.repeat(64)));
  const stranger = await provider.getSigner(1);
  await assert.rejects(() => c.connect(stranger).getFunction('anchor')('0x' + '1'.repeat(64)));
  pass('contract rejects zero and unauthorized digests');

  service = await AnchorService.open(config); let origin = await listen();
  const api = async (path: string, method = 'GET', body?: unknown, token = 'a') => {
    const response = await fetch(origin + '/api' + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: response.status === 204 ? undefined : await response.json(), headers: response.headers };
  };
  const report = scan(); await store.put(owner, report);
  const savePath = `/scans/${report.scanId}/insight-reports`, body = { analysisHash: await contentHash((await freezeInsights(report)).analysis) };
  const saved = (await api(savePath, 'POST', body)).data as StoredInsightReport;
  const path = '/insight-reports/' + saved.id;
  assert.equal((await api(path + '/anchor')).data.proof.status, 'queued');
  assert.equal((await api('/reports/verify-upload', 'POST', saved)).data.result, 'not-anchored');
  await Promise.all([api(savePath, 'POST', body), api(savePath, 'POST', body)]);
  assert.equal(JSON.parse(await readFile(config.journal, 'utf8')).jobs.length, 1);
  for (const suffix of ['/anchor', '/verify', '/anchor-proof.json']) assert.equal((await api(path + suffix, 'GET', undefined, 'b')).status, 404);
  pass('automatic finalisation, concurrent idempotency and owner isolation');
  const preBroadcast = await provider.send('evm_snapshot', []);
  await service.tick(); assert.equal((await service.status('a', saved.id)).proof?.status, 'submitted');
  await stopApi(); await service.close();
  // Remove only this test transaction from the isolated chain, reproducing a durable signed
  // journal whose first broadcast never reached the node. Recovery must reuse signed bytes.
  assert.equal(await provider.send('evm_revert', [preBroadcast]), true);
  service = await AnchorService.open(config); origin = await listen();
  await until(async () => { await service!.tick(); return (await service!.status('a', saved.id)).proof?.status === 'confirmed'; }, 'recovered transaction confirmation');
  let proof = (await api(path + '/anchor-proof.json')).data as AnchorProof;
  assert.equal(proof.status, 'confirmed'); assert.equal((await api(path + '/verify')).data.result, 'matching');
  const nonce = await provider.getTransactionCount(wallet.address);
  await api(savePath, 'POST', body); await service.tick(); assert.equal(await provider.getTransactionCount(wallet.address), nonce);
  pass('signed-before-broadcast journal, API/service restart reconciliation and no duplicate transaction');
  let ledger = (await api('/blockchain/ledger')).data;
  assert.equal(ledger.result, 'live');
  assert.equal(ledger.entries.filter((entry: any) => entry.reportHash === saved.hash).length, 1);
  assert.equal(ledger.entries[0].transactionHash, proof.transactionHash);
  assert.equal(ledger.entries[0].parentHash, (await provider.getBlock(proof.blockNumber!))!.parentHash);
  assert.ok(!JSON.stringify(ledger).includes('owner') && !JSON.stringify(ledger).includes('scanId'));
  const secondAccountScan = scan('https://m5.test/account-b-demo');
  const secondAccount = { ownerId: 'b', token: 'b' };
  await store.put(secondAccount, secondAccountScan);
  const secondAccountReport = (await store.putInsight(secondAccount, await freezeInsights(secondAccountScan))).report;
  await service.enqueue('b', secondAccountReport);
  await until(async () => { await service!.tick(); return (await service!.status('b', secondAccountReport.id)).proof?.status === 'confirmed'; }, 'second account demo anchor');
  const demo = (await fetch(origin + '/demo-api/ledger')).status;
  assert.equal(demo, 200);
  const demoView = await (await fetch(origin + '/demo-api/ledger')).json();
  assert.equal(demoView.result, 'live'); assert.equal(demoView.accounts.length, 2);
  assert.ok(demoView.accounts.every((account: any) => /^Account [A-F0-9]{8}$/.test(account.label)));
  assert.ok(!JSON.stringify(demoView).includes('ownerId') && !JSON.stringify(demoView).includes(secondAccountScan.scanId));
  assert.ok(demoView.accounts.some((account: any) => account.entries.some((entry: any) => entry.reportHash === secondAccountReport.hash)));
  pass('standalone loopback demo groups real anchors from two accounts without exposing owner IDs or evidence');
  await provider.send('hardhat_mine', ['0xc9']);
  ledger = (await api('/blockchain/ledger')).data;
  assert.equal(ledger.entries.length, 0);
  assert.ok(ledger.nextBefore >= 0);
  const olderLedger = (await api('/blockchain/ledger?before=' + ledger.nextBefore)).data;
  assert.equal(olderLedger.entries.filter((entry: any) => entry.reportHash === saved.hash).length, 1);
  assert.equal((await api('/blockchain/ledger?before=0')).data.entries.length, 0);
  pass('live ledger reads real unique events, block links and bounded older ranges without private journal data');
  assert.equal((await verifyExport(saved, proof, config.manifest)).result, 'matching');
  const tampered = structuredClone(saved); tampered.content.analysis.summary += ' altered';
  assert.equal((await verifyExport(tampered, proof, config.manifest)).result, 'content-mismatch');
  assert.equal((await verifyAnchor(provider, d, { ...proof, instanceId: '0x' + '1'.repeat(64) })).result, 'verification-unavailable');
  assert.equal((await verifyAnchor(provider, d, { ...proof, blockHash: '0x' + '1'.repeat(64) })).result, 'verification-unavailable');
  assert.equal((await verifyAnchor(provider, d, { ...proof, transactionHash: deployed.hash })).result, 'verification-unavailable');
  assert.deepEqual((await api(path + '.json')).data, saved);
  pass('export identity, tamper rejection, wrong deployment/block/event rejection and unchanged JSON');
  await writeFile(join(dir, 'report.json'), JSON.stringify(saved)); await writeFile(join(dir, 'proof.json'), JSON.stringify(proof)); await writeFile(join(dir, 'tampered.json'), JSON.stringify(tampered));
  const runCli = (file: string) => promisify(execFile)(process.execPath, ['scripts/blockchain.mjs', 'verify', join(dir, file), join(dir, 'proof.json')], { env: { ...process.env, VYNLT_CHAIN_DEPLOYMENT: config.manifest }, windowsHide: true });
  assert.match((await runCli('report.json')).stdout, /"result": "matching"/);
  await assert.rejects(() => runCli('tampered.json'));
  pass('public verification CLI succeeds for original export and fails for altered content');

  const before = await c.anchoredAt('0x' + saved.hash);
  const duplicate = await (await c.connect(await provider.getSigner(0)).getFunction('anchor')('0x' + saved.hash)).wait();
  assert.equal(await c.anchoredAt('0x' + saved.hash), before);
  assert.equal((await verifyAnchor(provider, d, { ...proof, transactionHash: duplicate.hash })).result, 'verification-unavailable');
  pass('contract duplicates preserve original block');
  const cancelled = scan(); await store.put(owner, cancelled); const frozen = (await store.putInsight(owner, await freezeInsights(cancelled))).report;
  await service.enqueue('a', frozen); assert.equal((await api(`/scans/${cancelled.scanId}`, 'DELETE')).status, 204);
  assert.equal((await service.status('a', frozen.id)).proof, undefined);
  pass('scan deletion cancels unsent jobs');

  const batch: StoredInsightReport[] = [];
  for (const suffix of ['one', 'two']) {
    const r = scan('https://m5.test/' + suffix); await store.put(owner, r);
    batch.push((await store.putInsight(owner, await freezeInsights(r))).report);
  }
  await Promise.all(batch.map(r => service!.enqueue('a', r)));
  await until(async () => { await service!.tick(); return (await Promise.all(batch.map(r => service!.status('a', r.id)))).every(v => v.proof?.status === 'confirmed'); }, 'distinct concurrent jobs', 20000);
  const nonces = await Promise.all(batch.map(async r => (await provider.getTransaction((await service!.status('a', r.id)).proof!.transactionHash!))!.nonce));
  assert.equal(new Set(nonces).size, 2); assert.equal(nonces[1], nonces[0] + 1);
  pass('concurrent distinct reports serialize unique transaction nonces');

  // A seeded failed job isolates UI Retry behavior; actual failure exhaustion is tested below.
  const retryScan = scan('https://m5.test/retry'); await store.put(owner, retryScan);
  const retrySaved = (await store.putInsight(owner, await freezeInsights(retryScan))).report; await service.enqueue('a', retrySaved);
  await stopApi(); await service.close();
  const retryJournal = JSON.parse(await readFile(config.journal, 'utf8'));
  Object.assign(retryJournal.jobs.find((j: any) => j.proof.reportHash === retrySaved.id).proof, { status: 'failed', attempts: 5, error: 'Controlled retry fixture.' });
  await writeFile(config.journal, JSON.stringify(retryJournal)); service = await AnchorService.open(config); origin = await listen();

  // Exercise real React controls against the API and shared panel in the extension.
  const automaticScan = scan('https://m5.test/automatic'); await store.put(owner, automaticScan);
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true }); const dashboardContext = await browser.newContext(); const page = await dashboardContext.newPage();
  const errors: string[] = []; page.on('pageerror', (e: Error) => errors.push(e.message));
  await page.goto(origin); await page.getByLabel('Local API token from your .env file').fill('a'); await page.getByRole('button', { name: 'Connect workspace' }).click();
  await page.getByRole('button', { name: 'History', exact: false }).first().click();
  await page.getByRole('button', { name: automaticScan.observation.url, exact: true }).first().click();
  await page.getByLabel('Automatic report saving').getByText('Report saved.', { exact: false }).waitFor();
  const automaticVersions = await store.listInsights(owner, automaticScan.scanId);
  assert.equal(automaticVersions.length, 1, 'analysis completion saves a version without a download');
  await until(async () => { await service!.tick(); return (await service!.status('a', automaticVersions[0].id)).proof?.status === 'confirmed'; }, 'automatic report anchor');
  pass('generated React report saves, hashes and anchors without any download click');
  assert.equal(await page.locator('.issue-details[open], .model-details[open], .raw-findings[open], .blockchain-details[open]').count(), 0, 'report defaults to a compact presentation');
  assert.equal(await page.locator('.downloads-menu').count(), 0);
  assert.equal(await page.locator('.scan-summary').getByRole('button', { name: 'Print / Save PDF', exact: true }).isVisible(), true);
  assert.equal(await page.locator('.scan-summary').getByRole('button', { name: 'Export JSON', exact: false }).isVisible(), true);
  assert.equal(await page.getByRole('button', { name: 'Download insights PDF', exact: true }).isVisible(), true);
  assert.equal(await page.locator('.scan-integrity').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Verify local anchor' }).isVisible(), true, 'blockchain verification is visible without expanding a disclosure');
  await page.screenshot({ path: join(dir, 'dashboard-report-minimal.png'), fullPage: true });
  await page.getByRole('region', { name: 'Blockchain report verification', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Verify local anchor' }).waitFor(); await page.getByRole('button', { name: 'Verify local anchor' }).click();
  await page.getByText('matching: Frozen JSON matches', { exact: false }).waitFor();
  const dl = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download anchor proof' }).click(); const download = await dl; assert.ok(download.suggestedFilename().endsWith('-anchor-proof.json'));
  const AxeBuilder = (await import('@axe-core/playwright')).default;
  assert.deepEqual((await new AxeBuilder({ page }).include('.anchor-panel').analyze()).violations, []);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.equal(await page.getByRole('button', { name: 'Retry anchoring' }).count(), 0);
  await page.getByRole('button', { name: 'History', exact: false }).first().click();
  await page.getByRole('button', { name: retryScan.observation.url, exact: true }).first().click();
  await page.getByRole('region', { name: 'Blockchain report verification', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Retry anchoring' }).click();
  await until(async () => { await service!.tick(); return (await service!.status('a', retrySaved.id)).proof?.status === 'confirmed'; }, 'UI retry recovery');
  await page.getByRole('button', { name: 'Verify local anchor' }).click();
  await page.getByText('matching: Frozen JSON matches', { exact: false }).waitFor();
  pass('dashboard Retry requeues a seeded failed job and recovers to a live verified anchor');
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: join(dir, 'dashboard-anchor.png'), fullPage: true });
  assert.deepEqual(errors, []);
  pass('real dashboard live verification, proof download, accessibility and narrow layout');
  await page.getByRole('button', { name: 'Back to history', exact: false }).click();
  await page.getByRole('heading', { name: 'Scan history', exact: false }).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1');
  await page.getByRole('button', { name: `Delete scan for ${retryScan.observation.url}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.ok(await store.get(owner, retryScan.scanId));
  await page.getByRole('button', { name: `Delete scan for ${retryScan.observation.url}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete scan', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(await store.get(owner, retryScan.scanId), undefined);
  const siteOrigin = 'https://manage-delete.test';
  const siteRows = [scan(siteOrigin + '/one'), scan(siteOrigin + '/two')]; for (const r of siteRows) await store.put(owner, r);
  const otherOwnerScan = scan(siteOrigin + '/private'); await store.put({ ownerId: 'b', token: 'b' }, otherOwnerScan);
  await page.getByRole('button', { name: 'Websites', exact: true }).click(); await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('button', { name: 'Delete website ' + siteOrigin, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Cancel');
  assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal((await store.siteScanIds(owner, siteOrigin)).length, 2);
  await page.route('**/api/sites?origin=*', async (route: any) => { if (route.request().method() === 'DELETE') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Controlled deletion failure.' }) }); else await route.continue(); });
  await page.getByRole('button', { name: 'Delete website ' + siteOrigin, exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Delete website', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').waitFor(); assert.equal((await store.siteScanIds(owner, siteOrigin)).length, 2);
  await page.unroute('**/api/sites?origin=*');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete website', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal((await store.siteScanIds(owner, siteOrigin)).length, 0); assert.ok(await store.get({ ownerId: 'b', token: 'b' }, otherOwnerScan.scanId));
  assert.equal(await page.getByRole('button', { name: 'Delete website ' + siteOrigin, exact: true }).count(), 0);
  assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
  pass('compact defaults, contextual Back, scan/website deletion, cancel/failure/retry and owner isolation');
  await page.getByRole('button', { name: 'Verify report', exact: true }).click();
  const verifyPanel = page.getByRole('region', { name: 'Verify uploaded report' });
  await verifyPanel.getByLabel('Report JSON').setInputFiles(join(dir, 'report.json'));
  await verifyPanel.getByRole('button', { name: 'Verify report', exact: true }).click();
  await verifyPanel.getByRole('heading', { name: 'Report matches the blockchain anchor' }).waitFor();
  await verifyPanel.getByLabel('Report JSON').setInputFiles(join(dir, 'tampered.json'));
  await verifyPanel.getByRole('button', { name: 'Verify report', exact: true }).click();
  await verifyPanel.getByRole('heading', { name: 'Report has been altered or corrupted' }).waitFor();
  await verifyPanel.getByText('Hash comparison', { exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: join(dir, 'verify-upload-desktop.png'), fullPage: true });
  assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 320, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(dir, 'verify-upload-mobile.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await verifyPanel.getByLabel('Report JSON').setInputFiles({ name: 'raw-report.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report)) });
  await verifyPanel.getByRole('button', { name: 'Verify report', exact: true }).click();
  await verifyPanel.getByRole('heading', { name: 'Report matches the saved database hash' }).waitFor();
  await verifyPanel.getByLabel('Report JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('not JSON') });
  await verifyPanel.getByRole('button', { name: 'Verify report', exact: true }).click();
  await verifyPanel.getByRole('alert').filter({ hasText: 'not valid JSON' }).waitFor();
  await page.getByRole('button', { name: 'History', exact: false }).first().click();
  await until(async () => await page.locator('.verify-report').count() === 0, 'verification navigation unmount');
  pass('uploaded report UI verifies original, rejects tampering, exposes hash comparison and passes accessibility/narrow/large text layout');
  const latestSecondScan = scan('https://m5.test/account-b-latest-demo');
  await store.put(secondAccount, latestSecondScan);
  const latestSecondReport = (await store.putInsight(secondAccount, await freezeInsights(latestSecondScan))).report;
  await service.enqueue('b', latestSecondReport);
  await until(async () => { await service!.tick(); return (await service!.status('b', latestSecondReport.id)).proof?.status === 'confirmed'; }, 'second account recent anchor');
  await page.goto(origin + '/ledger.html');
  await page.getByText(/Live · Chain/).waitFor();
  assert.equal(await page.locator('.account-lane').count(), 2);
  for (const lane of await page.locator('.account-lane').all()) assert.ok(await lane.locator('.block-card').count() > 0);
  assert.ok(await page.locator('.block-card').count() > 0);
  await page.locator('.block-card summary').first().click();
  assert.ok(await page.getByText('Parent block hash', { exact: true }).first().isVisible());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: join(dir, 'demo-accounts-desktop.png'), fullPage: true });
  assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
  await page.setViewportSize({ width: 320, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(dir, 'demo-accounts-mobile.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  pass('standalone anonymous multi-account explorer opens without login and renders linked cards accessibly');
  await browser.close(); browser = undefined;
  const extension = resolve('dist/extension');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const panel = await context.newPage(); await panel.setViewportSize({ width: 390, height: 844 });
  await panel.goto('chrome-extension://' + new URL(worker.url()).host + '/report.html');
  await panel.locator('#connection').evaluate((d: HTMLDetailsElement) => { d.open = true; });
  await panel.locator('#api-settings').evaluate((d: HTMLDetailsElement) => { d.open = true; });
  await panel.locator('#api-url').fill(origin);
  await panel.getByRole('button', { name: 'Load workspace connection', exact: true }).click();
  await panel.locator('#api-token').fill('a'); await panel.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await panel.getByRole('button', { name: 'Saved scans', exact: true }).click();
  await panel.getByRole('button').filter({ hasText: report.observation.url }).first().click();
  await panel.locator('[aria-label="Saved insights anchors"] summary').first().click();
  await panel.getByRole('button', { name: 'Verify local anchor' }).click();
  await panel.getByText('matching: Frozen JSON matches', { exact: false }).waitFor();
  assert.deepEqual((await new AxeBuilder({ page: panel }).include('.anchor-panel').analyze()).violations, []);
  assert.equal(await panel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await panel.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
  await panel.screenshot({ path: join(dir, 'extension-anchor.png'), fullPage: true });
  await context.close(); context = undefined;
  pass('installed automated extension saved-version verification, accessibility and narrow layout');

  await stopNode();
  assert.equal((await (await fetch(origin + '/demo-api/ledger')).json()).result, 'unavailable');
  assert.deepEqual((await api('/blockchain/ledger')).data.entries, []);
  assert.equal((await api('/blockchain/ledger')).data.result, 'unavailable');
  assert.equal((await api(path + '/verify')).data.result, 'verification-unavailable');
  assert.equal((await api('/reports/verify-upload', 'POST', saved)).data.result, 'verification-unavailable');
  assert.equal((await api('/reports/verify-upload', 'POST', tampered)).data.result, 'content-mismatch');
  const pending = scan(); await store.put(owner, pending); const pendingSaved = (await api(`/scans/${pending.scanId}/insight-reports`, 'POST', { analysisHash: await contentHash((await freezeInsights(pending)).analysis) })).data;
  assert.equal((await api('/insight-reports/' + pendingSaved.id + '.json')).status, 200);
  pass('offline blockchain cannot verify but report save/download remain available');
  // Test five failures using persisted jobs with test-only accelerated nextAt, not production backoff changes.
  for (let i = 0; i < 5; i++) {
    await service.tick(); await service.close();
    const journal = JSON.parse(await readFile(config.journal, 'utf8')); for (const j of journal.jobs) j.nextAt = 0;
    await writeFile(config.journal, JSON.stringify(journal)); service = await AnchorService.open(config);
  }
  assert.equal((await service.status('a', pendingSaved.id)).proof?.status, 'failed');
  await service.retry('a', pendingSaved); assert.equal((await service.status('a', pendingSaved.id)).proof?.status, 'queued');
  pass('five-attempt exhaustion survives restart and explicit retry repairs state');
  await startNode(); assert.equal((await service.verify('a', saved)).result, 'verification-unavailable');
  assert.equal((await api('/blockchain/ledger')).data.result, 'unavailable');
  pass('fresh local chain cannot reuse historical confirmations');
  await writeFile(join(dir, 'report.json'), JSON.stringify(saved)); await writeFile(join(dir, 'proof.json'), JSON.stringify(proof));
  await mkdir('test-results', { recursive: true }); await writeFile('test-results/blockchain-acceptance.json', JSON.stringify({ passed: results, failures: [], scope: 'isolated local chain; no hosted/public attestation', artifacts: dir }, null, 2));
  console.log('VYNLT local blockchain acceptance passed:', results.length);
} finally {
  await context?.close(); await browser?.close(); await stopApi(); await service?.close(); await stopNode(); provider.destroy();
}


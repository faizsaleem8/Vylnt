// UI regressions and design evidence using isolated synthetic data; no live account/API access.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
const { chromium } = await import('playwright');
const out = resolve('test-results/frontend-design');
await mkdir(out, { recursive: true });
const report = JSON.parse(await readFile('test-results/insecure.json', 'utf8'));
report.scanId = randomUUID();
const summary = { scanId: report.scanId, url: report.observation.url, scannedAt: report.observation.scannedAt, score: report.score, findingCount: report.findings.length, highCount: 1, coverage: { headers: true, dom: true, cookies: true }, hash: 'a'.repeat(64) };
let delay = 0; let emptyWorkspace = false;
const root = resolve('dist/dashboard');
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/fixture') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>VYNLT controlled audit fixture</title><p>Local audit fixture</p>'); return; }
    if (path.startsWith('/api/')) {
      await new Promise(r => setTimeout(r, delay));
      res.setHeader('Content-Type', 'application/json');
      const data = path === '/api/config' ? { mode: 'local' } :
        path === '/api/scans' ? { scans: emptyWorkspace ? [] : [summary], total: emptyWorkspace ? 0 : 1, page: 1, limit: 30 } :
        path === '/api/sites' ? { sites: emptyWorkspace ? [] : [{ origin: new URL(summary.url).origin, scanCount: 1, latest: summary }] } :
        { report, hash: 'a'.repeat(64), receivedAt: new Date().toISOString(), feedback: [] };
      res.end(JSON.stringify(data)); return;
    }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser, context;
const results = { fixture: 'isolated synthetic API and scan; no live account', panel: {}, dashboard: {} };
const metrics = () => ({
  viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
  buttons: [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height > 0).map(b => {
    const r = b.getBoundingClientRect(), s = getComputedStyle(b);
    return { text: b.textContent.trim().slice(0, 55), width: Math.round(r.width), height: Math.round(r.height), font: s.fontSize, transition: s.transitionDuration, transform: s.transform };
  })
});
async function until(fn, label) {
  for (let i = 0; i < 80; i++) { if (await fn()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Audit timed out: ' + label);
}
async function inspectAppearance(page, name, toolbarSelector) {
  const evidence = {};
  await page.evaluate(() => document.fonts.ready);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.mouse.move(0, 0);
    await page.evaluate(() => scrollTo(0, 0));
    evidence[colorScheme] = await page.evaluate(() => ({ background: getComputedStyle(document.documentElement).backgroundColor, font: getComputedStyle(document.documentElement).fontFamily, width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(evidence[colorScheme].scrollWidth <= evidence[colorScheme].width, name + ' ' + colorScheme + ' fits');
    assert.match(evidence[colorScheme].font, /VYNLT Plex/);
    assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family.includes('VYNLT Plex') && font.status === 'loaded')), name + ' bundled font loaded');
    await page.screenshot({ path: resolve(out, name + '-' + colorScheme + '.png'), fullPage: true });
  }
  assert.notEqual(evidence.light.background, evidence.dark.background, name + ' follows light/dark preference');
  const enabled = page.locator('button:visible:enabled').first();
  await enabled.scrollIntoViewIfNeeded(); const box = await enabled.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  evidence.reducedMotion = await enabled.evaluate(el => ({ transform: getComputedStyle(el).transform, transition: getComputedStyle(el).transitionDuration }));
  await page.mouse.move(0, 0); await page.mouse.up();
  assert.equal(evidence.reducedMotion.transform, 'none'); assert.equal(evidence.reducedMotion.transition, '0s');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-contrast', value: 'more' }] });
  evidence.preferences = await page.locator(toolbarSelector).evaluate(el => ({ blur: getComputedStyle(el).backdropFilter, background: getComputedStyle(el).backgroundColor }));
  assert.equal(evidence.preferences.blur, 'none', name + ' solid toolbar with preferences');
  assert.ok(!evidence.preferences.background.startsWith('rgba'), name + ' opaque preference fallback');
  await cdp.send('Emulation.setEmulatedMedia', { features: [] }); await cdp.detach();
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  evidence.largeText = await page.evaluate(() => ({ rootFont: getComputedStyle(document.documentElement).fontSize, width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  await page.screenshot({ path: resolve(out, name + '-large-text.png'), fullPage: true });
  assert.ok(evidence.largeText.scrollWidth <= evidence.largeText.width, name + ' fits at 200% root text');
  if (toolbarSelector === '.toolbar') {
    assert.ok(await page.locator(toolbarSelector).evaluate(el => {
      const [brand, control] = [...el.children].map(child => child.getBoundingClientRect());
      return brand.right <= control.left || brand.bottom <= control.top || control.bottom <= brand.top;
    }), 'Panel toolbar controls do not overlap at enlarged text');
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  return evidence;
}
try {
  browser = await chromium.launch({ channel: 'chromium', headless: true });
  const dashboard = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await dashboard.goto(origin);
  await dashboard.getByLabel('Local API token from your .env file').waitFor();
  await dashboard.evaluate(() => document.fonts.ready);
  await dashboard.screenshot({ path: resolve(out, 'dashboard-local-login.png'), fullPage: true });
  await dashboard.getByLabel('Local API token from your .env file').fill('audit-fixture-token');
  await dashboard.getByRole('button', { name: 'Connect workspace' }).click();
  await dashboard.locator('.metric').first().waitFor();
  // Clear the success notice before measuring loading-only displacement.
  await dashboard.getByRole('button', { name: 'Refresh', exact: false }).click();
  await until(() => dashboard.locator('.loading').count().then(n => n === 0), 'initial refresh');
  const before = await dashboard.locator('.metric-grid').boundingBox();
  delay = 1500;
  await dashboard.getByRole('button', { name: 'Refresh', exact: false }).click();
  await dashboard.locator('.loading').waitFor();
  const during = await dashboard.locator('.metric-grid').boundingBox();
  results.dashboard.refreshLayoutShiftPx = Math.round(during.y - before.y);
  assert.ok(Math.abs(results.dashboard.refreshLayoutShiftPx) <= 1, 'Refresh must retain the metric grid position');
  await until(() => dashboard.locator('.loading').count().then(n => n === 0), 'delayed refresh'); delay = 0;
  results.dashboard.desktop = await dashboard.evaluate(metrics);
  await dashboard.screenshot({ path: resolve(out, 'dashboard-desktop.png'), fullPage: true });
  assert.equal(await dashboard.locator('.coverage-table [data-observed="true"]').count(), 3);
  summary.coverage.dom = false;
  await dashboard.getByRole('button', { name: 'Refresh', exact: false }).click();
  await until(() => dashboard.locator('.coverage-table [data-observed="false"]').count().then(n => n === 1), 'partial coverage from API');
  assert.equal(await dashboard.locator('.coverage-table [data-observed="false"]').innerText(), 'Not observed');
  results.dashboard.coverageMatrix = 'Three source columns; partial DOM shown as Not observed after refresh';
  await dashboard.screenshot({ path: resolve(out, 'dashboard-partial-coverage.png'), fullPage: true });
  for (const name of ['Websites', 'Settings', 'History']) {
    await dashboard.getByRole('button', { name, exact: false }).first().click();
    await dashboard.screenshot({ path: resolve(out, 'dashboard-' + name.toLowerCase() + '.png'), fullPage: true });
  }
  await dashboard.getByRole('button', { name: summary.url, exact: true }).click();
  await until(() => dashboard.evaluate(() => document.activeElement?.tagName === 'H1'), 'report heading focus');
  await dashboard.getByLabel('Filter findings').selectOption('critical');
  results.dashboard.emptyFilter = { cards: await dashboard.locator('.finding').count(), emptyMessage: await dashboard.getByRole('heading', { name: /no findings match|no (matching|critical) findings/i }).count() };
  assert.equal(results.dashboard.emptyFilter.cards, 0);
  assert.equal(results.dashboard.emptyFilter.emptyMessage, 1, 'Filtered empty state explains the result');
  await dashboard.getByRole('button', { name: 'Clear filter', exact: true }).click();
  assert.equal(await dashboard.locator('.finding').count(), report.findings.length);
  await dashboard.locator('.finding summary').first().click();
  await dashboard.screenshot({ path: resolve(out, 'dashboard-evidence.png'), fullPage: true });
  await dashboard.emulateMedia({ media: 'print' });
  assert.equal(await dashboard.locator('.sidebar').isVisible(), false);
  assert.ok(await dashboard.locator('.finding-content').last().isVisible(), 'Print exposes collapsed finding evidence');
  await dashboard.screenshot({ path: resolve(out, 'dashboard-print.png'), fullPage: true });
  await dashboard.emulateMedia({ media: 'screen' });
  await dashboard.setViewportSize({ width: 390, height: 844 });
  results.dashboard.mobile = await dashboard.evaluate(metrics);
  await dashboard.screenshot({ path: resolve(out, 'dashboard-mobile.png'), fullPage: true });
  results.dashboard.appearance = await inspectAppearance(dashboard, 'dashboard-mobile', '.topbar');
  await dashboard.setViewportSize({ width: 1440, height: 1000 });
  await dashboard.getByRole('button', { name: 'Overview', exact: false }).first().click();
  await dashboard.screenshot({ path: resolve(out, 'dashboard-desktop-light.png'), fullPage: true });
  await dashboard.emulateMedia({ colorScheme: 'dark' });
  await dashboard.screenshot({ path: resolve(out, 'dashboard-desktop-dark.png'), fullPage: true });

  await dashboard.emulateMedia({ colorScheme: 'light' });
  await dashboard.setViewportSize({ width: 390, height: 844 });
  results.dashboard.overviewMobile = await inspectAppearance(dashboard, 'dashboard-overview-mobile', '.topbar');
  emptyWorkspace = true;
  await dashboard.getByRole('button', { name: 'Refresh', exact: false }).click();
  await dashboard.getByRole('heading', { name: 'Coverage starts with a scan' }).waitFor();
  assert.equal(await dashboard.locator('.coverage-table').count(), 0);
  await dashboard.screenshot({ path: resolve(out, 'dashboard-empty.png'), fullPage: true });
  emptyWorkspace = false;
  await dashboard.route(origin + '/api/config', route => route.fulfill({ json: { mode: 'supabase', supabase: { url: 'https://localhost', publishableKey: 'sb_publishable_audit_fixture' } } }));
  await dashboard.route('https://localhost/auth/v1/**', route => route.fulfill({ status: 400, json: { msg: 'Controlled sign-in failure. Check your details and try again.' } }));
  await dashboard.reload();
  await dashboard.getByLabel('Email address').waitFor();
  await dashboard.screenshot({ path: resolve(out, 'dashboard-supabase-login.png'), fullPage: true });
  await dashboard.getByRole('button', { name: 'New to VYNLT? Create an account' }).click();
  await dashboard.screenshot({ path: resolve(out, 'dashboard-register.png'), fullPage: true });
  await dashboard.getByRole('button', { name: 'Already have an account? Sign in' }).click();
  await dashboard.getByLabel('Email address').fill('audit@example.test');
  await dashboard.getByLabel('Password', { exact: true }).fill('fixture-only-password');
  await dashboard.getByRole('button', { name: 'Sign in', exact: true }).click();
  await dashboard.getByRole('alert').waitFor();
  await dashboard.screenshot({ path: resolve(out, 'dashboard-auth-error.png'), fullPage: true });

  const extension = resolve('dist/extension');
  context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: { width: 380, height: 900 }, args: ['--disable-extensions-except=' + extension, '--load-extension=' + extension] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await until(async () => (await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts())).length, 'content registration');
  const panel = await context.newPage(); await panel.goto('chrome-extension://' + new URL(worker.url()).host + '/report.html');
  const fixture = await context.newPage(); await fixture.goto(origin + '/fixture'); await fixture.bringToFront();
  await until(async () => (await panel.locator('#site').textContent()) === '127.0.0.1', 'panel current tab');
  await panel.evaluate(async report => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.runtime.sendMessage({ type: 'PAUSE', paused: true });
    await chrome.storage.session.set({ ['tab:' + tab.id]: { requestId: 'audit', documentId: 'audit', report } });
  }, report);
  await panel.locator('.finding-card').first().waitFor();
  await panel.locator('#connection').evaluate(d => { d.open = false; });
  const first = panel.locator('.finding-card').first();
  await first.locator('summary').click(); await first.locator('summary').focus();
  await first.evaluate(el => { window.auditFinding = el; });
  results.panel.beforeUpdate = await panel.evaluate(() => ({ open: document.querySelector('.finding-card').open, focused: document.activeElement.tagName }));
  await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const key = 'tab:' + tab.id, data = await chrome.storage.session.get(key);
    data[key].report.observation.resources.push({ url: 'https://audit.test/changed.js', type: 'script', outcome: 'referenced' });
    await chrome.storage.session.set(data);
  });
  await panel.waitForTimeout(1300);
  results.panel.afterUpdate = await panel.evaluate(() => ({ open: document.querySelector('.finding-card').open, focused: document.activeElement.tagName }));
  assert.equal(results.panel.afterUpdate.open, true, 'Live update preserves expanded evidence');
  assert.equal(results.panel.afterUpdate.focused, 'SUMMARY', 'Live update preserves keyboard focus');
  assert.ok(await first.evaluate(el => el === window.auditFinding), 'Live update keeps the same disclosure node');
  // Reorder by adding an earlier finding; preserve the original open and focused node.
  const anchorBefore = await first.locator('summary').evaluate(el => el.getBoundingClientRect().top);
  await panel.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const key = 'tab:' + tab.id, data = await chrome.storage.session.get(key);
    const extra = structuredClone(data[key].report.findings[0]); extra.id = 'audit-new-finding'; extra.title = 'New controlled finding';
    data[key].report.findings.unshift(extra); await chrome.storage.session.set(data);
  });
  await until(() => panel.locator('.finding-card').count().then(n => n === report.findings.length + 1), 'new finding renders');
  assert.ok(await panel.evaluate(() => window.auditFinding.open && window.auditFinding.contains(document.activeElement)), 'New finding retains reading focus');
  const anchorAfter = await panel.evaluate(() => window.auditFinding.querySelector('summary').getBoundingClientRect().top);
  assert.ok(Math.abs(anchorAfter - anchorBefore) <= 1, 'New finding retains visible reading position');
  // A different scan should have fresh disclosure state.
  await panel.evaluate(async report => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const key = 'tab:' + tab.id, data = await chrome.storage.session.get(key);
    report.scanId = crypto.randomUUID(); data[key].report = report; await chrome.storage.session.set(data);
  }, report);
  await until(() => panel.locator('.finding-card').count().then(n => n === report.findings.length), 'different scan renders');
  assert.equal(await first.evaluate(el => el.open), false, 'Different scan resets disclosure');
  const expectedCoverage = [report.observation.headers !== undefined, Boolean(report.observation.domCollected), report.observation.cookies !== undefined].map(String);
  assert.deepEqual(await panel.locator('.coverage-bar .coverage-cell').evaluateAll(cells => cells.map(cell => cell.dataset.observed)), expectedCoverage);
  await first.locator('summary').click();
  await panel.screenshot({ path: resolve(out, 'extension-evidence.png'), fullPage: true });
  await first.locator('summary').click();
  results.panel.layout = await panel.evaluate(metrics);
  results.panel.disclosure = await first.locator('.finding-disclosure').evaluate(el => ({ width: el.getBoundingClientRect().width, border: getComputedStyle(el).borderRightStyle }));
  assert.ok(results.panel.disclosure.width > 0);
  await panel.evaluate(() => scrollTo(0, 0));
  await panel.screenshot({ path: resolve(out, 'extension-panel.png'), fullPage: true });
  results.panel.appearance = await inspectAppearance(panel, 'extension-panel', '.toolbar');
  // Controlled auth form: check Enter submits without sending anything to an external service.
  let authRequests = 0;
  await panel.route(origin + '/api/config', route => route.fulfill({ json: { mode: 'supabase', supabase: { url: 'https://localhost', publishableKey: 'sb_publishable_audit_fixture' } } }));
  await panel.route('https://localhost/auth/v1/**', route => { authRequests++; return route.fulfill({ status: 400, json: { msg: 'Audit mock' } }); });
  await panel.locator('#connection > summary').click();
  await panel.locator('#api-settings').getByText('Connection settings', { exact: true }).click();
  await panel.locator('#api-url').fill(origin);
  await panel.getByRole('button', { name: 'Load workspace connection', exact: true }).click();
  await panel.locator('#supabase-auth').waitFor();
  await panel.getByLabel('Email address').fill('audit@example.test');
  await panel.evaluate(() => scrollTo(0, 0));
  await panel.screenshot({ path: resolve(out, 'extension-account.png'), fullPage: true });
  await panel.getByLabel('Password', { exact: true }).fill('fixture-not-a-real-password');
  await panel.getByLabel('Password', { exact: true }).press('Enter');
  await until(() => Promise.resolve(authRequests === 1), 'Enter submits sign in');
  results.panel.enterLoginRequests = authRequests;
  await panel.getByLabel('Password', { exact: true }).fill('fixture-not-a-real-password');
  await panel.getByRole('button', { name: 'Sign in', exact: true }).click();
  await until(() => Promise.resolve(authRequests === 2), 'click sign in submits');
  results.panel.clickLoginRequests = authRequests;
  await panel.locator('#auth-password').fill('');
  assert.ok(results.panel.layout.buttons.every(b => b.height >= 44), 'Panel controls have at least 44px height at default size');
  assert.ok(results.dashboard.mobile.buttons.every(b => b.height >= 44), 'Dashboard controls have at least 44px height at default size');
  await writeFile(resolve(out, 'measurements.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ refreshLayoutShiftPx: results.dashboard.refreshLayoutShiftPx, emptyFilter: results.dashboard.emptyFilter, panelBeforeUpdate: results.panel.beforeUpdate, panelAfterUpdate: results.panel.afterUpdate, enterLoginRequests: results.panel.enterLoginRequests, clickLoginRequests: results.panel.clickLoginRequests, screenshots: out }, null, 2));
} finally {
  await context?.close(); await browser?.close();
  server.closeAllConnections(); await new Promise(r => server.close(r));
}

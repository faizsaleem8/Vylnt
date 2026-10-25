// Browser UI regression against controlled Auth responses, not the live Supabase project.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
const { chromium } = await import('playwright');
await mkdir('test-results', { recursive: true });
const origin = 'http://127.0.0.1:4320'; const supabaseUrl = 'https://localhost'; // mocked; matches extension's default localhost permission
const publicKey = 'sb_publishable_browser_test_fixture';
const user = { id: '00000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: 'test@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-10-15T00:00:00Z' };
const makeToken = n => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 120, n })).toString('base64url')}.test-signature`;
let browser, server, extensionContext; let issued = 0, refreshed = 0, loggedOut = 0; const apiTokens = [];
const session = () => ({ access_token: makeToken(++issued), token_type: 'bearer', expires_in: 120, refresh_token: `fixture-refresh-${issued}`, user });
async function untilReady() { for (let i = 0; i < 70; i++) { try { if ((await fetch(`${origin}/api/health`)).ok) return; } catch {} await new Promise(r => setTimeout(r, 150)); } throw new Error('Test API did not start'); }
try {
  server = spawn(process.execPath, ['dist/server/index.js'], { stdio: 'ignore', env: { ...process.env, VYLNT_STORAGE: 'supabase', SUPABASE_URL: supabaseUrl, SUPABASE_PUBLISHABLE_KEY: publicKey, HOST: '127.0.0.1', PORT: '4320', VYLNT_ALLOWED_ORIGINS: origin } });
  await untilReady(); browser = await chromium.launch({ channel: 'chromium', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const errors = [];
  await page.clock.install();
  page.on('pageerror', e => errors.push(e.message));
  const authRoute = async route => {
    const req = route.request(); const url = new URL(req.url());
    if (url.pathname.endsWith('/token')) {
      const body = req.postDataJSON();
      if (url.searchParams.get('grant_type') === 'password') {
        if (body.password !== 'fixture-password') { await route.fulfill({ status: 400, json: { error_code: 'invalid_credentials', msg: 'Invalid login credentials' } }); return; }
      } else { refreshed++; assert.ok(body.refresh_token.startsWith('fixture-refresh-')); }
      await route.fulfill({ json: session() }); return;
    }
    if (url.pathname.endsWith('/signup')) { await route.fulfill({ json: { ...user, identities: [] } }); return; }
    if (url.pathname.endsWith('/logout')) { loggedOut++; await route.fulfill({ status: 204 }); return; }
    if (url.pathname.endsWith('/user')) { await route.fulfill({ json: user }); return; }
    throw new Error(`Unexpected mock auth route: ${url.pathname}`);
  };
  await page.route(`${supabaseUrl}/auth/v1/**`, authRoute);
  let throttleDashboard = false, paginatedWorkspace = false;
  const websiteFixtures = Array.from({ length: 31 }, (_, i) => ({ origin: `https://site-${i + 1}.test`, scanCount: i ? 1 : 1075,
    latest: { scanId: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, url: `https://site-${i + 1}.test/`, scannedAt: '2026-10-16T00:00:00Z',
      score: 85, findingCount: 2, highCount: 1, coverage: { headers: true, dom: true, cookies: false }, hash: 'a'.repeat(64) } }));
  for (const path of ['scans', 'sites']) await page.route(`${origin}/api/${path}*`, async route => {
    apiTokens.push(route.request().headers().authorization);
    if (throttleDashboard) { await route.fulfill({ status: 429, headers: { 'Retry-After': '12' }, contentType: 'text/html', body: '<p>Proxy limit</p>' }); return; }
    if (paginatedWorkspace) {
      const requestedPage = Number(new URL(route.request().url()).searchParams.get('page') ?? 1);
      await route.fulfill({ json: path === 'scans' ? { scans: [websiteFixtures[requestedPage - 1].latest], total: 1105, page: requestedPage, limit: 30 }
        : { sites: websiteFixtures.slice((requestedPage - 1) * 30, requestedPage * 30), total: 31, page: requestedPage, limit: 30, overview: { latestHigh: 31, averageScore: 85 } } }); return;
    }
    await route.fulfill({ json: path === 'scans' ? { scans: [], total: 0, page: 1, limit: 30 } : { sites: [], total: 0, page: 1, limit: 30, overview: { latestHigh: 0, averageScore: null } } });
  });
  await page.goto(origin);
  await page.getByLabel('Email address').fill(user.email); await page.getByLabel('Password', { exact: true }).fill('wrong'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Invalid login credentials' }).waitFor(); assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '');
  await page.getByRole('button', { name: 'New to VYLNT?', exact: false }).click(); await page.getByLabel('Password', { exact: true }).fill('fixture-password'); await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('Check your email to confirm', { exact: false }).waitFor();
  await page.screenshot({ path: 'test-results/supabase-sign-in.png', fullPage: true });
  await page.getByLabel('Password', { exact: true }).fill('fixture-password'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByText('Workspace connected', { exact: false }).waitFor();
  const beforeRefresh = apiTokens[apiTokens.length - 1];
  assert.ok(beforeRefresh?.startsWith('Bearer '));
  assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })), { local: [], session: [] });
  await page.clock.fastForward(60000);
  for (let i = 0; i < 40 && !refreshed; i++) await new Promise(r => setTimeout(r, 100));
  assert.ok(refreshed > 0, 'Expected automatic in-memory token refresh');
  await page.getByRole('button', { name: 'Refresh', exact: false }).click();
  await page.waitForTimeout(200); assert.notEqual(apiTokens[apiTokens.length - 1], beforeRefresh);
  paginatedWorkspace = true;
  await page.getByRole('button', { name: 'Refresh', exact: false }).click();
  await page.getByText('Showing 5 of 31 websites.', { exact: false }).waitFor();
  assert.equal(await page.locator('.metric').filter({ hasText: 'Websites observed' }).locator('strong').textContent(), '31');
  assert.equal(await page.locator('.metric').filter({ hasText: 'High or critical' }).locator('strong').textContent(), '31');
  assert.equal(await page.locator('.metric').filter({ hasText: 'Saved scans' }).locator('strong').textContent(), '1105');
  await page.getByRole('button', { name: 'Websites', exact: true }).click();
  assert.equal(await page.locator('.site-card').count(), 30);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Page 2 of 2 / 31 websites', { exact: true }).waitFor();
  assert.equal(await page.locator('.site-card').count(), 1);
  assert.match(await page.locator('.site-card').textContent(), /site-31.test/);
  assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'test-results/website-pagination-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await page.getByText('Page 1 of 2 / 31 websites', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  assert.match(await page.locator('.site-line').first().textContent(), /site-1.test/);
  await page.getByRole('button', { name: /^History/ }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Page 2 of 37', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  paginatedWorkspace = false;
  throttleDashboard = true;
  await page.getByRole('button', { name: 'Refresh', exact: false }).click();
  await page.getByRole('alert').filter({ hasText: 'Wait 12 seconds' }).waitFor();
  await page.screenshot({ path: 'test-results/dashboard-rate-limit.png', fullPage: true });
  throttleDashboard = false;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor(); assert.ok(loggedOut > 0);
  await page.getByLabel('Email address').fill(user.email); await page.getByLabel('Password', { exact: true }).fill('fixture-password'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByText('Workspace connected', { exact: false }).waitFor();
  await page.reload(); await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })), { local: [], session: [] });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'test-results/supabase-sign-in-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS mocked Supabase browser flow: sign-in/confirmation/refresh/sign-out, zero persistent tokens, global totals, website/history pagination, overview stability, throttling guidance, mobile layout.');
  const extensionPath = resolve('dist/extension');
  extensionContext = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] });
  const worker = extensionContext.serviceWorkers()[0] ?? await extensionContext.waitForEvent('serviceworker');
  const extensionPage = await extensionContext.newPage();
  await extensionPage.route(`${supabaseUrl}/auth/v1/**`, authRoute);
  const savedScans = new Map(); let posts = 0; let failures = 1; let preflightFailures = 1; const submitted = []; let throttledAt = 0; const throttledAttempts = []; let queuedAttempts = 0;
  const sizeAttempts = { json: 0, html: 0 };
  await extensionPage.route(origin + '/api/scans**', async route => {
    assert.ok(route.request().headers().authorization?.startsWith('Bearer ey'));
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); submitted.push(body);
      assert.deepEqual(Object.keys(body).sort(), ['observation', 'scanId']);
      if (body.observation.url.endsWith('/oversized-json')) { sizeAttempts.json++; await route.fulfill({ status: 413, json: { code: 'REPORT_TOO_LARGE', error: 'Generated report too large' } }); return; }
      if (body.observation.url.endsWith('/oversized-html')) { sizeAttempts.html++; await route.fulfill({ status: 413, contentType: 'text/html', body: '<p>Proxy upload too large</p>' }); return; }
      if (body.observation.url.endsWith('/throttled')) {
        throttledAttempts.push({ at: Date.now(), body });
        if (!throttledAt) { throttledAt = Date.now(); await route.fulfill({ status: 429, headers: { 'Retry-After': '8' }, contentType: 'text/html', body: '<p>Proxy limit</p>' }); return; }
      }
      if (body.observation.url.endsWith('/queued')) queuedAttempts++;
      if (failures-- > 0) { await route.fulfill({ status: 503, json: { error: 'Temporary failure' } }); return; }
      posts++;
      const report = { ...body, findings: [], score: 100, rulesetVersion: '0.2.0' };
      savedScans.set(body.scanId, report); await route.fulfill({ status: 201, json: { report } }); return;
    }
    if (new URL(route.request().url()).searchParams.get('limit') === '1' && preflightFailures-- > 0) { await route.fulfill({ status: 503, json: { error: 'Database unavailable' } }); return; }
    const id = path.split('/')[3];
    if (route.request().method() === 'DELETE') { savedScans.delete(id); await route.fulfill({ status: 204 }); return; }
    if (id) { await route.fulfill({ json: { report: savedScans.get(id) } }); return; }
    await route.fulfill({ json: { scans: [...savedScans.values()].map(r => ({ scanId: r.scanId, url: r.observation.url, scannedAt: r.observation.scannedAt, findingCount: 0, score: 100 })), total: savedScans.size } });
  });
  await extensionPage.goto('chrome-extension://' + new URL(worker.url()).host + '/report.html');
  await extensionPage.setViewportSize({ width: 360, height: 900 });
  await extensionPage.locator('#connection').evaluate(d => { d.open = true; });
  await extensionPage.locator('#api-settings').evaluate(d => { d.open = true; });
  await extensionPage.locator('#api-url').fill(origin);
  await extensionPage.getByRole('button', { name: 'Load workspace connection', exact: true }).click();
  await extensionPage.getByText('Workspace ready. Sign in', { exact: false }).waitFor();
  await extensionPage.getByLabel('Email address').fill(user.email);
  await extensionPage.getByLabel('Password', { exact: true }).fill('wrong');
  await extensionPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await extensionPage.getByText('Invalid login credentials', { exact: true }).waitFor();
  await extensionPage.getByLabel('Password', { exact: true }).fill('fixture-password');
  await extensionPage.getByRole('button', { name: 'Create account', exact: true }).click();
  await extensionPage.getByText('Check your email to confirm', { exact: false }).waitFor();
  await extensionPage.getByLabel('Password', { exact: true }).fill('fixture-password');
  await extensionPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await extensionPage.getByText('Database unavailable', { exact: false }).waitFor();
  assert.equal(await extensionPage.locator('#sign-out').isVisible(), false, 'Auth success alone must not claim a connected workspace');
  await extensionPage.getByLabel('Password', { exact: true }).fill('fixture-password');
  await extensionPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await extensionPage.getByText('Signed in. New scans sync automatically.', { exact: false }).waitFor();
  assert.equal(await extensionPage.getByLabel('Password', { exact: true }).inputValue(), '');
  await extensionPage.evaluate(async () => chrome.storage.session.set({ history: [{ scanId: '00000000-0000-4000-8000-000000000003', rulesetVersion: '0.2.0', observation: { url: 'https://localhost/fixture', scannedAt: new Date().toISOString(), resources: [], scripts: [], domCollected: true }, findings: [], score: 100 }] }));
  await extensionPage.getByText('Sync failed. Retrying automatically', { exact: false }).waitFor();
  await extensionPage.getByText('Scan saved automatically.', { exact: false }).waitFor();
  assert.equal(posts, 1); assert.deepEqual(submitted[0], submitted[1]);
  await extensionPage.getByRole('button', { name: 'Saved scans', exact: true }).click();
  await extensionPage.getByRole('button').filter({ hasText: 'https://localhost/fixture' }).click();
  await extensionPage.getByText('0 findings', { exact: true }).waitFor();
  assert.ok(await extensionPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await extensionPage.screenshot({ path: 'test-results/extension-supabase-panel.png', fullPage: true });
  extensionPage.once('dialog', dialog => dialog.accept());
  await extensionPage.getByRole('button', { name: 'Delete saved scan', exact: true }).click();
  await extensionPage.getByText('Saved scan deleted.', { exact: true }).waitFor(); assert.equal(savedScans.size, 0);
  // Real panel -> fetch -> Retry-After parsing -> queue cooldown. No live API writes.
  await extensionPage.evaluate(async () => {
    await chrome.storage.session.set({ history: [{ scanId: crypto.randomUUID(), rulesetVersion: '0.2.0', observation: { url: 'https://localhost/throttled', scannedAt: new Date().toISOString(), resources: [], scripts: [], domCollected: true }, findings: [], score: 100 }] });
  });
  await extensionPage.locator('#upload-status').filter({ hasText: 'Wait 8 seconds' }).waitFor();
  await extensionPage.getByRole('button', { name: 'Retry sync', exact: true }).click();
  await extensionPage.evaluate(async () => {
    const { history } = await chrome.storage.session.get('history');
    history[0].observation.resources.push({ url: 'https://localhost/later.js', type: 'script', outcome: 'referenced' });
    history.push({ ...structuredClone(history[0]), scanId: crypto.randomUUID(), observation: { ...history[0].observation, url: 'https://localhost/queued' } });
    await chrome.storage.session.set({ history });
  });
  await extensionPage.waitForTimeout(1500);
  assert.equal(throttledAttempts.length, 1, 'Retry sync cannot bypass a server cooldown');
  assert.equal(queuedAttempts, 0, 'New queued scans also wait');
  await extensionPage.locator('#upload-status').filter({ hasText: '2 saved' }).waitFor();
  assert.equal(throttledAttempts.length, 2);
  assert.ok(throttledAttempts[1].at - throttledAt >= 8000, 'Cooldown starts at response time');
  assert.deepEqual(throttledAttempts[0].body, throttledAttempts[1].body, 'Throttled report remains immutable');
  assert.equal(queuedAttempts, 1);
  await extensionPage.screenshot({ path: 'test-results/extension-rate-limit-recovered.png', fullPage: true });
  const stored = await extensionPage.evaluate(async () => JSON.stringify({ local: await chrome.storage.local.get(null), session: await chrome.storage.session.get(null), webLocal: { ...localStorage }, webSession: { ...sessionStorage } }));
  assert.ok(!stored.includes('fixture-password') && !stored.includes('fixture-refresh-') && !stored.includes('test-signature'));
  assert.equal(await extensionPage.evaluate(async () => (await chrome.storage.local.get('history')).history), undefined);
  await extensionPage.getByRole('button', { name: 'Sign out', exact: true }).click();
  await extensionPage.getByText('Signed out. Automatic sync stopped.', { exact: true }).waitFor();
  await extensionPage.evaluate(async () => {
    const { history } = await chrome.storage.session.get('history');
    const next = structuredClone(history[0]); next.scanId = crypto.randomUUID(); next.observation.scannedAt = new Date().toISOString();
    await chrome.storage.session.set({ history: [next] });
  });
  await extensionPage.waitForTimeout(3500); assert.equal(posts, 3);
  await extensionPage.reload(); assert.equal(await extensionPage.locator('#sign-out').isVisible(), false);
  // A current scan captured before login, without DOM, still saves; unrelated history does not.
  await extensionContext.route('https://localhost/adopted', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Current scan fixture</title>' }));
  const fixture = await extensionContext.newPage(); await fixture.goto('https://localhost/adopted'); await fixture.bringToFront();
  // Wait for the initial content-script update before replacing it with the
  // controlled missing-DOM fixture; a fixed sleep races that update on slow hosts.
  let initialDom = false;
  for (let attempt = 0; attempt < 100 && !initialDom; attempt++) {
    initialDom = await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const key = 'tab:' + tab.id; const data = await chrome.storage.session.get(key);
      return data[key]?.report.observation.domCollected === true;
    });
    if (!initialDom) await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  assert.ok(initialDom, 'Fixture content script finished before simulating missing DOM');
  const oldId = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const key = 'tab:' + tab.id;
    const data = await chrome.storage.session.get(key); const scan = data[key];
    if (!scan) throw new Error('Fixture scan missing');
    scan.report.observation.domCollected = false;
    scan.report.observation.scannedAt = new Date(Date.now() - 60000).toISOString();
    const other = structuredClone(scan.report); other.scanId = crypto.randomUUID(); other.observation.url = 'https://localhost/unselected';
    await chrome.storage.session.set({ [key]: scan, history: [other, scan.report] });
    return scan.report.scanId;
  });
  await extensionPage.locator('#connection').evaluate(d => { d.open = true; });
  await extensionPage.locator('#api-settings').evaluate(d => { d.open = true; });
  await extensionPage.locator('#api-url').fill(origin);
  await extensionPage.getByRole('button', { name: 'Load workspace connection', exact: true }).click();
  await extensionPage.getByText('Workspace ready. Sign in', { exact: false }).waitFor();
  await extensionPage.getByLabel('Email address').fill(user.email);
  await extensionPage.getByLabel('Password', { exact: true }).fill('fixture-password');
  await extensionPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await extensionPage.getByText('Signed in. Preparing the current scan', { exact: false }).waitFor();
  try { await extensionPage.locator('#upload-status').filter({ hasText: 'Partial coverage: page DOM was not observed.' }).waitFor(); }
  catch (error) { console.error('Partial scan fixture:', { posts, status: await extensionPage.locator('#upload-status').textContent(), adopted: [...savedScans.values()].find(scan => scan.observation.url.endsWith('/adopted'))?.observation.domCollected }); throw error; }
  assert.equal(posts, 4);
  const adopted = [...savedScans.values()].find(scan => scan.observation.url === 'https://localhost/adopted');
  assert.equal(adopted.observation.url, 'https://localhost/adopted');
  assert.equal(adopted.observation.domCollected, false); assert.notEqual(adopted.scanId, oldId);
  assert.ok(!submitted.some(s => s.observation.url.endsWith('/unselected')));
  // Both structured API and HTML proxy 413s are terminal, including manual Retry sync.
  await extensionPage.evaluate(async () => chrome.storage.session.set({ history: ['json', 'html'].map(kind => ({ scanId: crypto.randomUUID(), rulesetVersion: '0.2.0', observation: { url: `https://localhost/oversized-${kind}`, scannedAt: new Date().toISOString(), resources: [], scripts: [], domCollected: true }, findings: [], score: 100 })) }));
  await extensionPage.locator('#upload-status').filter({ hasText: 'generated scan report exceeds' }).waitFor();
  await extensionPage.locator('#upload-status').filter({ hasText: '2 failed' }).waitFor();
  assert.deepEqual(sizeAttempts, { json: 1, html: 1 });
  await extensionPage.getByRole('button', { name: 'Retry sync', exact: true }).click();
  await extensionPage.waitForTimeout(5500);
  assert.deepEqual(sizeAttempts, { json: 1, html: 1 }, 'Neither manual nor automatic retry resubmits oversized snapshots');
  assert.ok(!(await extensionPage.locator('#upload-status').textContent()).includes('invalid response'));
  await extensionPage.evaluate(async () => {
    const { history } = await chrome.storage.session.get('history');
    history.push({ ...structuredClone(history[0]), scanId: crypto.randomUUID(), observation: { ...history[0].observation, url: 'https://localhost/valid-after-size-error', scannedAt: new Date().toISOString() } });
    await chrome.storage.session.set({ history });
  });
  for (let attempt = 0; attempt < 60 && posts < 5; attempt++) await extensionPage.waitForTimeout(250);
  assert.equal(posts, 5, 'A later valid scan saves despite terminal failures');
  assert.deepEqual(sizeAttempts, { json: 1, html: 1 });
  assert.ok([...savedScans.values()].some(scan => scan.observation.url.endsWith('/valid-after-size-error')));
  await extensionPage.screenshot({ path: 'test-results/extension-report-size-error.png', fullPage: true });
  await fixture.close();
  console.log('PASS mocked extension panel: registration, invalid login, database preflight failure, sign-in, automatic upload/retry, Retry-After queue cooldown and recovery, saved details/delete, sign-out, current pre-login partial scan saves, unrelated history excluded, no persistent credentials.');
} finally {
  await extensionContext?.close();
  await browser?.close();
  if (server) { const stopped = new Promise(r => { if (server.exitCode !== null) r(); else server.once('exit', r); }); server.kill(); await stopped; }
}



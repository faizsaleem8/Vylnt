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
  server = spawn(process.execPath, ['dist/server/index.js'], { stdio: 'ignore', env: { ...process.env, VYNLT_STORAGE: 'supabase', SUPABASE_URL: supabaseUrl, SUPABASE_PUBLISHABLE_KEY: publicKey, HOST: '127.0.0.1', PORT: '4320', VYNLT_ALLOWED_ORIGINS: origin } });
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
  for (const path of ['scans', 'sites']) await page.route(`${origin}/api/${path}*`, async route => {
    apiTokens.push(route.request().headers().authorization);
    await route.fulfill({ json: path === 'scans' ? { scans: [], total: 0, page: 1, limit: 30 } : { sites: [] } });
  });
  await page.goto(origin);
  await page.getByLabel('Email address').fill(user.email); await page.getByLabel('Password', { exact: true }).fill('wrong'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Invalid login credentials' }).waitFor(); assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '');
  await page.getByRole('button', { name: 'New to VYNLT?', exact: false }).click(); await page.getByLabel('Password', { exact: true }).fill('fixture-password'); await page.getByRole('button', { name: 'Create account', exact: true }).click();
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
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor(); assert.ok(loggedOut > 0);
  await page.getByLabel('Email address').fill(user.email); await page.getByLabel('Password', { exact: true }).fill('fixture-password'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByText('Workspace connected', { exact: false }).waitFor();
  await page.reload(); await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })), { local: [], session: [] });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'test-results/supabase-sign-in-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS mocked Supabase browser flow: invalid credentials, confirmation-required sign-up, sign-in, automatic refresh, sign-out, reload clears session, zero persistent tokens, mobile layout.');
  const extensionPath = resolve('dist/extension');
  extensionContext = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] });
  const worker = extensionContext.serviceWorkers()[0] ?? await extensionContext.waitForEvent('serviceworker');
  const extensionPage = await extensionContext.newPage();
  await extensionPage.route(`${supabaseUrl}/auth/v1/**`, authRoute);
  let uploaded = false;
  await extensionPage.route(`${origin}/api/scans`, async route => {
    assert.ok(route.request().headers().authorization?.startsWith('Bearer ey'));
    assert.deepEqual(Object.keys(route.request().postDataJSON()).sort(), ['observation', 'scanId']);
    uploaded = true; await route.fulfill({ status: 201, json: { saved: true } });
  });
  await extensionPage.goto(`chrome-extension://${new URL(worker.url()).host}/report.html`);
  await extensionPage.evaluate(async () => chrome.storage.local.set({ history: [{ scanId: '00000000-0000-4000-8000-000000000003', rulesetVersion: '0.2.0', observation: { url: 'https://localhost/fixture', scannedAt: '2026-10-15T00:00:00Z', resources: [], scripts: [], domCollected: true }, findings: [], score: 100 }] }));
  await extensionPage.getByText('0 findings', { exact: true }).waitFor();
  await extensionPage.locator('.sync-panel summary').click(); await extensionPage.locator('#api-url').fill(origin);
  await extensionPage.getByRole('button', { name: 'Load workspace connection', exact: true }).click();
  await extensionPage.getByText('Workspace ready. Sign in', { exact: false }).waitFor();
  await extensionPage.getByLabel('Email address').fill(user.email); await extensionPage.getByLabel('Password', { exact: true }).fill('fixture-password');
  await extensionPage.getByRole('button', { name: 'Sign in', exact: true }).click(); await extensionPage.getByText('Signed in. Select Send scan', { exact: false }).waitFor();
  assert.equal(await extensionPage.getByLabel('Password', { exact: true }).inputValue(), '');
  await extensionPage.getByRole('button', { name: 'Send scan', exact: true }).click(); await extensionPage.getByText('Scan saved to your workspace.', { exact: false }).waitFor(); assert.ok(uploaded);
  const stored = await extensionPage.evaluate(async () => JSON.stringify({ local: await chrome.storage.local.get(null), session: await chrome.storage.session.get(null), webLocal: { ...localStorage }, webSession: { ...sessionStorage } }));
  assert.ok(!stored.includes('fixture-password') && !stored.includes('fixture-refresh-') && !stored.includes('test-signature'));
  await extensionPage.getByRole('button', { name: 'Sign out', exact: true }).click(); await extensionPage.getByText('Signed out on this page.', { exact: true }).waitFor();
  console.log('PASS mocked extension Supabase flow: connection discovery, email/password sign-in, explicit upload with user JWT, sign-out, no stored credentials.');
} finally {
  await extensionContext?.close();
  await browser?.close();
  if (server) { const stopped = new Promise(r => { if (server.exitCode !== null) r(); else server.once('exit', r); }); server.kill(); await stopped; }
}

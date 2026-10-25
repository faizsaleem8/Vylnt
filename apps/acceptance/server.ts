import express from 'express';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { createApp } from '../server/app';
import { supabaseAuth, type Authenticator } from '../server/auth';
import { readSupabaseConfig, type PublicSupabaseConfig } from '../server/config';
import { SupabaseStore, type Identity } from '../server/store';
import { verifyHostedApi, type AcceptanceResult } from '../../packages/acceptance/hosted';
import { contentHash } from '../../packages/core/integrity';

export function createAcceptanceApp(options: { origin: string; config: PublicSupabaseConfig; auth: Authenticator; run: (a: Identity, b?: Identity) => Promise<AcceptanceResult>; onResults?: (results: AcceptanceResult) => Promise<void> }) {
  const app = express(); let sessions: Partial<Record<'A' | 'B', Identity>> = {}, running = false;
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (req.headers.host !== new URL(options.origin).host || (req.method === 'POST' && req.headers.origin !== options.origin)) { res.sendStatus(403); return; }
    res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'no-referrer');
    res.set('Content-Security-Policy', `default-src 'self'; connect-src 'self' ${options.config.url}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`); next();
  });
  app.get('/acceptance/config', (_req, res) => res.json(options.config));
  app.post('/acceptance/session', express.json({ limit: '16kb' }), async (req, res) => {
    if (running) { res.status(409).json({ error: 'A verification run is active.' }); return; }
    const { slot, token } = req.body ?? {};
    if (!['A', 'B'].includes(slot) || typeof token !== 'string' || token.length > 8192) { res.status(400).json({ error: 'Invalid sign-in request.' }); return; }
    try {
      const identity = await options.auth.authenticate(token);
      if (!identity) { res.status(401).json({ error: 'Session expired or invalid. Sign in again.' }); return; }
      const other = sessions[slot === 'A' ? 'B' : 'A'];
      if (other?.ownerId === identity.ownerId) { res.status(400).json({ error: 'Account B must be a different confirmed Supabase user.' }); return; }
      sessions[slot as 'A' | 'B'] = identity; res.json({ connected: true });
    } catch { res.status(503).json({ error: 'Supabase Auth is unavailable. Retry shortly.' }); }
  });
  app.post('/acceptance/run', async (_req, res) => {
    if (running) { res.status(409).json({ error: 'A verification run is active.' }); return; }
    if (!sessions.A) { res.status(401).json({ error: 'Connect account A first.' }); return; }
    running = true;
    try { const results = await options.run(sessions.A, sessions.B); await options.onResults?.(results); res.json(results); }
    catch { res.status(503).json({ error: 'Verification could not complete. Check the local helper; no credentials were logged.' }); }
    finally { sessions = {}; running = false; }
  });
  return { app, clear: () => { sessions = {}; } };
}

export async function startAcceptance() {
  const config = readSupabaseConfig(process.env), origin = 'http://127.0.0.1:4321';
  const auth = supabaseAuth(config.url, config.publishableKey);
  const run = (a: Identity, b?: Identity) => verifyHostedApi({ origin, tokenA: a.token, tokenB: b?.token, insights: true,
    probeInsightStorage: async (phase, frozen, tokenA, tokenB) => {
      const path = `${config.url}/rest/v1/insight_reports?report_id=eq.${frozen.id}`;
      const request = async (token: string, init: RequestInit = {}) => fetch(path, { ...init, headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000) });
      const owner = await request(tokenA);
      if (!owner.ok) throw new Error('Migration 005 unavailable');
      const rows = await owner.json();
      if (phase === 'deleted') { if (rows.length !== 0) throw new Error('Insight cascade deletion failed'); return; }
      if (rows.length !== 1 || rows[0].report_id !== frozen.id || await contentHash(rows[0].content) !== frozen.hash) throw new Error('Insight storage lookup failed');
      for (const method of ['PATCH', 'DELETE']) {
        const response = await request(tokenA, { method, ...(method === 'PATCH' ? { body: JSON.stringify({ created_at: '2000-01-01T00:00:00Z' }) } : {}) });
        if (![401, 403, 405].includes(response.status)) throw new Error('Direct immutable write was not denied');
      }
      if (tokenB) { const other = await request(tokenB); if (!other.ok || (await other.json()).length !== 0) throw new Error('Insight RLS isolation failed'); }
    },
    probeMigration004: async (id, token, pageUrl) => {
      const response = await fetch(`${config.url}/rest/v1/scans?scan_id=eq.${id}&select=page_url_hash`, { headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Migration 004 unavailable');
      const rows = await response.json();
      if (rows.length !== 1 || rows[0].page_url_hash !== createHash('md5').update(pageUrl).digest('hex')) throw new Error('Migration 004 lookup mismatch');
    }, probeIsolation: async (id, token, pageUrl) => {
      for (const path of [`scans?scan_id=eq.${id}&select=scan_id`, `findings?scan_id=eq.${id}&select=finding_id`, `feedback?scan_id=eq.${id}&select=finding_id`, `sites?origin=eq.${encodeURIComponent(new URL(pageUrl).origin)}&select=origin`]) {
        const response = await fetch(`${config.url}/rest/v1/${path}`, { headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
        if (!response.ok || (await response.json()).length !== 0) throw new Error('Direct RLS isolation check failed');
      }
    } });
  const helper = createAcceptanceApp({ origin, config, auth, run, onResults: async results => {
    await mkdir('test-results/supabase-acceptance', { recursive: true });
    await writeFile('test-results/supabase-acceptance/results.json', JSON.stringify({ measuredAt: new Date().toISOString(), ...results }, null, 2));
    console.log(`VYLNT live verification: ${results.checks.length} checks passed; ${results.skipped.length} skipped; ${results.failure ? 'failure' : 'no failure'}; ${results.cleanupFailures.length} cleanup failures. No credentials saved.`);
  } });
  const browser = await build({ entryPoints: ['apps/acceptance/client.ts'], bundle: true, write: false, platform: 'browser', format: 'esm' });
  helper.app.get('/', async (_req, res) => res.type('html').send(await readFile('apps/acceptance/index.html', 'utf8')));
  helper.app.get('/acceptance.js', (_req, res) => res.type('js').send(browser.outputFiles[0].text));
  helper.app.get('/acceptance.css', async (_req, res) => res.type('css').send(await readFile('apps/acceptance/style.css', 'utf8')));
  helper.app.use(createApp({ auth, store: new SupabaseStore(config.url, config.publishableKey), mode: 'supabase', supabase: config, origins: [origin] }));
  const server = createServer(helper.app); await new Promise<void>((r, reject) => { server.once('error', reject); server.listen(4321, '127.0.0.1', r); });
  console.log(`VYLNT private Supabase / ML-7 verification: ${origin} (expires in 30 minutes). Sign in through this page, never in chat.`);
  const timer = setTimeout(() => { helper.clear(); server.close(); }, 30 * 60 * 1000); timer.unref();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { clearTimeout(timer); helper.clear(); server.closeAllConnections(); server.close(); });
}

import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { resolve } from 'node:path';
import { feedbackSchema, parseSubmission } from '../../packages/core/validation';
import { ConflictError, MigrationRequiredError, reportHash, type Identity, type Store } from './store';
import type { Authenticator } from './auth';
import type { PublicSupabaseConfig } from './config';
import { createRateLimits, defaultRateLimits, type RateLimits } from './rate-limits';

const paging = (query: express.Request['query']) => ({
  page: z.coerce.number().int().min(1).max(10000).parse(query.page ?? 1),
  limit: z.coerce.number().int().min(1).max(100).parse(query.limit ?? 50)
});
export function createApp(options: { store: Store; auth: Authenticator; dashboardDir?: string; mode?: string; origins?: string[]; supabase?: PublicSupabaseConfig; rateLimits?: RateLimits }) {
  const app = express(); app.disable('x-powered-by');
  app.set('trust proxy', false);
  const limits = createRateLimits(options.rateLimits ?? defaultRateLimits);
  app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null,
    'connect-src': ["'self'", ...(options.supabase ? [options.supabase.url] : [])] } } }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Extension requests need bearer auth too; CORS is not authentication.
    const permitted = !origin || options.origins?.includes(origin) || /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
    if (!permitted) { res.status(403).json({ error: 'Origin not allowed' }); return; }
    if (origin) { res.set('Access-Control-Allow-Origin', origin); res.vary('Origin'); }
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Expose-Headers', 'Retry-After, RateLimit, RateLimit-Policy');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, limits.client);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: options.mode ?? 'local' }));
  app.get('/api/config', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ mode: options.mode ?? 'local', ...(options.supabase ? { supabase: { url: options.supabase.url, publishableKey: options.supabase.publishableKey } } : {}) });
  });
  app.use('/api', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? '')?.[1];
    if (!token || token.length > 8192) { res.status(401).json({ error: 'A valid bearer token is required' }); return; }
    const identity = await options.auth.authenticate(token);
    if (!identity) { res.status(401).json({ error: 'Invalid or expired token' }); return; }
    res.locals.identity = identity; next();
  });
  app.use('/api', limits.user, limits.writes, express.json({ limit: '512kb' }));
  const identity = (res: express.Response) => res.locals.identity as Identity;
  app.post('/api/scans', async (req, res) => {
    const { scan, created } = await options.store.put(identity(res), parseSubmission(req.body));
    res.status(created ? 201 : 200).json(scan);
  });
  app.get('/api/scans', async (req, res) => {
    res.json(await options.store.listPage(identity(res), paging(req.query)));
  });
  app.get('/api/sites', async (req, res) => {
    res.json(await options.store.sitesPage(identity(res), paging(req.query)));
  });
  app.get('/api/scans/:id', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; } res.json(row);
  });
  app.get('/api/scans/:id/comparisons', async (req, res) => {
    const rows = await options.store.comparisonPage(identity(res), z.uuid().parse(req.params.id), paging(req.query));
    if (!rows) { res.status(404).json({ error: 'Scan not found' }); return; }
    res.json(rows);
  });
  app.get('/api/reports/:id', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    res.attachment(`vynlt-${row.report.scanId}.json`).json(row.report);
  });
  app.get('/api/reports/:id/verify', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    res.json({ matches: reportHash(row.report) === row.hash, hash: row.hash, method: 'local-sha256', anchored: false });
  });
  app.post('/api/scans/:id/findings/:findingId/feedback', async (req, res) => {
    const feedback = await options.store.feedback(identity(res), z.uuid().parse(req.params.id), req.params.findingId as string, feedbackSchema.parse(req.body));
    if (!feedback) { res.status(404).json({ error: 'Finding not found' }); return; } res.json(feedback);
  });
  app.delete('/api/scans/:id', async (req, res) => {
    if (!await options.store.remove(identity(res), z.uuid().parse(req.params.id))) { res.status(404).json({ error: 'Scan not found' }); return; } res.sendStatus(204);
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
  if (options.dashboardDir) app.use(express.static(resolve(options.dashboardDir)));
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid request payload', fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }); return; }
    if (error instanceof ConflictError) { res.status(409).json({ error: error.message }); return; }
    if (error instanceof MigrationRequiredError) { res.status(503).json({ error: error.message }); return; }
    if (error.type === 'entity.too.large') { res.status(413).json({ error: 'Payload exceeds 512 KB' }); return; }
    if (error.type === 'entity.parse.failed') { res.status(400).json({ error: 'Invalid JSON' }); return; }
    console.error('API operation failed:', error.name ?? 'Error'); res.status(503).json({ error: 'Operation unavailable. Check server configuration and retry.' });
  });
  return app;
}

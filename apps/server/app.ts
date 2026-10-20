import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { resolve } from 'node:path';
import { feedbackSchema, parseSubmission } from '../../packages/core/validation';
import { ConflictError, MigrationRequiredError, reportHash, type Identity, type Store } from './store';
import type { Authenticator } from './auth';
import type { PublicSupabaseConfig } from './config';
import { createRateLimits, defaultRateLimits, type RateLimits } from './rate-limits';
import { generatePdf, PdfUnavailableError } from './pdf';
import { analyseScan } from '../../packages/ml/automatic-analysis';
import { assertReportSize, ReportSizeError, reportByteLimit, submissionSizeMessage } from '../../packages/core/report-size';
import { RateBackendUnavailable, type RateBackend } from './shared-rate-limits';

const paging = (query: express.Request['query']) => ({
  page: z.coerce.number().int().min(1).max(10000).parse(query.page ?? 1),
  limit: z.coerce.number().int().min(1).max(100).parse(query.limit ?? 50)
});
export function createApp(options: { store: Store; auth: Authenticator; dashboardDir?: string; mode?: string; origins?: string[]; supabase?: PublicSupabaseConfig; rateLimits?: RateLimits; rateBackend?: RateBackend; trustedProxies?: string[]; renderPdf?: typeof generatePdf }) {
  const app = express(); app.disable('x-powered-by');
  app.set('trust proxy', options.trustedProxies?.length ? options.trustedProxies : false);
  const limits = createRateLimits(options.rateLimits ?? defaultRateLimits, options.rateBackend);
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
    const report = parseSubmission(req.body);
    assertReportSize(report);
    const { scan, created } = await options.store.put(identity(res), report);
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
  app.get('/api/reports/:id/pdf', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    const pdf = await (options.renderPdf ?? generatePdf)(row, 'full');
    if (!res.destroyed) res.attachment(`vynlt-${row.report.scanId}.pdf`).type('application/pdf').send(pdf);
  });
  app.post('/api/reports/:id/insights/pdf', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    const prediction = z.union([
      z.object({ findingId: z.string().max(5000), score: z.number().finite().min(0).max(1), label: z.enum(['actionable', 'contextual']) }).strict(),
      z.object({ findingId: z.string().max(5000), reason: z.string().max(300) }).strict(),
    ]);
    const supplied = z.object({ modelHash: z.string().regex(/^[a-f0-9]{64}$/), values: z.array(prediction).max(1000) }).strict().parse(req.body);
    const analysis = await analyseScan(row.report);
    const matches = supplied.values.length === analysis.values.length && analysis.values.every((expected, index) => {
      const actual = supplied.values[index];
      return actual.findingId === expected.findingId && ('score' in expected ? 'score' in actual && actual.label === expected.label && Math.abs(actual.score - expected.score) <= 1e-12 : 'reason' in actual && actual.reason === expected.reason);
    });
    if (supplied.modelHash !== analysis.modelHash || !matches) {
      res.status(409).json({ error: 'The scan or model analysis has changed. Refresh scan details and retry the insights download.' }); return;
    }
    const pdf = await (options.renderPdf ?? generatePdf)(row, 'insights', analysis);
    if (!res.destroyed) res.attachment(`vynlt-${row.report.scanId}-insights.pdf`).type('application/pdf').send(pdf);
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
    if (error instanceof PdfUnavailableError) { res.set('Retry-After', '5').status(503).json({ error: error.message }); return; }
    if (error instanceof RateBackendUnavailable) { res.set('Retry-After', '5').status(503).json({ error: error.message, code: 'RATE_LIMIT_UNAVAILABLE' }); return; }
    if (error instanceof ReportSizeError) { res.status(413).json({ error: error.message, code: 'REPORT_TOO_LARGE', limitBytes: reportByteLimit, ...(error.bytes === undefined ? {} : { reportBytes: error.bytes }) }); return; }
    if (error.type === 'entity.too.large') { res.status(413).json({ error: submissionSizeMessage, code: 'SUBMISSION_TOO_LARGE', limitBytes: reportByteLimit }); return; }
    if (error.type === 'entity.parse.failed') { res.status(400).json({ error: 'Invalid JSON' }); return; }
    console.error('API operation failed:', error.name ?? 'Error'); res.status(503).json({ error: 'Operation unavailable. Check server configuration and retry.' });
  });
  return app;
}

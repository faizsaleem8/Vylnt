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
import { freezeInsights, contentHash, verifyFrozenInsights, InsightSizeError, insightByteLimit } from '../../packages/ml/frozen-insights';
import { assertReportSize, ReportSizeError, reportByteLimit, submissionSizeMessage } from '../../packages/core/report-size';
import { RateBackendUnavailable, type RateBackend } from './shared-rate-limits';
import type { AnchorService } from './anchor';
import { ProjectError, type ProjectService } from './projects';

const paging = (query: express.Request['query']) => ({
  page: z.coerce.number().int().min(1).max(10000).parse(query.page ?? 1),
  limit: z.coerce.number().int().min(1).max(100).parse(query.limit ?? 50)
});
export function createApp(options: { store: Store; auth: Authenticator; dashboardDir?: string; mode?: string; origins?: string[]; supabase?: PublicSupabaseConfig; rateLimits?: RateLimits; rateBackend?: RateBackend; trustedProxies?: string[]; renderPdf?: typeof generatePdf; anchors?: AnchorService; anchorWarning?: string; projects?: ProjectService }) {
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
    res.set('Access-Control-Expose-Headers', 'Retry-After, RateLimit, RateLimit-Policy, X-VYLNT-Anchor-Warning');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, limits.client);
  // A local presentation surface explicitly showing anonymous groups across accounts.
  // Socket identity is used: proxy headers cannot grant remote access.
  app.get('/demo-api/ledger', limits.client, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) { res.status(403).json({ error: 'The demo ledger is available on this computer only.' }); return; }
    const { before } = z.object({ before: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional() }).strict().parse(req.query);
    res.json(options.anchors ? await options.anchors.demoLedger(before) : { result: 'disabled', message: options.anchorWarning ?? 'Local blockchain anchoring is disabled.', entries: [], accounts: [] });
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: options.mode ?? 'local' }));
  const projects = (req: express.Request) => {
    if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) throw new ProjectError('Local projects are available on this computer only',403);
    if (!options.projects) throw new ProjectError('Local projects are disabled. Set VYLNT_PROJECTS=local and restart the local API.',503);
    return options.projects;
  };
  // Claim is authenticated by a short-lived, single-use capability created by a signed-in owner.
  app.post('/api/project-pairings/claim', express.json({limit:'8kb'}), async (req,res)=>{
    const service=projects(req);
    const {code,path}=z.object({code:z.string().regex(/^[a-f0-9]{48}$/),path:z.string().min(1).max(4096)}).strict().parse(req.body);
    res.status(201).json(await service.claim(code,path));
  });
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
  app.use('/api', limits.user, limits.writes);
  app.use('/api/reports/verify-upload', express.json({ limit: 4 * insightByteLimit }));
  app.use('/api', express.json({ limit: '512kb' }));
  const identity = (res: express.Response) => res.locals.identity as Identity;
  app.post('/api/project-pairings', (req,res)=>{z.object({}).strict().parse(req.body??{});res.status(201).json(projects(req).pairing(identity(res).ownerId));});
  app.get('/api/projects',async(req,res)=>res.json({projects:await projects(req).list(identity(res).ownerId)}));
  app.get('/api/project-runs',async(req,res)=>res.json({runs:await projects(req).runs(identity(res).ownerId)}));
  app.get('/api/project-keys',(req,res)=>res.json({keys:projects(req).signer.trustedKeys}));
  app.post('/api/projects/:id/runs',async(req,res)=>{
    const {commit}=z.object({commit:z.string().default('HEAD')}).strict().parse(req.body??{});
    res.status(202).json(await projects(req).start(identity(res),z.uuid().parse(req.params.id),commit));
  });
  app.get('/api/project-runs/:id',async(req,res)=>{const run=await projects(req).get(identity(res).ownerId,z.uuid().parse(req.params.id));if(!run){res.status(404).json({error:'Run not found'});return;}res.json(run);});
  app.delete('/api/project-runs/:id',async(req,res)=>res.json(await projects(req).cancel(identity(res).ownerId,z.uuid().parse(req.params.id))));
  app.get('/api/scans/:id/project-evidence',async(req,res)=>{
    const service=projects(req),scanId=z.uuid().parse(req.params.id),row=await options.store.get(identity(res),scanId);
    if(!row){res.status(404).json({error:'Scan not found'});return;}
    const evidence=await service.evidence(identity(res).ownerId,scanId,row.report);
    if(!evidence){res.status(404).json({error:'No verified project evidence for this scan'});return;}
    res.json({evidence,qualification:'Seven project-backed categories are not yet qualified'});
  });
  app.get('/api/blockchain/ledger', async (req, res) => {
    const { before } = z.object({ before: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional() }).strict().parse(req.query);
    res.json(options.anchors ? await options.anchors.ledger(before) : { result: 'disabled', message: options.anchorWarning ?? 'Local blockchain anchoring is disabled. Enable it and restart the API.', entries: [] });
  });
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
  app.delete('/api/sites', async (req, res) => {
    const { origin } = z.object({ origin: z.string().max(2048).refine(value => {
      try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && u.origin === value; } catch { return false; }
    }, 'Use an exact HTTP(S) origin without a path or credentials') }).strict().parse(req.query);
    const ids = z.array(z.uuid()).parse(await options.store.siteScanIds(identity(res), origin));
    let deletedScans = 0;
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = ids.slice(offset, offset + 100);
      await options.anchors?.cancelScans(identity(res).ownerId, batch);
      await options.projects?.forget(identity(res).ownerId,batch);
      deletedScans += await options.store.removeScans(identity(res), batch);
    }
    res.json({ deletedScans });
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
  app.post('/api/scans/:id/insight-reports', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    const supplied = z.object({ analysisHash: z.string().regex(/^[0-9a-f]{64}$/) }).strict().parse(req.body);
    const content = await freezeInsights(row.report);
    if (await contentHash(content.analysis) !== supplied.analysisHash) { res.status(409).json({ error: 'Analysis, evidence or policy changed. Refresh the scan before saving insights.' }); return; }
    const result = await options.store.putInsight(identity(res), content);
    if (options.anchors) {
      try { await options.anchors.enqueue(identity(res).ownerId, result.report); }
      catch { res.set('X-VYLNT-Anchor-Warning', 'Report saved; anchoring could not be queued. Save this version again to retry.'); }
    } else if (options.anchorWarning) res.set('X-VYLNT-Anchor-Warning', options.anchorWarning);
    res.status(result.created ? 201 : 200).json(result.report);
  });
  app.get('/api/scans/:id/insight-reports', async (req, res) => {
    const scanId = z.uuid().parse(req.params.id), row = await options.store.get(identity(res), scanId);
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    const rows = await options.store.listInsights(identity(res), scanId);
    res.json(rows.map(r => ({ id: r.id, hash: r.hash, createdAt: r.createdAt })));
  });
  const ownedInsight = async (id: unknown, res: express.Response) => {
    const stored = await options.store.getInsight(identity(res), z.string().regex(/^[0-9a-f]{64}$/).parse(id));
    if (!stored) { res.status(404).json({ error: 'Insights report not found' }); return; }
    const source = await options.store.get(identity(res), stored.content.originalScan.scanId);
    if (!await verifyFrozenInsights(stored) || !source || source.hash !== stored.content.originalScanHash || reportHash(source.report) !== source.hash) {
      res.status(409).json({ result: 'content-mismatch', error: 'Frozen report or source integrity verification failed.' }); return;
    }
    return stored;
  };
  app.post('/api/reports/verify-upload', async (req, res) => {
    if (req.body && typeof req.body === 'object' && 'scanId' in req.body && !('content' in req.body)) {
      const raw = z.object({ scanId: z.uuid(), observation: z.record(z.string(), z.unknown()) }).passthrough().parse(req.body);
      const source = await options.store.get(identity(res), raw.scanId);
      if (!source) { res.json({ result: 'not-found', message: 'No saved scan with this ID is available in your account. Tampering cannot be determined.' }); return; }
      if (reportHash(source.report) !== source.hash) { res.json({ result: 'verification-unavailable', message: 'The saved reference scan could not be verified.' }); return; }
      const uploadedHash = await contentHash(raw), matches = uploadedHash === source.hash;
      res.json({ result: matches ? 'database-matching' : 'content-mismatch', contentMatches: matches, uploadedHash, savedHash: source.hash, message: matches ? 'Raw scan content matches the saved database hash. This original scan hash is not blockchain-anchored; upload insights JSON for blockchain verification.' : 'Report content mismatch: this file has been altered or corrupted and does not match the saved scan.' }); return;
    }
    const uploaded = z.object({ id: z.string().regex(/^[0-9a-f]{64}$/), hash: z.string().regex(/^[0-9a-f]{64}$/), createdAt: z.string().max(100), content: z.record(z.string(), z.unknown()) }).strict().parse(req.body);
    const stored = await options.store.getInsight(identity(res), uploaded.id);
    if (!stored) { res.json({ result: 'not-found', message: 'No saved insights report with this ID is available in your account. Tampering cannot be determined.' }); return; }
    const source = await options.store.get(identity(res), stored.content.originalScan.scanId);
    if (!await verifyFrozenInsights(stored) || !source || source.hash !== stored.content.originalScanHash || reportHash(source.report) !== source.hash) {
      res.json({ result: 'verification-unavailable', message: 'The saved reference report or its source could not be verified. The uploaded file cannot be judged against it.' }); return;
    }
    const uploadedHash = await contentHash(uploaded.content);
    if (uploaded.id !== uploaded.hash || uploadedHash !== uploaded.hash || uploadedHash !== stored.hash) {
      res.json({ result: 'content-mismatch', contentMatches: false, uploadedHash, savedHash: stored.hash, message: 'Report content mismatch: this file has been altered or corrupted and does not match the saved report.' }); return;
    }
    const anchor = options.anchors ? await options.anchors.verify(identity(res).ownerId, stored) : { result: 'verification-unavailable', message: options.anchorWarning ?? 'Local blockchain anchoring is disabled.' };
    res.json({ ...anchor, contentMatches: true, uploadedHash, savedHash: stored.hash });
  });
  app.get('/api/insight-reports/:id/anchor', async (req, res) => {
    const stored = await ownedInsight(req.params.id, res); if (!stored) return;
    res.json(options.anchors ? await options.anchors.status(identity(res).ownerId, stored.id) : { enabled: false, warning: options.anchorWarning ?? 'Local blockchain anchoring is disabled.' });
  });
  app.post('/api/insight-reports/:id/anchor/retry', async (req, res) => {
    z.object({}).strict().parse(req.body ?? {});
    const stored = await ownedInsight(req.params.id, res); if (!stored) return;
    if (!options.anchors) { res.status(503).json({ error: options.anchorWarning ?? 'Local blockchain anchoring is disabled.' }); return; }
    res.json(await options.anchors.retry(identity(res).ownerId, stored));
  });
  app.get('/api/insight-reports/:id/verify', async (req, res) => {
    const stored = await ownedInsight(req.params.id, res); if (!stored) return;
    res.json(options.anchors ? await options.anchors.verify(identity(res).ownerId, stored) : { result: 'verification-unavailable', message: options.anchorWarning ?? 'Local blockchain anchoring is disabled.' });
  });
  app.get('/api/insight-reports/:id/anchor-proof.json', async (req, res) => {
    const stored = await ownedInsight(req.params.id, res); if (!stored) return;
    const view = await options.anchors?.status(identity(res).ownerId, stored.id);
    if (!view?.proof) { res.status(404).json({ error: 'No anchor proof recorded for this version.' }); return; }
    res.attachment(`vylnt-${stored.id}-anchor-proof.json`).json(view.proof);
  });
  app.get('/api/insight-reports/:id{.:format}', async (req, res) => {
    const id = z.string().regex(/^[0-9a-f]{64}$/).parse(req.params.id);
    const format = z.enum(['json', 'pdf']).parse(req.params.format ?? 'json');
    const stored = await options.store.getInsight(identity(res), id);
    if (!stored) { res.status(404).json({ error: 'Insights report not found' }); return; }
    if (!await verifyFrozenInsights(stored)) { res.status(409).json({ error: 'Frozen report integrity or supported decision policy verification failed.' }); return; }
    const source = await options.store.get(identity(res), stored.content.originalScan.scanId);
    if (!source || source.hash !== stored.content.originalScanHash) { res.status(409).json({ error: 'Original scan verification failed.' }); return; }
    if (format === 'json') { res.attachment(`vylnt-insights-${id}.json`).json(stored); return; }
    const pdf = await (options.renderPdf ?? generatePdf)({ ...source, report: stored.content.originalScan, feedback: [] }, 'insights', undefined, stored);
    if (!res.destroyed) res.attachment(`vylnt-${source.report.scanId}-insights.pdf`).type('application/pdf').send(pdf);
  });
  app.get('/api/reports/:id', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    res.attachment(`vylnt-${row.report.scanId}.json`).json(row.report);
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
    if (!res.destroyed) res.attachment(`vylnt-${row.report.scanId}.pdf`).type('application/pdf').send(pdf);
  });
  app.post('/api/reports/:id/insights/pdf', async (req, res) => {
    const row = await options.store.get(identity(res), z.uuid().parse(req.params.id));
    if (!row) { res.status(404).json({ error: 'Scan not found' }); return; }
    res.status(410).json({ error: 'This on-demand synthetic export is retired. Refresh VYLNT and use saved insight reports.' });
  });
  app.post('/api/scans/:id/findings/:findingId/feedback', async (req, res) => {
    const feedback = await options.store.feedback(identity(res), z.uuid().parse(req.params.id), req.params.findingId as string, feedbackSchema.parse(req.body));
    if (!feedback) { res.status(404).json({ error: 'Finding not found' }); return; } res.json(feedback);
  });
  app.delete('/api/scans/:id', async (req, res) => {
    const scanId = z.uuid().parse(req.params.id);
    if (!await options.store.get(identity(res), scanId)) { res.status(404).json({ error: 'Scan not found' }); return; }
    await options.anchors?.cancel(identity(res).ownerId, scanId);
    await options.projects?.forget(identity(res).ownerId,[scanId]);
    if (!await options.store.remove(identity(res), z.uuid().parse(req.params.id))) { res.status(404).json({ error: 'Scan not found' }); return; } res.sendStatus(204);
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
  if (options.dashboardDir) app.use(express.static(resolve(options.dashboardDir)));
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ProjectError) {res.status(error.status).json({error:error.message});return;}
    if (error instanceof InsightSizeError) { res.status(413).json({ error: error.message, code: 'INSIGHTS_TOO_LARGE', limitBytes: insightByteLimit, reportBytes: error.bytes }); return; }
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid request payload', fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }); return; }
    if (error instanceof ConflictError) { res.status(409).json({ error: error.message }); return; }
    if (error instanceof MigrationRequiredError) { res.status(503).json({ error: error.message }); return; }
    if (error instanceof PdfUnavailableError) { res.set('Retry-After', '5').status(503).json({ error: error.message }); return; }
    if (error instanceof RateBackendUnavailable) { res.set('Retry-After', '5').status(503).json({ error: error.message, code: 'RATE_LIMIT_UNAVAILABLE' }); return; }
    if (error instanceof ReportSizeError) { res.status(413).json({ error: error.message, code: 'REPORT_TOO_LARGE', limitBytes: reportByteLimit, ...(error.bytes === undefined ? {} : { reportBytes: error.bytes }) }); return; }
    if (error.type === 'entity.too.large') { const upload = _req.path === '/api/reports/verify-upload'; res.status(413).json({ error: upload ? 'Report JSON uploads must be at most 4 MiB including formatting.' : submissionSizeMessage, code: 'SUBMISSION_TOO_LARGE', limitBytes: upload ? 4 * insightByteLimit : reportByteLimit }); return; }
    if (error.type === 'entity.parse.failed') { res.status(400).json({ error: 'Invalid JSON' }); return; }
    console.error('API operation failed:', error.name ?? 'Error', typeof error.code === 'string' ? error.code : ''); res.status(503).json({ error: 'Operation unavailable. Check server configuration and retry.' });
  });
  return app;
}

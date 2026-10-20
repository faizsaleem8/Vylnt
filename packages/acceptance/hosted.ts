import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

export interface AcceptanceResult { checks: { name: string; elapsedMs: number }[]; skipped: string[]; cleanupFailures: string[]; failure?: string }
/** Bounded synthetic writes only. Uses normal authenticated API paths, never a service key. */
export async function verifyHostedApi(options: { origin: string; tokenA: string; tokenB?: string; probeMigration004?: (scanId: string, token: string, pageUrl: string) => Promise<void>; probeIsolation?: (scanId: string, token: string, pageUrl: string) => Promise<void> }): Promise<AcceptanceResult> {
  const result: AcceptanceResult = { checks: [], skipped: [], cleanupFailures: [] };
  const ids = [randomUUID(), randomUUID()];
  const pageUrl = `https://vynlt-acceptance-${randomUUID()}.invalid/` + 'p'.repeat(3500);
  const body = (id: string, n = 0) => ({ scanId: id, observation: { url: pageUrl + '?acceptance-secret=discarded#discarded', scannedAt: new Date(Date.now() + n).toISOString(), headers: {}, scripts: [], resources: [], domCollected: true } });
  const first = body(ids[0]), second = body(ids[1], 1);
  async function call(path: string, token = options.tokenA, method = 'GET', value?: unknown) {
    const response = await fetch(options.origin + '/api' + path, { method, signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${token}`, Origin: options.origin, 'Content-Type': 'application/json' }, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
    return { status: response.status, data: response.status === 204 ? undefined : await response.json() };
  }
  async function check(name: string, work: () => Promise<void>) {
    const start = performance.now();
    try { await work(); } catch { throw new Error(`${name} failed. Inspect API configuration/migrations and retry; no credentials are included in this result.`); }
    result.checks.push({ name, elapsedMs: Math.round(performance.now() - start) });
  }
  try {
    let baseline = 0, saved: any;
    await check('Authenticated paginated history (migration 002)', async () => { const r = await call('/scans?page=1&limit=1'); assert.equal(r.status, 200); assert.ok(Number.isInteger(r.data.total)); baseline = r.data.total; });
    await check('Atomic scan ingestion and sanitized retrieval', async () => {
      const r = await call('/scans', options.tokenA, 'POST', first); assert.equal(r.status, 201); saved = r.data;
      assert.equal(saved.report.observation.url, pageUrl); assert.ok(saved.report.findings.length > 0);
      assert.ok(!JSON.stringify(saved).includes('acceptance-secret'));
      const read = await call(`/scans/${ids[0]}`); assert.equal(read.status, 200); assert.deepEqual(read.data.report, saved.report);
    });
    await check('Idempotent retry and immutable conflict', async () => {
      assert.equal((await call('/scans', options.tokenA, 'POST', first)).status, 200);
      assert.equal((await call('/scans', options.tokenA, 'POST', { ...first, observation: { ...first.observation, domCollected: false } })).status, 409);
    });
    await check('History totals and same-page comparisons (migration 003)', async () => {
      assert.equal((await call('/scans', options.tokenA, 'POST', second)).status, 201);
      const list = await call('/scans?page=1&limit=1'); assert.equal(list.status, 200); assert.ok(list.data.total >= baseline + 2); assert.ok(list.data.scans.length <= 1);
      const compare = await call(`/scans/${ids[1]}/comparisons?page=1&limit=1`); assert.equal(compare.status, 200); assert.equal(compare.data.total, 1); assert.equal(compare.data.scans[0].scanId, ids[0]);
    });
    await check('Site totals/aggregates (migration 002)', async () => {
      const sites = await call('/sites?page=1&limit=100'); assert.equal(sites.status, 200);
      const own = sites.data.sites.find((site: any) => site.origin === new URL(pageUrl).origin); assert.equal(own?.scanCount, 2); assert.equal(typeof sites.data.overview.latestHigh, 'number');
    });
    if (options.probeMigration004) await check('Migration 004 generated lookup key and long-URL comparison availability', () => options.probeMigration004!(ids[0], options.tokenA, pageUrl));
    else result.skipped.push('Migration 004 column probe not configured');
    const findingId = encodeURIComponent(saved.report.findings[0].id);
    await check('Feedback persistence, export and original hash consistency', async () => {
      assert.equal((await call(`/scans/${ids[0]}/findings/${findingId}/feedback`, options.tokenA, 'POST', { verdict: 'accepted_risk', notes: 'Synthetic acceptance fixture; not a real security assessment.' })).status, 200);
      const read = await call(`/scans/${ids[0]}`); assert.equal(read.status, 200); assert.equal(read.data.feedback[0].verdict, 'accepted_risk'); assert.equal(read.data.hash, saved.hash);
      const verify = await call(`/reports/${ids[0]}/verify`); assert.equal(verify.status, 200); assert.equal(verify.data.matches, true); assert.equal(verify.data.anchored, false);
      const exported = await call(`/reports/${ids[0]}`); assert.equal(exported.status, 200); assert.deepEqual(exported.data, saved.report);
    });
    if (options.tokenB) await check('Second-user API isolation for detail/export/verification/comparison/feedback/deletion', async () => {
      for (const path of [`/scans/${ids[0]}`, `/reports/${ids[0]}`, `/reports/${ids[0]}/verify`, `/reports/${ids[0]}/pdf`, `/scans/${ids[0]}/comparisons`]) assert.equal((await call(path, options.tokenB)).status, 404);
      assert.equal((await call(`/scans/${ids[0]}/findings/${findingId}/feedback`, options.tokenB, 'POST', { verdict: 'fixed', notes: '' })).status, 404);
      assert.equal((await call(`/scans/${ids[0]}`, options.tokenB, 'DELETE')).status, 404);
      assert.equal((await call(`/scans/${ids[0]}`)).status, 200);
      await options.probeIsolation?.(ids[0], options.tokenB!, pageUrl);
    });
    else result.skipped.push('Two-account RLS: a distinct second account is required');
  } catch (error) { result.failure = error instanceof Error ? error.message : 'Acceptance failed'; }
  finally {
    for (const id of ids) {
      try { const r = await call(`/scans/${id}`, options.tokenA, 'DELETE'); if (![204, 404].includes(r.status)) throw new Error(); const read = await call(`/scans/${id}`); if (read.status !== 404) throw new Error(); }
      catch { result.cleanupFailures.push(id); }
    }
    if (!result.cleanupFailures.length) result.checks.push({ name: 'Synthetic scan cleanup confirmed', elapsedMs: 0 });
  }
  return result;
}

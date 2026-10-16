import { afterAll, beforeAll, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { FileStore, reportHash } from '../apps/server/store';
import { parseSubmission } from '../packages/core/validation';
import { summarizeScan, type ScanPage, type SitePage } from '../packages/core/summary';

// Real local PostgreSQL, with only Supabase's identity provider shimmed.
// This does not exercise hosted PostgREST, Auth or the user's database.
const db = new PGlite();
const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '10000000-0000-4000-8000-000000000002';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const report = (n: number, url = 'https://repeat.test/page', scannedAt = '2026-10-16T00:00:00Z') => parseSubmission({ scanId: id(n), observation: { url, scannedAt, headers: {}, resources: n % 2 ? [{ url: 'http://cdn.test/app.js', type: 'script', outcome: 'referenced' }] : [], scripts: [], domCollected: true } });
async function asOwner(owner: string) { await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]); }
async function scanPage(page = 1, limit = 30) { return (await db.query<{ result: ScanPage }>('select public.list_scan_page($1, $2) as result', [page, limit])).rows[0].result; }
async function sitePage(page = 1, limit = 30) { return (await db.query<{ result: SitePage }>('select public.list_site_page($1, $2) as result', [page, limit])).rows[0].result; }
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${ownerA}'), ('${ownerB}');`);
  await db.exec(await readFile('supabase/migrations/001_initial.sql', 'utf8'));
  const migration = await readFile('supabase/migrations/002_pagination.sql', 'utf8');
  await db.exec(migration); await db.exec(migration); // Safe to retry migration 002.
  const comparisonMigration = await readFile('supabase/migrations/003_comparison.sql', 'utf8');
  await db.exec(comparisonMigration); await db.exec(comparisonMigration);
  // 1,105 scans on 1,103 sites. One site's latest scan lies beyond the old cap.
  await db.query(`insert into public.sites(owner_id, origin)
    select $1::uuid, 'https://site-' || i || '.test' from generate_series(1, 1103) i`, [ownerA]);
  await db.query(`insert into public.scans(owner_id, scan_id, origin, scanned_at, report, report_hash)
    select $1::uuid, ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
      'https://site-' || least(i, 1103) || '.test', '2026-10-16'::timestamptz,
      jsonb_set(jsonb_set($2::jsonb, '{scanId}', to_jsonb('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))),
        '{observation,url}', to_jsonb('https://site-' || least(i, 1103) || '.test/page')), repeat('a', 64)
    from generate_series(1, 1105) i`, [ownerA, JSON.stringify(report(1))]);
  await asOwner(ownerA);
}, 30000);
afterAll(async () => { await db.close(); });

it('pages same-URL comparison candidates, excludes the target and preserves RLS', async () => {
  const local = new FileStore(), identity = { ownerId: ownerB, token: '' };
  await asOwner(ownerB);
  const reports = Array.from({ length: 13 }, (_, n) => report(3000 + n));
  reports.push(report(4000, 'https://repeat.test/other'));
  for (const item of reports) {
    await local.put(identity, item);
    await db.query('select public.ingest_scan($1::jsonb, $2)', [JSON.stringify(item), reportHash(item)]);
  }
  const candidates = async (target: string, page = 1, limit = 10) => (await db.query<{ result: ScanPage | null }>('select public.list_comparison_page($1::uuid, $2, $3) as result', [target, page, limit])).rows[0].result;
  const first = await candidates(id(3012)), second = await candidates(id(3012), 2);
  expect(first?.total).toBe(12); expect(first?.scans).toHaveLength(10); expect(second?.scans).toHaveLength(2);
  expect(second?.scans.map(s => s.scanId)).toEqual([id(3001), id(3000)]);
  const normalize = (value: unknown) => JSON.parse(JSON.stringify(value), (key, v) => key === 'receivedAt' ? undefined : v);
  expect(normalize(second)).toEqual(normalize(await local.comparisonPage(identity, id(3012), { page: 2, limit: 10 })));
  expect(await candidates(id(4000))).toMatchObject({ scans: [], total: 0 });
  await expect(candidates(id(3012), 0)).rejects.toThrow('Invalid page');
  await asOwner(ownerA); expect(await candidates(id(3012))).toBeNull();
  await db.exec('set role anon'); await expect(candidates(id(3012))).rejects.toThrow('permission denied');
  await asOwner(ownerB); await db.exec('delete from public.scans');
  expect(await candidates(id(3012))).toBeNull();
});

it('pages past 1,000 with exact totals, deterministic ties and summary-only results', async () => {
  await asOwner(ownerA);
  const first = await scanPage(1, 100), last = await scanPage(12, 100);
  expect(first.total).toBe(1105); expect(first.scans).toHaveLength(100);
  expect(first.scans[0].scanId).toBe(id(1105));
  expect(last.total).toBe(1105); expect(last.scans).toHaveLength(5);
  expect(last.scans.map(s => s.scanId)).toEqual([5, 4, 3, 2, 1].map(id));
  expect(first.scans[0]).not.toHaveProperty('report'); expect(first.scans[0]).not.toHaveProperty('feedback');
  expect(JSON.stringify(first)).not.toContain('evidence');
  expect(await scanPage(10000, 100)).toMatchObject({ scans: [], total: 1105 });
});
it('aggregates every site and its full scan count independently of the page', async () => {
  await asOwner(ownerA);
  const first = await sitePage(1, 100), last = await sitePage(12, 100);
  expect(first.total).toBe(1103); expect(last.sites).toHaveLength(3);
  expect(first.sites[0]).toMatchObject({ origin: 'https://site-1103.test', scanCount: 3, latest: { scanId: id(1105) } });
  expect(last.sites.at(-1)?.origin).toBe('https://site-1.test');
  const summary = summarizeScan({ report: report(1), hash: 'a'.repeat(64), receivedAt: '' });
  expect(summary.highCount).toBe(1);
  expect(first.overview).toEqual({ latestHigh: summary.highCount * 1103, averageScore: summary.score });
  expect(last.overview).toEqual(first.overview);
});
it('isolates owners under RLS and denies anonymous or missing-identity calls', async () => {
  await asOwner(ownerB);
  expect(await scanPage()).toMatchObject({ scans: [], total: 0 });
  expect(await sitePage()).toMatchObject({ sites: [], total: 0, overview: { latestHigh: 0, averageScore: null } });
  expect((await db.query('select scan_id from public.scans')).rows).toHaveLength(0);
  await asOwner('');
  await expect(scanPage()).rejects.toThrow('Authentication required');
  await db.exec('set role anon');
  await expect(scanPage()).rejects.toThrow('permission denied');
  await expect(sitePage()).rejects.toThrow('permission denied');
  await asOwner(ownerA);
});
it('enforces page bounds for direct RPC calls', async () => {
  await asOwner(ownerA);
  for (const [page, limit] of [[0, 30], [10001, 30], [1, 101], [1, 0]]) {
    await expect(scanPage(page, limit)).rejects.toThrow('Invalid page or limit');
    await expect(sitePage(page, limit)).rejects.toThrow('Invalid page or limit');
  }
  await expect(db.query('select public.list_site_page(null, 10)')).rejects.toThrow('Invalid page or limit');
});
it('matches local summaries and updates latest-site statistics after deletion', async () => {
  await asOwner(ownerB);
  const local = new FileStore(), identity = { ownerId: ownerB, token: '' };
  const reports = [report(2001), report(2002, 'https://repeat.test/page', '2026-10-17T00:00:00Z'), report(2003, 'http://other.test/')];
  for (const item of reports) {
    await local.put(identity, item);
    expect((await db.query<{ created: boolean }>('select public.ingest_scan($1::jsonb, $2) as created', [JSON.stringify(item), reportHash(item)])).rows[0].created).toBe(true);
  }
  const normalize = (value: unknown) => JSON.parse(JSON.stringify(value), (key, v) => key === 'receivedAt' ? undefined : v);
  expect(normalize(await scanPage(1, 2))).toEqual(normalize(await local.listPage(identity, { page: 1, limit: 2 })));
  expect(normalize(await sitePage(1, 1))).toEqual(normalize(await local.sitesPage(identity, { page: 1, limit: 1 })));
  expect((await sitePage()).overview.latestHigh).toBe(0);
  await db.query('delete from public.scans where scan_id = $1', [id(2002)]);
  expect((await sitePage()).sites.find(s => s.origin === 'https://repeat.test')?.latest.scanId).toBe(id(2001));
  expect((await sitePage()).overview.latestHigh).toBe(1);
  await db.query('delete from public.scans where scan_id = $1', [id(2001)]);
  expect((await sitePage()).total).toBe(1); // Orphaned sites rows must not count.
  await db.query('delete from public.scans where scan_id = $1', [id(2003)]);
  expect(await sitePage()).toMatchObject({ total: 0, overview: { latestHigh: 0, averageScore: null } });
});

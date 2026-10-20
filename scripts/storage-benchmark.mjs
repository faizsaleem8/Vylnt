import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { platform, release, cpus } from 'node:os';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';

const repeats = Number(process.env.VYNLT_STORAGE_BENCH_RUNS ?? 5);
if (!Number.isInteger(repeats) || repeats < 1 || repeats > 20) throw new Error('VYNLT_STORAGE_BENCH_RUNS must be 1..20');
await mkdir('.local', { recursive: true });
await mkdir('test-results/storage-benchmark', { recursive: true });
const modulePath = resolve('.local/storage-benchmark-module.mjs');
await build({ stdin: { contents: `export { FileStore, reportHash } from './apps/server/store'; export { parseSubmission } from './packages/core/validation'; export { summarizeScan } from './packages/core/summary';`, resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { FileStore, reportHash, parseSubmission, summarizeScan } = await import(pathToFileURL(modulePath).href);
const owner = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
const identity = { ownerId: owner, token: '' };
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture(n, layout) {
  const site = layout === 'single-page' ? 0 : Math.floor((n - 1) / 10);
  const report = parseSubmission({ scanId: id(n), observation: { url: `https://site-${site}.example.test/page?synthetic=removed`, scannedAt: new Date(Date.UTC(2026, 9, 20) + n * 1000).toISOString(), headers: {}, cookies: [], resources: n % 2 === 0 ? [{ url: 'http://cdn.example.test/app.js', type: 'script', outcome: 'referenced' }] : [], scripts: [], domCollected: true } });
  return { report, hash: reportHash(report), receivedAt: report.observation.scannedAt, feedback: [] };
}
const results = [];
const queryPlans = [];
async function measure(engine, count, layout, operation, work, verify) {
  verify(await work()); // One warmup; every measured response is checked too.
  const samples = [];
  let responseBytes = 0;
  for (let i = 0; i < repeats; i++) {
    const start = performance.now(), result = await work();
    samples.push(Number((performance.now() - start).toFixed(3)));
    verify(result); responseBytes = Buffer.byteLength(JSON.stringify(result));
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const result = { engine, scans: count, layout, operation, samplesMs: samples, minMs: sorted[0], medianMs: sorted[Math.floor(sorted.length / 2)], maxMs: sorted.at(-1), responseBytes };
  results.push(result);
  console.log(`${engine} / ${count} / ${layout} / ${operation}: median ${result.medianMs} ms`);
}
function checks(count, layout) {
  const totalSites = layout === 'single-page' ? 1 : count / 10;
  const expectedLatest = summarizeScan(fixture(count, layout));
  const comparisonTotal = layout === 'single-page' ? count - 1 : 9;
  const scans = expectedFirst => page => {
    assert.equal(page.total, count); assert.equal(page.scans.length, 20); assert.equal(page.scans[0].scanId, id(expectedFirst));
    assert.ok(page.scans.every(s => !('report' in s) && !('feedback' in s) && !s.url.includes('?')));
  };
  const sites = page => { assert.equal(page.total, totalSites); assert.equal(page.sites.length, Math.min(20, totalSites)); assert.equal(page.overview.latestHigh, expectedLatest.highCount * totalSites); assert.equal(page.overview.averageScore, expectedLatest.score); assert.equal(page.sites[0].scanCount, count / totalSites); };
  const comparisons = page => { assert.equal(page.total, comparisonTotal); assert.equal(page.scans.length, Math.min(20, comparisonTotal)); assert.ok(page.scans.every(s => s.scanId !== id(1) && s.url === fixture(1, layout).report.observation.url)); };
  return { scans, sites, comparisons };
}

const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
  await db.query('insert into auth.users values ($1), ($2)', [owner, other]);
  for (const migration of ['001_initial.sql', '002_pagination.sql', '003_comparison.sql']) await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'));
  const asOwner = async value => { await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [value]); };
  const query = async (sql, args = []) => (await db.query(sql, args)).rows[0].result;
  for (const count of [1000, 10000]) for (const layout of ['many-sites', 'single-page']) {
    await db.exec('reset role; truncate public.sites cascade;');
    await db.exec('drop index if exists public.scans_owner_url_hash_page');
    await db.exec('alter table public.scans drop column if exists page_url_hash');
    await db.exec(await readFile('supabase/migrations/003_comparison.sql', 'utf8'));
    await asOwner(owner);
    for (let start = 1; start <= count; start += 250) {
      const batch = Array.from({ length: Math.min(250, count - start + 1) }, (_, i) => fixture(start + i, layout));
      await db.query("select public.ingest_scan(item->'report', item->>'hash') from jsonb_array_elements($1::jsonb) item", [JSON.stringify(batch)]);
    }
    await asOwner(other);
    const foreign = fixture(99999, layout);
    await db.query('select public.ingest_scan($1::jsonb, $2)', [JSON.stringify(foreign.report), foreign.hash]);
    await db.exec('reset role; analyze public.scans; analyze public.sites;');
    await asOwner(owner);
    const verify = checks(count, layout);
    await measure('pglite', count, layout, 'history-first', () => query('select public.list_scan_page(1,20) result'), verify.scans(count));
    await measure('pglite', count, layout, 'history-last', () => query('select public.list_scan_page($1,20) result', [count / 20]), verify.scans(20));
    await measure('pglite', count, layout, 'site-aggregates', () => query('select public.list_site_page(1,20) result'), verify.sites);
    await measure('pglite', count, layout, 'comparisons', () => query('select public.list_comparison_page($1::uuid,1,20) result', [id(1)]), verify.comparisons);
    await db.exec('reset role');
    await db.exec(await readFile('supabase/migrations/004_comparison_index.sql', 'utf8'));
    await db.exec('analyze public.scans');
    await asOwner(owner);
    await measure('pglite-indexed', count, layout, 'comparisons', () => query('select public.list_comparison_page($1::uuid,1,20) result', [id(1)]), verify.comparisons);
    // EXPLAIN the inner ordered lookup because PL/pgSQL's outer plan hides it.
    const plan = await db.query("explain (format json) select scan_id from public.scans where owner_id = (select auth.uid()) and scan_id <> $1::uuid and page_url_hash = md5($2) and report->'observation'->>'url' = $2 order by scanned_at desc, scan_id desc limit 20", [id(1), fixture(1, layout).report.observation.url]);
    queryPlans.push({ count, layout, plan: plan.rows });
    await asOwner(other);
    assert.equal((await query('select public.list_scan_page(1,20) result')).total, 1);
    assert.equal(await query('select public.list_comparison_page($1::uuid,1,20) result', [id(1)]), null);
    await db.exec('set role anon');
    await assert.rejects(query('select public.list_scan_page(1,20) result'), /permission denied/);
  }
} finally { await db.close(); }

const fileSizes = [];
for (const count of [100, 1000]) {
  const layout = 'many-sites', file = resolve(`.local/storage-benchmark-${randomUUID()}.json`);
  try {
    const rows = Array.from({ length: count }, (_, n) => fixture(n + 1, layout));
    await writeFile(file, JSON.stringify({ version: 1, owners: { [owner]: rows, [other]: [fixture(99999, layout)] } }));
    fileSizes.push({ scans: count, bytes: (await stat(file)).size });
    const store = new FileStore(file), verify = checks(count, layout);
    await measure('file', count, layout, 'history-first', () => store.listPage(identity, { page: 1, limit: 20 }), verify.scans(count));
    await measure('file', count, layout, 'history-last', () => store.listPage(identity, { page: count / 20, limit: 20 }), verify.scans(20));
    await measure('file', count, layout, 'site-aggregates', () => store.sitesPage(identity, { page: 1, limit: 20 }), verify.sites);
    await measure('file', count, layout, 'comparisons', () => store.comparisonPage(identity, id(1), { page: 1, limit: 20 }), verify.comparisons);
    await measure('file', count, layout, 'review-write', () => store.feedback(identity, id(1), rows[0].report.findings[0].id, { verdict: 'open', notes: 'Synthetic benchmark review.' }), value => assert.equal(value.notes, 'Synthetic benchmark review.'));
    assert.equal((await store.listPage({ ownerId: other, token: '' }, { page: 1, limit: 20 })).total, 1);
    assert.equal((await store.get(identity, id(1))).hash, rows[0].hash);
    if (count === 1000) await assert.rejects(store.put(identity, fixture(1001, layout).report), /1000 scans/);
  } finally {
    // Only this run's exact temporary files; never touch configured application storage.
    await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await unlink(file + '.tmp').catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
const output = { measuredAt: new Date().toISOString(), environment: { os: platform(), release: release(), node: process.version, cpu: cpus()[0]?.model }, repeats,
  methodology: 'Warm sequential reads of synthetic reports. PGlite is in-memory WASM PostgreSQL with real migrations/RLS and an Auth shim; not hosted Supabase, network, production disk or concurrency. Data ingested through the real RPC before timing. Comparisons are measured before and after migration 004 against each unchanged dataset. FileStore reads/writes an isolated temporary file seeded outside timing; reads include JSON parse/sort/clone, writes include serialized whole-file rewrite/rename. OS caches are warm; no fsync durability or production capacity claim. Result assertions run outside timed regions.', fileSizes, queryPlans, results };
await writeFile('test-results/storage-benchmark/results.json', JSON.stringify(output, null, 2));
const lines = ['# VYNLT storage benchmark', '', output.methodology, '', '| Engine | Scans | Layout | Operation | Min ms | Median ms | Max ms |', '|---|---:|---|---|---:|---:|---:|'];
for (const r of results) lines.push(`| ${r.engine} | ${r.scans} | ${r.layout} | ${r.operation} | ${r.minMs} | ${r.medianMs} | ${r.maxMs} |`);
await writeFile('test-results/storage-benchmark/summary.md', lines.join('\n') + '\n');
console.log('PASS storage benchmarks: query totals/order/coverage summaries, owner isolation, anonymous denial, file review integrity and local capacity checks.');

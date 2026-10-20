import { expect, it, vi } from 'vitest';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { parseSubmission } from '../packages/core/validation';
import { assertReportSize, reportByteLimit, reportStorageBytes, ReportSizeError } from '../packages/core/report-size';
import { createApp } from '../apps/server/app';
import { FileStore, SupabaseStore, reportHash } from '../apps/server/store';

const identity = { ownerId: '10000000-0000-4000-8000-000000000001', token: 'test' };
const submission = (large = false) => ({ scanId: '00000000-0000-4000-8000-000000000001', observation: {
  url: 'https://example.test/page', scannedAt: '2026-10-20T00:00:00Z', headers: {}, resources: [], domCollected: true,
  scripts: large ? Array.from({ length: 150 }, (_, i) => ({ url: `https://cdn.example.test/${i}/${'a'.repeat(2400)}.js`, integrity: false })) : []
} });

it('matches real PostgreSQL jsonb byte sizes, including Unicode, punctuation and omitted optional properties', async () => {
  const db = new PGlite();
  try {
    const report = parseSubmission(submission());
    report.observation.cookies = undefined;
    report.findings[0].evidence = { 'unicode café': '😀 café 日本語, : \\ "\n\t\r\b\f', boolean: false };
    const actual = async () => (await db.query<{ bytes: number }>('select octet_length($1::jsonb::text) bytes', [JSON.stringify(report)])).rows[0].bytes;
    expect(reportStorageBytes(report)).toBe(await actual());
    report.findings = [];
    expect(reportStorageBytes(report)).toBe(await actual());
  } finally { await db.close(); }
}, 30000);

it('accepts exactly 512 KiB and rejects one byte over, consistently with the existing ingestion RPC', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select '${identity.ownerId}'::uuid$$;
      grant usage on schema auth, public to authenticated; grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('${identity.ownerId}');`);
    await db.exec(await readFile('supabase/migrations/001_initial.sql', 'utf8'));
    await db.exec('set role authenticated');
    const report = parseSubmission(submission()); report.findings[0].evidence = { padding: '' };
    report.findings[0].evidence.padding = 'a'.repeat(reportByteLimit - reportStorageBytes(report));
    expect(reportStorageBytes(report)).toBe(reportByteLimit);
    expect(() => assertReportSize(report)).not.toThrow();
    await db.query('select public.ingest_scan($1::jsonb,$2)', [JSON.stringify(report), reportHash(report)]);
    report.findings[0].evidence.padding += 'b';
    expect(() => assertReportSize(report)).toThrow(ReportSizeError);
    await expect(db.query('select public.ingest_scan($1::jsonb,$2)', [JSON.stringify(report), reportHash(report)])).rejects.toThrow('Invalid report');
    expect((await db.query<{ count: number }>('select count(*)::int count from public.scans')).rows[0].count).toBe(1);
  } finally { await db.close(); }
}, 30000);

it('rejects a small submission whose derived report is too large before storage, and continues accepting valid scans', async () => {
  const input = submission(true);
  expect(new TextEncoder().encode(JSON.stringify(input)).length).toBeLessThan(reportByteLimit);
  const store = new FileStore(), put = vi.spyOn(store, 'put');
  const app = createApp({ store, auth: { authenticate: async () => identity } });
  const response = await request(app).post('/api/scans').auth('test', { type: 'bearer' }).send(input);
  expect(response.status).toBe(413); expect(response.body).toMatchObject({ code: 'REPORT_TOO_LARGE', limitBytes: reportByteLimit });
  expect(response.body.reportBytes).toBeGreaterThan(reportByteLimit); expect(put).not.toHaveBeenCalled();
  expect((await store.listPage(identity, { page: 1, limit: 20 })).total).toBe(0);
  expect((await request(app).post('/api/scans').auth('test', { type: 'bearer' }).send(submission())).status).toBe(201);
  const raw = await request(app).post('/api/scans').auth('test', { type: 'bearer' }).send({ data: 'x'.repeat(530000) });
  expect(raw.status).toBe(413); expect(raw.body.code).toBe('SUBMISSION_TOO_LARGE');
});

it('protects direct storage calls and maps upstream ingestion 413 without retryable database errors', async () => {
  const report = parseSubmission(submission(true)), fetchMock = vi.fn();
  const store = new SupabaseStore('https://project.supabase.co', 'key');
  vi.stubGlobal('fetch', fetchMock);
  try {
    expect(() => new FileStore().put(identity, report)).toThrow(ReportSizeError);
    await expect(store.put(identity, report)).rejects.toThrow(ReportSizeError);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response('<p>Too large</p>', { status: 413 }));
    await expect(store.put(identity, parseSubmission(submission()))).rejects.toThrow(ReportSizeError);
    expect(fetchMock).toHaveBeenCalledOnce();
  } finally { vi.unstubAllGlobals(); }
});

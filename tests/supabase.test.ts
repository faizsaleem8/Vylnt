import { afterEach, expect, it, vi } from 'vitest';
import { MigrationRequiredError, SupabaseStore } from '../apps/server/store';
import { supabaseAuth } from '../apps/server/auth';
import { parseSubmission } from '../packages/core/validation';
const identity = { ownerId: '00000000-0000-4000-8000-000000000001', token: 'user-jwt' };
afterEach(() => vi.unstubAllGlobals());
it('forwards comparison paging without an owner parameter and reports missing migration 003', async () => {
  const result = { scans: [], total: 0, page: 2, limit: 10 };
  const mock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(result))).mockResolvedValueOnce(new Response('null'))
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'PGRST202' }), { status: 404 }));
  vi.stubGlobal('fetch', mock);
  const store = new SupabaseStore('https://project.supabase.co', 'anon-key');
  expect(await store.comparisonPage(identity, identity.ownerId, { page: 2, limit: 10 })).toEqual(result);
  expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual({ p_scan_id: identity.ownerId, p_page: 2, p_limit: 10 });
  expect(mock.mock.calls[0][1].headers.Authorization).toBe('Bearer user-jwt');
  expect(await store.comparisonPage(identity, identity.ownerId, { page: 1, limit: 10 })).toBeUndefined();
  await expect(store.comparisonPage(identity, identity.ownerId, { page: 1, limit: 10 })).rejects.toThrow('003_comparison.sql');
});
it('delegates bounded pages to user-scoped RPCs without downloading full reports', async () => {
  const result = { scans: [], total: 1205, page: 42, limit: 30 };
  const sites = { sites: [], total: 1103, page: 37, limit: 30, overview: { latestHigh: 7, averageScore: 85 } };
  const mock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(result))).mockResolvedValueOnce(new Response(JSON.stringify(sites)));
  vi.stubGlobal('fetch', mock);
  const store = new SupabaseStore('https://project.supabase.co', 'anon-key');
  expect(await store.listPage(identity, { page: 42, limit: 30 })).toEqual(result);
  expect(await store.sitesPage(identity, { page: 37, limit: 30 })).toEqual(sites);
  expect(mock.mock.calls[0][0]).toBe('https://project.supabase.co/rest/v1/rpc/list_scan_page');
  expect(mock.mock.calls[1][0]).toBe('https://project.supabase.co/rest/v1/rpc/list_site_page');
  for (const [i, call] of mock.mock.calls.entries()) {
    expect(call[1].method).toBe('POST');
    expect(call[1].headers.Authorization).toBe('Bearer user-jwt');
    expect(JSON.parse(call[1].body)).toEqual({ p_page: i ? 37 : 42, p_limit: 30 });
  }
});
it('identifies missing pagination RPC migrations without mislabeling other failures', async () => {
  const mock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ code: 'PGRST202' }), { status: 404 }))
    .mockResolvedValueOnce(new Response('{}', { status: 404 }));
  vi.stubGlobal('fetch', mock);
  const store = new SupabaseStore('https://project.supabase.co', 'anon-key');
  await expect(store.listPage(identity, { page: 1, limit: 30 })).rejects.toThrow(MigrationRequiredError);
  await expect(store.sitesPage(identity, { page: 1, limit: 30 })).rejects.toThrow('Database request failed (404)');
});
it('forwards the user JWT and handles PostgREST minimal empty insert responses', async () => {
  const report = parseSubmission({ scanId: identity.ownerId, observation: { url: 'https://example.test/', scannedAt: '2026-10-15T00:00:00Z', headers: {}, resources: [], scripts: [], domCollected: true } });
  const mock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([{ report, report_hash: 'a'.repeat(64), received_at: 'now' }]), { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 201 }));
  vi.stubGlobal('fetch', mock);
  const result = await new SupabaseStore('https://project.supabase.co', 'anon-key').feedback(identity, report.scanId, report.findings[0].id, { verdict: 'fixed', notes: '' });
  expect(result?.verdict).toBe('fixed');
  for (const call of mock.mock.calls) expect(call[1].headers.Authorization).toBe('Bearer user-jwt');
  expect(mock.mock.calls[1][1].headers.Prefer).toContain('return=minimal');
});
it('verifies JWTs with Supabase Auth rather than decoding untrusted claims', async () => {
  const mock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: identity.ownerId }), { status: 200 }))
    .mockResolvedValueOnce(new Response('{}', { status: 401 }));
  vi.stubGlobal('fetch', mock);
  const auth = supabaseAuth('https://project.supabase.co', 'anon-key');
  expect(await auth.authenticate(identity.token)).toEqual(identity);
  expect(await auth.authenticate('forged')).toBeUndefined();
  expect(mock.mock.calls[0][0]).toBe('https://project.supabase.co/auth/v1/user');
});

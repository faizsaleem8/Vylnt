import { afterEach, expect, it, vi } from 'vitest';
import { SupabaseStore } from '../apps/server/store';
import { supabaseAuth } from '../apps/server/auth';
import { parseSubmission } from '../packages/core/validation';
const identity = { ownerId: '00000000-0000-4000-8000-000000000001', token: 'user-jwt' };
afterEach(() => vi.unstubAllGlobals());
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

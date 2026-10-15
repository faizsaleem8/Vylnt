import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { readSupabaseConfig } from '../apps/server/config';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { localAuth } from '../apps/server/auth';

describe('public Supabase configuration', () => {
  const url = 'https://project.supabase.co';
  const key = 'sb_publishable_test_configuration_only';
  it('accepts project-native and Next.js-style public configuration names', () => {
    expect(readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key })).toEqual({ url, publishableKey: key });
    expect(readSupabaseConfig({ SUPABASE_URL: `${url}/`, SUPABASE_PUBLISHABLE_KEY: key })).toEqual({ url, publishableKey: key });
  });
  it('fails closed for secret/service-role keys and unsafe project URLs', () => {
    const legacy = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.test`;
    for (const unsafeKey of ['sb_secret_do_not_expose', legacy('service_role'), '', 'not-a-public-key']) expect(() => readSupabaseConfig({ SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: unsafeKey })).toThrow();
    expect(readSupabaseConfig({ SUPABASE_URL: url, SUPABASE_ANON_KEY: legacy('anon') }).publishableKey).toBe(legacy('anon'));
    for (const unsafeUrl of ['http://project.supabase.co', `${url}/path`, 'https://user:password@project.supabase.co', `${url}?secret=x`]) expect(() => readSupabaseConfig({ SUPABASE_URL: unsafeUrl, SUPABASE_PUBLISHABLE_KEY: key })).toThrow();
  });
  it('returns only public configuration and scopes CSP to the configured project', async () => {
    const server = createApp({ mode: 'supabase', store: new FileStore(), auth: localAuth('x'.repeat(40)), supabase: { url, publishableKey: key } });
    const response = await request(server).get('/api/config');
    expect(response.status).toBe(200); expect(response.body).toEqual({ mode: 'supabase', supabase: { url, publishableKey: key } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['content-security-policy']).toContain(`connect-src 'self' ${url}`);
    expect(JSON.stringify(response.body)).not.toContain('x'.repeat(40));
  });
  it('keeps local token mode functional without exposing any token', async () => {
    const server = createApp({ store: new FileStore(), auth: localAuth('x'.repeat(40)) });
    expect((await request(server).get('/api/config')).body).toEqual({ mode: 'local' });
  });
});
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ mock: true })) }));
it('creates browser clients with persistence and URL-token detection disabled', async () => {
  const { createMemoryClient } = await import('../packages/auth/client');
  const { createClient } = await import('@supabase/supabase-js');
  createMemoryClient({ url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test' });
  expect(createClient).toHaveBeenCalledWith('https://project.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false }
  });
});

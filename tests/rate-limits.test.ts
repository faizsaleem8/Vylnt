import { afterEach, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { defaultRateLimits, readRateLimits } from '../apps/server/rate-limits';

const identity = { ownerId: 'owner-a', token: 'valid-token' };
const origins = ['http://127.0.0.1:4318'];
afterEach(() => vi.useRealTimers());

it('blocks repeated unauthenticated requests before another Auth service call and ignores forged forwarding headers', async () => {
  const authenticate = vi.fn().mockResolvedValue(undefined);
  const app = createApp({ store: new FileStore(), auth: { authenticate }, origins,
    rateLimits: { ...defaultRateLimits, ipMax: 2 } });
  for (let i = 0; i < 2; i++) expect((await request(app).get('/api/scans').set('Authorization', 'Bearer invalid-' + i)).status).toBe(401);
  const blocked = await request(app).get('/api/scans').set('Authorization', 'Bearer different-token')
    .set('X-Forwarded-For', '203.0.113.8').set('Forwarded', 'for=203.0.113.9').set('Origin', origins[0]);
  expect(blocked.status).toBe(429); expect(authenticate).toHaveBeenCalledTimes(2);
  expect(blocked.body.code).toBe('RATE_LIMITED');
  expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  expect(blocked.headers['access-control-expose-headers']).toContain('Retry-After');
  expect(blocked.headers['access-control-allow-origin']).toBe(origins[0]);
  expect(blocked.headers['cache-control']).toBe('no-store');
  expect(blocked.headers.ratelimit).toContain('client-requests');
  expect(JSON.stringify(blocked.body)).not.toMatch(/invalid-|different-token|203\.0\.113/);
});

it('shares a verified owner budget across refreshed tokens while another owner has its own allowance', async () => {
  const auth = { authenticate: async (token: string) => ({ ownerId: token.startsWith('a-') ? 'owner-a' : 'owner-b', token }) };
  const app = createApp({ store: new FileStore(), auth, rateLimits: { ...defaultRateLimits, userMax: 1 } });
  expect((await request(app).get('/api/scans').set('Authorization', 'Bearer a-first')).status).toBe(200);
  const blocked = await request(app).get('/api/sites').set('Authorization', 'Bearer a-refreshed');
  expect(blocked.status).toBe(429); expect(blocked.headers.ratelimit).toContain('workspace-requests');
  expect((await request(app).get('/api/sites').set('Authorization', 'Bearer b-first')).status).toBe(200);
});

it('throttles writes before body parsing or storage while reads stay available', async () => {
  const store = new FileStore(); const put = vi.spyOn(store, 'put');
  const app = createApp({ store, auth: { authenticate: async () => identity }, rateLimits: { ...defaultRateLimits, writeMax: 1 } });
  const auth = { Authorization: 'Bearer valid-token' };
  // Rejected payloads still consume a write attempt; changing endpoints cannot bypass it.
  expect((await request(app).post('/api/scans').set(auth).send({})).status).toBe(400);
  const blocked = await request(app).post('/api/scans').set(auth).set('Content-Type', 'application/json').send('{');
  expect(blocked.status).toBe(429); expect(blocked.headers.ratelimit).toContain('workspace-writes');
  expect((await request(app).delete('/api/scans/00000000-0000-4000-8000-000000000001').set(auth)).status).toBe(429);
  expect((await request(app).get('/api/scans').set(auth)).status).toBe(200);
  expect(put).not.toHaveBeenCalled();
});

it('recovers at the advertised reset boundary and does not extend a window on blocked requests', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-16T00:00:00Z'));
  const app = createApp({ store: new FileStore(), auth: { authenticate: async () => identity },
    rateLimits: { ...defaultRateLimits, windowMs: 10000, ipMax: 1 } });
  expect((await request(app).get('/api/config')).status).toBe(200);
  let blocked = await request(app).get('/api/config');
  expect(blocked.status).toBe(429); expect(blocked.headers['retry-after']).toBe('10');
  vi.setSystemTime(new Date('2026-10-16T00:00:09Z'));
  blocked = await request(app).get('/api/config'); expect(blocked.headers['retry-after']).toBe('1');
  vi.setSystemTime(new Date('2026-10-16T00:00:10Z'));
  expect((await request(app).get('/api/config')).status).toBe(200);
});

it('allows CORS preflight without spending the request allowance and limits public config/health too', async () => {
  const app = createApp({ store: new FileStore(), auth: { authenticate: async () => undefined }, origins,
    rateLimits: { ...defaultRateLimits, ipMax: 1 } });
  expect((await request(app).options('/api/scans').set('Origin', origins[0])).status).toBe(204);
  expect((await request(app).get('/api/config')).status).toBe(200);
  expect((await request(app).get('/api/health')).status).toBe(429);
  // Static/dashboard requests do not spend API budgets.
  expect((await request(app).get('/')).status).toBe(404);
});

it('rejects invalid configuration instead of silently disabling limits', () => {
  expect(readRateLimits({})).toEqual(defaultRateLimits);
  expect(readRateLimits({ VYNLT_RATE_IP_MAX: '42', VYNLT_RATE_WINDOW_MS: '30000' })).toMatchObject({ ipMax: 42, windowMs: 30000 });
  for (const value of ['0', '-1', '', '1.5', 'NaN', 'Infinity', '60000ms', '100001']) {
    expect(() => readRateLimits({ VYNLT_RATE_IP_MAX: value })).toThrow('VYNLT_RATE_IP_MAX');
  }
  expect(() => readRateLimits({ VYNLT_RATE_WINDOW_MS: '3600001' })).toThrow('VYNLT_RATE_WINDOW_MS');
});

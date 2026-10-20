import { expect, it, vi } from 'vitest';
import request from 'supertest';
import { MemoryStore } from 'express-rate-limit';
import { readDeploymentConfig } from '../apps/server/config';
import { openRateBackend, readRateBackendConfig, RateBackendUnavailable } from '../apps/server/shared-rate-limits';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { defaultRateLimits } from '../apps/server/rate-limits';

it('requires explicit production origins/storage/shared limits and validates trusted networks', () => {
  expect(readDeploymentConfig({}, 4318).trustedProxies).toEqual([]);
  expect(readDeploymentConfig({ VYNLT_TRUSTED_PROXIES: '127.0.0.1,::1,10.0.0.0/24' }, 4318).trustedProxies).toHaveLength(3);
  for (const value of ['true', '*', '0.0.0.0/0', '::/0', '10.0.0.0/99', '10.0.0.1/', '10.0.0.1/24/4', '']) {
    if (value) expect(() => readDeploymentConfig({ VYNLT_TRUSTED_PROXIES: value }, 4318)).toThrow('VYNLT_TRUSTED_PROXIES');
  }
  const production = { NODE_ENV: 'production', VYNLT_STORAGE: 'supabase', VYNLT_ALLOWED_ORIGINS: 'https://vynlt.example.test' };
  expect(readDeploymentConfig(production, 4318).origins).toEqual(['https://vynlt.example.test']);
  for (const origins of ['*', 'http://vynlt.example.test', 'https://user:secret@example.test', 'https://example.test/path', '']) expect(() => readDeploymentConfig({ ...production, VYNLT_ALLOWED_ORIGINS: origins }, 4318)).toThrow();
  expect(() => readDeploymentConfig({ NODE_ENV: 'production' }, 4318)).toThrow();
  expect(readRateBackendConfig({})).toEqual({ mode: 'memory' });
  expect(() => readRateBackendConfig({ NODE_ENV: 'production' })).toThrow('redis');
  const redis = { VYNLT_RATE_STORE: 'redis', VYNLT_REDIS_URL: 'redis://localhost:6379', VYNLT_RATE_KEY_SECRET: 's'.repeat(64) };
  expect(readRateBackendConfig(redis).mode).toBe('redis');
  for (const change of [{ VYNLT_RATE_STORE: 'unknown' }, { VYNLT_REDIS_URL: 'https://invalid.test' }, { VYNLT_REDIS_URL: 'redis://localhost/?secret=raw' }, { VYNLT_RATE_KEY_SECRET: 'short' }, { VYNLT_RATE_NAMESPACE: 'unsafe:namespace' }]) expect(() => readRateBackendConfig({ ...redis, ...change })).toThrow();
});

it('trusts forwarding only from explicitly configured peers and stops at an untrusted hop', async () => {
  const auth = { authenticate: async () => ({ ownerId: 'a', token: 'a' }) };
  const make = (proxies: string[]) => createApp({ auth, store: new FileStore(), trustedProxies: proxies, rateLimits: { ...defaultRateLimits, ipMax: 1 } });
  const trusted = make(['127.0.0.1', '::1']);
  expect((await request(trusted).get('/api/config').set('X-Forwarded-For', '203.0.113.10')).status).toBe(200);
  expect((await request(trusted).get('/api/config').set('X-Forwarded-For', '203.0.113.11')).status).toBe(200);
  expect((await request(trusted).get('/api/config').set('X-Forwarded-For', '203.0.113.10')).status).toBe(429);
  const chain = make(['127.0.0.1', '::1']);
  expect((await request(chain).get('/api/config').set('X-Forwarded-For', '198.51.100.1, 203.0.113.20')).status).toBe(200);
  expect((await request(chain).get('/api/config').set('X-Forwarded-For', '198.51.100.2, 203.0.113.20')).status).toBe(429);
  const untrusted = make(['10.0.0.1']);
  expect((await request(untrusted).get('/api/config').set('X-Forwarded-For', '203.0.113.10')).status).toBe(200);
  expect((await request(untrusted).get('/api/config').set('X-Forwarded-For', '203.0.113.11')).status).toBe(429);
});

it('does not authenticate or write when shared protection fails, and recovers when the store returns', async () => {
  const authenticate = vi.fn().mockResolvedValue({ ownerId: 'a', token: 'a' });
  const client = new MemoryStore(); const original = client.increment.bind(client);
  let unavailable = true;
  client.increment = async key => { if (unavailable) throw new RateBackendUnavailable(); return original(key); };
  const store = new FileStore(), put = vi.spyOn(store, 'put');
  const app = createApp({ auth: { authenticate }, store, rateBackend: { store: bucket => bucket === 'client' ? client : new MemoryStore() } });
  const failure = await request(app).post('/api/scans').auth('valid', { type: 'bearer' }).send({});
  expect(failure.status).toBe(503); expect(failure.body.code).toBe('RATE_LIMIT_UNAVAILABLE'); expect(failure.headers['retry-after']).toBe('5');
  expect(authenticate).not.toHaveBeenCalled(); expect(put).not.toHaveBeenCalled();
  unavailable = false;
  expect((await request(app).get('/api/scans').auth('valid', { type: 'bearer' })).status).toBe(200);
});

it('keeps memory backend startup backward compatible', async () => {
  const backend = await openRateBackend({ mode: 'memory' }, 60000);
  expect(backend.backend).toEqual({}); backend.close();
});

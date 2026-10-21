import { expect, it } from 'vitest';
import request from 'supertest';
import { createServer, type Server } from 'node:http';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { createAcceptanceApp } from '../apps/acceptance/server';
import { verifyHostedApi } from '../packages/acceptance/hosted';

const identity = (token: string) => ({ ownerId: token === 'A' ? '00000000-0000-4000-8000-000000000001' : '00000000-0000-4000-8000-000000000002', token });
const auth = { authenticate: async (token: string) => ['A', 'B'].includes(token) ? identity(token) : undefined };
const origin = 'http://127.0.0.1:4321', config = { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_test_only_key' };
const blank = { checks: [], skipped: [], cleanupFailures: [] };
it('protects the private helper against cross-origin/rebinding and rejects the same owner in both slots', async () => {
  let runs = 0;
  const { app } = createAcceptanceApp({ origin, config, auth, run: async () => { runs++; return blank; } });
  expect((await request(app).get('/acceptance/config').set('Host', 'evil.example')).status).toBe(403);
  expect((await request(app).post('/acceptance/session').set('Host', '127.0.0.1:4321').set('Origin', 'https://evil.example').send({ slot: 'A', token: 'A' })).status).toBe(403);
  const post = (path: string, value = {}) => request(app).post('/acceptance/' + path).set('Host', '127.0.0.1:4321').set('Origin', origin).send(value);
  expect((await post('run')).status).toBe(401);
  expect((await post('session', { slot: 'A', token: 'forged' })).status).toBe(401);
  expect((await post('session', { slot: 'A', token: 'A' })).status).toBe(200);
  expect((await post('session', { slot: 'B', token: 'A' })).status).toBe(400);
  expect((await post('session', { slot: 'B', token: 'B' })).status).toBe(200);
  expect((await post('run')).status).toBe(200); expect(runs).toBe(1);
  expect((await post('run')).status).toBe(401); // Tokens are discarded after a run.
});
it('exercises real API paths for both owners and cleans up only generated scans', async () => {
  const origins: string[] = [];
  const store = new FileStore(), app = createApp({ store, auth, origins }); const server = createServer(app);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  try {
    const address = server.address() as { port: number };
    origins.push(`http://127.0.0.1:${address.port}`);
    const result = await verifyHostedApi({ origin: `http://127.0.0.1:${address.port}`, tokenA: 'A', tokenB: 'B' });
    expect(result.failure).toBeUndefined(); expect(result.cleanupFailures).toEqual([]);
    expect(result.skipped).toEqual(['Migration 004 column probe not configured']);
    expect(result.checks.some(check => check.name.startsWith('Second-user'))).toBe(true);
    expect((await store.listPage(identity('A'), { page: 1, limit: 10 })).total).toBe(0);
    expect((await store.listPage(identity('B'), { page: 1, limit: 10 })).total).toBe(0);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});
it('reports missing migration probes as failures and still removes generated scan rows', async () => {
  const origins: string[] = [];
  const store = new FileStore(), server: Server = createServer(createApp({ store, auth, origins }));
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  try {
    origins.push(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
    const result = await verifyHostedApi({ origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`, tokenA: 'A', probeMigration004: async () => { throw new Error('test migration unavailable'); } });
    expect(result.failure).toMatch(/Migration 004/); expect(result.cleanupFailures).toEqual([]);
    expect((await store.listPage(identity('A'), { page: 1, limit: 10 })).total).toBe(0);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});
it('verifies frozen insights through normal API paths and confirms cascading cleanup', async () => {
  const origins: string[] = [], phases: string[] = [];
  const store = new FileStore(), server = createServer(createApp({ store, auth, origins, renderPdf: async () => Buffer.from('%PDF-fixture') }));
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  try {
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`; origins.push(origin);
    const result = await verifyHostedApi({ origin, tokenA: 'A', tokenB: 'B', insights: true,
      probeInsightStorage: async (phase, frozen) => { phases.push(phase); expect(Boolean(await store.getInsight(identity('A'), frozen.id))).toBe(phase === 'saved'); } });
    expect(result.failure).toBeUndefined(); expect(result.cleanupFailures).toEqual([]); expect(phases).toEqual(['saved', 'deleted']);
    expect(result.checks.filter(c => c.name.startsWith('ML-7'))).toHaveLength(5);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});

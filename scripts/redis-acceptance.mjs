import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

if (!(process.env.VYLNT_REDIS_URL ?? process.env.VYNLT_REDIS_URL)) throw new Error('Set VYLNT_REDIS_URL privately in .env before running this real-service check. No Redis service is installed by this command.');
await mkdir('.local', { recursive: true });
const entry = resolve('.local/redis-acceptance-module.mjs');
await build({ stdin: { contents: "export { createApp } from './apps/server/app'; export { FileStore } from './apps/server/store'; export { readRateBackendConfig, openRateBackend } from './apps/server/shared-rate-limits';", resolveDir: process.cwd() }, bundle: true, outfile: entry, platform: 'node', format: 'esm', packages: 'external' });
const { createApp, FileStore, readRateBackendConfig, openRateBackend } = await import(pathToFileURL(entry).href);
const windowMs = 10000, results = [];
const config = readRateBackendConfig({ ...process.env, VYLNT_RATE_STORE: 'redis', VYLNT_RATE_NAMESPACE: `vylnt-check-${randomUUID()}`, VYLNT_RATE_KEY_SECRET: randomBytes(32).toString('hex') });
async function scenario(name, limits, work) {
  const backends = [], servers = [], urls = [];
  try {
    for (let i = 0; i < 2; i++) {
      const backend = await openRateBackend({ ...config, namespace: config.namespace + '-' + results.length }, windowMs); backends.push(backend);
      const server = createServer(createApp({ store: new FileStore(), auth: { authenticate: async token => ({ ownerId: token, token }) }, rateLimits: { windowMs, ipMax: 100, userMax: 100, writeMax: 100, ...limits }, rateBackend: backend.backend }));
      servers.push(server); await new Promise((r, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', r); });
      urls.push(`http://127.0.0.1:${server.address().port}`);
    }
    const call = async (replica, path = '/config', token = 'synthetic-owner-a', method = 'GET') => fetch(urls[replica] + '/api' + path, { method, signal: AbortSignal.timeout(5000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}) });
    await work(call, backends); results.push({ name, passed: true }); console.log(`PASS ${name}`);
  } finally {
    for (const server of servers) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
    backends.forEach(backend => backend.close());
  }
}
try {
  await scenario('shared client counter, Retry-After and expiry across independent app connections', { ipMax: 2 }, async call => {
    assert.equal((await call(0)).status, 200); assert.equal((await call(1)).status, 200);
    const blocked = await call(0); assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
    await new Promise(r => setTimeout(r, 11000)); assert.equal((await call(1)).status, 200);
  });
  await scenario('shared owner counter and independent owner isolation', { userMax: 2 }, async call => {
    assert.equal((await call(0, '/scans')).status, 200); assert.equal((await call(1, '/scans')).status, 200);
    assert.equal((await call(0, '/scans')).status, 429); assert.equal((await call(1, '/scans', 'synthetic-owner-b')).status, 200);
  });
  await scenario('shared write counter does not consume read budget', { writeMax: 1 }, async call => {
    assert.equal((await call(0, '/scans', 'synthetic-owner-a', 'POST')).status, 400);
    assert.equal((await call(1, '/scans')).status, 200);
    assert.equal((await call(1, '/scans', 'synthetic-owner-a', 'POST')).status, 429);
    assert.equal((await call(1, '/scans', 'synthetic-owner-b', 'POST')).status, 400);
  });
  await scenario('disconnected shared backend fails closed with sanitized 503', {}, async (call, backends) => {
    assert.equal((await call(0)).status, 200); backends[0].close();
    const response = await call(0); assert.equal(response.status, 503); assert.equal((await response.json()).code, 'RATE_LIMIT_UNAVAILABLE');
    assert.equal((await call(1)).status, 200);
  });
} catch (error) { console.error(error instanceof Error ? error.message : 'Redis acceptance failed'); process.exitCode = 1; }
await mkdir('test-results/redis-acceptance', { recursive: true });
await writeFile('test-results/redis-acceptance/results.json', JSON.stringify({ measuredAt: new Date().toISOString(), checks: results, complete: results.length === 4, limitations: ['Independent app/Redis connections in one test process, not a production deployment/load test.', 'No Redis server outage/failover, TLS-certificate, or multi-region latency certification.', 'Unique test keys expire automatically; no FLUSH, server stop or production-key deletion.'] }, null, 2));

import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/server/app';
import { FileStore, MigrationRequiredError, reportHash } from '../apps/server/store';
import { localAuth } from '../apps/server/auth';
import { canonicalJson } from '../packages/core/integrity';
import { parseSubmission } from '../packages/core/validation';

const token = 'test-token-'.repeat(5);
const observation = () => ({ url: 'https://user:password@example.test/path?secret=private#token', scannedAt: '2026-10-15T00:00:00Z', headers: {}, cookies: [], resources: [], scripts: [], domCollected: true });
const payload = () => ({ scanId: randomUUID(), observation: observation() });
const auth = { authenticate: async (value: string) => ['owner-a', 'owner-b'].includes(value) ? { ownerId: value, token: value } : undefined };
const app = () => createApp({ auth, store: new FileStore(), origins: ['http://127.0.0.1:4318'] });
const dirs: string[] = [];
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
describe('API contracts and ownership', () => {
  it('offers paginated same-page comparisons scoped to the selected owner', async () => {
    const store = new FileStore(), server = createApp({ auth, store }), identity = { ownerId: 'owner-a', token: 'a' };
    const inputs = Array.from({ length: 13 }, () => payload());
    for (const input of inputs) await store.put(identity, parseSubmission(input));
    await store.put(identity, parseSubmission({ ...payload(), observation: { ...observation(), url: 'https://example.test/other' } }));
    const path = `/api/scans/${inputs[0].scanId}/comparisons?page=2&limit=10`;
    const response = await request(server).get(path).set('Authorization', 'Bearer owner-a');
    expect(response.status).toBe(200); expect(response.body.total).toBe(12); expect(response.body.scans).toHaveLength(2);
    expect(response.body.scans.every((s: { url: string; scanId: string }) => s.url === 'https://example.test/path' && s.scanId !== inputs[0].scanId)).toBe(true);
    expect((await request(server).get(path).set('Authorization', 'Bearer owner-b')).status).toBe(404);
    expect((await request(server).get('/api/scans/not-a-uuid/comparisons').set('Authorization', 'Bearer owner-a')).status).toBe(400);
  });
  it('bounds both page endpoints and keeps site metrics global', async () => {
    const store = new FileStore(), server = createApp({ auth, store });
    const identity = { ownerId: 'owner-a', token: 'owner-a' };
    for (let n = 1; n <= 3; n++) await store.put(identity, parseSubmission({ ...payload(), observation: { ...observation(), url: `https://site-${n}.test/` } }));
    const get = (path: string) => request(server).get(path).set('Authorization', 'Bearer owner-a');
    const first = (await get('/api/sites?page=1&limit=1')).body, second = (await get('/api/sites?page=2&limit=1')).body;
    expect(first.total).toBe(3); expect(first.sites).toHaveLength(1);
    expect(second.sites[0].origin).not.toBe(first.sites[0].origin); expect(second.overview).toEqual(first.overview);
    expect((await get('/api/scans?page=2&limit=2')).body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect((await get('/api/scans?page=2&limit=2')).body.scans).toHaveLength(1);
    for (const path of ['scans', 'sites']) for (const query of ['page=0', 'limit=101', 'page=10001', 'limit=no', 'page=1.5']) expect((await get(`/api/${path}?${query}`)).status).toBe(400);
  });
  it('returns actionable missing-migration guidance', async () => {
    const store = new FileStore(); store.listPage = async () => { throw new MigrationRequiredError(); };
    const response = await request(createApp({ auth, store })).get('/api/scans').set('Authorization', 'Bearer owner-a');
    expect(response.status).toBe(503); expect(response.body.error).toContain('002_pagination.sql');
  });
  it('requires authentication and rejects unknown origins', async () => {
    const server = app();
    expect((await request(server).get('/api/scans')).status).toBe(401);
    expect((await request(server).get('/api/scans').set('Authorization', 'Bearer invalid')).status).toBe(401);
    expect((await request(server).get('/api/scans').set('Authorization', 'Bearer owner-a').set('Origin', 'https://untrusted.test')).status).toBe(403);
    expect((await request(server).get('/api/health')).body.status).toBe('ok');
  });
  it('uses constant-time local token authentication and fails closed for short configuration', async () => {
    expect(() => localAuth('short')).toThrow();
    expect(await localAuth(token).authenticate(token)).toHaveProperty('ownerId');
    expect(await localAuth(token).authenticate('wrong')).toBeUndefined();
  });
  it('sanitizes input, recalculates findings, and returns immutable idempotent reports', async () => {
    const server = app(), input = payload();
    const first = await request(server).post('/api/scans').set('Authorization', 'Bearer owner-a').send(input);
    expect(first.status).toBe(201); expect(first.body.report.score).toBe(85);
    expect(first.body.report.observation.url).toBe('https://example.test/path');
    expect(JSON.stringify(first.body)).not.toContain('private');
    expect((await request(server).post('/api/scans').set('Authorization', 'Bearer owner-a').send(input)).status).toBe(200);
    expect((await request(server).post('/api/scans').set('Authorization', 'Bearer owner-a').send({ ...input, observation: { ...input.observation, domCollected: false } })).status).toBe(409);
    expect((await request(server).get(`/api/scans/${input.scanId}`).set('Authorization', 'Bearer owner-a')).body).toEqual(first.body);
  });
  it('rejects forged results, cookie values, malformed and oversized requests', async () => {
    const server = app();
    for (const input of [{ ...payload(), score: 100 }, { ...payload(), ownerId: 'owner-b' }, { ...payload(), observation: { ...observation(), cookies: [{ name: 'session', value: 'do-not-store', secure: true, httpOnly: true, sameSite: 'strict', session: true }] } }, { ...payload(), observation: { ...observation(), url: 'file:///etc/passwd' } }]) {
      expect((await request(server).post('/api/scans').set('Authorization', 'Bearer owner-a').send(input)).status).toBe(400);
    }
    expect((await request(server).post('/api/scans').set('Authorization', 'Bearer owner-a').send({ garbage: 'x'.repeat(530000) })).status).toBe(413);
    expect((await request(server).get('/api/scans?page=-1').set('Authorization', 'Bearer owner-a')).status).toBe(400);
  });
  it('isolates read, feedback, export, verification and deletion by owner', async () => {
    const server = app(), input = payload();
    const saved = await request(server).post('/api/scans').set('Authorization', 'Bearer owner-a').send(input);
    for (const path of [`/api/scans/${input.scanId}`, `/api/reports/${input.scanId}`, `/api/reports/${input.scanId}/verify`]) {
      expect((await request(server).get(path).set('Authorization', 'Bearer owner-b')).status).toBe(404);
    }
    const feedbackPath = `/api/scans/${input.scanId}/findings/${encodeURIComponent(saved.body.report.findings[0].id)}/feedback`;
    expect((await request(server).post(feedbackPath).set('Authorization', 'Bearer owner-b').send({ verdict: 'fixed' })).status).toBe(404);
    expect((await request(server).delete(`/api/scans/${input.scanId}`).set('Authorization', 'Bearer owner-b')).status).toBe(404);
    expect((await request(server).get('/api/scans').set('Authorization', 'Bearer owner-b')).body.total).toBe(0);
  });
  it('stores review feedback separately, lists sites, exports and verifies', async () => {
    const server = app(), input = payload();
    const saved = await request(server).post('/api/scans').set('Authorization', 'Bearer owner-a').send(input);
    const path = `/api/scans/${input.scanId}/findings/${encodeURIComponent(saved.body.report.findings[0].id)}/feedback`;
    expect((await request(server).post(path).set('Authorization', 'Bearer owner-a').send({ verdict: 'accepted_risk', notes: 'Reviewed for lab use.' })).status).toBe(200);
    const detail = (await request(server).get(`/api/scans/${input.scanId}`).set('Authorization', 'Bearer owner-a')).body;
    expect(detail.feedback[0].verdict).toBe('accepted_risk'); expect(detail.hash).toBe(saved.body.hash);
    expect((await request(server).get('/api/sites').set('Authorization', 'Bearer owner-a')).body.sites[0].scanCount).toBe(1);
    expect((await request(server).get(`/api/reports/${input.scanId}`).set('Authorization', 'Bearer owner-a')).headers['content-disposition']).toContain('.json');
    expect((await request(server).get(`/api/reports/${input.scanId}/verify`).set('Authorization', 'Bearer owner-a')).body).toMatchObject({ matches: true, anchored: false });
    expect((await request(server).delete(`/api/scans/${input.scanId}`).set('Authorization', 'Bearer owner-a')).status).toBe(204);
  });
});
describe('durability and integrity', () => {
  it('persists atomic writes across store instances and serializes concurrent ingestion', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vynlt-store-')); dirs.push(dir);
    const file = join(dir, 'scans.json'); const store = new FileStore(file); const identity = { ownerId: 'owner-a', token: 'a' };
    const input = payload();
    await Promise.all([store.put(identity, parseSubmission(input)), store.put(identity, parseSubmission(input))]);
    expect((await new FileStore(file).listPage(identity, { page: 1, limit: 30 })).total).toBe(1);
  });
  it('canonicalizes object order, retains array order, and detects tampering', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
    const report = parseSubmission(payload());
    expect(reportHash(report)).not.toBe(reportHash({ ...report, score: 100 }));
  });
});

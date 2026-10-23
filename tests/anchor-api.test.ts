import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { AnchorService, localRpc, verifyExport } from '../apps/server/anchor';
import type { StoredInsightReport } from '../packages/core/insight-contracts';
import { createReport } from '../packages/core';
import { contentHash, freezeInsights } from '../packages/ml/frozen-insights';

const auth = { authenticate: async (token: string) => ['a', 'b'].includes(token) ? { ownerId: token, token } : undefined };
const identity = { ownerId: 'a', token: 'a' };
async function fixture(anchors?: AnchorService) {
  const store = new FileStore(), scan = createReport(crypto.randomUUID(), { url: 'https://test.invalid/', scannedAt: new Date().toISOString(), domCollected: true, resources: [], scripts: [] });
  await store.put(identity, scan); const content = await freezeInsights(scan);
  const app = createApp({ store, auth, anchors });
  return { app, store, scan, body: { analysisHash: await contentHash(content.analysis) } };
}
describe('local anchoring API boundaries', () => {
  it('compares transient uploads against owner-scoped saved content without claiming an offline anchor', async () => {
    const f = await fixture();
    const saved = (await f.store.putInsight(identity, await freezeInsights(f.scan))).report;
    const verify = (body: object, token = 'a') => request(f.app).post('/api/reports/verify-upload').set('Authorization', 'Bearer ' + token).send(body);
    expect((await request(f.app).post('/api/reports/verify-upload').send(saved)).status).toBe(401);
    expect((await verify(saved)).body).toMatchObject({ result: 'verification-unavailable', contentMatches: true, uploadedHash: saved.hash, savedHash: saved.hash });
    expect((await verify(saved, 'b')).body).toMatchObject({ result: 'not-found' });
    const altered = structuredClone(saved); altered.content.analysis.summary += ' altered';
    expect((await verify(altered)).body).toMatchObject({ result: 'content-mismatch', contentMatches: false });
    altered.hash = await contentHash(altered.content);
    expect((await verify(altered)).body.result).toBe('content-mismatch');
    altered.id = altered.hash;
    expect((await verify(altered)).body.result).toBe('not-found');
    const spacing = await request(f.app).post('/api/reports/verify-upload').set('Authorization', 'Bearer a').set('Content-Type', 'application/json').send(JSON.stringify(saved, null, 4));
    expect(spacing.body.contentMatches).toBe(true);
    expect(await f.store.getInsight(identity, saved.id)).toEqual(saved);
    expect((await f.store.listInsights(identity, f.scan.scanId)).length).toBe(1);
  });
  it('checks raw scan exports against database hashes and rejects invalid/oversized uploads', async () => {
    const f = await fixture();
    const verify = (body: object) => request(f.app).post('/api/reports/verify-upload').set('Authorization', 'Bearer a').send(body);
    expect((await verify(f.scan)).body).toMatchObject({ result: 'database-matching', contentMatches: true });
    const changed = structuredClone(f.scan); changed.score += 1;
    expect((await verify(changed)).body.result).toBe('content-mismatch');
    expect((await verify({})).status).toBe(400);
    const big = await request(f.app).post('/api/reports/verify-upload').set('Authorization', 'Bearer a').set('Content-Type', 'application/json').send(JSON.stringify({ padding: 'x'.repeat(4 * 1024 * 1024) }));
    expect(big.status).toBe(413); expect(big.body.limitBytes).toBe(4 * 1024 * 1024);
  });
  it('provides the local anonymous demo separately and rejects invalid ranges and foreign origins', async () => {
    const f = await fixture();
    expect((await request(f.app).get('/demo-api/ledger')).body).toMatchObject({ result: 'disabled', entries: [], accounts: [] });
    expect((await request(f.app).get('/demo-api/ledger?before=-1')).status).toBe(400);
    expect((await request(f.app).get('/demo-api/ledger?owner=another')).status).toBe(400);
    expect((await request(f.app).get('/demo-api/ledger').set('Origin', 'https://foreign.invalid')).status).toBe(403);
  });
  it('requires authentication for the ledger, validates ranges and explicitly reports disabled state', async () => {
    const f = await fixture();
    expect((await request(f.app).get('/api/blockchain/ledger')).status).toBe(401);
    expect((await request(f.app).get('/api/blockchain/ledger').set('Authorization', 'Bearer a')).body).toMatchObject({ result: 'disabled', entries: [] });
    for (const query of ['before=-1', 'before=1.5', 'before=hello', 'owner=b', 'before=9007199254740992']) {
      expect((await request(f.app).get('/api/blockchain/ledger?' + query).set('Authorization', 'Bearer a')).status).toBe(400);
    }
  });
  it('distinguishes malformed exported content from an unavailable deployment', async () => {
    const f = await fixture(), r = (await f.store.putInsight(identity, await freezeInsights(f.scan))).report;
    const proof = { version: 1, reportHash: r.hash, chainId: 31337, contractAddress: '0x' + '1'.repeat(40), instanceId: '0x' + '2'.repeat(64), status: 'queued', attempts: 0 };
    expect((await verifyExport({} as StoredInsightReport, proof, '.local/nonexistent-deployment.json')).result).toBe('content-mismatch');
    expect((await verifyExport(r, proof, '.local/nonexistent-deployment.json')).result).toBe('verification-unavailable');
  });
  it('accepts loopback only, without credentials, path, query or public-network RPC', () => {
    expect(localRpc('http://127.0.0.1:8545')).toBe('http://127.0.0.1:8545');
    for (const u of ['https://rpc.example', 'http://127.0.0.1:8545/path', 'http://user@localhost:8545', 'http://localhost:8545/?a=1', 'http://localhost:8545/#x']) expect(() => localRpc(u)).toThrow();
  });
  it('preserves frozen exports and scopes status/verify/retry/proof to the owner', async () => {
    const f = await fixture();
    const saved = await request(f.app).post(`/api/scans/${f.scan.scanId}/insight-reports`).set('Authorization', 'Bearer a').send(f.body);
    const path = `/api/insight-reports/${saved.body.id}`;
    expect(saved.status).toBe(201);
    expect((await request(f.app).get(path + '/anchor').set('Authorization', 'Bearer a')).body.enabled).toBe(false);
    expect((await request(f.app).get(path + '/verify').set('Authorization', 'Bearer a')).body.result).toBe('verification-unavailable');
    for (const suffix of ['/anchor', '/verify', '/anchor-proof.json']) {
      expect((await request(f.app).get(path + suffix)).status).toBe(401);
      expect((await request(f.app).get(path + suffix).set('Authorization', 'Bearer b')).status).toBe(404);
    }
    expect((await request(f.app).post(path + '/anchor/retry').set('Authorization', 'Bearer b').send({})).status).toBe(404);
    expect((await request(f.app).post(path + '/anchor/retry').set('Authorization', 'Bearer a').send({ digest: '0'.repeat(64) })).status).toBe(400);
    expect((await request(f.app).get(path + '.json').set('Authorization', 'Bearer a')).body).toEqual(saved.body);
    expect((await request(f.app).get(`/api/reports/${f.scan.scanId}/verify`).set('Authorization', 'Bearer a')).body.anchored).toBe(false);
  });
  it('does not roll back report saving when the journal cannot persist', async () => {
    const anchors = Object.assign(Object.create(AnchorService.prototype), { enqueue: async () => { throw new Error('disk'); } });
    const f = await fixture(anchors);
    const r = await request(f.app).post(`/api/scans/${f.scan.scanId}/insight-reports`).set('Authorization', 'Bearer a').send(f.body);
    expect(r.status).toBe(201); expect(r.headers['x-vynlt-anchor-warning']).toContain('Report saved');
    expect(await f.store.getInsight(identity, r.body.id)).toEqual(r.body);
  });
});

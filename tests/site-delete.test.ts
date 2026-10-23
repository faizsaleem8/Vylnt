import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { FileStore, SupabaseStore } from '../apps/server/store';
import { createApp } from '../apps/server/app';
import { AnchorService } from '../apps/server/anchor';
import { createReport } from '../packages/core';
import { freezeInsights } from '../packages/ml/frozen-insights';
const a = { ownerId: 'a', token: 'a' }, b = { ownerId: 'b', token: 'b' };
const auth = { authenticate: async (token: string) => ['a', 'b'].includes(token) ? { ownerId: token, token } : undefined };
const scan = (url = 'https://delete.test/path') => createReport(crypto.randomUUID(), { url, scannedAt: new Date().toISOString(), scripts: [], resources: [], domCollected: true });
afterEach(() => vi.unstubAllGlobals());
describe('website scan-group deletion', () => {
  it('deletes every owner scan across batches, cascades reports and cancels unsent jobs, preserving other sites/owners', async () => {
    const store = new FileStore(); const rows = Array.from({ length: 201 }, () => scan());
    for (const r of rows) await store.put(a, r);
    const other = scan('https://keep.test/'), privateScan = scan();
    await store.put(a, other); await store.put(b, privateScan);
    const frozen = (await store.putInsight(a, await freezeInsights(rows[0]))).report;
    const cancel = vi.fn(async () => {});
    const anchors = Object.assign(Object.create(AnchorService.prototype), { cancelScans: cancel });
    const app = createApp({ store, auth, anchors });
    const path = '/api/sites?origin=' + encodeURIComponent('https://delete.test');
    expect((await request(app).delete(path)).status).toBe(401);
    for (const origin of ['https://delete.test/path', 'https://x@delete.test', 'https://delete.test?x=1', 'https://delete.test#x', 'file:///tmp']) expect((await request(app).delete('/api/sites').query({ origin }).set('Authorization', 'Bearer a')).status).toBe(400);
    const result = await request(app).delete(path).set('Authorization', 'Bearer a');
    expect(result.status).toBe(200); expect(result.body.deletedScans).toBe(201);
    expect(cancel.mock.calls.map(call => (call as unknown as [string, string[]])[1].length)).toEqual([100, 100, 1]);
    expect(await store.getInsight(a, frozen.id)).toBeUndefined();
    expect((await store.listPage(a, { page: 1, limit: 100 })).total).toBe(1);
    expect(await store.get(a, other.scanId)).toBeDefined(); expect(await store.get(b, privateScan.scanId)).toBeDefined();
    expect((await store.sitesPage(a, { page: 1, limit: 100 })).sites.map(site => site.origin)).toEqual(['https://keep.test']);
    expect((await request(app).delete(path).set('Authorization', 'Bearer a')).body.deletedScans).toBe(0);
  });
  it('uses JWT-scoped keyset pages beyond Supabase row limits and projects only IDs on bulk delete', async () => {
    const ids = Array.from({ length: 1001 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(ids.slice(0, 500).map(scan_id => ({ scan_id })))))
      .mockResolvedValueOnce(new Response(JSON.stringify(ids.slice(500, 1000).map(scan_id => ({ scan_id })))))
      .mockResolvedValueOnce(new Response(JSON.stringify(ids.slice(1000).map(scan_id => ({ scan_id })))))
      .mockResolvedValueOnce(new Response(JSON.stringify(ids.slice(0, 100).map(scan_id => ({ scan_id })))));
    vi.stubGlobal('fetch', fetchMock);
    const store = new SupabaseStore('https://project.supabase.co', 'publishable');
    expect(await store.siteScanIds(a, 'https://delete.test')).toEqual(ids);
    expect(fetchMock.mock.calls[1][0]).toContain('scan_id=gt.' + ids[499]);
    expect(fetchMock.mock.calls[2][0]).toContain('scan_id=gt.' + ids[999]);
    expect(await store.removeScans(a, ids.slice(0, 100))).toBe(100);
    const [url, init] = fetchMock.mock.calls[3];
    expect(url).toContain('&select=scan_id'); expect(init.method).toBe('DELETE'); expect(init.headers.Authorization).toBe('Bearer a');
    expect(fetchMock.mock.calls[0][0]).toContain('origin=eq.https%3A%2F%2Fdelete.test');
  });
});

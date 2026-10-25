import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createReport } from '../packages/core';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { analyseEvidenceReport } from '../packages/ml/evidence-release';
import { contentHash, freezeInsights, verifyFrozenInsights, InsightSizeError } from '../packages/ml/frozen-insights';
import example from '../docs/examples/insight-report.json';
import type { StoredInsightReport } from '../packages/core/insight-contracts';

const auth = { authenticate: async (token: string) => ['a', 'b'].includes(token) ? { ownerId: token, token } : undefined };
const identity = { ownerId: 'a', token: 'a' };
const scan = () => createReport(crypto.randomUUID(), { url: 'https://app.test/', scannedAt: '2026-10-21T00:00:00.000Z', domCollected: true, resources: [], scripts: Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/${i}.js`, integrity: false })) });
describe('frozen insights versions', () => {
  it('keeps the complete documented example reproducible and verifiable', async () => {
    expect(await verifyFrozenInsights(example as StoredInsightReport)).toBe(true);
    expect(example.content.analysis.issues[0].findingIds).toHaveLength(2);
  });
  it('verifies finalisation, idempotency, ownership, JSON/PDF snapshot and deletion', async () => {
    const store = new FileStore(), r = scan(); await store.put(identity, r);
    let rendered: unknown;
    const app = createApp({ store, auth, renderPdf: async (_row, _mode, _analysis, frozen) => { rendered = frozen; return Buffer.from('%PDF-fixture'); } });
    const path = `/api/scans/${r.scanId}/insight-reports`;
    const body = { analysisHash: await contentHash(await analyseEvidenceReport(r)) };
    expect((await request(app).post(path).send(body)).status).toBe(401);
    expect((await request(app).post(path).set('Authorization', 'Bearer b').send(body)).status).toBe(404);
    expect((await request(app).post(path).set('Authorization', 'Bearer a').send({ analysisHash: '0'.repeat(64) })).status).toBe(409);
    expect((await request(app).post(path).set('Authorization', 'Bearer a').send({ ...body, issues: [] })).status).toBe(400);
    const first = await request(app).post(path).set('Authorization', 'Bearer a').send(body);
    expect(first.status).toBe(201);
    const second = await request(app).post(path).set('Authorization', 'Bearer a').send(body);
    expect(second.status).toBe(200); expect(second.body).toEqual(first.body);
    expect(first.body.hash).not.toBe(first.body.content.originalScanHash);
    expect(await verifyFrozenInsights(first.body)).toBe(true);
    const savedPath = `/api/insight-reports/${first.body.id}`;
    expect((await request(app).get(savedPath + '.json').set('Authorization', 'Bearer a')).body).toEqual(first.body);
    expect((await request(app).get(savedPath).set('Authorization', 'Bearer a')).status).toBe(200);
    expect((await request(app).get(savedPath).set('Authorization', 'Bearer b')).status).toBe(404);
    expect((await request(app).get(savedPath + '.pdf').set('Authorization', 'Bearer a')).status).toBe(200);
    expect(rendered).toEqual(first.body);
    expect((await request(app).get(path).set('Authorization', 'Bearer a')).body).toHaveLength(1);
    await store.remove(identity, r.scanId);
    expect((await request(app).get(savedPath).set('Authorization', 'Bearer a')).status).toBe(404);
  });
  it('retains frozen content across local store reload and rejects forged narratives', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'vylnt-insights-'));
    try {
      const path = join(dir, 'store.json'), store = new FileStore(path), r = scan();
      await store.put(identity, r); const original = await freezeInsights(r);
      const saved = await store.putInsight(identity, original);
      const reloaded = new FileStore(path);
      expect(await reloaded.getInsight(identity, saved.report.id)).toEqual(saved.report);
      const forged = structuredClone(saved.report); forged.content.analysis.issues[0].assessment = 'contextual';
      expect(await verifyFrozenInsights(forged)).toBe(false);
      forged.hash = forged.id = await contentHash(forged.content);
      expect(await verifyFrozenInsights(forged)).toBe(false);
      await expect(reloaded.putInsight(identity, forged.content)).rejects.toThrow('trusted');
      const changed = scan(); changed.scanId = crypto.randomUUID(); await store.put(identity, changed);
      expect((await store.putInsight(identity, await freezeInsights(changed))).report.id).not.toBe(saved.report.id);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('rejects oversized combined reports explicitly without discarding issues', async () => {
    const r = scan(); r.findings[0].description = 'x'.repeat(1024 * 1024);
    await expect(freezeInsights(r)).rejects.toBeInstanceOf(InsightSizeError);
    expect(r.findings).toHaveLength(71);
  });
});

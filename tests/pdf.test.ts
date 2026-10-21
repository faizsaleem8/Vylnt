import { expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../apps/server/app';
import { reportHtml, PdfUnavailableError } from '../apps/server/pdf';
import { FileStore } from '../apps/server/store';
import { parseSubmission } from '../packages/core/validation';
import { analyseScan } from '../packages/ml/automatic-analysis';

const identity = { ownerId: 'owner', token: 'owner' };
const auth = { authenticate: async (token: string) => ({ ownerId: token, token }) };
async function fixture() {
  const store = new FileStore();
  const { scan } = await store.put(identity, parseSubmission({ scanId: '00000000-0000-4000-8000-000000000001', observation: { url: 'https://example.test/?secret=x', scannedAt: '2026-10-20T00:00:00Z', headers: {}, domCollected: false, resources: [], scripts: [] } }));
  return { store, scan };
}
it('authorizes PDF export before invoking the renderer and returns a private attachment', async () => {
  const { store, scan } = await fixture();
  const renderPdf = vi.fn(async () => Buffer.from('%PDF-test'));
  const app = createApp({ store, auth, renderPdf }), path = `/api/reports/${scan.report.scanId}/pdf`;
  expect((await request(app).get(path)).status).toBe(401);
  expect((await request(app).get(path).auth('other', { type: 'bearer' })).status).toBe(404);
  expect((await request(app).get('/api/reports/invalid/pdf').auth('owner', { type: 'bearer' })).status).toBe(400);
  expect(renderPdf).not.toHaveBeenCalled();
  const response = await request(app).get(path).auth('owner', { type: 'bearer' });
  expect(response.status).toBe(200); expect(response.headers['content-type']).toContain('application/pdf');
  expect(response.headers['content-disposition']).toContain(`${scan.report.scanId}.pdf`);
  expect(response.headers['cache-control']).toBe('no-store'); expect(renderPdf).toHaveBeenCalledOnce();
  expect((await store.get(identity, scan.report.scanId))?.hash).toBe(scan.hash);
});
it('retires on-demand synthetic exports while retaining legacy development parsing', async () => {
  const { store, scan } = await fixture(), analysis = await analyseScan(scan.report);
  const renderPdf = vi.fn(async () => Buffer.from('%PDF-insights'));
  const app = createApp({ store, auth, renderPdf }), path = `/api/reports/${scan.report.scanId}/insights/pdf`;
  expect((await request(app).post(path)).status).toBe(401);
  expect((await request(app).post(path).auth('other', { type: 'bearer' })).status).toBe(404);
  expect((await request(app).post(path).auth('owner', { type: 'bearer' }).send({ modelHash: analysis.modelHash, values: analysis.values })).status).toBe(410);
  expect(renderPdf).not.toHaveBeenCalled();
  const raw = reportHtml(scan, '');
  expect(raw).not.toContain('Recommended change'); expect(raw).not.toContain('Experimental ML results');
  const legacy = reportHtml(scan, '', undefined, 'insights', analysis);
  expect(legacy).toContain('Synthetic demo only.');
});
it('returns actionable renderer failures with retry guidance', async () => {
  const { store, scan } = await fixture();
  const app = createApp({ store, auth, renderPdf: async () => { throw new PdfUnavailableError('PDF generation is busy. Retry shortly.'); } });
  const response = await request(app).get(`/api/reports/${scan.report.scanId}/pdf`).auth('owner', { type: 'bearer' });
  expect(response.status).toBe(503); expect(response.headers['retry-after']).toBe('5'); expect(response.body.error).toContain('busy');
});
it('escapes evidence and notes, labels missing coverage and separates review data from integrity', async () => {
  const { scan } = await fixture();
  scan.report.findings[0].evidence = { hostile: '<img src="https://attacker.test/x">' };
  scan.feedback = [{ findingId: scan.report.findings[0].id, verdict: 'fixed', notes: '<script>alert(1)</script> café', updatedAt: '2026-10-20T00:00:00Z' }];
  const html = reportHtml(scan, 'font', '2026-10-20T00:00:00Z', 'full');
  expect(html).not.toContain('<script>'); expect(html).not.toContain('<img');
  expect(html).toContain('&lt;script&gt;'); expect(html).toContain('café'); expect(html).toContain('DOM: not collected');
  expect(html).toContain('MISMATCH'); expect(html).toContain('not this PDF or its review notes'); expect(html).not.toContain('?secret');
  scan.report.findings = [];
  expect(reportHtml(scan, '')).toContain('No findings observed');
});

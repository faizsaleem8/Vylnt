import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const { generatePdf, parseSubmission, reportHash } = await import(pathToFileURL((process.env.VYLNT_BENCH_MODULE ?? process.env.VYNLT_BENCH_MODULE)).href);
const profiles = { typical: { scripts: 0, pathLength: 0, notes: false }, medium: { scripts: 25, pathLength: 40, notes: true }, large: { scripts: 150, pathLength: 2400, notes: true } };
const profile = profiles[(process.env.VYLNT_BENCH_PROFILE ?? process.env.VYNLT_BENCH_PROFILE)];
if (!profile) throw new Error('Unknown benchmark profile');
const submission = { scanId: '00000000-0000-4000-8000-000000000001', observation: {
  url: 'https://example.test/pdf-benchmark', scannedAt: '2026-10-20T00:00:00Z', headers: {}, cookies: [], domCollected: true, resources: [],
  scripts: Array.from({ length: profile.scripts }, (_, i) => ({ url: `https://cdn.example.test/${i}/${'a'.repeat(profile.pathLength)}.js`, integrity: false }))
} };
const submissionBytes = Buffer.byteLength(JSON.stringify(submission));
if (submissionBytes > 512 * 1024) throw new Error('Benchmark submission exceeds the API limit');
const report = parseSubmission(submission);
const row = { report, hash: reportHash(report), receivedAt: '2026-10-20T00:00:01Z', feedback: profile.notes ? report.findings.map(f => ({ findingId: f.id, verdict: 'open', notes: 'Synthetic review note. '.repeat(45).slice(0, 1000), updatedAt: '2026-10-20T00:00:02Z' })) : [] };
process.send({ type: 'ready' });
process.once('message', async () => {
  const start = performance.now();
  let result;
  try {
    const pdf = await generatePdf(row);
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF signature');
    result = { status: 'success', pdfBytes: pdf.length };
  } catch (error) {
    result = { status: 'error', error: error instanceof Error ? error.message : 'Render failed' };
  }
  process.send({ type: 'result', ...result, elapsedMs: Math.round(performance.now() - start), submissionBytes,
    reportBytes: Buffer.byteLength(JSON.stringify(row)), findingCount: report.findings.length,
    nodePeakRssBytes: process.resourceUsage().maxRSS * 1024 });
  process.disconnect();
});

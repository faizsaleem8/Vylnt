import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Browser } from 'playwright';
import type { StoredScan } from './store';
import { reportHash } from './store';
import { finalizeReportPdf } from './pdf-accessibility';
import { summarizeReport } from '../../packages/core/report-insights';
import type { ScanAnalysis } from '../../packages/ml/automatic-analysis';
import { groupMlInsights } from '../../packages/ml/grouped-insights';

const escape = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export class PdfUnavailableError extends Error {}

export function reportHtml(row: StoredScan, font: string, generatedAt = new Date().toISOString(), mode: 'summary' | 'full' | 'insights' = 'full', analysis?: ScanAnalysis) {
  const { report, feedback } = row;
  const coverage = [['Headers', report.observation.headers !== undefined], ['DOM', report.observation.domCollected], ['Cookies', report.observation.cookies !== undefined]] as const;
  const reviews = new Map(feedback.map(review => [review.findingId, review]));
  if (mode === 'insights' && (!analysis || analysis.scanId !== report.scanId)) throw new Error('Matching scan analysis is required for insights PDF');
  const modelHtml = analysis && mode === 'insights' ? `<h2>Experimental ML results</h2><p>${escape(analysis.modelName)} / ${escape(analysis.kind)} / ${escape(analysis.provenance)} training provenance.</p><p class="meta">Model SHA-256: ${escape(analysis.modelHash)}<br>Ruleset: ${escape(analysis.rulesetVersion)} / Threshold: ${analysis.threshold}</p><p>${analysis.provenance === 'synthetic' ? 'Synthetic demo only. These predictions do not establish real issue relevance and must not guide security decisions.' : 'Experimental predictions; not approved for production security decisions.'} Scores are not exploit probabilities. Original severities remain unchanged. The report hash above covers the original scan, not these ML results or recommendations.</p>` : '';
  const modelGroups = new Map(analysis ? groupMlInsights(report, analysis.values).map(group => [group.finding.id, group]) : []);
  const modelStats = (findingId: string) => {
    const group = modelGroups.get(findingId);
    return group && mode === 'insights' ? `<p><strong>Experimental per-observation outputs:</strong> ${group.actionable} actionable / ${group.contextual} contextual / ${group.abstained} unavailable. This is not a group vulnerability verdict.</p>` : '';
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>VYNLT scan report</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:">
  <style>@font-face{font-family:Plex;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{font:11pt/1.5 Plex,Arial,sans-serif;color:#263142;margin:0;overflow-wrap:anywhere}h1{font-size:30pt;line-height:1.15;margin:8mm 0}h2{font-size:19pt;line-height:1.25}h3{font-size:12pt;margin-top:6mm}h1,h2,h3{break-after:avoid}p{orphans:3;widows:3}.brand{color:#5841c6;font-weight:bold;letter-spacing:1pt}.muted{color:#5f6b7c}.summary{padding:5mm;background:#eef2f6;border-left:3pt solid #5841c6}.finding{break-before:page}.meta{font-size:9pt}.evidence{white-space:pre-wrap;overflow-wrap:anywhere;font:9pt/1.6 Plex,Arial,sans-serif;border-left:2pt solid #d4dde7;padding-left:4mm}.review{margin-top:6mm}.empty{margin-top:8mm}strong{font-weight:600}</style></head><body>
  <div class="brand">VYNLT / SCAN REPORT</div><h1>${mode === 'insights' ? 'Insights and recommended changes' : 'Full scan data'}</h1>
  <p>${escape(report.observation.url)}</p>
  <div class="summary"><strong>Configuration score: ${report.score}/100</strong><br>${report.findings.length} observed findings</div>
  <h2>Collection coverage</h2><p>${coverage.map(([name, collected]) => `${name}: ${collected ? 'collected' : 'not collected'}`).join('<br>')}</p>
  <p class="muted">Collection means evidence was observed, not that a check passed. Missing collection can hide findings. The score is a heuristic, not a probability of compromise. Configuration warnings are not proof of exploitation.</p>
  <h2>Report identity</h2><div class="meta"><p>Scan ID: ${escape(report.scanId)}<br>Observed: ${escape(report.observation.scannedAt)}<br>Ruleset: ${escape(report.rulesetVersion)}<br>Received: ${escape(row.receivedAt)}<br>PDF generated: ${escape(generatedAt)}</p>
  <p>Stored report SHA-256:<br>${escape(row.hash)}<br>Integrity: ${reportHash(report) === row.hash ? 'matches the stored report' : 'MISMATCH - report differs from stored hash'}.</p></div>
  <p class="muted">This hash identifies the immutable JSON report, not this PDF or its review notes. It is not blockchain verification or proof that the scanned site is secure. Reviews below are user decisions as of export; they do not change evidence or scores. Trends and comparisons are not included.</p>
  ${modelHtml}
  ${mode !== 'full' ? `<h2>Issues and recommended changes</h2><p>${report.findings.length} observations grouped into ${summarizeReport(report).length} issues with matching explanations and fixes. Ordered by rule severity, not validated ML. ML prioritisation is unavailable because the current LSTM is synthetic. Full evidence and review decisions remain in the workspace; Export JSON retains original evidence.</p>${summarizeReport(report).map(({ finding, count, samples }, index) => `<section><h3>${index + 1}. ${escape(finding.title)}</h3><p>${escape(finding.severity)} rule severity / ${escape(finding.confidence)} confidence / ${escape(finding.ruleId)} / ${count} observations</p><p>${escape(finding.description)}</p>${modelStats(finding.id)}<p><strong>Recommended change:</strong> ${escape(finding.recommendation)}</p><p>Verify the affected configuration and rescan after changes. A clean rescan is not proof of complete security.</p><p>Evidence samples (${samples.length} of ${count}; previews limited to 240 characters):</p>${samples.map((sample, sampleIndex) => `<p class="meta">Sample ${sampleIndex + 1}: ${escape(sample.url)}<br>${escape(sample.evidence)}${sample.evidence.length === 240 ? '… [preview limited]' : ''}</p>`).join('')}</section>`).join('')}${!report.findings.length ? '<p>No findings observed under the collected checks. This does not establish that the page is secure.</p>' : ''}` : report.findings.length ? report.findings.map((finding, index) => {
    const review = reviews.get(finding.id);
    return `<section class="finding"><div class="brand">FINDING ${index + 1} OF ${report.findings.length}</div><h2>${escape(finding.title)}</h2><p><strong>${escape(finding.severity)} severity</strong> / ${escape(finding.confidence)} confidence / ${escape(finding.ruleId)}</p><p>${escape(finding.description)}</p><p class="meta">URL: ${escape(finding.url)}<br>Observed: ${escape(finding.detectedAt)}<br>Finding ID: ${escape(finding.id)}</p><h3>Observed evidence</h3><div class="evidence">${escape(JSON.stringify(finding.evidence, null, 2))}</div><div class="review"><h3>Saved review</h3><p>${review ? `${escape(review.verdict.replaceAll('_', ' '))} / ${escape(review.updatedAt)}` : 'No saved decision.'}</p>${review?.notes ? `<div class="evidence">${escape(review.notes)}</div>` : ''}</div></section>`;
  }).join('') : '<p class="empty">No findings observed under this ruleset and collection coverage. This does not establish that the page is secure.</p>'}</body></html>`;
}

// One isolated renderer per process; reject overload rather than queue unbounded browser jobs.
let rendering = false;
export async function generatePdf(row: StoredScan, mode: 'summary' | 'full' | 'insights' = 'full', analysis?: ScanAnalysis): Promise<Buffer> {
  if (rendering) throw new PdfUnavailableError('PDF generation is busy. Retry shortly.');
  rendering = true;
  let browser: Browser | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Match setup:browser; deployments can provide their own Playwright browser location.
    process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true, timeout: 10000 });
    const activeBrowser = browser;
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { void activeBrowser.close().catch(() => {}); reject(new PdfUnavailableError('PDF generation timed out. Retry or export JSON.')); }, 20000); });
    return await Promise.race([deadline, (async () => {
      const context = await activeBrowser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
      await context.route('**/*', route => route.abort());
      const page = await context.newPage();
      const font = await readFile(resolve('dist/server/plex-sans.ttf'));
      await page.setContent(reportHtml(row, font.toString('base64'), undefined, mode, analysis), { waitUntil: 'load', timeout: 10000 });
      await page.evaluate(() => document.fonts.ready);
      const pdf = await page.pdf({ format: 'A4', printBackground: true, tagged: true, outline: true,
        margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' } });
      return finalizeReportPdf(pdf, font);
    })()]);
  } catch (error) {
    if (error instanceof PdfUnavailableError) throw error;
    throw new PdfUnavailableError('PDF generation unavailable. Ensure the server build and npm run setup:browser are installed, then retry.');
  } finally {
    if (timer) clearTimeout(timer);
    await browser?.close().catch(() => {}); rendering = false;
  }
}

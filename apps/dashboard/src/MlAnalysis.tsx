import React, { useEffect, useState } from 'react';
import { productLabel } from '../../../packages/ui/branding';
import type { Report } from '../../../packages/core';
import type { InsightAnalysis } from '../../../packages/core/insight-contracts';
import { analyseEvidenceReport } from '../../../packages/ml/evidence-release';
import { AnchorStatus } from './AnchorStatus';
import { contentHash } from '../../../packages/core/integrity';
import type { StoredInsightReport } from '../../../packages/core/insight-contracts';

type Version = { id: string; hash: string; createdAt: string };
type State = { report: Report; analysis?: InsightAnalysis; error?: string };
export function MlAnalysis({ report, onDownloadInsights, onListReports, onDownloadSaved, api }: {
  report: Report; onDownloadInsights: (analysis: InsightAnalysis, format?: 'json' | 'pdf') => Promise<void>;
  onListReports: () => Promise<Version[]>; onDownloadSaved: (id: string, format: 'json' | 'pdf') => Promise<void>;
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  const [state, setState] = useState<State>();
  const [downloading, setDownloading] = useState<'pdf' | 'json'>();
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsError, setVersionsError] = useState('');
  const [saved, setSaved] = useState<{ report: Report; hash?: string; error?: string }>();
  const [saveAttempt, setSaveAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false, worker: Worker | undefined;
    const fallback = async () => {
      if (cancelled) return;
      try { const analysis = await analyseEvidenceReport(report); if (!cancelled) setState({ report, analysis }); }
      catch { setState({ report, error: 'Evidence analysis unavailable. Full findings remain accessible.' }); }
    };
    try {
      worker = new Worker(new URL('./insight-worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = event => { if (!cancelled) setState({ report, ...event.data }); };
      worker.onerror = () => { worker?.terminate(); void fallback(); };
      worker.postMessage(report);
    } catch { void fallback(); }
    setVersions([]); setVersionsError('');
    void onListReports().then(rows => { if (!cancelled) setVersions(previous => [...new Map([...rows, ...previous].map(row => [row.id, row])).values()]); }).catch(() => { if (!cancelled) setVersionsError('Saved report history is unavailable. Check API configuration and migration 005.'); });
    return () => { cancelled = true; worker?.terminate(); };
  }, [report]);
  const current = state?.report === report ? state : undefined;
  const analysis = current?.analysis;
  useEffect(() => {
    if (!analysis) return;
    let cancelled = false;
    const controller = new AbortController();
    setSaved({ report });
    void (async () => {
      try {
        const analysisHash = await contentHash(analysis);
        if (cancelled) return;
        const frozen = await api<StoredInsightReport>(`/scans/${report.scanId}/insight-reports`, { method: 'POST', body: JSON.stringify({ analysisHash }), signal: controller.signal });
        if (cancelled) return;
        setSaved({ report, hash: frozen.hash });
        setVersions(previous => [frozen, ...previous.filter(row => row.id !== frozen.id)]);
      } catch (error) {
        if (!cancelled) setSaved({ report, error: error instanceof Error ? error.message : 'Report save unavailable.' });
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [report, analysis, saveAttempt]);
  async function save(format: 'json' | 'pdf') {
    if (!analysis || downloading) return;
    setDownloading(format);
    try { await onDownloadInsights(analysis, format); setVersions(await onListReports()); }
    catch { setVersionsError('Could not refresh saved report history. Retry the export or reopen this scan.'); }
    finally { setDownloading(undefined); }
  }
  const activeVersion = versions.find(version => saved?.report === report && version.id === saved.hash) ?? versions[0];
  const olderVersions = versions.filter(version => version.id !== activeVersion?.id);
  return <section className="panel ml-analysis" aria-label="Automatic ML analysis"><div className="ml-body">
    <div className="report-overview"><div><p className="eyebrow">Generated report</p><h2>Report insights</h2><p className="ml-status" role="status">{current?.error ?? (analysis ? `${analysis.issues.length} issue groups · ${analysis.issues.filter(issue => issue.assessment === 'change-warranted').length} changes warranted · ${analysis.issues.filter(issue => issue.assessment !== 'change-warranted').length} need review` : 'Analysing scan…')}</p>
      <p className="small muted">{analysis?.mode === 'experimental-model' ? 'Experimental ML · findings and severity unchanged.' : analysis?.mode === 'qualified-model' ? 'ML qualification applies only to the approved categories.' : 'Evidence summary · no qualified ML assessment.'}</p></div>
      <div className="insights-actions" role="group" aria-label="Insights downloads"><button className="primary insights-download" disabled={!analysis || Boolean(downloading)} onClick={() => void save('pdf')}>{downloading === 'pdf' ? 'Preparing insights PDF…' : 'Download insights PDF'}</button><button disabled={!analysis || Boolean(downloading)} onClick={() => void save('json')}>{downloading === 'json' ? 'Preparing insights JSON…' : 'Download insights JSON'}</button></div>
    </div>
    {analysis && <div className="report-save-status" aria-label="Automatic report saving"><p role="status">{saved?.report === report && saved.hash ? 'Report saved. Blockchain status below.' : saved?.report === report && saved.error ? `Report was not automatically saved: ${saved.error}` : 'Saving report and generating its hash…'}</p>
      {saved?.report === report && saved.hash && <details><summary>Report SHA-256</summary><code>{saved.hash}</code><p className="small muted">Identifies frozen JSON content, not PDF bytes.</p></details>}
      {saved?.report === report && saved.error && <button onClick={() => setSaveAttempt(value => value + 1)}>Retry report save</button>}
    </div>}
    {analysis && <>
      <section className="prioritised-issues" aria-label="ML prediction results"><h3>Prioritised issues</h3><ul className="ml-results">{analysis.issues.map(issue => <li key={issue.category}><details className="issue-details"><summary><span><strong>{issue.title}</strong><span className="small muted">{issue.assessment === 'change-warranted' ? 'Change warranted' : 'Needs review'} · {issue.findingIds.length} affected observation{issue.findingIds.length === 1 ? '' : 's'}</span></span><span className={`badge ${issue.originalSeverity}`}>{issue.originalSeverity}</span></summary><div className="disclosure-content">
        <p>{issue.explanation}</p><p><strong>Recommended change:</strong> {issue.recommendedChange}</p><p><strong>Compatibility:</strong> {issue.compatibility}</p><p><strong>Verify:</strong> {issue.verification}</p>
        {issue.experimentalSignal && <p className="small muted">Experimental LSTM signal: {issue.experimentalSignal.minScore.toFixed(3)}–{issue.experimentalSignal.maxScore.toFixed(3)} across {issue.experimentalSignal.scoredVariants} contexts; {issue.experimentalSignal.reviewOnlyVariants} additional contexts require review. This is not an exploit probability.</p>}
        <details><summary>Affected items and evidence ({issue.findingIds.length})</summary><p>{issue.missingContext.join(' ')}</p><p>{issue.variants.length} distinct evidence contexts. Full evidence references are preserved in the frozen JSON.</p>{issue.observedFacts.slice(0, 3).map((facts, index) => <pre className="small" key={index}>{JSON.stringify(facts, null, 2)}</pre>)}</details>
      </div></details></li>)}</ul></section>
      <details className="report-disclosure model-details"><summary>How this report works</summary><div className="disclosure-content"><p>{analysis.summary}</p><p>{productLabel(analysis.model.name)}. Scores do not prove exploitability. Controlled-data scores supplement the evidence; findings and severity remain unchanged.</p><p className="ml-warning">{analysis.limitations.join(' ')}</p><h3>Contextual observations</h3>{analysis.contextual.length ? <ul>{analysis.contextual.map(issue => <li key={issue.category}><strong>{issue.title}</strong> / {issue.findingIds.length} observations<p>{issue.explanation}</p></li>)}</ul> : <p>No groups qualified for contextual de-emphasis.</p>}<p className="small muted">No findings are removed. Print / PDF retains every finding, severity and evidence without generated actions or ML.</p></div></details>
    </>}
    {versionsError && <p role="status">{versionsError}</p>}
    {activeVersion ? <AnchorStatus key={activeVersion.id} id={activeVersion.id} api={api} /> : <section className="blockchain-status" aria-label="Blockchain report verification"><div className="blockchain-heading"><h3>Blockchain</h3><span className="status-label">{saved?.report === report && saved.error ? 'Waiting for report save' : 'Preparing report'}</span></div><p className="small muted">The generated report must be saved before its hash can be submitted to the local blockchain.</p></section>}
    {olderVersions.length > 0 && <details className="report-disclosure saved-versions"><summary>Previous reports <span className="small muted">{olderVersions.length}</span></summary><ul>{olderVersions.map(version => <li key={version.id}><span>{new Date(version.createdAt).toLocaleString()}</span><div className="report-actions"><button onClick={() => void onDownloadSaved(version.id, 'pdf')}>PDF</button><button onClick={() => void onDownloadSaved(version.id, 'json')}>JSON</button></div><details><summary>Report proof</summary><AnchorStatus id={version.id} api={api} /></details></li>)}</ul></details>}
  </div></section>;
}

import React, { useEffect, useState } from 'react';
import type { Report } from '../../../packages/core';
import type { InsightAnalysis } from '../../../packages/core/insight-contracts';
import { analyseEvidenceReport } from '../../../packages/ml/evidence-release';

type Version = { id: string; hash: string; createdAt: string };
type State = { report: Report; analysis?: InsightAnalysis; error?: string };
export function MlAnalysis({ report, onDownloadInsights, onListReports, onDownloadSaved }: {
  report: Report; onDownloadInsights: (analysis: InsightAnalysis, format?: 'json' | 'pdf') => Promise<void>;
  onListReports: () => Promise<Version[]>; onDownloadSaved: (id: string, format: 'json' | 'pdf') => Promise<void>;
}) {
  const [state, setState] = useState<State>();
  const [downloading, setDownloading] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsError, setVersionsError] = useState('');
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
    void onListReports().then(rows => { if (!cancelled) setVersions(rows); }).catch(() => { if (!cancelled) setVersionsError('Saved report history is unavailable. Check API configuration and migration 005.'); });
    return () => { cancelled = true; worker?.terminate(); };
  }, [report]);
  const current = state?.report === report ? state : undefined;
  const analysis = current?.analysis;
  async function save(format: 'json' | 'pdf') {
    if (!analysis || downloading) return;
    setDownloading(true);
    try { await onDownloadInsights(analysis, format); setVersions(await onListReports()); }
    catch { setVersionsError('Could not refresh saved report history. Retry the export or reopen this scan.'); }
    finally { setDownloading(false); }
  }
  return <section className="panel ml-analysis" aria-label="Automatic ML analysis"><div className="ml-body">
    <h2>Report insights <span className="muted">/ {analysis?.mode === 'experimental-model' ? 'Experimental LSTM' : analysis?.mode === 'qualified-model' ? 'Qualified category model' : 'Evidence summary'}</span></h2>
    <p>VYNLT assesses saved scan metadata automatically. {analysis?.mode === 'experimental-model' ? `Model: ${analysis.model.name}. Controlled-data scores supplement the evidence; findings and severity remain unchanged.` : analysis?.mode === 'qualified-model' ? `Model: ${analysis.model.name}. Qualification applies only to approved categories within the documented scope.` : 'A qualified LSTM release is not available; synthetic scores do not decide which real findings matter.'}</p>
    <button disabled={!analysis || downloading} onClick={() => void save('pdf')}>{downloading ? 'Preparing insights PDF…' : 'Download insights PDF'}</button>{' '}
    <button disabled={!analysis || downloading} onClick={() => void save('json')}>Download insights JSON</button>
    <p role="status" className="ml-status">{current?.error ?? analysis?.summary ?? 'Analysing scan…'}</p>
    {analysis && <>
      <p className="ml-warning">{analysis.limitations.join(' ')}</p>
      <section aria-label="ML prediction results"><h3>Prioritised issues</h3><ul className="ml-results">{analysis.issues.map(issue => <li key={issue.category}>
        <strong>{issue.title}</strong><span className="small muted">{issue.category} / {issue.originalSeverity} rule severity / {issue.findingIds.length} affected observations</span>
        <p><strong>{issue.assessment === 'change-warranted' ? 'Change warranted' : 'Needs review'}</strong> — {issue.explanation}</p>
        {issue.experimentalSignal && <p><strong>Experimental LSTM signal:</strong> {issue.experimentalSignal.minScore.toFixed(3)} to {issue.experimentalSignal.maxScore.toFixed(3)} across {issue.experimentalSignal.scoredVariants} distinct contexts; {issue.experimentalSignal.reviewOnlyVariants} additional contexts require review. This is not an exploit probability.</p>}
        <p><strong>Recommended change:</strong> {issue.recommendedChange}</p>
        <p><strong>Compatibility:</strong> {issue.compatibility}</p><p><strong>Verify:</strong> {issue.verification}</p>
        <details><summary>Affected items and evidence ({issue.findingIds.length})</summary><p>{issue.missingContext.join(' ')}</p><p>{issue.variants.length} distinct evidence contexts. Full evidence references are preserved in the frozen JSON.</p>
          {issue.observedFacts.slice(0, 3).map((facts, index) => <pre className="small" key={index}>{JSON.stringify(facts, null, 2)}</pre>)}
        </details>
      </li>)}</ul></section>
      <h3>Contextual observations</h3>{analysis.contextual.length ? <ul>{analysis.contextual.map(issue => <li key={issue.category}><strong>{issue.title}</strong> / {issue.findingIds.length} observations / {issue.originalSeverity} rule severity<details><summary>Evidence references</summary><p>{issue.explanation}</p><p>{issue.findingIds.map(id => report.findings.findIndex(f => f.id === id) + 1).join(', ')}</p></details></li>)}</ul> : <p>No groups qualified for contextual de-emphasis.</p>}
      <p className="small muted">Print / PDF retains every finding, severity and full evidence without generated actions or ML. Insights exports freeze a separate immutable report. No findings are silently removed.</p>
    </>}
    <h3>Saved insights versions</h3>{versionsError && <p role="status">{versionsError}</p>}
    {versions.length ? <ul>{versions.map(version => <li key={version.id}><span className="small">{new Date(version.createdAt).toLocaleString()} / {version.hash.slice(0, 12)}</span>{' '}<button onClick={() => void onDownloadSaved(version.id, 'pdf')}>PDF</button>{' '}<button onClick={() => void onDownloadSaved(version.id, 'json')}>JSON</button></li>)}</ul> : <p className="small muted">An export saves a version that can be retrieved after reload.</p>}
  </div></section>;
}

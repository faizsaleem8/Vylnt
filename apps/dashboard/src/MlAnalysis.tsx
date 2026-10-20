import React, { useEffect, useState } from 'react';
import type { Report } from '../../../packages/core';
import { analyseScan } from '../../../packages/ml/automatic-analysis';
import { groupMlInsights } from '../../../packages/ml/grouped-insights';

type Analysis = Awaited<ReturnType<typeof analyseScan>>;
type State = { report: Report; analysis?: Analysis; error?: string };
export function MlAnalysis({ report, onDownloadInsights }: { report: Report; onDownloadInsights: (analysis: Analysis) => Promise<void> }) {
  const [state, setState] = useState<State>();
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void analyseScan(report).then(analysis => {
      if (!cancelled) setState({ report, analysis });
    }).catch(error => {
      if (!cancelled) setState({ report, error: error instanceof Error && error.message.includes('ruleset versions differ') ? 'This scan uses a ruleset that the current VYNLT model does not support.' : 'VYNLT could not analyse this scan with its current model release.' });
    });
    return () => { cancelled = true; };
  }, [report]);
  // Never render the previous scan's results while a new analysis is pending.
  const current = state?.report === report ? state : undefined;
  const analysis = current?.analysis;
  const groups = analysis ? groupMlInsights(report, analysis.values) : [];
  return <section className="panel ml-analysis" aria-label="Automatic ML analysis"><div className="ml-body">
    <h2>ML analysis <span className="muted">/ Experimental</span></h2>
    <p>VYNLT analyses this scan automatically in your browser using its bundled model.</p>
    <button disabled={!analysis || downloading} onClick={() => { if (!analysis || downloading) return; setDownloading(true); void onDownloadInsights(analysis).finally(() => setDownloading(false)); }}>{downloading ? 'Preparing insights PDF…' : 'Download insights PDF'}</button>
    <p role="status" className="ml-status">{current?.error ? 'ML analysis unavailable. Rule findings are still available below.' : !analysis ? 'Analysing scan…' : !analysis.values.length ? 'No observed findings to classify. This does not establish that the site is safe.' : `${analysis.values.length} observations grouped into ${groups.length} ${groups.length === 1 ? 'issue' : 'issues'}. Matching explanations and fixes appear once.`}</p>
    {current?.error && <p className="ml-warning">{current.error} VYNLT needs a compatible model release; no setup is required from you.</p>}
    {analysis && <>
      <div className="ml-model"><strong>{analysis.modelName}</strong><p>{analysis.provenance === 'synthetic' ? 'Synthetic demo only. A validated security model is not available yet. These results demonstrate the automatic pipeline and must not guide security decisions.' : 'Experimental model. Predictions have not been approved for production security decisions.'}</p><p className="small muted">Original findings and severity remain unchanged. Scores are uncalibrated triage signals, not exploit probabilities.</p>{analysis.kind === 'experimental-lstm' && <p className="small muted">LSTM input uses bounded snapshot metadata in a fixed group order. It is not a JavaScript execution trace and does not detect weaknesses beyond the supported rule findings.</p>}<details><summary>Model details</summary><p className="small muted">{analysis.kind === 'experimental-lstm' ? 'LSTM / Snapshot sequence v1' : 'Logistic baseline'} / Ruleset {analysis.rulesetVersion} / Threshold {analysis.threshold}</p><code>{analysis.modelHash}</code></details></div>
      {analysis.values.length > 0 && <section aria-label="ML prediction results"><h3>{analysis.provenance === 'synthetic' ? 'Synthetic ML preview' : 'Experimental ML insights'}</h3><p className="small muted">Grouped by matching rule context and fix; ordered by rule severity. Grouping is not an LSTM verdict. A contextual prediction does not mean harmless.</p><ul className="ml-results">{groups.map(group => {
        const finding = group.finding;
        return <li key={group.findingIds[0]}><strong>{finding.title}</strong><span className="small muted">{finding.ruleId} / {finding.severity} severity / {group.count} affected observations</span><p>{finding.description}</p>{analysis.provenance !== 'synthetic' && <p>Per-observation predictions: {group.actionable} actionable, {group.contextual} contextual, {group.abstained} unavailable. Verify against the evidence.</p>}<p><strong>Recommended change from rule guidance:</strong> {finding.recommendation}</p><details><summary>Affected items and model details ({group.count})</summary><p className="small muted">{analysis.provenance === 'synthetic' ? 'Demo predictions only; these cannot establish real issue relevance.' : 'Experimental predictions, not proof of impact.'} {group.actionable} actionable / {group.contextual} contextual / {group.abstained} unavailable. Showing up to 3 evidence samples; full evidence remains in the findings below.</p>{group.samples.map((sample, index) => <div key={index}><p className="small url">{sample.url}</p><p className="small muted">{sample.evidence}{sample.evidence.length === 240 ? '… [preview limited]' : ''}</p></div>)}</details></li>;
      })}</ul><p className="small muted">Recommendations come from ruleset {report.rulesetVersion}. Review the original evidence and rescan after changes. The current model has not established which issues are real or harmless.</p></section>}
      <p className="small muted">No findings are hidden or marked fixed. Print / PDF contains full scan findings without recommendations or ML. The separate insights PDF includes grouped recommendations and experimental model results. ML results are not persisted or included in the original scan hash.</p>
    </>}
  </div></section>;
}

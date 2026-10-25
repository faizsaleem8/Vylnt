import React, { useEffect, useRef, useState } from 'react';
import type { ReportFileVerification } from '../../../packages/core/anchor';

const maxBytes = 4 * 1024 * 1024;
export function VerifyReport({ api }: { api: <T>(path: string, init?: RequestInit) => Promise<T> }) {
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<ReportFileVerification>();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  function choose(next?: File) { controller.current?.abort(); setFile(next); setResult(undefined); setError(next && next.size > maxBytes ? 'This export is too large. Maximum upload size is 4 MiB including formatting.' : ''); setBusy(false); }
  async function verify() {
    if (!file || file.size > maxBytes) return;
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setError(''); setResult(undefined);
    try {
      let value: unknown;
      try { value = JSON.parse(await file.text()); } catch { throw new Error('This file is not valid JSON. Choose a downloaded insights JSON report.'); }
      if (request.signal.aborted) return;
      if (!value || typeof value !== 'object' || (!('scanId' in value) && (!('content' in value) || (value as {content?: {version?: string}}).content?.version !== 'vynlt-frozen-insights-v1'))) throw new Error('Choose a VYLNT Export JSON or Download insights JSON file. PDF files are not supported by this checker.');
      const checked = await api<ReportFileVerification>('/reports/verify-upload', { method: 'POST', body: JSON.stringify(value), signal: request.signal });
      if (!request.signal.aborted) setResult(checked);
    } catch (cause) { if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : 'Verification unavailable. Retry when the API is connected.'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  const titles = { matching: 'Report matches the blockchain anchor', 'database-matching': 'Report matches the saved database hash', 'content-mismatch': 'Report has been altered or corrupted', 'not-found': 'Saved report not found', 'not-anchored': 'Content matches · not anchored', 'verification-unavailable': 'Verification unavailable' };
  return <section className="panel verify-report" aria-label="Verify uploaded report">
    <h2>Check a downloaded report</h2><p className="muted">Upload a report JSON to compare its content with your saved version. Insights JSON also checks the original hash on the local blockchain. No separate proof file is needed.</p>
    <form onSubmit={event => { event.preventDefault(); void verify(); }}><label htmlFor="report-json">Report JSON</label><input id="report-json" type="file" accept=".json,application/json" onChange={event => choose(event.target.files?.[0])} /><button className="primary" disabled={!file || file.size > maxBytes || busy}>{busy ? 'Verifying report…' : 'Verify report'}</button></form>
    {error && <p role="alert">{error}</p>}
    <div role="status" aria-live="polite">{result && <div className="verification-result" data-result={result.result}><h3>{titles[result.result]}</h3><p>{result.message}</p>{result.contentMatches && result.result !== 'matching' && result.result !== 'database-matching' && <p>The uploaded content matches the saved database version. Blockchain confirmation is a separate check and has not succeeded.</p>}{result.uploadedHash && <details><summary>Hash comparison</summary><dl><dt>Uploaded content SHA-256</dt><dd><code>{result.uploadedHash}</code></dd><dt>Saved content SHA-256</dt><dd><code>{result.savedHash}</code></dd>{result.proof?.transactionHash && <><dt>Anchor transaction</dt><dd><code>{result.proof.transactionHash}</code></dd></>}</dl></details>}</div>}</div>
    <p className="small muted">Verification covers canonical report content, not PDF bytes or formatting. For insights exports, the createdAt timestamp is outside the content hash. Uploads are checked transiently and are not saved. Only reports belonging to your signed-in account can be compared.</p><p className="small muted">A matching hash does not validate findings or ML accuracy. The local node must be running for blockchain verification. <a href="/ledger.html" target="_blank" rel="noopener noreferrer">Open demo ledger ↗</a></p>
  </section>;
}

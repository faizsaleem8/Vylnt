import React, { useEffect, useRef, useState } from 'react';
import type { AnchorView, AnchorVerification } from '../../../packages/core/anchor';
export function AnchorStatus({ id, api }: { id: string; api: <T>(path: string, init?: RequestInit) => Promise<T> }) {
  const apiRef = useRef(api); apiRef.current = api;
  const [state, setState] = useState<{ id: string; view?: AnchorView; message?: string }>();
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const refreshRef = useRef<(() => Promise<void>) | undefined>(undefined);
  useEffect(() => {
    const c = new AbortController(); controller.current = c; let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      try {
        const view = await apiRef.current<AnchorView>(`/insight-reports/${id}/anchor`, { signal: c.signal }); if (c.signal.aborted) return;
        setState(previous => ({ id, view, message: previous?.id === id ? previous.message : undefined }));
        if (view.proof && ['queued', 'submitted'].includes(view.proof.status)) timer = setTimeout(() => void refresh(), 4000);
      } catch { if (!c.signal.aborted) setState({ id, message: 'Status unavailable. Reports remain accessible.' }); }
    }
    refreshRef.current = refresh;
    void refresh(); return () => { c.abort(); clearTimeout(timer); };
  }, [id]);
  const current = state?.id === id ? state : undefined, view = current?.view, proof = view?.proof;
  async function action(kind: 'verify' | 'retry' | 'proof') {
    const c = controller.current; if (!c || busy) return; setBusy(true);
    try {
      const path = `/insight-reports/${id}/`;
      if (kind === 'verify') {
        const result = await apiRef.current<AnchorVerification>(path + 'verify', { signal: c.signal });
        if (!c.signal.aborted) setState(previous => ({ id, view: previous?.view, message: result.result + ': ' + result.message }));
      } else if (kind === 'retry') {
        const next = await apiRef.current<AnchorView>(path + 'anchor/retry', { method: 'POST', body: '{}', signal: c.signal });
        if (!c.signal.aborted) setState({ id, view: next, message: 'Retry queued. Use Verify to check the live chain.' });
        if (!c.signal.aborted) await refreshRef.current?.();
      } else {
        const data = await apiRef.current(path + 'anchor-proof.json', { signal: c.signal }); if (c.signal.aborted) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `vylnt-${id}-anchor-proof.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch { if (!c.signal.aborted) setState(previous => ({ id, view: previous?.view, message: 'Operation unavailable. Check the API and local node, then retry.' })); }
    finally { if (!c.signal.aborted) setBusy(false); }
  }
  const label = !view ? current?.message ? 'Unavailable' : 'Checking…' : !view.enabled ? 'Not configured' : !proof ? 'Not queued' : ({ queued: 'Queued', submitted: 'Pending', confirmed: 'Recorded', failed: 'Needs retry' }[proof.status]);
  return <section className="blockchain-status anchor-panel" aria-label="Blockchain report verification"><div className="blockchain-heading"><h3>Blockchain</h3><span className="status-label" role="status">{label}</span></div><div className="disclosure-content">
    <p className="muted">{view?.warning ?? (proof?.status === 'confirmed' ? 'Transaction recorded. Verify against the live local chain.' : proof ? 'Anchoring: ' + proof.status : view?.enabled ? 'This version has not been queued. Save it again to anchor.' : 'Local anchoring is disabled.')}</p>
    <div className="report-actions"><button disabled={busy} onClick={() => void action('verify')}>Verify local anchor</button>{proof?.status === 'failed' && <button disabled={busy} onClick={() => void action('retry')}>Retry anchoring</button>}{proof && <button disabled={busy} onClick={() => void action('proof')}>Download anchor proof</button>}</div>
    {current?.message && <p role="status">{current.message}</p>}
    {proof && <details><summary>Transaction details</summary><dl className="proof-metadata"><dt>Chain</dt><dd>{proof.chainId}</dd><dt>Transaction</dt><dd><code>{proof.transactionHash ?? 'Pending'}</code></dd><dt>Contract</dt><dd><code>{proof.contractAddress}</code></dd><dt>Instance</dt><dd><code>{proof.instanceId}</code></dd><dt>Block</dt><dd>{proof.blockNumber ?? 'Pending'}</dd></dl></details>}
    <p className="small muted">Local demonstration. A matching hash does not validate findings or ML. Resetting the chain loses its history.</p>
  </div></section>;
}

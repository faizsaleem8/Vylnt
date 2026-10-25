import type { AnchorView, AnchorVerification } from '../core/anchor';

type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
/** Shared native controls keep dashboard/extension wording and cancellation consistent. */
export function anchorPanel(id: string, api: Api, current: () => boolean = () => true) {
  const node = document.createElement('section'); node.className = 'anchor-panel'; node.setAttribute('aria-label', 'Local blockchain report proof');
  const label = document.createElement('p'); label.textContent = 'Local blockchain';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = 'Loading anchor status…';
  const details = document.createElement('details'), summary = document.createElement('summary'), metadata = document.createElement('p');
  summary.textContent = 'Transaction details'; metadata.className = 'small muted'; details.append(summary, metadata); details.hidden = true;
  const verification = document.createElement('p'); verification.setAttribute('role', 'status');
  const note = document.createElement('p'); note.className = 'small muted'; note.textContent = 'Local demonstration only. A matching digest does not validate findings or ML. Deleting a scan cannot erase a submitted transaction; local chain resets invalidate verification.';
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined, stopped = false;
  const alive = () => !stopped && current() && node.isConnected;
  const request = <T>(suffix: string, init: RequestInit = {}) => api<T>(`/insight-reports/${id}/${suffix}`, { ...init, signal: controller.signal });
  function button(text: string, work: () => Promise<void>) {
    const b = document.createElement('button'); b.textContent = text;
    b.addEventListener('click', async () => { b.disabled = true; try { await work(); } catch { if (alive()) verification.textContent = 'Operation unavailable. Check the API and local node, then retry.'; } finally { if (alive()) b.disabled = false; } });
    return b;
  }
  const verify = button('Verify local anchor', async () => { const r = await request<AnchorVerification>('verify'); if (alive()) verification.textContent = r.result + ': ' + r.message; });
  const retry = button('Retry anchoring', async () => { await request('anchor/retry', { method: 'POST', body: '{}' }); if (alive()) { verification.textContent = 'Anchor retry queued.'; await refresh(); } }); retry.hidden = true;
  const proof = button('Download anchor proof', async () => {
    const record = await request('anchor-proof.json'); if (!alive()) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `vylnt-${id}-anchor-proof.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }); proof.hidden = true;
  node.append(label, status, details, verify, retry, proof, verification, note);
  async function refresh() {
    if (!alive()) { dispose(); return; }
    clearTimeout(timer);
    try {
      const view = await request<AnchorView>('anchor'); if (!alive()) return;
      status.textContent = view.enabled ? view.proof ? (view.proof.status === 'confirmed' ? 'Transaction recorded. Verify against the live local chain.' : 'Anchoring: ' + view.proof.status) + (view.proof.error ? ' ' + view.proof.error : '') : 'This version has not been queued. Save it again to anchor.' : view.warning ?? 'Local anchoring is disabled.';
      retry.hidden = !view.enabled || view.proof?.status !== 'failed'; proof.hidden = !view.proof;
      details.hidden = !view.proof;
      if (view.proof) { const p = view.proof; metadata.textContent = `Chain ${p.chainId} / Contract ${p.contractAddress} / Instance ${p.instanceId} / Transaction ${p.transactionHash ?? 'pending'} / Block ${p.blockNumber ?? 'pending'}`; }
      if (view.enabled && view.proof && ['queued', 'submitted'].includes(view.proof.status)) timer = setTimeout(() => void refresh(), 4000);
    } catch { if (alive()) status.textContent = 'Anchor status unavailable. Full reports remain accessible.'; }
  }
  function dispose() { stopped = true; clearTimeout(timer); controller.abort(); }
  timer = setTimeout(() => void refresh(), 0);
  return { node, dispose };
}

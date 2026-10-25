import React, { useEffect, useRef, useState } from 'react';
import type { LedgerView } from '../../../packages/core/anchor';

export function BlockchainLedger({ api }: { api: <T>(path: string, init?: RequestInit) => Promise<T> }) {
  const apiRef = useRef(api); apiRef.current = api;
  const [before, setBefore] = useState<number>();
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<LedgerView>();
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function load() {
      setBusy(true);
      try {
        const next = await apiRef.current<LedgerView>('/blockchain/ledger' + (before === undefined ? '' : `?before=${before}`), { signal: controller.signal });
        if (!controller.signal.aborted) setData(next);
      } catch {
        if (!controller.signal.aborted) setData({ result: 'unavailable', message: 'The API could not read the local ledger. Check your connection and retry.', entries: [] });
      } finally {
        if (!controller.signal.aborted) { setBusy(false); timer = setTimeout(() => void load(), 10000); }
      }
    }
    setData(undefined); void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [before, refresh]);
  function exportPage() {
    if (data?.result !== 'live') return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `vylnt-ledger-${data.fromBlock}-${data.toBlock}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="panel ledger" aria-label="Local blockchain ledger">
    <p><a href="/ledger.html" target="_blank" rel="noopener noreferrer">Open separate demo explorer ↗</a></p>
    <div className="section-heading"><div><h2>Report anchors</h2><p className="muted">Actual transactions from the VYLNT contract on your local chain.</p></div><div className="report-actions"><button disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh ledger</button><button disabled={busy || data?.result !== 'live'} onClick={exportPage}>Export ledger JSON</button></div></div>
    <p role="status">{busy ? 'Reading local blockchain…' : data?.result === 'live' ? `Live node · latest block ${data.latestBlock} · showing blocks ${data.fromBlock}–${data.toBlock}` : data?.message}</p>
    {data?.result === 'live' && <>
      <dl className="ledger-network"><dt>Network</dt><dd>Local Hardhat · chain {data.chainId}</dd><dt>Contract</dt><dd><code>{data.contractAddress}</code></dd><dt>Deployment instance</dt><dd><code>{data.instanceId}</code></dd><dt>Last checked</dt><dd>{new Date(data.checkedAt!).toLocaleString()}</dd></dl>
      <p className="small muted">{data.entries.length} anchor events in this block range. This contract ledger contains only hashes and transaction metadata, across this local deployment. No website or account details are shown.</p>
      <ol className="ledger-entries">{data.entries.map(entry => <li key={entry.transactionHash}><div className="ledger-entry-heading"><h3>Block #{entry.blockNumber}</h3><span className="small muted">{new Date(entry.timestamp * 1000).toLocaleString()}</span><span className="status-label">Recorded on chain</span></div><dl><dt>Report SHA-256</dt><dd><code>{entry.reportHash}</code></dd><dt>Transaction</dt><dd><code>{entry.transactionHash}</code></dd></dl><details><summary>Block links</summary><dl><dt>Block hash</dt><dd><code>{entry.blockHash}</code></dd><dt>Parent block hash</dt><dd><code>{entry.parentHash}</code></dd></dl><p className="small muted">The parent hash links this block to the preceding block, which may contain other transactions.</p></details></li>)}</ol>
      {!data.entries.length && <p>No report anchors in this range. Generate insights from a saved scan, or check another block range.</p>}
      <div className="pagination"><button disabled={busy || before === undefined} onClick={() => setBefore(undefined)}>Latest blocks</button><button disabled={busy || data.nextBefore === undefined} onClick={() => setBefore(data.nextBefore)}>Older blocks</button></div>
    </>}
    <p className="small muted">Local demonstration only. Resetting the node loses its history. A recorded hash does not validate findings or ML accuracy. Use “Verify local anchor” inside a scan report to check that report’s content.</p>
  </section>;
}

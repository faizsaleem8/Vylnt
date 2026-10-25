import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { DemoLedgerView } from '../../../packages/core/anchor';
import '../../../packages/ui/theme.css';
import './ledger-demo.css';

function Demo() {
  const [data, setData] = useState<DemoLedgerView>();
  const [before, setBefore] = useState<number>();
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function load() {
      setBusy(true);
      try {
        const response = await fetch('/demo-api/ledger' + (before === undefined ? '' : `?before=${before}`), { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error();
        const next: DemoLedgerView = await response.json();
        if (!controller.signal.aborted) setData(next);
      } catch { if (!controller.signal.aborted) setData({ result: 'unavailable', message: 'Cannot read the demo ledger. Start or restart the VYLNT API and check the local node.', entries: [], accounts: [] }); }
      finally { if (!controller.signal.aborted) { setBusy(false); timer = setTimeout(() => void load(), 10000); } }
    }
    setData(undefined); void load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [before, refresh]);
  return <main><header><div><p className="demo-eyebrow">VYLNT / LOCAL BLOCKCHAIN EXPLORER</p><h1>VYLNT blockchain ledger</h1><p>One shared chain. Report anchors organised by anonymous account.</p></div><button disabled={busy} onClick={() => setRefresh(n => n + 1)}>Refresh ledger</button></header>
    <section className="demo-network" aria-label="Network status"><p role="status">{busy ? 'Reading live blockchain…' : data?.result === 'live' ? `Live · Chain ${data.chainId} · Head block #${data.latestBlock} · Range ${data.fromBlock}–${data.toBlock}` : data?.message}</p>{data?.result === 'live' && <><span>Contract <code>{data.contractAddress}</code></span><span>Checked {new Date(data.checkedAt!).toLocaleTimeString()}</span></>}</section>
    <p className="demo-caption">Account grouping comes from this API’s local journal, not from the smart contract. Only accounts known to this installation are listed. No names, emails or report contents are shown.</p>
    {data?.result === 'live' && <section aria-label="Account ledgers">{data.accounts.map(account => <section className="account-lane" key={account.label} aria-label={account.label}><div className="lane-title"><h2>{account.label}</h2><span>{account.entries.length} anchors in this range</span></div>{account.entries.length ? <ol className="block-chain">{account.entries.map(entry => <li key={entry.transactionHash}><article className="block-card"><div className="block-title"><h3>Block #{entry.blockNumber}</h3><span>Recorded</span></div><p className="block-time">{new Date(entry.timestamp * 1000).toLocaleString()}</p><p className="field-label">Report SHA-256</p><code>{entry.reportHash}</code><details><summary>Transaction &amp; block details</summary><dl><dt>Transaction</dt><dd><code>{entry.transactionHash}</code></dd><dt>Block hash</dt><dd><code>{entry.blockHash}</code></dd><dt>Parent block hash</dt><dd><code>{entry.parentHash}</code></dd></dl></details></article></li>)}</ol> : <p className="empty-lane">No anchors in this block range. Check older blocks or generate a saved insights report.</p>}</section>)}{!data.accounts.length && <p className="empty-lane">No accounts with known anchor jobs yet. Save insights from your test accounts to populate the demo.</p>}</section>}
    {data?.result === 'live' && <nav aria-label="Ledger block ranges"><button disabled={busy || before === undefined} onClick={() => setBefore(undefined)}>Latest blocks</button><button disabled={busy || data.nextBefore === undefined} onClick={() => setBefore(data.nextBefore)}>Older blocks</button></nav>}
    <footer>Arrows show the order of report anchors within each account; intervening blocks may belong to other accounts. Actual parent hashes appear in the block details. This is a disposable local chain, not public attestation or proof of scan/ML accuracy. <a href="/">Open dashboard</a></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Demo />);

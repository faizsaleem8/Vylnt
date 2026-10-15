import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Finding, Report, Severity } from '../../../packages/core';
import type { StoredScan } from '../../server/store';
import type { FeedbackInput } from '../../../packages/core/validation';
import './styles.css';
import { createMemoryClient, type SupabaseConfig } from './auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseLogin } from './SupabaseLogin';

type Summary = { scanId: string; url: string; scannedAt: string; score: number; findingCount: number; highCount: number; coverage: { headers: boolean; dom: boolean; cookies: boolean }; hash: string };
type Site = { origin: string; scanCount: number; latest: Summary };
const formatTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const verdicts = { open: 'Open', fixed: 'Fixed', accepted_risk: 'Accepted risk', false_positive: 'False positive' };
function download(name: string, data: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function Badge({ severity }: { severity: Severity }) { return <span className={`badge ${severity}`}>{severity}</span>; }
function App() {
  // Tokens live only in this page's memory and are discarded on reload/disconnect.
  const [token, setToken] = useState(''); const [draftToken, setDraftToken] = useState('');
  const [view, setView] = useState('Overview'); const [scans, setScans] = useState<Summary[]>([]);
  const [sites, setSites] = useState<Site[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StoredScan>(); const [previous, setPrevious] = useState<StoredScan>();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all'); const [query, setQuery] = useState(''); const [mode, setMode] = useState('');
  const [client, setClient] = useState<SupabaseClient>(); const [authConfig, setAuthConfig] = useState<SupabaseConfig>();
  const importRef = useRef<HTMLInputElement>(null); const requestSequence = useRef(0);
  async function api<T>(path: string, init: RequestInit = {}, authToken = token): Promise<T> {
    const response = await fetch(`/api${path}`, { ...init, headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json', ...init.headers } });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error ?? `Request failed (${response.status})`); }
    return response.status === 204 ? undefined as T : response.json();
  }
  async function refresh(authToken = token, targetPage = page) {
    const [data, siteData] = await Promise.all([api<{ scans: Summary[]; total: number }>(`/scans?page=${targetPage}&limit=30`, {}, authToken), api<{ sites: Site[] }>('/sites', {}, authToken)]);
    setScans(data.scans); setTotal(data.total); setSites(siteData.sites); setPage(targetPage);
  }
  async function action(work: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); } }
  async function openScan(id: string) {
    const seq = ++requestSequence.current;
    await action(async () => { const scan = await api<StoredScan>(`/scans/${id}`); if (seq !== requestSequence.current) return; setSelected(scan); setPrevious(undefined); setView('Scan details'); setFilter('all'); });
  }
  function clearWorkspace() { ++requestSequence.current; setToken(''); setDraftToken(''); setScans([]); setSites([]); setSelected(undefined); setPrevious(undefined); setTotal(0); setPage(1); setView('Overview'); setError(''); setNotice(''); }
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/config').then(async r => { if (!r.ok) throw new Error('Unable to load workspace configuration.'); return r.json(); }).then(config => {
      if (cancelled) return;
      setMode(config.mode);
      if (config.mode === 'supabase') {
        if (!config.supabase?.url || !config.supabase?.publishableKey) throw new Error('Supabase sign-in is not configured.');
        setAuthConfig(config.supabase); setClient(createMemoryClient(config.supabase));
      }
    }).catch(e => { if (!cancelled) { setMode('unavailable'); setError(e.message); } });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!client) return;
    // Keep callbacks synchronous: Supabase auth operations acquire their own lock.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) setToken(session.access_token);
      if (event === 'SIGNED_OUT') clearWorkspace();
    });
    return () => { data.subscription.unsubscribe(); void client.auth.dispose(); };
  }, [client]);
  async function disconnect() {
    setBusy(true);
    try {
      if (client) { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw error; }
      clearWorkspace();
    } catch { clearWorkspace(); setNotice('Disconnected on this device. Remote sign-out could not be confirmed.'); }
    finally { if (client && authConfig) { await client.auth.dispose(); setClient(createMemoryClient(authConfig)); } setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    await action(async () => {
      if (file.size > 524288) throw new Error('Reports must be smaller than 512 KB.');
      const report = JSON.parse(await file.text()) as Report;
      const result = await api<StoredScan>('/scans', { method: 'POST', body: JSON.stringify({ scanId: report.scanId, observation: report.observation }) });
      await refresh(token, 1); setSelected(result); setView('Scan details'); setPrevious(undefined); setNotice('Report imported. Findings and score were recalculated by the API.');
    });
  }
  const latestHigh = sites.reduce((sum, site) => sum + site.latest.highCount, 0);
  const average = sites.length ? Math.round(sites.reduce((sum, site) => sum + site.latest.score, 0) / sites.length) : undefined;
  const filteredScans = scans.filter(s => s.url.toLowerCase().includes(query.toLowerCase()));
  const navigation = ['Overview', 'Websites', 'History', 'Settings'];
  const compare = previous && selected ? {
    added: selected.report.findings.filter(f => !previous.report.findings.some(p => p.id === f.id)),
    removed: previous.report.findings.filter(f => !selected.report.findings.some(p => p.id === f.id))
  } : undefined;
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); setView('Overview'); }}>V<span>Y</span>NLT<i>◆</i></a><p className="sidebar-caption">SECURITY WORKSPACE</p>
      <nav aria-label="Main navigation">{navigation.map((item, i) => <button key={item} className={view === item ? 'active' : ''} onClick={() => { setView(item); setError(''); }}><span>{['◈', '◎', '◷', '⚙'][i]}</span>{item}{item === 'History' && <small>{total}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><span className="connection-dot" />{token ? 'Workspace connected' : 'Awaiting connection'}<p>{mode === 'supabase' ? 'Supabase · user-scoped data' : 'Local development workspace'}</p><span className="version">VYNLT / 0.2</span></div>
    </aside>
    <div className="main-shell"><header className="topbar"><span>Workspace <b>/</b> {view}</span><div><span className="mode-pill">{mode === 'supabase' ? 'SUPABASE' : mode === 'local' ? 'LOCAL' : 'CONNECTING'}</span>{token && <button disabled={busy} className="text-button" onClick={() => void disconnect()}>{client ? 'Sign out' : 'Disconnect'}</button>}</div></header>
      <main><div className="page-heading"><div><p className="eyebrow">OBSERVE. UNDERSTAND. IMPROVE.</p><h1>{view === 'Overview' ? 'Your security overview' : view === 'Scan details' ? 'Scan report' : view}</h1><p className="muted">{view === 'Overview' ? 'Evidence-backed observations. Clear next steps.' : view === 'Scan details' ? 'Inspect the evidence before deciding what to fix.' : 'Keep track of your websites and their security configuration.'}</p></div>
        {token && <div className="heading-actions"><button disabled={busy} onClick={() => void action(() => refresh())}>↻ Refresh</button><button className="primary" disabled={busy} onClick={() => importRef.current?.click()}>↑ Import report</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></div>}
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}{notice && <div className="alert success" role="status">{notice}</div>}{busy && <p className="loading" role="status">Working…</p>}
      {!token ? mode === 'supabase' && client ? <SupabaseLogin client={client} onSignedIn={async accessToken => { await refresh(accessToken, 1); setToken(accessToken); setError(''); setNotice('Signed in to your Supabase workspace.'); }} /> : mode === 'local' ? <section className="connect-card"><div className="connect-symbol">◇</div><div><p className="eyebrow">CONNECT YOUR WORKSPACE</p><h2>Bring your scans together.</h2><p className="muted">Connect to view history, compare findings, and track remediation. Your token stays in this page’s memory.</p><form onSubmit={e => { e.preventDefault(); void action(async () => { await refresh(draftToken.trim(), 1); setToken(draftToken.trim()); setDraftToken(''); }); }}><label htmlFor="token">Local API token from your .env file</label><input id="token" type="password" value={draftToken} onChange={e => setDraftToken(e.target.value)} autoComplete="off" required placeholder="Paste your access token" /><button className="primary" disabled={busy || !draftToken.trim()}>Connect workspace →</button></form><p className="small muted">First time? Run <code>npm run setup:local</code>, then open <code>.env</code> to copy your token.</p></div></section> : <p className="muted">{mode === 'unavailable' ? 'Check the server configuration and reload to retry.' : 'Loading sign-in…'}</p> : <>
      {view === 'Overview' && <><section className="metric-grid"><Metric label="STORED SCANS" value={total} subtitle="Reports in this workspace" /><Metric label="MONITORED WEBSITES" value={sites.length} subtitle="Unique origins observed" /><Metric label="HIGH / CRITICAL" value={latestHigh} subtitle="Across each site's latest scan" warning={latestHigh > 0} /><Metric label="AVG. CONFIGURATION SCORE" value={average === undefined ? '—' : `${average}/100`} subtitle="Latest scan per website · heuristic" /></section>
        <section className="overview-grid"><div className="panel"><div className="section-heading"><h2>Latest observations</h2><button className="text-button" onClick={() => setView('History')}>View history ↗</button></div>{sites.length ? sites.slice(0, 5).map(site => <button key={site.origin} className="site-line" onClick={() => void openScan(site.latest.scanId)}><div className="site-icon">◎</div><div><strong>{new URL(site.origin).host}</strong><p className="muted">{formatTime(site.latest.scannedAt)} · {site.latest.findingCount} findings</p></div><span className="score-mini">{site.latest.score}<small>/100</small></span><span className="arrow">↗</span></button>) : <Empty title="Your workspace is ready." text="Scan a localhost page with the extension or CLI, then import its JSON report here." />}</div>
        <div className="panel guide"><p className="eyebrow">YOUR NEXT STEP</p><h2>Turn observations<br />into improvements.</h2><p>Start with high-severity findings, confirm their context, and record your decision.</p><ol><li>Scan a site you own</li><li>Review evidence and coverage</li><li>Fix, rescan, and compare</li></ol><div className="guide-note">A score is a configuration heuristic, not a guarantee that a website is secure.</div></div></section></>}
      {view === 'Websites' && <section className="site-grid">{sites.length ? sites.map(site => <button key={site.origin} className="panel site-card" onClick={() => void openScan(site.latest.scanId)}><span className="site-icon">◎</span><h2>{new URL(site.origin).host}</h2><p className="muted">{site.origin}</p><div className="site-card-score"><span>{site.latest.score}<small>/100</small></span><span>{site.latest.findingCount} findings</span></div><p className="muted">{site.scanCount} scans · Latest {formatTime(site.latest.scannedAt)}</p></button>) : <Empty title="No websites yet" text="Import a scan to add your first website." />}</section>}
      {view === 'History' && <section className="panel"><div className="section-heading"><h2>Scan history <span className="muted">({total})</span></h2><input className="search" aria-label="Filter current page by URL" placeholder="Filter this page by URL…" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="table-wrap"><table><thead><tr><th>Website / page</th><th>Observed</th><th>Findings</th><th>Score</th><th>Coverage</th><th /></tr></thead><tbody>{filteredScans.map(scan => <tr key={scan.scanId}><td><button className="text-button url" onClick={() => void openScan(scan.scanId)}>{scan.url}</button></td><td>{formatTime(scan.scannedAt)}</td><td>{scan.findingCount}{scan.highCount > 0 && <span className="high-count">{scan.highCount} high</span>}</td><td className="score-cell">{scan.score}/100</td><td>{Object.values(scan.coverage).every(Boolean) ? 'Core observed' : 'Partial'}</td><td><button aria-label={`Open scan for ${scan.url}`} className="text-button" onClick={() => void openScan(scan.scanId)}>↗</button></td></tr>)}</tbody></table></div>{!filteredScans.length && <Empty title="No matching scans" text={total ? 'Try a different filter or page.' : 'Import your first scan to start building a history.'} />}<div className="pagination"><button disabled={busy || page <= 1} onClick={() => void action(() => refresh(token, page - 1))}>← Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / 30))}</span><button disabled={busy || page * 30 >= total} onClick={() => void action(() => refresh(token, page + 1))}>Next →</button></div></section>}
      {view === 'Scan details' && selected && <><section className="panel scan-summary"><div className="large-score">{selected.report.score}<small>/100</small></div><div><h2 className="url">{selected.report.observation.url}</h2><p className="muted">{formatTime(selected.report.observation.scannedAt)} · Ruleset {selected.report.rulesetVersion}</p><div className="coverage">{[['Headers', selected.report.observation.headers !== undefined], ['DOM', selected.report.observation.domCollected], ['Cookies', selected.report.observation.cookies !== undefined]].map(([label, observed]) => <span key={String(label)} className={observed ? 'observed' : 'missing'}>{observed ? '✓' : '○'} {label}: {observed ? 'observed' : 'not observed'}</span>)}</div></div><div className="export-actions"><button onClick={() => download(`vynlt-${selected.report.scanId}.json`, selected.report)}>Export JSON ↓</button><button onClick={() => window.print()}>Print / PDF</button></div></section>
        <div className="scan-tools"><label>Filter findings <select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All severities</option>{['critical','high','medium','low','info'].map(s => <option key={s}>{s}</option>)}</select></label><label>Compare with <select value={previous?.report.scanId ?? ''} onChange={e => { const id = e.target.value; if (!id) setPrevious(undefined); else void action(async () => setPrevious(await api<StoredScan>(`/scans/${id}`))); }}><option value="">Select another scan on this history page</option>{scans.filter(s => s.scanId !== selected.report.scanId && s.url === selected.report.observation.url).map(s => <option key={s.scanId} value={s.scanId}>{formatTime(s.scannedAt)} · {s.score}/100</option>)}</select></label></div>
        {compare && <div className="alert success">Compared with {formatTime(previous!.report.observation.scannedAt)}: {compare.added.length} new findings, {compare.removed.length} no longer observed. Score change: {selected.report.score - previous!.report.score}. Differences can reflect changed collection coverage.</div>}
        <div className="section-heading"><h2>Findings <span className="muted">/ {selected.report.findings.length}</span></h2><span className="small muted">Confidence and context matter.</span></div>
        {selected.report.findings.filter(f => filter === 'all' || f.severity === filter).map(f => <FindingCard key={`${selected.report.scanId}:${f.id}`} finding={f} feedback={selected.feedback.find(item => item.findingId === f.id)} busy={busy} onSave={input => action(async () => { await api(`/scans/${selected.report.scanId}/findings/${encodeURIComponent(f.id)}/feedback`, { method: 'POST', body: JSON.stringify(input) }); setSelected(await api(`/scans/${selected.report.scanId}`)); setNotice('Review decision saved. Original scan evidence and score are unchanged.'); })} />)}
        {!selected.report.findings.length && <Empty title="No findings from the observed checks" text="Review coverage before interpreting this result. A clean scan is not a complete security assessment." />}
        <section className="panel integrity"><div><h3>Report integrity</h3><p className="muted">SHA-256 of the saved report. This is a local consistency check; it is not blockchain anchored.</p><code>{selected.hash}</code></div><button disabled={busy} onClick={() => void action(async () => { const result = await api<{ matches: boolean }>(`/reports/${selected.report.scanId}/verify`); setNotice(result.matches ? 'Stored report matches its saved SHA-256 hash. No blockchain anchoring has been performed.' : 'Report hash mismatch detected.'); })}>Verify hash</button></section>
      </>}
      {view === 'Settings' && <section className="panel settings"><h2>Workspace settings</h2><dl><dt>Storage mode</dt><dd>{mode === 'supabase' ? 'Supabase PostgreSQL' : 'Local JSON file (.local/scans.json)'}</dd><dt>Authentication</dt><dd>{mode === 'supabase' ? 'Verified Supabase user JWT' : 'Loopback-only API token'}</dd><dt>Privacy</dt><dd>Cookie values and page text are rejected. URL query strings, credentials and fragments are removed. Paths, cookie names and review notes remain in reports.</dd><dt>Retention</dt><dd>{mode === 'supabase' ? 'API lists up to the 1,000 most recent scans; configure archival before larger deployments.' : 'Up to 1,000 stored scans. Delete individual reports below.'} The extension keeps its own most recent 30 scans.</dd></dl><h3>Delete a stored report</h3><p className="muted">This removes its evidence and review decisions from this workspace. Extension-local history is separate.</p><div className="delete-list">{scans.slice(0, 10).map(scan => <div key={scan.scanId}><span className="url">{scan.url}<small>{formatTime(scan.scannedAt)}</small></span><button disabled={busy} className="danger" onClick={() => { if (confirm('Permanently delete this stored scan and its review decisions?')) void action(async () => { await api(`/scans/${scan.scanId}`, { method: 'DELETE' }); await refresh(token, 1); if (selected?.report.scanId === scan.scanId) setSelected(undefined); }); }}>Delete</button></div>)}</div></section>}
      </>}
      <footer>VYNLT · Web security observations<span>Configuration signals, not proof of exploitability.</span></footer></main>
    </div>
  </div>;
}
function Metric({ label, value, subtitle, warning = false }: { label: string; value: string | number; subtitle: string; warning?: boolean }) { return <div className={`metric panel ${warning ? 'warning' : ''}`}><p className="eyebrow">{label}</p><strong>{value}</strong><p className="muted">{subtitle}</p></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><span>◇</span><h3>{title}</h3><p>{text}</p></div>; }
function FindingCard({ finding, feedback, busy, onSave }: { finding: Finding; feedback?: FeedbackInput; busy: boolean; onSave: (input: FeedbackInput) => Promise<void> }) {
  const [verdict, setVerdict] = useState<FeedbackInput['verdict']>(feedback?.verdict ?? 'open'); const [notes, setNotes] = useState(feedback?.notes ?? '');
  return <details className="finding"><summary><Badge severity={finding.severity} /><strong>{finding.title}</strong><span className="finding-status">{verdicts[feedback?.verdict ?? 'open']}</span><code>{finding.ruleId}</code><span>⌄</span></summary><div className="finding-content"><p>{finding.description}</p><p className="muted">{finding.confidence} confidence · <span className="url">{finding.url}</span></p><div className="finding-columns"><section><h3>Observed evidence</h3><pre>{JSON.stringify(finding.evidence, null, 2)}</pre></section><section><h3>Recommended action</h3><p>{finding.recommendation}</p></section></div><form className="feedback" onSubmit={e => { e.preventDefault(); void onSave({ verdict, notes }); }}><label>Review decision<select value={verdict} onChange={e => setVerdict(e.target.value as FeedbackInput['verdict'])}>{Object.entries(verdicts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="notes">Review notes<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} placeholder="Add context or a remediation reference. Do not include secrets." /></label><button disabled={busy} type="submit">Save decision</button></form></div></details>;
}
createRoot(document.getElementById('root')!).render(<App />);

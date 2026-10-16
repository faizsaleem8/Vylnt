import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Finding, Report, Severity } from '../../../packages/core';
import type { StoredScan } from '../../server/store';
import type { ScanSummary as Summary, SiteSummary as Site, ScanPage, SitePage } from '../../../packages/core/summary';
import type { FeedbackInput } from '../../../packages/core/validation';
import { rateLimitMessage, retryDeadline } from '../../../packages/http/retry';
import '../../../packages/ui/theme.css';
import './styles.css';
import { createMemoryClient, type SupabaseConfig } from './auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseLogin } from './SupabaseLogin';
import { ComparisonPicker } from './ComparisonPicker';
import { compareReports, comparisonCaveat } from '../../../packages/core/comparison';

const formatTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const verdicts = { open: 'Open', fixed: 'Fixed', accepted_risk: 'Accepted risk', false_positive: 'False positive' };
function download(name: string, data: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function Badge({ severity }: { severity: Severity }) { return <span className={`badge ${severity}`}>{severity}</span>; }
type IconName = 'overview' | 'globe' | 'history' | 'settings' | 'shield' | 'arrow' | 'chevron' | 'refresh' | 'upload' | 'download';
function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></>,
    history: <><path d="M3 11a9 9 0 1 1 2.8 7.4M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
    settings: <><path d="M9.3 3h5.4l.7 2.4 2 .9 2.3-.6 2.7 4.6-1.7 1.8v2.2l1.7 1.8-2.7 4.6-2.3-.6-2 .9-.7 2.4H9.3l-.7-2.4-2-.9-2.3.6-2.7-4.6 1.7-1.8v-2.2l-1.7-1.8 2.7-4.6 2.3.6 2-.9.7-2.4Z" transform="translate(1 0) scale(.92)" /><circle cx="12" cy="12" r="3" /></>,
    shield: <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    refresh: <><path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5" /></>,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />,
    download: <path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5" />
  };
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
const coverageColumns = [['headers', 'Headers'], ['dom', 'DOM'], ['cookies', 'Cookies']] as const;
function CoverageCell({ observed, label }: { observed: boolean; label?: string }) {
  return <span className="coverage-cell" data-observed={observed}>{label && <strong>{label}</strong>}<span>{observed ? 'Observed' : 'Not observed'}</span></span>;
}
function CoverageMatrix({ sites, total, onOpen }: { sites: Site[]; total: number; onOpen: (id: string) => void }) {
  return <section className="panel coverage-panel" aria-labelledby="coverage-title"><div className="section-heading"><div><h2 id="coverage-title">Collection coverage</h2><p className="muted">What the latest scan of each website could observe.</p></div><div className="coverage-legend" aria-hidden="true"><span>Observed</span><span>Not observed</span></div></div>
    {sites.length ? <><table className="coverage-table" aria-labelledby="coverage-title"><thead><tr><th scope="col">Website</th>{coverageColumns.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}</tr></thead><tbody>{sites.slice(0, 5).map(site => <tr key={site.origin}><th scope="row"><button className="text-button" onClick={() => onOpen(site.latest.scanId)}>{new URL(site.origin).host}</button></th>{coverageColumns.map(([key]) => <td key={key}><CoverageCell observed={site.latest.coverage[key]} /></td>)}</tr>)}</tbody></table><p className="coverage-note">Showing {Math.min(5, sites.length)} of {total} websites. Observed means collected; it does not mean secure.</p></> : <Empty title="Coverage starts with a scan" text="Scan an enabled website in the signed-in side panel, then refresh here. Headers, DOM and cookie coverage will appear with the saved report." />}
  </section>;
}
function App() {
  // Tokens live only in this page's memory and are discarded on reload/disconnect.
  const [token, setToken] = useState(''); const [draftToken, setDraftToken] = useState('');
  const [view, setView] = useState('Overview'); const [scans, setScans] = useState<Summary[]>([]);
  const [sites, setSites] = useState<Site[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [websiteRows, setWebsiteRows] = useState<Site[]>([]); const [sitePage, setSitePage] = useState(1);
  const [siteTotal, setSiteTotal] = useState(0); const [overview, setOverview] = useState<SitePage['overview']>({ latestHigh: 0, averageScore: null });
  const workspaceGeneration = useRef(0);
  const [selected, setSelected] = useState<StoredScan>(); const [previous, setPrevious] = useState<Report>();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all'); const [query, setQuery] = useState(''); const [mode, setMode] = useState('');
  const [client, setClient] = useState<SupabaseClient>(); const [authConfig, setAuthConfig] = useState<SupabaseConfig>();
  const importRef = useRef<HTMLInputElement>(null); const requestSequence = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null); const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => { if (focusRequest) headingRef.current?.focus(); }, [focusRequest]);
  function navigate(nextView: string) { ++requestSequence.current; setView(nextView); setError(''); setFocusRequest(value => value + 1); }
  async function api<T>(path: string, init: RequestInit = {}, authToken = token): Promise<T> {
    const response = await fetch(`/api${path}`, { ...init, headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json', ...init.headers } });
    if (response.status === 429) throw new Error(rateLimitMessage(retryDeadline(response.headers.get('Retry-After'))));
    if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error ?? `Request failed (${response.status})`); }
    return response.status === 204 ? undefined as T : response.json();
  }
  async function refresh(authToken = token, targetPage = page) {
    const generation = workspaceGeneration.current;
    const [data, siteData] = await Promise.all([api<ScanPage>(`/scans?page=${targetPage}&limit=30`, {}, authToken), api<SitePage>('/sites?page=1&limit=30', {}, authToken)]);
    if (generation !== workspaceGeneration.current) return;
    setScans(data.scans); setTotal(data.total); setSites(siteData.sites); setPage(data.page);
    setWebsiteRows(siteData.sites); setSitePage(1); setSiteTotal(siteData.total); setOverview(siteData.overview);
  }
  async function loadSites(targetPage: number) {
    const generation = workspaceGeneration.current;
    const data = await api<SitePage>(`/sites?page=${targetPage}&limit=30`);
    if (generation !== workspaceGeneration.current) return;
    setWebsiteRows(data.sites); setSitePage(data.page); setSiteTotal(data.total); setOverview(data.overview);
  }
  async function action(work: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); } }
  async function openScan(id: string) {
    const seq = ++requestSequence.current;
    await action(async () => { const scan = await api<StoredScan>(`/scans/${id}`); if (seq !== requestSequence.current) return; setSelected(scan); setPrevious(undefined); setView('Scan details'); setFilter('all'); setFocusRequest(value => value + 1); });
  }
  function clearWorkspace() { ++requestSequence.current; ++workspaceGeneration.current; setToken(''); setDraftToken(''); setScans([]); setSites([]); setWebsiteRows([]); setSitePage(1); setSiteTotal(0); setOverview({ latestHigh: 0, averageScore: null }); setSelected(undefined); setPrevious(undefined); setTotal(0); setPage(1); setView('Overview'); setError(''); setNotice(''); }
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/config').then(async r => { if (r.status === 429) throw new Error(rateLimitMessage(retryDeadline(r.headers.get('Retry-After')))); if (!r.ok) throw new Error('Unable to load workspace configuration.'); return r.json(); }).then(config => {
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
      await refresh(token, 1); setSelected(result); setView('Scan details'); setPrevious(undefined); setFilter('all'); setFocusRequest(value => value + 1); setNotice('Report imported. Findings and score were recalculated by the API.');
    });
  }
  const latestHigh = overview.latestHigh;
  const average = overview.averageScore;
  const filteredScans = scans.filter(s => s.url.toLowerCase().includes(query.toLowerCase()));
  const navigation = ['Overview', 'Websites', 'History', 'Settings'];
  const navigationIcons: IconName[] = ['overview', 'globe', 'history', 'settings'];
  const currentNavigation = view === 'Scan details' ? 'History' : view;
  const visibleFindings = selected?.report.findings.filter(finding => filter === 'all' || finding.severity === filter) ?? [];
  const compare = previous && selected ? compareReports(selected.report, previous) : undefined;
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('Overview'); }}><Icon name="shield" />VYNLT</a><p className="sidebar-caption">Security workspace</p>
      <nav aria-label="Main navigation">{navigation.map((item, i) => <button key={item} className={currentNavigation === item ? 'active' : ''} aria-current={currentNavigation === item ? 'page' : undefined} onClick={() => navigate(item)}><Icon name={navigationIcons[i]} />{item}{item === 'History' && <small>{total}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><span className="connection-dot" />{token ? 'Workspace connected' : 'Awaiting connection'}<p>{mode === 'supabase' ? 'Supabase, user-scoped data' : 'Local development workspace'}</p><span className="version">VYNLT / 0.2</span></div>
    </aside>
    <div className="main-shell"><header className="topbar"><span>Workspace <b>/</b> {view}</span><div><span className="mode-pill">{mode === 'supabase' ? 'Supabase' : mode === 'local' ? 'Local' : 'Connecting'}</span>{token && <button disabled={busy} className="text-button" onClick={() => void disconnect()}>{client ? 'Sign out' : 'Disconnect'}</button>}</div></header>
      <main><div className="page-heading"><div><h1 ref={headingRef} tabIndex={-1}>{view === 'Overview' ? 'Security observations' : view === 'Scan details' ? 'Scan report' : view}</h1><p className="muted">{view === 'Overview' ? 'Read the findings. Know what was observed.' : view === 'Scan details' ? 'Inspect the evidence before deciding what to fix.' : view === 'Settings' ? 'Manage stored reports and understand your workspace’s data boundaries.' : view === 'History' ? 'Find a saved scan and review the evidence collected at that time.' : 'Open the latest report for each website you have observed.'}</p></div>
        {token && <div className="heading-actions"><button className="primary" disabled={busy} onClick={() => void action(() => refresh())}><Icon name="refresh" />Refresh</button><button disabled={busy} onClick={() => importRef.current?.click()}><Icon name="upload" />Import report</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} /></div>}
      </div>
      <div className="status-region">{error ? <div className="alert error" role="alert">{error}</div> : busy ? <p className="loading" role="status">Working…</p> : notice ? <div className="alert success" role="status">{notice}</div> : null}</div>
      {!token ? mode === 'supabase' && client ? <SupabaseLogin client={client} onSignedIn={async accessToken => { await refresh(accessToken, 1); setToken(accessToken); setError(''); setNotice('Signed in to your Supabase workspace.'); }} /> : mode === 'local' ? <section className="connect-card"><div className="connect-symbol"><Icon name="shield" /></div><div><h2>Connect your workspace</h2><p className="muted">Connect to view history, compare findings, and track remediation. Your token stays in this page’s memory.</p><form onSubmit={e => { e.preventDefault(); void action(async () => { await refresh(draftToken.trim(), 1); setToken(draftToken.trim()); setDraftToken(''); }); }}><label htmlFor="token">Local API token from your .env file</label><input id="token" type="password" value={draftToken} onChange={e => setDraftToken(e.target.value)} autoComplete="off" required placeholder="Paste your access token" /><button className="primary" disabled={busy || !draftToken.trim()}>Connect workspace</button></form><p className="small muted">First time? Run <code>npm run setup:local</code>, then open <code>.env</code> to copy your token.</p></div></section> : <p className="muted">{mode === 'unavailable' ? 'Check the server configuration and reload to retry.' : 'Loading sign-in…'}</p> : <>
      {view === 'Overview' && <><section className="metric-grid"><Metric label="Saved scans" value={total} subtitle="Reports in this workspace" /><Metric label="Websites observed" value={siteTotal} subtitle="Unique origins observed" /><Metric label="High or critical" value={latestHigh} subtitle="Across each site's latest scan" warning={latestHigh > 0} /><Metric label="Average configuration score" value={average === null ? '—' : `${average}/100`} subtitle="Latest per website, heuristic" /></section>
        <section className="overview-grid" aria-label="Saved observations"><CoverageMatrix sites={sites} total={siteTotal} onOpen={id => void openScan(id)} /><div className="panel"><div className="section-heading"><h2>Latest observations</h2><button className="text-button" onClick={() => navigate('History')}>View history</button></div>{sites.length ? sites.slice(0, 5).map(site => <button key={site.origin} className="site-line" onClick={() => void openScan(site.latest.scanId)}><div className="site-icon"><Icon name="globe" /></div><div><strong>{new URL(site.origin).host}</strong><p className="muted">{formatTime(site.latest.scannedAt)} / {site.latest.findingCount} findings</p></div><span className="score-mini">{site.latest.score}<small>/100</small></span><Icon name="arrow" className="arrow" /></button>) : <p className="coverage-note">No saved observations yet. Your latest reports will appear here. You can also import a CLI or exported JSON report.</p>}</div>
</section></>}
      {view === 'Websites' && <><section className="site-grid">{websiteRows.length ? websiteRows.map(site => <button key={site.origin} className="panel site-card" onClick={() => void openScan(site.latest.scanId)}><span className="site-icon"><Icon name="globe" /></span><h2>{new URL(site.origin).host}</h2><p className="muted">{site.origin}</p><div className="site-card-score"><span>{site.latest.score}<small>/100</small></span><span>{site.latest.findingCount} findings</span></div><p className="muted">{site.scanCount} scans / Latest {formatTime(site.latest.scannedAt)}</p></button>) : <Empty title={siteTotal ? "No websites on this page" : "No websites yet"} text={siteTotal ? "Go to the previous page or refresh the workspace." : "Sign in through the VYNLT side panel and scan an enabled site. Keep the panel open for automatic saving, then refresh this workspace."} />}</section><div className="pagination" aria-label="Website pages"><button disabled={busy || sitePage <= 1} onClick={() => void action(() => loadSites(sitePage - 1))}>Previous</button><span>Page {sitePage} of {Math.max(1, Math.ceil(siteTotal / 30))} / {siteTotal} websites</span><button disabled={busy || sitePage * 30 >= siteTotal || sitePage >= 10000} onClick={() => void action(() => loadSites(sitePage + 1))}>Next</button></div></>}
      {view === 'History' && <section className="panel"><div className="section-heading"><h2>Scan history <span className="muted">({total})</span></h2><input className="search" aria-label="Filter current page by URL" placeholder="Filter this page by URL…" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="table-wrap"><table><thead><tr><th>Website / page</th><th>Observed</th><th>Findings</th><th>Score</th><th>Coverage</th><th /></tr></thead><tbody>{filteredScans.map(scan => <tr key={scan.scanId}><td><button className="text-button url" onClick={() => void openScan(scan.scanId)}>{scan.url}</button></td><td>{formatTime(scan.scannedAt)}</td><td>{scan.findingCount}{scan.highCount > 0 && <span className="high-count">{scan.highCount} high</span>}</td><td className="score-cell">{scan.score}/100</td><td>{Object.values(scan.coverage).every(Boolean) ? 'Core observed' : 'Partial'}</td><td><button aria-label={`Open scan for ${scan.url}`} className="text-button" onClick={() => void openScan(scan.scanId)}><Icon name="arrow" /></button></td></tr>)}</tbody></table></div>{!filteredScans.length && <Empty title="No matching scans" text={total ? 'Try a different filter or page.' : 'Scan an enabled site from the signed-in VYNLT side panel, then refresh to see your saved history.'} />}<div className="pagination"><button disabled={busy || page <= 1} onClick={() => void action(() => refresh(token, page - 1))}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / 30))}</span><button disabled={busy || page * 30 >= total || page >= 10000} onClick={() => void action(() => refresh(token, page + 1))}>Next</button></div></section>}
      {view === 'Scan details' && selected && <><section className="panel scan-summary"><div className="large-score">{selected.report.score}<small>/100</small><span className="score-caption">Heuristic configuration score</span></div><div><h2 className="url">{selected.report.observation.url}</h2><p className="muted">{formatTime(selected.report.observation.scannedAt)} / Ruleset {selected.report.rulesetVersion}</p><div className="coverage">{[['Headers', selected.report.observation.headers !== undefined], ['DOM', selected.report.observation.domCollected], ['Cookies', selected.report.observation.cookies !== undefined]].map(([label, observed]) => <CoverageCell key={String(label)} label={String(label)} observed={Boolean(observed)} />)}</div></div><div className="export-actions"><button onClick={() => download(`vynlt-${selected.report.scanId}.json`, selected.report)}>Export JSON <Icon name="download" /></button><button onClick={() => window.print()}>Print / PDF</button></div></section>
        <div className="scan-tools"><label>Filter findings <select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All severities</option>{['critical','high','medium','low','info'].map(s => <option key={s}>{s}</option>)}</select></label></div>
        <ComparisonPicker key={selected.report.scanId} report={selected.report} api={api} onChoose={setPrevious} />
        {compare && <section className="panel comparison-result" aria-label="Comparison result"><h3>Compared with {formatTime(previous!.observation.scannedAt)}</h3><p>{compare.added.length} newly observed · {compare.removed.length} no longer observed · {compare.changed.length} changed. Score change: {compare.scoreChange > 0 ? '+' : ''}{compare.scoreChange}.</p><p className="muted">{comparisonCaveat(compare)}</p>{[["Newly observed", compare.added], ["No longer observed", compare.removed]].map(([label, items]) => (items as Finding[]).length > 0 && <details key={String(label)}><summary>{String(label)} ({(items as Finding[]).length})</summary><ul>{(items as Finding[]).map(f => <li key={f.id}>{f.title} / {f.severity} / {f.url}</li>)}</ul></details>)}{compare.changed.length > 0 && <details><summary>Changed evidence or assessment ({compare.changed.length})</summary>{compare.changed.map(({ before, after }) => <div key={after.id}><h4>{after.title}</h4><p>Baseline: {before.severity}, {before.confidence} confidence</p><pre>{JSON.stringify(before.evidence, null, 2)}</pre><p>Selected: {after.severity}, {after.confidence} confidence</p><pre>{JSON.stringify(after.evidence, null, 2)}</pre></div>)}</details>}</section>}
        <div className="section-heading"><h2>Findings <span className="muted">/ {selected.report.findings.length}</span></h2><span className="small muted">Confidence and context matter.</span></div>
        {visibleFindings.map(f => <FindingCard key={`${selected.report.scanId}:${f.id}`} finding={f} feedback={selected.feedback.find(item => item.findingId === f.id)} busy={busy} onSave={input => action(async () => { await api(`/scans/${selected.report.scanId}/findings/${encodeURIComponent(f.id)}/feedback`, { method: 'POST', body: JSON.stringify(input) }); setSelected(await api(`/scans/${selected.report.scanId}`)); setNotice('Review decision saved. Original scan evidence and score are unchanged.'); })} />)}
        {selected.report.findings.length > 0 && visibleFindings.length === 0 && <Empty title="No matching findings" text={`This scan has no ${filter} findings.`} action={<button onClick={() => setFilter('all')}>Clear filter</button>} />}
        {!selected.report.findings.length && <Empty title="No findings from the observed checks" text="Review coverage before interpreting this result. A clean scan is not a complete security assessment." />}
        <section className="panel integrity"><div><h3>Report integrity</h3><p className="muted">SHA-256 of the saved report. This is a local consistency check; it is not blockchain anchored.</p><code>{selected.hash}</code></div><button disabled={busy} onClick={() => void action(async () => { const result = await api<{ matches: boolean }>(`/reports/${selected.report.scanId}/verify`); setNotice(result.matches ? 'Stored report matches its saved SHA-256 hash. No blockchain anchoring has been performed.' : 'Report hash mismatch detected.'); })}>Verify hash</button></section>
      </>}
      {view === 'Settings' && <section className="panel settings"><h2>Workspace settings</h2><dl><dt>Storage mode</dt><dd>{mode === 'supabase' ? 'Supabase PostgreSQL' : 'Local JSON file (.local/scans.json)'}</dd><dt>Authentication</dt><dd>{mode === 'supabase' ? 'Verified Supabase user JWT' : 'Loopback-only API token'}</dd><dt>Privacy</dt><dd>Cookie values and page text are rejected. URL query strings, credentials and fragments are removed. Paths, cookie names and review notes remain in reports.</dd><dt>Retention</dt><dd>{mode === 'supabase' ? 'History is paginated across stored scans. Reports remain until deleted; automatic archival is not configured.' : 'Up to 1,000 stored scans. Delete individual reports below.'} The extension temporarily holds up to 30 sanitized scans in browser-session memory. It has no persistent local report archive; saved reports belong to this workspace.</dd></dl><h3>Delete a stored report</h3><p className="muted">This removes its evidence and review decisions from this workspace. Temporary scans in the current browser session may remain until that session ends. Deleting a saved report does not erase the current page scan.</p><div className="delete-list">{scans.slice(0, 10).map(scan => <div key={scan.scanId}><span className="url">{scan.url}<small>{formatTime(scan.scannedAt)}</small></span><button disabled={busy} className="danger" onClick={() => { if (confirm('Permanently delete this stored scan and its review decisions?')) void action(async () => { await api(`/scans/${scan.scanId}`, { method: 'DELETE' }); await refresh(token, 1); if (selected?.report.scanId === scan.scanId) setSelected(undefined); }); }}>Delete</button></div>)}</div></section>}
      </>}
      <footer>VYNLT / Web security observations<span>Configuration signals, not proof of exploitability.</span></footer></main>
    </div>
  </div>;
}
function Metric({ label, value, subtitle, warning = false }: { label: string; value: string | number; subtitle: string; warning?: boolean }) { return <div className={`metric panel ${warning ? 'warning' : ''}`}><p className="eyebrow">{label}</p><strong>{value}</strong><p className="muted">{subtitle}</p></div>; }
function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) { return <div className="empty"><Icon name="shield" /><h3>{title}</h3><p>{text}</p>{action}</div>; }
function FindingCard({ finding, feedback, busy, onSave }: { finding: Finding; feedback?: FeedbackInput; busy: boolean; onSave: (input: FeedbackInput) => Promise<void> }) {
  const [verdict, setVerdict] = useState<FeedbackInput['verdict']>(feedback?.verdict ?? 'open'); const [notes, setNotes] = useState(feedback?.notes ?? '');
  return <details className="finding"><summary><Badge severity={finding.severity} /><strong>{finding.title}</strong><span className="finding-status">{verdicts[feedback?.verdict ?? 'open']}</span><code>{finding.ruleId}</code><Icon name="chevron" className="disclosure-icon" /></summary><div className="finding-content"><p>{finding.description}</p><p className="muted">{finding.confidence} confidence / <span className="url">{finding.url}</span></p><div className="finding-columns"><section><h3>Observed evidence</h3><pre>{JSON.stringify(finding.evidence, null, 2)}</pre></section><section><h3>Recommended action</h3><p>{finding.recommendation}</p></section></div><form className="feedback" onSubmit={e => { e.preventDefault(); void onSave({ verdict, notes }); }}><label>Review decision<select value={verdict} onChange={e => setVerdict(e.target.value as FeedbackInput['verdict'])}>{Object.entries(verdicts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="notes">Review notes<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} placeholder="Add context or a remediation reference. Do not include secrets." /></label><button disabled={busy} type="submit">Save decision</button></form></div></details>;
}
createRoot(document.getElementById('root')!).render(<App />);

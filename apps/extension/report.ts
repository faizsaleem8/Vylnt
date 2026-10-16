import type { Finding, Report } from '../../packages/core';
import { element, get, send } from './ui';
import { createMemoryClient, type SupabaseConfig } from '../../packages/auth/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ScanSync, SyncFailure } from './sync';
import { rateLimitMessage, retryDeadline } from '../../packages/http/retry';
import type { Feedback, FeedbackInput } from '../../packages/core/validation';
import { findingReview } from './review';
import { comparisonPanel } from './comparison';

let selected: Report | undefined;
let currentScan: Report | undefined;
let tab: chrome.tabs.Tab | undefined;
let paused = false;
let view: 'current' | 'saved' = 'current';
let page = 1;
let selectionVersion = 0;
let authClient: SupabaseClient | undefined;
let authConfig: SupabaseConfig | undefined;
let authOrigin = '';
let accessToken = '';
let sync: ScanSync | undefined;
let requests = new AbortController();
let epoch = 0;
let busy = false;
let stateBusy = false;
let renderKey = '';
let releaseConnection: (() => void) | undefined;
const text = (node: HTMLElement, value: string) => { if (node.textContent !== value) node.textContent = value; };
const status = (value: string) => { text(get('upload-status'), value); renderSyncStatus(); };
const handle = (work: () => Promise<void>) => { void work().catch(error => { if (error.name !== 'AbortError') get('message').textContent = error.message; }); };
function apiOrigin() {
  const base = new URL(get<HTMLInputElement>('api-url').value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' || (base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback))) throw new Error('Use an HTTPS API origin, or HTTP on localhost, without a path or credentials.');
  return base;
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!accessToken || apiOrigin().origin !== authOrigin) throw new Error('Connect your workspace first.');
  const version = epoch;
  let response: Response;
  try {
    response = await fetch(authOrigin + '/api' + path, { ...init, signal: AbortSignal.any([requests.signal, AbortSignal.timeout(15000)]), headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' } });
  } catch (error) {
    if (version !== epoch) throw new DOMException('Session changed', 'AbortError');
    throw new SyncFailure('Cannot reach the workspace API. Keep npm run dev running and check the API base URL.');
  }
  if (version !== epoch) throw new DOMException('Session changed', 'AbortError');
  if (response.status === 204) return undefined as T;
  // Proxies may return HTML on throttling; read the status/header before parsing JSON.
  if (response.status === 429) {
    const deadline = retryDeadline(response.headers.get('Retry-After'));
    throw new SyncFailure(rateLimitMessage(deadline), Number.isFinite(deadline), deadline);
  }
  const data = await response.json().catch(() => { throw new SyncFailure('The API returned an invalid response. Check the API base URL and restart the VYNLT server.'); });
  if (version !== epoch) throw new DOMException('Session changed', 'AbortError');
  if (!response.ok) {
    if (response.status === 401) throw new SyncFailure('Your workspace session was rejected. Sign out and sign in again.', false);
    if (response.status === 403) throw new SyncFailure('Workspace access denied. Check the account and API permissions.', false);
    if (response.status === 400) throw new SyncFailure('The API rejected this request (HTTP 400). Check the inputs and update the extension and server.', false);
    if (response.status === 404) throw new SyncFailure('This saved scan or finding is no longer available. Refresh saved history.', false);
    if (response.status === 409) throw new SyncFailure('This snapshot cannot be saved (HTTP 409). Rescan to create a new report, or check workspace capacity.', false);
    if (response.status === 413) throw new SyncFailure('This scan exceeds the API upload limit (512 KB).', false);
    if (response.status === 503 && typeof data.error === 'string') throw new SyncFailure(data.error);
    throw new SyncFailure('Workspace request failed (HTTP ' + response.status + '). Check the API server and Supabase database connection.', response.status >= 500 || response.status === 429);
  }
  return data as T;
}
function resetConnection() {
  epoch++; selectionVersion++; sync?.stop(); sync = undefined;
  releaseConnection?.(); releaseConnection = undefined;
  requests.abort(); requests = new AbortController(); accessToken = '';
  get('history').replaceChildren(); get('sign-out').hidden = true; get('retry').hidden = true;
  get('supabase-auth').hidden = !authConfig; get('local-auth').hidden = !!authConfig || !authOrigin;
  get<HTMLInputElement>('api-url').disabled = false;
  get<HTMLDetailsElement>('connection').open = true;
  get('connection-title').textContent = 'Account & automatic sync';
  get<HTMLInputElement>('api-token').value = ''; page = 1;
  view = 'current'; renderKey = ''; setView(); show(currentScan);
}
async function connected(token: string) {
  // A browser-wide lease prevents two panels uploading the same scans to different accounts.
  const acquired = await new Promise<boolean>((resolve, reject) => {
    void navigator.locks.request('vynlt-account-sync', { ifAvailable: true }, async lock => {
      if (!lock) { resolve(false); return; }
      await new Promise<void>(release => { releaseConnection = release; resolve(true); });
    }).catch(reject);
  });
  if (!acquired) throw new Error('Another VYNLT panel is connected. Sign out there before connecting here.');
  accessToken = token;
  status('Checking authenticated workspace access…');
  try { await api('/scans?limit=1'); }
  catch (error) { resetConnection(); throw error; }
  get('supabase-auth').hidden = true; get('local-auth').hidden = true;
  get('sign-out').hidden = false; get('retry').hidden = false; get<HTMLInputElement>('api-url').disabled = true;
  get<HTMLDetailsElement>('connection').open = false;
  get('connection-title').textContent = 'Account / Connected';
  sync = new ScanSync(Date.now(), async report => {
    await api('/scans', { method: 'POST', body: JSON.stringify({ scanId: report.scanId, observation: report.observation }) });
    if (view === 'saved') await loadHistory().catch(() => {});
  }, status);
  // Include only the active page's current scan, not the user's other pre-login history.
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const state = await send({ type: 'STATE', tabId: activeTab?.id ?? -1 });
  const permitted = activeTab?.url && /^https?:/.test(activeTab.url) && await chrome.permissions.contains({ origins: [new URL(activeTab.url).protocol + '//' + new URL(activeTab.url).hostname + '/*'] });
  if (state.scan && permitted) sync.includeCurrent(state.scan);
  sync.setPaused(state.paused);
  status(state.paused ? 'Signed in. Monitoring is paused; select Resume to sync.' : state.scan && permitted ? 'Signed in. Preparing the current scan for automatic sync.' : 'Signed in. New scans sync automatically. Rescan the page to save it.');
}
const authAction = (work: () => Promise<void>) => {
  if (busy) return; busy = true;
  for (const id of ['load-auth', 'sign-in', 'sign-up', 'connect-local', 'sign-out']) get<HTMLButtonElement>(id).disabled = true;
  void work().catch(error => status(error.message)).finally(() => {
    busy = false;
    for (const id of ['load-auth', 'sign-in', 'sign-up', 'connect-local', 'sign-out']) get<HTMLButtonElement>(id).disabled = false;
  });
};
get('load-auth').onclick = () => authAction(async () => {
  const base = apiOrigin();
  if (!await chrome.permissions.request({ origins: [base.protocol + '//' + base.hostname + '/*'] })) throw new Error('API host permission was not granted.');
  resetConnection(); await authClient?.auth.dispose(); authClient = undefined; authConfig = undefined; authOrigin = '';
  get('supabase-auth').hidden = true; get('local-auth').hidden = true;
  const response = await fetch(base.origin + '/api/config', { signal: AbortSignal.timeout(10000) });
  if (response.status === 429) throw new Error(rateLimitMessage(retryDeadline(response.headers.get('Retry-After'))));
  if (!response.ok) throw new Error('Could not load workspace configuration. Is the API running?');
  const config = await response.json();
  if (config.mode === 'supabase') {
    const project = new URL(config.supabase.url);
    if (project.protocol !== 'https:' || project.username || project.password || project.pathname !== '/' || project.search || project.hash) throw new Error('Invalid Supabase project URL.');
    authConfig = config.supabase; get('supabase-auth').hidden = false;
    status('Workspace ready. Sign in or create an account.');
  } else if (config.mode === 'local') { get('local-auth').hidden = false; status('Local workspace ready. Enter its API token.'); }
  else throw new Error('Unsupported workspace mode.');
  authOrigin = base.origin;
});
async function signIn(register: boolean) {
  if (!authConfig || apiOrigin().origin !== authOrigin) throw new Error('Load the workspace connection first.');
  const email = get<HTMLInputElement>('auth-email').value.trim();
  const password = get<HTMLInputElement>('auth-password').value; get<HTMLInputElement>('auth-password').value = '';
  if (!email || !password) throw new Error('Enter your email and password.');
  if (!await chrome.permissions.request({ origins: [new URL(authConfig.url).origin + '/*'] })) throw new Error('Supabase host permission was not granted.');
  if (!authClient) {
    authClient = createMemoryClient(authConfig);
    authClient.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') accessToken = session?.access_token ?? '';
      if (event === 'SIGNED_OUT') { resetConnection(); status('Signed out. Automatic sync stopped.'); }
    });
  }
  const { data, error } = register ? await authClient.auth.signUp({ email, password }) : await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.session) await connected(data.session.access_token);
  else status('Check your email to confirm your account, then return here and sign in.');
}
get<HTMLFormElement>('supabase-auth').onsubmit = event => {
  event.preventDefault();
  authAction(() => signIn(false));
};
get('sign-up').onclick = () => {
  if (get<HTMLFormElement>('supabase-auth').reportValidity()) authAction(() => signIn(true));
};
get<HTMLFormElement>('local-auth').onsubmit = event => {
  event.preventDefault();
  authAction(async () => {
    if (!authOrigin || authConfig || apiOrigin().origin !== authOrigin) throw new Error('Load the workspace connection first.');
    accessToken = get<HTMLInputElement>('api-token').value.trim(); get<HTMLInputElement>('api-token').value = '';
    try { await connected(accessToken); } catch (error) { resetConnection(); throw error; }
  });
};
get('sign-out').onclick = () => authAction(async () => {
  resetConnection();
  try { const result = await authClient?.auth.signOut({ scope: 'local' }); if (result?.error) throw result.error; status('Signed out. Automatic sync stopped.'); }
  finally { await authClient?.auth.dispose(); authClient = undefined; }
});
get('retry').onclick = () => { sync?.retry(); handle(refreshState); };

interface FindingNodes {
  card: HTMLDetailsElement; severity: HTMLElement; title: HTMLElement; rule: HTMLElement;
  description: HTMLElement; context: HTMLElement; evidence: HTMLElement; recommendation: HTMLElement;
  review?: HTMLFormElement;
}
interface ReportNodes {
  identity: string; score: HTMLElement; title: HTMLElement; metadata: HTMLElement;
  coverage: HTMLElement[]; heading: HTMLElement; list: HTMLElement; empty: HTMLElement;
  findings: Map<string, FindingNodes>;
}
let renderedReport: ReportNodes | undefined;

function createFinding(): FindingNodes {
  const card = element('details', '', 'finding-card');
  const summary = element('summary');
  const severity = element('span', '', 'badge'), title = element('strong'), rule = element('span', '', 'rule-id');
  const disclosure = element('span', '', 'finding-disclosure'); disclosure.setAttribute('aria-hidden', 'true');
  summary.append(severity, title, rule, disclosure);
  const description = element('p'), context = element('p', '', 'muted'), evidence = element('pre'), recommendation = element('p');
  const body = element('div', '', 'finding-body');
  body.append(description, context, element('h3', 'Observed evidence'), evidence, element('h3', 'Recommended action'), recommendation);
  card.append(summary, body);
  return { card, severity, title, rule, description, context, evidence, recommendation };
}
function updateFinding(nodes: FindingNodes, finding: Finding) {
  nodes.card.dataset.findingId = finding.id;
  nodes.severity.className = 'badge ' + finding.severity;
  text(nodes.severity, finding.severity); text(nodes.title, finding.title); text(nodes.rule, finding.ruleId);
  text(nodes.description, finding.description); text(nodes.context, finding.confidence + ' confidence / ' + finding.url);
  text(nodes.evidence, JSON.stringify(finding.evidence, null, 2)); text(nodes.recommendation, finding.recommendation);
}
function createReportNodes(identity: string): ReportNodes {
  const header = element('section', '', 'report-summary');
  const score = element('span', '', 'score'), scoreBlock = element('div', '', 'score-block');
  scoreBlock.append(score, element('p', 'Configuration score, out of 100', 'muted'));
  const title = element('h2'), metadata = element('p', '', 'muted'), titleBlock = element('div', '', 'report-title');
  titleBlock.append(title, metadata); header.append(scoreBlock, titleBlock);
  const coverageBar = element('div', '', 'coverage-bar'), coverage = [element('span'), element('span'), element('span')];
  coverage.forEach((cell, index) => { cell.className = 'coverage-cell'; cell.append(element('strong', ['Headers', 'DOM', 'Cookies'][index]), element('span')); });
  coverageBar.append(...coverage);
  const heading = element('h2', '', 'section-title'); heading.tabIndex = -1;
  const list = element('div', '', 'findings-list');
  const empty = element('p', 'No findings from observed checks. Review coverage before interpreting this result.', 'empty');
  get('detail').replaceChildren(header, coverageBar, element('p', 'Configuration checks are not proof of exploitability. Collection is bounded; missing permissions can limit coverage.', 'muted note'), heading, list, empty);
  return { identity, score, title, metadata, coverage, heading, list, empty, findings: new Map() };
}
function renderSyncStatus() {
  const node = get('current-sync-status');
  node.hidden = !sync;
  const scanStatus = currentScan && sync?.statusFor(currentScan.scanId);
  node.dataset.state = scanStatus?.state ?? (sync ? 'idle' : 'disconnected');
  text(node, scanStatus ? 'Current scan / ' + scanStatus.text : !sync ? 'Sign in to save this scan automatically.' : currentScan ? 'Current scan is not queued. Rescan to save a new report.' : 'No current scan to save yet.');
}
function show(report?: Report, feedback: Feedback[] = []) {
  selected = report;
  get<HTMLButtonElement>('export').disabled = !report;
  get('verify').hidden = view !== 'saved' || !report;
  get('delete').hidden = view !== 'saved' || !report;
  if (!report) {
    renderedReport = undefined;
    get('detail').replaceChildren(element('p', view === 'saved' ? 'Select a saved scan to inspect it.' : 'Open an allowed website and select Rescan page.', 'empty'));
    return;
  }
  const identity = view + ':' + report.scanId;
  const sameScan = renderedReport?.identity === identity;
  const scrollPosition = { x: window.scrollX, y: window.scrollY };
  const focused = sameScan && document.activeElement instanceof HTMLElement && get('detail').contains(document.activeElement) ? document.activeElement : undefined;
  const visibleCard = sameScan ? [...get('detail').querySelectorAll<HTMLElement>('.finding-card')].find(card => {
    const bounds = card.getBoundingClientRect(); return bounds.bottom > 0 && bounds.top < window.innerHeight;
  }) : undefined;
  const readingAnchor = focused ?? visibleCard;
  const anchorTop = readingAnchor?.getBoundingClientRect().top;
  const nodes = sameScan ? renderedReport! : (renderedReport = createReportNodes(identity));
  const session = epoch;
  const isCurrent = () => epoch === session && view === 'saved' && renderedReport === nodes && selected?.scanId === report.scanId;
  if (!sameScan && view === 'saved') nodes.heading.before(comparisonPanel(report, api, isCurrent));
  const o = report.observation;
  text(nodes.score, String(report.score)); text(nodes.title, o.url);
  text(nodes.metadata, new Date(o.scannedAt).toLocaleString() + ' / Ruleset ' + report.rulesetVersion);
  [o.headers !== undefined, o.domCollected, o.cookies !== undefined].forEach((observed, index) => {
    nodes.coverage[index].dataset.observed = String(Boolean(observed));
    text(nodes.coverage[index].lastElementChild as HTMLElement, observed ? 'Observed' : 'Not observed');
  });
  text(nodes.heading, report.findings.length + ' findings'); nodes.empty.hidden = report.findings.length > 0;
  const remaining = new Set(report.findings.map(finding => finding.id));
  for (const [id, findingNodes] of nodes.findings) {
    if (!remaining.has(id)) { findingNodes.card.remove(); nodes.findings.delete(id); }
  }
  report.findings.forEach((finding, index) => {
    const findingNodes = nodes.findings.get(finding.id) ?? createFinding();
    nodes.findings.set(finding.id, findingNodes); updateFinding(findingNodes, finding);
    if (view === 'saved' && !findingNodes.review) {
      findingNodes.review = findingReview(feedback.find(item => item.findingId === finding.id),
        (input: FeedbackInput) => api<Feedback>(`/scans/${report.scanId}/findings/${encodeURIComponent(finding.id)}/feedback`, { method: 'POST', body: JSON.stringify(input) }),
        () => isCurrent() && nodes.findings.get(finding.id) === findingNodes);
      findingNodes.card.querySelector('.finding-body')!.append(findingNodes.review);
    }
    // Keep unchanged nodes in place so open disclosures and keyboard focus survive collection updates.
    if (nodes.list.children[index] !== findingNodes.card) nodes.list.insertBefore(findingNodes.card, nodes.list.children[index] ?? null);
  });
  if (sameScan) {
    if (focused && document.activeElement !== focused) (focused.isConnected ? focused : nodes.heading).focus({ preventScroll: true });
    const scrollTop = readingAnchor?.isConnected && anchorTop !== undefined ? window.scrollY + readingAnchor.getBoundingClientRect().top - anchorTop : scrollPosition.y;
    window.scrollTo({ left: scrollPosition.x, top: scrollTop, behavior: 'instant' });
  }
}
function setView() {
  get('saved-view').hidden = view !== 'saved';
  get('current').setAttribute('aria-pressed', String(view === 'current')); get('saved').setAttribute('aria-pressed', String(view === 'saved'));
}
interface ScanList { scans: { scanId: string; url: string; scannedAt: string; findingCount: number; score: number }[]; total: number }
let listVersion = 0;
async function loadHistory() {
  const version = ++listVersion; const session = epoch;
  const data = await api<ScanList>('/scans?page=' + page + '&limit=10');
  if (version !== listVersion || session !== epoch || view !== 'saved') return;
  get('page-label').textContent = 'Page ' + page + ' / ' + data.total + ' scans';
  get<HTMLButtonElement>('previous').disabled = page <= 1; get<HTMLButtonElement>('next').disabled = page * 10 >= data.total || page >= 10000;
  get('history').replaceChildren(...data.scans.map(row => {
    const button = element('button', '', 'history-item');
    button.append(element('strong', row.url), element('span', new Date(row.scannedAt).toLocaleString(), 'muted'), element('span', row.findingCount + ' findings / ' + row.score + '/100', 'history-meta'));
    button.onclick = () => handle(async () => {
      const version = ++selectionVersion;
      const result = await api<{ report: Report; feedback?: Feedback[] }>('/scans/' + row.scanId);
      if (version === selectionVersion && view === 'saved') { renderedReport = undefined; show(result.report, result.feedback ?? []); }
    }); return button;
  }));
  if (!data.scans.length) get('history').append(element('p', data.total ? 'No scans on this page. Go to the previous page or refresh history.' : 'No saved scans yet. Sign in, then rescan a page.', 'muted'));
}
get('current').onclick = () => { selectionVersion++; view = 'current'; setView(); show(currentScan); };
get('saved').onclick = () => handle(async () => { selectionVersion++; view = 'saved'; setView(); show(); await loadHistory(); });
get('previous').onclick = () => handle(async () => { page = Math.max(1, page - 1); await loadHistory(); });
get('next').onclick = () => handle(async () => { page++; await loadHistory(); });
get('refresh').onclick = () => handle(loadHistory);
get('verify').onclick = () => handle(async () => {
  if (!selected || view !== 'saved') return;
  const id = selected.scanId;
  const result = await api<{ matches: boolean }>('/reports/' + id + '/verify');
  if (selected?.scanId === id) get('message').textContent = result.matches ? 'Stored report matches its SHA-256 hash. This is not blockchain verification.' : 'Report integrity mismatch.';
});
get('delete').onclick = () => handle(async () => {
  if (!selected || view !== 'saved' || !confirm('Delete this saved scan permanently?')) return;
  const id = selected.scanId; await api('/scans/' + id, { method: 'DELETE' });
  if (selected?.scanId === id) show(); page = 1; await loadHistory(); get('message').textContent = 'Saved scan deleted.';
});
get('export').onclick = () => {
  if (!selected) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' }));
  const link = element('a'); link.href = url; link.download = 'vynlt-' + selected.scanId + '.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
async function refreshState() {
  if (stateBusy) return; stateBusy = true;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const state = await send({ type: 'STATE', tabId: tab?.id ?? -1 });
    paused = state.paused; get('pause').textContent = paused ? 'Resume' : 'Pause';
    currentScan = state.scan;
    let url: URL | undefined;
    let unavailable = tab?.url ? 'This browser page or local file cannot be scanned. Open an HTTP or HTTPS website.' : 'Cannot read this tab’s address. Reload VYNLT in chrome://extensions and reopen the panel.';
    try {
      const candidate = new URL(tab?.url ?? '');
      const webStore = candidate.hostname === 'chromewebstore.google.com' || (candidate.hostname === 'chrome.google.com' && /^\/webstore(?:\/|$)/.test(candidate.pathname));
      if (webStore) unavailable = 'Chrome Web Store pages cannot be scanned. Open another website.';
      else if (['http:', 'https:'].includes(candidate.protocol)) url = candidate;
    } catch {}
    const permitted = !!url && await chrome.permissions.contains({ origins: [url.protocol + '//' + url.hostname + '/*'] });
    get('site').textContent = url?.hostname ?? (tab?.url ? 'Unsupported page' : 'Tab unavailable');
    get<HTMLButtonElement>('enable').hidden = permitted; get<HTMLButtonElement>('enable').disabled = !url;
    get<HTMLButtonElement>('rescan').disabled = !permitted || paused;
    get('monitor-status').textContent = !url ? unavailable : paused ? 'Monitoring paused. Select Resume to scan.' : !permitted ? 'Enable this site to start scanning.' : 'Monitoring active. Rescan reloads this page.';
    const fingerprint = JSON.stringify(currentScan) ?? '';
    if (view === 'current' && fingerprint !== renderKey) { renderKey = fingerprint; show(currentScan); }
    renderSyncStatus();
    sync?.setPaused(paused);
    // Keep page controls responsive while a network request is pending.
    const currentSync = sync;
    if (currentSync && !paused) handle(() => currentSync.tick(state.history));
  } finally { stateBusy = false; }
}
get('pause').onclick = () => handle(async () => { sync?.setPaused(!paused); await send({ type: 'PAUSE', paused: !paused }); await refreshState(); });
get('rescan').onclick = () => handle(async () => { await send({ type: 'RESCAN', tabId: tab?.id }); });
get('enable').onclick = () => handle(async () => {
  const url = new URL(tab?.url ?? '');
  if (await chrome.permissions.request({ origins: [url.protocol + '//' + url.hostname + '/*'] })) {
    get('message').textContent = 'Site access enabled. Select Rescan page to begin.';
    await refreshState();
  } else get('message').textContent = 'Site access was not granted. Select Enable this site to try again.';
});
chrome.storage.onChanged.addListener(() => handle(refreshState));
chrome.tabs.onActivated.addListener(() => handle(refreshState));
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (tabId === tab?.id && (change.url !== undefined || change.status !== undefined)) handle(refreshState);
});
setInterval(() => handle(refreshState), 1000);
show(); handle(refreshState);

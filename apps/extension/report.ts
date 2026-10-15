import type { Report } from '../../packages/core';
import { element, get, send } from './ui';
import { createMemoryClient, type SupabaseConfig } from '../../packages/auth/client';
import type { SupabaseClient } from '@supabase/supabase-js';

let selected: Report | undefined;
let reports: Report[] = [];
let authClient: SupabaseClient | undefined;
let authConfig: SupabaseConfig | undefined;
let authOrigin: string | undefined;
let accessToken = '';
function apiOrigin() {
  const base = new URL(get<HTMLInputElement>('api-url').value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' || (base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback))) throw new Error('Use an HTTPS API origin, or HTTP on localhost, without a path or credentials.');
  return base;
}
get('load-auth').onclick = () => { void (async () => {
  const base = apiOrigin();
  if (!await chrome.permissions.request({ origins: [`${base.protocol}//${base.hostname}/*`] })) throw new Error('API host permission was not granted.');
  const response = await fetch(`${base.origin}/api/config`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Could not load workspace configuration.');
  const config = await response.json();
  await authClient?.auth.dispose(); authClient = undefined; accessToken = ''; authConfig = undefined;
  authOrigin = base.origin; get<HTMLInputElement>('api-token').value = ''; get('sign-out').hidden = true; get('sign-in').hidden = false;
  if (config.mode === 'supabase') {
    const project = new URL(config.supabase.url);
    if (project.protocol !== 'https:' || project.username || project.password || project.pathname !== '/' || project.search || project.hash) throw new Error('Invalid Supabase project URL.');
    authConfig = config.supabase;
    get('supabase-auth').hidden = false; get('token-field').hidden = true;
    get('upload-status').textContent = `Workspace ready. Sign in to ${project.hostname}.`;
  } else if (config.mode === 'local') {
    get('supabase-auth').hidden = true; get('token-field').hidden = false;
    get('upload-status').textContent = 'Local workspace ready. Enter its API token.';
  } else throw new Error('Unsupported workspace mode.');
})().catch(error => { get('upload-status').textContent = error.message; }); };
get('sign-in').onclick = () => { void (async () => {
  if (!authConfig || apiOrigin().origin !== authOrigin) throw new Error('Load the workspace connection first.');
  const email = get<HTMLInputElement>('auth-email').value.trim();
  const password = get<HTMLInputElement>('auth-password').value; get<HTMLInputElement>('auth-password').value = '';
  if (!email || !password) throw new Error('Enter your email and password.');
  const project = new URL(authConfig.url);
  if (!await chrome.permissions.request({ origins: [`${project.origin}/*`] })) throw new Error('Supabase host permission was not granted.');
  get<HTMLButtonElement>('sign-in').disabled = true;
  if (!authClient) {
    authClient = createMemoryClient(authConfig);
    authClient.auth.onAuthStateChange((_event, session) => { accessToken = session?.access_token ?? ''; });
  }
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  accessToken = data.session.access_token;
  get('sign-in').hidden = true; get('sign-out').hidden = false;
  get('upload-status').textContent = 'Signed in. Select Send scan to upload the current report.';
})().catch(error => { get('upload-status').textContent = error.message; }).finally(() => { get<HTMLButtonElement>('sign-in').disabled = false; }); };
get('sign-out').onclick = () => { void (async () => {
  try { await authClient?.auth.signOut({ scope: 'local' }); }
  finally { await authClient?.auth.dispose(); authClient = undefined; accessToken = ''; get('sign-in').hidden = false; get('sign-out').hidden = true; get('upload-status').textContent = 'Signed out on this page.'; }
})().catch(() => { get('upload-status').textContent = 'Disconnected locally; remote sign-out could not be confirmed.'; }); };
function show(report?: Report) {
  selected = report;
  get<HTMLButtonElement>('export').disabled = !report;
  if (!report) { get('detail').replaceChildren(element('p', 'No saved scans. Open a localhost page and rescan using the extension.', 'empty')); return; }
  const o = report.observation;
  const header = element('section', '', 'report-summary');
  const score = element('div', '', 'score-block'); score.append(element('span', String(report.score), 'score'), element('p', 'Configuration score / 100', 'muted'));
  const title = element('div'); title.append(element('h2', o.url), element('p', `${new Date(o.scannedAt).toLocaleString()} · Ruleset ${report.rulesetVersion}`, 'muted'));
  header.append(score, title);
  const coverage = element('div', '', 'coverage-bar');
  coverage.append(element('span', `Headers: ${o.headers ? 'observed' : 'not observed'}`), element('span', `DOM: ${o.domCollected ? 'observed' : 'not observed'}`), element('span', `Cookies: ${o.cookies ? 'observed' : 'not observed'}`));
  const disclaimer = element('p', 'This score reflects supported configuration checks only. Findings are not proof of exploitability. Collection is bounded; cross-origin traffic may be invisible without host access. URL paths and cookie names remain in reports.', 'muted note');
  const cards = report.findings.map(f => {
    const card = element('details', '', 'finding-card');
    const summary = element('summary'); summary.append(element('span', f.severity, `badge ${f.severity}`), element('strong', f.title), element('span', f.ruleId, 'rule-id'));
    const body = element('div', '', 'finding-body'); body.append(element('p', f.description), element('p', `${f.confidence} confidence · ${f.url}`, 'muted'), element('h3', 'Observed evidence'), element('pre', JSON.stringify(f.evidence, null, 2)), element('h3', 'Recommended action'), element('p', f.recommendation));
    card.append(summary, body); return card;
  });
  get('detail').replaceChildren(header, coverage, disclaimer, element('h2', `${report.findings.length} findings`, 'section-title'), ...cards);
  if (!cards.length) get('detail').append(element('p', 'No findings from the observed checks. Review coverage before interpreting this result.', 'empty'));
  get('message').textContent = 'Reports stay in this browser unless you explicitly send a scan to your workspace.';
}
async function refresh() {
  const state = await send({ type: 'STATE', tabId: -1 }); reports = state.history;
  get('history').replaceChildren(...reports.map(report => {
    const button = element('button', '', 'history-item');
    button.append(element('strong', new URL(report.observation.url).hostname), element('span', new Date(report.observation.scannedAt).toLocaleString(), 'muted'), element('span', `${report.findings.length} findings · ${report.score}/100`, 'history-meta'));
    button.onclick = () => { location.hash = report.scanId; show(report); }; return button;
  }));
  show(reports.find(r => r.scanId === location.hash.slice(1)) ?? reports[0]);
}
get('export').onclick = () => {
  if (!selected) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' }));
  const link = element('a'); link.href = url; link.download = `vynlt-${selected.scanId}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
get('upload').onclick = () => {
  void (async () => {
    if (!selected) throw new Error('Select a scan first.');
    const base = apiOrigin();
    if (authOrigin && base.origin !== authOrigin) throw new Error('API origin changed. Load its workspace connection again before uploading.');
    const token = authConfig ? accessToken : get<HTMLInputElement>('api-token').value.trim();
    if (!token) throw new Error(authConfig ? 'Sign in first.' : 'Enter an API token.');
    const snapshot = structuredClone(selected);
    // Permission requests remain directly inside the user's click gesture.
    const granted = await chrome.permissions.request({ origins: [`${base.protocol}//${base.hostname}/*`] });
    if (!granted) throw new Error('API host permission was not granted.');
    get<HTMLButtonElement>('upload').disabled = true;
    get('upload-status').textContent = 'Sending selected scan…';
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(`${base.origin}/api/scans`, { method: 'POST', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ scanId: snapshot.scanId, observation: snapshot.observation }) });
      } catch (error) { if (attempt === 0) continue; throw error; }
      if ((response.status === 503 || response.status === 429) && attempt === 0) continue;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `Upload failed (${response.status})`);
      get('upload-status').textContent = 'Scan saved to your workspace. Open the dashboard to review it.'; return;
    }
  })().catch(error => { get('upload-status').textContent = error.message ?? 'Upload failed. Retry when the API is available.'; }).finally(() => { get<HTMLButtonElement>('upload').disabled = false; });
};
get('clear').onclick = () => {
  if (confirm('Delete all 30 retained local scans? This cannot be undone.')) void send({ type: 'CLEAR' }).then(refresh).catch(error => { get('message').textContent = error.message; });
};
window.addEventListener('hashchange', () => show(reports.find(r => r.scanId === location.hash.slice(1))));
chrome.storage.onChanged.addListener(() => { void refresh(); });
void refresh().catch(error => { get('message').textContent = error.message; });

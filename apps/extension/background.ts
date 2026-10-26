import { cookieMetadata, createReport, safeUrl, securityHeaders, cspEvidenceComplete, type Observation, type Report, type Resource, type ScriptMetadata } from '../../packages/core';

interface TabScan { requestId: string; documentId?: string; report: Report; resourceRequests?: Record<string, number> }
// Serialize temporary scan state. Only monitoring preferences persist to disk.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work);
  queue = next.catch(error => console.error('VYLNT:', error instanceof Error ? error.message : 'operation failed'));
  return next;
}
const key = (tabId: number) => `tab:${tabId}`;
async function active() { return (await chrome.storage.local.get('paused')).paused !== true; }
async function getScan(tabId: number): Promise<TabScan | undefined> { return (await chrome.storage.session.get(key(tabId)))[key(tabId)] as TabScan | undefined; }
async function save(tabId: number, scan: TabScan) {
  scan.report = createReport(scan.report.scanId, scan.report.observation);
  await chrome.storage.session.set({ [key(tabId)]: scan });
  const { history = [] } = await chrome.storage.session.get('history');
  await chrome.storage.session.set({ history: [scan.report, ...(history as Report[]).filter(r => r.scanId !== scan.report.scanId)].slice(0, 30) });
}
async function allowed(url: string) {
  try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol) && await chrome.permissions.contains({ origins: [`${u.protocol}//${u.hostname}/*`] }); }
  catch { return false; }
}
async function register() {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  // Remove the retired disk-backed history when upgrading.
  await chrome.storage.local.remove('history');
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  const { origins = [] } = await chrome.permissions.getAll();
  const matches = origins.filter(o => o.startsWith('http'));
  await chrome.scripting.unregisterContentScripts();
  if (matches.length) await chrome.scripting.registerContentScripts([{ id: 'vylnt-dom', matches, js: ['content.js'], runAt: 'document_idle' }]);
}
chrome.runtime.onInstalled.addListener(() => { void enqueue(register); });
chrome.runtime.onStartup.addListener(() => { void enqueue(register); });
chrome.permissions.onAdded.addListener(() => { void enqueue(register); });
chrome.permissions.onRemoved.addListener(() => { void enqueue(register); });

chrome.webRequest.onBeforeRequest.addListener(details => { void enqueue(async () => {
  if (details.tabId < 0 || !await active()) return;
  if (details.type === 'main_frame') {
    if (!await allowed(details.url)) return;
    const observation: Observation = { url: safeUrl(details.url), scannedAt: new Date().toISOString(), resources: [], scripts: [], domCollected: false };
    const previous = await getScan(details.tabId);
    const scanId = previous?.requestId === details.requestId ? previous.report.scanId : crypto.randomUUID();
    await save(details.tabId, { requestId: details.requestId, report: createReport(scanId, observation) });
  } else {
    const scan = await getScan(details.tabId);
    if (!scan || !scan.documentId || details.documentId !== scan.documentId || !await allowed(scan.report.observation.url)) return;
    const resources = scan.report.observation.resources;
    // Keep request identities outside the report. Sanitized URLs can collapse
    // different query strings; never update a different request by URL alone.
    const requests = scan.resourceRequests ??= {};
    const requestKey = `request:${details.requestId}`;
    const network = resources.filter(r => r.outcome !== 'referenced');
    if (network.length < 300 && !Object.hasOwn(requests, requestKey)) {
      requests[requestKey] = network.length;
      network.push({ url: safeUrl(details.url), type: details.type, outcome: 'requested' });
      scan.report.observation.resources = [...network, ...resources.filter(r => r.outcome === 'referenced')];
      await save(details.tabId, scan);
    }
  }
}); return undefined; }, { urls: ['http://*/*', 'https://*/*'] });

function finishResource(details: chrome.webRequest.WebRequestDetails, outcome: 'completed' | 'failed') {
  return enqueue(async () => {
    if (details.tabId < 0 || details.type === 'main_frame' || !await active()) return;
    const scan = await getScan(details.tabId);
    if (!scan?.documentId || scan.documentId !== details.documentId || !await allowed(scan.report.observation.url)) return;
    const index = scan.resourceRequests?.[`request:${details.requestId}`];
    if (index === undefined) return; // Missed start, older scan, or collection cap.
    const resource = scan.report.observation.resources.filter(r => r.outcome !== 'referenced')[index];
    // Redirects can retain a request ID: do not attribute the destination's
    // outcome to the original URL. No inference of upgrade/blocking reasons.
    if (!resource || resource.url !== safeUrl(details.url) || resource.type !== details.type || resource.outcome !== 'requested') return;
    resource.outcome = outcome;
    await save(details.tabId, scan);
  });
}
chrome.webRequest.onCompleted.addListener(details => { void finishResource(details, 'completed'); }, { urls: ['http://*/*', 'https://*/*'] });
chrome.webRequest.onErrorOccurred.addListener(details => { void finishResource(details, 'failed'); }, { urls: ['http://*/*', 'https://*/*'] });
chrome.webRequest.onBeforeRedirect.addListener(details => { void enqueue(async () => {
  const scan = await getScan(details.tabId);
  const requestKey = `request:${details.requestId}`;
  if (!await active() || !scan?.documentId || scan.documentId !== details.documentId || !await allowed(scan.report.observation.url)
      || !scan.resourceRequests || !Object.hasOwn(scan.resourceRequests, requestKey)) return;
  // Even redirects differing only by a stripped query are distinct requests.
  // Keep the original observation pending instead of claiming its completion.
  scan.resourceRequests[requestKey] = -1;
  await chrome.storage.session.set({ [key(details.tabId)]: scan });
}); }, { urls: ['http://*/*', 'https://*/*'] });

chrome.webRequest.onHeadersReceived.addListener(details => { void enqueue(async () => {
  if (details.type !== 'main_frame' || !await active()) return;
  const scan = await getScan(details.tabId);
  if (!scan || scan.requestId !== details.requestId || !await allowed(details.url)) return;
  scan.report.observation.url = safeUrl(details.url);
  scan.report.observation.headers = securityHeaders(details.responseHeaders ?? []);
  scan.report.observation.cspEvidenceComplete = cspEvidenceComplete(details.responseHeaders ?? []);
  await save(details.tabId, scan);
}); return undefined; }, { urls: ['http://*/*', 'https://*/*'] }, ['responseHeaders']);

chrome.webNavigation.onCommitted.addListener(details => { void enqueue(async () => {
  if (details.frameId !== 0) return;
  const scan = await getScan(details.tabId);
  if (!await active() || !await allowed(details.url) || !scan || safeUrl(details.url) !== scan.report.observation.url) {
    await chrome.storage.session.remove(key(details.tabId)); return;
  }
  scan.documentId = details.documentId;
  await save(details.tabId, scan);
}); });
chrome.webNavigation.onHistoryStateUpdated.addListener(details => { void enqueue(async () => {
  if (details.frameId !== 0 || !await active() || !await allowed(details.url)) return;
  const scan = await getScan(details.tabId);
  if (!scan || scan.documentId !== details.documentId || safeUrl(details.url) === scan.report.observation.url) return;
  const observation = { ...scan.report.observation, url: safeUrl(details.url), scannedAt: new Date().toISOString(), domCollected: false };
  await save(details.tabId, { requestId: `spa:${crypto.randomUUID()}`, documentId: scan.documentId, resourceRequests: scan.resourceRequests, report: createReport(crypto.randomUUID(), observation) });
  // The document's response headers remain applicable; refresh DOM and cookie metadata.
  await chrome.tabs.sendMessage(details.tabId, { type: 'COLLECT' }, { documentId: details.documentId }).catch(() => {});
}); });
chrome.tabs.onRemoved.addListener(tabId => { void enqueue(() => chrome.storage.session.remove(key(tabId))); });

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  void enqueue(async () => {
    if (message.type === 'DOM') {
      if (!sender.tab?.id || sender.frameId !== 0 || !await active()) return { ok: false };
      const scan = await getScan(sender.tab.id);
      if (!scan || scan.documentId !== sender.documentId || !await allowed(sender.url ?? '')) return { ok: false };
      const o = scan.report.observation;
      // Explicit allowlists keep arbitrary page data out of storage.
      o.scripts = (Array.isArray(message.scripts) ? message.scripts : []).slice(0, 150).map((s: ScriptMetadata) => ({ url: safeUrl(String(s.url)), integrity: s.integrity === true,
        ...(['classic', 'module', 'other'].includes(s.scriptType ?? '') ? { scriptType: s.scriptType } : {}),
        ...(typeof s.async === 'boolean' ? { async: s.async } : {}), ...(typeof s.defer === 'boolean' ? { defer: s.defer } : {}) }));
      const domResources: Resource[] = (Array.isArray(message.resources) ? message.resources : []).slice(0, 300).map((r: Resource) => ({ url: safeUrl(String(r.url)), type: String(r.type).slice(0, 30), outcome: 'referenced' }));
      o.resources = [...o.resources.filter(r => r.outcome !== 'referenced'), ...domResources].slice(0, 600);
      o.domCollected = true;
      try { o.cookies = (await chrome.cookies.getAll({ url: sender.url! })).slice(0, 100).map(cookieMetadata); }
      catch { o.cookies = undefined; }
      await save(sender.tab.id, scan);
      return { ok: true };
    }
    // Content scripts cannot control monitoring, read history, or clear reports.
    // An extension report opened as a tab also has sender.tab. Its verified extension URL is the trust boundary.
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('Untrusted control message');
    if (message.type === 'STATE') {
      const { paused = false } = await chrome.storage.local.get('paused');
      const { history = [] } = await chrome.storage.session.get('history');
      return { paused, history, scan: (await getScan(message.tabId))?.report };
    }
    if (message.type === 'PAUSE') {
      await chrome.storage.local.set({ paused: message.paused === true });
      return { ok: true };
    }
    if (message.type === 'RESCAN') {
      const tab = await chrome.tabs.get(message.tabId);
      if (!await allowed(tab.url ?? '')) throw new Error('Enable access to this site first.');
      if (!await active()) throw new Error('Resume monitoring before rescanning.');
      await chrome.tabs.reload(message.tabId); return { ok: true };
    }
    if (message.type === 'CLEAR') {
      await chrome.storage.session.clear(); return { ok: true };
    }
    throw new Error('Unknown command');
  }).then(reply).catch(error => reply({ error: error instanceof Error ? error.message : 'Operation failed' }));
  return true;
});

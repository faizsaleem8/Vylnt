import { beforeEach, describe, expect, it, vi } from 'vitest';

const events = new Map<string, (...args: any[]) => any>();
let local: Record<string, any> = {};
let session: Record<string, any> = {};
const event = (name: string) => ({ addListener: (fn: (...args: any[]) => any) => events.set(name, fn) });
const storage = (data: () => Record<string, any>) => ({
  get: async (keys: string | string[]) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, structuredClone(data()[k])])),
  set: async (values: Record<string, any>) => Object.assign(data(), structuredClone(values)),
  remove: async (key: string) => { delete data()[key]; },
  clear: async () => { for (const key of Object.keys(data())) delete data()[key]; },
  setAccessLevel: async () => {}
});
function message(payload: any, sender: any = { id: 'extension', url: 'chrome-extension://extension/popup.html' }): Promise<any> {
  return new Promise(resolve => events.get('message')!(payload, sender, resolve));
}
const flush = () => message({ type: 'STATE', tabId: 1 });
async function navigate(tabId = 1, requestId = 'request-1', documentId = 'document-1') {
  events.get('request')!({ tabId, requestId, type: 'main_frame', url: 'https://example.test/?secret=private' });
  events.get('headers')!({ tabId, requestId, type: 'main_frame', url: 'https://example.test/', responseHeaders: [{ name: 'Set-Cookie', value: 'secret=private' }] });
  events.get('committed')!({ tabId, frameId: 0, documentId, url: 'https://example.test/' });
  await flush();
}
beforeEach(async () => {
  local = {}; session = {}; events.clear(); vi.resetModules();
  vi.stubGlobal('chrome', {
    storage: { local: storage(() => local), session: storage(() => session) },
    sidePanel: { setPanelBehavior: vi.fn() },
    runtime: { id: 'extension', getURL: (p: string) => `chrome-extension://extension/${p}`, onInstalled: event('installed'), onStartup: event('startup'), onMessage: event('message') },
    permissions: { contains: async () => true, getAll: async () => ({ origins: ['https://example.test/*'] }), onAdded: event('added'), onRemoved: event('removed') },
    scripting: { unregisterContentScripts: async () => {}, registerContentScripts: async () => {} },
    webRequest: { onBeforeRequest: event('request'), onHeadersReceived: event('headers'), onCompleted: event('completed'), onErrorOccurred: event('failed'), onBeforeRedirect: event('redirect') },
    webNavigation: { onCommitted: event('committed'), onHistoryStateUpdated: event('historyState') },
    tabs: { onRemoved: event('removedTab'), get: async () => ({ url: 'https://example.test/' }), reload: vi.fn(), sendMessage: async () => {} },
    cookies: { getAll: async () => [{ name: 'session', value: 'secret-cookie-value', secure: false, httpOnly: false, sameSite: 'lax', session: true }] }
  });
  await import('../apps/extension/background');
});
describe('background lifecycle with Chrome API mocks', () => {
  it('correlates completed/failed requests despite identical sanitized URLs and DOM refreshes', async () => {
    await navigate();
    const request = (requestId: string, query: string) => ({ tabId: 1, requestId, documentId: 'document-1', type: 'script', url: `https://cdn.test/script.js?token=${query}` });
    const first = request('asset-a', 'secret-a'), second = request('asset-b', 'secret-b');
    events.get('request')!(first); events.get('request')!(second);
    await message({ type: 'DOM', scripts: [], resources: [{ url: first.url, type: 'script' }] }, { id: 'extension', tab: { id: 1 }, frameId: 0, documentId: 'document-1', url: 'https://example.test/' });
    events.get('failed')!({ ...second, error: 'private failure detail' });
    events.get('completed')!(first);
    const state = await flush();
    expect(state.scan.observation.resources.map((r: any) => r.outcome)).toEqual(['completed', 'failed', 'referenced']);
    expect(JSON.stringify(session)).not.toMatch(/secret-a|secret-b|private failure/);
    expect(JSON.stringify(state.scan)).not.toContain('asset-a');
  });
  it('does not infer terminal outcomes from missed, redirected, stale, paused or revoked requests', async () => {
    await navigate();
    const request = { tabId: 1, requestId: 'asset', documentId: 'document-1', type: 'script', url: 'https://cdn.test/a.js' };
    events.get('completed')!(request);
    expect((await flush()).scan.observation.resources).toHaveLength(0);
    events.get('request')!(request);
    events.get('completed')!({ ...request, url: 'https://cdn.test/redirected.js' });
    events.get('completed')!({ ...request, documentId: 'old-document' });
    expect((await flush()).scan.observation.resources[0].outcome).toBe('requested');
    await message({ type: 'PAUSE', paused: true }); events.get('failed')!(request);
    expect((await flush()).scan.observation.resources[0].outcome).toBe('requested');
    await message({ type: 'PAUSE', paused: false });
    vi.spyOn(chrome.permissions, 'contains').mockImplementation(async () => false);
    events.get('completed')!(request);
    expect((await flush()).scan.observation.resources[0].outcome).toBe('requested');
  });
  it('does not mistake a query-only redirect completion for the original request', async () => {
    await navigate();
    const request = { tabId: 1, requestId: 'redirected', documentId: 'document-1', type: 'script', url: 'https://cdn.test/a.js?token=one' };
    events.get('request')!(request); events.get('redirect')!({ ...request, redirectUrl: 'https://cdn.test/a.js?token=two' });
    events.get('request')!({ ...request, url: 'https://cdn.test/a.js?token=two' });
    events.get('completed')!({ ...request, url: 'https://cdn.test/a.js?token=two' });
    expect((await flush()).scan.observation.resources).toEqual([{ url: 'https://cdn.test/a.js', type: 'script', outcome: 'requested' }]);
    expect(JSON.stringify(session)).not.toContain('token=');
  });
  it('caps per-request bookkeeping and retains it through SPA changes', async () => {
    await navigate();
    for (let i = 0; i < 301; i++) events.get('request')!({ tabId: 1, requestId: `asset-${i}`, documentId: 'document-1', type: 'script', url: `https://cdn.test/${i}.js` });
    await flush();
    expect(Object.keys(session['tab:1'].resourceRequests)).toHaveLength(300);
    events.get('historyState')!({ tabId: 1, frameId: 0, documentId: 'document-1', url: 'https://example.test/next' });
    events.get('completed')!({ tabId: 1, requestId: 'asset-0', documentId: 'document-1', type: 'script', url: 'https://cdn.test/0.js' });
    expect((await flush()).scan.observation.resources[0].outcome).toBe('completed');
    await navigate(1, 'new-main', 'new-document');
    events.get('failed')!({ tabId: 1, requestId: 'asset-0', documentId: 'document-1', type: 'script', url: 'https://cdn.test/0.js' });
    expect((await flush()).scan.observation.resources).toHaveLength(0);
  });
  it('restores pending correlation after service-worker restart without exporting request IDs', async () => {
    await navigate();
    const request = { tabId: 1, requestId: 'survives-restart', documentId: 'document-1', type: 'script', url: 'https://cdn.test/restart.js' };
    events.get('request')!(request); await flush();
    vi.resetModules(); await import('../apps/extension/background');
    events.get('completed')!(request);
    const state = await flush();
    expect(state.scan.observation.resources[0].outcome).toBe('completed');
    expect(JSON.stringify(state)).not.toContain('survives-restart');
    expect(local.history).toBeUndefined();
  });
  it('stops collection after host revocation and registers content scripts after re-grant', async () => {
    await navigate();
    const first = (await flush()).scan;
    const contains = vi.spyOn(chrome.permissions, 'contains').mockImplementation(async () => false);
    const origins = vi.spyOn(chrome.permissions, 'getAll').mockImplementation(async () => ({ origins: [] }));
    const registerScripts = vi.spyOn(chrome.scripting, 'registerContentScripts');
    const unregister = vi.spyOn(chrome.scripting, 'unregisterContentScripts');
    events.get('removed')!(); await flush();
    expect(unregister).toHaveBeenCalled(); expect(registerScripts).not.toHaveBeenCalled();
    const rejected = await message({ type: 'DOM', scripts: [], resources: [] }, { id: 'extension', tab: { id: 1 }, frameId: 0, documentId: 'document-1', url: 'https://example.test/' });
    expect(rejected.ok).toBe(false);
    await navigate(1, 'revoked-request', 'revoked-document');
    expect((await flush()).scan).toBeUndefined();
    expect(session.history).toHaveLength(1); expect(session.history[0].scanId).toBe(first.scanId);
    contains.mockImplementation(async () => true);
    origins.mockImplementation(async () => ({ origins: ['https://example.test/*'] }));
    events.get('added')!(); await flush();
    expect(registerScripts).toHaveBeenCalledWith([expect.objectContaining({ matches: ['https://example.test/*'] })]);
    await navigate(1, 'granted-request', 'granted-document');
    expect((await flush()).scan.scanId).not.toBe(first.scanId);
  });
  it('opens the side panel from the toolbar and removes legacy disk history', async () => {
    local.history = [{ old: true }];
    events.get('installed')!(); await flush();
    expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: true });
    expect(local.history).toBeUndefined();
  });
  it('allows trusted extension report tabs while still rejecting website controls', async () => {
    await navigate();
    const state = await message({ type: 'STATE', tabId: 1 }, { id: 'extension', tab: { id: 99 }, url: 'chrome-extension://extension/report.html' });
    expect(state.history).toHaveLength(1);
    const denied = await message({ type: 'CLEAR' }, { id: 'extension', tab: { id: 1 }, url: 'https://example.test/' });
    expect(denied.error).toContain('Untrusted');
  });
  it('creates a new sanitized scan for SPA path changes in the same document', async () => {
    await navigate(); const first = (await flush()).scan.scanId;
    events.get('historyState')!({ tabId: 1, frameId: 0, documentId: 'document-1', url: 'https://example.test/next?token=secret' });
    const state = await flush();
    expect(state.scan.scanId).not.toBe(first); expect(state.scan.observation.url).toBe('https://example.test/next');
    expect(state.scan.observation.headers).toEqual({}); expect(session.history).toHaveLength(2);
  });
  it('correlates DOM to committed document and drops cookie values and URL secrets', async () => {
    await navigate();
    await message({ type: 'DOM', scripts: [], resources: [] }, { id: 'extension', tab: { id: 1 }, frameId: 0, documentId: 'document-1', url: 'https://example.test/' });
    const state = await flush();
    expect(state.scan.observation.domCollected).toBe(true);
    expect(state.scan.findings.map((f: any) => f.ruleId)).toContain('CK-001');
    expect(JSON.stringify(local)).not.toContain('secret-cookie-value');
    expect(JSON.stringify(local)).not.toContain('private');
    expect(JSON.stringify(session)).not.toContain('secret-cookie-value');
    expect(JSON.stringify(session)).not.toContain('private');
    expect(local.history).toBeUndefined();
  });
  it('ignores stale documents and separates navigation IDs and tabs', async () => {
    await navigate(); const first = (await flush()).scan.scanId;
    await navigate(1, 'request-2', 'document-2');
    await navigate(2, 'request-3', 'document-3');
    await message({ type: 'DOM', scripts: [], resources: [] }, { id: 'extension', tab: { id: 1 }, frameId: 0, documentId: 'document-1', url: 'https://example.test/' });
    const state = await flush();
    expect(state.scan.scanId).not.toBe(first);
    expect(state.scan.observation.domCollected).toBe(false);
    expect(session.history).toHaveLength(3);
  });
  it('does not record new navigation while paused and rejects content-script controls', async () => {
    await navigate();
    const denied = await message({ type: 'CLEAR' }, { id: 'extension', tab: { id: 1 }, url: 'https://example.test/' });
    expect(denied.error).toContain('Untrusted');
    await message({ type: 'PAUSE', paused: true });
    await navigate(1, 'request-2', 'document-2');
    expect(session.history).toHaveLength(1);
    expect((await flush()).scan).toBeUndefined();
  });
  it('keeps redirects in the same scan and caps retained history', async () => {
    await navigate(); await navigate(1, 'request-1', 'document-2');
    expect(session.history).toHaveLength(1);
    for (let i = 2; i < 34; i++) await navigate(1, `request-${i}`, `document-${i}`);
    expect(session.history).toHaveLength(30);
    await message({ type: 'CLEAR' });
    expect(local.history).toBeUndefined(); expect(session).toEqual({});
  });
});


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
    runtime: { id: 'extension', getURL: (p: string) => `chrome-extension://extension/${p}`, onInstalled: event('installed'), onStartup: event('startup'), onMessage: event('message') },
    permissions: { contains: async () => true, getAll: async () => ({ origins: ['https://example.test/*'] }), onAdded: event('added'), onRemoved: event('removed') },
    scripting: { unregisterContentScripts: async () => {}, registerContentScripts: async () => {} },
    webRequest: { onBeforeRequest: event('request'), onHeadersReceived: event('headers') },
    webNavigation: { onCommitted: event('committed'), onHistoryStateUpdated: event('historyState') },
    tabs: { onRemoved: event('removedTab'), get: async () => ({ url: 'https://example.test/' }), reload: vi.fn(), sendMessage: async () => {} },
    cookies: { getAll: async () => [{ name: 'session', value: 'secret-cookie-value', secure: false, httpOnly: false, sameSite: 'lax', session: true }] }
  });
  await import('../apps/extension/background');
});
describe('background lifecycle with Chrome API mocks', () => {
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
    expect(state.scan.observation.headers).toEqual({}); expect(local.history).toHaveLength(2);
  });
  it('correlates DOM to committed document and drops cookie values and URL secrets', async () => {
    await navigate();
    await message({ type: 'DOM', scripts: [], resources: [] }, { id: 'extension', tab: { id: 1 }, frameId: 0, documentId: 'document-1', url: 'https://example.test/' });
    const state = await flush();
    expect(state.scan.observation.domCollected).toBe(true);
    expect(state.scan.findings.map((f: any) => f.ruleId)).toContain('CK-001');
    expect(JSON.stringify(local)).not.toContain('secret-cookie-value');
    expect(JSON.stringify(local)).not.toContain('private');
  });
  it('ignores stale documents and separates navigation IDs and tabs', async () => {
    await navigate(); const first = (await flush()).scan.scanId;
    await navigate(1, 'request-2', 'document-2');
    await navigate(2, 'request-3', 'document-3');
    await message({ type: 'DOM', scripts: [], resources: [] }, { id: 'extension', tab: { id: 1 }, frameId: 0, documentId: 'document-1', url: 'https://example.test/' });
    const state = await flush();
    expect(state.scan.scanId).not.toBe(first);
    expect(state.scan.observation.domCollected).toBe(false);
    expect(local.history).toHaveLength(3);
  });
  it('does not record new navigation while paused and rejects content-script controls', async () => {
    await navigate();
    const denied = await message({ type: 'CLEAR' }, { id: 'extension', tab: { id: 1 }, url: 'https://example.test/' });
    expect(denied.error).toContain('Untrusted');
    await message({ type: 'PAUSE', paused: true });
    await navigate(1, 'request-2', 'document-2');
    expect(local.history).toHaveLength(1);
    expect((await flush()).scan).toBeUndefined();
  });
  it('keeps redirects in the same scan and caps retained history', async () => {
    await navigate(); await navigate(1, 'request-1', 'document-2');
    expect(local.history).toHaveLength(1);
    for (let i = 2; i < 34; i++) await navigate(1, `request-${i}`, `document-${i}`);
    expect(local.history).toHaveLength(30);
    await message({ type: 'CLEAR' });
    expect(local.history).toEqual([]); expect(session).toEqual({});
  });
});

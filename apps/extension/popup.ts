import type { Report } from '../../packages/core';
import { element, get, send } from './ui';

let tab: chrome.tabs.Tab;
let paused = false;
async function render() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const state = await send({ type: 'STATE', tabId: tab?.id ?? -1 });
  paused = state.paused;
  get('monitoring').textContent = paused ? 'Monitoring paused' : 'Monitoring active';
  get('pause').textContent = paused ? 'Resume' : 'Pause';
  get('light').className = paused ? 'paused' : '';
  let url: URL;
  try { url = new URL(tab?.url ?? ''); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
  catch { get('site').textContent = 'Browser page'; get('message').textContent = 'Open an HTTP or HTTPS website to scan.'; get<HTMLButtonElement>('rescan').disabled = true; get<HTMLButtonElement>('enable').disabled = true; return; }
  get('site').textContent = url.hostname;
  const permitted = await chrome.permissions.contains({ origins: [`${url.protocol}//${url.hostname}/*`] });
  get<HTMLButtonElement>('enable').hidden = permitted;
  get<HTMLButtonElement>('rescan').disabled = !permitted || paused;
  const report: Report | undefined = state.scan;
  get('message').textContent = !permitted ? 'Enable this site to observe its security configuration.' : !report ? 'Rescan to capture a fresh navigation and response headers.' : paused ? 'Showing the last scan. Collection is paused.' : `Last observed ${new Date(report.observation.scannedAt).toLocaleTimeString()}`;
  get('score').textContent = report ? String(report.score) : '—';
  get('count').textContent = String(report?.findings.length ?? 0);
  get('high').textContent = String(report?.findings.filter(f => ['critical', 'high'].includes(f.severity)).length ?? 0);
  get('coverage').textContent = report?.observation.headers && report.observation.domCollected && report.observation.cookies ? 'Core' : 'Partial';
  get<HTMLAnchorElement>('report').href = report ? `report.html#${report.scanId}` : 'report.html';
  get('findings').replaceChildren(...(report?.findings.slice(0, 4) ?? []).map(f => {
    const row = element('div', '', 'finding-row'); row.append(element('span', '', `severity-dot ${f.severity}`), element('span', f.title), element('span', f.severity, `badge ${f.severity}`)); return row;
  }));
}
const handle = (action: () => Promise<void>) => { void action().catch(error => { get('message').textContent = error.message; }); };
get('pause').onclick = () => handle(async () => { await send({ type: 'PAUSE', paused: !paused }); await render(); });
get('rescan').onclick = () => handle(async () => { await send({ type: 'RESCAN', tabId: tab.id }); get('message').textContent = 'Reloading page…'; });
get('enable').onclick = () => handle(async () => {
  const url = new URL(tab.url!);
  const granted = await chrome.permissions.request({ origins: [`${url.protocol}//${url.hostname}/*`] });
  if (granted) { await render(); get('message').textContent = 'Access enabled. Select Rescan page to begin.'; }
});
chrome.storage.onChanged.addListener(() => handle(render));
handle(render);

import type { Report } from '../../packages/core';
import { element, get, send } from './ui';

let selected: Report | undefined;
let reports: Report[] = [];
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
  get('message').textContent = 'Reports stay in this browser. Expand a finding to inspect evidence and remediation.';
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
get('clear').onclick = () => {
  if (confirm('Delete all 30 retained local scans? This cannot be undone.')) void send({ type: 'CLEAR' }).then(refresh).catch(error => { get('message').textContent = error.message; });
};
window.addEventListener('hashchange', () => show(reports.find(r => r.scanId === location.hash.slice(1))));
chrome.storage.onChanged.addListener(() => { void refresh(); });
void refresh().catch(error => { get('message').textContent = error.message; });

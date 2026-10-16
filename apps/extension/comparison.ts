import type { Report } from '../../packages/core';
import type { ScanPage } from '../../packages/core/summary';
import { compareReports, comparisonCaveat } from '../../packages/core/comparison';
import { element } from './ui';

export function comparisonPanel(report: Report, api: <T>(path: string) => Promise<T>, isCurrent: () => boolean) {
  const panel = element('details', '', 'comparison-panel');
  const title = element('summary', 'Compare saved scans');
  const body = element('div', '', 'comparison-body');
  const select = element('select'); select.setAttribute('aria-label', 'Compare with'); const label = element('label', 'Compare with'); label.append(select);
  const controls = element('div', '', 'history-toolbar');
  const previous = element('button', 'Previous comparisons'), next = element('button', 'Next comparisons'), pageLabel = element('span', '', 'muted');
  const clear = element('button', 'Clear comparison');
  const message = element('p', '', 'review-status'); message.setAttribute('role', 'status');
  const result = element('section', '', 'comparison-result'); result.setAttribute('aria-label', 'Comparison result');
  controls.append(previous, pageLabel, next);
  body.append(element('p', 'Choose another saved scan of this exact page URL. Candidates include all history pages. Changes are relative to the baseline you choose.', 'muted'), label, controls, clear, message, result);
  panel.append(title, body);
  let page = 1, total = 0, loaded = false, busy = false, sequence = 0;
  const update = () => { select.disabled = busy || !total; previous.disabled = busy || page <= 1; next.disabled = busy || page * 10 >= total || page >= 10000; clear.disabled = busy || !result.childElementCount; };
  async function load(target: number) {
    const seq = ++sequence; busy = true; message.textContent = 'Loading comparison scans…'; update();
    try {
      const data = await api<ScanPage>(`/scans/${report.scanId}/comparisons?page=${target}&limit=10`);
      if (!isCurrent() || seq !== sequence) return;
      loaded = true; page = data.page; total = data.total;
      const placeholder = element('option', 'Select a baseline scan'); placeholder.value = ''; select.replaceChildren(placeholder);
      for (const scan of data.scans) {
        const option = element('option', `${new Date(scan.scannedAt).toLocaleString()} / ${scan.score}/100 / ${scan.scanId.slice(-8)}`);
        option.value = scan.scanId; select.append(option);
      }
      pageLabel.textContent = `Page ${page} / ${total} other scans`;
      message.textContent = data.scans.length ? '' : total ? 'No candidates on this page. Go back or reopen this report.' : 'No other saved scans of this page yet. Rescan and save another observation to compare.';
    } catch (error) { if (isCurrent() && seq === sequence) { message.textContent = error instanceof Error ? error.message : 'Could not load comparison scans.'; } }
    finally { if (isCurrent() && seq === sequence) { busy = false; update(); } }
  }
  select.onchange = async () => {
    const id = select.value; result.replaceChildren(); if (!id) { update(); return; }
    const seq = ++sequence; busy = true; message.textContent = 'Loading baseline…'; update();
    try {
      const baseline = await api<{ report: Report }>(`/scans/${id}`);
      if (!isCurrent() || seq !== sequence) return;
      const comparison = compareReports(report, baseline.report);
      result.append(element('h3', 'Compared with ' + new Date(baseline.report.observation.scannedAt).toLocaleString()),
        element('p', `${comparison.added.length} newly observed · ${comparison.removed.length} no longer observed · ${comparison.changed.length} changed. Score change: ${comparison.scoreChange > 0 ? '+' : ''}${comparison.scoreChange}.`),
        element('p', comparisonCaveat(comparison), 'muted'));
      const sections = [
        ['Newly observed', comparison.added.map(f => `${f.title} / ${f.severity} / ${f.url}`)],
        ['No longer observed', comparison.removed.map(f => `${f.title} / ${f.severity} / ${f.url}`)],
        ['Changed evidence or assessment', comparison.changed.map(({ before, after }) => `${after.title}\nBaseline (${before.severity}, ${before.confidence} confidence): ${JSON.stringify(before.evidence)}\nSelected (${after.severity}, ${after.confidence} confidence): ${JSON.stringify(after.evidence)}`)]
      ] as const;
      for (const [heading, items] of sections) if (items.length) {
        const details = element('details'), summary = element('summary', `${heading} (${items.length})`), list = element('ul');
        for (const item of items) list.append(element('li', item)); details.append(summary, list); result.append(details);
      }
      message.textContent = '';
    } catch (error) { if (isCurrent() && seq === sequence) message.textContent = error instanceof Error ? error.message : 'Could not compare these scans.'; }
    finally { if (isCurrent() && seq === sequence) { busy = false; update(); } }
  };
  panel.ontoggle = () => { if (panel.open && !loaded && !busy && isCurrent()) void load(1); };
  previous.onclick = () => { if (!busy) void load(Math.max(1, page - 1)); };
  next.onclick = () => { if (!busy) void load(page + 1); };
  clear.onclick = () => { result.replaceChildren(); select.value = ''; message.textContent = ''; update(); };
  update(); return panel;
}

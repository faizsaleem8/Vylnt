import type { Report } from '../../packages/core';
import { summarizeScan, type ScanPage } from '../../packages/core/summary';
import { coverageLabel, historyTrend, trendLimit } from '../../packages/core/trends';
import { element } from './ui';

export function trendsPanel(report: Report, api: <T>(path: string) => Promise<T>, isCurrent: () => boolean) {
  const panel = element('details', '', 'comparison-panel trend-panel');
  const body = element('div', '', 'comparison-body');
  const status = element('p', '', 'review-status'); status.setAttribute('role', 'status');
  const refresh = element('button', 'Refresh trends');
  const result = element('div');
  body.append(status, refresh, result); panel.append(element('summary', 'History trends'), body);
  let busy = false, loaded = false;
  async function load() {
    if (busy || !isCurrent()) return;
    busy = true; refresh.disabled = true; status.textContent = 'Loading history trends…'; result.replaceChildren();
    try {
      const data = await api<ScanPage>(`/scans/${report.scanId}/comparisons?page=1&limit=${trendLimit}`);
      if (!isCurrent()) return;
      const selected = summarizeScan({ report, hash: '', receivedAt: report.observation.scannedAt });
      const trend = historyTrend(selected, data.scans);
      loaded = true;
      status.textContent = `Selected scan and ${trend.points.length - 1} of ${data.total} other saved scans of this exact page. Up to ${trendLimit} most recent other scans are shown.`;
      result.append(element('p', 'Configuration scores are heuristic, not a probability of compromise. Fewer findings do not prove fixes. History summaries do not include ruleset versions; use Compare saved scans to check a pair.', 'muted'));
      if (trend.partial || trend.coverageChanged) result.append(element('p', `${trend.coverageChanged ? 'Collection coverage differs between observations. ' : ''}${trend.partial ? 'Some observations have incomplete collection. ' : ''}Compare coverage before interpreting changes.`, 'trend-caveat'));
      if (trend.points.length < 2) result.append(element('p', 'No other saved scans of this page yet. Save another observation to see a trend.'));
      else {
        for (const [name, key, ceiling] of [['Configuration score (0–100)', 'score', 100], ['Observed findings', 'findingCount', Math.max(1, ...trend.points.map(p => p.scan.findingCount))]] as const) {
          const figure = element('figure', '', 'trend-figure'); figure.append(element('figcaption', name));
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 320 130'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${name} by observation time. Exact values and coverage are listed below.`);
          for (const value of [0, ceiling]) {
            const label = document.createElementNS(svg.namespaceURI, 'text'); label.setAttribute('x', '0'); label.setAttribute('y', String(112 - value / ceiling * 96)); label.textContent = String(value); svg.append(label);
          }
          // Discrete observations: do not imply continuous monitoring or interpolate missing collection.
          for (const { scan, fraction } of trend.points) {
            const dot = document.createElementNS(svg.namespaceURI, 'circle');
            dot.setAttribute('cx', String(36 + fraction * 272)); dot.setAttribute('cy', String(108 - scan[key] / ceiling * 96));
            dot.setAttribute('r', scan.scanId === report.scanId ? '5' : '3');
            dot.setAttribute('class', scan.coverage.headers && scan.coverage.dom && scan.coverage.cookies ? 'trend-collected' : 'trend-partial');
            const title = document.createElementNS(svg.namespaceURI, 'title'); title.textContent = `${new Date(scan.scannedAt).toLocaleString()}: ${scan[key]}. ${coverageLabel(scan)}`; dot.append(title); svg.append(dot);
          }
          const dates = element('div', '', 'trend-dates'); dates.append(element('span', new Date(trend.points[0].scan.scannedAt).toLocaleString()), element('span', new Date(trend.points.at(-1)!.scan.scannedAt).toLocaleString()));
          figure.append(svg, dates); result.append(figure);
        }
        result.append(element('p', 'Time runs left to right. Hollow dots indicate incomplete collection; larger dots mark the selected scan. Observations at the same time can overlap.', 'muted'));
      }
      const details = element('details'), list = element('ol', '', 'trend-values'); details.append(element('summary', `Observation values (${trend.points.length})`), list);
      for (const { scan } of trend.points) {
        const item = element('li'); item.append(element('strong', `${new Date(scan.scannedAt).toLocaleString()}${scan.scanId === report.scanId ? ' · Selected scan' : ''}`), element('p', `Score ${scan.score}/100 · ${scan.findingCount} findings · ${scan.highCount} high/critical`), element('p', coverageLabel(scan), 'muted'), element('small', `Scan ${scan.scanId}`)); list.append(item);
      }
      result.append(details);
    } catch (error) { if (isCurrent()) status.textContent = error instanceof Error ? error.message : 'Could not load history trends. Use Refresh trends to retry.'; }
    finally { if (isCurrent()) { busy = false; refresh.disabled = false; } }
  }
  panel.ontoggle = () => { if (panel.open && !loaded) void load(); }; refresh.onclick = () => void load();
  return panel;
}

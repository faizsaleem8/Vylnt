import type { Finding, Report } from './index';
import { safeUrl, weights } from './index';

/** Deterministic compression, not ML adjudication or a change to saved findings. */
export function summarizeReport(report: Report) {
  const groups = new Map<string, { finding: Finding; findingIds: string[]; count: number; samples: { url: string; evidence: string }[] }>();
  for (const finding of report.findings) {
    const key = JSON.stringify([finding.ruleId, finding.title, finding.severity, finding.confidence, finding.description, finding.recommendation]);
    let group = groups.get(key);
    if (!group) { group = { finding, findingIds: [], count: 0, samples: [] }; groups.set(key, group); }
    group.count++;
    group.findingIds.push(finding.id);
    if (group.samples.length < 3) { const url = safeUrl(finding.url); group.samples.push({ url: url.length > 180 ? url.slice(0, 180) + '… [preview limited]' : url, evidence: JSON.stringify(finding.evidence).slice(0, 240) }); }
  }
  return [...groups.values()].sort((a, b) => weights[b.finding.severity] - weights[a.finding.severity] || a.finding.ruleId.localeCompare(b.finding.ruleId));
}

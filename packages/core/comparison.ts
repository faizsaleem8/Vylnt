import type { Finding, Report } from './index';
import { canonicalJson } from './integrity';

const comparableFinding = (finding: Finding) => canonicalJson({ severity: finding.severity, confidence: finding.confidence, evidence: finding.evidence });
const coverage = (report: Report) => [report.observation.headers !== undefined, report.observation.domCollected, report.observation.cookies !== undefined];

/** Direction is selected report minus baseline. Observation time is not a finding change. */
export function compareReports(selected: Report, baseline: Report) {
  if (selected.observation.url !== baseline.observation.url) throw new Error('Choose a saved scan of the same page URL.');
  if (selected.scanId === baseline.scanId) throw new Error('Choose a different scan to compare.');
  const before = new Map(baseline.findings.map(finding => [finding.id, finding]));
  const after = new Map(selected.findings.map(finding => [finding.id, finding]));
  return {
    added: selected.findings.filter(finding => !before.has(finding.id)),
    removed: baseline.findings.filter(finding => !after.has(finding.id)),
    changed: selected.findings.flatMap(finding => {
      const previous = before.get(finding.id);
      return previous && comparableFinding(finding) !== comparableFinding(previous) ? [{ before: previous, after: finding }] : [];
    }),
    scoreChange: selected.score - baseline.score,
    coverageChanged: coverage(selected).some((observed, index) => observed !== coverage(baseline)[index]),
    rulesetChanged: selected.rulesetVersion !== baseline.rulesetVersion
  };
}
export function comparisonCaveat(result: ReturnType<typeof compareReports>) {
  return [result.coverageChanged ? 'Collection coverage differs.' : '', result.rulesetChanged ? 'Ruleset versions differ.' : '',
    'Differences describe observations; a finding no longer observed does not establish that it was fixed.'].filter(Boolean).join(' ');
}

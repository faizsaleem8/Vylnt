import { weights, RULESET_VERSION, type Report } from './index';

export const gatePolicy = 'vynlt-high-critical-high-confidence-v1';
/** Deterministic policy only. No model signal, review note or exception can waive it. */
export function evaluateGate(report: Report) {
  if (report.rulesetVersion !== RULESET_VERSION || !report.observation.domCollected || report.observation.headers === undefined || report.observation.cookies === undefined) throw new Error('Required scan coverage or compatible ruleset is missing');
  const blocking = report.findings.filter(finding => weights[finding.severity] >= weights.high && finding.confidence === 'high');
  return { policy: gatePolicy, blocking, warnings: report.findings.filter(finding => !blocking.includes(finding)) };
}

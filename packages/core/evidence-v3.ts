import type { Finding, Report } from './index';
import { canonicalJson } from './integrity';
import { prepareEvidenceContexts, evidenceFeatureNames } from './evidence-context';
import type { EvidenceContext } from './insight-contracts';

export const evidenceVersion3 = 'vynlt-evidence-v3' as const;
const insertion = evidenceFeatureNames.length - 8;
export const evidenceFeatureNames3 = [...evidenceFeatureNames.slice(0, insertion), 'targetCspSourceExcluded', ...evidenceFeatureNames.slice(insertion)] as const;
export type EvidenceContext3 = Omit<EvidenceContext, 'version'> & { version: typeof evidenceVersion3 };
export type ScriptSourceConstraint = 'excluded' | 'permitted' | 'unknown' | 'contradictory';

/** A deliberately limited source-list matcher, not a browser execution verdict.
 * W3C CSP3: first directive wins; script-src-elem/script-src/default-src fallback;
 * multiple enforced policies intersect. Nonces, dynamic trust, redirects and
 * unsupported source expressions cannot be reconstructed from stored metadata.
 */
export function scriptSourceConstraint(report: Report, finding: Finding): ScriptSourceConstraint {
  const o = report.observation;
  if (finding.ruleId !== 'JS-002' || !o.domCollected || !o.headers || o.cspEvidenceComplete !== true) return 'unknown';
  const scripts = o.scripts.filter(s => s.url === finding.url);
  if (!scripts.length || scripts.some(s => s.integrity !== false)) return 'unknown';
  let page: URL, target: URL;
  try { page = new URL(o.url); target = new URL(finding.url); } catch { return 'unknown'; }
  if (page.protocol !== 'https:' || target.protocol !== 'https:' || page.username || page.password || target.username || target.password) return 'unknown';
  const header = o.headers['content-security-policy'];
  // Absence/report-only is not evidence of an enforced policy.
  if (!header || header.length >= 8192 || /[^\x09\x20-\x7e]/.test(header)) return 'unknown';
  const policies = header.split(',');
  if (policies.length > 16) return 'unknown';
  const decisions: boolean[] = [];
  for (const policy of policies) {
    const directives = new Map<string, string[]>();
    for (const raw of policy.split(';')) {
      const tokens = raw.trim().split(/[\t ]+/);
      const name = tokens.shift()!.toLowerCase();
      if (!name) continue;
      if (!/^[a-z0-9-]+$/.test(name)) return 'unknown';
      if (!directives.has(name)) directives.set(name, tokens);
    }
    const sources = directives.get('script-src-elem') ?? directives.get('script-src') ?? directives.get('default-src');
    if (!sources) return 'unknown';
    let permitted = false;
    for (const source of sources) {
      if (source === "'none'") { if (sources.length !== 1) return 'unknown'; continue; }
      if (source === "'self'") { permitted ||= page.origin === target.origin; continue; }
      // Inline hashes cannot authorise this integrity-less external script.
      if (/^'sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}'$/.test(source)) continue;
      // Exact HTTPS origins only: no wildcard, paths, nonce, scheme matching,
      // implicit ports, or browser URL normalisation of malformed expressions.
      if (!/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?\/?$/.test(source)) return 'unknown';
      let allowed: URL;
      try { allowed = new URL(source); } catch { return 'unknown'; }
      if (allowed.hostname.endsWith('.') || allowed.port === '0') return 'unknown';
      permitted ||= allowed.origin === target.origin;
    }
    decisions.push(permitted);
  }
  const excluded = decisions.some(d => !d);
  if (excluded && o.resources.some(r => r.url === finding.url && r.type === 'script' && r.outcome === 'completed')) return 'contradictory';
  return excluded ? 'excluded' : 'permitted';
}

/** New training input only. Historical v2 tensors and saved reports stay stable. */
export function prepareEvidenceContexts3(report: Report): (finding: Finding) => EvidenceContext3 {
  const original = prepareEvidenceContexts(report);
  return finding => {
    const context = original(finding);
    const constraint = scriptSourceConstraint(report, finding);
    const value = constraint === 'excluded' ? 1 : constraint === 'permitted' ? 0 : -1;
    const sequence = context.sequence.map((row, index) => [...row.slice(0, insertion), index === context.sequence.length - 1 ? value : -1, ...row.slice(insertion)]);
    return { ...context, version: evidenceVersion3, sequence, variant: canonicalJson(sequence),
      facts: { ...context.facts, targetCspSourceConstraint: constraint },
      missingContext: [...context.missingContext, ...(finding.ruleId === 'JS-002' ? ['CSP source-list matching is not evidence of execution, vendor trust or exploitability; meta policies and runtime changes are not collected.'] : [])] };
  };
}

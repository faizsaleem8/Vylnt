import type { Finding, Report } from './index';
import { canonicalJson } from './integrity';
import { evidenceVersion, type EvidenceContext, type EvidenceValue } from './insight-contracts';

export const evidenceRules = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001', 'JS-002'] as const;
export const evidenceFeatureNames = [
  'coverage', 'resource', 'script', 'cookie', 'target',
  'headersCollected', 'domCollected', 'cookiesCollected', 'contextCapped',
  'https', 'external', 'secure', 'httpOnly', 'session', 'sameSiteNone', 'sameSiteLax', 'sameSiteStrict',
  'integrity', 'module', 'async', 'defer', 'completed', 'failed', 'requested', 'referenced',
  'scriptResource', 'imageResource', 'frameResource', 'styleResource',
  'hstsPositive', 'hstsPresent', 'cspPresent', 'scriptDirective', 'broadScriptSource', 'frameAncestors', 'xFrameRestrictive',
  'matchingUnknown', ...evidenceRules.map(rule => `rule_${rule}`),
] as const;
export const evidenceStepLimit = 74;
export function contextRequiresReview(report: Report, context: EvidenceContext): boolean {
  return ['missing', 'ambiguous'].includes(context.matching)
    || report.observation.headers === undefined || report.observation.cookies === undefined || !report.observation.domCollected
    || context.sequence[0][evidenceFeatureNames.indexOf('contextCapped')] === 1
    || (context.category === 'JS-002' && ['module', 'async', 'defer'].some(k => context.facts[k] === 'unknown'));
}
type Facts = Record<string, EvidenceValue>;
const row = (facts: Facts) => evidenceFeatureNames.map(name => facts[name] === 'unknown' || facts[name] === undefined ? -1 : Number(facts[name]));
const flag = (value: boolean | undefined) => value === undefined ? 'unknown' : value;
const urlFlags = (raw: string, page: string): Facts => {
  try { const u = new URL(raw); return { https: u.protocol === 'https:', external: u.origin !== new URL(page).origin }; }
  catch { return { https: 'unknown', external: 'unknown' }; }
};
function policyFacts(report: Report): Facts {
  const h = report.observation.headers;
  if (!h) return Object.fromEntries(['hstsPositive', 'hstsPresent', 'cspPresent', 'scriptDirective', 'broadScriptSource', 'frameAncestors', 'xFrameRestrictive'].map(k => [k, 'unknown']));
  const csp = h['content-security-policy'] ?? '';
  return { hstsPositive: /(?:^|;)\s*max-age\s*=\s*"?[1-9]\d*"?\s*(?:;|$)/i.test(h['strict-transport-security'] ?? ''),
    hstsPresent: Boolean(h['strict-transport-security']), cspPresent: Boolean(csp),
    scriptDirective: /(?:^|[;,])\s*(?:script-src(?:-elem)?|default-src)\s/i.test(csp),
    broadScriptSource: /(?:\s|^)(?:\*|'unsafe-inline'|'unsafe-eval'|https?:|data:)(?:\s|;|$)/i.test(csp),
    frameAncestors: /(?:^|[;,])\s*frame-ancestors\s/i.test(csp), xFrameRestrictive: /^(deny|sameorigin)$/i.test((h['x-frame-options'] ?? '').trim()) };
}
/** These flags describe a snapshot, not CSP effectiveness or runtime execution. */
export function prepareEvidenceContexts(report: Report): (finding: Finding) => EvidenceContext {
  const o = report.observation;
  const policy = policyFacts(report);
  const scriptFacts = (s: Report['observation']['scripts'][number]): Facts => ({ ...urlFlags(s.url, o.url), integrity: s.integrity,
    module: s.scriptType === undefined || s.scriptType === 'other' ? 'unknown' : s.scriptType === 'module', async: flag(s.async), defer: flag(s.defer) });
  const cookieFacts = (c: NonNullable<Report['observation']['cookies']>[number]): Facts => ({ secure: c.secure, httpOnly: c.httpOnly, session: c.session,
    sameSiteNone: c.sameSite === 'no_restriction', sameSiteLax: c.sameSite === 'lax', sameSiteStrict: c.sameSite === 'strict' });
  const resourceFacts = (r: Report['observation']['resources'][number]): Facts => ({ ...urlFlags(r.url, o.url), completed: r.outcome === 'completed', failed: r.outcome === 'failed', requested: r.outcome === 'requested', referenced: r.outcome === 'referenced',
    scriptResource: r.type === 'script', imageResource: r.type === 'image', frameResource: ['iframe', 'sub_frame'].includes(r.type), styleResource: ['link', 'stylesheet'].includes(r.type) });
  // Deduplicate structural context before the cap. Identifiers, counts and names never enter the tensor.
  const contextRows = (items: Facts[], kind: string) => [...new Map(items.map(f => { const r = row({ ...f, [kind]: true }); return [canonicalJson(r), r] as const; })).values()].sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b))).slice(0, 24);
  const capped = o.resources.length >= 600 || o.scripts.length >= 150 || (o.cookies?.length ?? 0) >= 100;
  const resources = contextRows(o.resources.map(resourceFacts), 'resource');
  const scripts = contextRows(o.domCollected ? o.scripts.map(scriptFacts) : [], 'script');
  const cookies = contextRows((o.cookies ?? []).map(cookieFacts), 'cookie');
  const base = [row({ coverage: true, ...policy, headersCollected: o.headers !== undefined, domCollected: o.domCollected, cookiesCollected: o.cookies !== undefined,
    contextCapped: capped || new Set(o.resources.map(r => canonicalJson(resourceFacts(r)))).size > 24 || new Set(o.scripts.map(s => canonicalJson(scriptFacts(s)))).size > 24 || new Set((o.cookies ?? []).map(c => canonicalJson(cookieFacts(c)))).size > 24 }), ...resources, ...scripts, ...cookies];
  return (finding: Finding): EvidenceContext => {
  let candidates: Facts[] = [];
  if (finding.ruleId.startsWith('HDR-') && o.headers !== undefined) candidates = [policy];
  if (finding.ruleId.startsWith('CK-')) candidates = (o.cookies ?? []).filter(c => c.name === finding.evidence.cookieName).map(cookieFacts);
  if (finding.ruleId === 'JS-002' && o.domCollected) candidates = o.scripts.filter(s => s.url === finding.url).map(scriptFacts);
  if (finding.ruleId === 'NET-001') candidates = o.resources.filter(r => r.url === finding.url && r.type === finding.evidence.resourceType && (finding.evidence.observedOutcome === undefined || r.outcome === finding.evidence.observedOutcome)).map(resourceFacts);
  const distinct = [...new Map(candidates.map(f => [canonicalJson(f), f])).values()];
  const supported = evidenceRules.includes(finding.ruleId as typeof evidenceRules[number]);
  const matching = !supported || !distinct.length ? 'missing' : distinct.length > 1 ? 'ambiguous' : candidates.length > 1 ? 'equivalent' : 'unique';
  const facts: Facts = { ...urlFlags(finding.url, o.url), ...policy, ...(distinct.length === 1 ? distinct[0] : {}),
    headersCollected: o.headers !== undefined, domCollected: o.domCollected, cookiesCollected: o.cookies !== undefined,
    matchingUnknown: matching === 'missing' || matching === 'ambiguous' };
  const missingContext = ['Application intent and impact have not been independently verified.'];
  if (matching === 'missing' || matching === 'ambiguous') missingContext.push(`Target metadata is ${matching}; do not infer absent attributes.`);
  if (finding.ruleId.startsWith('CK-')) missingContext.push('Cookie purpose, JavaScript access requirements and CSRF protections are unknown; the cookie name is not proof of sensitive state.');
  if (finding.ruleId === 'JS-002') missingContext.push('Vendor trust, static content stability and integrity compatibility are unknown.');
  if (finding.ruleId === 'HDR-001') missingContext.push('HTTPS coverage, HSTS preload and subdomain compatibility are unknown.');
  if (finding.ruleId === 'HDR-002') missingContext.push('Whether embedding is intentional is unknown.');
  if (finding.ruleId === 'HDR-003') missingContext.push('Meta policies, inline script requirements and exploitability are not established.');
  if (finding.ruleId === 'NET-001') missingContext.push('A snapshot does not establish browser upgrade or blocking behaviour.');
  if (finding.ruleId === 'JS-002' && ['module', 'async', 'defer'].some(k => facts[k] === 'unknown')) missingContext.push('Some script attributes were not collected by this scan version.');
  if (capped) missingContext.push('Collection reached a storage bound; additional observations may be missing.');
  const sequence = [...base,
    row({ target: true, ...facts, [`rule_${finding.ruleId}`]: true })];
  return { version: evidenceVersion, category: finding.ruleId, findingId: finding.id, matching, facts, missingContext,
    sequence, variant: canonicalJson(sequence), order: 'structural-snapshot' };
  };
}
export function evidenceContext(report: Report, finding: Finding): EvidenceContext {
  return prepareEvidenceContexts(report)(finding);
}

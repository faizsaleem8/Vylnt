export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export interface CookieMetadata {
  name: string; secure: boolean; httpOnly: boolean;
  sameSite: 'no_restriction' | 'lax' | 'strict' | 'unspecified'; session: boolean;
}
export interface Resource { url: string; type: string; outcome: 'referenced' | 'requested' | 'completed' | 'failed' }
export interface ScriptMetadata { url: string; integrity: boolean; scriptType?: 'classic' | 'module' | 'other'; async?: boolean; defer?: boolean }
export interface Observation {
  url: string; scannedAt: string;
  headers?: Record<string, string>;
  /** Collector observed the complete, faithfully representable enforced CSP. Older scans omit this. */
  cspEvidenceComplete?: boolean;
  cookies?: CookieMetadata[];
  resources: Resource[];
  scripts: ScriptMetadata[];
  domCollected: boolean;
}
export interface Finding {
  id: string; ruleId: string; title: string; severity: Severity;
  confidence: 'high' | 'medium' | 'low'; url: string;
  description: string; evidence: Record<string, string | boolean>;
  recommendation: string; detectedAt: string;
}
export interface Report {
  scanId: string; rulesetVersion: string; observation: Observation;
  findings: Finding[]; score: number;
}
export const RULESET_VERSION = '0.2.0';
export const weights: Record<Severity, number> = { critical: 20, high: 10, medium: 5, low: 2, info: 0 };

// Drop all query/fragment data and credentials, not just a list of known secrets.
export function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '[unsupported URL]';
    return `${url.origin}${url.pathname}`;
  } catch { return '[invalid URL]'; }
}
export function securityHeaders(headers: { name: string; value?: string }[]): Record<string, string> {
  const allowed = new Set(['strict-transport-security', 'content-security-policy', 'x-frame-options']);
  const result: Record<string, string> = {};
  for (const h of headers) {
    const key = h.name.toLowerCase();
    if (allowed.has(key) && h.value) {
      // CSP is useful policy metadata, but its source URLs/nonces can contain secrets.
      const value = h.value.slice(0, 8192).replace(/'nonce-[^']*'/gi, "'nonce-[redacted]'")
        .replace(/https?:\/\/[^\s;,]+/gi, raw => safeUrl(raw));
      result[key] = (result[key] ? `${result[key]}, ${value}` : value).slice(0, 8192);
    }
  }
  return result;
}
/** Only a boolean survives; raw policy secrets are never retained. */
export function cspEvidenceComplete(headers: { name: string; value?: string }[]): boolean {
  const policies = headers.filter(h => h.name.toLowerCase() === 'content-security-policy').map(h => h.value ?? '');
  if (!policies.length || policies.some(p => !p || p.length >= 8192) || policies.join(', ').length >= 8192) return false;
  return policies.every(policy => !/'nonce-[^']*'/i.test(policy) && [...policy.matchAll(/https?:\/\/[^\s;,]+/gi)].every(([raw]) => {
    const safe = safeUrl(raw);
    // Adding the root slash preserves source-list matching. Other sanitation
    // can remove distinguishing syntax, so do not claim complete evidence.
    return safe === raw || safe === `${raw}/`;
  }));
}
export function cookieMetadata(cookie: CookieMetadata): CookieMetadata {
  return { name: cookie.name.slice(0, 100), secure: cookie.secure, httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite, session: cookie.session };
}
const isSensitive = (name: string) => /(?:session|sessid|sid$|auth|token|jwt)/i.test(name);

export function evaluate(observation: Observation): Finding[] {
  const findings: Finding[] = [];
  const url = safeUrl(observation.url);
  const add = (ruleId: string, title: string, severity: Severity, confidence: Finding['confidence'],
    description: string, evidence: Finding['evidence'], recommendation: string, affected = url) => {
    const cleanUrl = safeUrl(affected);
    const id = `${ruleId}:${cleanUrl}:${String(evidence.cookieName ?? evidence.resourceType ?? '')}`;
    if (!findings.some(f => f.id === id)) findings.push({ id, ruleId, title, severity, confidence,
      url: cleanUrl, description, evidence, recommendation, detectedAt: observation.scannedAt });
  };
  const headers = observation.headers;
  if (headers) {
    if (url.startsWith('https:') && !/(?:^|;)\s*max-age\s*=\s*"?[1-9]\d*"?\s*(?:;|$)/i.test(headers['strict-transport-security'] ?? '')) {
      add('HDR-001', 'HSTS is missing or disabled', 'medium', 'high',
        'The observed HTTPS response does not advertise a positive HSTS lifetime. This does not prove the site is absent from browser preload lists.',
        { policyPresent: Boolean(headers['strict-transport-security']) }, 'Serve a valid Strict-Transport-Security header with a positive max-age after verifying HTTPS coverage.');
    }
    const csp = headers['content-security-policy'] ?? '';
    // Separate policies are enforced together. Evaluate each policy's first directive occurrence.
    const policies = csp.split(',').map(policy => {
      const directives = new Map<string, string[]>();
      for (const part of policy.split(';')) {
        const [name, ...values] = part.trim().split(/\s+/);
        if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), values);
      }
      return directives;
    });
    const framed = policies.some(p => {
      const values = p.get('frame-ancestors');
      return values && values.length > 0 && values.every(v => v === "'none'" || v === "'self'" || /^https:\/\/[^*\s]+$/.test(v));
    });
    if (!framed && !/^(deny|sameorigin)$/i.test((headers['x-frame-options'] ?? '').trim())) {
      add('HDR-002', 'Framing protection needs review', 'medium', 'medium',
        'No recognized restrictive frame-ancestors or X-Frame-Options policy was observed. Whether framing is harmful depends on the page.',
        { recognizedProtection: false }, "Set Content-Security-Policy: frame-ancestors 'none' or an explicit trusted allowlist; use SAMEORIGIN where appropriate.");
    }
    const protectedScripts = policies.some(p => {
      const values = p.get('script-src-elem') ?? p.get('script-src') ?? p.get('default-src');
      return values && values.length > 0 && !values.some(v => ['*', "'unsafe-inline'", "'unsafe-eval'", 'http:', 'https:', 'data:'].includes(v));
    });
    if (!protectedScripts) add('HDR-003', 'Script policy is missing or broad', 'medium', 'medium',
      'The response lacks a recognized restrictive script policy. This heuristic does not prove exploitable XSS and does not evaluate every CSP directive or meta policy.',
      { responsePolicyPresent: Boolean(csp) }, 'Deploy a tested CSP using nonces or hashes and narrowly scoped script sources; review inline and eval requirements.');
  }
  for (const cookie of observation.cookies ?? []) {
    if (!isSensitive(cookie.name)) continue;
    const evidence = { cookieName: cookie.name, sensitiveNameHeuristic: true };
    if (!cookie.secure) add('CK-001', 'Potential session cookie lacks Secure', 'high', 'medium',
      'A cookie with a session or authentication-like name lacks Secure. Its purpose is inferred from its name.', evidence,
      'Use HTTPS and set Secure on authentication cookies. Confirm whether this cookie carries sensitive state.');
    if (!cookie.httpOnly) add('CK-002', 'Potential session cookie lacks HttpOnly', 'medium', 'medium',
      'A potentially sensitive cookie is accessible to page JavaScript; its name is only a heuristic.', evidence,
      'Set HttpOnly on server-managed session cookies that do not need JavaScript access.');
    if (cookie.sameSite === 'no_restriction') add('CK-003', 'Cross-site session cookie needs review', 'medium', 'medium',
      'SameSite=None permits cross-site cookie use. This can be intentional; check CSRF defenses.', evidence,
      'Prefer SameSite=Lax or Strict when compatible. For cross-site authentication, retain Secure and explicit CSRF protection.');
  }
  if (url.startsWith('https:')) {
    for (const resource of observation.resources) if (resource.url.startsWith('http:')) {
      add('NET-001', 'HTTP resource referenced by an HTTPS page', resource.type === 'image' ? 'medium' : 'high', 'high',
        'An insecure resource URL was observed. A DOM reference alone does not establish whether the browser loaded, upgraded, or blocked it.',
        { resourceType: resource.type, observedOutcome: resource.outcome }, 'Replace the resource URL with HTTPS or remove the dependency.', resource.url);
    }
  }
  for (const script of observation.scripts) {
    try {
      if (new URL(script.url).origin !== new URL(url).origin && !script.integrity) add('JS-002',
        'Third-party script has no integrity attribute', 'info', 'high',
        'An external script has no SRI attribute. This is an inventory observation; other controls may be sufficient.',
        { integrityAttributePresent: false }, 'For static third-party scripts, consider a pinned version and Subresource Integrity. Review CSP and vendor trust.', script.url);
    } catch { /* unsupported script schemes are outside this rule */ }
  }
  return findings.sort((a, b) => weights[b.severity] - weights[a.severity] || a.id.localeCompare(b.id));
}
export function scoreFindings(findings: Finding[]): number {
  const byRule = new Map<string, number>();
  for (const f of findings) byRule.set(f.ruleId, Math.max(byRule.get(f.ruleId) ?? 0, weights[f.severity]));
  return Math.max(0, 100 - [...byRule.values()].reduce((a, b) => a + b, 0));
}
export function createReport(scanId: string, observation: Observation): Report {
  const findings = evaluate(observation);
  return { scanId, rulesetVersion: RULESET_VERSION, observation, findings, score: scoreFindings(findings) };
}

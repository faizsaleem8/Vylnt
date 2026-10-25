import { weights, RULESET_VERSION, type Report } from '../core';
import { canonicalJson } from '../core/integrity';
import { prepareEvidenceContexts, evidenceRules } from '../core/evidence-context';
import { prepareEvidenceContexts3 } from '../core/evidence-v3';
import { catalogVersion, decisionVersion, evidenceVersion, insightVersion, type AssessmentState, type InsightAnalysis, type InsightAssessment } from '../core/insight-contracts';

/** Developer-reviewed conservative templates. They never infer application purpose from identifiers. */
export const remediationCatalog: Record<string, { change: string; compatibility: string; verify: string; reference: string }> = {
  'HDR-001': { change: 'After checking HTTPS coverage, configure a positive HSTS max-age. Stage rollout before considering includeSubDomains or preload.', compatibility: 'Check every affected subdomain and certificate before extending policy.', verify: 'Inspect the HTTPS response and test HTTP navigation in a fresh browser profile.', reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security' },
  'HDR-002': { change: "If framing is not intended, configure frame-ancestors 'none' or a specific trusted allowlist.", compatibility: 'Preserve intentional embedded applications and partner integrations.', verify: 'Inspect enforced response headers and attempt intended and disallowed embedding.', reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors' },
  'HDR-003': { change: 'Inventory script requirements, trial a restrictive report-only CSP, then enforce a tested nonce/hash and source policy.', compatibility: 'Inline code, third-party widgets and dynamic loaders may require changes.', verify: 'Inspect enforced policies and exercise important flows while reviewing CSP violations.', reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP' },
  'CK-001': { change: 'Confirm cookie purpose. For sensitive state, use HTTPS and set Secure.', compatibility: 'Check local development, cross-site flows and HTTPS coverage.', verify: 'Inspect cookie attributes without copying values; verify relevant sign-in and cross-site flows.', reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure' },
  'CK-002': { change: 'For server-managed sensitive state that does not require script access, set HttpOnly.', compatibility: 'Do not disable intentional JavaScript access without adapting the application.', verify: 'Inspect HttpOnly and exercise affected flows. Do not collect or print cookie values.', reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly' },
  'CK-003': { change: 'Confirm cross-site requirements. Prefer Lax or Strict where compatible; retain Secure and explicit CSRF protection where None is needed.', compatibility: 'Cross-site authentication and embedded applications may intentionally need None.', verify: 'Exercise cross-site sign-in and state-changing requests; independently test CSRF protections.', reference: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value' },
  'NET-001': { change: 'Replace the HTTP resource reference with a working HTTPS URL or remove the dependency.', compatibility: 'Confirm the HTTPS endpoint serves the expected content and remains compatible.', verify: 'Reload with network inspection, confirm the reference and final request use HTTPS, and rescan.', reference: 'https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content' },
  'JS-002': { change: 'For stable third-party scripts, consider pinned versions and Subresource Integrity; otherwise review CSP and supplier controls.', compatibility: 'Changing scripts can invalidate integrity hashes. Check CORS and dynamic delivery before adding SRI.', verify: 'Compare integrity metadata with independently obtained content, test loading/CORS and exercise the application.', reference: 'https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity' },
};

export function aggregateAssessment(states: AssessmentState[], highSeverity = false): AssessmentState {
  if (states.includes('change-warranted')) return 'change-warranted';
  if (highSeverity || !states.length || states.includes('needs-review')) return 'needs-review';
  return 'contextual';
}
const explanation = (category: string, assessment: AssessmentState) => assessment === 'change-warranted' && category === 'NET-001'
  ? 'The collected metadata contains an HTTP resource reference on an HTTPS page. Updating that reference is warranted; this does not establish that insecure content executed.'
  : assessment === 'change-warranted' ? 'The qualified category model supports reviewing this configuration for change within its tested scope. Verify the original evidence and application assumptions before applying a fix.'
  : assessment === 'contextual' ? 'The qualified category model places this evidence context in the compact contextual section within its tested scope. This is not a claim that the website is harmless.'
  : evidenceRules.includes(category as typeof evidenceRules[number]) ? 'The rule observed a configuration or inventory condition. Available metadata does not establish application impact or justify treating this observation as harmless.' : 'This category has no supported assessment contract and requires review.';
export function buildInsightAnalysis(report: Report, qualified?: { model: InsightAnalysis['model']; decisions: Map<string, AssessmentState>; inputSchema?: 'vynlt-evidence-v3' }): InsightAnalysis {
  const grouped = new Map<string, InsightAssessment>();
  const extract = qualified?.inputSchema === 'vynlt-evidence-v3' ? prepareEvidenceContexts3(report) : prepareEvidenceContexts(report);
  for (const finding of report.findings) {
    const context = extract(finding);
    // Only decisions from a verified release may alter relevance; raw severity is preserved.
    const proposed = qualified?.decisions.get(finding.id);
    const assessment: AssessmentState = report.rulesetVersion !== RULESET_VERSION || ['missing', 'ambiguous'].includes(context.matching) ? 'needs-review'
      : proposed ? aggregateAssessment([proposed], ['critical', 'high'].includes(finding.severity))
      : finding.ruleId === 'NET-001' ? 'change-warranted' : 'needs-review';
    if (report.rulesetVersion !== RULESET_VERSION) context.missingContext.push('Ruleset is unsupported; retain evidence for review and do not apply a model verdict.');
    const template = remediationCatalog[finding.ruleId];
    const group = grouped.get(finding.ruleId);
    if (group) {
      group.findingIds.push(finding.id);
      const variant = group.evidenceContexts.find(c => c.variant === context.variant);
      if (variant) variant.findingIds.push(finding.id);
      else group.evidenceContexts.push({ variant: context.variant, findingIds: [finding.id], facts: context.facts, missingContext: context.missingContext });
      if (!group.variants.includes(context.variant)) { group.variants.push(context.variant); group.observedFacts.push(context.facts); }
      group.missingContext = [...new Set([...group.missingContext, ...context.missingContext])];
      // Any change-required member dominates review; no majority voting and repetition never raises severity.
      group.assessment = aggregateAssessment([group.assessment, assessment], ['critical', 'high'].includes(finding.severity) || ['critical', 'high'].includes(group.originalSeverity));
      group.explanation = explanation(group.category, group.assessment);
      if (weights[finding.severity] > weights[group.originalSeverity]) group.originalSeverity = finding.severity;
      if (['critical', 'high'].includes(finding.severity)) group.reviewPriority = 'high';
      continue;
    }
    grouped.set(finding.ruleId, { category: finding.ruleId, title: finding.title, findingIds: [finding.id], variants: [context.variant], evidenceContexts: [{ variant: context.variant, findingIds: [finding.id], facts: context.facts, missingContext: context.missingContext }], observedFacts: [context.facts], missingContext: context.missingContext,
      assessment, reviewPriority: ['critical', 'high'].includes(finding.severity) ? 'high' : 'normal', originalSeverity: finding.severity,
      explanation: explanation(finding.ruleId, assessment),
      recommendedChange: template?.change ?? 'Review the original evidence with the application owner before changing configuration.',
      compatibility: template?.compatibility ?? 'Application compatibility has not been assessed.', verification: template?.verify ?? 'Independently verify the configuration and rescan.',
      remediationReferences: template ? [`${catalogVersion}/${finding.ruleId}`, template.reference] : [] });
  }
  const all = [...grouped.values()].sort((a, b) => weights[b.originalSeverity] - weights[a.originalSeverity] || a.category.localeCompare(b.category));
  const issues = all.filter(i => i.assessment !== 'contextual'), contextual = all.filter(i => i.assessment === 'contextual');
  for (const issue of all) { issue.findingIds.sort(); issue.variants.sort(); issue.evidenceContexts.sort((a, b) => a.variant.localeCompare(b.variant)); issue.evidenceContexts.forEach(c => c.findingIds.sort()); issue.observedFacts.sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b))); }
  return { schemaVersion: qualified?.inputSchema ? 'vylnt-insights-v2' : insightVersion, inputSchema: qualified?.inputSchema ?? evidenceVersion, decisionPolicy: qualified?.inputSchema ? 'vylnt-controlled-category-v1' : decisionVersion, remediationCatalog: catalogVersion, scanId: report.scanId,
    model: qualified?.model ?? { name: 'No qualified evidence-v2 model release', hash: null, status: 'unavailable', approvedCategories: [] }, mode: qualified ? 'qualified-model' : 'evidence-summary',
    limitations: [...(report.rulesetVersion !== RULESET_VERSION ? ['Ruleset is unsupported; all observations require review.'] : []), 'No independently reviewed model category is approved. Synthetic model outputs do not determine relevance.', 'Structural snapshot order is not runtime execution order. Configuration observations are not proof of exploitation.', 'Only the existing eight checks are in scope; missing collection may hide additional issues.'],
    summary: `${report.findings.length} observations form ${all.length} issues; ${issues.filter(i => i.assessment === 'change-warranted').length} warrant configuration changes and ${issues.filter(i => i.assessment === 'needs-review').length} need review; ${contextual.length} contextual groups.`, issues, contextual };
}

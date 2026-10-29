import { z } from 'zod';
import type { Report, Finding } from './index';
import { canonicalJson, contentHash } from './integrity';
import { prepareEvidenceContexts3, evidenceFeatureNames3 } from './evidence-v3';
import { contextRequiresReview } from './evidence-context';
import { prepareEvidenceContexts } from './evidence-context';
import { framePolicyScope } from './frame-policy-scope';
import type { AssessmentState } from './insight-contracts';

export const projectRules = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001'] as const;
export const projectEvidenceVersion = 'vylnt-evidence-v4' as const;
export const projectPolicy = 'vylnt-project-assessment-v3' as const;
export const projectFactNames = [
  'tlsValidated', 'responseChainComplete', 'hstsSyntaxSupported', 'hstsPositive', 'hstsPreloadConfirmed', 'hstsApplicable',
  'framePolicyEnforced', 'frameAncestorsRestricted', 'embeddingPublicVerified', 'sensitiveActionVerified',
  'scriptPolicyEnforced', 'scriptSourcesRestricted', 'metaPolicyBeforeScripts', 'cspProbeBlocked', 'cspProbeAllowed',
  'cookieAuthDependency', 'cookiePreferenceVerified', 'cookieJsAccessObserved', 'cookieJsAccessRequired',
  'cookieCrossSiteRequired', 'csrfChecksPassed', 'stateChangingRoutesCovered',
  'resourceTlsUpgradeObserved', 'resourceHttpTransferObserved', 'resourceFunctionVerified', 'requestChainComplete',
] as const;
export type ProjectFactName = typeof projectFactNames[number];
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const projectInspectionSchema=z.object({version:z.literal('vylnt-express-inspection-v1'),framework:z.enum(['express','unsupported']),coverage:z.enum(['complete','partial']),sourceHashes:z.array(digest).max(200),
  headerOperations:z.number().int().min(0).max(10000),cookieOperations:z.number().int().min(0).max(10000),sessionMiddlewareRegistrations:z.number().int().min(0).max(10000)}).strict();
const factSchema = z.object({ value: z.boolean(), source: z.enum(['response', 'browser', 'static', 'functional']),
  coverage: z.enum(['complete', 'partial']), witnessHash: digest }).strict();
export const projectEvidenceSchema = z.object({
  version: z.literal(projectEvidenceVersion), policy: z.enum(['vylnt-project-assessment-v1','vylnt-project-assessment-v2',projectPolicy]),
  runId: z.string().uuid(), scanId:z.string().uuid(), commit: z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/),
  configHash: digest, adapterHash: digest, originalScanHash: digest,
  ownerTag:digest.optional(),
  inspection:projectInspectionSchema.optional(),
  collectionKind:z.enum(['application','mechanism-fixture']).optional(),
  targets: z.array(z.object({ findingId: z.string().min(1).max(8192), category: z.enum(projectRules),
    facts: z.partialRecord(z.enum(projectFactNames), factSchema) }).strict()).max(1500),
}).strict().superRefine((evidence, ctx) => {
  if (new Set(evidence.targets.map(t => t.findingId)).size !== evidence.targets.length) ctx.addIssue({code:'custom',message:'Repeated target'});
  if (new TextEncoder().encode(canonicalJson(evidence)).length > 128 * 1024) ctx.addIssue({code:'custom',message:'Project evidence exceeds 128 KiB'});
  const allowed: Record<string, string[]> = {
    tlsValidated:['browser'], responseChainComplete:['browser'], hstsSyntaxSupported:['response'], hstsPositive:['response'], hstsPreloadConfirmed:['browser'], hstsApplicable:['browser'],
    framePolicyEnforced:['response','browser'], frameAncestorsRestricted:['response','browser'], scriptPolicyEnforced:['response','browser'], scriptSourcesRestricted:['response','browser'], metaPolicyBeforeScripts:['browser'],
  };
  for (const target of evidence.targets) for (const [name, fact] of Object.entries(target.facts)) {
    if (!(allowed[name] ?? ['functional']).includes(fact!.source)) ctx.addIssue({code:'custom',message:'Unsupported fact producer'});
  }
});
export type ProjectEvidence = z.infer<typeof projectEvidenceSchema>;
export type ProjectFact = z.infer<typeof factSchema>;
export const sealedProjectEvidenceSchema = z.object({ version: z.literal('vylnt-project-seal-v1'),
  evidence: projectEvidenceSchema, keyId: digest, signature: z.string().regex(/^[A-Za-z0-9+/]{86}==$/),
}).strict();
export type SealedProjectEvidence = z.infer<typeof sealedProjectEvidenceSchema>;
export interface ProjectPublicKey { keyId: string; spki: string }
/** Pseudonymous report authorization metadata; never a model feature. */
export const projectOwnerTag=(keyId:string,ownerId:string)=>contentHash({version:'vylnt-project-owner-v1',keyId,ownerId});

const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
/** Keys must come from the trusted installation, never the uploaded envelope. */
export async function verifyProjectEvidence(input: unknown, report: Report, keys: readonly ProjectPublicKey[]): Promise<SealedProjectEvidence | undefined> {
  try {
    const sealed = sealedProjectEvidenceSchema.parse(input);
    if (sealed.evidence.scanId !== report.scanId || sealed.evidence.originalScanHash !== await contentHash(report)) return;
    if (sealed.evidence.targets.some(t => !report.findings.some(f => f.id === t.findingId && f.ruleId === t.category))) return;
    const trusted = keys.find(k => k.keyId === sealed.keyId); if (!trusted) return;
    if (await contentHash({ algorithm:'Ed25519', spki:trusted.spki }) !== sealed.keyId) return;
    const key = await crypto.subtle.importKey('spki', decode(trusted.spki), {name:'Ed25519'}, false, ['verify']);
    if (!await crypto.subtle.verify({name:'Ed25519'}, key, decode(sealed.signature), new TextEncoder().encode(canonicalJson(sealed.evidence)))) return;
    return sealed;
  } catch { return; }
}

const requirements: Record<typeof projectRules[number], ProjectFactName[]> = {
  'HDR-001':['tlsValidated','hstsSyntaxSupported','hstsPositive','responseChainComplete','hstsApplicable'],
  'HDR-002':['framePolicyEnforced','frameAncestorsRestricted','embeddingPublicVerified','sensitiveActionVerified'],
  'HDR-003':['scriptPolicyEnforced','scriptSourcesRestricted','cspProbeBlocked','cspProbeAllowed'],
  'CK-001':['cookieAuthDependency','cookiePreferenceVerified'],
  'CK-002':['cookieAuthDependency','cookiePreferenceVerified','cookieJsAccessObserved','cookieJsAccessRequired'],
  'CK-003':['cookieAuthDependency','cookieCrossSiteRequired','csrfChecksPassed','stateChangingRoutesCovered'],
  'NET-001':['resourceTlsUpgradeObserved','resourceHttpTransferObserved','resourceFunctionVerified','requestChainComplete'],
};
export const evidenceFeatureNames4 = [...evidenceFeatureNames3.slice(0,-8), ...projectFactNames.map(n => `project_${n}`), ...evidenceFeatureNames3.slice(-8)];
/** A bound, verified seal is required by the caller before preparing inputs. */
export function prepareProjectContexts(report: Report, evidence: ProjectEvidence) {
  const base = prepareEvidenceContexts3(report), legacy = prepareEvidenceContexts(report);
  return (finding: Finding) => {
    const context = base(finding), target = evidence.targets.find(t => t.findingId === finding.id && t.category === finding.ruleId);
    const facts = target?.facts ?? {};
    const value = (name: ProjectFactName) => facts[name]?.coverage === 'complete' ? Number(facts[name]!.value) : -1;
    // v1 is retained for archived seals. v2 can use executed response-policy
    // protection without inventing public-purpose or sensitivity assertions.
    const frameScope=finding.ruleId==='HDR-002'?framePolicyScope(report.observation.headers?.['content-security-policy'],report.observation.url):undefined;
    const ownAncestorScope=frameScope?.supported&&frameScope.origins.every(origin=>origin===new URL(report.observation.url).origin);
    const observedFramePolicy=evidence.policy!=='vylnt-project-assessment-v1'&&finding.ruleId==='HDR-002'&&ownAncestorScope&&report.observation.cspEvidenceComplete===true
      &&['framePolicyEnforced','frameAncestorsRestricted'].every(n=>facts[n as ProjectFactName]?.source==='browser'&&value(n as ProjectFactName)===1)
      &&facts.framePolicyEnforced!.witnessHash===facts.frameAncestorsRestricted!.witnessHash;
    const required = observedFramePolicy?['framePolicyEnforced','frameAncestorsRestricted'] as ProjectFactName[]:requirements[finding.ruleId as keyof typeof requirements];
    const incomplete = !required || required.some(n => value(n) === -1);
    const contradictory = (value('cookieAuthDependency') === 1 && value('cookiePreferenceVerified') === 1)
      || (value('embeddingPublicVerified') === 1 && value('sensitiveActionVerified') === 1);
    // v3 permits positive authentication evidence despite a partial syntax
    // inventory. This never supports contextual de-emphasis or asserts route completeness.
    const causalAuthentication=evidence.policy===projectPolicy&&['CK-001','CK-002'].includes(finding.ruleId)
      &&facts.cookieAuthDependency?.source==='functional'&&value('cookieAuthDependency')===1
      &&facts.cookiePreferenceVerified?.source==='functional'&&value('cookiePreferenceVerified')===0
      &&facts.cookieAuthDependency.witnessHash===facts.cookiePreferenceVerified.witnessHash
      &&(finding.ruleId==='CK-001'?context.facts.secure===false:context.facts.httpOnly===false&&value('cookieJsAccessRequired')===0);
    const requiresReview = evidence.inspection?.framework !== 'express' || (evidence.inspection.coverage !== 'complete'&&!causalAuthentication) || contextRequiresReview(report, legacy(finding)) || incomplete || contradictory
      || (evidence.policy===projectPolicy&&finding.ruleId==='CK-002'&&value('cookieAuthDependency')===1&&value('cookieJsAccessRequired')===1)
      || (finding.ruleId === 'HDR-001' && (value('tlsValidated') !== 1 || value('hstsSyntaxSupported') !== 1 || value('responseChainComplete') !== 1 || value('hstsApplicable') !== 1))
      || (finding.ruleId === 'CK-003' && value('stateChangingRoutesCovered') !== 1)
      || (finding.ruleId === 'NET-001' && value('requestChainComplete') !== 1);
    const sequence = context.sequence.map((step, index) => [...step.slice(0,-8), ...projectFactNames.map(n => index === context.sequence.length - 1 ? value(n) : -1), ...step.slice(-8)]);
    return {...context, version:projectEvidenceVersion, sequence, variant:canonicalJson(sequence), requiresReview,
      projectFacts: Object.fromEntries(projectFactNames.map(n => [n, value(n) === -1 ? 'unknown' : Boolean(value(n))]))};
  };
}

/** Conservative category safeguards for a future qualified v4 release; not an active classifier. */
export function guardProjectAssessment(context:ReturnType<ReturnType<typeof prepareProjectContexts>>,finding:Finding,proposed:AssessmentState):AssessmentState {
  if(context.requiresReview)return 'needs-review';
  if(proposed!=='contextual')return proposed;
  if(['high','critical'].includes(finding.severity))return 'needs-review';
  const yes=(name:ProjectFactName)=>context.projectFacts[name]===true;
  const no=(name:ProjectFactName)=>context.projectFacts[name]===false;
  let supported=false;
  switch(finding.ruleId){
    case 'HDR-001':supported=yes('hstsPositive')&&yes('tlsValidated')&&yes('hstsApplicable');break;
    case 'HDR-002':supported=(yes('framePolicyEnforced')&&yes('frameAncestorsRestricted'))||(yes('embeddingPublicVerified')&&no('sensitiveActionVerified'));break;
    case 'HDR-003':supported=yes('scriptPolicyEnforced')&&yes('scriptSourcesRestricted')&&yes('cspProbeBlocked')&&yes('cspProbeAllowed')&&(context.facts.cspPresent===true||yes('metaPolicyBeforeScripts'));break;
    case 'CK-001':supported=no('cookieAuthDependency')&&yes('cookiePreferenceVerified');break;
    case 'CK-002':supported=no('cookieAuthDependency')&&yes('cookiePreferenceVerified')&&yes('cookieJsAccessObserved')&&yes('cookieJsAccessRequired');break;
    case 'CK-003':supported=yes('cookieAuthDependency')&&yes('cookieCrossSiteRequired')&&yes('csrfChecksPassed')&&yes('stateChangingRoutesCovered')&&context.facts.secure===true;break;
    case 'NET-001':supported=yes('resourceTlsUpgradeObserved')&&no('resourceHttpTransferObserved')&&yes('resourceFunctionVerified')&&yes('requestChainComplete');break;
  }
  return supported?'contextual':'needs-review';
}

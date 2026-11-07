import { z } from 'zod';
import type { Report, Finding } from './index';
import { canonicalJson, contentHash } from './integrity';
import { prepareEvidenceContexts3, evidenceFeatureNames3 } from './evidence-v3';
import { contextRequiresReview } from './evidence-context';
import { prepareEvidenceContexts } from './evidence-context';
import { duplicateFrameDeny, framePolicyScope, hasBroadFixtureFramePolicy } from './frame-policy-scope';
import type { AssessmentState } from './insight-contracts';

export const projectRules = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001'] as const;
export const projectEvidenceVersion = 'vylnt-evidence-v4' as const;
export const projectPolicy = 'vylnt-project-assessment-v3' as const;
/** Opt-in native framing policy; existing producers and archived v3 decisions stay unchanged. */
export const projectFramePolicy = 'vylnt-project-assessment-v4' as const;
/** Opt-in executed script compatibility scope; no classifier is enabled. */
export const projectScriptPolicy = 'vylnt-project-assessment-v5' as const;
export const projectTransportPolicy = 'vylnt-project-assessment-v6' as const;
export const projectFrameWritePolicy = 'vylnt-project-assessment-v8' as const;
export const projectInlinePolicy = 'vylnt-project-assessment-v7' as const;
/** Native cookie-driven preference scope. Archived v1-v8 policies are unchanged. */
export const projectPreferencePolicy = 'vylnt-project-assessment-v9' as const;
/** Exact named fixture and a same-browser plaintext witness for a missing HSTS header. */
export const projectHstsPlaintextPolicy = 'vylnt-project-assessment-v10' as const;
/** Cookie necessity and native origin protection for the pinned FieldPoint fixture. */
export const projectProtectedCrossSitePolicy = 'vylnt-project-assessment-v11' as const;
export const projectHstsHostPolicy = 'vylnt-project-assessment-v12' as const;
export const projectHstsInvalidPolicy = 'vylnt-project-assessment-v13' as const;
export const projectHstsRetainedPolicy = 'vylnt-project-assessment-v14' as const;
export const projectDuplicateXfoPolicy = 'vylnt-project-assessment-v15' as const;
export const projectBroadFrameWritePolicy = 'vylnt-project-assessment-v16' as const;
export const projectHashedScriptPolicy = 'vylnt-project-assessment-v17' as const;
export const projectEvalScriptPolicy = 'vylnt-project-assessment-v18' as const;
export const invalidFixtureHsts = 'max-age=invalid' as const;
export const permissiveInlineDirective = "script-src 'self' 'unsafe-inline'";
export function hasHashedInlineFallbackPolicy(value:string|undefined){
  return value!==undefined&&/^script-src 'self' 'unsafe-inline'(?: 'sha256-[A-Za-z0-9+/]{43}='){1,4}$/.test(value);
}
export const evalScriptDirective="script-src 'self' 'unsafe-eval'";
export function hasFixtureEvalPolicy(value:string|undefined){
  return value!==undefined&&/^script-src 'self' 'unsafe-eval'(?: 'sha256-[A-Za-z0-9+/]{43}='){0,4}$/.test(value);
}
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
  version: z.literal(projectEvidenceVersion), policy: z.enum(['vylnt-project-assessment-v1','vylnt-project-assessment-v2',projectPolicy,projectFramePolicy,projectScriptPolicy,projectTransportPolicy,projectInlinePolicy,projectFrameWritePolicy,projectPreferencePolicy,projectHstsPlaintextPolicy,projectProtectedCrossSitePolicy,projectHstsHostPolicy,projectHstsInvalidPolicy,projectHstsRetainedPolicy,projectDuplicateXfoPolicy,projectBroadFrameWritePolicy,projectHashedScriptPolicy,projectEvalScriptPolicy]),
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
    if(name==='hstsPositive'&&fact.source==='browser'&&target.category==='HDR-001'&&fact.coverage==='complete'&&
      ((evidence.policy===projectHstsHostPolicy||evidence.policy===projectHstsRetainedPolicy)&&fact.value||evidence.policy===projectHstsInvalidPolicy&&!fact.value))continue;
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
  const protectedPage=evidence.policy===projectProtectedCrossSitePolicy?new URL(report.observation.url):undefined;
  return (finding: Finding) => {
    const context = base(finding), target = evidence.targets.find(t => t.findingId === finding.id && t.category === finding.ruleId);
    const facts = target?.facts ?? {};
    const value = (name: ProjectFactName) => facts[name]?.coverage === 'complete' ? Number(facts[name]!.value) : -1;
    // v1 is retained for archived seals. v2 can use executed response-policy
    // protection without inventing public-purpose or sensitivity assertions.
    const frameScope=finding.ruleId==='HDR-002'?framePolicyScope(report.observation.headers?.['content-security-policy'],report.observation.url):undefined;
    const ownAncestorScope=frameScope?.supported&&frameScope.origins.every(origin=>origin===new URL(report.observation.url).origin);
    const duplicateXfo=evidence.policy===projectDuplicateXfoPolicy&&report.observation.headers?.['x-frame-options']===duplicateFrameDeny&&
      report.observation.headers?.['content-security-policy']===undefined&&/^http:\/\/127\.0\.0\.1:\d+\//.test(report.observation.url);
    const observedFramePolicy=evidence.policy!=='vylnt-project-assessment-v1'&&finding.ruleId==='HDR-002'&&(duplicateXfo||ownAncestorScope&&report.observation.cspEvidenceComplete===true)
      &&['framePolicyEnforced','frameAncestorsRestricted'].every(n=>facts[n as ProjectFactName]?.source==='browser'&&value(n as ProjectFactName)===1)
      &&facts.framePolicyEnforced!.witnessHash===facts.frameAncestorsRestricted!.witnessHash;
    const required = observedFramePolicy?['framePolicyEnforced','frameAncestorsRestricted'] as ProjectFactName[]:requirements[finding.ruleId as keyof typeof requirements];
    const scopedCrossSiteFailure=evidence.policy===projectTransportPolicy&&finding.ruleId==='CK-003'&&Boolean(evidence.inspection?.sourceHashes.length)
      &&context.facts.secure===true&&facts.cookieAuthDependency?.source==='functional'&&value('cookieAuthDependency')===1
      &&facts.csrfChecksPassed?.source==='functional'&&value('csrfChecksPassed')===0;
    const matchingCookies=protectedPage&&finding.ruleId==='CK-003'?report.observation.cookies?.filter(cookie=>cookie.name===finding.evidence.cookieName):undefined;
    const scopedProtectedCrossSite=evidence.policy===projectProtectedCrossSitePolicy&&finding.ruleId==='CK-003'
      &&evidence.commit==='1329edc008f284967517f6fb9af1f622900af7b2'&&Boolean(evidence.inspection?.sourceHashes.length)
      &&protectedPage?.protocol==='http:'&&protectedPage.hostname==='127.0.0.1'&&protectedPage.pathname==='/api/auth/me'
      &&matchingCookies?.length===1&&matchingCookies[0].sameSite==='no_restriction'&&context.facts.secure===true
      &&facts.cookieAuthDependency?.source==='functional'&&value('cookieAuthDependency')===1
      &&(['cookieCrossSiteRequired','csrfChecksPassed','stateChangingRoutesCovered'] as const).every(name=>
        value(name)===1&&facts[name]?.source==='functional'&&facts[name]?.witnessHash===facts.csrfChecksPassed?.witnessHash);
    const incomplete = !scopedCrossSiteFailure&&(!required || required.some(n => value(n) === -1));
    const contradictory = (value('cookieAuthDependency') === 1 && value('cookiePreferenceVerified') === 1)
      || (value('embeddingPublicVerified') === 1 && value('sensitiveActionVerified') === 1);
    // v3 permits positive authentication evidence despite a partial syntax
    // inventory. This never supports contextual de-emphasis or asserts route completeness.
    const executedScriptPolicy=evidence.policy===projectFrameWritePolicy||evidence.policy===projectScriptPolicy||evidence.policy===projectTransportPolicy||evidence.policy===projectInlinePolicy;
    const authenticationPolicy=evidence.policy===projectPolicy||evidence.policy===projectFramePolicy||evidence.policy===projectDuplicateXfoPolicy||executedScriptPolicy;
    const causalAuthentication=authenticationPolicy&&['CK-001','CK-002'].includes(finding.ruleId)
      &&facts.cookieAuthDependency?.source==='functional'&&value('cookieAuthDependency')===1
      &&facts.cookiePreferenceVerified?.source==='functional'&&value('cookiePreferenceVerified')===0
      &&facts.cookieAuthDependency.witnessHash===facts.cookiePreferenceVerified.witnessHash
      &&(finding.ruleId==='CK-001'?context.facts.secure===false:context.facts.httpOnly===false&&value('cookieJsAccessRequired')===0);
    // A same-run, healthy response restricted to its own origin (or no ancestor)
    // can establish framing protection for that response without declaring the
    // rest of the application's route inventory complete. v1-v3 keep their rules.
    const scopedFrameProtection=(duplicateXfo||evidence.policy===projectFramePolicy||executedScriptPolicy)&&observedFramePolicy&&Boolean(evidence.inspection?.sourceHashes.length);
    // This opt-in scope covers one exercised interaction, not all application
    // routes. Missing protection is positive evidence only with working native
    // functionality and executed unapproved script controls. Contextual use
    // additionally requires the same witness to establish early meta protection.
    const scriptWitness=facts.cspProbeAllowed?.witnessHash;
    const functionalScript=finding.ruleId==='HDR-003'&&value('cspProbeAllowed')===1
      &&['cspProbeAllowed','cspProbeBlocked'].every(n=>facts[n as ProjectFactName]?.source==='functional'&&value(n as ProjectFactName)!==-1&&facts[n as ProjectFactName]?.witnessHash===scriptWitness);
    const missingScriptPolicy=value('scriptPolicyEnforced')===0&&value('scriptSourcesRestricted')===0&&value('cspProbeBlocked')===0
      &&!report.observation.headers?.['content-security-policy'];
    const earlyScriptPolicy=['scriptPolicyEnforced','scriptSourcesRestricted','metaPolicyBeforeScripts'].every(n=>
      value(n as ProjectFactName)===1&&facts[n as ProjectFactName]?.source==='browser'&&facts[n as ProjectFactName]?.witnessHash===scriptWitness)&&value('cspProbeBlocked')===1;
    const header=report.observation.headers?.['content-security-policy'];
    const hashedResponse=evidence.policy===projectHashedScriptPolicy&&hasHashedInlineFallbackPolicy(header)&&
      /^http:\/\/127\.0\.0\.1:\d+\//.test(report.observation.url)&&value('metaPolicyBeforeScripts')===-1&&value('cspProbeBlocked')===1&&
      (['scriptPolicyEnforced','scriptSourcesRestricted'] as const).every(name=>
        value(name)===1&&facts[name]?.source==='browser'&&facts[name]?.witnessHash===scriptWitness);
    const evalResponse=evidence.policy===projectEvalScriptPolicy&&hasFixtureEvalPolicy(header)&&
      /^http:\/\/127\.0\.0\.1:\d+\//.test(report.observation.url)&&value('metaPolicyBeforeScripts')===-1&&value('cspProbeBlocked')===1&&
      facts.scriptPolicyEnforced?.source==='response'&&value('scriptPolicyEnforced')===1&&
      facts.scriptSourcesRestricted?.source==='response'&&value('scriptSourcesRestricted')===0;
    const observedPermissiveResponse=header===permissiveInlineDirective&&facts.scriptPolicyEnforced?.source==='response'&&facts.scriptSourcesRestricted?.source==='response';
    const observedPermissiveMeta=header===undefined&&value('metaPolicyBeforeScripts')===1&&
      (['metaPolicyBeforeScripts','scriptPolicyEnforced','scriptSourcesRestricted'] as const).every(n=>facts[n]?.source==='browser'&&facts[n]?.witnessHash===scriptWitness);
    const permissive=evidence.policy===projectInlinePolicy&&value('scriptPolicyEnforced')===1&&value('scriptSourcesRestricted')===0
      &&value('cspProbeBlocked')===0&&(observedPermissiveResponse||observedPermissiveMeta);
    const scopedScriptProtection=functionalScript&&(hashedResponse||evalResponse||executedScriptPolicy&&(missingScriptPolicy||earlyScriptPolicy||permissive))
      &&report.observation.headers!==undefined&&(report.observation.headers['content-security-policy']===undefined||report.observation.cspEvidenceComplete===true)
      &&Boolean(evidence.inspection?.sourceHashes.length);
    const nativeTransport=evidence.policy===projectTransportPolicy&&Boolean(evidence.inspection?.sourceHashes.length)&&new URL(report.observation.url).protocol==='https:';
    // A directive on this actual, TLS-validated response can be assessed even
    // when other routes are uninspected. An absent header stays uncertain.
    const scopedHsts=nativeTransport&&finding.ruleId==='HDR-001'&&/^max-age=\d+$/i.test(report.observation.headers?.['strict-transport-security']??'')
      &&['tlsValidated','hstsApplicable','responseChainComplete'].every(name=>facts[name as ProjectFactName]?.source==='browser'&&value(name as ProjectFactName)===1)
      &&value('hstsSyntaxSupported')===1;
    const scopedMissingHsts=evidence.policy===projectHstsPlaintextPolicy&&finding.ruleId==='HDR-001'&&
      Boolean(evidence.inspection?.sourceHashes.length)&&new URL(report.observation.url).origin.startsWith('https://vylnt-resource.test:')&&
      report.observation.headers!==undefined&&report.observation.headers['strict-transport-security']===undefined&&
      (['tlsValidated','hstsApplicable','responseChainComplete'] as const).every(name=>facts[name]?.source==='browser'&&value(name)===1)&&
      facts.hstsPreloadConfirmed?.source==='browser'&&value('hstsPreloadConfirmed')===0&&
      facts.hstsPositive?.source==='response'&&value('hstsPositive')===0&&value('hstsSyntaxSupported')===1;
    const scopedHostHsts=evidence.policy===projectHstsHostPolicy&&finding.ruleId==='HDR-001'&&
      Boolean(evidence.inspection?.sourceHashes.length)&&new URL(report.observation.url).origin.startsWith('https://vylnt-resource.test:')&&
      report.observation.headers!==undefined&&report.observation.headers['strict-transport-security']===undefined&&
      (['tlsValidated','hstsApplicable','responseChainComplete','hstsPositive'] as const).every(name=>facts[name]?.source==='browser'&&value(name)===1)&&
      facts.hstsSyntaxSupported?.source==='response'&&value('hstsSyntaxSupported')===1;
    const malformedHstsPolicy=evidence.policy===projectHstsInvalidPolicy||evidence.policy===projectHstsRetainedPolicy;
    const scopedMalformedHsts=malformedHstsPolicy&&finding.ruleId==='HDR-001'&&
      Boolean(evidence.inspection?.sourceHashes.length)&&new URL(report.observation.url).origin.startsWith('https://vylnt-resource.test:')&&
      report.observation.headers?.['strict-transport-security']===invalidFixtureHsts&&
      (['tlsValidated','hstsApplicable','responseChainComplete'] as const).every(name=>facts[name]?.source==='browser'&&value(name)===1)&&
      facts.hstsPositive?.source==='browser'&&value('hstsPositive')===Number(evidence.policy===projectHstsRetainedPolicy)&&
      facts.hstsSyntaxSupported?.source==='response'&&value('hstsSyntaxSupported')===0;
    const resourceFacts=requirements['NET-001'];
    const resourceDependency=nativeTransport&&finding.ruleId==='NET-001'&&resourceFacts.every(name=>facts[name]?.source==='functional'&&facts[name]?.witnessHash===facts.resourceFunctionVerified?.witnessHash)
      &&value('resourceFunctionVerified')===1&&value('requestChainComplete')===1;
    const directDependency=resourceDependency&&value('resourceHttpTransferObserved')===1&&value('resourceTlsUpgradeObserved')===0;
    const upgradedDependency=resourceDependency&&value('resourceHttpTransferObserved')===0&&value('resourceTlsUpgradeObserved')===1
      &&new URL(report.observation.url).hostname==='vylnt-resource.test'
      &&report.observation.headers?.['content-security-policy']==='upgrade-insecure-requests'&&report.observation.cspEvidenceComplete===true;
    const broadFrameAction=evidence.policy===projectBroadFrameWritePolicy&&/^http:\/\/127\.0\.0\.1:\d+\//.test(report.observation.url)&&
      hasBroadFixtureFramePolicy(report.observation.headers,report.observation.cspEvidenceComplete);
    const framedAction=(evidence.policy===projectFrameWritePolicy||broadFrameAction)&&finding.ruleId==='HDR-002'&&Boolean(evidence.inspection?.sourceHashes.length)
      &&facts.sensitiveActionVerified?.source==='functional'&&value('sensitiveActionVerified')===1
      &&facts.framePolicyEnforced?.source==='response'&&value('framePolicyEnforced')===Number(broadFrameAction)
      &&facts.frameAncestorsRestricted?.source==='response'&&value('frameAncestorsRestricted')===0;
    const preferenceWitness=facts.cookiePreferenceVerified?.witnessHash;
    const nativePreference=evidence.policy===projectPreferencePolicy&&['CK-001','CK-002'].includes(finding.ruleId)
      &&Boolean(evidence.inspection?.sourceHashes.length)&&value('cookieAuthDependency')===0&&value('cookiePreferenceVerified')===1
      &&value('cookieJsAccessObserved')===1&&value('cookieJsAccessRequired')===1
      &&(['cookieAuthDependency','cookiePreferenceVerified','cookieJsAccessObserved','cookieJsAccessRequired'] as const).every(name=>
        facts[name]?.source==='functional'&&facts[name]?.witnessHash===preferenceWitness);
    const requiresReview = evidence.inspection?.framework !== 'express' || (evidence.inspection.coverage !== 'complete'&&!causalAuthentication&&!scopedFrameProtection&&!scopedScriptProtection&&!scopedHsts&&!scopedMissingHsts&&!scopedHostHsts&&!scopedMalformedHsts&&!directDependency&&!upgradedDependency&&!scopedCrossSiteFailure&&!scopedProtectedCrossSite&&!framedAction&&!nativePreference) || contextRequiresReview(report, legacy(finding)) || (incomplete&&!framedAction) || contradictory
      || (evidence.policy===projectDuplicateXfoPolicy&&finding.ruleId==='HDR-002'&&(!duplicateXfo||!scopedFrameProtection))
      || (evidence.policy===projectBroadFrameWritePolicy&&finding.ruleId==='HDR-002'&&!framedAction)
      || (evidence.policy===projectHashedScriptPolicy&&finding.ruleId==='HDR-003'&&!scopedScriptProtection)
      || (evidence.policy===projectEvalScriptPolicy&&finding.ruleId==='HDR-003'&&!scopedScriptProtection)
      || (evidence.policy===projectHstsPlaintextPolicy&&!scopedMissingHsts)
      || (evidence.policy===projectHstsHostPolicy&&!scopedHostHsts)
      || (malformedHstsPolicy&&!scopedMalformedHsts)
      || (evidence.policy===projectProtectedCrossSitePolicy&&!scopedProtectedCrossSite)
      || (authenticationPolicy&&finding.ruleId==='CK-002'&&value('cookieAuthDependency')===1&&value('cookieJsAccessRequired')===1)
      || (finding.ruleId === 'HDR-001' && (value('tlsValidated') !== 1 || (!scopedMalformedHsts&&value('hstsSyntaxSupported') !== 1) || value('responseChainComplete') !== 1 || value('hstsApplicable') !== 1))
      || (finding.ruleId === 'CK-003' && !scopedCrossSiteFailure && value('stateChangingRoutesCovered') !== 1)
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

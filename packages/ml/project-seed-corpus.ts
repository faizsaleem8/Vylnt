/** Native development observations, not a substitute for a registered corpus. */
import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {canonicalJson,contentHash} from '../core/integrity';
import {parseSubmission} from '../core/validation';
import {projectRules,evidenceFeatureNames4,prepareProjectContexts,verifyProjectEvidence,hasFixtureEvalPolicy,hasHashedInlineFallbackPolicy,projectEvalScriptPolicy,projectHashedScriptPolicy,projectBroadFrameWritePolicy,projectDuplicateXfoPolicy,type ProjectEvidence,type ProjectPublicKey} from '../core/project-evidence';
import type {Report} from '../core';
import {invalidFixtureHsts,projectFramePolicy,projectScriptPolicy,projectTransportPolicy,projectFrameWritePolicy,projectInlinePolicy,projectPreferencePolicy,projectHstsPlaintextPolicy,projectHstsHostPolicy,projectHstsInvalidPolicy,projectHstsRetainedPolicy,projectProtectedCrossSitePolicy,permissiveInlineDirective} from '../core/project-evidence';
import {duplicateFrameDeny,framePolicyScope} from '../core/frame-policy-scope';
import {etherpadPreferenceSource,preferenceControlsSchema,preferenceControlsPass,preferenceSource,type PreferenceControls} from './native-preference-evidence';

const digest=z.string().regex(/^[a-f0-9]{64}$/);
const rowSchema=z.object({family:digest,category:z.enum(projectRules),variant:digest,
  sequence:z.array(z.array(z.union([z.literal(-1),z.literal(0),z.literal(1)]))).min(2).max(74),
  label:z.enum(['change-warranted','contextual','needs-review']),uncertain:z.boolean(),
  reason:z.enum(['native-authentication-without-secure','native-authentication-without-httponly','native-own-origin-framing-enforced','native-duplicate-xfo-deny-enforced','native-authenticated-framed-write','native-editor-missing-script-policy','native-editor-early-script-policy','native-editor-hashed-response-policy','native-string-evaluation-permitted','native-inline-permitted-response','native-inline-permitted-meta','native-response-hsts-disabled','native-response-hsts-positive','native-response-hsts-absent-plaintext','native-response-hsts-invalid-plaintext','native-editor-http-dependency','native-editor-https-upgrade','native-cross-site-authenticated-write','native-protected-cross-site-session','native-cookie-preference','native-preference-javascript-required','independent-context-missing']),
  evidenceRecord:digest}).strict();
const bodySchema=z.object({version:z.enum(['vylnt-native-seed-batch-v1','vylnt-native-seed-batch-v2','vylnt-native-registered-batch-v1']),registrationHash:digest.optional(),schemaVersion:z.literal('vylnt-evidence-v4'),
  assessmentPolicy:z.string().regex(/^vylnt-project-assessment-v(?:[1-9]|1[0-8])$/).optional(),
  featureNames:z.array(z.string()),family:digest,commit:z.string().regex(/^[a-f0-9]{40}$/),adapterHash:digest,configHash:digest,
  scanHash:digest,evidenceHash:digest,oracleHash:digest,
  eligibleForTraining:z.literal(false),qualification:z.literal(false),rows:z.array(rowSchema).max(1500)}).strict();
export const seedBatchSchema=bodySchema.extend({auth:digest}).strict();
export type NativeSeedBatch=z.infer<typeof seedBatchSchema>;
const secretCheck=(secret:string)=>{if(secret.length<32)throw Error('Existing private family key is required');};
const mac=(value:{version:string},secret:string)=>createHmac('sha256',secret).update(value.version+':'+canonicalJson(value)).digest('hex');
function issueBatch(body:z.infer<typeof bodySchema>,secret:string):NativeSeedBatch{
  const registration=process.env.VYLNT_NATIVE_REGISTRATION;
  if(registration)body={...body,version:'vylnt-native-registered-batch-v1',registrationHash:digest.parse(registration)};
  return {...body,auth:mac(body,secret)};
}
export function authenticateNativeBatch(input:unknown,secret:string){
  secretCheck(secret);
  const batch=seedBatchSchema.parse(input),{auth,...body}=batch;
  if(!timingSafeEqual(Buffer.from(auth,'hex'),Buffer.from(mac(body,secret),'hex')))throw Error('Native seed receipt changed or belongs to another installation');
  if((batch.version==='vylnt-native-registered-batch-v1')!==Boolean(batch.registrationHash))throw Error('Unbound native registration');
  return batch;
}

/** The native harness supplies independently executed database and cookie
 * controls. Inference and rule verdicts never supply the oracle label. */
const frameOutcome=z.enum(['embedded','csp-blocked','xfo-blocked','unknown']);
const frameControlsSchema=z.object({version:z.literal('vylnt-frame-policy-v1'),scanHash:digest,checkIdentity:digest,sourceHealthy:z.boolean(),
  mechanism:z.enum(['duplicate-xfo-deny','duplicate-xfo-deny-paired']).optional(),
  controls:z.object({permitted:frameOutcome,forbidden:frameOutcome,repeatedForbidden:frameOutcome,nestedForbidden:frameOutcome,
    foreignWithoutHeader:frameOutcome.optional(),nestedWithoutHeader:frameOutcome.optional()}).strict()}).strict();
async function nativeFrameWitness(report:Report,frame:z.infer<typeof frameControlsSchema>|undefined,policy:ProjectEvidence['policy']){
  if(!frame?.sourceHealthy||frame.controls.permitted!=='embedded')return;
  const csp=report.observation.headers?.['content-security-policy'];
  const xfo=frame.mechanism;
  if(xfo==='duplicate-xfo-deny-paired'&&(frame.controls.foreignWithoutHeader!=='embedded'||frame.controls.nestedWithoutHeader!=='embedded'))return;
  if(xfo){
    if(policy!==projectDuplicateXfoPolicy||csp!==undefined||report.observation.headers?.['x-frame-options']!==duplicateFrameDeny||
      !/^http:\/\/127\.0\.0\.1:\d+\//.test(report.observation.url))return;
  }else{
    const scope=framePolicyScope(csp,report.observation.url);
    if(policy!==projectFramePolicy||!scope.supported||scope.origins.length!==1||scope.origins[0]!==new URL(report.observation.url).origin||
      report.observation.cspEvidenceComplete!==true)return;
  }
  if([frame.controls.forbidden,frame.controls.repeatedForbidden,frame.controls.nestedForbidden].some(value=>value!==(xfo?'xfo-blocked':'csp-blocked')))return;
  return contentHash({version:frame.version,originalScanHash:frame.scanHash,check:frame.checkIdentity,
    policyHash:await contentHash(xfo?duplicateFrameDeny:csp!),controls:frame.controls,
    scope:xfo?`${xfo}/http-loopback-ancestors`:'finite-response-policy/http-loopback-ancestors'});
}
const controlsSchema=z.object({signedSessionMapsToSyntheticUser:z.boolean(),nativeBookmarkRowVerified:z.boolean(),anonymousDeniedWithoutMutation:z.boolean(),
  cookie:z.object({secure:z.boolean(),httpOnly:z.boolean()}).strict(),javaScriptAccessUnnecessary:z.boolean(),framePolicy:frameControlsSchema.optional(),crossSiteWitness:digest.optional(),framedWriteWitness:digest.optional()}).strict();
export type TabinatorSeedControls=z.infer<typeof controlsSchema>;
const multiControlsSchema=controlsSchema.omit({cookie:true,javaScriptAccessUnnecessary:true}).extend({cookies:z.array(z.object({
  name:z.string().min(1).max(128),secure:z.boolean(),httpOnly:z.boolean(),authenticationRequired:z.boolean(),javaScriptAccessUnnecessary:z.boolean()
}).strict()).min(1).max(10)}).strict();
export type NativeSessionControls=TabinatorSeedControls|z.infer<typeof multiControlsSchema>;
export async function createTabinatorSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],controls:TabinatorSeedControls,secret:string){
  return createNativeSessionSeedBatch('tabinator',report,seal,keys,controls,secret);
}

// Explicit, reviewed native adapters only. A caller cannot invent a family or
// attach these developer controls to an arbitrary commit/uploaded report.
export const nativeSessionSources={
  tabinator:{family:'upstream:lennysh/tabinator',commit:'51e7cffa382da3d7c710cbfc0d136868c94eb119'},
  jingo:{family:'upstream:claudioc/jingo',commit:'10079c22d6cb66cfa0e7a91742c631fa0a153bd4'},
  fieldpoint:{family:'upstream:egeyigit/fieldpoint',commit:'1329edc008f284967517f6fb9af1f622900af7b2'},
  'yoyo-collection':{family:'upstream:stammig/yoyo-collection',commit:'94347ba9e181ae5d69eab83554e3c5b0dad3a47b'},
  bookwise:{family:'upstream:joesalaz/bookwise',commit:'547203a025c28d809bc09c8bbd00992b81c032aa'},
  wikiflow:{family:'upstream:aialra-0/wikiflow',commit:'c41f5ba323ff3bd931cc7396f13b801272253b77'},
  homeinventory:{family:'upstream:asdteke/homeinventory',commit:'ffbdb191ac9eeb0d6e19a91db0c9fea4b476e49b'},
  'habit-tracker':{family:'upstream:brixdorf/habit-tracker',commit:'c903c2788f8336bb195e7b2ce490a8b8d97e1a0d'},
} as const;
export const nativeOperationSources={
  portal:{family:'upstream:larsmikki/portal',commit:'90755ce5884e97eb86c8aea33ed3642dce977b11'},
  'personal-knowledge-manager':{family:'upstream:fufu1209/personal-knowledge-manager',commit:'413d308c0b43b2a171dd945a29909a95b47904f0'},
  stockbase:{family:'upstream:joshuaengine7/stockbase',commit:'859234c5928774fceb9dcb4f119df55356475616'},
  '8star-links':{family:'upstream:timom84/8star-links',commit:'b52d350eec54822d9d4039eaa4cbce833c0368dc'},
  'anonymous-notepad':{family:'upstream:ntkhang03/anonymous-notepad',commit:'135e18dde6ac1acae195bb74dfaee49a0fbf33f6'},
} as const;
const operationControlsSchema=z.object({nativeWriteReadback:z.boolean(),sourceHealthy:z.boolean(),
  access:z.enum(['public','header-authentication','document-password']),accessControl:z.enum(['allowed','denied','unknown']),
  framePolicy:frameControlsSchema.optional(),stylesheet:z.object({findingId:z.string().min(1).max(8192),witnessHash:digest}).strict().optional(),
  module:z.object({findingId:z.string().min(1).max(8192),witnessHash:digest}).strict().optional()}).strict();
export type NativeOperationControls=z.infer<typeof operationControlsSchema>;
/** Public/header/document flows do not manufacture cookie authentication facts.
 * Only a healthy, independently persisted operation plus actual ancestor
 * controls may label the one exercised response's framing policy contextual. */
export async function createNativeOperationSeedBatch(source:keyof typeof nativeOperationSources,report:Report,seal:unknown,keys:readonly ProjectPublicKey[],controls:NativeOperationControls,secret:string){
  secretCheck(secret);controls=operationControlsSchema.parse(controls);
  const native=nativeOperationSources[source];if(!native)throw Error('Unsupported native operation source');
  const sanitized=parseSubmission({scanId:report.scanId,observation:report.observation});
  if(canonicalJson(sanitized)!==canonicalJson(report))throw Error('Seed report is not a sanitized consistent scan');
  const verified=await verifyProjectEvidence(seal,report,keys);
  if(!verified||verified.evidence.commit!==native.commit||verified.evidence.collectionKind==='mechanism-fixture')throw Error('Native operation provenance is incompatible');
  const evidence=verified.evidence,scanHash=await contentHash(report),frame=controls.framePolicy;
  if(frame&&(frame.scanHash!==scanHash||frame.checkIdentity!==evidence.adapterHash))throw Error('Native framing oracle binding differs');
  const healthy=controls.nativeWriteReadback&&controls.sourceHealthy&&(controls.access==='public'?controls.accessControl==='allowed':controls.accessControl==='denied');
  const witness=healthy?await nativeFrameWitness(report,frame,evidence.policy):undefined;
  const family=createHmac('sha256',secret).update('family:'+native.family).digest('hex'),oracleHash=await contentHash({version:1,scope:'native-operation-response',controls}),context=prepareProjectContexts(report,evidence);
  const rows=report.findings.filter(f=>projectRules.includes(f.ruleId as typeof projectRules[number])).map(finding=>{
    const facts=evidence.targets.find(t=>t.findingId===finding.id)?.facts;
    const contextual=finding.ruleId==='HDR-002'&&witness&&(['framePolicyEnforced','frameAncestorsRestricted'] as const).every(name=>{
      const fact=facts?.[name];return fact?.value===true&&fact.source==='browser'&&fact.coverage==='complete'&&fact.witnessHash===witness;
    });
    const asset=new URL(finding.url),page=new URL(report.observation.url);
    const proof=finding.evidence.resourceType==='link'&&asset.pathname==='/styles.css'?controls.stylesheet:
      finding.evidence.resourceType==='script'&&asset.pathname==='/app.js'&&report.observation.scripts?.filter(script=>script.url===finding.url).length===1&&
        report.observation.scripts.some(script=>script.url===finding.url&&script.scriptType==='module')?controls.module:undefined;
    const dependency=source==='8star-links'&&healthy&&evidence.policy===projectTransportPolicy&&finding.ruleId==='NET-001'&&
      page.pathname==='/'&&page.hostname==='vylnt-resource.test'&&
      page.protocol==='https:'&&page.port&&proof?.findingId===finding.id&&facts&&
      (['resourceFunctionVerified','resourceHttpTransferObserved','resourceTlsUpgradeObserved','requestChainComplete'] as const).every(name=>
        facts[name]?.source==='functional'&&facts[name]?.coverage==='complete'&&facts[name]?.witnessHash===proof.witnessHash)&&
      facts.resourceFunctionVerified?.value===true&&facts.requestChainComplete?.value===true;
    const direct=dependency&&asset.hostname==='127.0.0.1'&&facts.resourceHttpTransferObserved?.value===true&&facts.resourceTlsUpgradeObserved?.value===false;
    const upgraded=dependency&&asset.host===page.host&&report.observation.cspEvidenceComplete===true&&
      report.observation.headers?.['content-security-policy']==='upgrade-insecure-requests'&&
      facts.resourceHttpTransferObserved?.value===false&&facts.resourceTlsUpgradeObserved?.value===true;
    const input=context(finding);
    const label=direct?'change-warranted':contextual||upgraded?'contextual':'needs-review';
    const reason=direct?'native-editor-http-dependency':upgraded?'native-editor-https-upgrade':contextual?frame?.mechanism?'native-duplicate-xfo-deny-enforced':'native-own-origin-framing-enforced':'independent-context-missing';
    return {finding,input,label,reason};
  });
  const body=bodySchema.parse({version:'vylnt-native-seed-batch-v2',schemaVersion:'vylnt-evidence-v4',assessmentPolicy:evidence.policy,featureNames:[...evidenceFeatureNames4],
    family,commit:evidence.commit,adapterHash:evidence.adapterHash,configHash:evidence.configHash,scanHash,evidenceHash:await contentHash(seal),oracleHash,eligibleForTraining:false,qualification:false,
    rows:await Promise.all(rows.map(async({finding,input,label,reason})=>({family,category:finding.ruleId,variant:await contentHash(input.sequence),sequence:input.sequence,
      label,uncertain:label==='needs-review'||input.requiresReview,reason,
      evidenceRecord:await contentHash({scan:scanHash,evidence:await contentHash(seal),oracleHash,findingId:finding.id})})))});
  return issueBatch(body,secret);
}
export async function createNativeSessionSeedBatch(source: keyof typeof nativeSessionSources,report:Report,seal:unknown,keys:readonly ProjectPublicKey[],controls:NativeSessionControls,secret:string){
  secretCheck(secret);
  const native=nativeSessionSources[source];if(!native)throw Error('Unsupported native seed source');
  controls='cookies' in controls?multiControlsSchema.parse(controls):controlsSchema.parse(controls);
  const sanitized=parseSubmission({scanId:report.scanId,observation:report.observation});
  if(canonicalJson(sanitized)!==canonicalJson(report))throw Error('Seed report is not a sanitized consistent scan');
  const verified=await verifyProjectEvidence(seal,report,keys);
  if(!verified||verified.evidence.commit!==native.commit||verified.evidence.collectionKind==='mechanism-fixture')throw Error('Native seed provenance is incompatible');
  const evidence=verified.evidence,cookies=report.observation.cookies;
  const measured='cookies' in controls?controls.cookies: cookies?.length===1?[{name:cookies[0].name,...controls.cookie,authenticationRequired:true,javaScriptAccessUnnecessary:controls.javaScriptAccessUnnecessary}]:[];
  if(!cookies?.length||measured.length!==cookies.length||new Set(measured.map(c=>c.name)).size!==measured.length||measured.some(c=>{
    const matches=cookies.filter(o=>o.name===c.name);return matches.length!==1||matches[0].secure!==c.secure||matches[0].httpOnly!==c.httpOnly;
  }))throw Error('Independent cookie measurement does not match the scan');
  const family=createHmac('sha256',secret).update('family:'+native.family).digest('hex');
  const context=prepareProjectContexts(report,evidence),oracleHash=await contentHash({version:1,scope:'native-profile-and-bookmark-operation',controls});
  const rows:z.infer<typeof rowSchema>[]=[];
  const authenticated=controls.signedSessionMapsToSyntheticUser&&controls.nativeBookmarkRowVerified&&controls.anonymousDeniedWithoutMutation;
  const frame=controls.framePolicy,scanHash=await contentHash(report);
  if(frame&&(frame.scanHash!==scanHash||frame.checkIdentity!==evidence.adapterHash))throw Error('Native framing oracle binding differs');
  // Class labels come from native health/database checks and observed ancestor
  // outcomes, never from the detector's severity or an ML prediction.
  const frameWitness=authenticated?await nativeFrameWitness(report,frame,evidence.policy):undefined;
  for(const finding of report.findings){
    if(!projectRules.includes(finding.ruleId as typeof projectRules[number]))continue;
    let label:z.infer<typeof rowSchema>['label']='needs-review',reason:z.infer<typeof rowSchema>['reason']='independent-context-missing';
    const cookie=measured.find(c=>c.name===finding.evidence.cookieName);
    if(evidence.policy===projectTransportPolicy&&authenticated&&cookie?.authenticationRequired&&cookie.secure&&finding.ruleId==='CK-003'&&controls.crossSiteWitness){
      const failed=evidence.targets.find(t=>t.findingId===finding.id)?.facts.csrfChecksPassed;
      if(failed?.coverage==='complete'&&failed.source==='functional'&&failed.value===false&&failed.witnessHash===controls.crossSiteWitness){
        label='change-warranted';reason='native-cross-site-authenticated-write';
      }
    }
    if(source==='fieldpoint'&&evidence.policy===projectProtectedCrossSitePolicy&&authenticated&&cookie?.authenticationRequired&&cookie.secure&&finding.ruleId==='CK-003'&&controls.crossSiteWitness){
      const facts=evidence.targets.find(t=>t.findingId===finding.id)?.facts;
      if((['cookieCrossSiteRequired','csrfChecksPassed','stateChangingRoutesCovered'] as const).every(name=>{
        const fact=facts?.[name];
        return fact?.coverage==='complete'&&fact.source==='functional'&&fact.value===true&&fact.witnessHash===controls.crossSiteWitness;
      })){
        label='contextual';reason='native-protected-cross-site-session';
      }
    }
    if(authenticated&&cookie?.authenticationRequired&&finding.ruleId==='CK-001'&&!cookie.secure){label='change-warranted';reason='native-authentication-without-secure';}
    if(authenticated&&cookie?.authenticationRequired&&finding.ruleId==='CK-002'&&!cookie.httpOnly&&cookie.javaScriptAccessUnnecessary){label='change-warranted';reason='native-authentication-without-httponly';}
    if(finding.ruleId==='HDR-002'&&frameWitness){
      const facts=evidence.targets.find(t=>t.findingId===finding.id)?.facts;
      if(['framePolicyEnforced','frameAncestorsRestricted'].every(name=>{
        const fact=facts?.[name as 'framePolicyEnforced'|'frameAncestorsRestricted'];
        return fact?.value===true&&fact.source==='browser'&&fact.coverage==='complete'&&fact.witnessHash===frameWitness;
      })){label='contextual';reason=frame?.mechanism?'native-duplicate-xfo-deny-enforced':'native-own-origin-framing-enforced';}
    }
    if(finding.ruleId==='HDR-002'&&authenticated&&controls.framedWriteWitness&&[projectFrameWritePolicy,projectBroadFrameWritePolicy].some(policy=>evidence.policy===policy)){
      const fact=evidence.targets.find(t=>t.findingId===finding.id)?.facts.sensitiveActionVerified;
      if(fact?.source==='functional'&&fact.coverage==='complete'&&fact.value===true&&fact.witnessHash===controls.framedWriteWitness){
        label='change-warranted';reason='native-authenticated-framed-write';
      }
    }
    const input=context(finding);
    rows.push(rowSchema.parse({family,category:finding.ruleId as typeof projectRules[number],variant:await contentHash(input.sequence),sequence:input.sequence,label,
      uncertain:label==='needs-review'||input.requiresReview,reason,evidenceRecord:await contentHash({scan:await contentHash(report),evidence:await contentHash(seal),oracleHash,findingId:finding.id})}));
  }
  const body=bodySchema.parse({version:'vylnt-native-seed-batch-v2',schemaVersion:'vylnt-evidence-v4',assessmentPolicy:evidence.policy,featureNames:[...evidenceFeatureNames4],
    family,commit:evidence.commit,adapterHash:evidence.adapterHash,configHash:evidence.configHash,scanHash:await contentHash(report),evidenceHash:await contentHash(seal),oracleHash,
    eligibleForTraining:false,qualification:false,rows});
  return issueBatch(body,secret);
}

/** Native preference oracle labels remain distinct from severity/safeguards.
 * A high-severity cookie finding stays visible even if its purpose is contextual. */
export async function createNativePreferenceSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:PreferenceControls,secret:string){
  secretCheck(secret);const controls=preferenceControlsSchema.parse(input),source=preferenceSource(controls);
  if(canonicalJson(parseSubmission({scanId:report.scanId,observation:report.observation}))!==canonicalJson(report))throw Error('Seed report is not sanitized and consistent');
  const verified=await verifyProjectEvidence(seal,report,keys);
  if(!verified||verified.evidence.commit!==source.commit||verified.evidence.collectionKind==='mechanism-fixture')throw Error('Native preference seed provenance differs');
  const evidence=verified.evidence,scanHash=await contentHash(report);
  if(controls.scanHash!==scanHash||controls.adapterHash!==evidence.adapterHash)throw Error('Native preference oracle binding differs');
  const healthy=preferenceControlsPass(controls)&&evidence.policy===projectPreferencePolicy;
  const witnessHash=await contentHash({version:'vylnt-native-preference-measurement-v1',controls,inspectionHash:await contentHash(evidence.inspection??null),commit:evidence.commit});
  const family=createHmac('sha256',secret).update('family:'+source.family).digest('hex');
  const oracleHash=await contentHash(controls),context=prepareProjectContexts(report,evidence),rows:z.infer<typeof rowSchema>[]=[];
  for(const finding of report.findings){
    if(!projectRules.includes(finding.ruleId as typeof projectRules[number]))continue;
    const facts=evidence.targets.find(target=>target.findingId===finding.id)?.facts;
    const target=healthy&&['CK-001','CK-002'].includes(finding.ruleId)&&finding.evidence.cookieName===source.cookieName
      &&(['cookieAuthDependency','cookiePreferenceVerified','cookieJsAccessObserved','cookieJsAccessRequired'] as const).every(name=>{
        const fact=facts?.[name];return fact?.source==='functional'&&fact.coverage==='complete'&&fact.witnessHash===witnessHash&&fact.value===(name!=='cookieAuthDependency');
      });
    const prepared=context(finding);
    rows.push(rowSchema.parse({family,category:finding.ruleId,variant:await contentHash(prepared.sequence),sequence:prepared.sequence,
      label:target?'contextual':'needs-review',uncertain:!target||prepared.requiresReview,
      reason:target?(finding.ruleId==='CK-001'?'native-cookie-preference':'native-preference-javascript-required'):'independent-context-missing',
      evidenceRecord:await contentHash({scan:scanHash,evidence:await contentHash(seal),oracleHash,findingId:finding.id})}));
  }
  return issueBatch(bodySchema.parse({version:'vylnt-native-seed-batch-v2',schemaVersion:'vylnt-evidence-v4',assessmentPolicy:evidence.policy,
    featureNames:[...evidenceFeatureNames4],family,commit:evidence.commit,adapterHash:evidence.adapterHash,configHash:evidence.configHash,
    scanHash,evidenceHash:await contentHash(seal),oracleHash,eligibleForTraining:false,qualification:false,rows}),secret);
}

const metaSchema=z.object({version:z.literal('vylnt-meta-policy-v1'),status:z.enum(['absent','early-supported','needs-review']),
  policyCount:z.number().int().min(0).max(16),identityHash:digest.optional(),beforeScripts:z.boolean().optional(),restricted:z.boolean().optional(),mutated:z.boolean(),nonceContext:z.boolean().optional()}).strict();
const scriptOutcome=z.enum(['blocked','executed','unknown']);
const scriptPhaseSchema=z.object({complete:z.boolean(),functionality:z.enum(['passed','failed','unknown']),inline:scriptOutcome,stringEvaluation:scriptOutcome.optional(),metaPolicy:metaSchema.optional()}).strict();
export const jingoScriptControlsSchema=z.object({version:z.literal('vylnt-native-editor-oracle-v1'),nativeWriteReadback:z.boolean(),
  transport:z.object({leaf:digest,strictBrowserTls:z.literal(true),wireHsts:z.enum(['max-age=0','max-age=086400','absent',invalidFixtureHsts]),
    directDependencyIds:z.array(z.string().min(1).max(256)).max(10),upgradedDependencyIds:z.array(z.string().min(1).max(256)).max(10).optional(),
    plaintextWitness:digest.optional(),hostPolicyWitness:digest.optional()}).strict().optional(),
  scanHash:digest,checkIdentity:digest,sourceScriptsHash:digest.optional(),
  controls:z.object({baseline:scriptPhaseSchema,disabled:scriptPhaseSchema,restored:scriptPhaseSchema,withoutUnsafeEval:scriptPhaseSchema.optional()}).strict()}).strict();
export type JingoScriptSeedControls=z.infer<typeof jingoScriptControlsSchema>;

/** Independent native editor/write and execution controls establish labels.
 * No model output, finding severity, or profile name supplies a class. */
export async function createJingoScriptSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:JingoScriptSeedControls,secret:string){
  return createNativeScriptBatch('jingo',report,seal,keys,input,secret);
}

export async function createBookwiseScriptSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:JingoScriptSeedControls,secret:string){
  const url=new URL(report.observation.url);
  if(url.pathname!=='/categories'||input.transport&&(url.hostname!=='vylnt-resource.test'||url.protocol!=='https:'))throw Error('Unsupported BookWise script scope');
  return createNativeScriptBatch('bookwise',report,seal,keys,input,secret);
}

export async function createYoyoScriptSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:JingoScriptSeedControls,secret:string){
  const url=new URL(report.observation.url);
  if(url.pathname!=='/'||input.transport&&(url.hostname!=='vylnt-resource.test'||url.protocol!=='https:'))throw Error('Unsupported Yoyo script scope');
  return createNativeScriptBatch('yoyo-collection',report,seal,keys,input,secret);
}

export async function createFieldPointResourceSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:JingoScriptSeedControls,secret:string){
  const url=new URL(report.observation.url),transport=input.transport;
  if(url.pathname!=='/'||url.hostname!=='vylnt-resource.test'||url.protocol!=='https:'||!url.port||transport?.wireHsts!=='absent')throw Error('Unsupported FieldPoint resource scope');
  const ids=[...transport.directDependencyIds,...(transport.upgradedDependencyIds??[])];
  if(!ids.length||ids.some(id=>!report.findings.some(finding=>{
    const resource=new URL(finding.url);
    return finding.id===id&&finding.ruleId==='NET-001'&&
      (finding.evidence.resourceType==='script'&&resource.pathname==='/vendor/leaflet/leaflet.js'||
        finding.evidence.resourceType==='link'&&resource.pathname==='/vendor/leaflet/leaflet.css');
  })))throw Error('FieldPoint resource receipt is outside the native map');
  return createNativeScriptBatch('fieldpoint',report,seal,keys,input,secret);
}

export async function createTabinatorScriptSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:JingoScriptSeedControls,secret:string){
  const url=new URL(report.observation.url),transport=input.transport;
  if(url.pathname!=='/')throw Error('Unsupported Tabinator script scope');
  if(transport){
    const ids=[...transport.directDependencyIds,...(transport.upgradedDependencyIds??[])];
    if(url.protocol!=='https:'||url.hostname!=='vylnt-resource.test'||!url.port||transport.wireHsts!=='absent'||ids.length!==1||
      !report.findings.some(finding=>finding.id===ids[0]&&finding.ruleId==='NET-001'&&finding.evidence.resourceType==='script'&&
        new URL(finding.url).pathname==='/vylnt-native-editor.js'))throw Error('Unsupported Tabinator resource scope');
  }
  return createNativeScriptBatch('tabinator',report,seal,keys,input,secret);
}

/** The HSTS API adapters exercise the native operation, independently read
 * back storage and capture the configured directive on the actual TLS response. */
const nativeHstsPaths={
  fieldpoint:'/api/auth/me','habit-tracker':'/api/auth/me',tabinator:'/api/auth/me',wikiflow:'/api/session',
  '8star-links':'/api/nodes',portal:'/api/groups','personal-knowledge-manager':'/api/notes','anonymous-notepad':'/vylnt-document',
  homeinventory:'/api/auth/me',etherpad:'/p/vylnt-disposable',
} as const;
type NativeHstsSource=keyof typeof nativeHstsPaths;

export async function createNativeApiHstsSeedBatch(source:NativeHstsSource,report:Report,seal:unknown,
  keys:readonly ProjectPublicKey[],input:{nativeWriteReadback:boolean;checkIdentity:string;leaf:string;wireHsts:'max-age=0'|'max-age=086400'|'absent'|typeof invalidFixtureHsts;plaintextWitness?:string;hostPolicyWitness?:string},secret:string){
  const url=new URL(report.observation.url);
  const path=nativeHstsPaths[source];
  if(url.protocol!=='https:'||url.hostname!=='vylnt-resource.test'||url.pathname!==path||!url.port||
    !report.observation.headers||report.observation.headers['strict-transport-security']!==(input.wireHsts==='absent'?undefined:input.wireHsts)||
    (input.wireHsts==='absent'||input.wireHsts===invalidFixtureHsts)!==Boolean(input.plaintextWitness||input.hostPolicyWitness)||
    (input.plaintextWitness&&input.hostPolicyWitness))throw Error('Unsupported native HSTS response scope');
  const unknown={complete:false,functionality:'unknown',inline:'unknown'} as const;
  return createNativeScriptBatch(source,report,seal,keys,{version:'vylnt-native-editor-oracle-v1',
    nativeWriteReadback:input.nativeWriteReadback,scanHash:await contentHash(report),checkIdentity:input.checkIdentity,
    controls:{baseline:unknown,disabled:unknown,restored:unknown},
    transport:{leaf:input.leaf,strictBrowserTls:true,wireHsts:input.wireHsts,directDependencyIds:[],
      ...(input.plaintextWitness?{plaintextWitness:input.plaintextWitness}:{}),
      ...(input.hostPolicyWitness?{hostPolicyWitness:input.hostPolicyWitness}:{})}},secret);
}

export async function createNativeWorkspaceScriptSeedBatch(source:'fieldpoint'|'8star-links',report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:JingoScriptSeedControls,secret:string){
  const url=new URL(report.observation.url);
  if(input.transport||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||!url.port)throw Error('Unsupported native workspace script scope');
  return createNativeScriptBatch(source,report,seal,keys,input,secret);
}

async function createNativeScriptBatch(source:NativeHstsSource|'jingo'|'bookwise'|'yoyo-collection',report:Report,seal:unknown,keys:readonly ProjectPublicKey[],input:JingoScriptSeedControls,secret:string){
  secretCheck(secret);const controls=jingoScriptControlsSchema.parse(input);
  if(canonicalJson(parseSubmission({scanId:report.scanId,observation:report.observation}))!==canonicalJson(report))throw Error('Seed report is not a sanitized consistent scan');
  const verified=await verifyProjectEvidence(seal,report,keys);
  const native=source==='etherpad'?etherpadPreferenceSource:source==='8star-links'||source==='portal'||source==='personal-knowledge-manager'||source==='anonymous-notepad'?
    nativeOperationSources[source]:nativeSessionSources[source];
  if(!verified||verified.evidence.commit!==native.commit||verified.evidence.collectionKind==='mechanism-fixture')throw Error('Native script seed provenance is incompatible');
  const evidence=verified.evidence,scanHash=await contentHash(report);
  if(controls.scanHash!==scanHash||controls.checkIdentity!==evidence.adapterHash)throw Error('Native script oracle binding differs');
  const a=controls.controls.baseline,b=controls.controls.restored,d=controls.controls.disabled;
  const meta=a.metaPolicy,repeat=b.metaPolicy;
  const matchingMeta=Boolean(meta&&repeat&&!meta.mutated&&!repeat.mutated&&!meta.nonceContext&&!repeat.nonceContext
    &&meta.identityHash&&meta.identityHash===repeat.identityHash&&meta.status===repeat.status&&meta.restricted===repeat.restricted
    &&meta.beforeScripts===repeat.beforeScripts&&meta.policyCount===repeat.policyCount);
  const healthy=controls.nativeWriteReadback&&Boolean(controls.sourceScriptsHash)&&[a,b,d].every(p=>p.complete)
    &&a.functionality==='passed'&&b.functionality==='passed'&&d.functionality==='failed'&&d.inline==='unknown'
    &&a.inline!=='unknown'&&a.inline===b.inline&&matchingMeta&&report.observation.headers!==undefined
    &&(report.observation.headers['content-security-policy']===undefined||report.observation.cspEvidenceComplete===true);
  const absent=healthy&&meta?.status==='absent'&&meta.policyCount===0&&a.inline==='executed'&&!report.observation.headers?.['content-security-policy'];
  const restrictive=healthy&&meta?.status==='early-supported'&&meta.beforeScripts===true&&meta.restricted===true&&meta.policyCount>0&&a.inline==='blocked';
  const witness=await contentHash({version:'vylnt-script-function-v2',check:evidence.adapterHash,originalScanHash:scanHash,sourceScripts:controls.sourceScriptsHash??null,controls:controls.controls});
  const family=createHmac('sha256',secret).update('family:'+native.family).digest('hex'),context=prepareProjectContexts(report,evidence);
  const oracleHash=await contentHash(controls),rows:z.infer<typeof rowSchema>[]=[];
  for(const finding of report.findings){
    if(!projectRules.includes(finding.ruleId as typeof projectRules[number]))continue;
    let label:z.infer<typeof rowSchema>['label']='needs-review',reason:z.infer<typeof rowSchema>['reason']='independent-context-missing';
    const facts=evidence.targets.find(t=>t.findingId===finding.id)?.facts;
    const transport=controls.transport;
    if(finding.ruleId==='HDR-001'&&evidence.policy===projectHstsPlaintextPolicy&&transport?.wireHsts==='absent'&&controls.nativeWriteReadback&&
      transport.plaintextWitness&&facts?.hstsPreloadConfirmed?.value===false&&facts.hstsPreloadConfirmed.witnessHash===transport.plaintextWitness){
      label='change-warranted';reason='native-response-hsts-absent-plaintext';
    }
    if(finding.ruleId==='HDR-001'&&controls.nativeWriteReadback&&
      (evidence.policy===projectHstsHostPolicy&&transport?.wireHsts==='absent'||evidence.policy===projectHstsRetainedPolicy&&transport?.wireHsts===invalidFixtureHsts)&&
      transport?.hostPolicyWitness&&facts?.hstsPositive?.source==='browser'&&facts.hstsPositive.value===true&&facts.hstsPositive.witnessHash===transport.hostPolicyWitness){
      label='contextual';reason='native-response-hsts-positive';
    }
    if(finding.ruleId==='HDR-001'&&evidence.policy===projectHstsInvalidPolicy&&transport?.wireHsts===invalidFixtureHsts&&controls.nativeWriteReadback&&
      transport.plaintextWitness&&facts?.hstsPositive?.source==='browser'&&facts.hstsPositive.value===false&&facts.hstsPositive.witnessHash===transport.plaintextWitness){
      label='change-warranted';reason='native-response-hsts-invalid-plaintext';
    }
    if(evidence.policy===projectTransportPolicy&&transport&&controls.nativeWriteReadback){
      const hsts=report.observation.headers?.['strict-transport-security'];
      if(finding.ruleId==='HDR-001'&&hsts===transport.wireHsts&&facts?.tlsValidated?.value===true&&facts.hstsApplicable?.value===true&&facts.responseChainComplete?.value===true&&facts.hstsSyntaxSupported?.value===true){
        if(hsts==='max-age=0'&&facts.hstsPositive?.value===false){label='change-warranted';reason='native-response-hsts-disabled';}
        if(hsts==='max-age=086400'&&facts.hstsPositive?.value===true){label='contextual';reason='native-response-hsts-positive';}
      }
      if(finding.ruleId==='NET-001'&&transport.directDependencyIds.includes(finding.id)&&facts?.resourceFunctionVerified?.value===true&&facts.resourceHttpTransferObserved?.value===true&&facts.resourceTlsUpgradeObserved?.value===false&&facts.requestChainComplete?.value===true){
        label='change-warranted';reason='native-editor-http-dependency';
      }
      if(finding.ruleId==='NET-001'&&transport.upgradedDependencyIds?.includes(finding.id)
        &&new URL(report.observation.url).hostname==='vylnt-resource.test'
        &&report.observation.headers?.['content-security-policy']==='upgrade-insecure-requests'&&report.observation.cspEvidenceComplete===true
        &&facts?.resourceFunctionVerified?.value===true&&facts.resourceHttpTransferObserved?.value===false&&facts.resourceTlsUpgradeObserved?.value===true
        &&facts.requestChainComplete?.value===true
        &&(['resourceFunctionVerified','resourceHttpTransferObserved','resourceTlsUpgradeObserved','requestChainComplete'] as const)
          .every(name=>facts[name]?.source==='functional'&&facts[name]?.coverage==='complete'&&facts[name]?.witnessHash===facts.resourceFunctionVerified?.witnessHash)){
        label='contextual';reason='native-editor-https-upgrade';
      }
    }
    const fact=(name:'cspProbeAllowed'|'cspProbeBlocked'|'scriptPolicyEnforced'|'scriptSourcesRestricted'|'metaPolicyBeforeScripts',value:boolean,source:'functional'|'browser')=>{
      const f=facts?.[name];return f?.value===value&&f.coverage==='complete'&&f.source===source&&f.witnessHash===witness;
    };
    if(finding.ruleId==='HDR-003'&&evidence.policy===projectInlinePolicy&&healthy&&a.inline==='executed'
      &&fact('cspProbeAllowed',true,'functional')&&fact('cspProbeBlocked',false,'functional')){
      const header=report.observation.headers?.['content-security-policy'];
      if(meta?.status==='absent'&&meta.policyCount===0&&header===permissiveInlineDirective
        &&facts?.scriptPolicyEnforced?.source==='response'&&facts.scriptPolicyEnforced.value&&facts.scriptSourcesRestricted?.source==='response'&&!facts.scriptSourcesRestricted.value){
        label='change-warranted';reason='native-inline-permitted-response';
      }
      if(header===undefined&&meta?.status==='early-supported'&&meta.policyCount===1&&meta.beforeScripts&&meta.restricted===false
        &&fact('scriptPolicyEnforced',true,'browser')&&fact('metaPolicyBeforeScripts',true,'browser')&&fact('scriptSourcesRestricted',false,'browser')){
        label='change-warranted';reason='native-inline-permitted-meta';
      }
    }
    if(finding.ruleId==='HDR-003'&&(evidence.policy===projectScriptPolicy||evidence.policy===projectTransportPolicy)&&fact('cspProbeAllowed',true,'functional')){
      if(absent&&fact('cspProbeBlocked',false,'functional')){label='change-warranted';reason='native-editor-missing-script-policy';}
      if(restrictive&&fact('cspProbeBlocked',true,'functional')&&fact('scriptPolicyEnforced',true,'browser')&&fact('scriptSourcesRestricted',true,'browser')&&fact('metaPolicyBeforeScripts',true,'browser')){
        label='contextual';reason='native-editor-early-script-policy';
      }
    }
    if(finding.ruleId==='HDR-003'&&evidence.policy===projectHashedScriptPolicy&&healthy&&meta?.status==='absent'&&meta.policyCount===0&&a.inline==='blocked'&&
      hasHashedInlineFallbackPolicy(report.observation.headers?.['content-security-policy'])&&fact('cspProbeAllowed',true,'functional')&&fact('cspProbeBlocked',true,'functional')&&
      fact('scriptPolicyEnforced',true,'browser')&&fact('scriptSourcesRestricted',true,'browser')){
      label='contextual';reason='native-editor-hashed-response-policy';
    }
    const noEval=controls.controls.withoutUnsafeEval;
    if(finding.ruleId==='HDR-003'&&evidence.policy===projectEvalScriptPolicy&&healthy&&meta?.status==='absent'&&meta.policyCount===0&&a.inline==='blocked'&&
      a.stringEvaluation==='executed'&&b.stringEvaluation==='executed'&&noEval?.complete&&noEval.functionality==='passed'&&noEval.inline==='blocked'&&
      noEval.stringEvaluation==='blocked'&&noEval.metaPolicy?.status==='absent'&&noEval.metaPolicy.identityHash===meta.identityHash&&
      hasFixtureEvalPolicy(report.observation.headers?.['content-security-policy'])&&fact('cspProbeAllowed',true,'functional')&&fact('cspProbeBlocked',true,'functional')){
      label='change-warranted';reason='native-string-evaluation-permitted';
    }
    const prepared=context(finding);
    rows.push(rowSchema.parse({family,category:finding.ruleId,variant:await contentHash(prepared.sequence),sequence:prepared.sequence,label,
      uncertain:label==='needs-review'||prepared.requiresReview,reason,evidenceRecord:await contentHash({scan:scanHash,evidence:await contentHash(seal),oracleHash,findingId:finding.id})}));
  }
  const body=bodySchema.parse({version:'vylnt-native-seed-batch-v2',schemaVersion:'vylnt-evidence-v4',assessmentPolicy:evidence.policy,featureNames:[...evidenceFeatureNames4],
    family,commit:evidence.commit,adapterHash:evidence.adapterHash,configHash:evidence.configHash,scanHash,evidenceHash:await contentHash(seal),oracleHash,
    eligibleForTraining:false,qualification:false,rows});
  return issueBatch(body,secret);
}

export async function assembleNativeSeedCorpus(inputs:unknown[],secret:string){
  secretCheck(secret);if(!inputs.length||inputs.length>200)throw Error('Expected 1..200 native seed batches');
  const rows:z.infer<typeof rowSchema>[]=[],seen=new Map<string,z.infer<typeof rowSchema>>(),proofs:Omit<NativeSeedBatch,'rows'|'featureNames'>[]=[];
  let repeatedContexts=0;
  for(const input of inputs){
    const batch=authenticateNativeBatch(input,secret);
    if(batch.version==='vylnt-native-seed-batch-v1'&&(batch.assessmentPolicy!==undefined||batch.rows.some(row=>row.label==='contextual'||!['native-authentication-without-secure','native-authentication-without-httponly','independent-context-missing'].includes(row.reason)))
      ||batch.version==='vylnt-native-seed-batch-v2'&&!batch.assessmentPolicy)throw Error('Native seed version/policy is incompatible');
    if(canonicalJson(batch.featureNames)!==canonicalJson(evidenceFeatureNames4))throw Error('Native seed feature contract changed');
    for(const row of batch.rows){
      if(row.family!==batch.family||row.sequence.some(step=>step.length!==evidenceFeatureNames4.length)||row.variant!==await contentHash(row.sequence))throw Error('Native seed input binding changed');
      const key=canonicalJson([row.family,row.category,row.variant,row.label]);
      const previous=seen.get(key);
      if(previous){previous.uncertain ||= row.uncertain;repeatedContexts++;continue;}
      const copy={...row};seen.set(key,copy);rows.push(copy);
    }
    const {rows:_,featureNames:__,...proof}=batch;proofs.push(proof);
  }
  const groups=new Map<string,typeof rows>();for(const row of rows){const members=groups.get(row.variant)??[];members.push(row);groups.set(row.variant,members);}
  for(const members of groups.values())if(new Set(members.map(row=>row.label)).size>1||members.some(row=>row.uncertain))for(const row of members)row.uncertain=true;
  const categories=Object.fromEntries(projectRules.map(category=>{
    const examples=rows.filter(row=>row.category===category);
    return[category,{version:'vylnt-project-seed-dataset-v1',category,schemaVersion:'vylnt-evidence-v4',featureNames:[...evidenceFeatureNames4],eligibleForTraining:false,examples}];
  }));
  const counts=Object.fromEntries(projectRules.map(category=>{
    const examples=rows.filter(row=>row.category===category),usable=examples.filter(row=>!row.uncertain&&row.label==='change-warranted'),contextual=examples.filter(row=>!row.uncertain&&row.label==='contextual');
    // The seed protocol has one independently checked native operation. The
    // readable response changes CK-001's full tensor, but not its Secure cause.
    // Retain both inputs without advertising nuisance variation as new cases.
    return[category,{observations:examples.length,completeChangeContexts:new Set(usable.map(row=>canonicalJson([row.family,row.reason]))).size,
      numericChangeVariants:new Set(usable.map(row=>row.variant)).size,contextualContexts:new Set(contextual.map(row=>canonicalJson([row.family,row.reason]))).size,
      numericContextualVariants:new Set(contextual.map(row=>row.variant)).size,
      needsReview:examples.filter(row=>row.uncertain).length,families:new Set(examples.map(row=>row.family)).size,
      trainingReady:false,deficits:['No eligible registered 8-training/4-validation family cohort.',...(!contextual.length?['No independently established contextual examples.']:[]),'Need 30 distinct examples/class in training and 15/class in validation, each across at least 3 families.']}];
  }));
  return {categories,proofs,audit:{version:'vylnt-native-seed-audit-v2',batches:inputs.length,families:new Set(rows.map(row=>row.family)).size,repeatedContexts,
    categories:counts,trainingReady:false,qualification:false,modelFitted:false,testPredictions:0,
    limitations:['These are native seed observations, not a registered or eligible development corpus.','Unknown cases are never contextual labels.','Historical exposure and split checks remain required during registered preparation.']}};
}

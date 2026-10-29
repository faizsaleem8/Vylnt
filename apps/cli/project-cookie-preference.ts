import { createHash } from 'node:crypto';
import { readFile,realpath,lstat } from 'node:fs/promises';
import { resolve,sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { BrowserContext } from 'playwright';
import type { Report } from '../../packages/core';
import { canonicalJson,contentHash } from '../../packages/core/integrity';
import { projectEvidenceSchema,type ProjectEvidence,type ProjectFact } from '../../packages/core/project-evidence';
import { runCookieFlow,type CookieAccessPhase,type NativeCookieAccessCheck } from './project-cookie-access';
import { measureAuthenticationCookies,type CookieDependencyMeasurement } from './project-functional';

export const preferencePurposeVersion='vylnt-cookie-preference-v1';
const digest=(input:unknown)=>createHash('sha256').update(canonicalJson(input)).digest('hex');
const canonicalSource=(input:string)=>input.replace(/\r\n/g,'\n');
// Reviewed closed application graph. This controlled reference is never an
// independent corpus family. Arbitrary application declarations are not proofs.
const reference={id:'vylnt-reference-layout-v1',cookieName:'session_visual_mode',authenticationCookieName:'account_sid',
  choices:['comfortable','compact'] as const,defaultPreference:'first' as const,
  effect:'presentation-layout-density-only',role:'mechanism-reference-only',
  files:[
    {path:'labs/ml-cookie-purpose/server.mjs',hash:'9f6d83e12b6914a8b3337d4c253891e6f5f4178a6a16dfddbe79acb40e1b34d6'},
    {path:'labs/ml-cookie-purpose/client.js',hash:'44e4f186e934320c9bf9ea6b0819c8a7451f875adbad2b102a1ffaa592fabfdc'},
    {path:'package-lock.json',hash:'1f44de0d5cf59f487f694f17db39e0f7e75297ca225cb2ede446fff08c258efb'},
  ],
};
export interface VerifiedPreferenceProfile {
  readonly id:string;readonly commit:string;readonly proofHash:string;readonly sourceHashes:readonly string[];
  readonly cookieName:string;readonly choices:readonly [string,string];readonly defaultPreference:'first'|'second';
  readonly authenticationCookieName:string;
}
const verified=new WeakMap<VerifiedPreferenceProfile,string>();
const issued=new WeakMap<PreferenceMeasurement,string>();
async function checkedSource(root:string,signal?:AbortSignal){
  signal?.throwIfAborted();
  const actualRoot=await realpath(root),env={...process.env};for(const key of Object.keys(env))if(key.startsWith('GIT_'))delete env[key];
  const git=async(args:string[])=>(await promisify(execFile)('git',args,{cwd:actualRoot,env,windowsHide:true,timeout:10000,maxBuffer:1024*1024,signal})).stdout.trim();
  const commit=await git(['rev-parse','HEAD']);if(!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(commit))throw Error('Invalid source revision');
  await git(['ls-files','--error-unmatch','--',...reference.files.map(f=>f.path)]);
  await git(['diff','--quiet','--no-ext-diff','HEAD','--',...reference.files.map(f=>f.path)]);
  const sourceHashes:string[]=[];
  for(const entry of reference.files){
    const path=resolve(actualRoot,entry.path),actual=await realpath(path),info=await lstat(path);
    if(!actual.startsWith(actualRoot+sep)||info.isSymbolicLink()||!info.isFile()||info.size>512*1024)throw Error('Unsupported preference source graph');
    const raw=await readFile(actual,{encoding:'utf8',signal}),bytes=canonicalSource(raw);
    if(createHash('sha256').update(bytes).digest('hex')!==entry.hash)throw Error('Preference source graph changed or is not reviewed');
    if(/\.[cm]?js$/.test(entry.path))sourceHashes.push(createHash('sha256').update(raw).digest('hex'));
  }
  return {root:actualRoot,commit,sourceHashes:sourceHashes.sort()};
}
/** Internal to a developer-owned run. No ordinary scan endpoint accepts a path,
 * profile or a client claim of verified cookie purpose. */
export async function verifyPreferenceSource(root:string,profileId:string,signal?:AbortSignal):Promise<VerifiedPreferenceProfile>{
  if(profileId!==reference.id)throw Error('Unsupported preference profile');
  const checked=await checkedSource(root,signal);
  const profile=Object.freeze({id:reference.id,commit:checked.commit,proofHash:digest({version:preferencePurposeVersion,reference,commit:checked.commit,sourceHashes:checked.sourceHashes}),
    sourceHashes:Object.freeze(checked.sourceHashes),
    cookieName:reference.cookieName,authenticationCookieName:reference.authenticationCookieName,choices:Object.freeze([...reference.choices]) as readonly [string,string],defaultPreference:reference.defaultPreference});
  verified.set(profile,checked.root);return profile;
}
async function currentSource(profile:VerifiedPreferenceProfile,signal?:AbortSignal){
  const root=verified.get(profile);if(!root)return false;
  const checked=await checkedSource(root,signal);if(checked.commit!==profile.commit||canonicalJson(checked.sourceHashes)!==canonicalJson(profile.sourceHashes))throw Error('Preference source revision is stale');return true;
}
export interface PreferenceControls {first:CookieAccessPhase;second:CookieAccessPhase;without:CookieAccessPhase;preferenceOnly:CookieAccessPhase;restored:CookieAccessPhase}
export function preferenceControlsPass(input:PreferenceControls,defaultPreference:'first'|'second'){
  const allowed=(phase:CookieAccessPhase,pref:'first'|'second')=>phase.complete&&phase.authentication==='authenticated'&&phase.protectedStatus===200&&phase.functionality==='passed'&&phase.preference===pref;
  const denied=input.preferenceOnly;
  return allowed(input.first,'first')&&allowed(input.second,'second')&&allowed(input.without,defaultPreference)&&allowed(input.restored,'first')
    &&denied.complete&&denied.authentication==='anonymous'&&(denied.protectedStatus===401||denied.protectedStatus===403)&&denied.functionality==='passed'&&denied.preference==='first';
}
export interface PreferenceMeasurement {
  version:typeof preferencePurposeVersion;scanId:string;originalScanHash:string;
  source?:{commit:string;proofHash:string;sourceHashes:string[]};status:'verified'|'needs-review';
  targets:{findingId:string;facts:{cookieAuthDependency:ProjectFact;cookiePreferenceVerified:ProjectFact}}[];
  controls?:PreferenceControls;
  authentication?:CookieDependencyMeasurement;
}
export async function measureCookiePreference(context:BrowserContext,report:Report,check:NativeCookieAccessCheck,profile?:VerifiedPreferenceProfile,signal?:AbortSignal):Promise<PreferenceMeasurement>{
  signal?.throwIfAborted();
  const result:PreferenceMeasurement={version:preferencePurposeVersion,scanId:report.scanId,originalScanHash:await contentHash(report),status:'needs-review',targets:[]};
  // A cloned/uploaded declaration cannot acquire this process-local capability.
  if(!profile||!verified.has(profile))return result;
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(90000)]);combined.throwIfAborted();
  await currentSource(profile,combined);
  const url=new URL(report.observation.url);
  if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Preference checks require a plain loopback origin');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Preference check identity is required');
  const findings=report.findings.filter(f=>['CK-001','CK-002','CK-003'].includes(f.ruleId)&&f.evidence.cookieName===profile.cookieName);
  if(!findings.length)return result;
  const cookies=(await context.cookies()).filter(c=>c.domain.replace(/^\./,'')===url.hostname);
  if(cookies.length>100)throw Error('Preference cookie state budget exceeded');
  const matches=cookies.filter(c=>c.name===profile.cookieName),metadata=report.observation.cookies?.filter(c=>c.name===profile.cookieName);
  if(matches.length!==1||metadata?.length!==1||matches[0].partitionKey)return result;
  const original=matches[0],observed=metadata[0],sameSite=original.sameSite==='None'?'no_restriction':original.sameSite==='Strict'?'strict':'lax';
  if(observed.secure!==original.secure||observed.httpOnly!==original.httpOnly||observed.sameSite!==sameSite||observed.session!==(original.expires===-1))return result;
  const first={...original,value:profile.choices[0]},second={...original,value:profile.choices[1]};
  const values=(cookie:typeof original)=>cookies.map(c=>c===original?cookie:c);
  const run=(state:typeof cookies,target:typeof original,absent=false)=>runCookieFlow(context,state,target,url.origin,false,check,combined,{targetState:absent?'absent':'present',preserveValue:true});
  const controls:PreferenceControls={first:await run(values(first),first),second:await run(values(second),second),
    without:await run(cookies.filter(c=>c!==original),original,true),preferenceOnly:await run([first],first),restored:await run(values(first),first)};
  await currentSource(profile,combined); // No facts survive an observed source change.
  result.controls=controls;
  if(!preferenceControlsPass(controls,profile.defaultPreference))return result;
  const authentication=await measureAuthenticationCookies(context,report,{identityHash:check.identityHash,check:async page=>{
    const outcome=await check.check(page);
    if(outcome.authentication==='authenticated'&&outcome.protectedStatus===200)return 'authenticated';
    if(outcome.authentication==='anonymous'&&(outcome.protectedStatus===401||outcome.protectedStatus===403))return 'anonymous';
    return 'unknown';
  }},combined);
  const authenticationIds=new Set(report.findings.filter(f=>f.evidence.cookieName===profile.authenticationCookieName).map(f=>f.id));
  const authenticatedTargets=authentication.targets.filter(t=>authenticationIds.has(t.findingId));
  if(!authenticatedTargets.length)return result;
  await currentSource(profile,combined);result.authentication=authentication;
  result.source={commit:profile.commit,proofHash:profile.proofHash,sourceHashes:[...profile.sourceHashes]};result.status='verified';
  const witnessHash=await contentHash({version:preferencePurposeVersion,source:result.source,check:check.identityHash,controls,authentication});
  const fact=(value:boolean):ProjectFact=>({value,source:'functional',coverage:'complete',witnessHash});
  for(const finding of findings)result.targets.push({findingId:finding.id,facts:{cookieAuthDependency:fact(false),cookiePreferenceVerified:fact(true)}});
  for(const target of authenticatedTargets)result.targets.push({findingId:target.findingId,facts:{cookieAuthDependency:fact(true),cookiePreferenceVerified:fact(false)}});
  issued.set(result,digest(result));
  return result;
}
export function mergeCookiePreference(evidence:ProjectEvidence,measurement:PreferenceMeasurement):ProjectEvidence{
  if(measurement.version!==preferencePurposeVersion||measurement.scanId!==evidence.scanId||measurement.originalScanHash!==evidence.originalScanHash)throw Error('Preference measurement does not match the scan');
  if(measurement.status!=='verified'){if(measurement.targets.length)throw Error('Unverified preference facts');return projectEvidenceSchema.parse(structuredClone(evidence));}
  if(issued.get(measurement)!==digest(measurement))throw Error('Preference producer receipt is missing or changed');
  const source=measurement.source;
  if(!source||source.commit!==evidence.commit||!/^[a-f0-9]{64}$/.test(source.proofHash)||!evidence.inspection||canonicalJson([...evidence.inspection.sourceHashes].sort())!==canonicalJson([...source.sourceHashes].sort()))throw Error('Preference source binding differs');
  if(!measurement.controls||!preferenceControlsPass(measurement.controls,reference.defaultPreference))throw Error('Invalid preference controls');
  const merged=structuredClone(evidence),seen=new Set<string>();merged.collectionKind='mechanism-fixture';
  for(const entry of measurement.targets){
    if(seen.has(entry.findingId))throw Error('Repeated preference target');seen.add(entry.findingId);
    const target=merged.targets.find(t=>t.findingId===entry.findingId&&['CK-001','CK-002','CK-003'].includes(t.category));
    const auth=entry.facts.cookieAuthDependency,pref=entry.facts.cookiePreferenceVerified;
    if(!target||Object.keys(entry.facts).sort().join(',')!=='cookieAuthDependency,cookiePreferenceVerified'||typeof auth.value!=='boolean'||typeof pref.value!=='boolean'||auth.value===pref.value||auth.witnessHash!==pref.witnessHash)throw Error('Invalid cookie purpose facts');
    if(auth.value&&!measurement.authentication?.targets.some(t=>t.findingId===entry.findingId&&t.facts.cookieAuthDependency.value))throw Error('Authentication dependency is missing');
    for(const name of ['cookieAuthDependency','cookiePreferenceVerified'] as const){
      const fact=entry.facts[name];if(fact.source!=='functional'||fact.coverage!=='complete')throw Error('Invalid preference producer');
      if(target.facts[name]&&canonicalJson(target.facts[name])!==canonicalJson(fact))throw Error('Conflicting cookie purpose');target.facts[name]=fact;
    }
  }
  return projectEvidenceSchema.parse(merged);
}

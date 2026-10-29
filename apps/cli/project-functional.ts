import type { BrowserContext, Page } from 'playwright';
import type { Report } from '../../packages/core';
import { contentHash,canonicalJson } from '../../packages/core/integrity';
import { projectEvidenceSchema, type ProjectEvidence, type ProjectFact } from '../../packages/core/project-evidence';
import {guardProjectRedirects} from './project-redirect-guard';

export const functionalProbeVersion='vylnt-project-functional-v2';
const issued=new WeakMap<CookieDependencyMeasurement,string>();
export type AuthenticationState='authenticated'|'anonymous'|'unknown';
export interface NativeAuthenticationCheck {
  /** Optional reviewed offline fallback, included in the adapter identity. */
  prepare?(page:Page):Promise<void>;
  /** Developer-maintained native flow. Inspect only a disposable synthetic account. */
  check(page:Page):Promise<AuthenticationState>;
  identityHash:string;
}
export interface CookieDependencyMeasurement {
  version:typeof functionalProbeVersion;scanId:string;originalScanHash:string;checkIdentity:string;
  targets:{findingId:string;facts:{cookieAuthDependency:ProjectFact}}[];
}

async function isolatedState(source:BrowserContext,cookies:Awaited<ReturnType<BrowserContext['cookies']>>,origins:ReadonlySet<string>,check:NativeAuthenticationCheck,signal?:AbortSignal):Promise<AuthenticationState>{
  const browser=source.browser();if(!browser)return 'unknown';
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
  let closing:Promise<void>|undefined;const close=()=>closing??=context.close().catch(()=>{});
  let rejectBound:(error:Error)=>void=()=>{};
  const bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
  const stop=(message:string)=>{rejectBound(Error(message));void close();};
  const abort=()=>stop('Native check cancelled');signal?.addEventListener('abort',abort);
  const timer=setTimeout(()=>stop('Native check timed out'),10000);
  let guard:Awaited<ReturnType<typeof guardProjectRedirects>>|undefined,incomplete=false,requests=0;
  try{
    return await Promise.race([bound,(async()=>{
      signal?.throwIfAborted();
      await context.routeWebSocket('**/*',socket=>{incomplete=true;socket.close();});
      await context.route('**/*',route=>{
        try{const request=route.request(),url=new URL(request.url());if(origins.has(url.origin)&&!url.username&&!url.password&&request.method()==='GET'&&++requests<=80)return route.continue();}catch{/* Unsupported request. */}
        incomplete=true;return route.abort();
      });
      await context.addCookies(cookies);
      const page=await context.newPage();page.setDefaultTimeout(3000);page.setDefaultNavigationTimeout(5000);
      guard=await guardProjectRedirects(page,origins,{rejected:()=>{incomplete=true;}});
      context.on('page',other=>{if(other!==page)incomplete=true;});page.on('worker',()=>{incomplete=true;});
      if(check.prepare)await check.prepare(page);
      const state=await check.check(page);
      return incomplete||context.pages().length!==1||page.frames().length!==1?'unknown':state;
    })()]);
  }catch(error){if(signal?.aborted)throw error;return 'unknown';}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);await guard?.close();await close();}
}

/** Positive causal dependency only. Passing without a cookie does not prove that
 * it is a preference, unnecessary for other routes, or harmless. Cookie values
 * stay in transient browser state and never enter the result or witness hash. */
export async function measureAuthenticationCookies(context:BrowserContext,report:Report,check:NativeAuthenticationCheck,signal?:AbortSignal):Promise<CookieDependencyMeasurement>{
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(120000)]);combined.throwIfAborted();
  const url=new URL(report.observation.url),origins=new Set([url.origin]);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Native probes require a plain loopback origin');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Native check identity is required');
  const measurement:CookieDependencyMeasurement={version:functionalProbeVersion,scanId:report.scanId,originalScanHash:await contentHash(report),checkIdentity:check.identityHash,targets:[]};
  const selected=report.findings.filter(f=>['CK-001','CK-002','CK-003'].includes(f.ruleId));
  const names=[...new Set(selected.map(f=>f.evidence.cookieName).filter((n):n is string=>typeof n==='string'))];
  if(!names.length)return measurement;
  if(names.length>10)throw Error('Native cookie probe budget exceeded');
  const cookies=(await context.cookies()).filter(c=>c.domain.replace(/^\./,'')===url.hostname);
  if(cookies.length>100)throw Error('Native cookie state budget exceeded');
  const baseline=await isolatedState(context,cookies,origins,check,combined);
  if(baseline!=='authenticated')return measurement;
  const anonymous=await isolatedState(context,[],origins,check,combined);
  if(anonymous!=='anonymous')return measurement;
  for(const name of names){
    combined.throwIfAborted();
    const matching=cookies.filter(c=>c.name===name);
    if(matching.length!==1)continue; // Name-only findings cannot distinguish path/domain collisions.
    const cookie=matching[0],observed=report.observation.cookies?.filter(c=>c.name===name);
    if(cookie.partitionKey)continue;
    const sameSite=cookie.sameSite==='None'?'no_restriction':cookie.sameSite==='Strict'?'strict':'lax';
    if(observed?.length!==1||observed[0].secure!==cookie.secure||observed[0].httpOnly!==cookie.httpOnly||observed[0].sameSite!==sameSite||observed[0].session!==(cookie.expires===-1))continue;
    const without=await isolatedState(context,cookies.filter(c=>c!==cookie),origins,check,combined);
    const restored=await isolatedState(context,cookies,origins,check,combined);
    if(without!=='anonymous'||restored!=='authenticated')continue;
    const fact:ProjectFact={value:true,source:'functional',coverage:'complete',witnessHash:await contentHash({version:functionalProbeVersion,check:measurement.checkIdentity,baseline,anonymous,without,restored})};
    for(const finding of selected.filter(f=>f.evidence.cookieName===name))measurement.targets.push({findingId:finding.id,facts:{cookieAuthDependency:fact}});
  }
  issued.set(measurement,canonicalJson(measurement));return measurement;
}

export function mergeCookieDependency(evidence:ProjectEvidence,measurement:CookieDependencyMeasurement):ProjectEvidence{
  if(measurement.version!==functionalProbeVersion||measurement.scanId!==evidence.scanId||measurement.originalScanHash!==evidence.originalScanHash||measurement.checkIdentity!==evidence.adapterHash)throw Error('Native measurement does not match the scan or adapter');
  const merged=structuredClone(evidence);
  const seen=new Set<string>();
  for(const measured of measurement.targets){
    if(seen.has(measured.findingId))throw Error('Duplicate native measurement');seen.add(measured.findingId);
    const target=merged.targets.find(t=>t.findingId===measured.findingId&&['CK-001','CK-002','CK-003'].includes(t.category));
    if(!target)throw Error('Native cookie measurement has no matching finding');
    const fact=measured.facts.cookieAuthDependency;
    if(Object.keys(measured.facts).length!==1||fact.value!==true||fact.source!=='functional'||fact.coverage!=='complete')throw Error('Invalid native dependency fact');
    if(target.facts.cookieAuthDependency&&JSON.stringify(target.facts.cookieAuthDependency)!==JSON.stringify(fact))throw Error('Conflicting native dependency fact');
    target.facts.cookieAuthDependency=fact;
  }
  if(measurement.targets.length&&issued.get(measurement)!==canonicalJson(measurement))throw Error('Native producer receipt missing or changed');
  return projectEvidenceSchema.parse(merged);
}

/** Positive authentication dependency rules out a solely non-sensitive
 * preference role. It does not claim that the cookie has no secondary uses. */
export function mergeAuthenticationRole(evidence:ProjectEvidence,measurement:CookieDependencyMeasurement):ProjectEvidence{
  const merged=mergeCookieDependency(evidence,measurement);
  for(const measured of measurement.targets){
    const target=merged.targets.find(t=>t.findingId===measured.findingId)!;
    if(!['CK-001','CK-002'].includes(target.category))continue;
    const previous=target.facts.cookiePreferenceVerified;
    if(previous&&(previous.value||previous.coverage!=='complete'||previous.source!=='functional'))throw Error('Conflicting authentication/preference role');
    target.facts.cookiePreferenceVerified=previous??{...measured.facts.cookieAuthDependency,value:false};
  }
  return projectEvidenceSchema.parse(merged);
}

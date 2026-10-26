import type { BrowserContext, Page } from 'playwright';
import type { Report } from '../../packages/core';
import { contentHash } from '../../packages/core/integrity';
import { projectEvidenceSchema, type ProjectEvidence, type ProjectFact } from '../../packages/core/project-evidence';

export const functionalProbeVersion='vylnt-project-functional-v1';
export type AuthenticationState='authenticated'|'anonymous'|'unknown';
export interface NativeAuthenticationCheck {
  /** Developer-maintained native flow. Inspect only a disposable synthetic account. */
  check(page:Page):Promise<AuthenticationState>;
  identityHash:string;
}
export interface CookieDependencyMeasurement {
  version:typeof functionalProbeVersion;scanId:string;originalScanHash:string;
  targets:{findingId:string;facts:{cookieAuthDependency:ProjectFact}}[];
}

async function isolatedState(source:BrowserContext,cookies:Awaited<ReturnType<BrowserContext['cookies']>>,origins:ReadonlySet<string>,check:NativeAuthenticationCheck,signal?:AbortSignal):Promise<AuthenticationState>{
  const browser=source.browser();if(!browser)return 'unknown';
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
  let rejectBound:(error:Error)=>void=()=>{};
  const bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
  const stop=(message:string)=>{rejectBound(Error(message));void context.close().catch(()=>{});};
  const abort=()=>stop('Native check cancelled');signal?.addEventListener('abort',abort);
  const timer=setTimeout(()=>stop('Native check timed out'),10000);
  try{
    return await Promise.race([bound,(async()=>{
      signal?.throwIfAborted();
      await context.routeWebSocket('**/*',socket=>socket.close());
      await context.route('**/*',route=>{
        try{return origins.has(new URL(route.request().url()).origin)?route.continue():route.abort();}catch{return route.abort();}
      });
      await context.addCookies(cookies);
      const page=await context.newPage();page.setDefaultTimeout(3000);page.setDefaultNavigationTimeout(5000);
      return await check.check(page);
    })()]);
  }catch(error){if(signal?.aborted)throw error;return 'unknown';}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);await context.close().catch(()=>{});}
}

/** Positive causal dependency only. Passing without a cookie does not prove that
 * it is a preference, unnecessary for other routes, or harmless. Cookie values
 * stay in transient browser state and never enter the result or witness hash. */
export async function measureAuthenticationCookies(context:BrowserContext,report:Report,check:NativeAuthenticationCheck,signal?:AbortSignal):Promise<CookieDependencyMeasurement>{
  const url=new URL(report.observation.url),origins=new Set([url.origin]);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Native probes require a plain loopback origin');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Native check identity is required');
  const measurement:CookieDependencyMeasurement={version:functionalProbeVersion,scanId:report.scanId,originalScanHash:await contentHash(report),targets:[]};
  const selected=report.findings.filter(f=>['CK-001','CK-002','CK-003'].includes(f.ruleId));
  const names=[...new Set(selected.map(f=>f.evidence.cookieName).filter((n):n is string=>typeof n==='string'))];
  if(!names.length)return measurement;
  if(names.length>10)throw Error('Native cookie probe budget exceeded');
  const cookies=(await context.cookies()).filter(c=>c.domain.replace(/^\./,'')===url.hostname);
  if(cookies.length>100)throw Error('Native cookie state budget exceeded');
  const baseline=await isolatedState(context,cookies,origins,check,signal);
  if(baseline!=='authenticated')return measurement;
  const anonymous=await isolatedState(context,[],origins,check,signal);
  if(anonymous!=='anonymous')return measurement;
  for(const name of names){
    signal?.throwIfAborted();
    const matching=cookies.filter(c=>c.name===name);
    if(matching.length!==1)continue; // Name-only findings cannot distinguish path/domain collisions.
    const cookie=matching[0],observed=report.observation.cookies?.filter(c=>c.name===name);
    const sameSite=cookie.sameSite==='None'?'no_restriction':cookie.sameSite==='Strict'?'strict':'lax';
    if(observed?.length!==1||observed[0].secure!==cookie.secure||observed[0].httpOnly!==cookie.httpOnly||observed[0].sameSite!==sameSite||observed[0].session!==(cookie.expires===-1))continue;
    const without=await isolatedState(context,cookies.filter(c=>c!==cookie),origins,check,signal);
    const restored=await isolatedState(context,cookies,origins,check,signal);
    if(without!=='anonymous'||restored!=='authenticated')continue;
    const fact:ProjectFact={value:true,source:'functional',coverage:'complete',witnessHash:await contentHash({version:functionalProbeVersion,check:check.identityHash,baseline,anonymous,without,restored})};
    for(const finding of selected.filter(f=>f.evidence.cookieName===name))measurement.targets.push({findingId:finding.id,facts:{cookieAuthDependency:fact}});
  }
  return measurement;
}

export function mergeCookieDependency(evidence:ProjectEvidence,measurement:CookieDependencyMeasurement):ProjectEvidence{
  if(measurement.version!==functionalProbeVersion||measurement.scanId!==evidence.scanId||measurement.originalScanHash!==evidence.originalScanHash)throw Error('Native measurement does not match the scan');
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
  return projectEvidenceSchema.parse(merged);
}

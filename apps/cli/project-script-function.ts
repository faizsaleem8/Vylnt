import type { BrowserContext,Page } from 'playwright';
import { setMaxListeners } from 'node:events';
import { securityHeaders,cspEvidenceComplete,type Report } from '../../packages/core';
import { contentHash,canonicalJson } from '../../packages/core/integrity';
import { projectEvidenceSchema,type ProjectEvidence,type ProjectFact } from '../../packages/core/project-evidence';
import { probeInlineScript } from './project-probes';
import { transfer } from './project-loopback-transport';
import {observeMetaPolicy,sourceMetaPolicy,metaPolicyStillMatches,metaPolicyVersion,type MetaPolicySummary} from './project-meta-policy';
import {parseScriptPolicySources,scriptPolicyUsesNonce} from '../../packages/ml/project-policy-facts';

export const scriptFunctionVersion='vylnt-script-function-v2';
export interface NativeScriptCheck {
  identityHash:string;
  /** Optional reviewed offline cosmetic fallback, bound into identityHash. */
  prepare?(page:Page):Promise<void>;
  /** Trusted developer-owned interaction on the already loaded page. Return
   * failed only for a positively observed broken operation, not a timeout. */
  check(page:Page):Promise<'passed'|'failed'|'unknown'>;
}
export interface ScriptPhase {
  complete:boolean;functionality:'passed'|'failed'|'unknown';
  inline:'blocked'|'executed'|'unknown';
  metaPolicy?:MetaPolicySummary;
}
export interface ScriptControls {baseline:ScriptPhase;disabled:ScriptPhase;restored:ScriptPhase}
export function scriptControlsPass(controls:ScriptControls){
  const a=controls.baseline.metaPolicy,b=controls.restored.metaPolicy;
  const validMeta=(m:MetaPolicySummary)=>m.version===metaPolicyVersion&&!m.mutated&&/^[a-f0-9]{64}$/.test(m.identityHash??'')&&(m.status==='absent'&&m.policyCount===0||m.status==='early-supported'&&m.beforeScripts===true&&typeof m.restricted==='boolean'&&m.policyCount>=1&&m.policyCount<=16);
  const metaCompatible=!a&&!b||Boolean(a&&b&&validMeta(a)&&validMeta(b)&&b.status===a.status&&a.identityHash===b.identityHash&&a.restricted===b.restricted);
  return metaCompatible&&Object.values(controls).every(p=>p.complete)
    &&controls.baseline.functionality==='passed'&&controls.restored.functionality==='passed'
    &&controls.disabled.functionality==='failed'&&controls.disabled.inline==='unknown'
    &&controls.baseline.inline!=='unknown'&&controls.baseline.inline===controls.restored.inline;
}
export interface ScriptMeasurement {
  version:typeof scriptFunctionVersion;scanId:string;originalScanHash:string;checkIdentity:string;
  status:'verified'|'needs-review';controls:ScriptControls;
  targets:{findingId:string;facts:{cspProbeAllowed:ProjectFact;cspProbeBlocked:ProjectFact;metaPolicyBeforeScripts?:ProjectFact;scriptPolicyEnforced?:ProjectFact;scriptSourcesRestricted?:ProjectFact}}[];
}
const issued=new WeakMap<ScriptMeasurement,string>();
const unknown=():ScriptPhase=>({complete:false,functionality:'unknown',inline:'unknown'});
async function scriptIdentity(page:Page){
  const metadata=await page.evaluate(()=>{
    if(document.scripts.length>150)return null;
    return [...document.scripts].map(script=>{
      const attrs=[script.getAttribute('src')??'',script.type,script.integrity];
      if(attrs.some(value=>value.length>2048))return null;
      return {attrs,async:script.hasAttribute('async'),defer:script.hasAttribute('defer')};
    });
  });
  if(!metadata||metadata.some(entry=>entry===null))return;
  // Raw identifier attributes remain transient; only their digest binds replay.
  return contentHash(metadata);
}

async function phase(source:BrowserContext,report:Report,check:NativeScriptCheck,enabled:boolean,sourceScripts:string|undefined,sourceMeta:MetaPolicySummary|undefined,signal:AbortSignal):Promise<ScriptPhase>{
  signal.throwIfAborted();const browser=source.browser();if(!browser)return unknown();
  if(!sourceScripts)return unknown();
  const url=new URL(report.observation.url),cookies=await source.cookies(report.observation.url);
  if(cookies.length>100)return unknown();
  const context=await browser.newContext({javaScriptEnabled:enabled,serviceWorkers:'block',acceptDownloads:false});
  const network=new AbortController();setMaxListeners(82,network.signal);
  let incomplete=false,requests=0,bytes=0,rejectBound:(error:Error)=>void=()=>{};
  const bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
  const stop=()=>{rejectBound(Error('Script interaction interrupted'));network.abort();void context.close().catch(()=>{});};
  const timer=setTimeout(stop,15000);signal.addEventListener('abort',stop);
  let metaObservation:Awaited<ReturnType<typeof observeMetaPolicy>>|undefined;
  try{return await Promise.race([bound,(async()=>{
    signal.throwIfAborted();await context.addCookies(cookies);
    await context.routeWebSocket('**/*',socket=>{incomplete=true;socket.close();});
    await context.route('**/*',async route=>{
      try{
        const request=route.request(),target=new URL(request.url());
        if(target.origin!==url.origin||target.username||target.password||++requests>80||['worker','serviceworker'].includes(request.resourceType())){incomplete=true;await route.abort();return;}
        const body=request.postDataBuffer();if(body&&body.length>64*1024){incomplete=true;await route.abort();return;}
        const response=await transfer(target,request.method(),await request.allHeaders(),body,network.signal,size=>{bytes+=size;if(bytes>8*1024*1024)throw Error('Script interaction budget exceeded');});
        if(response.status>=300&&response.status<400){incomplete=true;await route.abort();return;}
        for(const header of ['content-length','transfer-encoding'])delete response.headers[header];
        await route.fulfill({status:response.status,headers:response.headers,body:response.body});
      }catch{incomplete=true;await route.abort().catch(()=>{});}
    });
    const page=await context.newPage();page.setDefaultTimeout(3000);page.setDefaultNavigationTimeout(6000);
    let navigations=0;
    page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&++navigations>1)incomplete=true;});
    page.on('frameattached',()=>{incomplete=true;});page.on('worker',()=>{incomplete=true;});
    context.on('page',other=>{if(other!==page)incomplete=true;});
    if(check.prepare)await check.prepare(page);
    if(enabled)metaObservation=await observeMetaPolicy(page,report.observation.url);
    const response=await page.goto(report.observation.url,{waitUntil:'load'});
    if(!response||response.status()<200||response.status()>=300||page.url()!==report.observation.url)return unknown();
    const headers=await response.headersArray();
    if(canonicalJson(securityHeaders(headers))!==canonicalJson(report.observation.headers??{})
      ||cspEvidenceComplete(headers)!==(report.observation.cspEvidenceComplete??false))return unknown();
    const functionality=await check.check(page);
    if(enabled&&await scriptIdentity(page)!==sourceScripts)return unknown();
    if(!['passed','failed','unknown'].includes(functionality))return unknown();
    const inline=enabled?await probeInlineScript(page):'unknown';
    await page.waitForLoadState('networkidle',{timeout:1500});
    const metaPolicy=await metaObservation?.finish();
    if(enabled&&(!sourceMeta||sourceMeta.status==='needs-review'||!metaPolicy||metaPolicy.status==='needs-review'||sourceMeta.identityHash!==metaPolicy.identityHash))return {...unknown(),metaPolicy};
    return {complete:!incomplete&&page.url()===report.observation.url&&context.pages().length===1&&page.frames().length===1,functionality,inline,...(metaPolicy?{metaPolicy}:{})};
  })()]);}catch(error){if(signal.aborted)throw error;return unknown();}
  finally{clearTimeout(timer);signal.removeEventListener('abort',stop);network.abort();await metaObservation?.close();await context.close().catch(()=>{});}
}

/** No web endpoint accepts callbacks, filesystem paths or a claimed producer.
 * The original report remains untouched. Success covers only this interaction. */
export async function measureScriptFunction(source:BrowserContext,report:Report,check:NativeScriptCheck,signal?:AbortSignal):Promise<ScriptMeasurement>{
  const url=new URL(report.observation.url);
  if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Script checks require plain loopback');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Script check identity is required');
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(60000)]);combined.throwIfAborted();
  const live=source.pages().filter(page=>page.url()===report.observation.url);
  const sourceScripts=live.length===1?await scriptIdentity(live[0]):undefined;
  const sourceMeta=live.length===1?sourceMetaPolicy(live[0]):undefined;
  const compatibleSource=sourceMeta&&await metaPolicyStillMatches(live[0],sourceMeta)?sourceMeta:undefined;
  const controls={baseline:await phase(source,report,check,true,sourceScripts,compatibleSource,combined),disabled:await phase(source,report,check,false,sourceScripts,compatibleSource,combined),restored:await phase(source,report,check,true,sourceScripts,compatibleSource,combined)};
  const result:ScriptMeasurement={version:scriptFunctionVersion,scanId:report.scanId,originalScanHash:await contentHash(report),checkIdentity:check.identityHash,status:'needs-review',controls,targets:[]};
  if(!scriptControlsPass(controls))return result;
  // Syntax and one successful interaction cannot establish nonce generation,
  // unpredictability or freshness. Those profiles need a source-backed adapter.
  if(controls.baseline.metaPolicy?.nonceContext)return result;
  const responsePolicy=report.observation.headers?.['content-security-policy'];
  if(responsePolicy&&(!report.observation.cspEvidenceComplete||responsePolicy.split(',').length>16||responsePolicy.split(',').some(p=>parseScriptPolicySources(p)===undefined)))return result;
  if(responsePolicy?.split(',').some(scriptPolicyUsesNonce))return result;
  result.status='verified';
  const witnessHash=await contentHash({version:scriptFunctionVersion,check:check.identityHash,originalScanHash:result.originalScanHash,sourceScripts,controls});
  const fact=(value:boolean,source:ProjectFact['source']='functional'):ProjectFact=>({value,source,coverage:'complete',witnessHash});
  const responseRestricted=Boolean(responsePolicy&&report.observation.cspEvidenceComplete&&responsePolicy.split(',').length<=16&&responsePolicy.split(',').some(p=>parseScriptPolicySources(p)===true));
  for(const finding of report.findings.filter(f=>f.ruleId==='HDR-003'))result.targets.push({findingId:finding.id,facts:{cspProbeAllowed:fact(true),cspProbeBlocked:fact(controls.baseline.inline==='blocked'),
    ...(controls.baseline.metaPolicy?.status==='early-supported'?{metaPolicyBeforeScripts:fact(true,'browser'),scriptPolicyEnforced:fact(true,'browser'),scriptSourcesRestricted:fact(responseRestricted||controls.baseline.metaPolicy.restricted!,'browser')}:{})}});
  issued.set(result,canonicalJson(result));return result;
}
export function mergeScriptFunction(evidence:ProjectEvidence,measurement:ScriptMeasurement):ProjectEvidence{
  if(measurement.version!==scriptFunctionVersion||measurement.scanId!==evidence.scanId||measurement.originalScanHash!==evidence.originalScanHash||measurement.checkIdentity!==evidence.adapterHash)throw Error('Script measurement binding differs');
  if(measurement.status!=='verified'){if(measurement.targets.length)throw Error('Unverified script facts');return projectEvidenceSchema.parse(structuredClone(evidence));}
  if(issued.get(measurement)!==canonicalJson(measurement)||!scriptControlsPass(measurement.controls))throw Error('Script producer receipt is missing or changed');
  const merged=structuredClone(evidence),seen=new Set<string>();
  for(const measured of measurement.targets){
    const target=merged.targets.find(t=>t.findingId===measured.findingId&&t.category==='HDR-003');
    if(!target||seen.has(measured.findingId))throw Error('Invalid script target');seen.add(measured.findingId);
    for(const name of ['cspProbeAllowed','cspProbeBlocked','metaPolicyBeforeScripts','scriptPolicyEnforced','scriptSourcesRestricted'] as const){
      const previous=target.facts[name],fact=measured.facts[name];
      if(!fact)continue;
      if(['scriptPolicyEnforced','scriptSourcesRestricted'].includes(name)&&previous?.source==='response'){
        if(previous.coverage!=='complete')throw Error('Conflicting script fact');
        target.facts[name]={...fact,value:previous.value||fact.value};continue;
      }
      // A previous browser probe can independently agree with this interaction.
      if(previous&&(previous.coverage!=='complete'||previous.value!==fact.value))throw Error('Conflicting script fact');
      target.facts[name]=fact;
    }
  }
  return projectEvidenceSchema.parse(merged);
}

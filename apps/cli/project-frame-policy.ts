import type {BrowserContext,Page,Frame} from 'playwright';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {setMaxListeners} from 'node:events';
import {securityHeaders,cspEvidenceComplete,type Report} from '../../packages/core';
import {canonicalJson,contentHash} from '../../packages/core/integrity';
import {projectEvidenceSchema,type ProjectEvidence,type ProjectFact} from '../../packages/core/project-evidence';
import {framePolicyScope} from '../../packages/core/frame-policy-scope';
import {transfer} from './project-loopback-transport';

export const framePolicyVersion='vylnt-frame-policy-v1';
const sources=new WeakMap<Page,string>(),epochs=new WeakMap<Page,number>(),issued=new WeakMap<FramePolicyMeasurement,string>();
export interface FramePolicyCheck {identityHash:string;check(frame:Frame):Promise<boolean>}
export type PolicyFrameOutcome='embedded'|'csp-blocked'|'unknown';
export interface FramePolicyMeasurement {
  version:typeof framePolicyVersion;scanId:string;originalScanHash:string;checkIdentity:string;
  status:'verified'|'needs-review';sourceHealthy:boolean;
  controls:{permitted?:PolicyFrameOutcome;forbidden?:PolicyFrameOutcome;repeatedForbidden?:PolicyFrameOutcome;nestedForbidden?:PolicyFrameOutcome};
  targets:{findingId:string;facts:{framePolicyEnforced:ProjectFact;frameAncestorsRestricted:ProjectFact}}[];
}
/** Collector-owned same-run capability. Navigation, including history updates,
 * invalidates it. No upload endpoint accepts this producer capability. */
export async function recordFramePolicySource(page:Page,report:Report){
  if(page.isClosed()||page.url()!==report.observation.url)return;
  if(!epochs.has(page)){
    epochs.set(page,0);const invalidate=()=>{sources.delete(page);epochs.set(page,epochs.get(page)!+1);};
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())invalidate();});page.on('close',invalidate);
  }
  const epoch=epochs.get(page);sources.delete(page);const hash=await contentHash(report);
  if(!page.isClosed()&&epochs.get(page)===epoch&&page.url()===report.observation.url)sources.set(page,hash);
}
export function framePolicyControlsPass(result:FramePolicyMeasurement){
  return result.sourceHealthy&&(!result.controls.permitted||result.controls.permitted==='embedded')
    &&result.controls.forbidden==='csp-blocked'&&result.controls.repeatedForbidden==='csp-blocked'
    &&(!result.controls.permitted||result.controls.nestedForbidden==='csp-blocked');
}
const html=(url:string)=>'<!doctype html><iframe src="'+url.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"></iframe>';

async function run(source:BrowserContext,report:Report,check:FramePolicyCheck,parent:string,nested:string|undefined,signal:AbortSignal):Promise<PolicyFrameOutcome>{
  signal.throwIfAborted();const browser=source.browser();if(!browser)return 'unknown';
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false}),network=new AbortController();setMaxListeners(82,network.signal);
  let closing:Promise<void>|undefined;const close=()=>closing??=context.close().catch(()=>{});
  let rejectBound:(error:Error)=>void=()=>{},incomplete=false,requests=0,bytes=0,matched=false,blocked=false,protectedFrame:Frame|undefined;
  const bounded=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
  const stop=()=>{rejectBound(Error('Frame policy check interrupted'));network.abort();void close();};
  signal.addEventListener('abort',stop);const timer=setTimeout(stop,12000);
  const target=new URL(report.observation.url),path='/__vylnt_frame_'+randomUUID(),outer=parent+path,inner=nested?nested+path+'/inner':undefined;
  try{return await Promise.race([bounded,(async()=>{
    signal.throwIfAborted();const cookies=await source.cookies(report.observation.url);if(cookies.length>100)return 'unknown';await context.addCookies(cookies);
    await context.routeWebSocket('**/*',socket=>{incomplete=true;socket.close();});
    await context.route('**/*',async route=>{
      try{
        const request=route.request(),url=new URL(request.url());
        if(++requests>80||request.method()!=='GET'){incomplete=true;await route.abort();return;}
        if(url.href===outer){await route.fulfill({contentType:'text/html',body:html(inner??report.observation.url)});return;}
        if(inner&&url.href===inner){await route.fulfill({contentType:'text/html',body:html(report.observation.url)});return;}
        if(url.origin!==target.origin||url.username||url.password||['worker','serviceworker'].includes(request.resourceType())){incomplete=true;await route.abort();return;}
        const response=await transfer(url,'GET',await request.allHeaders(),null,network.signal,size=>{bytes+=size;if(bytes>8*1024*1024)throw Error('Frame policy budget exceeded');});
        if(response.status>=300&&response.status<400){incomplete=true;await route.abort();return;}
        if(request.isNavigationRequest()){
          if(url.href!==report.observation.url||matched){incomplete=true;await route.abort();return;}
          const headers=Object.entries(response.headers).map(([name,value])=>({name,value}));
          matched=response.status>=200&&response.status<300&&canonicalJson(securityHeaders(headers))===canonicalJson(report.observation.headers??{})
            &&cspEvidenceComplete(headers)===(report.observation.cspEvidenceComplete??false);
          if(matched)protectedFrame=request.frame();
        }
        for(const name of ['content-length','transfer-encoding'])delete response.headers[name];
        await route.fulfill({status:response.status,headers:response.headers,body:response.body});
      }catch{incomplete=true;await route.abort().catch(()=>{});}
    });
    const page=await context.newPage(),session=await context.newCDPSession(page);
    let targetFrameId:string|undefined;const mainId=(await session.send('Page.getFrameTree')).frameTree.frame.id;
    session.on('Network.requestWillBeSent',event=>{if(event.type==='Document'&&event.request.url===report.observation.url)targetFrameId=event.frameId;});
    await session.send('Network.enable');
    session.on('Audits.issueAdded',({issue})=>{
      const d=issue.details.contentSecurityPolicyIssueDetails;
      // Chromium reports the protected origin (not the full target path) and
      // the violating ancestor. Bind both to the single matched navigation.
      if(d&&matched&&targetFrameId&&d.isReportOnly===false&&/^frame-ancestors(?:\s|$)/.test(d.violatedDirective)&&d.frameAncestor?.frameId===mainId){
        try{if(new URL(d.blockedURL??'').origin===target.origin)blocked=true;}catch{/* Unlinked audit stays unknown. */}
      }
    });
    await session.send('Audits.enable');page.setDefaultTimeout(2000);
    page.on('worker',()=>{incomplete=true;});page.on('download',()=>{incomplete=true;});context.on('page',other=>{if(other!==page)incomplete=true;});
    await page.goto(outer,{waitUntil:'load',timeout:6000});await page.waitForTimeout(200);
    if(incomplete||!matched||page.url()!==outer||context.pages().length!==1)return 'unknown';
    const frames=page.frames();if(frames.length!==(inner?3:2))return 'unknown';
    if(!protectedFrame||!frames.includes(protectedFrame)||protectedFrame.parentFrame()?.url()!==(inner??outer))return 'unknown';
    if(inner&&frames.filter(f=>f.url()===inner).length!==1)return 'unknown';
    const targets=frames.filter(f=>f.url()===report.observation.url);
    if(targets.length===1){if(blocked||await targets[0].evaluate(()=>location.href).catch(()=>null)!==report.observation.url||!await check.check(targets[0]))return 'unknown';return 'embedded';}
    return blocked?'csp-blocked':'unknown';
  })()]);}catch(error){if(signal.aborted)throw error;return 'unknown';}
  finally{clearTimeout(timer);signal.removeEventListener('abort',stop);network.abort();await close();}
}

/** Exact finite response policies, with a healthy target and actual ancestor
 * enforcement. Does not infer public embedding intent or sensitive actions. */
export async function measureFramePolicy(source:BrowserContext,report:Report,check:FramePolicyCheck,signal?:AbortSignal):Promise<FramePolicyMeasurement>{
  const url=new URL(report.observation.url);
  if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash)throw Error('Frame policy checks require plain HTTP loopback');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Frame policy identity is required');
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(65000)]);combined.throwIfAborted();
  const hash=await contentHash(report),result:FramePolicyMeasurement={version:framePolicyVersion,scanId:report.scanId,originalScanHash:hash,checkIdentity:check.identityHash,status:'needs-review',sourceHealthy:false,controls:{},targets:[]};
  const scope=framePolicyScope(report.observation.headers?.['content-security-policy'],report.observation.url);
  if(!scope.supported||report.observation.cspEvidenceComplete!==true)return result;
  const pages=source.pages().filter(p=>p.url()===report.observation.url&&sources.get(p)===hash);if(pages.length!==1)return result;
  const page=pages[0];let timer:ReturnType<typeof setTimeout>|undefined,settle:(v:boolean)=>void=()=>{};
  const stop=()=>{settle(false);void page.close().catch(()=>{});};combined.addEventListener('abort',stop);
  try{combined.throwIfAborted();result.sourceHealthy=await Promise.race([check.check(page.mainFrame()),new Promise<boolean>(resolve=>{settle=resolve;timer=setTimeout(stop,5000);})]);}
  catch{result.sourceHealthy=false;}finally{if(timer)clearTimeout(timer);combined.removeEventListener('abort',stop);}
  combined.throwIfAborted();if(result.sourceHealthy!==true||page.url()!==report.observation.url||sources.get(page)!==hash)return result;
  let server:ReturnType<typeof createServer>|undefined,forbidden='';
  try{
    for(let attempt=0;attempt<4;attempt++){
      server=createServer((_request,response)=>{response.writeHead(404);response.end();});
      await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});
      forbidden='http://127.0.0.1:'+(server.address() as {port:number}).port;
      if(!scope.origins.includes(forbidden))break;
      await new Promise<void>(resolve=>server!.close(()=>resolve()));server=undefined;
    }
    if(!server||scope.origins.includes(forbidden))return result;
    const permitted=scope.origins[0];
    if(permitted)result.controls.permitted=await run(source,report,check,permitted,undefined,combined);
    result.controls.forbidden=await run(source,report,check,forbidden,undefined,combined);
    result.controls.repeatedForbidden=await run(source,report,check,forbidden,undefined,combined);
    if(permitted)result.controls.nestedForbidden=await run(source,report,check,forbidden,permitted,combined);
    if(!framePolicyControlsPass(result)||sources.get(page)!==hash)return result;
    result.status='verified';const witnessHash=await contentHash({version:framePolicyVersion,originalScanHash:hash,check:check.identityHash,policyHash:await contentHash(report.observation.headers!['content-security-policy']),controls:result.controls,scope:'finite-response-policy/http-loopback-ancestors'});
    const fact:ProjectFact={value:true,source:'browser',coverage:'complete',witnessHash};
    for(const finding of report.findings.filter(f=>f.ruleId==='HDR-002'))result.targets.push({findingId:finding.id,facts:{framePolicyEnforced:{...fact},frameAncestorsRestricted:{...fact}}});
    issued.set(result,canonicalJson(result));return result;
  }finally{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}}
}
export function mergeFramePolicy(evidence:ProjectEvidence,measurement:FramePolicyMeasurement):ProjectEvidence{
  if(measurement.version!==framePolicyVersion||measurement.scanId!==evidence.scanId||measurement.originalScanHash!==evidence.originalScanHash||measurement.checkIdentity!==evidence.adapterHash)throw Error('Frame policy binding differs');
  if(measurement.status!=='verified'){if(measurement.targets.length)throw Error('Unverified frame facts');return projectEvidenceSchema.parse(structuredClone(evidence));}
  if(issued.get(measurement)!==canonicalJson(measurement)||!framePolicyControlsPass(measurement))throw Error('Frame policy producer receipt missing or changed');
  const merged=structuredClone(evidence),seen=new Set<string>();
  for(const measured of measurement.targets){
    const target=merged.targets.find(t=>t.findingId===measured.findingId&&t.category==='HDR-002');if(!target||seen.has(measured.findingId))throw Error('Invalid frame policy target');seen.add(measured.findingId);
    for(const name of ['framePolicyEnforced','frameAncestorsRestricted'] as const){
      const previous=target.facts[name],next=measured.facts[name];
      if(previous&&(previous.coverage!=='complete'||previous.source!=='response'&&canonicalJson(previous)!==canonicalJson(next)))throw Error('Conflicting frame policy fact');
      target.facts[name]=next;
    }
  }
  return projectEvidenceSchema.parse(merged);
}

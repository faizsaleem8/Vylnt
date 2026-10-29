import type {BrowserContext,Page,Request,Response} from 'playwright';
import {isIP} from 'node:net';
import {securityHeaders,cspEvidenceComplete,safeUrl,type Report} from '../../packages/core';
import {contentHash,canonicalJson} from '../../packages/core/integrity';
import {projectEvidenceSchema,type ProjectEvidence,type ProjectFact} from '../../packages/core/project-evidence';
import {guardProjectRedirects} from './project-redirect-guard';

export const resourceFunctionVersion='vylnt-resource-function-v1';
type Outcome='passed'|'failed'|'unknown';
export interface NativeResourceCheck {
  identityHash:string;
  /** Trusted, read-only interaction. Failure must be positively observed. */
  check(page:Page):Promise<Outcome>;
}
export interface ResourcePhase {
  complete:boolean;functionality:Outcome;transfer:'http'|'withheld'|'unknown';metadataHash?:string;
}
export interface ResourceControls {baseline:ResourcePhase;withheld:ResourcePhase;restored:ResourcePhase}
export interface ResourceMeasurement {
  version:typeof resourceFunctionVersion;scanId:string;originalScanHash:string;checkIdentity:string;
  status:'verified'|'needs-review';
  sourceFunctionality:Outcome;
  checks:{findingIds:string[];controls:ResourceControls}[];
  targets:{findingId:string;facts:{resourceTlsUpgradeObserved:ProjectFact;resourceHttpTransferObserved:ProjectFact;resourceFunctionVerified:ProjectFact;requestChainComplete:ProjectFact}}[];
}
interface Script {raw:string;url:string;classic:boolean}
interface Snapshot {hash:string;scripts:Script[]}
interface Transfer {raw:string;type:string;main:boolean;done:boolean;failed:boolean;direct:boolean;wire:boolean;status?:number;tlsObserved?:boolean;redirected?:boolean;metadataUnavailable?:boolean}
interface Observation {
  reportHash:string;metadata:Snapshot;transfers:Transfer[];complete:boolean;
  origins:readonly string[];ignoreHTTPSErrors:boolean;
}
const observed=new WeakMap<Page,Observation>(),issued=new WeakMap<ResourceMeasurement,string>();
const loopback=(host:string)=>['127.0.0.1','localhost','[::1]'].includes(host);
function plain(raw:string){try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)&&loopback(url.hostname)&&!url.username&&!url.password&&raw.length<=8192?url:undefined;}catch{return;}}
const unknown=():ResourcePhase=>({complete:false,functionality:'unknown',transfer:'unknown'});

async function snapshot(page:Page):Promise<Snapshot|undefined>{
  const input=await page.locator('html').evaluate(root=>{
    const doc=root.ownerDocument;if(doc.scripts.length>150)return null;
    const scripts=[...doc.scripts].map(s=>({raw:s.src,attrs:[s.getAttribute('src')??'',s.type,s.integrity,s.crossOrigin??'',s.referrerPolicy],async:s.hasAttribute('async'),defer:s.hasAttribute('defer'),noModule:s.noModule}));
    const policies=[...doc.querySelectorAll('meta[http-equiv]')].filter(m=>/^(content-security-policy|content-security-policy-report-only)$/i.test(m.getAttribute('http-equiv')??''))
      .map(m=>[m.getAttribute('http-equiv'),m.getAttribute('content')]);
    if(policies.length>16||scripts.some(s=>s.attrs.some(a=>a.length>2048))||policies.some(p=>p.some(a=>(a?.length??0)>8191)))return null;
    return {scripts,policies};
  });
  if(!input||Buffer.byteLength(JSON.stringify(input))>64*1024)return;
  return {hash:await contentHash(input),scripts:input.scripts.filter(s=>s.raw).map(s=>({raw:s.raw,url:safeUrl(s.raw),classic:!s.attrs[1]||/^(?:text|application)\/javascript$/i.test(s.attrs[1])}))};
}

/** Start before navigation. Bookkeeping contains transient identifiers only;
 * consumers cannot upload this receipt or attach it to an older scan. */
export function observeResourceRequests(page:Page,target:string,origins:ReadonlySet<string>,ignoreHTTPSErrors=false){
  const records=new Map<Request,Transfer>(),pending=new Set<Promise<void>>();let complete=true,active=true,bytes=0;
  const request=(req:Request)=>{
    if(!active)return;
    if(records.size>=300){complete=false;return;}
    const raw=req.url();if(raw.length>8192){complete=false;return;}
    let main=false;try{main=req.frame()===page.mainFrame();}catch{complete=false;}
    records.set(req,{raw,type:req.resourceType(),main,done:false,failed:false,direct:!req.redirectedFrom(),wire:false});
  };
  const finished=(req:Request)=>{
    const record=records.get(req);if(!record)return;record.done=true;
    record.redirected=!!req.redirectedTo();
    if(record.type!=='script'||!record.main||!record.direct||record.redirected)return;
    const task=(async()=>{
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{
        const metadata=await Promise.race([(async()=>{
          const response=await req.response();
          if(!response)return;record.status=response.status();
          if(response.status()<200||response.status()>=300||response.fromServiceWorker())return;
          if(record.raw.startsWith('https:')&&!ignoreHTTPSErrors){
            const security=await response.securityDetails();record.tlsObserved=!!security&&/^TLS 1\.[23]$/.test(security.protocol??'');
          }
          const address=await response.serverAddr();if(!address)return;
          const sizes=await req.sizes();return {address,sizes};
        })(),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Resource metadata timed out')),1500);})]);
        if(!metadata)return;
        const {address,sizes}=metadata;bytes+=Math.max(0,sizes.responseBodySize)+Math.max(0,sizes.responseHeadersSize);
        if(bytes>8*1024*1024){complete=false;return;}
        // A synthetic route fulfilment/cache hit is not proof of an HTTP wire response.
        record.wire=Boolean(isIP(address.ipAddress.replace(/^\[|\]$/g,''))&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address.ipAddress.replace(/^\[|\]$/g,'')));
      }catch{record.metadataUnavailable=true;}
      finally{if(timer)clearTimeout(timer);}
    })();pending.add(task);void task.finally(()=>pending.delete(task));
  };
  const failed=(req:Request)=>{const record=records.get(req);if(record)record.failed=true;};
  const response=(value:Response)=>{const record=records.get(value.request());if(record)record.status=value.status();};
  page.on('request',request);page.on('response',response);page.on('requestfinished',finished);page.on('requestfailed',failed);
  const close=()=>{active=false;page.removeListener('request',request);page.removeListener('response',response);page.removeListener('requestfinished',finished);page.removeListener('requestfailed',failed);};
  return {close,async finish(report:Report){
    try{
      await Promise.all([...pending]);const metadata=await snapshot(page),url=plain(target);
      if(!url||url.search||url.hash||target!==page.url()||report.observation.url!==target||!metadata)return;
      observed.set(page,{reportHash:await contentHash(report),metadata,transfers:[...records.values()],complete,
        origins:Object.freeze([...origins]),ignoreHTTPSErrors});
    }finally{close();}
  }};
}

export interface ResourceTransferCorrelation {
  version:'vylnt-resource-correlation-v1';scanId:string;originalScanHash:string;
  status:'observed'|'needs-review';upgradeVerified:false;functionVerified:false;
  targets:{findingId:string;correlation:'http-request'|'https-counterpart'|'ambiguous'|'unobserved'|'unsupported-script';
    outcome:'completed'|'failed'|'http-error'|'unknown';wireObserved:boolean;tlsMetadataObserved:boolean;witnessHash:string}[];
}
/** Read only, same-page transfer diagnostics. An HTTPS counterpart alone cannot
 * prove a pre-transfer upgrade, script execution or application compatibility. */
export async function correlateResourceTransfers(page:Page,report:Report):Promise<ResourceTransferCorrelation>{
  const originalScanHash=await contentHash(report),result:ResourceTransferCorrelation={version:'vylnt-resource-correlation-v1',scanId:report.scanId,originalScanHash,
    status:'needs-review',upgradeVerified:false,functionVerified:false,targets:[]};
  const original=observed.get(page);
  if(!original||!original.complete||original.reportHash!==originalScanHash||page.url()!==report.observation.url||(await snapshot(page))?.hash!==original.metadata.hash)return result;
  const selected=report.findings.filter(f=>f.ruleId==='NET-001'&&f.evidence.resourceType==='script');
  if(selected.length>1500)return result;
  for(const finding of selected){
    const scripts=original.metadata.scripts.filter(script=>script.url===finding.url);
    let correlation:ResourceTransferCorrelation['targets'][number]['correlation']='unobserved',record:Transfer|undefined;
    if(scripts.length>1)correlation='ambiguous';
    else if(scripts.length===1){
      const script=scripts[0],raw=plain(script.raw);
      if(!script.classic)correlation='unsupported-script';
      else if(raw?.protocol==='http:'&&original.origins.includes(raw.origin)){
        const counterpart=new URL(raw.href);counterpart.protocol='https:';
        const matches=original.transfers.filter(r=>r.main&&r.type==='script'&&original.origins.includes(plain(r.raw)?.origin??'')&&(r.raw===script.raw||r.raw===counterpart.href));
        if(matches.length>1||matches.some(r=>!r.direct||r.redirected))correlation='ambiguous';
        else if(matches.length===1){record=matches[0];correlation=record.raw===script.raw?'http-request':'https-counterpart';}
      }
    }
    const outcome:ResourceTransferCorrelation['targets'][number]['outcome']=record?.status!==undefined&&record.status>=400?'http-error':record?.failed?'failed':record?.metadataUnavailable?'unknown':record?.done&&record.status!==undefined&&record.status>=200&&record.status<300?'completed':'unknown';
    const diagnostics={correlation,outcome,wireObserved:record?.wire===true,tlsMetadataObserved:record?.tlsObserved===true};
    result.targets.push({findingId:finding.id,...diagnostics,witnessHash:await contentHash({version:result.version,originalScanHash,metadata:original.metadata.hash,diagnostics})});
  }
  // No mutable DOM state may be matched to an earlier observation snapshot.
  if(page.url()!==report.observation.url||(await snapshot(page))?.hash!==original.metadata.hash)return {...result,targets:[]};
  result.status='observed';return result;
}

export function resourceControlsPass(controls:ResourceControls){
  const a=controls.baseline,b=controls.withheld,c=controls.restored;
  return [a,b,c].every(p=>p.complete&&/^[a-f0-9]{64}$/.test(p.metadataHash??''))
    &&a.metadataHash===b.metadataHash&&a.metadataHash===c.metadataHash
    &&a.functionality==='passed'&&b.functionality==='failed'&&c.functionality==='passed'
    &&a.transfer==='http'&&b.transfer==='withheld'&&c.transfer==='http';
}
function directTransfer(observation:Observation,raw:string){
  const matches=observation.transfers.filter(r=>r.raw===raw&&r.main&&r.type==='script');
  return observation.complete&&matches.length===1&&matches[0].done&&!matches[0].failed&&matches[0].direct&&matches[0].wire;
}

async function phase(source:BrowserContext,report:Report,original:Observation,raw:string,check:NativeResourceCheck,withhold:boolean,signal:AbortSignal):Promise<ResourcePhase>{
  signal.throwIfAborted();const browser=source.browser();if(!browser)return unknown();
  const cookies=await source.cookies();if(cookies.length>100)return unknown();
  const context=await browser.newContext({ignoreHTTPSErrors:original.ignoreHTTPSErrors,serviceWorkers:'block',acceptDownloads:false});
  let closing:Promise<void>|undefined;const close=()=>closing??=context.close().catch(()=>{});
  let incomplete=false,requests=0,withheld=0,rejectBound:(e:Error)=>void=()=>{};
  const bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
  const stop=()=>{rejectBound(Error('Resource interaction interrupted'));void close();};
  const timer=setTimeout(stop,12000);signal.addEventListener('abort',stop);
  let observer:ReturnType<typeof observeResourceRequests>|undefined;
  let redirectGuard:Awaited<ReturnType<typeof guardProjectRedirects>>|undefined;
  try{return await Promise.race([bound,(async()=>{
    signal.throwIfAborted();await context.addCookies(cookies);
    await context.routeWebSocket('**/*',socket=>{incomplete=true;socket.close();});
    await context.route('**/*',async route=>{
      const req=route.request(),url=plain(req.url());
      if(!url||!original.origins.includes(url.origin)||++requests>80||req.method()!=='GET'||req.redirectedFrom()||['worker','serviceworker'].includes(req.resourceType())){incomplete=true;await route.abort();return;}
      if(withhold&&req.url()===raw&&req.resourceType()==='script'){withheld++;await route.abort();return;}
      await route.continue();
    });
    const page=await context.newPage();page.setDefaultTimeout(2500);page.setDefaultNavigationTimeout(5000);
    redirectGuard=await guardProjectRedirects(page,new Set(original.origins),{rejectAll:true,rejected:()=>{incomplete=true;}});
    let navigations=0;
    page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&++navigations>1)incomplete=true;});
    page.on('frameattached',()=>{incomplete=true;});page.on('worker',()=>{incomplete=true;});
    context.on('page',other=>{if(other!==page)incomplete=true;});
    page.on('download',()=>{incomplete=true;});
    observer=observeResourceRequests(page,report.observation.url,new Set(original.origins),original.ignoreHTTPSErrors);
    const response=await page.goto(report.observation.url,{waitUntil:'load'});
    if(!response||response.status()<200||response.status()>=300||page.url()!==report.observation.url)return unknown();
    const headers=await response.headersArray();
    if(canonicalJson(securityHeaders(headers))!==canonicalJson(report.observation.headers??{})||cspEvidenceComplete(headers)!==(report.observation.cspEvidenceComplete??false))return unknown();
    const functionality=await check.check(page);if(!['passed','failed','unknown'].includes(functionality))return unknown();
    await page.waitForLoadState('networkidle',{timeout:2000});await observer.finish(report);
    const capture=observed.get(page);if(!capture||capture.metadata.hash!==original.metadata.hash)return unknown();
    const transfer:ResourcePhase['transfer']=withhold?(withheld===1?'withheld':'unknown'):directTransfer(capture,raw)?'http':'unknown';
    return {complete:!incomplete&&capture.complete&&page.url()===report.observation.url&&context.pages().length===1&&page.frames().length===1,
      functionality,transfer,metadataHash:capture.metadata.hash};
  })()]);}catch(error){if(signal.aborted)throw error;return unknown();}
  finally{clearTimeout(timer);signal.removeEventListener('abort',stop);observer?.close();await redirectGuard?.close();for(const page of context.pages())observed.delete(page);await close();}
}

/** Direct HTTP classic-script dependencies only. No absent request, failed
 * transfer, redirect or HTTPS-looking URL establishes a pre-transfer upgrade. */
export async function measureResourceFunction(source:BrowserContext,report:Report,check:NativeResourceCheck,signal?:AbortSignal):Promise<ResourceMeasurement>{
  const url=plain(report.observation.url);if(!url||url.protocol!=='https:'||url.search||url.hash)throw Error('Resource checks require a plain HTTPS loopback document');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Resource check identity is required');
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(60000)]);combined.throwIfAborted();
  const originalScanHash=await contentHash(report),result:ResourceMeasurement={version:resourceFunctionVersion,scanId:report.scanId,originalScanHash,checkIdentity:check.identityHash,status:'needs-review',sourceFunctionality:'unknown',checks:[],targets:[]};
  const pages=source.pages().filter(p=>p.url()===report.observation.url);if(pages.length!==1)return result;
  const page=pages[0],original=observed.get(page);
  if(!original||!original.complete||original.reportHash!==originalScanHash||(await snapshot(page))?.hash!==original.metadata.hash)return result;
  const selected=report.findings.filter(f=>f.ruleId==='NET-001'&&f.evidence.resourceType==='script'),urls=[...new Set(selected.map(f=>f.url))];
  if(urls.length===0||urls.length>3)return result;
  let timer:ReturnType<typeof setTimeout>|undefined,settle:(value:'unknown')=>void=()=>{};
  const stop=()=>{void page.close().catch(()=>{});settle('unknown');};combined.addEventListener('abort',stop);
  try{
    combined.throwIfAborted();
    const bounded=new Promise<'unknown'>(resolve=>{settle=resolve;timer=setTimeout(stop,5000);});
    result.sourceFunctionality=await Promise.race([check.check(page),bounded]);
  }catch{result.sourceFunctionality='unknown';}
  finally{if(timer)clearTimeout(timer);combined.removeEventListener('abort',stop);}
  combined.throwIfAborted();
  if(result.sourceFunctionality!=='passed'||page.url()!==report.observation.url||(await snapshot(page))?.hash!==original.metadata.hash)return result;
  for(const identifier of urls){
    const members=selected.filter(f=>f.url===identifier),matches=original.metadata.scripts.filter(s=>s.url===identifier);
    if(matches.length!==1||!matches[0].classic)continue;
    const raw=matches[0].raw,target=plain(raw);
    if(!target||target.protocol!=='http:'||!original.origins.includes(target.origin)||!directTransfer(original,raw))continue;
    const controls={baseline:await phase(source,report,original,raw,check,false,combined),withheld:await phase(source,report,original,raw,check,true,combined),restored:await phase(source,report,original,raw,check,false,combined)};
    result.checks.push({findingIds:members.map(f=>f.id),controls});
    if(!resourceControlsPass(controls))continue;
    const witnessHash=await contentHash({version:resourceFunctionVersion,originalScanHash,check:check.identityHash,resourceIdentity:await contentHash(raw),metadata:original.metadata.hash,controls});
    const fact=(value:boolean):ProjectFact=>({value,source:'functional',coverage:'complete',witnessHash});
    for(const member of members)result.targets.push({findingId:member.id,facts:{resourceTlsUpgradeObserved:fact(false),resourceHttpTransferObserved:fact(true),resourceFunctionVerified:fact(true),requestChainComplete:fact(true)}});
  }
  if(result.targets.length){result.status='verified';issued.set(result,canonicalJson(result));}return result;
}

export function mergeResourceFunction(evidence:ProjectEvidence,measurement:ResourceMeasurement):ProjectEvidence{
  if(measurement.version!==resourceFunctionVersion||measurement.scanId!==evidence.scanId||measurement.originalScanHash!==evidence.originalScanHash||measurement.checkIdentity!==evidence.adapterHash)throw Error('Resource measurement binding differs');
  if(measurement.status!=='verified'){if(measurement.targets.length)throw Error('Unverified resource facts');return projectEvidenceSchema.parse(structuredClone(evidence));}
  if(issued.get(measurement)!==canonicalJson(measurement)||measurement.sourceFunctionality!=='passed')throw Error('Resource producer receipt is missing or changed');
  const merged=structuredClone(evidence),seen=new Set<string>();
  for(const measured of measurement.targets){
    const target=merged.targets.find(t=>t.findingId===measured.findingId&&t.category==='NET-001');
    if(!target||seen.has(measured.findingId))throw Error('Invalid resource target');seen.add(measured.findingId);
    if(!measurement.checks.some(c=>c.findingIds.includes(measured.findingId)&&resourceControlsPass(c.controls)))throw Error('Incomplete resource controls');
    for(const name of ['resourceTlsUpgradeObserved','resourceHttpTransferObserved','resourceFunctionVerified','requestChainComplete'] as const){
      const fact=measured.facts[name],previous=target.facts[name];
      if(previous&&canonicalJson(previous)!==canonicalJson(fact))throw Error('Conflicting resource fact');target.facts[name]=fact;
    }
  }
  return projectEvidenceSchema.parse(merged);
}

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { BrowserContext,Page } from 'playwright';
import type { Report } from '../../packages/core';
import { canonicalJson,contentHash } from '../../packages/core/integrity';
import {projectEvidenceSchema,type ProjectEvidence} from '../../packages/core/project-evidence';
import { transfer } from './project-loopback-transport';

export type CrossSitePhase='same-site'|'cross-site'|'anonymous'|'repeated';
const issuedMutations=new WeakMap<object,{receipt:string;findingId:string}>();
export interface NativeCrossSiteCheck {
  identityHash:string;path:string;cookieName:string;
  wireMethod?:'POST'|'GET';
  /** Reviewed form override for POST, or the explicitly declared GET operation. */
  effectiveMethod?:'POST'|'PUT'|'DELETE'|'GET';
  /** Synthetic fixture bytes supplied by a reviewed adapter, never a file path. */
  multipartImage?:{field:string;bytes:Buffer};
  /** Exercise the application's own credentialed CORS response. */
  json?:true;
  /** Developer-owned disposable operation; values/bodies never leave this run. */
  prepare(phase:CrossSitePhase):Promise<Record<string,string>>;
  observe(phase:CrossSitePhase):Promise<'changed'|'unchanged'|'unknown'>;
}
export function validateCrossSiteFields(fields:Record<string,string>,method:'POST'|'PUT'|'DELETE'|'GET'='POST',wire:'POST'|'GET'='POST'){
  const entries=Object.entries(fields);
  if(wire==='GET'){if(method!=='GET'||entries.length)throw Error('GET probe requires an empty, explicitly declared GET operation');return entries;}
  if(wire!=='POST'||!['POST','PUT','DELETE'].includes(method)||entries.length>32||entries.some(([key,value])=>typeof value!=='string'||key.length>256||value.length>8192)||Buffer.byteLength(new URLSearchParams(fields).toString())>65536)throw Error('Cross-site operation body exceeds supported bounds');
  if(method==='POST'?Object.hasOwn(fields,'_method'):fields._method!==method)throw Error('Undeclared or mismatched form method override');
  return entries;
}
export interface CrossSiteObservation {
  complete:boolean;originVerified:boolean;cookieSent:boolean;
  initiatorVerified?:boolean;
  status:number|null;state:'changed'|'unchanged'|'unknown';
  outcome:'changed-with-cookie'|'explicit-denial'|'unknown';
}
export function crossSiteOutcome(input:Omit<CrossSiteObservation,'outcome'>):CrossSiteObservation['outcome']{
  if(!input.complete||!(input.initiatorVerified??input.originVerified)||!input.cookieSent||input.status===null||input.status>=500)return 'unknown';
  if(input.state==='changed'&&input.status>=200&&input.status<400)return 'changed-with-cookie';
  if(input.state==='unchanged'&&[401,403].includes(input.status))return 'explicit-denial';
  return 'unknown';
}
export function verifyNavigationInitiator(headers:Record<string,string|undefined>,origin:string,crossSite:boolean,sourceDocumentMatches=false){
  // Intercepted navigation headers can omit Fetch Metadata. In that case require
  // both the browser's referrer and its exact owned source document, not a
  // fabricated Origin header. Contradictory metadata never uses the fallback.
  try{const referrer=new URL(headers.referer??'');return referrer.origin===origin&&!referrer.username&&!referrer.password&&(headers['sec-fetch-site']?headers['sec-fetch-site']===(crossSite?'cross-site':'same-origin'):sourceDocumentMatches);}
  catch{return false;}
}

// Playwright routing synthesizes CORS preflight responses on Chromium.
// Raw interception bounds destinations while leaving OPTIONS and its reply native.
async function runJsonPost(context:BrowserContext,page:Page,document:string,action:URL,fields:Record<string,string>,observe: (headers:Record<string,string>)=>void){
  const session=await context.newCDPSession(page);
  const body=JSON.stringify(fields),foreign=new URL(document).origin!==action.origin;
  let navigations=0,posted=0,preflights=0,unexpected=false,headers:Promise<Record<string,string>>|undefined;
  if(Buffer.byteLength(body)>65536)throw Error('JSON operation exceeds body budget');
  page.on('request',request=>{
    if(request.url()===action.href&&request.method()==='POST')headers=request.allHeaders();
  });
  session.on('Fetch.requestPaused',async ({requestId,request})=>{
    try{
      if(request.url===document&&request.method==='GET'&&++navigations===1){
        // Chromium needs a real loopback document to establish the initiator's address space.
        if(foreign){await session.send('Fetch.continueRequest',{requestId});return;}
        await session.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],
          body:Buffer.from('<!doctype html><title>Local JSON probe</title>').toString('base64')});return;
      }
      if(request.url===action.href&&((foreign&&request.method==='OPTIONS'&&++preflights===1)||
        (request.method==='POST'&&++posted===1&&request.postData===body))){
        await session.send('Fetch.continueRequest',{requestId});return;
      }
      if(request.url!==new URL('/favicon.ico',document).href||request.method!=='GET')unexpected=true;
      await session.send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});
    }catch{unexpected=true;}
  });
  await session.send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
  await page.goto(document,{waitUntil:'load',timeout:5000});
  const status=await page.evaluate(async ({url,body})=>{
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},credentials:'include',
      redirect:'error',signal:AbortSignal.timeout(6000),body});
    await response.body?.cancel();
    return response.status;
  },{url:action.href,body});
  if(headers)observe(await headers);
  return {status,complete:posted===1&&preflights===Number(foreign)&&!unexpected&&context.pages().length===1&&page.frames().length===1&&page.url()===document};
}
/** Diagnostic native-route probe only. Does not assert cookie necessity, route
 * coverage, application purpose or a qualified model decision. */
export async function measureCrossSite(source:BrowserContext,report:Report,check:NativeCrossSiteCheck,signal?:AbortSignal){
  const target=new URL(report.observation.url),action=new URL(check.path,target.origin);
  if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.username||target.password||!check.path.startsWith('/')||check.path.startsWith('//')||action.username||action.password||action.origin!==target.origin||action.href!==target.origin+action.pathname)throw Error('Cross-site probe requires explicit 127.0.0.1 HTTP route');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash)||!check.cookieName||check.cookieName.length>256)throw Error('Invalid native cross-site identity');
  const wireMethod=check.wireMethod??'POST',effectiveMethod=check.effectiveMethod??wireMethod;
  if(!['GET','POST'].includes(wireMethod)||(wireMethod==='GET'&&effectiveMethod!=='GET')||(wireMethod==='POST'&&effectiveMethod==='GET'))throw Error('Mismatched declared wire method');
  const image=check.multipartImage;
  if(check.json&&(image||wireMethod!=='POST'||effectiveMethod!=='POST'))throw Error('JSON probe requires a plain POST');
  if(image&&(wireMethod!=='POST'||effectiveMethod!=='POST'||!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(image.field)||
    !Buffer.isBuffer(image.bytes)||image.bytes.length<8||image.bytes.length>16384||
    !image.bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))))throw Error('Invalid synthetic multipart fixture');
  const matchesAction=(raw:string)=>{try{const url=new URL(raw);return url.origin===action.origin&&url.pathname===action.pathname&&!url.search&&!url.hash&&!url.username&&!url.password;}catch{return false;}};
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(60000)]);combined.throwIfAborted();
  const cookies=await source.cookies(action.href),matches=cookies.filter(c=>c.name===check.cookieName);
  const observed=report.observation.cookies?.filter(c=>c.name===check.cookieName);
  if(cookies.length>100||matches.length!==1||observed?.length!==1||matches[0].partitionKey)throw Error('Cross-site cookie matching is incomplete');
  const cookie=matches[0],meta=observed[0],sameSite=cookie.sameSite==='None'?'no_restriction':cookie.sameSite==='Strict'?'strict':'lax';
  if(meta.secure!==cookie.secure||meta.httpOnly!==cookie.httpOnly||meta.sameSite!==sameSite||meta.session!==(cookie.expires===-1))throw Error('Cross-site cookie metadata changed');
  const path='/__vylnt_form_'+randomUUID();
  const server=createServer((request,response)=>{
    if(check.json&&request.url===path&&request.method==='GET'){
      response.writeHead(200,{'content-type':'text/html','cache-control':'no-store',
        'content-security-policy':"default-src 'none'; connect-src "+action.origin});
      response.end('<!doctype html><title>Local JSON probe</title>');return;
    }
    response.writeHead(404);response.end();
  });
  await new Promise<void>((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.2',done);});
  const foreign='http://127.0.0.2:'+(server.address() as {port:number}).port;
  const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
  async function run(phase:CrossSitePhase):Promise<CrossSiteObservation>{
    combined.throwIfAborted();const browser=source.browser();if(!browser)throw Error('Native browser unavailable');
    const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false}),network=new AbortController();
    let rejectBound:(error:Error)=>void=()=>{};
    const bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
    const stop=()=>{rejectBound(Error('Cross-site check interrupted'));network.abort();void context.close().catch(()=>{});};
    combined.addEventListener('abort',stop);const timer=setTimeout(stop,12000);
    const result:Omit<CrossSiteObservation,'outcome'>={complete:false,originVerified:false,initiatorVerified:false,cookieSent:false,status:null,state:'unknown'};
    try{return await Promise.race([bound,(async()=>{
      const fields=await check.prepare(phase),entries=validateCrossSiteFields(fields,effectiveMethod,wireMethod);
      if(phase!=='anonymous')await context.addCookies(cookies);
      const origin=phase==='same-site'?target.origin:foreign;
      let posted=false,incomplete=false;
      await context.routeWebSocket('**/*',socket=>{incomplete=true;socket.close();});
      if(check.json){
        const page=await context.newPage();
        const proof=await runJsonPost(context,page,origin+path,action,fields,headers=>{
          result.originVerified=headers.origin===origin;
          result.initiatorVerified=result.originVerified;
          result.cookieSent=(headers.cookie??'').split(';').some(part=>part.trim()===cookie.name+'='+cookie.value);
        });
        result.status=proof.status;
        result.state=await check.observe(phase);
        if(!['changed','unchanged','unknown'].includes(result.state))result.state='unknown';
        result.complete=proof.complete&&!incomplete;
        return {...result,outcome:crossSiteOutcome(result)};
      }
      await context.route('**/*',async route=>{
        try{
          const request=route.request();
          if(request.url()===origin+path&&request.method()==='GET'){
            const enctype=image?' enctype="multipart/form-data"':'';
            const upload=image?'<input type="file" name="'+image.field+'">':'';
            await route.fulfill({contentType:'text/html',body:'<!doctype html><form method="'+wireMethod.toLowerCase()+'"'+enctype+' action="'+escape(action.href)+'">'+entries.map(([name,value])=>'<input type="hidden" name="'+escape(name)+'" value="'+escape(value)+'">').join('')+upload+'<button>Submit</button></form>'});return;
          }
          if(posted||!matchesAction(request.url())||request.method()!==wireMethod){incomplete=true;await route.abort();return;}
          posted=true;const headers=await request.allHeaders(),body=request.postDataBuffer();
          result.originVerified=headers.origin===origin;
          result.initiatorVerified=wireMethod==='POST'?result.originVerified:verifyNavigationInitiator(headers,origin,phase!=='same-site',request.isNavigationRequest()&&request.frame().url()===origin+path);
          result.cookieSent=(headers.cookie??'').split(';').some(part=>part.trim()===cookie.name+'='+cookie.value);
          if(wireMethod==='POST'?(!body||body.length>65536):Boolean(body?.length)){incomplete=true;await route.abort();return;}
          if(image&&(!/^multipart\/form-data;\s*boundary=/i.test(headers['content-type']??'')||!body?.includes(image.bytes))){incomplete=true;await route.abort();return;}
          const response=await transfer(action,wireMethod,headers,body,network.signal,bytes=>{if(bytes>2*1024*1024)throw Error('Cross-site response exceeds budget');});
          result.status=response.status;
          // The real request reached the app. Never follow its response redirect
          // or retain its body, Location, Set-Cookie or other private headers.
          await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><p>Local probe complete</p>'});
        }catch{incomplete=true;await route.abort().catch(()=>{});}
      });
      const page=await context.newPage();page.setDefaultTimeout(3000);
      await page.goto(origin+path,{waitUntil:'load',timeout:5000});
      if(image)await page.locator('input[type="file"]').setInputFiles({name:'vylnt-fixture.png',mimeType:'image/png',buffer:image.bytes});
      await Promise.all([page.waitForURL(url=>matchesAction(url.href),{timeout:6000}),page.locator('button').click()]);
      result.state=await check.observe(phase);
      if(!['changed','unchanged','unknown'].includes(result.state))result.state='unknown';
      result.complete=posted&&!incomplete&&context.pages().length===1&&page.frames().length===1&&matchesAction(page.url());
      return {...result,outcome:crossSiteOutcome(result)};
    })()]);}catch(error){if(combined.aborted)throw error;return {...result,complete:false,state:'unknown',outcome:'unknown'};}
    finally{clearTimeout(timer);combined.removeEventListener('abort',stop);network.abort();await context.close().catch(()=>{});}
  }
  try{
    const controls={sameSite:await run('same-site'),crossSite:await run('cross-site'),anonymous:await run('anonymous'),repeated:await run('repeated')};
    const result={version:'vylnt-cross-site-v3',scanId:report.scanId,originalScanHash:await contentHash(report),checkIdentity:check.identityHash,routeHash:await contentHash(action.pathname),wireMethod,effectiveMethod,controls,
      ...(image?{formEncoding:'multipart/form-data' as const}:{}),...(check.json?{requestEncoding:'application/json' as const}:{}),routeCoverage:'partial',
      scope:check.json?'One disposable credentialed JSON operation with independently scoped state readback.':
        'One disposable form operation with independently scoped state readback. No cross-site necessity, complete CSRF enforcement or model qualification inferred.'};
    const signed={...result,witnessHash:await contentHash(result)};
    const targets=report.findings.filter(f=>f.ruleId==='CK-003'&&f.evidence.cookieName===check.cookieName);
    if(targets.length===1&&cookie.secure&&cookie.sameSite==='None')issuedMutations.set(signed,{receipt:canonicalJson(signed),findingId:targets[0].id});
    return signed;
  }finally{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}
}

/** One reproducible cross-site write establishes a failed protection on that operation. */
export function mergeCrossSiteMutation(evidence:ProjectEvidence,measurement:Awaited<ReturnType<typeof measureCrossSite>>){
  const receipt=issuedMutations.get(measurement);
  if(!receipt||receipt.receipt!==canonicalJson(measurement)||measurement.scanId!==evidence.scanId||
    measurement.originalScanHash!==evidence.originalScanHash||measurement.checkIdentity!==evidence.adapterHash)throw Error('Cross-site receipt is missing or differs from this run');
  const updated=structuredClone(evidence),target=updated.targets.find(t=>t.category==='CK-003'&&t.findingId===receipt.findingId);
  if(!target)throw Error('Cross-site target differs');
  const {sameSite,crossSite,repeated,anonymous}=measurement.controls;
  const changed=[sameSite,crossSite,repeated].every(p=>p.complete&&p.originVerified&&p.initiatorVerified&&p.outcome==='changed-with-cookie');
  if(measurement.wireMethod==='POST'&&measurement.effectiveMethod==='POST'&&changed&&anonymous.complete&&anonymous.initiatorVerified&&!anonymous.cookieSent&&anonymous.state==='unchanged'
    &&(!measurement.requestEncoding||anonymous.status===401||anonymous.status===403)
    &&target.facts.cookieAuthDependency?.value===true&&target.facts.cookieAuthDependency.coverage==='complete'){
    if(target.facts.csrfChecksPassed)throw Error('Cross-site fact already exists');
    target.facts.csrfChecksPassed={source:'functional',value:false,coverage:'complete',witnessHash:measurement.witnessHash};
  }
  return projectEvidenceSchema.parse(updated);
}

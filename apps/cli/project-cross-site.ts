import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { BrowserContext } from 'playwright';
import type { Report } from '../../packages/core';
import { contentHash } from '../../packages/core/integrity';
import { transfer } from './project-loopback-transport';

export type CrossSitePhase='same-site'|'cross-site'|'anonymous'|'repeated';
export interface NativeCrossSiteCheck {
  identityHash:string;path:string;cookieName:string;
  wireMethod?:'POST'|'GET';
  /** Reviewed form override for POST, or the explicitly declared GET operation. */
  effectiveMethod?:'POST'|'PUT'|'DELETE'|'GET';
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
/** Diagnostic native-route probe only. Does not assert cookie necessity, route
 * coverage, application purpose or a qualified model decision. */
export async function measureCrossSite(source:BrowserContext,report:Report,check:NativeCrossSiteCheck,signal?:AbortSignal){
  const target=new URL(report.observation.url),action=new URL(check.path,target.origin);
  if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.username||target.password||!check.path.startsWith('/')||check.path.startsWith('//')||action.username||action.password||action.origin!==target.origin||action.href!==target.origin+action.pathname)throw Error('Cross-site probe requires explicit 127.0.0.1 HTTP route');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash)||!check.cookieName||check.cookieName.length>256)throw Error('Invalid native cross-site identity');
  const wireMethod=check.wireMethod??'POST',effectiveMethod=check.effectiveMethod??wireMethod;
  if(!['GET','POST'].includes(wireMethod)||(wireMethod==='GET'&&effectiveMethod!=='GET')||(wireMethod==='POST'&&effectiveMethod==='GET'))throw Error('Mismatched declared wire method');
  const matchesAction=(raw:string)=>{try{const url=new URL(raw);return url.origin===action.origin&&url.pathname===action.pathname&&!url.search&&!url.hash&&!url.username&&!url.password;}catch{return false;}};
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(60000)]);combined.throwIfAborted();
  const cookies=await source.cookies(action.href),matches=cookies.filter(c=>c.name===check.cookieName);
  const observed=report.observation.cookies?.filter(c=>c.name===check.cookieName);
  if(cookies.length>100||matches.length!==1||observed?.length!==1||matches[0].partitionKey)throw Error('Cross-site cookie matching is incomplete');
  const cookie=matches[0],meta=observed[0],sameSite=cookie.sameSite==='None'?'no_restriction':cookie.sameSite==='Strict'?'strict':'lax';
  if(meta.secure!==cookie.secure||meta.httpOnly!==cookie.httpOnly||meta.sameSite!==sameSite||meta.session!==(cookie.expires===-1))throw Error('Cross-site cookie metadata changed');
  const server=createServer((_request,response)=>{response.writeHead(404);response.end();});
  await new Promise<void>((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.2',done);});
  const foreign='http://127.0.0.2:'+(server.address() as {port:number}).port,path='/__vylnt_form_'+randomUUID();
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
      await context.route('**/*',async route=>{
        try{
          const request=route.request();
          if(request.url()===origin+path&&request.method()==='GET'){
            await route.fulfill({contentType:'text/html',body:'<!doctype html><form method="'+wireMethod.toLowerCase()+'" action="'+escape(action.href)+'">'+entries.map(([name,value])=>'<input type="hidden" name="'+escape(name)+'" value="'+escape(value)+'">').join('')+'<button>Submit</button></form>'});return;
          }
          if(posted||!matchesAction(request.url())||request.method()!==wireMethod){incomplete=true;await route.abort();return;}
          posted=true;const headers=await request.allHeaders(),body=request.postDataBuffer();
          result.originVerified=headers.origin===origin;
          result.initiatorVerified=wireMethod==='POST'?result.originVerified:verifyNavigationInitiator(headers,origin,phase!=='same-site',request.isNavigationRequest()&&request.frame().url()===origin+path);
          result.cookieSent=(headers.cookie??'').split(';').some(part=>part.trim()===cookie.name+'='+cookie.value);
          if(wireMethod==='POST'?(!body||body.length>65536):Boolean(body?.length)){incomplete=true;await route.abort();return;}
          const response=await transfer(action,wireMethod,headers,body,network.signal,bytes=>{if(bytes>2*1024*1024)throw Error('Cross-site response exceeds budget');});
          result.status=response.status;
          // The real request reached the app. Never follow its response redirect
          // or retain its body, Location, Set-Cookie or other private headers.
          await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><p>Local probe complete</p>'});
        }catch{incomplete=true;await route.abort().catch(()=>{});}
      });
      const page=await context.newPage();page.setDefaultTimeout(3000);
      await page.goto(origin+path,{waitUntil:'load',timeout:5000});
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
      routeCoverage:'partial',scope:'One disposable form operation with independently scoped state readback. No cross-site necessity, complete CSRF enforcement or model qualification inferred.'};
    return {...result,witnessHash:await contentHash(result)};
  }finally{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}
}

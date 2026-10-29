import type { BrowserContext,Frame,Page } from 'playwright';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setMaxListeners } from 'node:events';
import { securityHeaders,type Report } from '../../packages/core';
import { canonicalJson,contentHash } from '../../packages/core/integrity';
import { transfer } from './project-loopback-transport';

export interface NativeFrameCheck {identityHash:string;prepare?(page:Page):Promise<void>;check(frame:Frame):Promise<boolean>}
export type FrameOutcome='embedded'|'csp-blocked'|'unknown';
export interface FramingMeasurement {
  version:'vylnt-framing-v1';scanId:string;originalScanHash:string;checkIdentity:string;
  sameOrigin:FrameOutcome;crossOrigin:FrameOutcome;repeatedCrossOrigin:FrameOutcome;
  coverage:'complete'|'partial';witnessHash:string;
}
/** A bounded browser observation, not an embedding-purpose or sensitivity label.
 * Parent documents are synthetic; the target response/policy is never replaced. */
export async function measureFraming(source:BrowserContext,report:Report,check:NativeFrameCheck,signal?:AbortSignal):Promise<FramingMeasurement>{
  const target=new URL(report.observation.url);
  if(target.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(target.hostname)||target.username||target.password)throw Error('Framing checks require plain HTTP loopback');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Framing check identity is required');
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(45000)]);combined.throwIfAborted();
  const server=createServer((_request,response)=>{response.writeHead(404);response.end();});
  await new Promise<void>((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
  const other='http://127.0.0.1:'+(server.address() as {port:number}).port;
  const path='/__vylnt_parent_'+randomUUID();
  async function run(parentOrigin:string):Promise<FrameOutcome>{
    combined.throwIfAborted();const browser=source.browser();if(!browser)return 'unknown';
    const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
    const network=new AbortController();setMaxListeners(82,network.signal);
    let requests=0,bytes=0,incomplete=false,matchingResponse=false,blocked=false;
    let rejectBound:(error:Error)=>void=()=>{};
    const bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
    const stop=()=>{rejectBound(Error('Framing check interrupted'));network.abort();void context.close().catch(()=>{});};
    combined.addEventListener('abort',stop);const timer=setTimeout(stop,12000);
    try{return await Promise.race([bound,(async()=>{
      const cookies=await source.cookies(report.observation.url);if(cookies.length>100)return 'unknown';
      await context.addCookies(cookies);
      await context.routeWebSocket('**/*',socket=>{incomplete=true;socket.close();});
      await context.route('**/*',async route=>{
        try{
          const request=route.request(),url=new URL(request.url());
          if(++requests>80){incomplete=true;await route.abort();return;}
          if(url.href===parentOrigin+path){await route.fulfill({contentType:'text/html',body:'<!doctype html><iframe src="'+report.observation.url.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"></iframe>'});return;}
          if(url.origin!==target.origin||url.username||url.password||['worker','serviceworker'].includes(request.resourceType())){incomplete=true;await route.abort();return;}
          const body=request.postDataBuffer();if(body&&body.length>65536){incomplete=true;await route.abort();return;}
          const response=await transfer(url,request.method(),await request.allHeaders(),body,network.signal,size=>{bytes+=size;if(bytes>8*1024*1024)throw Error('Framing response budget exceeded');});
          if(response.status>=300&&response.status<400){incomplete=true;await route.abort();return;}
          if(request.isNavigationRequest()){
            if(url.href!==report.observation.url||matchingResponse){incomplete=true;await route.abort();return;}
            const headers=Object.entries(response.headers).map(([name,value])=>({name,value}));
            matchingResponse=response.status>=200&&response.status<300&&canonicalJson(securityHeaders(headers))===canonicalJson(report.observation.headers??{});
          }
          for(const header of ['content-length','transfer-encoding'])delete response.headers[header];
          await route.fulfill({status:response.status,headers:response.headers,body:response.body});
        }catch{incomplete=true;await route.abort().catch(()=>{});}
      });
      const page=await context.newPage(),session=await context.newCDPSession(page);
      session.on('Audits.issueAdded',({issue})=>{
        const detail=issue.details.contentSecurityPolicyIssueDetails;
        if(detail&&detail.isReportOnly===false&&/^frame-ancestors(?:\s|$)/.test(detail.violatedDirective))blocked=true;
      });
      await session.send('Audits.enable');page.setDefaultTimeout(2000);
      if(check.prepare)await check.prepare(page);
      page.on('worker',()=>{incomplete=true;});
      await page.goto(parentOrigin+path,{waitUntil:'load',timeout:6000});
      await page.waitForTimeout(250);
      const frames=page.frames().filter(frame=>frame!==page.mainFrame());
      if(frames.length!==1||context.pages().length!==1||page.url()!==parentOrigin+path||!matchingResponse||incomplete)return 'unknown';
      const frame=frames[0];
      const embedded=frame.url()===report.observation.url&&await frame.evaluate(()=>location.href).catch(()=>null)===report.observation.url;
      if(embedded){if(blocked||!await check.check(frame))return 'unknown';return 'embedded';}
      return blocked?'csp-blocked':'unknown';
    })()]);}catch(error){if(combined.aborted)throw error;return 'unknown';}
    finally{clearTimeout(timer);combined.removeEventListener('abort',stop);network.abort();await context.close().catch(()=>{});}
  }
  try{
    const sameOrigin=await run(target.origin),crossOrigin=await run(other),repeatedCrossOrigin=await run(other);
    const coverage=[sameOrigin,crossOrigin,repeatedCrossOrigin].includes('unknown')||crossOrigin!==repeatedCrossOrigin?'partial':'complete';
    const result={version:'vylnt-framing-v1' as const,scanId:report.scanId,originalScanHash:await contentHash(report),checkIdentity:check.identityHash,sameOrigin,crossOrigin,repeatedCrossOrigin,coverage:coverage as 'complete'|'partial'};
    return {...result,witnessHash:await contentHash(result)};
  }finally{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}
}

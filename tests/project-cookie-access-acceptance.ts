import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir,writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { scanProjectPage } from '../apps/cli/project-scanner';
import { measureCookieJavaScriptAccess,mergeCookieAccess,type CookieAccessMeasurement,type NativeCookieAccessCheck } from '../apps/cli/project-cookie-access';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { contentHash } from '../packages/core/integrity';

// Intervention mechanism fixtures only. These are not independent application
// families, training examples, category labels or a qualification evaluation.
const cookieValue='private-cookie-access-sentinel';let externalRequests=0;
const outside=createServer((_req,res)=>{externalRequests++;res.end('outside');});
outside.on('upgrade',(_req,socket)=>{externalRequests++;socket.destroy();});
await new Promise<void>(done=>outside.listen(0,'127.0.0.1',done));
const outsideOrigin='http://127.0.0.1:'+(outside.address() as {port:number}).port;
const server=createServer((req,res)=>{
  const path=new URL(req.url!,'http://localhost').pathname;
  if(path==='/seed'){res.setHeader('set-cookie',[`session_demo=${cookieValue}; Path=/`,'unrelated=private-unrelated-cookie; Path=/']);res.end('seed');return;}
  if(path==='/frame'){res.end('<p>frame</p>');return;}
  if(path==='/redirect'){res.writeHead(302,{location:outsideOrigin});res.end();return;}
  if(path==='/oversize'){res.end(Buffer.alloc(2*1024*1024+1));return;}
  const authenticated=(req.headers.cookie??'').split(';').some(part=>part.trim()==='session_demo='+cookieValue);
  // Refresh on every phase: the intervention must remain in force when the
  // server tries to reissue a JavaScript-readable cookie. Keep both headers.
  res.setHeader('set-cookie',[`session_demo=${cookieValue}; Path=/`,'unrelated=private-unrelated-cookie; Path=/']);
  res.setHeader('content-type','text/html');
  if(path==='/refresh-escape')res.setHeader('refresh','0;url='+outsideOrigin);
  res.end(`<!doctype html><html data-auth="${authenticated?'authenticated':'anonymous'}"><body><output id="result"></output><script>
    (async()=>{
      const mode=${JSON.stringify(path)},out=document.querySelector('#result');
      let readable=false;
      if(mode==='/store'&&'cookieStore' in window)readable=Boolean(await cookieStore.get('session_demo'));
      else if(mode==='/required'||mode==='/incidental')readable=document.cookie.split(';').some(c=>c.trim().startsWith('session_demo='));
      if(mode==='/tamper')Object.defineProperty(Document.prototype,'cookie',{configurable:true,get(){return '';},set(){}});
      if(mode==='/write')document.cookie='session_demo=${cookieValue}; Path=/';
      if(mode==='/frame-flow'){const frame=document.createElement('iframe');frame.src='/frame';document.body.append(frame);}
      if(mode==='/navigate')history.replaceState(null,'','/after-navigation');
      if(mode==='/client-escape')location.assign(${JSON.stringify(outsideOrigin)});
      if(mode==='/websocket')new WebSocket(${JSON.stringify(outsideOrigin.replace('http:','ws:'))});
      if(mode==='/shared-worker'){try{new SharedWorker('/frame');}catch{}}
      out.dataset.status=mode==='/error'?'unknown':mode==='/store'&&!('cookieStore' in window)?'unknown':(mode==='/required'||mode==='/store')&&!readable?'failed':'passed';
    })();
  </script></body></html>`);
});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+(server.address() as {port:number}).port,channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
try{
  const results:Record<string,unknown>={};
  for(const [path,required,observed] of [ ['/required',true,true],['/incidental',false,true],['/none',false,false],['/store',true,true],['/error',undefined,undefined],['/tamper',undefined,undefined],['/write',undefined,undefined],['/frame-flow',undefined,undefined],['/navigate',undefined,undefined],['/websocket',undefined,undefined],['/shared-worker',undefined,undefined] ] as const){
    let measured:CookieAccessMeasurement|undefined;
    const check:NativeCookieAccessCheck={identityHash:'a'.repeat(64),check:async page=>{
      await page.goto(origin+path);await page.locator('#result[data-status]').waitFor({state:'attached'});
      const authentication=await page.locator('html').getAttribute('data-auth'),functionality=await page.locator('#result').getAttribute('data-status');
      return {authentication:authentication==='authenticated'?'authenticated':'anonymous',functionality:functionality==='passed'?'passed':functionality==='failed'?'failed':'unknown',extraPrivate:'private-callback-output'};
    }};
    const {report}=await scanProjectPage(origin+path,{allowedLocalOrigins:[origin],channel,hooks:{prepare:async page=>{await page.goto(origin+'/seed');},collected:async(_page,context,r)=>{
      const before=await context.cookies();measured=await measureCookieJavaScriptAccess(context,r,check);
      assert.deepEqual(await context.cookies(),before,'Interventions must leave the original browser cookie state unchanged');
    }}});
    assert.ok(measured);assert.equal(measured.originalScanHash,await contentHash(report));
    if(required===undefined)assert.equal(measured.targets.length,0,path);
    else{assert.ok(measured.targets.length>0,path+' '+JSON.stringify(measured.checks.map(({baseline,restricted,restored})=>({baseline,restricted,restored}))));assert.ok(measured.targets.every(t=>t.facts.cookieJsAccessRequired.value===required&&t.facts.cookieJsAccessObserved.value===observed),path);}
    const serialized=JSON.stringify(measured);assert.ok(!serialized.includes(cookieValue)&&!serialized.includes('private-unrelated-cookie')&&!serialized.includes('private-callback-output'));
    const evidence=await collectResponseFacts(report,{runId:randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
    assert.doesNotThrow(()=>mergeCookieAccess(evidence,measured!));
    results[path]={required:required??'unknown',observed:observed??'unknown',linkedFindings:measured.targets.length};
  }
  const browser=await chromium.launch({channel});
  try{
    const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/seed');
    const {report}=await scanProjectPage(origin+'/none',{allowedLocalOrigins:[origin],channel,hooks:{prepare:async p=>{await p.goto(origin+'/seed');}}});
    const controller=new AbortController();
    await assert.rejects(measureCookieJavaScriptAccess(context,report,{identityHash:'a'.repeat(64),check:async()=>{controller.abort();return new Promise(()=>{});}},controller.signal));
    for(const route of ['/redirect','/client-escape','/refresh-escape','/oversize']){
      const redirected=await measureCookieJavaScriptAccess(context,report,{identityHash:'a'.repeat(64),check:async p=>{await p.goto(origin+route);return {authentication:'authenticated',functionality:'passed'};}});
      assert.equal(redirected.targets.length,0);
    }
    assert.equal(externalRequests,0,'Disallowed local origins must never be contacted');
    await context.close();
  }finally{await browser.close();}
  await mkdir('test-results/cookie-access',{recursive:true});await writeFile(`test-results/cookie-access/${channel}.json`,JSON.stringify({passed:true,channel,results,externalRequests,scope:'Mechanism fixtures only; no model evaluated or category qualified.'},null,2));
  console.log(`Cookie JavaScript access acceptance passed (${channel}).`);
}finally{for(const service of [server,outside]){service.closeAllConnections();await new Promise<void>(done=>service.close(()=>done()));}}

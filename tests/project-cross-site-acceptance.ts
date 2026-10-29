import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir,writeFile } from 'node:fs/promises';
import { scanProjectPage } from '../apps/cli/project-scanner';
import { measureCrossSite } from '../apps/cli/project-cross-site';
import { canonicalJson } from '../packages/core/integrity';
let mutations=0,origin='';
const token='private-test-csrf-token',value='private-test-cookie-value';
const server=createServer(async(request,response)=>{
  const path=new URL(request.url!,'http://localhost').pathname;
  if(path==='/get-change'){
    if(request.method!=='GET'){response.writeHead(405);response.end();return;}
    if(!(request.headers.cookie??'').includes('session='+value)){response.writeHead(401);response.end();return;}
    mutations++;response.writeHead(302,{location:'https://example.invalid/never-follow'});response.end();return;
  }
  if(request.method==='POST'){
    let body='';for await(const chunk of request)body+=chunk.toString();
    const auth=(request.headers.cookie??'').split(';').some(part=>part.trim()==='session='+value);
    if(path==='/error'){response.writeHead(500);response.end();return;}
    if(!auth){response.writeHead(401);response.end();return;}
    if(path==='/protected'&&(request.headers.origin!==origin||new URLSearchParams(body).get('token')!==token)){response.writeHead(403);response.end();return;}
    mutations++;response.writeHead(302,{location:'https://example.invalid/private-query?token=do-not-store'});response.end();return;
  }
  response.setHeader('Content-Type','text/html');response.setHeader('Set-Cookie','session='+value+'; Path=/; HttpOnly; '+(path==='/lax'?'SameSite=Lax':'SameSite=None; Secure'));
  response.end('<!doctype html><p>Private native content</p>');
});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
try{
  const results:Record<string,unknown>={};
  for(const path of ['/open','/protected','/lax','/error']){
    await scanProjectPage(origin+path,{allowedLocalOrigins:[origin],channel,hooks:{collected:async(_page,context,report)=>{
      const original=canonicalJson(await context.cookies());let before=0;
      const check={identityHash:'a'.repeat(64),path,cookieName:'session',prepare:async(phase:import('../apps/cli/project-cross-site').CrossSitePhase)=>{before=mutations;return {value:'synthetic-write',token:phase==='same-site'?token:''};},observe:async()=>mutations>before?'changed' as const:'unchanged' as const};
      const result=await measureCrossSite(context,report,check);
      if(path==='/open'){
        assert.equal(result.controls.sameSite.outcome,'changed-with-cookie',JSON.stringify(result));
        assert.equal(result.controls.crossSite.outcome,'changed-with-cookie',JSON.stringify(result));
        assert.equal(result.controls.repeated.outcome,'changed-with-cookie');
        assert.equal(result.controls.anonymous.cookieSent,false);assert.equal(result.controls.anonymous.state,'unchanged');
        const writesBeforeMismatch=mutations;
        const mismatch=await measureCrossSite(context,report,{...check,effectiveMethod:'DELETE',prepare:async()=>({_method:'PUT'})});
        assert.ok(Object.values(mismatch.controls).every(control=>!control.complete&&control.outcome==='unknown'));
        assert.equal(mutations,writesBeforeMismatch,'An undeclared override must never reach the application');
        const abort=new AbortController();await assert.rejects(measureCrossSite(context,report,{...check,prepare:async phase=>{abort.abort();return check.prepare(phase);}},abort.signal));
      }
      if(path==='/protected'){assert.equal(result.controls.sameSite.outcome,'changed-with-cookie');assert.equal(result.controls.crossSite.outcome,'explicit-denial',JSON.stringify(result));assert.equal(result.controls.repeated.outcome,'explicit-denial');}
      if(path==='/lax'){assert.equal(result.controls.sameSite.outcome,'changed-with-cookie');assert.equal(result.controls.crossSite.cookieSent,false);assert.equal(result.controls.crossSite.outcome,'unknown');}
      if(path==='/lax'){
        const get=await measureCrossSite(context,report,{...check,path:'/get-change',wireMethod:'GET',effectiveMethod:'GET',prepare:async()=>{before=mutations;return {};}});
        assert.equal(get.controls.crossSite.outcome,'changed-with-cookie',JSON.stringify(get));assert.equal(get.controls.repeated.outcome,'changed-with-cookie');
        assert.equal(get.controls.crossSite.originVerified,false);assert.equal(get.controls.crossSite.initiatorVerified,true);
        assert.equal(get.wireMethod,'GET');assert.equal(get.controls.sameSite.outcome,'changed-with-cookie');
        assert.equal(get.controls.anonymous.cookieSent,false);assert.equal(get.controls.anonymous.state,'unchanged');
        for(const privateValue of [token,value,'Private native content','synthetic-write','do-not-store','/get-change'])assert.ok(!JSON.stringify(get).includes(privateValue));
        const beforeRejectedGet=mutations;
        const rejectedGet=await measureCrossSite(context,report,{...check,path:'/get-change',wireMethod:'GET',effectiveMethod:'GET',prepare:async()=>({token})});
        assert.ok(Object.values(rejectedGet.controls).every(control=>!control.complete&&control.outcome==='unknown'));
        assert.equal(mutations,beforeRejectedGet,'GET fields must not reach a query string or the application');
        results.getWithLax=get;
      }
      if(path==='/error')assert.ok(Object.values(result.controls).every(phase=>phase.outcome==='unknown'));
      assert.equal(canonicalJson(await context.cookies()),original);
      for(const privateValue of [token,value,'Private native content','synthetic-write','do-not-store'])assert.ok(!JSON.stringify(result).includes(privateValue));
      assert.equal(result.routeCoverage,'partial');results[path]=result;
    }}});
  }
  await mkdir('test-results/cross-site',{recursive:true});await writeFile(`test-results/cross-site/${channel}.json`,JSON.stringify({passed:true,channel,results,scope:'Mechanism fixtures, not independent families or qualification. HTTP loopback is not TLS validation.'},null,2));
  console.log(`Cross-site mutation/denial acceptance passed (${channel}).`);
}finally{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}

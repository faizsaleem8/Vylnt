import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir,writeFile } from 'node:fs/promises';
import { scanProjectPage } from '../apps/cli/project-scanner';
import { measureScriptFunction,mergeScriptFunction,type ScriptMeasurement } from '../apps/cli/project-script-function';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { contentHash,canonicalJson } from '../packages/core/integrity';
import {createHash} from 'node:crypto';
import {measureFraming} from '../apps/cli/project-framing';
let redirectScript=false,externalRequests=0,metaDrift=false;
const nonce='QUFBQUFBQUFBQUFBQUFBQQ==';
const appScript="document.querySelector('#run').addEventListener('click',()=>{const m=document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]');if(location.pathname==='/meta-rewrite'&&m)m.setAttribute('content',\"script-src 'self'; img-src 'none'\");if(location.pathname==='/meta-remove-readd'&&m){m.remove();document.head.prepend(m);}if(location.pathname==='/meta-viewport'){const v=document.createElement('meta');v.name='viewport';v.content='width=device-width';document.head.append(v);}document.querySelector('#result').textContent='1';});";
const appHash=createHash('sha256').update(appScript).digest('base64');
const external=createServer((_request,response)=>{externalRequests++;response.end('unrelated');});
await new Promise<void>(done=>external.listen(0,'127.0.0.1',done));
const externalOrigin='http://127.0.0.1:'+(external.address() as {port:number}).port;
const server=createServer((request,response)=>{
  const path=new URL(request.url!,'http://localhost').pathname;
  if(path==='/failed-image'){response.writeHead(404);response.end();return;}
  if(path==='/delayed-app.js'){response.setHeader('Content-Type','text/javascript');setTimeout(()=>response.end(appScript),150);return;}
  if(path==='/scoped'&&!(request.headers.cookie??'').includes('scoped_session=private-cookie-value')){response.writeHead(401);response.end();return;}
  if(path==='/app.js'){
    if(redirectScript){response.writeHead(302,{location:externalOrigin+'/outside'});response.end();return;}
    response.setHeader('Content-Type','text/javascript');response.end(appScript);return;
  }
  if(path==='/redirect'){response.writeHead(302,{location:'https://example.invalid/'});response.end();return;}
  if(path==='/restricted')response.setHeader('Content-Security-Policy',"script-src 'self'");
  if(path==='/broken')response.setHeader('Content-Security-Policy',"script-src 'none'");
  if(path==='/report-only')response.setHeader('Content-Security-Policy-Report-Only',"script-src 'none'");
  if(path==='/trusted-types')response.setHeader('Content-Security-Policy',"require-trusted-types-for 'script'");
  if(path==='/meta-combined')response.setHeader('Content-Security-Policy',"script-src * 'unsafe-inline'");
  if(path==='/meta-header-strict')response.setHeader('Content-Security-Policy',"script-src * 'unsafe-inline', script-src 'self'");
  if(path==='/meta-response-unsupported')response.setHeader('Content-Security-Policy',"script-src 'self' https://*.fixture.invalid");
  response.setHeader('Content-Type','text/html');response.setHeader('Set-Cookie','session=private-cookie-value; Path=/');
  if(path.startsWith('/meta-')){
    let policy=path==='/meta-hash'?`script-src 'sha256-${appHash}'`:path==='/meta-nonce'?`script-src 'nonce-${nonce}'`:['/meta-broad','/meta-header-strict'].includes(path)?"script-src 'self' 'unsafe-inline'":path==='/meta-frame'?"frame-ancestors 'none'; script-src 'self'":path==='/meta-unsupported'?"script-src 'self' 'strict-dynamic'":"script-src 'self'";
    if(path==='/meta-early'&&metaDrift)policy+="; img-src 'none'";
    const tag='<meta http-equiv="'+(path==='/meta-report-only'?'Content-Security-Policy-Report-Only':'Content-Security-Policy')+'" content="'+policy+'">';
    const head=path==='/meta-late'?'<script>window.__fixture_started=true;</script>'+tag:path==='/meta-moved'?'<script>const m=document.createElement("meta");m.httpEquiv="Content-Security-Policy";m.content="script-src \'self\'";document.head.prepend(m);</script>':['/meta-body','/meta-inline-event'].includes(path)?'':path==='/meta-many'?tag.repeat(17):tag;
    const script=path==='/meta-hash'?'<script>'+appScript+'</script>':'<script '+(path==='/meta-nonce'?'nonce="'+nonce+'" ':'')+'src="/app.js?private_query=secret"></script>';
    const event=path==='/meta-inline-event'?`<img src="/failed-image" onerror="const m=document.createElement('meta');m.httpEquiv='Content-Security-Policy';m.content=&quot;script-src 'self'&quot;;document.head.prepend(m);this.remove();">`:'';
    response.end('<!doctype html><html><head>'+head+'</head><body><p>private-page-text</p><button id="run">Run</button><output id="result">0</output>'+(path==='/meta-body'?tag:'')+event+(path==='/meta-inline-event'?'<script defer src="/delayed-app.js"></script>':script)+'</body></html>');return;
  }
  response.end('<!doctype html><p>private-page-text</p><button id="run">Run</button><output id="result">0</output><script src="/app.js?private_query=secret"></script>');
});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
const controller=new AbortController(),abort=()=>controller.abort();process.on('SIGINT',abort);process.on('SIGTERM',abort);
try{
  const results:Record<string,unknown>={},identityHash=await contentHash({version:1,scope:'controlled-mechanism-interaction'});
  const check={identityHash,check:async(page:import('playwright').Page)=>{
    await page.locator('#run').click();const result=await page.locator('#result').innerText();return result==='1'?'passed' as const:result==='0'?'failed' as const:'unknown' as const;
  }};
  for(const [path,expected] of Object.entries({'/open':'executed','/restricted':'blocked','/report-only':'executed','/broken':'unknown','/trusted-types':'unknown','/scoped':'executed',
    '/meta-early':'blocked','/meta-hash':'blocked','/meta-nonce':'unknown','/meta-broad':'executed','/meta-frame':'blocked','/meta-combined':'blocked','/meta-header-strict':'blocked','/meta-viewport':'blocked',
    '/meta-late':'unknown','/meta-moved':'unknown','/meta-body':'unknown','/meta-report-only':'unknown','/meta-unsupported':'unknown','/meta-response-unsupported':'unknown','/meta-rewrite':'unknown','/meta-remove-readd':'unknown','/meta-many':'unknown','/meta-inline-event':'unknown'})){
    let measurement:ScriptMeasurement|undefined;
    const {report}=await scanProjectPage(origin+path,{allowedLocalOrigins:[origin],channel,signal:controller.signal,hooks:{prepare:async(_page,context)=>{
      if(path==='/scoped')await context.addCookies([{name:'scoped_session',value:'private-cookie-value',domain:'127.0.0.1',path:'/scoped',httpOnly:true,secure:false,sameSite:'Lax'}]);
    },collected:async(_page,context,scan)=>{
      if(path==='/meta-inline-event'){await _page.locator('#run').click();assert.equal(await _page.locator('#result').innerText(),'1','The late-policy event fixture must retain working application code');}
      const before=canonicalJson(await context.cookies());measurement=await measureScriptFunction(context,scan,check,controller.signal);
      assert.equal(canonicalJson(await context.cookies()),before,'Original cookie state must remain unchanged');
      assert.equal(measurement.status,expected==='unknown'?'needs-review':'verified',path+' '+JSON.stringify(measurement.controls));
      if(expected!=='unknown')assert.equal(measurement.controls.baseline.inline,expected);
      if(path==='/meta-nonce'){assert.equal(measurement.controls.baseline.inline,'blocked');assert.equal(measurement.controls.baseline.metaPolicy?.nonceContext,true);assert.equal(measurement.targets.length,0,'Nonce syntax/blocking cannot establish fresh generation');}
      if(path==='/meta-early'){
        metaDrift=true;try{const changed=await measureScriptFunction(context,scan,check,controller.signal);assert.equal(changed.status,'needs-review','Policy drift cannot reuse original timing proof');}finally{metaDrift=false;}
      }
      if(path==='/meta-frame'){
        const frames=await measureFraming(context,scan,{identityHash,check:async frame=>await frame.locator('#run').count()===1},controller.signal);
        assert.equal(frames.sameOrigin,'embedded');assert.equal(frames.crossOrigin,'embedded','Meta frame-ancestors cannot restrict framing');
      }
      if(path==='/open'){
        const noDependency=await measureScriptFunction(context,scan,{identityHash,check:async()=>'passed'},controller.signal);assert.equal(noDependency.status,'needs-review');
        const unavailable=await measureScriptFunction(context,scan,{identityHash,check:async()=>{throw Error('private callback failure');}},controller.signal);assert.equal(unavailable.status,'needs-review');
        redirectScript=true;
        try{const redirect=await measureScriptFunction(context,scan,check,controller.signal);assert.equal(redirect.status,'needs-review');assert.equal(externalRequests,0,'Redirects must stop before leaving the approved origin');}
        finally{redirectScript=false;}
        let calls=0;const failedRestore=await measureScriptFunction(context,scan,{identityHash,check:async page=>++calls===3?'failed':check.check(page)},controller.signal);assert.equal(failedRestore.status,'needs-review');
        const metadataChanged=await measureScriptFunction(context,scan,{identityHash,check:async page=>{const outcome=await check.check(page);await page.locator('script').evaluate(script=>script.setAttribute('defer',''));return outcome;}},controller.signal);assert.equal(metadataChanged.status,'needs-review');
        const cancelled=new AbortController();await assert.rejects(measureScriptFunction(context,scan,{identityHash,check:async()=>{cancelled.abort();await new Promise<void>(()=>{});return 'unknown';}},cancelled.signal));
      }
    }}});
    assert.ok(measurement);const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:identityHash},false);
    evidence.collectionKind='mechanism-fixture';const merged=mergeScriptFunction(evidence,measurement);
    if(path==='/meta-header-strict'){
      assert.equal(measurement.targets.length,0,'The existing rule already recognizes the restricting response policy');
      assert.deepEqual(mergeScriptFunction(merged,measurement),merged);
    }else if(path.startsWith('/meta-')&&expected!=='unknown'){
      const target=merged.targets.find(t=>t.category==='HDR-003');assert.ok(target);
      assert.equal(target.facts.metaPolicyBeforeScripts?.value,true);assert.equal(target.facts.scriptPolicyEnforced?.value,true);
      assert.equal(target.facts.scriptSourcesRestricted?.value,path!=='/meta-broad');
      assert.equal(target.facts.cspProbeAllowed?.value,true);assert.equal(target.facts.cspProbeBlocked?.value,expected==='blocked');
      assert.deepEqual(mergeScriptFunction(merged,measurement),merged,'Repeated merge must preserve the effective response/meta conjunction');
      assert.equal(merged.targets.find(t=>t.category==='HDR-002')?.facts.frameAncestorsRestricted?.value,false);
      assert.throws(()=>mergeScriptFunction(evidence,JSON.parse(JSON.stringify(measurement))),/receipt/);
      const conflicted=structuredClone(evidence);conflicted.targets.find(t=>t.category==='HDR-003')!.facts.metaPolicyBeforeScripts={value:false,source:'browser',coverage:'complete',witnessHash:'f'.repeat(64)};
      assert.throws(()=>mergeScriptFunction(conflicted,measurement!),/Conflicting/);
    }
    if(path.startsWith('/meta-')&&expected==='unknown')assert.ok(merged.targets.every(t=>t.facts.metaPolicyBeforeScripts===undefined));
    if(path==='/open'||path==='/report-only'){
      assert.equal(merged.targets.find(t=>t.category==='HDR-003')!.facts.cspProbeAllowed!.value,true);
      assert.equal(merged.targets.find(t=>t.category==='HDR-003')!.facts.cspProbeBlocked!.value,false);
      assert.throws(()=>mergeScriptFunction(evidence,JSON.parse(JSON.stringify(measurement))),/receipt/);
      const status=measurement.status;measurement.status='needs-review';assert.throws(()=>mergeScriptFunction(evidence,measurement!),/Unverified/);measurement.status=status;
      assert.equal(measurement.originalScanHash,await contentHash(report));
    }
    const serialized=JSON.stringify({measurement,evidence:merged});
    for(const secret of ['private-cookie-value','private-page-text','private_query','private callback failure',nonce,appScript,appHash])assert.ok(!serialized.includes(secret));
    results[path]={status:measurement.status,controls:measurement.controls,factTargets:measurement.targets.length};
  }
  await mkdir('test-results/script-function',{recursive:true});await writeFile(`test-results/script-function/${channel}.json`,JSON.stringify({passed:true,channel,results,scope:'Mechanism fixtures only. No independent application family, training or qualification.'},null,2));
  console.log(`Script interaction acceptance passed (${channel}).`);
}finally{process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);server.closeAllConnections();external.closeAllConnections();await Promise.all([new Promise<void>(done=>server.close(()=>done())),new Promise<void>(done=>external.close(()=>done()))]);}

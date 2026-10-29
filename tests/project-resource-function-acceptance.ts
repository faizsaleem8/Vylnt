import assert from 'node:assert/strict';
import {createServer as httpServer} from 'node:http';
import {createServer as httpsServer} from 'node:https';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {measureResourceFunction,mergeResourceFunction,correlateResourceTransfers,type ResourceMeasurement} from '../apps/cli/project-resource-function';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {contentHash,canonicalJson} from '../packages/core/integrity';
import {guardProjectAssessment,prepareProjectContexts} from '../packages/core/project-evidence';

// Mechanism fixtures only: local certificate errors are explicitly ignored.
// No TLS-validation/upgrade fact or independent application family is inferred.
const code="document.querySelector('#run').addEventListener('click',()=>{document.querySelector('#result').textContent='1';});";
let mode='',redirect=false,requests=0,outsideRequests=0;
const outside=httpServer((_req,res)=>{outsideRequests++;res.end('outside');});
await new Promise<void>(done=>outside.listen(0,'127.0.0.1',done));
const outsideOrigin='http://127.0.0.1:'+(outside.address() as {port:number}).port;
const resources=httpServer((req,res)=>{
  requests++;
  if(mode==='/failed'){req.socket.destroy();return;}
  if(mode==='/redirect'||redirect){res.writeHead(302,{location:outsideOrigin+'/outside.js'});res.end();return;}
  if(mode==='/not-found'){res.writeHead(404);res.end('not found');return;}
  res.setHeader('Content-Type','text/javascript');res.end(code);
});
await new Promise<void>(done=>resources.listen(0,'127.0.0.1',done));
const resourceOrigin='http://127.0.0.1:'+(resources.address() as {port:number}).port;
const server=httpsServer({key:await readFile('.local/tls/key.pem'),cert:await readFile('.local/tls/cert.pem')},(req,res)=>{
  const path=new URL(req.url!,'https://localhost').pathname;
  if(path==='/blocked')res.setHeader('Content-Security-Policy',"script-src 'none'");
  if(path==='/upgrade-header')res.setHeader('Content-Security-Policy','upgrade-insecure-requests');
  res.setHeader('Content-Type','text/html');
  res.end('<!doctype html><p>private-page-text</p><button id="run">Run</button><output id="result">0</output>'
    +(path==='/no-dependency'?'<script>document.querySelector("#run").onclick=()=>{document.querySelector("#result").textContent="1";};</script>':'')
    +'<script '+(path==='/module'?'type="module" ':'')+'src="'+resourceOrigin+'/app.js?private_query=one"></script>'
    +(path==='/ambiguous'?'<script src="'+resourceOrigin+'/app.js?private_query=two"></script>':''));
});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
const origin='https://127.0.0.1:'+(server.address() as {port:number}).port;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium',controller=new AbortController(),abort=()=>controller.abort();
process.on('SIGINT',abort);process.on('SIGTERM',abort);
try{
  const results:Record<string,unknown>={},identityHash=await contentHash({version:1,scope:'controlled-direct-script-dependency'});
  const check={identityHash,check:async(page:import('playwright').Page)=>{
    await page.locator('#run').click();const result=await page.locator('#result').innerText();return result==='1'?'passed' as const:result==='0'?'failed' as const:'unknown' as const;
  }};
  for(const path of ['/direct','/upgrade-header','/no-dependency','/blocked','/not-found','/failed','/redirect','/ambiguous','/module','/fulfilled']){
    mode=path;let measurement:ResourceMeasurement|undefined;
    const beforeOutside=outsideRequests;
    const {report}=await scanProjectPage(origin+path,{channel,ignoreHTTPSErrors:true,allowedLocalOrigins:[origin,resourceOrigin],signal:controller.signal,hooks:{
      prepare:async(_page,context)=>{await context.addCookies([{name:'private_session',value:'private-cookie-value',domain:'127.0.0.1',path:'/',httpOnly:true,secure:false,sameSite:'Lax'}]);if(path==='/fulfilled')await context.route(/\/app\.js\?/,route=>route.fulfill({contentType:'text/javascript',body:code}));},
      collected:async(page,context,scan)=>{
        const correlation=await correlateResourceTransfers(page,scan);
        assert.equal(correlation.status,'observed');assert.equal(correlation.upgradeVerified,false);assert.equal(correlation.functionVerified,false);
        assert.ok(!JSON.stringify(correlation).includes('private_query'));
        if(path==='/ambiguous')assert.ok(correlation.targets.every(t=>t.correlation==='ambiguous'));
        if(path==='/direct')assert.ok(correlation.targets.some(t=>t.correlation==='http-request'&&t.outcome==='completed'&&t.wireObserved));
        if(path==='/not-found')assert.ok(correlation.targets.some(t=>t.outcome==='http-error'));
        if(path==='/failed')assert.ok(correlation.targets.some(t=>t.outcome==='failed'));
        if(path==='/fulfilled')assert.ok(correlation.targets.every(t=>!t.wireObserved));
        const before=canonicalJson(await context.cookies()),hash=await contentHash(scan);
        measurement=await measureResourceFunction(context,scan,check,controller.signal);
        assert.equal(await contentHash(scan),hash);assert.equal(canonicalJson(await context.cookies()),before,'Original cookies remain unchanged');
        assert.equal(context.browser()!.contexts().length,1,'Replay contexts must close');
        assert.equal(measurement.status,['/direct','/upgrade-header'].includes(path)?'verified':'needs-review',path+' '+JSON.stringify(measurement));
        if(path==='/direct'){
          assert.equal(measurement.sourceFunctionality,'passed');
          const stale=structuredClone(scan);stale.scanId=crypto.randomUUID();assert.equal((await measureResourceFunction(context,stale,check)).status,'needs-review');
          const clone=await context.browser()!.newContext({ignoreHTTPSErrors:true});
          try{await clone.newPage().then(p=>p.goto(scan.observation.url));assert.equal((await measureResourceFunction(clone,scan,check)).status,'needs-review','Same URL is not same-run provenance');}finally{await clone.close();}
          redirect=true;try{assert.equal((await measureResourceFunction(context,scan,check)).status,'needs-review');}finally{redirect=false;}
          let calls=0;assert.equal((await measureResourceFunction(context,scan,{identityHash,check:async p=>++calls===4?'failed':check.check(p)})).status,'needs-review','Failed restoration must stay uncertain');
          assert.equal((await measureResourceFunction(context,scan,{identityHash,check:async()=>{throw Error('private callback failure');}})).status,'needs-review');
          const drift=await measureResourceFunction(context,scan,{identityHash,check:async p=>{const out=await check.check(p);if(p!==page)await p.locator('script[src]').evaluate(s=>s.setAttribute('defer',''));return out;}});assert.equal(drift.status,'needs-review');
          const cancelled=new AbortController();await assert.rejects(measureResourceFunction(context,scan,{identityHash,check:async p=>{if(p!==page){cancelled.abort();await new Promise<void>(()=>{});}return check.check(p);}},cancelled.signal));
          assert.equal(context.browser()!.contexts().length,1,'Cancelled replay contexts must close');
        }
      }
    }});
    assert.ok(measurement);assert.equal(outsideRequests,beforeOutside,'Unapproved redirects cannot reach their target');
    const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:identityHash},false);
    evidence.collectionKind='mechanism-fixture';const merged=mergeResourceFunction(evidence,measurement);
    assert.deepEqual(mergeResourceFunction(merged,measurement),merged);
    if(measurement.status==='verified'){
      const net=merged.targets.filter(t=>t.category==='NET-001');assert.ok(net.length>=1);
      for(const target of net){assert.equal(target.facts.resourceHttpTransferObserved?.value,true);assert.equal(target.facts.resourceTlsUpgradeObserved?.value,false);assert.equal(target.facts.resourceFunctionVerified?.value,true);assert.equal(target.facts.requestChainComplete?.value,true);}
      assert.throws(()=>mergeResourceFunction(evidence,JSON.parse(JSON.stringify(measurement))),/receipt/);
      const conflict=structuredClone(evidence);conflict.targets.find(t=>t.category==='NET-001')!.facts.resourceHttpTransferObserved={value:false,source:'functional',coverage:'complete',witnessHash:'f'.repeat(64)};
      assert.throws(()=>mergeResourceFunction(conflict,measurement!),/Conflicting/);
      merged.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'complete',sourceHashes:[],headerOperations:0,cookieOperations:0,sessionMiddlewareRegistrations:0};
      const context=prepareProjectContexts(report,merged),finding=report.findings.find(f=>f.ruleId==='NET-001')!;
      assert.equal(guardProjectAssessment(context(finding),finding,'contextual'),'needs-review','An HTTP dependency cannot be de-emphasized');
    }else assert.equal(measurement.targets.length,0);
    const serialized=JSON.stringify({measurement,evidence:merged});
    for(const secret of ['private-cookie-value','private-page-text','private_query','private callback failure',code])assert.ok(!serialized.includes(secret));
    results[path]={status:measurement.status,sourceFunctionality:measurement.sourceFunctionality,checks:measurement.checks,factTargets:measurement.targets.length};
  }
  await mkdir('test-results/resource-function',{recursive:true});await writeFile(`test-results/resource-function/${channel}.json`,JSON.stringify({passed:true,channel,requests,results,scope:'Direct HTTP classic-script mechanism fixtures. Local certificate errors ignored; no TLS validation, upgrade proof, training family or qualification.'},null,2));
  console.log(`Resource dependency acceptance passed (${channel}).`);
}finally{process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);for(const s of [server,resources,outside])s.closeAllConnections();await Promise.all([server,resources,outside].map(s=>new Promise<void>(done=>s.close(()=>done()))));}

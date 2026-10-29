import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {measureFramePolicy,mergeFramePolicy,type FramePolicyMeasurement} from '../apps/cli/project-frame-policy';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {contentHash,canonicalJson} from '../packages/core/integrity';
import {prepareProjectContexts,guardProjectAssessment,verifyProjectEvidence} from '../packages/core/project-evidence';
import {ProjectSigner} from '../apps/server/project-signing';

let parentRequests=0,redirect=false,drift=false;
const parent=createServer((_req,res)=>{parentRequests++;res.end('unrelated service');});
await new Promise<void>(done=>parent.listen(0,'127.0.0.1',done));
const allowed='http://127.0.0.1:'+(parent.address() as {port:number}).port;
const server=createServer((req,res)=>{
  const path=new URL(req.url!,'http://localhost').pathname;
  if(redirect){res.writeHead(302,{location:allowed+'/outside'});res.end();return;}
  const normal=`frame-ancestors ${allowed}`;
  if(path==='/own-origin')res.setHeader('Content-Security-Policy',`frame-ancestors http://${req.headers.host}`);
  const policies:Record<string,string|string[]>={'/allow':normal,'/xfo':normal,'/none':"frame-ancestors 'none'",'/self':"frame-ancestors 'self'",'/multiple':[normal,`frame-ancestors 'self' ${allowed}`],'/intersection':[normal,"frame-ancestors 'self'"],'/duplicate':normal+`; frame-ancestors *`,'/wildcard':'frame-ancestors *','/broken':normal};
  if(path==='/report-only')res.setHeader('Content-Security-Policy-Report-Only',normal);
  if(policies[path])res.setHeader('Content-Security-Policy',drift?"frame-ancestors 'none'":policies[path]);
  if(path==='/xfo')res.setHeader('X-Frame-Options','DENY');
  if(path==='/broken'){res.writeHead(503);res.end('unavailable');return;}
  res.setHeader('Content-Type','text/html');res.setHeader('Set-Cookie','session=private-cookie-value; Path=/');
  res.end('<!doctype html><html><head>'+(path==='/meta'?'<meta http-equiv="Content-Security-Policy" content="'+normal+'">':'')+'</head><body><p>Private page text</p><button id="operation">Ready</button></body></html>');
});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+(server.address() as {port:number}).port,channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
const abort=new AbortController(),stop=()=>abort.abort();process.on('SIGINT',stop);process.on('SIGTERM',stop);
const root=await mkdtemp(resolve('.local/frame-policy-signing-'));
try{
  const results:Record<string,unknown>={},identityHash=await contentHash({version:1,scope:'controlled-frame-policy/http-loopback'}),signer=await ProjectSigner.open(root);
  const check={identityHash,check:async(frame:import('playwright').Frame)=>await frame.locator('#operation').count()===1};
  for(const path of ['/allow','/own-origin','/multiple','/duplicate','/xfo','/none','/self','/intersection','/open','/report-only','/meta','/wildcard']){
    let measurement:FramePolicyMeasurement|undefined;
    const {report}=await scanProjectPage(origin+path,{channel,allowedLocalOrigins:[origin],signal:abort.signal,hooks:{collected:async(page,context,scan)=>{
      const before=canonicalJson(await context.cookies());measurement=await measureFramePolicy(context,scan,check,abort.signal);
      assert.equal(canonicalJson(await context.cookies()),before);assert.equal(context.browser()!.contexts().length,1,'All replay contexts must close');
      assert.equal(measurement.status,['/open','/report-only','/meta','/wildcard'].includes(path)?'needs-review':'verified',path+' '+JSON.stringify(measurement));
      if(path==='/allow'){
        const stale=structuredClone(scan);stale.scanId=crypto.randomUUID();assert.equal((await measureFramePolicy(context,stale,check)).status,'needs-review');
        const clone=await context.browser()!.newContext();try{await clone.newPage().then(p=>p.goto(scan.observation.url));assert.equal((await measureFramePolicy(clone,scan,check)).status,'needs-review');}finally{await clone.close();}
        assert.equal((await measureFramePolicy(context,scan,{identityHash,check:async()=>false})).status,'needs-review');
        redirect=true;try{assert.equal((await measureFramePolicy(context,scan,check)).status,'needs-review');}finally{redirect=false;}
        drift=true;try{assert.equal((await measureFramePolicy(context,scan,check)).status,'needs-review');}finally{drift=false;}
        const cancelled=new AbortController();await assert.rejects(measureFramePolicy(context,scan,{identityHash,check:async frame=>{if(frame!==page.mainFrame()){cancelled.abort();await new Promise<void>(()=>{});}return true;}},cancelled.signal));
        assert.equal(context.browser()!.contexts().length,1,'Cancellation must await context cleanup');
        await page.evaluate(()=>{history.replaceState(null,'','?private_query=changed');history.replaceState(null,'',location.pathname);});
        assert.equal((await measureFramePolicy(context,scan,check)).status,'needs-review','Restored URL cannot repair invalidated source provenance');
      }
    }}});
    assert.ok(measurement);assert.equal(measurement.originalScanHash,await contentHash(report));
    const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:identityHash},false);
    evidence.collectionKind='mechanism-fixture';const merged=mergeFramePolicy(evidence,measurement);
    assert.deepEqual(mergeFramePolicy(merged,measurement),merged);
    if(measurement.status==='verified'){
      assert.throws(()=>mergeFramePolicy(evidence,JSON.parse(JSON.stringify(measurement))),/receipt/);
      const finding=report.findings.find(f=>f.ruleId==='HDR-002');
      if(['/allow','/own-origin','/multiple','/duplicate'].includes(path))assert.ok(finding,'The unchanged heuristic must still report the unrecognized HTTP ancestor policy');
      if(finding){
        const t=merged.targets.find(t=>t.category==='HDR-002')!;assert.equal(t.facts.framePolicyEnforced?.value,true);assert.equal(t.facts.frameAncestorsRestricted?.value,true);
        assert.equal(t.facts.embeddingPublicVerified,undefined);assert.equal(t.facts.sensitiveActionVerified,undefined);
        merged.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'complete',sourceHashes:[],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:0};
        const context=prepareProjectContexts(report,merged)(finding);assert.equal(context.requiresReview,path!=='/own-origin');assert.equal(guardProjectAssessment(context,finding,'contextual'),path==='/own-origin'?'contextual':'needs-review','Unknown trust/purpose of other permitted origins remains review-only');
        assert.equal(prepareProjectContexts(report,{...merged,policy:'vylnt-project-assessment-v1'})(finding).requiresReview,true);
        const conflict=structuredClone(evidence);conflict.targets.find(t=>t.category==='HDR-002')!.facts.framePolicyEnforced={value:false,source:'browser',coverage:'complete',witnessHash:'f'.repeat(64)};
        assert.throws(()=>mergeFramePolicy(conflict,measurement!),/Conflicting/);
      }else assert.equal(measurement.targets.length,0,'No warning is invented when the existing rule recognizes the policy');
      const seal=signer.seal(merged);assert.ok(await verifyProjectEvidence(seal,report,signer.trustedKeys));
      const old=signer.seal({...merged,policy:'vylnt-project-assessment-v1'}),digest=await contentHash(old);assert.ok(await verifyProjectEvidence(JSON.parse(JSON.stringify(old)),report,signer.trustedKeys));assert.equal(await contentHash(old),digest);
    }
    const serialized=JSON.stringify({measurement,evidence:merged});for(const secret of ['private-cookie-value','Private page text','private_query'])assert.ok(!serialized.includes(secret));
    results[path]={status:measurement.status,controls:measurement.controls,targets:measurement.targets.length};
  }
  await assert.rejects(scanProjectPage(origin+'/broken',{channel,allowedLocalOrigins:[origin]}));assert.equal(parentRequests,0,'Virtual parents and rejected redirects must never contact the unrelated parent service');
  await mkdir('test-results/frame-policy',{recursive:true});await writeFile(`test-results/frame-policy/${channel}.json`,JSON.stringify({passed:true,channel,results,scope:'Finite response-policy mechanisms only; no application-purpose labels, training, qualified model or public-site claims.'},null,2));
  console.log(`Frame policy acceptance passed (${channel}).`);
}finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);server.closeAllConnections();parent.closeAllConnections();await Promise.all([server,parent].map(s=>new Promise<void>(done=>s.close(()=>done()))));assert.equal(dirname(resolve(root)),resolve('.local'));assert.ok(basename(root).startsWith('frame-policy-signing-'));await rm(root,{recursive:true,force:true});}

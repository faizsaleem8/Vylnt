import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {mkdir,writeFile} from 'node:fs/promises';
import {readPreparedLocalTls} from '../packages/ml/local-tls';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes';
import {correlateResourceTransfers} from '../apps/cli/project-resource-function';

const prepared=await readPreparedLocalTls(),channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
let port=0;
const server=createServer({cert:prepared.cert,key:prepared.key},(req,res)=>{
  const path=new URL(req.url!,'https://localhost').pathname;
  if(path==='/resource.js'){res.setHeader('content-type','text/javascript');res.end('document.documentElement.dataset.functional="true"');return;}
  if(path==='/positive')res.setHeader('strict-transport-security','max-age=086400');
  if(path==='/disabled')res.setHeader('strict-transport-security','max-age=0');
  if(path==='/resource')res.setHeader('content-security-policy','upgrade-insecure-requests');
  res.setHeader('content-type','text/html');res.end('<!doctype html><title>Strict TLS mechanism</title>'+(path==='/resource'?`<script src="http://localhost:${port}/resource.js"></script>`:''));
});
const controller=new AbortController(),cancel=()=>controller.abort();process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
const profiles:Record<string,unknown>={};
try{
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));port=(server.address() as {port:number}).port;
  const origin='https://localhost:'+port;
  for(const path of ['/missing','/positive','/disabled']){
    let upgradeObserved=false;
    const collected=await scanProjectPage(origin+path,{allowedLocalOrigins:[origin,'http://localhost:'+port],channel,signal:controller.signal,requireComplete:true,hooks:{collected:async page=>{
      if(path==='/positive'){
        try{const response=await page.goto('http://localhost:'+port+'/probe',{timeout:5000});upgradeObserved=response?.status()===200&&page.url()===origin+'/probe';}catch{/* Retain an unsupported local HSTS result, never relabel it positive. */}
      }
    }}});
    assert.equal(collected.measurement.tlsValidated?.value,true,'Real strict browser validation');
    assert.equal(collected.measurement.hstsApplicable?.value,true);
    const evidence=mergeBrowserMeasurement(await collectResponseFacts(collected.report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false),collected.measurement);
    const target=evidence.targets.find(t=>t.category==='HDR-001');assert.ok(target,'Controlled leading-zero profile must retain its original heuristic observation');
    assert.equal(target.facts.hstsPositive?.value,path==='/positive');
    assert.equal(target.facts.tlsValidated?.value,true);
    profiles[path]={strictTls:true,hstsPositive:target.facts.hstsPositive?.value,upgradeObserved};
  }
  let counterpart:unknown,resourceExecutionObserved=false;
  const upgraded=await scanProjectPage(origin+'/resource',{allowedLocalOrigins:[origin,'http://localhost:'+port],channel,signal:controller.signal,requireComplete:true,hooks:{collected:async(page,_context,report)=>{
    counterpart=await correlateResourceTransfers(page,report);
    resourceExecutionObserved=await page.locator('html').getAttribute('data-functional')==='true';
  }}});
  assert.equal(upgraded.measurement.tlsValidated?.value,true);
  await mkdir('test-results/project-transport',{recursive:true});await writeFile(`test-results/project-transport/trusted-${channel}.json`,JSON.stringify({passed:resourceExecutionObserved,tlsProfilesPassed:true,status:resourceExecutionObserved?'passed':'partial',channel,
    certificate:prepared.manifest.sha256,ignoreHTTPSErrors:false,profiles,resourceCorrelation:counterpart,resourceExecutionObserved,
    resourceUpgradeQualified:false,failedProbes:resourceExecutionObserved?[]:['Localhost CSP resource upgrade did not execute the expected script. No positive upgrade label issued.'],qualification:false,
    scope:'Trusted local mechanism, not an independent application family or fitted model.'},null,2));
  console.log('Strict trusted localhost TLS passed ('+channel+'). Resource-upgrade execution observed: '+resourceExecutionObserved+'. Failed upgrade probes remain recorded; no qualification claim.');
  if(!resourceExecutionObserved)process.exitCode=2;
}catch(error){
  await mkdir('test-results/project-transport',{recursive:true});await writeFile(`test-results/project-transport/trusted-${channel}-failed.json`,JSON.stringify({passed:false,channel,profiles,
    certificate:prepared.manifest.sha256,reason:error instanceof Error&&error.message.includes('ERR_CERT_AUTHORITY_INVALID')?'browser-certificate-authority-rejection':'trusted-mechanism-failed',
    qualification:false,modelFitted:false},null,2));throw error;
}finally{
  server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);
}

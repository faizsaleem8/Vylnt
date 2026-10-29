import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {createServer as httpServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,readFile,writeFile,rm,realpath} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes';

const parent=await realpath('.local'),root=await mkdtemp(join(parent,'transport-mechanism-'));
const execute=promisify(execFile),channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
const cancellation=new AbortController(),cancel=()=>cancellation.abort();
const message=(input:unknown)=>{if(input&&typeof input==='object'&&'type' in input&&input.type==='cancel')cancel();};
process.on('SIGINT',cancel);process.on('SIGTERM',cancel);process.on('message',message);
const signal=AbortSignal.any([cancellation.signal,AbortSignal.timeout(90000)]);
let tls:ReturnType<typeof createServer>|undefined,plain:ReturnType<typeof httpServer>|undefined;
try{
  await execute('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',join(root,'key.pem'),'-out',join(root,'cert.pem'),'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],
    {windowsHide:true,timeout:15000,signal,env:{...process.env,MSYS_NO_PATHCONV:'1'}});
  signal.throwIfAborted();
  tls=createServer({key:await readFile(join(root,'key.pem')),cert:await readFile(join(root,'cert.pem'))},(_req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><title>Transport mechanism</title>');});
  await new Promise<void>(done=>tls!.listen(0,'127.0.0.1',done));const port=(tls.address() as {port:number}).port;
  const origin='https://localhost:'+port;
  await assert.rejects(scanProjectPage(origin,{allowedLocalOrigins:[origin],requireComplete:true,channel,signal}),
    error=>error instanceof Error&&/ERR_CERT_AUTHORITY_INVALID/.test(error.message),'Strict validation must reject the untrusted certificate specifically');
  signal.throwIfAborted();
  const bypass=await scanProjectPage(origin,{allowedLocalOrigins:[origin],requireComplete:true,channel,signal,ignoreHTTPSErrors:true});
  assert.equal(bypass.measurement.tlsValidated?.value,false);assert.equal(bypass.measurement.hstsApplicable,undefined);
  const evidence=await collectResponseFacts(bypass.report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
  assert.equal(mergeBrowserMeasurement(evidence,bypass.measurement).targets.find(t=>t.category==='HDR-001')?.facts.tlsValidated?.value,false);
  const ip='https://127.0.0.1:'+port,ipScan=await scanProjectPage(ip,{allowedLocalOrigins:[ip],requireComplete:true,channel,signal,ignoreHTTPSErrors:true});
  assert.equal(ipScan.measurement.hstsApplicable?.value,false);
  plain=httpServer((_req,res)=>{res.writeHead(302,{location:origin});res.end();});await new Promise<void>(done=>plain!.listen(0,'127.0.0.1',done));
  const entry='http://localhost:'+(plain.address() as {port:number}).port;
  const redirected=await scanProjectPage(entry,{allowedLocalOrigins:[entry,origin],requireComplete:true,channel,signal,ignoreHTTPSErrors:true});
  assert.equal(redirected.measurement.responseChainComplete.value,true);assert.equal(redirected.measurement.tlsValidated?.value,false);
  await mkdir('test-results/project-transport',{recursive:true});await writeFile(`test-results/project-transport/${channel}.json`,JSON.stringify({passed:true,channel,
    strictUntrustedCertificateRejected:true,bypassNeverValidated:true,ipHostInapplicable:true,httpRedirectNeverValidated:true,qualification:false,
    limitation:'Negative transport mechanism only; no trusted-certificate positive application dataset collected.'},null,2));
  console.log('Transport mechanism passed: strict certificate rejection, bypass/redirect uncertainty and IP applicability. No qualification claim.');
}finally{
  for(const server of [plain,tls])if(server){server.closeAllConnections();await new Promise<void>(done=>server!.close(()=>done()));}
  if(!(await realpath(root)).startsWith(parent+sep))throw Error('Unexpected TLS mechanism cleanup path');
  await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);process.removeListener('message',message);
  if(process.connected)process.disconnect();
}

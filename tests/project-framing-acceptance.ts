import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir,writeFile } from 'node:fs/promises';
import { scanProjectPage } from '../apps/cli/project-scanner';
import { measureFraming } from '../apps/cli/project-framing';
import { canonicalJson,contentHash } from '../packages/core/integrity';
const server=createServer((request,response)=>{
  const path=new URL(request.url!,'http://localhost').pathname;
  if(path==='/deny')response.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
  if(path==='/self')response.setHeader('Content-Security-Policy',"frame-ancestors 'self'");
  if(path==='/report-only')response.setHeader('Content-Security-Policy-Report-Only',"frame-ancestors 'none'");
  if(path==='/xfo')response.setHeader('X-Frame-Options','DENY');
  response.setHeader('Content-Type','text/html');response.setHeader('Set-Cookie','session=private-cookie-value; Path=/');
  response.end('<!doctype html>'+ (path==='/meta'?'<meta http-equiv="Content-Security-Policy" content="frame-ancestors &apos;none&apos;">':'')+'<button id="operation">Private page text</button>');
});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
try{
  const results:Record<string,unknown>={};
  for(const [path,expected] of Object.entries({'/open':['embedded','embedded'],'/deny':['csp-blocked','csp-blocked'],'/self':['embedded','csp-blocked'],'/report-only':['embedded','embedded'],'/meta':['embedded','embedded'],'/xfo':['unknown','unknown']})){
    const {report}=await scanProjectPage(origin+path,{channel,allowedLocalOrigins:[origin],hooks:{collected:async(_page,context,report)=>{
      const before=canonicalJson(await context.cookies());
      const measurement=await measureFraming(context,report,{identityHash:'a'.repeat(64),check:async frame=>await frame.locator('#operation').count()===1});
      assert.equal(measurement.sameOrigin,expected[0],path+' same: '+JSON.stringify(measurement));assert.equal(measurement.crossOrigin,expected[1],path+' cross: '+JSON.stringify(measurement));assert.equal(measurement.repeatedCrossOrigin,expected[1]);
      assert.equal(measurement.originalScanHash,await contentHash(report));assert.equal(canonicalJson(await context.cookies()),before);
      for(const secret of ['private-cookie-value','Private page text'])assert.ok(!JSON.stringify(measurement).includes(secret));
      if(path==='/open'){
        const rejected=await measureFraming(context,report,{identityHash:'a'.repeat(64),check:async()=>false});assert.equal(rejected.coverage,'partial');
        const abort=new AbortController();await assert.rejects(measureFraming(context,report,{identityHash:'a'.repeat(64),check:async()=>{abort.abort();return true;}},abort.signal));
      }
      results[path]=measurement;
    }}});assert.ok(report.findings.length);
  }
  await mkdir('test-results/framing',{recursive:true});await writeFile(`test-results/framing/${channel}.json`,JSON.stringify({passed:true,channel,results,scope:'Mechanism observations only, no purpose labels, training or qualification.'},null,2));
  console.log(`Framing browser acceptance passed (${channel}).`);
}finally{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}

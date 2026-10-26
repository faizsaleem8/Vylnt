import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { scanProjectPage } from '../apps/cli/project-scanner';
import { mergeBrowserMeasurement } from '../apps/cli/project-probes';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { contentHash } from '../packages/core/integrity';
import { measureAuthenticationCookies,mergeCookieDependency } from '../apps/cli/project-functional';

// These are mechanism acceptance fixtures, not independent corpus families.
let upgradeRequests = 0, workerRequests = 0;
const server = createServer((request,response) => {
  const url = new URL(request.url!, 'http://localhost');
  if(url.pathname === '/resource') {
    if(url.searchParams.has('bad')) { request.socket.destroy(); return; }
    response.end('ok'); return;
  }
  if(url.pathname === '/worker.js') { workerRequests++; response.setHeader('content-type','text/javascript');response.end('');return; }
  if(url.pathname === '/redirect') { response.writeHead(302,{location:'/open?private_query=do-not-store'});response.end();return; }
  if(url.pathname === '/external') { response.writeHead(302,{location:'https://example.invalid/'});response.end();return; }
  if(url.pathname === '/slow') return;
  if(url.pathname === '/auth-probe') {response.setHeader('Content-Type','text/html');response.end((request.headers.cookie??'').split(';').some(c=>c.trim()==='session=private-cookie-value')?'<form id="native-authenticated"></form>':'<form id="native-anonymous"></form>');return;}
  if(url.pathname === '/enforced') response.setHeader('Content-Security-Policy','script-src https:');
  if(url.pathname === '/report-only') response.setHeader('Content-Security-Policy-Report-Only',"script-src 'none'");
  if(url.pathname === '/trusted-types') response.setHeader('Content-Security-Policy',"require-trusted-types-for 'script'");
  response.setHeader('Content-Type','text/html');
  response.setHeader('Set-Cookie',['session=private-cookie-value; Path=/','theme-session=private-theme-value; Path=/']);
  response.end(`<!doctype html><html><head>${url.pathname==='/meta'?'<meta http-equiv="Content-Security-Policy" content="script-src &apos;none&apos;">':''}</head>
    <body><p>private-page-text</p><script>
    localStorage.setItem('credential','private-local-storage');
    fetch('/resource?ok=private_query').catch(()=>{});fetch('/resource?bad=private_query').catch(()=>{});
    navigator.serviceWorker?.register('/worker.js').catch(()=>{});
    new WebSocket('ws://'+location.host+'/socket');
    ${url.pathname==='/probe-navigate'?"new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeName==='SCRIPT'&&n.textContent.includes('__vylnt_probe_'))))history.replaceState(null,'','?duringProbe=private_query');}).observe(document.documentElement,{childList:true,subtree:true});":''}
    </script></body></html>`);
});
server.on('upgrade', (_request,socket)=>{upgradeRequests++;socket.destroy();});
await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
const start=Date.now();
try {
  const results:Record<string,unknown>={};
  for(const [path,expected] of Object.entries({'/open':false,'/enforced':true,'/report-only':false,'/meta':true,'/trusted-types':undefined,'/redirect':false,'/probe-navigate':undefined})) {
    const {report,measurement}=await scanProjectPage(origin+path,{allowedLocalOrigins:[origin],requireComplete:true,channel});
    assert.equal(measurement.cspProbeBlocked?.value,expected,path);
    assert.equal(measurement.responseChainComplete.value,true);
    assert.equal(measurement.hstsApplicable?.value,false,'IP hosts cannot establish HSTS applicability');
    assert.equal(measurement.originalScanHash,await contentHash(report),'probe must not mutate the captured raw report');
    assert.equal(measurement.scanId,report.scanId);
    const serialized=JSON.stringify({report,measurement});
    for(const secret of ['private_query','private-cookie-value','private-page-text','private-local-storage']) assert.ok(!serialized.includes(secret),secret);
    let evidence=await collectResponseFacts(report,{runId:randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
    evidence=mergeBrowserMeasurement(evidence,measurement);
    assert.equal(evidence.targets.find(t=>t.category==='HDR-003')?.facts.cspProbeBlocked?.value,expected);
    assert.ok(evidence.targets.every(t=>t.facts.cspProbeAllowed===undefined),'unapproved inline blocking is not application compatibility');
    assert.ok(evidence.targets.every(t=>t.facts.cookieAuthDependency===undefined),'names cannot establish cookie purpose');
    assert.throws(()=>mergeBrowserMeasurement(evidence,{...measurement,scanId:randomUUID()}),/does not match/);
    assert.throws(()=>mergeBrowserMeasurement(evidence,{...measurement,originalScanHash:'d'.repeat(64)}),/does not match/);
    if(path==='/open') {
      const resources=report.observation.resources.filter(r=>r.url===origin+'/resource');
      assert.ok(resources.some(r=>r.outcome==='completed'));
      assert.ok(resources.some(r=>r.outcome==='failed'),'query-colliding requests retain independent outcomes');
    }
    results[path]={inlineBlocked:expected??'unknown',findings:report.findings.length};
  }
  await assert.rejects(scanProjectPage(origin+'/external',{allowedLocalOrigins:[origin],channel}));
  await assert.rejects(scanProjectPage('https://example.invalid/',{allowedLocalOrigins:['https://example.invalid'],channel}));
  await assert.rejects(scanProjectPage(origin+'/open',{allowRemote:true,allowedLocalOrigins:[origin],channel}));
  const native=await scanProjectPage(origin+'/open',{allowedLocalOrigins:[origin],channel,hooks:{collected:async(_page,context,report)=>{
    const check=await measureAuthenticationCookies(context,report,{identityHash:'a'.repeat(64),check:async page=>{
      await page.goto(origin+'/auth-probe');if(await page.locator('#native-authenticated').count()===1)return 'authenticated';
      if(await page.locator('#native-anonymous').count()===1)return 'anonymous';return 'unknown';
    }});
    assert.ok(check.targets.length>0);assert.ok(check.targets.every(t=>report.findings.find(f=>f.id===t.findingId)?.evidence.cookieName==='session'));
    assert.ok(!JSON.stringify(check).includes('private-cookie-value'));
    const evidence=await collectResponseFacts(report,{runId:randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
    assert.ok(mergeCookieDependency(evidence,check).targets.some(t=>t.facts.cookieAuthDependency?.value===true));
    report.findings.length=0; // A trusted hook receives a copy, not mutable raw report state.
  }}});
  assert.ok(native.report.findings.length>0);assert.equal(native.measurement.originalScanHash,await contentHash(native.report));
  const hookAbort=new AbortController();
  await assert.rejects(scanProjectPage(origin+'/open',{allowedLocalOrigins:[origin],channel,signal:hookAbort.signal,hooks:{prepare:async()=>{hookAbort.abort();await new Promise<void>(()=>{});}}}),/cancelled/);
  const abort=new AbortController(),pending=scanProjectPage(origin+'/slow',{allowedLocalOrigins:[origin],channel,signal:abort.signal});
  const timer=setTimeout(()=>abort.abort(),1000);
  try { await assert.rejects(pending); } finally {clearTimeout(timer);}
  assert.equal(upgradeRequests,0,'no WebSocket connections reached the server');
  assert.equal(workerRequests,0,'no service worker script was fetched');
  await mkdir('test-results/project-browser',{recursive:true});
  await writeFile(`test-results/project-browser/${channel}.json`,JSON.stringify({version:1,channel,results,elapsedMs:Date.now()-start,
    tests:['CSP enforced/report-only/meta/Trusted Types','request identity','metadata privacy','same-scan binding','raw report immutability','loopback isolation','WebSocket/service worker blocking','cancellation','native cookie removal/restoration','unrelated cookie remains unknown','adapter cancellation/immutable report'],
    scope:'Mechanism fixtures only; no training examples or qualification predictions.'},null,2));
  console.log(`Project browser acceptance passed (${channel}).`);
} finally {server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}

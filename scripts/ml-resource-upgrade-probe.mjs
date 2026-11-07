import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer as http} from 'node:http';
import {createServer as https} from 'node:https';
import {chromium} from 'playwright';

const host='vylnt-resource.test',script='/dependency.js';
const phases=['blocked','enabled','withheld','restored','localhost-control'];
let phase,port,plainPort,httpHits=0,httpsHits=0,unexpectedTlsErrors=0;
const plain=http((request,response)=>{
  if(request.url!==script){response.writeHead(404).end();return;}
  httpHits++;
  response.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});
  response.end('document.documentElement.dataset.vylntDependency="http";');
});
const secure=https({key:await readFile(process.argv[2]),cert:await readFile(process.argv[3])},(request,response)=>{
  if(request.url===script){
    httpsHits++;
    response.writeHead(200,{'Content-Type':'application/javascript','Cache-Control':'no-store'});
    response.end('document.documentElement.dataset.vylntDependency="https";');
    return;
  }
  if(request.url!=='/check'){response.writeHead(404).end();return;}
  if(phase!=='blocked')response.setHeader('Content-Security-Policy','upgrade-insecure-requests');
  response.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
  const resource=phase==='localhost-control'?'localhost:'+plainPort:host+':'+port;
  response.end('<!doctype html><script src="http://'+resource+script+'"></script>');
});
// A plaintext request at the named fixture's HTTPS listener must be counted
// and cannot be redirected. Any other unexpected handshake also fails closed.
secure.on('tlsClientError',error=>{
  if(error.code==='ERR_SSL_HTTP_REQUEST')httpHits++;
  else unexpectedTlsErrors++;
});
const listen=server=>new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
let browser;
try{
  await Promise.all([listen(plain),listen(secure)]);
  port=secure.address().port;
  plainPort=plain.address().port;
  const controlRequest=await fetch('http://127.0.0.1:'+port+script,{signal:AbortSignal.timeout(3000)}).then(()=>false,()=>true);
  assert.ok(controlRequest&&httpHits===1&&unexpectedTlsErrors===0,'Plaintext detection must work before browser testing');
  const origin='https://'+host+':'+port;
  const exact=new Set([origin+'/check',origin+script,'http://'+host+':'+port+script,'http://localhost:'+plainPort+script]);
  browser=await chromium.launch({channel:'chromium',headless:true,args:['--no-proxy-server',
    '--host-resolver-rules=MAP '+host+' 127.0.0.1, MAP localhost 127.0.0.1, MAP * ~NOTFOUND']});
  const results={};
  for(const name of phases){
    phase=name;httpHits=0;httpsHits=0;unexpectedTlsErrors=0;
    const context=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:false});
    let withheld=0;
    try{
      await context.routeWebSocket('**/*',socket=>socket.close());
      await context.route('**/*',route=>{
        const request=route.request();
        if(!exact.has(request.url())||request.method()!=='GET'||request.redirectedFrom())return route.abort();
        if(name==='withheld'&&request.url()===origin+script){withheld++;return route.abort();}
        return route.continue();
      });
      const page=await context.newPage();
      const deliveries=[];
      page.on('response',response=>{if(response.url()===origin+script)deliveries.push(response);});
      const navigation=await page.goto(origin+'/check',{waitUntil:'load',timeout:12000});
      const security=await navigation?.securityDetails();
      assert.equal(navigation?.status(),200);
      assert.ok(/^TLS 1\.[23]$/.test(security?.protocol??''),'Strict TLS response metadata is required');
      const executed=await page.locator('html').getAttribute('data-vylnt-dependency');
      const originalHost=name==='localhost-control'?'localhost:'+plainPort:host+':'+port;
      assert.equal(await page.locator('script').getAttribute('src'),'http://'+originalHost+script);
      assert.equal(unexpectedTlsErrors,0);
      let upgradedScriptExecuted=false;
      if(name==='enabled'||name==='restored'){
        assert.equal(executed,'https');assert.equal(httpsHits,1);assert.equal(httpHits,0);
        assert.equal(deliveries.length,1);
        const delivery=deliveries[0],request=delivery.request(),address=await delivery.serverAddr();
        assert.equal(delivery.status(),200);
        assert.equal(request.resourceType(),'script');
        assert.equal(request.redirectedFrom(),null);
        assert.equal(request.redirectedTo(),null);
        assert.equal(delivery.fromServiceWorker(),false);
        assert.equal(address?.ipAddress,'127.0.0.1');
        assert.equal(address?.port,port);
        assert.ok(/^TLS 1\.[23]$/.test((await delivery.securityDetails())?.protocol??''));
        upgradedScriptExecuted=true;
      }else if(name==='localhost-control'){
        assert.equal(executed,'http');assert.equal(httpHits,1);assert.equal(httpsHits,0);
      }else{
        assert.equal(executed,null);assert.equal(httpHits,0);assert.equal(httpsHits,0);
        assert.equal(withheld,name==='withheld'?1:0);
      }
      results[name]={httpsHits,httpHits,executed,withheld,upgradedScriptExecuted};
    }finally{await context.close();}
  }
  console.log(JSON.stringify({version:1,browser:browser.version(),strictTls:true,results,eligibleForTraining:false,qualification:false}));
}finally{
  await browser?.close();
  for(const server of [plain,secure]){
    server.closeAllConnections();
    if(server.listening)await new Promise(done=>server.close(done));
  }
}

import {createServer as createHttpServer} from 'node:http';
import {createServer as createHttpsServer} from 'node:https';
import {randomUUID} from 'node:crypto';
import type {BrowserContext,Page} from 'playwright';
import type {Report} from '../../packages/core';
import {canonicalJson,contentHash} from '../../packages/core/integrity';
import {invalidFixtureHsts,projectEvidenceSchema,projectHstsHostPolicy,projectHstsInvalidPolicy,projectHstsPlaintextPolicy,projectHstsRetainedPolicy,projectTransportPolicy,type ProjectEvidence} from '../../packages/core/project-evidence';
import {upgradeFixtureHost} from './project-resource-function';

const version='vylnt-hsts-plaintext-probe-v1';
const receipts=new WeakMap<object,string>();
const tlsProtocol=(protocol?:string)=>/^TLS 1\.[23]$/.test(protocol??'');
type Result={version:typeof version;scanHash:string;adapterHash:string;plaintextBeforeControl:boolean;controlTlsValidated:boolean;plaintextAfterControl:boolean;tlsAfterControl:boolean};
type HostResult=Result&{plaintextAfterReset:true}&({headerAbsentAfterInstall:true;invalidHeaderRetained?:never}|{invalidHeaderRetained:true;headerAbsentAfterInstall?:never});
type DisableResult=Result&{nativeZeroDirective:true;plaintextAfterReset:true};
type ActivationResult=Result&{nativePositiveDirective:true;baselineResetVerified:true};

/** Developer-only same-browser control. The browser must have loaded the
 * exact named application response before this runs. The private key remains
 * in the disposable fixture. No synthetic fulfillment can count. */
export async function measureHstsPlaintext(context:BrowserContext,report:Report,adapterHash:string,
  tls:{cert:Buffer;key:Buffer},signal:AbortSignal):Promise<Result>{
  return measureHstsWire(context,report,adapterHash,tls,signal);
}

export async function measureInvalidHsts(context:BrowserContext,report:Report,adapterHash:string,
  tls:{cert:Buffer;key:Buffer},signal:AbortSignal):Promise<Result>{
  return measureHstsWire(context,report,adapterHash,tls,signal,undefined,invalidFixtureHsts);
}

export async function measureHstsHostPolicy(page:Page,report:Report,adapterHash:string,tls:{cert:Buffer;key:Buffer},signal:AbortSignal,
  invalidHeader?:typeof invalidFixtureHsts):Promise<HostResult>{
  const result=await measureHstsWire(page.context(),report,adapterHash,tls,signal,page,invalidHeader);
  if(!('plaintextAfterReset' in result)||'nativeZeroDirective' in result)throw Error('Same-host HSTS controls incomplete');
  return result;
}

/** Prove the actual application response clears previously observed HSTS. */
export async function measureHstsDisable(page:Page,report:Report,adapterHash:string,tls:{cert:Buffer;key:Buffer},signal:AbortSignal):Promise<DisableResult>{
  const result=await measureHstsWire(page.context(),report,adapterHash,tls,signal,page,undefined,'disable');
  if(!('nativeZeroDirective' in result))throw Error('Native HSTS disable controls incomplete');
  return result;
}

/** Start from a verified empty policy and let the application install it. */
export async function measureHstsActivation(page:Page,report:Report,adapterHash:string,tls:{cert:Buffer;key:Buffer},signal:AbortSignal):Promise<ActivationResult>{
  const result=await measureHstsWire(page.context(),report,adapterHash,tls,signal,page,undefined,'activate');
  if(!('nativePositiveDirective' in result))throw Error('Native HSTS activation controls incomplete');
  return result;
}

async function measureHstsWire(context:BrowserContext,report:Report,adapterHash:string,tls:{cert:Buffer;key:Buffer},signal:AbortSignal,
  nativePage?:Page,invalidHeader?:typeof invalidFixtureHsts,nativePolicy?:'disable'|'activate'):Promise<Result|HostResult|DisableResult|ActivationResult>{
  signal.throwIfAborted();
  const source=new URL(report.observation.url);
  const nativeDisable=nativePolicy==='disable',nativeActivate=nativePolicy==='activate';
  const expectedHeader=nativeDisable?'max-age=0':nativeActivate?'max-age=086400':invalidHeader;
  if(source.protocol!=='https:'||source.hostname!==upgradeFixtureHost||!source.port||source.username||source.password||
    source.search||source.hash||report.observation.headers?.['strict-transport-security']!==expectedHeader||
    report.observation.headers===undefined||!context.pages().some(page=>page.url()===source.href)||
    !/^[a-f0-9]{64}$/.test(adapterHash))throw Error('HSTS plaintext control requires the exact fixture response');
  const path='/__vylnt_hsts_'+randomUUID();
  if(nativePage&&nativePage.url()!==source.href)throw Error('HSTS host policy requires the original native page');
  const resetPath=path+'/reset';
  const afterResetPath=path+'/after-reset';
  let phase:'before'|'after'|'reset'='before',before=0,after=0,tlsAfter=0,reset=0,foreignTraffic=false;
  let rejectedSecure:{path:'install'|'reset'|'unexpected';get:boolean;cookie:boolean;authorization:boolean}|undefined;
  const plain=createHttpServer((request,response)=>{
    const expected=phase==='reset'?afterResetPath:path;
    if(request.url!==expected||request.method!=='GET'||request.headers.cookie||request.headers.authorization||request.headers['x-api-key']){
      foreignTraffic=true;response.writeHead(400).end();return;
    }
    if(phase==='before')before++;else if(phase==='after')after++;else reset++;
    response.writeHead(200,{'content-type':'text/plain','cache-control':'no-store','connection':'close'}).end('VYLNT fixture');
  });
  // When Chromium upgrades the second request, the plaintext listener sees
  // a TLS ClientHello instead of an HTTP request. It never supplies a redirect.
  plain.on('clientError',(error,socket)=>{
    const packet=(error as Error&{rawPacket?:Buffer}).rawPacket;
    if(phase==='after'&&packet?.[0]===22&&packet[1]===3)tlsAfter++;
    else foreignTraffic=true;
    socket.destroy();
  });
  const secure=createHttpsServer(tls,(request,response)=>{
    if((request.url!==path&&(!nativePage||nativeDisable||request.url!==resetPath))||request.method!=='GET'||request.headers.cookie||request.headers.authorization||request.headers['x-api-key']){
      rejectedSecure={path:request.url===path?'install':request.url===resetPath?'reset':'unexpected',get:request.method==='GET',
        cookie:Boolean(request.headers.cookie),authorization:Boolean(request.headers.authorization)};
      foreignTraffic=true;response.writeHead(400).end();return;
    }
    response.writeHead(200,{'strict-transport-security':request.url===resetPath?'max-age=0':'max-age=86400',
      'content-type':'text/plain','cache-control':'no-store','connection':'close'}).end('VYLNT fixture');
  });
  const listen=(server:typeof plain|typeof secure)=>new Promise<void>((done,reject)=>{
    server.once('error',reject);server.listen(0,'127.0.0.1',done);
  });
  const probe=await context.newPage();
  let upgradedProbe:Page|undefined;
  let controlStage='listener setup';
  const stop=()=>{void probe.close().catch(()=>{});void upgradedProbe?.close().catch(()=>{});};
  signal.addEventListener('abort',stop,{once:true});
  try{
    await Promise.all([listen(plain),listen(secure)]);
    const plainPort=(plain.address() as {port:number}).port,securePort=(secure.address() as {port:number}).port;
    const http='http://'+source.hostname+':'+plainPort+path,control='https://'+source.hostname+':'+securePort+path;
    const upgraded='https://'+source.hostname+':'+plainPort+path;
    const resetControl='https://'+source.hostname+':'+securePort+resetPath;
    const afterReset='http://'+source.hostname+':'+plainPort+afterResetPath;
    const nativeCookies=nativePage?await context.cookies(source.href):[];
    await context.clearCookies({domain:source.hostname});
    const restrict=(page:Page)=>page.route('**/*',async route=>{
      const request=route.request();
      if(![http,control,upgraded,...(nativePage?[resetControl,afterReset]:[])].includes(request.url())||request.method()!=='GET'){await route.abort();return;}
      await route.continue();
    });
    await restrict(probe);
    if(nativeActivate){
      controlStage='credential-free baseline reset';
      const cleared=await probe.goto(resetControl,{timeout:8000});
      if(cleared?.url()!==resetControl||cleared.status()!==200||cleared.request().redirectedFrom()||
        await cleared.headerValue('strict-transport-security')!=='max-age=0'||!tlsProtocol((await cleared.securityDetails())?.protocol))
        throw Error('HSTS activation baseline reset did not validate');
    }
    // Both owned listeners issue only 200 or 400. The browser must be
    // allowed to perform its internal rewrite without a response interceptor.
    signal.throwIfAborted();
    controlStage='plaintext baseline';
    const first=await probe.goto(http,{timeout:8000});
    const plaintextBeforeControl=first?.url()===http&&first.status()===200&&before===1&&!first.request().redirectedFrom();
    controlStage='policy installation';
    if(nativeActivate)await context.addCookies(nativeCookies);
    const trusted=nativeActivate?await nativePage!.reload({timeout:8000}):await probe.goto(control,{timeout:8000});
    const controlTlsValidated=trusted?.url()===(nativeActivate?source.href:control)&&trusted.status()===200&&!trusted.request().redirectedFrom()&&
      (!nativeActivate||await trusted.headerValue('strict-transport-security')===expectedHeader)&&tlsProtocol((await trusted.securityDetails())?.protocol);
    if(nativeActivate)await context.clearCookies({domain:source.hostname});
    if(nativePage&&!nativePolicy){
      controlStage='native response reload';
      await context.addCookies(nativeCookies);
      const revisited=await nativePage.reload({timeout:8000});
      if(revisited?.url()!==source.href||revisited.status()!==200||revisited.request().redirectedFrom()||
        await revisited.headerValue('strict-transport-security')!==(invalidHeader??null)||!tlsProtocol((await revisited.securityDetails())?.protocol))
        throw Error('Native response did not retain the tested header state over strict TLS');
      await context.clearCookies({domain:source.hostname});
    }
    phase='after';
    controlStage='TLS upgrade on the wire';
    if(nativePage){upgradedProbe=await context.newPage();await restrict(upgradedProbe);}
    await (upgradedProbe??probe).goto(http,{timeout:8000}).catch(()=>{});
    signal.throwIfAborted();
    const result:Result={version,scanHash:await contentHash(report),adapterHash,plaintextBeforeControl,controlTlsValidated,
      plaintextAfterControl:after!==0,tlsAfterControl:tlsAfter>0};
    if(foreignTraffic||!result.plaintextBeforeControl||!result.controlTlsValidated||result.plaintextAfterControl||!result.tlsAfterControl){
      // A bounded diagnostic contains no URLs, cookies or browser messages.
      console.error('HSTS wire control outcome',JSON.stringify({before,after,tlsAfter,foreignTraffic,controlTlsValidated}));
      throw Error('HSTS plaintext and positive control did not agree');
    }
    if(nativeActivate){
      const activated:ActivationResult={...result,nativePositiveDirective:true,baselineResetVerified:true};
      receipts.set(activated,canonicalJson(activated));
      return activated;
    }
    if(nativePage){
      controlStage='policy reset';
      // The native editor can update its session after the cookie jar is
      // cleared. Keep the reset request credential-free on the wire.
      const cleared=nativeDisable?await (async()=>{
        await context.addCookies(nativeCookies);
        return nativePage.reload({timeout:8000});
      })():(await Promise.all([
        probe.waitForResponse(response=>response.url()===resetControl,{timeout:8000}),
        probe.evaluate(async url=>{
          const response=await fetch(url,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6000)});
          await response.body?.cancel();
        },resetControl),
      ]))[0];
      const resetChecks={correctResponse:cleared?.url()===(nativeDisable?source.href:resetControl)&&!cleared?.request().redirectedFrom(),successful:cleared?.status()===200,
        zeroDirective:await cleared?.headerValue('strict-transport-security')==='max-age=0',
        strictTls:tlsProtocol((await cleared?.securityDetails())?.protocol)};
      if(!Object.values(resetChecks).every(Boolean)){console.error('HSTS reset response',JSON.stringify(resetChecks));throw Error('HSTS reset response did not validate');}
      await context.clearCookies({domain:source.hostname});
      phase='reset';
      controlStage='plaintext after reset';
      const last=await probe.goto(afterReset,{timeout:8000});
      signal.throwIfAborted();
      if(last?.url()!==afterReset||last.status()!==200||last.request().redirectedFrom()||reset!==1||foreignTraffic)
        throw Error('HSTS reset did not restore plaintext');
      const scoped:HostResult|DisableResult={...result,plaintextAfterReset:true,
        ...(nativeDisable?{nativeZeroDirective:true as const}:invalidHeader?{invalidHeaderRetained:true as const}:{headerAbsentAfterInstall:true as const})};
      receipts.set(scoped,canonicalJson(scoped));
      return scoped;
    }
    receipts.set(result,canonicalJson(invalidHeader?{result,invalidHeader}:result));
    return result;
  }catch(error){
    const networkCode=error instanceof Error?error.message.match(/net::ERR_[A-Z_]+/)?.[0]:undefined;
    if(nativePage)console.error('HSTS host control outcome',JSON.stringify({controlStage,before,after,tlsAfter,reset,foreignTraffic,networkCode,rejectedSecure}));
    throw error;
  }finally{
    signal.removeEventListener('abort',stop);
    await probe.close().catch(()=>{});
    await upgradedProbe?.close().catch(()=>{});
    await Promise.all([plain,secure].map(async server=>{
      server.closeAllConnections();if(server.listening)await new Promise<void>(done=>server.close(()=>done()));
    }));
  }
}

export async function mergeHstsDisable(evidence:ProjectEvidence,result:DisableResult){
  if(receipts.get(result)!==canonicalJson(result)||result.scanHash!==evidence.originalScanHash||result.adapterHash!==evidence.adapterHash||
    evidence.policy!==projectTransportPolicy||!result.nativeZeroDirective||!result.plaintextAfterReset)
    throw Error('Native HSTS disable receipt missing, incomplete or changed');
  const next=structuredClone(evidence),facts=next.targets.find(target=>target.category==='HDR-001')?.facts;
  if(!facts||facts.hstsPreloadConfirmed||facts.hstsPositive?.source!=='response'||facts.hstsPositive.value!==false||
    facts.hstsSyntaxSupported?.source!=='response'||facts.hstsSyntaxSupported.value!==true)
    throw Error('Missing original zero HSTS directive evidence');
  // A fresh browser reached plaintext before installation, and only the
  // application's observed zero directive reversed the verified upgrade.
  facts.hstsPreloadConfirmed={source:'browser',coverage:'complete',value:false,witnessHash:await contentHash(result)};
  return projectEvidenceSchema.parse(next);
}

export async function mergeHstsActivation(evidence:ProjectEvidence,result:ActivationResult){
  if(receipts.get(result)!==canonicalJson(result)||result.scanHash!==evidence.originalScanHash||result.adapterHash!==evidence.adapterHash||
    evidence.policy!==projectTransportPolicy||!result.nativePositiveDirective||!result.baselineResetVerified)
    throw Error('Native HSTS activation receipt missing, incomplete or changed');
  const next=structuredClone(evidence),facts=next.targets.find(target=>target.category==='HDR-001')?.facts;
  if(!facts||facts.hstsPreloadConfirmed||facts.hstsPositive?.source!=='response'||facts.hstsPositive.value!==true||
    facts.hstsSyntaxSupported?.source!=='response'||facts.hstsSyntaxSupported.value!==true)
    throw Error('Missing original positive HSTS directive evidence');
  facts.hstsPreloadConfirmed={source:'browser',coverage:'complete',value:false,witnessHash:await contentHash(result)};
  return projectEvidenceSchema.parse(next);
}

export async function mergeHstsPlaintext(evidence:ProjectEvidence,result:Result){
  if('plaintextAfterReset' in result||receipts.get(result)!==canonicalJson(result)||result.scanHash!==evidence.originalScanHash||result.adapterHash!==evidence.adapterHash||
    evidence.policy!==projectTransportPolicy)throw Error('HSTS plaintext receipt missing, incomplete or changed');
  const next=structuredClone(evidence),target=next.targets.find(target=>target.category==='HDR-001');
  if(!target||target.facts.hstsPreloadConfirmed)throw Error('Missing or duplicate HSTS plaintext target');
  target.facts.hstsPreloadConfirmed={source:'browser',coverage:'complete',value:false,witnessHash:await contentHash(result)};
  next.policy=projectHstsPlaintextPolicy;
  return projectEvidenceSchema.parse(next);
}

export async function mergeHstsHostPolicy(evidence:ProjectEvidence,result:HostResult){
  if(receipts.get(result)!==canonicalJson(result)||result.scanHash!==evidence.originalScanHash||result.adapterHash!==evidence.adapterHash||
    evidence.policy!==projectTransportPolicy||!result.plaintextAfterReset)
    throw Error('HSTS host policy receipt missing, incomplete or changed');
  const next=structuredClone(evidence),target=next.targets.find(target=>target.category==='HDR-001');
  const facts=target?.facts;
  const originalMatches=result.invalidHeaderRetained
    ?facts?.hstsSyntaxSupported?.source==='response'&&facts.hstsSyntaxSupported.value===false&&!facts.hstsPositive
    :result.headerAbsentAfterInstall&&facts?.hstsPositive?.source==='response'&&facts.hstsPositive.value===false;
  if(!target||!originalMatches)throw Error('Missing matching original HSTS response evidence');
  target.facts.hstsPositive={source:'browser',coverage:'complete',value:true,witnessHash:await contentHash(result)};
  next.policy=result.invalidHeaderRetained?projectHstsRetainedPolicy:projectHstsHostPolicy;
  return projectEvidenceSchema.parse(next);
}

export async function mergeInvalidHsts(evidence:ProjectEvidence,result:Result){
  if(receipts.get(result)!==canonicalJson({result,invalidHeader:invalidFixtureHsts})||result.scanHash!==evidence.originalScanHash||
    result.adapterHash!==evidence.adapterHash||evidence.policy!==projectTransportPolicy)throw Error('Invalid HSTS wire receipt missing or changed');
  const next=structuredClone(evidence),target=next.targets.find(target=>target.category==='HDR-001');
  if(!target||target.facts.hstsSyntaxSupported?.source!=='response'||target.facts.hstsSyntaxSupported.value||target.facts.hstsPositive)
    throw Error('Missing original invalid HSTS evidence');
  target.facts.hstsPositive={source:'browser',coverage:'complete',value:false,witnessHash:await contentHash(result)};
  next.policy=projectHstsInvalidPolicy;
  return projectEvidenceSchema.parse(next);
}

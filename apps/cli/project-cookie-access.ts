import { randomUUID } from 'node:crypto';
import { transfer } from './project-loopback-transport';
import { setMaxListeners } from 'node:events';
import type { BrowserContext, Page } from 'playwright';
import type { Report } from '../../packages/core';
import { contentHash } from '../../packages/core/integrity';
import { projectEvidenceSchema,type ProjectEvidence,type ProjectFact } from '../../packages/core/project-evidence';
import type { AuthenticationState } from './project-functional';

export const cookieAccessVersion='vylnt-cookie-access-v1';
type Cookie=Awaited<ReturnType<BrowserContext['cookies']>>[number];
export interface CookieFlowResult {
  authentication:AuthenticationState;functionality:'passed'|'failed'|'unknown';
  preference?:'first'|'second'|'unknown';protectedStatus?:200|401|403|'unknown';
}
export interface NativeCookieAccessCheck {
  identityHash:string;
  /** Reviewed, disposable native interaction. Observe DOM/operation results;
   * do not read cookies in this callback or supply a scenario label. */
  check(page:Page):Promise<CookieFlowResult>;
}
export interface CookieAccessPhase extends CookieFlowResult {complete:boolean;read:boolean;limitation?:'unsupported-flow'|'accessor-coverage'|'cookie-state-changed'|'unavailable'}
export function assessCookieAccess(baseline:CookieAccessPhase,restricted:CookieAccessPhase,restored:CookieAccessPhase):boolean|undefined {
  if(![baseline,restricted,restored].every(p=>p.complete&&p.authentication==='authenticated')
    ||baseline.functionality!=='passed'||restored.functionality!=='passed'||baseline.read!==restored.read||restricted.read)return;
  if(restricted.functionality==='passed')return false;
  if(restricted.functionality==='failed'&&baseline.read&&restored.read)return true;
}
export interface CookieAccessMeasurement {
  version:typeof cookieAccessVersion;scanId:string;originalScanHash:string;
  targets:{findingId:string;facts:{cookieJsAccessObserved:ProjectFact;cookieJsAccessRequired:ProjectFact}}[];
  checks:{findingIds:string[];baseline:CookieAccessPhase;restricted?:CookieAccessPhase;restored?:CookieAccessPhase}[];
}

/** Install before application scripts. Only booleans leave this realm. Cookie
 * values returned by native accessors stay in transient application memory. */
function instrument({name,key}:{name:string;key:string}){
  let read=false,writes=false,valid=true,pending=0;
  const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
  const contains=(raw:string)=>raw.split(';').some(part=>part.trim().split('=',1)[0]===name);
  const getter=function(this:Document){const raw=descriptor!.get!.call(this) as string;if(contains(raw))read=true;return raw;};
  const setter=function(this:Document,value:string){if(typeof value==='string'&&value.split('=',1)[0].trim()===name)writes=true;descriptor!.set!.call(this,value);};
  if(!descriptor?.get||!descriptor.set||!descriptor.configurable)valid=false;
  else Object.defineProperty(Document.prototype,'cookie',{...descriptor,get:getter,set:setter});
  const store=(globalThis as unknown as {cookieStore?:Record<string,unknown>}).cookieStore;
  const wrapped:{owner:Record<string,unknown>;method:string;fn:unknown}[]=[];
  const globals=globalThis as unknown as Record<string,unknown>,workers:Record<string,unknown>={};
  for(const name of ['Worker','SharedWorker']){
    const original=globals[name];if(typeof original!=='function')continue;
    try{const replacement=new Proxy(original,{construct(target,args,newTarget){valid=false;return Reflect.construct(target,args,newTarget);}});globals[name]=replacement;workers[name]=replacement;}catch{valid=false;}
  }
  if(store)for(const method of ['get','getAll','set','delete']){
    const original=store[method];if(typeof original!=='function'){valid=false;continue;}
    try{
      const wrapper=async function(this:unknown,...args:unknown[]){
        if(method==='set'||method==='delete'){
          const input=args[0],target=typeof input==='string'?input:input&&typeof input==='object'&&'name' in input?input.name:undefined;
          if(target===name)writes=true;
        }
        pending++;
        try{
          const result=await Reflect.apply(original,this,args);
          if(method==='get'||method==='getAll'){
            const values=Array.isArray(result)?result:[result];if(values.some(value=>value&&value.name===name))read=true;
          }
          return result;
        }finally{pending--;}
      };
      const owner=Object.getPrototypeOf(store) as Record<string,unknown>,definition=Object.getOwnPropertyDescriptor(owner,method);
      if(!definition||typeof definition.value!=='function')throw Error('Unsupported cookie access surface');
      Object.defineProperty(owner,method,{...definition,value:wrapper});wrapped.push({owner,method,fn:wrapper});
    }catch{valid=false;}
  }
  Object.defineProperty(globalThis,key,{value:()=>({read,complete:valid&&!writes&&pending===0
    &&Object.getOwnPropertyDescriptor(Document.prototype,'cookie')?.get===getter
    &&Object.getOwnPropertyDescriptor(Document.prototype,'cookie')?.set===setter
    &&Object.entries(workers).every(([name,constructor])=>globals[name]===constructor)
    &&(!store||wrapped.every(({owner,method,fn})=>owner[method]===fn&&store[method]===fn))}),configurable:false,writable:false});
}

const sameCookie=(a:Cookie,b:Cookie)=>a.name===b.name&&a.domain===b.domain&&a.path===b.path
  &&a.secure===b.secure&&a.sameSite===b.sameSite&&(a.expires===-1)===(b.expires===-1);
const unknown=():CookieAccessPhase=>({authentication:'unknown',functionality:'unknown',complete:false,read:false,limitation:'unavailable'});
/** Separate bounded transport: Playwright's shared request context would apply
 * the original Set-Cookie before interception, briefly undoing HttpOnly. */
/** Internal developer-producer primitive; normal HTTP endpoints cannot supply
 * callbacks or interventions. Optional value/absence checks never export values. */
export async function runCookieFlow(source:BrowserContext,cookies:Cookie[],target:Cookie,origin:string,restricted:boolean,check:NativeCookieAccessCheck,signal:AbortSignal,options:{targetState?:'present'|'absent';preserveValue?:boolean}={}):Promise<CookieAccessPhase>{
  const scope=new URL(origin);
  if(scope.origin!==origin||!['http:','https:'].includes(scope.protocol)||!['127.0.0.1','localhost','[::1]'].includes(scope.hostname))throw Error('Cookie flow origin must be plain loopback');
  const browser=source.browser();if(!browser)return unknown();
  const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});
  let incomplete=false,requests=0,bytes=0,rejectBound:(error:Error)=>void=()=>{};
  const key='__vylnt_cookie_'+randomUUID().replaceAll('-',''),bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
  const network=new AbortController();
  // Up to 80 bounded, parallel resource requests each attach one abort listener.
  setMaxListeners(82,network.signal);
  const stop=(message:string)=>{rejectBound(Error(message));network.abort();void context.close().catch(()=>{});};
  const abort=()=>stop('Cookie flow cancelled'),timer=setTimeout(()=>stop('Cookie flow timed out'),10000);
  signal.addEventListener('abort',abort);
  try{return await Promise.race([bound,(async()=>{
    signal.throwIfAborted();
    await context.routeWebSocket('**/*',socket=>{incomplete=true;socket.close();});
    await context.route('**/*',async route=>{
      try{
        const url=new URL(route.request().url());
        if(url.origin!==origin||url.username||url.password||++requests>80||['worker','serviceworker'].includes(route.request().resourceType())){incomplete=true;await route.abort();return;}
        // No redirect following or shared cookie jar. Only the actual browser
        // receives Set-Cookie, after this target's flag has been enforced.
        const payload=route.request().postDataBuffer();if(payload&&payload.length>64*1024){incomplete=true;await route.abort();return;}
        const response=await transfer(url,route.request().method(),await route.request().allHeaders(),payload,network.signal,size=>{bytes+=size;if(bytes>8*1024*1024)throw Error('Cookie flow budget exceeded');}),headers=response.headers;
        // Playwright may not re-route the next leg of a real redirect. This v1
        // interaction therefore abstains on redirects before any leg can escape.
        if(response.status>=300&&response.status<400){incomplete=true;await route.abort();return;}
        const setCookies=response.cookies.map(value=>{
          if(!restricted||value.split('=',1)[0]!==target.name)return value;
          const attrs=value.split(';').slice(1).map(a=>a.trim()),paths=attrs.filter(a=>/^path=/i.test(a)),domains=attrs.filter(a=>/^domain=/i.test(a));
          const path=paths[0]?.slice(5)||url.pathname.slice(0,url.pathname.lastIndexOf('/'))||'/';
          const domain=domains[0]?.slice(7).replace(/^\./,'').toLowerCase()||url.hostname;
          if(paths.length>1||domains.length>1||path!==target.path||domain!==target.domain.replace(/^\./,'')){incomplete=true;return value;}
          return value.replace(/;\s*httponly\s*(?=;|$)/gi,'')+'; HttpOnly';
        });
        if(setCookies.length)headers['set-cookie']=setCookies.join('\n');
        for(const h of ['content-length','transfer-encoding'])delete headers[h];
        await route.fulfill({status:response.status,headers,body:response.body});
      }catch{incomplete=true;await route.abort().catch(()=>{});}
    });
    await context.addInitScript(instrument,{name:target.name,key});
    await context.addCookies(cookies.map(c=>c===target&&restricted?{...c,httpOnly:true}:c));
    const page=await context.newPage();page.setDefaultTimeout(3000);page.setDefaultNavigationTimeout(6000);
    let navigations=0;
    page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&++navigations>1)incomplete=true;});
    page.on('frameattached',()=>{incomplete=true;});page.on('worker',()=>{incomplete=true;});
    context.on('page',other=>{if(other!==page)incomplete=true;});
    const result=await check.check(page);
    if(!['authenticated','anonymous','unknown'].includes(result.authentication)||!['passed','failed','unknown'].includes(result.functionality))return unknown();
    if(new URL(page.url()).origin!==origin||context.pages().length!==1||page.frames().length!==1)return unknown();
    await page.waitForLoadState('networkidle',{timeout:1500});
    const observation=await page.evaluate(key=>{
      const capture=(globalThis as unknown as Record<string,unknown>)[key];
      return typeof capture==='function'?capture():{complete:false,read:false};
    },key) as {complete:boolean;read:boolean};
    const actual=(await context.cookies()).filter(c=>c.name===target.name);
    const held=options.targetState==='absent'?actual.length===0:actual.length===1&&sameCookie(actual[0],target)&&actual[0].httpOnly===(restricted||target.httpOnly)&&(!options.preserveValue||actual[0].value===target.value);
    const complete=!incomplete&&held&&observation.complete===true;
    return {authentication:result.authentication,functionality:result.functionality,read:observation.read===true,complete,
      ...(['first','second','unknown'].includes(result.preference??'')?{preference:result.preference}:{}),
      ...([200,401,403,'unknown'].includes(result.protectedStatus??'')?{protectedStatus:result.protectedStatus}:{}),
      ...(!complete?{limitation:incomplete?'unsupported-flow' as const:!held?'cookie-state-changed' as const:'accessor-coverage' as const}:{})};
  })()]);}catch(error){if(signal.aborted)throw error;return unknown();}
  finally{clearTimeout(timer);network.abort();signal.removeEventListener('abort',abort);await context.close().catch(()=>{});}
}

export async function measureCookieJavaScriptAccess(source:BrowserContext,report:Report,check:NativeCookieAccessCheck,signal?:AbortSignal):Promise<CookieAccessMeasurement>{
  const url=new URL(report.observation.url);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Cookie flows require a plain loopback origin');
  if(!/^[a-f0-9]{64}$/.test(check.identityHash))throw Error('Cookie flow identity is required');
  const combined=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(180000)]);combined.throwIfAborted();
  const result:CookieAccessMeasurement={version:cookieAccessVersion,scanId:report.scanId,originalScanHash:await contentHash(report),targets:[],checks:[]};
  const findings=report.findings.filter(f=>['CK-001','CK-002','CK-003'].includes(f.ruleId));
  const names=[...new Set(findings.map(f=>f.evidence.cookieName).filter((n):n is string=>typeof n==='string'))];
  if(names.length>6)throw Error('Cookie access probe budget exceeded');
  const cookies=(await source.cookies()).filter(c=>c.domain.replace(/^\./,'')===url.hostname);
  if(cookies.length>100)throw Error('Cookie access state budget exceeded');
  for(const name of names){
    combined.throwIfAborted();const matches=cookies.filter(c=>c.name===name),observed=report.observation.cookies?.filter(c=>c.name===name);
    if(matches.length!==1||observed?.length!==1||matches[0].partitionKey)continue;
    const target=matches[0],o=observed[0],sameSite=target.sameSite==='None'?'no_restriction':target.sameSite==='Strict'?'strict':'lax';
    if(o.secure!==target.secure||o.httpOnly!==target.httpOnly||o.sameSite!==sameSite||o.session!==(target.expires===-1))continue;
    const baseline=await runCookieFlow(source,cookies,target,url.origin,false,check,combined);
    const control:{findingIds:string[];baseline:CookieAccessPhase;restricted?:CookieAccessPhase;restored?:CookieAccessPhase}={findingIds:findings.filter(f=>f.evidence.cookieName===name).map(f=>f.id),baseline};result.checks.push(control);
    if(!baseline.complete||baseline.authentication!=='authenticated'||baseline.functionality!=='passed')continue;
    const restricted=await runCookieFlow(source,cookies,target,url.origin,true,check,combined),restored=await runCookieFlow(source,cookies,target,url.origin,false,check,combined);
    control.restricted=restricted;control.restored=restored;
    const required=assessCookieAccess(baseline,restricted,restored);if(required===undefined)continue;
    const witnessHash=await contentHash({version:cookieAccessVersion,check:check.identityHash,baseline,restricted,restored});
    const fact=(value:boolean):ProjectFact=>({value,source:'functional',coverage:'complete',witnessHash});
    for(const finding of findings.filter(f=>f.evidence.cookieName===name))result.targets.push({findingId:finding.id,facts:{cookieJsAccessObserved:fact(baseline.read),cookieJsAccessRequired:fact(required)}});
  }
  return result;
}

export function mergeCookieAccess(evidence:ProjectEvidence,measurement:CookieAccessMeasurement):ProjectEvidence{
  if(measurement.version!==cookieAccessVersion||measurement.scanId!==evidence.scanId||measurement.originalScanHash!==evidence.originalScanHash)throw Error('Cookie access measurement does not match the scan');
  const merged=structuredClone(evidence),seen=new Set<string>();
  for(const entry of measurement.targets){
    if(seen.has(entry.findingId))throw Error('Duplicate cookie access target');seen.add(entry.findingId);
    const target=merged.targets.find(t=>t.findingId===entry.findingId&&['CK-001','CK-002','CK-003'].includes(t.category));
    if(!target||Object.keys(entry.facts).sort().join(',')!=='cookieJsAccessObserved,cookieJsAccessRequired')throw Error('Invalid cookie access target');
    for(const name of ['cookieJsAccessObserved','cookieJsAccessRequired'] as const){
      const fact=entry.facts[name];if(fact.source!=='functional'||fact.coverage!=='complete'||typeof fact.value!=='boolean')throw Error('Invalid cookie access fact');
      const existing=target.facts[name];if(existing&&JSON.stringify(existing)!==JSON.stringify(fact))throw Error('Conflicting cookie access fact');target.facts[name]=fact;
    }
    if(entry.facts.cookieJsAccessRequired.value&&!entry.facts.cookieJsAccessObserved.value)throw Error('Required access must have been observed');
    if(entry.facts.cookieJsAccessRequired.witnessHash!==entry.facts.cookieJsAccessObserved.witnessHash)throw Error('Cookie access witnesses differ');
  }
  return projectEvidenceSchema.parse(merged);
}

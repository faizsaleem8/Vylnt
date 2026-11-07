import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import ts from 'typescript';
import type {BrowserContext} from 'playwright';
import {guardProjectRedirects} from '../apps/cli/project-redirect-guard';
import type {SessionProfile} from '../scripts/native-session-profile.mjs';

const clientPath='/fixture';
type Mutation={path:string;method:'POST'|'PUT'|'PATCH'|'DELETE'};
const methods=new Set(['post','put','patch','delete']);

/** The exact verified source uses top-level literal mounts and router calls.
 * Unsupported registration syntax fails closed rather than guessing coverage. */
export function fieldPointMutationInventory(read:(file:string)=>string){
  const parse=(file:string)=>ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const source=parse('src/app.js'),imports=new Map<string,string>();
  for(const node of source.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&
    /^\.\/[a-z-]+\/routes\.js$/.test(node.moduleSpecifier.text)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)){
    for(const entry of node.importClause.namedBindings.elements){
      assert.ok(!entry.propertyName);imports.set(entry.name.text,'src/'+node.moduleSpecifier.text.slice(2));
    }
  }
  const factory=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createApp');
  assert.ok(factory&&ts.isFunctionDeclaration(factory)&&factory.body);
  const visited=new Set<string>(),routes:Mutation[]=[];
  let guarded=false;
  for(const statement of factory.body.statements){
    if(!ts.isExpressionStatement(statement)||!ts.isCallExpression(statement.expression))continue;
    const call=statement.expression,member=call.expression;
    if(!ts.isPropertyAccessExpression(member)||member.expression.getText(source)!=='app')continue;
    assert.ok(!methods.has(member.name.text)&&!['all','route'].includes(member.name.text),'Unexpected direct mutation registration');
    if(member.name.text!=='use')continue;
    const [mount,handler]=call.arguments;
    if(!mount||!ts.isStringLiteral(mount))continue;
    if(mount.text==='/api'){
      if(call.arguments.some(arg=>arg.getText(source)==='originCheck(config.allowedOrigins)')){
        assert.ok(!guarded&&visited.size===0);guarded=true;
      }else assert.equal(handler?.getText(source),'notFoundHandler','Unexpected API middleware');
      continue;
    }
    if(mount.text==='/vendor/leaflet'){
      assert.ok(handler&&ts.isCallExpression(handler)&&handler.expression.getText(source)==='express.static');
      continue;
    }
    assert.ok(guarded&&/^\/api\/[a-z-]+$/.test(mount.text)&&handler&&ts.isCallExpression(handler),'Unsupported mount: '+mount.text);
    const name=handler.expression.getText(source),file=imports.get(name);
    assert.ok(file&&!visited.has(name),'Unexpected or duplicate router mount');visited.add(name);
    const module=parse(file),router=module.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
    assert.ok(router&&ts.isFunctionDeclaration(router)&&router.body);
    const walk=(node:ts.Node)=>{
      if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(module)==='router'){
        const method=node.expression.name.text;
        assert.ok(methods.has(method)||['get','use'].includes(method),'Unsupported router registration');
        if(methods.has(method)){
          const literal=node.arguments[0];assert.ok(literal&&ts.isStringLiteral(literal)&&/^\/(?:[a-zA-Z0-9:_-]+\/?)*$/.test(literal.text));
          const path=mount.text+(literal.text==='/'?'':literal.text.replace(/:[a-zA-Z]+/g,'1'));
          routes.push({path,method:method.toUpperCase() as Mutation['method']});
        }
      }
      ts.forEachChild(node,walk);
    };
    walk(router.body);
  }
  assert.ok(guarded&&visited.size===imports.size&&routes.length>20&&routes.length<=50,'Incomplete pinned FieldPoint mutation inventory');
  assert.equal(new Set(routes.map(route=>route.method+' '+route.path)).size,routes.length);
  return routes;
}
async function frontend(host:string){
  const server=createServer((request,response)=>{
    if(request.url!==clientPath||request.method!=='GET'){response.writeHead(404).end();return;}
    response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'}).end('<!doctype html><title>Disposable FieldPoint client</title>');
  });
  await new Promise<void>((done,reject)=>{server.once('error',reject);server.listen(0,host,done);});
  return {origin:'http://'+host+':'+(server.address() as {port:number}).port,async close(){
    server.closeAllConnections();
    if(server.listening)await new Promise<void>(done=>server.close(()=>done()));
  }};
}

export async function openFieldPointCrossSiteClients(){
  const trusted=await frontend('127.0.0.2');
  try{
    const hostile=await frontend('127.0.0.3');
    const deliveries=new Map<string,boolean[]>();
    return {trusted:trusted.origin,hostile:hostile.origin,
      observePost(origin:string,fetchSite:string|string[]|undefined){
        const records=deliveries.get(origin)??[];
        if(records.length<2)records.push(fetchSite==='cross-site');
        deliveries.set(origin,records);
      },
      takePost(origin:string){
        const records=deliveries.get(origin);
        deliveries.delete(origin);
        return records?.length===1&&records[0]===true;
      },
      close:async()=>{await Promise.all([trusted.close(),hostile.close()]);}};
  }catch(error){await trusted.close();throw error;}
}

export async function probeFieldPointCrossSite(source:BrowserContext,target:string,clients:{trusted:string;hostile:string;takePost(origin:string):boolean},
  readback:(name:string)=>'owned'|'unchanged'|'different',inventory:readonly Mutation[],snapshot:()=>string,signal:AbortSignal,profile?:SessionProfile,
  mode:'protected'|'overbroad'='protected'){
  assert.match(target,/^http:\/\/127\.0\.0\.1:\d+\/api\/sites$/);
  assert.match(clients.trusted,/^http:\/\/127\.0\.0\.2:\d+$/);
  assert.match(clients.hostile,/^http:\/\/127\.0\.0\.3:\d+$/);
  const browser=source.browser();
  assert.ok(browser,'Expected the collector browser');
  const cookies=await source.cookies(target);
  assert.equal(cookies.length,1);
  const cookie=cookies[0];
  assert.equal(cookie.name,'fp_session');assert.ok(cookie.secure&&cookie.sameSite==='None');
  assert.equal(cookie.httpOnly,profile?.httpOnly??true);
  if(profile)assert.equal(cookie.expires===-1,profile.session);
  const apiOrigin=new URL(target).origin;
  async function run(origin:string,cookieMode:'none'|'lax'|'absent',route:Mutation={method:'POST',path:'/api/sites'},simpleForm=false){
    signal.throwIfAborted();
    const context=await browser!.newContext({serviceWorkers:'block',acceptDownloads:false});
    const cancel=()=>{void context.close().catch(()=>{});};
    signal.addEventListener('abort',cancel,{once:true});
    let redirects:Awaited<ReturnType<typeof guardProjectRedirects>>|undefined;
    const name='disposable-'+randomUUID(),client=origin+clientPath,urlTarget=apiOrigin+route.path;
    let postCount=0,optionCount=0,cookieSent=false,originVerified=false,unexpected=false;
    try{
      if(cookieMode!=='absent')await context.addCookies([{...cookie,sameSite:cookieMode==='lax'?'Lax':'None'}]);
      await context.routeWebSocket('**/*',socket=>{unexpected=true;return socket.close();});
      await context.route('**/*',async intercepted=>{
        const request=intercepted.request(),url=request.url(),method=request.method();
        if(url===client&&method==='GET'){await intercepted.continue();return;}
        if(url===urlTarget&&method==='OPTIONS'&&++optionCount===1){await intercepted.continue();return;}
        if(url===urlTarget&&method===route.method&&++postCount===1){
          const headers=await request.allHeaders();
          originVerified=headers.origin===origin;
          cookieSent=(headers.cookie??'').split(';').some(part=>part.trim()===cookie.name+'='+cookie.value);
          await intercepted.continue();return;
        }
        await intercepted.abort();
        if(url!==origin+'/favicon.ico'||method!=='GET')unexpected=true;
      });
      const page=await context.newPage();
      redirects=await guardProjectRedirects(page,new Set([origin,new URL(target).origin]),{rejectAll:true,rejected:()=>{unexpected=true;}});
      const entry=await page.goto(client,{waitUntil:'load',timeout:7000});
      assert.equal(entry?.status(),200);
      const result=await page.evaluate(async ({target,name,method,simpleForm})=>{
        try{
          const response=await fetch(target,{method,credentials:'include',redirect:'error',signal:AbortSignal.timeout(6000),
            headers:{'content-type':simpleForm?'application/x-www-form-urlencoded':'application/json'},
            body:simpleForm?'name='+encodeURIComponent(name):JSON.stringify({name,lat:40,lng:-74,category:'office'})});
          const status=response.status;
          return {status,nativeOriginDenial:status===403&&(await response.json()).error==='Cross-origin request blocked'};
        }catch{return {status:0,nativeOriginDenial:false};}
      },{target:urlTarget,name,method:route.method,simpleForm});
      signal.throwIfAborted();
      const serverCrossSite=clients.takePost(origin);
      return {complete:!unexpected&&postCount===1&&originVerified&&serverCrossSite&&context.pages().length===1&&page.url()===client,
        ...result,cookieSent,state:readback(name),originVerified,serverCrossSite,unexpected};
    }finally{
      signal.removeEventListener('abort',cancel);
      await redirects?.close();await context.close();
    }
  }
  const counterfactualOrigin=mode==='overbroad'?clients.hostile:clients.trusted;
  const trusted=await run(clients.trusted,'none'),hostile=await run(clients.hostile,'none'),anonymous=await run(counterfactualOrigin,'absent');
  const lax=await run(counterfactualOrigin,'lax'),before=snapshot();
  const hostileRepeated=mode==='overbroad'?await run(clients.hostile,'none'):undefined;
  let jsonDenied=0,formDenied=0,formRoutes=0;
  for(const route of mode==='protected'?inventory:[]){
    const denied=await run(clients.hostile,'none',route);
    if(denied.complete&&denied.cookieSent&&denied.nativeOriginDenial&&denied.state==='unchanged')jsonDenied++;
    if(route.method==='POST'){
      formRoutes++;
      const form=await run(clients.hostile,'none',route,true);
      if(form.complete&&form.cookieSent&&form.nativeOriginDenial&&form.state==='unchanged')formDenied++;
    }
  }
  const stateUnchanged=snapshot()===before;
  const restored=await run(clients.trusted,'none');
  const coverage={registeredMutations:inventory.length,jsonDenied,formRoutes,formDenied,stateUnchanged};
  return {version:'vylnt-fieldpoint-cross-site-controls-v2',scope:mode==='protected'?'mounted FieldPoint API mutations':'FieldPoint site creation',trusted,hostile,anonymous,lax,restored,
    ...(hostileRepeated?{hostileRepeated}:{}),
    cookie:{secure:cookie.secure,httpOnly:cookie.httpOnly,session:cookie.expires===-1,sameSite:'no_restriction'},
    coverage,routeCoverage:mode==='protected'&&jsonDenied===inventory.length&&formDenied===formRoutes&&stateUnchanged?'complete':'partial',eligibleForTraining:false} as const;
}

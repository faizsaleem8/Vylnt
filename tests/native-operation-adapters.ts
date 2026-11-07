/** Reviewed native operations; oracle content/secrets live only in disposable runs. */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import type {BrowserContext,Page,Frame} from 'playwright';
import type {NativeOperationControls} from '../packages/ml/project-seed-corpus';

export const operationDefinitions={
  portal:{path:'/api/groups',mutation:'/api/groups',entry:'server/src/index.js',dependencyDirectory:'.',database:'data/data.db',access:'public',typescript:true},
  'personal-knowledge-manager':{path:'/api/notes',mutation:'/api/notes',entry:'src/backend/server.js',dependencyDirectory:'src/backend',database:'data/pkm.sqlite',access:'header-authentication',typescript:true},
  stockbase:{path:'/api/equipos',mutation:'/api/equipos',entry:'server.js',dependencyDirectory:'.',database:'stockbase.db',access:'header-authentication',typescript:false},
  '8star-links':{path:'/api/nodes',mutation:'/api/nodes',entry:'server.js',dependencyDirectory:'.',database:'data/links.sqlite',access:'public',typescript:false},
  'anonymous-notepad':{path:'/vylnt-document',mutation:'/vylnt-document',entry:'index.js',dependencyDirectory:'.',database:'database.sqlite',access:'document-password',typescript:false},
} as const;
export type OperationFamily=keyof typeof operationDefinitions;
export interface OperationRun {family:OperationFamily;origin:string;apiOrigin?:string;password:string;dbPath:string;headers:Record<string,string>;privateValues:string[]}
const nativeText='VYLNT ephemeral native operation';
const json={maxRedirects:0,timeout:5000};

export async function prepareOperation(context:BrowserContext,run:OperationRun){
  if(run.family==='personal-knowledge-manager')run.headers={'x-api-key':run.password};
  if(run.family==='stockbase'){
    const response=await context.request.post(run.origin+'/api/login',{...json,data:{password:run.password}});assert.equal(response.status(),200);
    const body=await response.json();assert.equal(body.role,'admin');assert.match(body.token,/^[a-f0-9]{64}$/);
    run.headers={'x-session-token':body.token};run.privateValues.push(body.token);
  }
  // These requests never follow a redirect. Browser headers apply only to the
  // explicit run origin, including frame controls; credentials aren't global.
  if(Object.keys(run.headers).length)await context.route(run.origin+'/**',route=>route.continue({headers:{...route.request().headers(),...run.headers}}));
  if(run.family==='anonymous-notepad'){
    const response=await context.request.post((run.apiOrigin??run.origin)+operationDefinitions[run.family].path,{...json,data:{content:nativeText,author:'fixture-owner'}});assert.equal(response.status(),200);
  }
}

export async function operationHealthy(frame:Page|Frame,family:OperationFamily){
  return frame.evaluate(which=>{
    if(which==='anonymous-notepad')return document.querySelector('#content') instanceof HTMLTextAreaElement;
    try{const body=JSON.parse(document.querySelector('pre')?.textContent??'');return which==='8star-links'?Array.isArray(body.nodes):Array.isArray(body);}catch{return false;}
  },family);
}

async function rows(run:OperationRun){
  const db=new DatabaseSync(run.dbPath,{readOnly:true});try{
    const query={portal:'SELECT title FROM groups','personal-knowledge-manager':'SELECT title,content FROM notes',stockbase:'SELECT id,alias FROM equipos','8star-links':'SELECT title FROM nodes','anonymous-notepad':'SELECT content,password FROM Notes WHERE endpoint = \'vylnt-document\''}[run.family];
    return db.prepare(query).all();
  }finally{db.close();}
}
export async function exerciseOperation(page:Page|undefined,context:BrowserContext,run:OperationRun):Promise<NativeOperationControls>{
  const def=operationDefinitions[run.family],url=run.origin+def.mutation;
  if(page)assert.ok(await operationHealthy(page,run.family),'Native response healthy');
  else{
    assert.ok(run.family==='8star-links'||run.family==='portal'||run.family==='personal-knowledge-manager','An API-only oracle must have a reviewed adapter');
    const response=await context.request.get(url,{...json,headers:run.headers});
    assert.equal(response.status(),200,'Native response healthy');
    const body=await response.json();
    assert.ok(Array.isArray(run.family==='8star-links'?body.nodes:body),'Native response shape');
  }
  const bodies:Record<OperationFamily,object>={portal:{title:nativeText},'personal-knowledge-manager':{title:nativeText,content:'Disposable local text'},
    stockbase:{id:'vylnt-fixture-equipment',alias:nativeText},'8star-links':{kind:'folder',title:nativeText},'anonymous-notepad':{content:nativeText}};
  if(run.family==='anonymous-notepad'){
    assert.ok(page);
    const [response]=await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'&&r.url()===url,{timeout:5000}),page.locator('#content').fill(nativeText+' updated')]);
    assert.equal(response.status(),200,'Native document update');
    assert.equal((await rows(run))[0]?.content,nativeText+' updated');
    const api=(run.apiOrigin??run.origin)+def.mutation;
    // Native password route and wrong/correct password write controls; no
    // authentication-cookie or whole-site protection conclusion is inferred.
    assert.equal((await context.request.post(api+'/update-password',{...json,data:{author:'fixture-owner',password:run.password}})).status(),200);
    assert.equal((await context.request.post(api,{...json,data:{content:'denied',password:'wrong-fixture'}})).status(),403);
    assert.equal((await rows(run))[0]?.content,nativeText+' updated');
    assert.equal((await context.request.post(api,{...json,data:{content:nativeText,password:run.password}})).status(),200);
    const final=await rows(run);assert.equal(final.length,1);assert.equal(final[0].content,nativeText);assert.match(String(final[0].password),/^\$2[aby]\$/);
    return{sourceHealthy:true,nativeWriteReadback:true,access:def.access,accessControl:'denied'};
  }
  const response=await context.request.post(url,{...json,headers:run.headers,data:bodies[run.family]});assert.equal(response.status(),201,'Native create');
  // Portal's native SQL.js writer flushes after a bounded debounce. Reopen the
  // file for independent reads; don't inject a flush implementation.
  let data:Awaited<ReturnType<typeof rows>>=[];
  for(let i=0;i<30;i++){data=await rows(run);if(data.length===1)break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(data.length,1,'Independent SQLite row count');assert.equal(data[0][run.family==='stockbase'?'alias':'title'],nativeText,'Independent SQLite content');
  if(run.family==='personal-knowledge-manager')assert.equal(data[0].content,'Disposable local text');
  if(run.family==='stockbase')assert.equal(data[0].id,'vylnt-fixture-equipment');
  const anonymous=await context.browser()!.newContext({serviceWorkers:'block'});try{
    const response=await anonymous.request.post(url,{...json,data:bodies[run.family]});
    if(def.access==='public'){
      assert.equal(response.status(),201,'Public native operation allowed');
      for(let i=0;i<30;i++){data=await rows(run);if(data.length===2)break;await new Promise(r=>setTimeout(r,100));}assert.equal(data.length,2);
    }else{
      assert.equal(response.status(),401,'Native missing-token denial');assert.equal((await rows(run)).length,1);
      const badHeader=run.family==='stockbase'?'x-session-token':'x-api-key';
      const invalid=await anonymous.request.post(url,{...json,headers:{[badHeader]:'invalid-fixture'},data:bodies[run.family]});assert.ok([401,403].includes(invalid.status()));assert.equal((await rows(run)).length,1);
    }
  }finally{await anonymous.close();}
  return{sourceHealthy:true,nativeWriteReadback:true,access:def.access,accessControl:def.access==='public'?'allowed':'denied'};
}

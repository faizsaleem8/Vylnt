/** Explicit pinned application adapters. No source rewrites or model labels. */
import assert from 'node:assert/strict';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import type {BrowserContext,Page} from 'playwright';
import type {Report} from '../packages/core';
import {measureCrossSite} from '../apps/cli/project-cross-site';

export type NextFamily='bookwise'|'wikiflow'|'habit-tracker';
export const wikiflowProfileCookie='wikiflow-session';
export function wikiflowSessionProfile(source:string){
  const original="name: 'wf_sess',";
  assert.equal(source.split(original).length,2,'Pinned Wikiflow session initializer differs');
  return source.replace(original,`name: '${wikiflowProfileCookie}',`);
}
export interface NativeRunSecrets {origin:string;username:string;password:string;secret:string;dbPath:string}
export interface NativePrincipal {id:number;signatureVerified:boolean;csrf?:string}
export const habitLogoutPath='/api/auth/logout';

/** Replay the body-independent native logout with a reset of disposable state. */
export async function probeHabitLogout(context:BrowserContext,report:Report,run:NativeRunSecrets,identityHash:string,signal:AbortSignal){
  const cookies=await context.cookies(run.origin),cookie=cookies[0];
  assert.ok(cookies.length===1&&cookie.name==='habit_tracker.sid');
  const signed=decodeURIComponent(cookie.value),split=signed.lastIndexOf('.');
  assert.ok(signed.startsWith('s:')&&split>2);
  const sid=signed.slice(2,split);
  const db=new DatabaseSync(run.dbPath);
  try{
    db.exec('PRAGMA busy_timeout=5000');
    const read=db.prepare('SELECT session, expires FROM sessions WHERE sid=?');
    const original=read.get(sid);
    assert.ok(typeof original?.session==='string'&&typeof original.expires==='number'&&original.expires>Date.now());
    assert.equal(JSON.parse(original.session).authenticated,true);
    const restore=db.prepare('INSERT INTO sessions (sid, session, expires) VALUES (?, ?, ?) ON CONFLICT(sid) DO NOTHING');
    const count=db.prepare('SELECT COUNT(*) AS total FROM sessions');
    let previousCount=0;
    const measurement=await measureCrossSite(context,report,{identityHash,path:habitLogoutPath,cookieName:cookie.name,
      prepare:async()=>{
        restore.run(sid,original.session,original.expires);
        assert.deepEqual(read.get(sid),original);
        previousCount=Number(count.get()!.total);
        // Keep the browser form body observable. Native logout ignores it.
        return {fixture:'logout'};
      },
      observe:async()=>{
        const remaining=read.get(sid),currentCount=Number(count.get()!.total);
        if(!remaining&&currentCount===previousCount-1)return 'changed';
        return remaining?.session===original.session&&remaining.expires===original.expires&&currentCount===previousCount?'unchanged':'unknown';
      }},signal);
    const {sameSite,crossSite,repeated,anonymous}=measurement.controls;
    const expectedWrites=[sameSite,crossSite,repeated].every(result=>result.status===200&&result.outcome==='changed-with-cookie');
    // The endpoint returns success even without a cookie. Storage distinguishes the no-op.
    if(!expectedWrites||!anonymous.complete||!anonymous.originVerified||anonymous.cookieSent||anonymous.status!==200||anonymous.state!=='unchanged'){
      console.error('Native logout control states:',JSON.stringify(measurement.controls));
      throw Error('Native logout controls were incomplete');
    }
    return measurement;
  }finally{db.close();}
}

function openIndependentRead(path:string){
  const db=new DatabaseSync(path,{readOnly:true});
  db.exec('PRAGMA busy_timeout=5000');
  return db;
}
export const nextFamilyDefinitions={
  'habit-tracker':{path:'/api/auth/me',mutation:'/api/notes',sessionOracle:'SQLite signed owner session and native note readback',
    bootstrap:"(async()=>{process.env.NODE_ENV='development';process.env.AUTH_USERNAME=process.env.VYLNT_SYNTH_USER;const r=require('node:module').createRequire(require.resolve('./app/server/package.json'));process.env.AUTH_PASSWORD_HASH=await r('bcryptjs').hash(process.env.ADMIN_PASSWORD,10);await import('./app/server/index.js')})().catch(()=>process.exit(2));"},
  bookwise:{path:'/categories/api',mutation:'/categories/api',sessionOracle:'signed session and SQLite user/category ownership',
    bootstrap:"(async()=>{const r=require('node:module').createRequire(require.resolve('./app/package.json'));const m=r('./server/models');await m.sequelize.sync({force:true});await m.User.create({username:process.env.VYLNT_SYNTH_USER,email:process.env.VYLNT_SYNTH_USER+'@example.invalid',name:'Synthetic',lastName:'Fixture',password:await r('bcrypt').hash(process.env.ADMIN_PASSWORD,10),isVerified:true});r('./server/app').listen(0)})().catch(()=>process.exit(2));"},
  wikiflow:{path:'/api/session',mutation:'/api/terms',sessionOracle:'signed session payload and SQLite user/term ownership',
    bootstrap:"(async()=>{const r=require('node:module').createRequire(require.resolve('./app/package.json'));const {db}=r('./server/db');db.prepare('INSERT INTO users (username,password_hash) VALUES (?,?)').run(process.env.VYLNT_SYNTH_USER,await r('bcrypt').hash(process.env.ADMIN_PASSWORD,10));r('./server.js')})().catch(()=>process.exit(2));"}
} as const;

export async function checkNextAuthentication(family:NextFamily,page:Page,origin:string){
  if(family==='bookwise'){
    // Inspect the native authentication middleware's redirect without loading
    // its unrelated public landing page/CDN assets. Requests are fixed-origin
    // GETs with redirects disabled and share this browser context's cookie jar.
    const probe=await page.request.get(origin+'/categories/api',{maxRedirects:0,timeout:5000});
    if(probe.status()===302&&probe.headers().location==='/?sessionExpired=1')return 'anonymous' as const;
    if(probe.status()!==200)return 'unknown' as const;
    const response=await page.goto(origin+'/categories/api');
    if(response?.status()!==200||new URL(page.url()).pathname!=='/categories/api')return 'unknown' as const;
    try{return Array.isArray(await response.json())?'authenticated' as const:'unknown' as const;}catch{return 'unknown' as const;}
  }
  const response=await page.goto(origin+nextFamilyDefinitions[family].path);
  if(response?.status()!==200)return 'unknown' as const;
  const data=await response.json();return data.authenticated===true?'authenticated' as const:data.authenticated===false?'anonymous' as const:'unknown' as const;
}

function sameSignature(actual:string,expected:string){assert.equal(actual.length,expected.length);assert.ok(timingSafeEqual(Buffer.from(actual),Buffer.from(expected)),'Native signature');}
export async function loginNextFamily(family:NextFamily,context:BrowserContext,run:NativeRunSecrets,wikiflowCookie='wf_sess'):Promise<NativePrincipal>{
  const {origin,username,password,secret,dbPath}=run;let csrf:string|undefined;
  if(family==='habit-tracker'){
    const response=await context.request.post(origin+'/api/auth/login',{data:{username,password},maxRedirects:0,timeout:10000});assert.equal(response.status(),200);
    const cookies=await context.cookies();assert.equal(cookies.length,1);const token=decodeURIComponent(cookies[0].value);assert.ok(token.startsWith('s:'));const split=token.lastIndexOf('.'),id=token.slice(2,split);
    sameSignature(token.slice(split+1),createHmac('sha256',secret).update(id).digest('base64').replace(/=+$/,''));
    const db=new DatabaseSync(dbPath,{readOnly:true});try{const row=db.prepare('SELECT session,expires FROM sessions WHERE sid=?').get(id);assert.ok(row);assert.equal(JSON.parse(String(row.session)).authenticated,true);assert.ok(Number(row.expires)>Date.now());}finally{db.close();}
    return{id:1,signatureVerified:true};
  }
  if(family==='wikiflow'){
    const token=await context.request.get(origin+'/api/csrf',{maxRedirects:0,timeout:5000});assert.equal(token.status(),200);csrf=(await token.json()).token;assert.equal(typeof csrf,'string');
  }
  const login=await context.request.post(origin+(family==='bookwise'?'/auth/login':'/api/login'),{data:family==='bookwise'?{emailOrUsername:username,password}:{username,password},headers:csrf?{'x-csrf-token':csrf}:{},maxRedirects:0,timeout:10000});
  assert.equal(login.status(),family==='bookwise'?302:200,'Native login');
  if(family==='bookwise')assert.equal(login.headers().location,'/dashboard');
  const cookies=await context.cookies();assert.equal(cookies.length,family==='bookwise'?1:2,'Native session cookie inventory');
  const db=openIndependentRead(dbPath);
  try{
    const user=db.prepare(family==='bookwise'?'SELECT id FROM Users WHERE username = ?':'SELECT id FROM users WHERE username = ?').get(username);assert.ok(Number.isSafeInteger(user?.id));const id=Number(user!.id);
    if(family==='bookwise'){
      const token=decodeURIComponent(cookies[0].value);assert.ok(token.startsWith('s:'));const split=token.lastIndexOf('.');
      sameSignature(token.slice(split+1),createHmac('sha256',secret).update(token.slice(2,split)).digest('base64').replace(/=+$/,''));
      const profile=await context.request.get(origin+'/users/api',{maxRedirects:0,timeout:5000});assert.equal(profile.status(),200);assert.equal((await profile.json()).id,id,'Native session maps to independently read user');
    }else{
      const payload=cookies.find(c=>c.name===wikiflowCookie),signature=cookies.find(c=>c.name===wikiflowCookie+'.sig');assert.ok(payload&&signature);
      sameSignature(signature.value,createHmac('sha1',secret).update(wikiflowCookie+'='+payload.value).digest('base64url'));
      const session=JSON.parse(Buffer.from(payload.value,'base64').toString('utf8'));assert.equal(session.uid,id,'Signed payload maps to independent user row');assert.equal(session.csrf,csrf);
    }
    // Native cookie names may not trigger rules. Still verify actual anonymous
    // session denial independently without manufacturing a detector finding.
    const anon=await context.browser()!.newContext({serviceWorkers:'block'});
    try{
      const response=await anon.request.get(origin+nextFamilyDefinitions[family].path,{maxRedirects:0,timeout:5000});
      if(family==='bookwise'){assert.equal(response.status(),302);assert.ok(response.headers().location.startsWith('/?sessionExpired='));}
      else{assert.equal(response.status(),200);assert.equal((await response.json()).authenticated,false);}
    }finally{await anon.close();}
    return{id,signatureVerified:true,csrf};
  }finally{db.close();}
}

export async function writeNextFamily(family:NextFamily,context:BrowserContext,run:NativeRunSecrets,principal:NativePrincipal){
  if(family==='habit-tracker'){
    const body={month:'2026-11',content:'VYLNT disposable note'},url=run.origin+'/api/notes';
    const written=await context.request.post(url,{data:body,maxRedirects:0,timeout:5000});assert.equal(written.status(),201);
    const db=new DatabaseSync(run.dbPath,{readOnly:true});try{
      const rows=db.prepare('SELECT month,content FROM notes').all();assert.equal(rows.length,1);assert.equal(rows[0].month,body.month);assert.equal(rows[0].content,body.content);
      const anon=await context.browser()!.newContext({serviceWorkers:'block'});try{assert.equal((await anon.request.post(url,{data:body,maxRedirects:0,timeout:5000})).status(),401);}finally{await anon.close();}
      assert.equal(db.prepare('SELECT COUNT(*) AS count FROM notes').get()!.count,1);
      return{nativeWrite:true,anonymousDenied:true,csrfRejected:undefined};
    }finally{db.close();}
  }
  const path=nextFamilyDefinitions[family].mutation,body=family==='bookwise'?{name:'VYLNT disposable category'}:{term:'VYLNT disposable term'};
  const headers:Record<string,string>=principal.csrf?{'x-csrf-token':principal.csrf}:{};
  const written=await context.request.post(run.origin+path,{data:body,headers,maxRedirects:0,timeout:5000});assert.equal(written.status(),family==='bookwise'?201:200,'Native protected write');
  const db=openIndependentRead(run.dbPath),table=family==='bookwise'?'Categories':'terms';
  try{
    const row=db.prepare(family==='bookwise'?'SELECT userId AS owner, name AS value FROM Categories':'SELECT user_id AS owner, term AS value FROM terms').all();
    assert.equal(row.length,1);assert.equal(row[0].owner,principal.id);assert.equal(row[0].value,family==='bookwise'?body.name:body.term,'Independent row content');
    let csrfRejected: boolean|undefined;
    if(family==='wikiflow'){
      const rejected=await context.request.post(run.origin+path,{data:{term:'VYLNT rejected control'},maxRedirects:0,timeout:5000});csrfRejected=rejected.status()===403;assert.ok(csrfRejected,'Actual missing-CSRF denial');
      const wrong=await context.request.post(run.origin+path,{data:{term:'VYLNT rejected control'},headers:{'x-csrf-token':'incorrect-fixture-token'},maxRedirects:0,timeout:5000});assert.equal(wrong.status(),403);
    }
    const anon=await context.browser()!.newContext({serviceWorkers:'block'});
    try{
      let anonHeaders:Record<string,string>={};
      if(family==='wikiflow'){
        const csrfResponse=await anon.request.get(run.origin+'/api/csrf',{maxRedirects:0,timeout:5000});anonHeaders={'x-csrf-token':(await csrfResponse.json()).token};
      }
      // Wikiflow gets a valid anonymous CSRF token: denial must be authentication,
      // not a failed CSRF check masquerading as authorization evidence.
      const denied=await anon.request.post(run.origin+path,{data:body,headers:anonHeaders,maxRedirects:0,timeout:5000});
      assert.equal(denied.status(),family==='bookwise'?302:401,'Anonymous native mutation denial');
      if(family==='bookwise')assert.ok(denied.headers().location.startsWith('/?sessionExpired='));
    }finally{await anon.close();}
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM '+table).get()!.count,1,'Denied mutations left storage unchanged');
    return{nativeWrite:true,anonymousDenied:true,csrfRejected};
  }finally{db.close();}
}

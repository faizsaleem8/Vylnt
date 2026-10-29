import assert from 'node:assert/strict';
import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,rm,realpath,lstat,copyFile} from 'node:fs/promises';
import {join,resolve,dirname,relative,sep,isAbsolute} from 'node:path';
import {createServer} from 'node:net';
import {createServer as createHttpServer,request} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {cpus,totalmem} from 'node:os';
import type {Page} from 'playwright';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {measureAuthenticationCookies,mergeAuthenticationRole,type CookieDependencyMeasurement} from '../apps/cli/project-functional';
import {measureCookieJavaScriptAccess,mergeCookieAccess,type CookieAccessMeasurement} from '../apps/cli/project-cookie-access';
import {inspectProject} from '../apps/server/project-inspection';
import {gateConfigSchema} from '../apps/cli/gate-config';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {prepareProjectContexts,guardProjectAssessment,verifyProjectEvidence} from '../packages/core/project-evidence';
import {contentHash} from '../packages/core/integrity';
import {ProjectSigner} from '../apps/server/project-signing';
import {createTabinatorSeedBatch} from '../packages/ml/project-seed-corpus';

// Source suitability/development exposure only. No training label or inference.
const source=resolve('.local/ml-native-tabinator'),parent=resolve('.local');
const started=performance.now();let browserVersion='unknown';
const meta=JSON.parse(await readFile('ml/applications/native/tabinator.source.json','utf8'));
const execute=promisify(execFile),cancel=new AbortController();
const interrupt=()=>cancel.abort(),message=(input:unknown)=>{if(input&&typeof input==='object'&&'type' in input&&input.type==='cancel')interrupt();};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);process.on('message',message);
const gitEnv={...process.env};for(const key of Object.keys(gitEnv))if(key.startsWith('GIT_'))delete gitEnv[key];
const git=async(args:string[])=>(await execute('git',args,{cwd:source,env:gitEnv,windowsHide:true,timeout:10000,signal:cancel.signal})).stdout.trim();
async function verifyPinnedSource(){
  assert.equal(await git(['rev-parse','HEAD']),meta.revision);
  const files:string[]=[];let total=0;
  for(const entry of (await git(['ls-tree','-rz','--full-tree','HEAD'])).split('\0').filter(Boolean)){
    const matched=entry.match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/s);assert.ok(matched,'Only pinned regular source files are supported');
    const [,mode,expected,file]=matched;void mode;const full=resolve(source,file),within=relative(source,full);
    assert.ok(within!=='..'&&!within.startsWith('..'+sep)&&!isAbsolute(within));
    const info=await lstat(full);assert.ok(info.isFile()&&!info.isSymbolicLink());assert.ok((await realpath(full)).startsWith(await realpath(source)+sep));
    assert.ok(info.size<=4*1024*1024&&(total+=info.size)<=16*1024*1024,'Native source budget');
    const bytes=await readFile(full),actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(actual,expected,'Pinned tracked source must be unchanged');files.push(file);
  }
  assert.ok(files.length>0&&files.length<=200,'Native source file budget');return files;
}
const pinnedFiles=await verifyPinnedSource();
assert.equal(await git(['rev-parse','HEAD:LICENSE']),meta.licenseGitBlob);
const hash=(input:Uint8Array|string)=>createHash('sha256').update(input).digest('hex');
for(const [file,expected] of Object.entries(meta.sourceSha256))assert.equal(hash(await readFile(join(source,file))),expected,'Pinned source hash: '+file);
assert.equal(hash(await readFile(join(source,'package-lock.json'))),meta.dependencyLockSha256);
assert.equal(hash(await readFile('ml/applications/native/tabinator.package-lock.json')),meta.dependencyLockSha256);
assert.equal(hash(await readFile('ml/applications/native/tabinator.LICENSE')),meta.sourceSha256.LICENSE);
const readable=process.env.VYLNT_NATIVE_COOKIE_VARIANT==='readable',channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
const responseProfile=readable?'readable-cookie-attribute-control':'native';
const identity=await contentHash({version:2,revision:meta.revision,lock:meta.dependencyLockSha256,
  producers:await Promise.all(['tests/native-tabinator-acceptance.ts','apps/cli/project-functional.ts','apps/cli/project-cookie-access.ts','apps/cli/project-scanner.ts','apps/server/project-inspection.ts','packages/ml/project-policy-facts.ts','packages/core/project-evidence.ts'].map(async file=>hash(await readFile(file))))});
const root=await mkdtemp(join(parent,'native-tabinator-run-')),app=join(root,'app');
let child:ChildProcess|undefined,proxy:ReturnType<typeof createHttpServer>|undefined,stage='setup',result:Record<string,unknown>|undefined,prototype:Record<string,unknown>|undefined;
let startupError=false,listening=false,measurement:CookieDependencyMeasurement|undefined,access:CookieAccessMeasurement|undefined;
const sessionSecret=randomBytes(32).toString('hex'),password='Vylnt1'+randomBytes(24).toString('hex'),username='vylnt_'+randomBytes(6).toString('hex');
try{
  await mkdir(join(app,'data'),{recursive:true});await mkdir(join(root,'tmp'));
  // Copy only tracked regular application files, never cached data, symlinks or
  // a user's database. The upstream cache and native auth source stay unchanged.
  const files=pinnedFiles;
  for(const file of files){
    cancel.signal.throwIfAborted();
    if(file.split('/').some(part=>['data','.git','node_modules'].includes(part)))continue;
    const from=resolve(source,file),to=resolve(app,file),inside=relative(app,to);
    assert.ok(!isAbsolute(inside)&&inside!=='..'&&!inside.startsWith('..'+sep));
    const info=await lstat(from);assert.ok(info.isFile()&&!info.isSymbolicLink(),'Only pinned regular files are supported');
    assert.ok(info.size<=4*1024*1024,'Native source file budget');await mkdir(dirname(to),{recursive:true});await copyFile(from,to);
  }
  // A separately hashed development runner changes only the listening address.
  // The original server/auth/session/database modules are not rewritten.
  const shim="const net=require('node:net');const listen=net.Server.prototype.listen;net.Server.prototype.listen=function(port,...args){if(typeof port==='string'&&!/^\\d+$/.test(port)||typeof port==='object')throw Error('Unsupported native listener');if(typeof args[0]==='string')args.shift();this.once('listening',()=>{const a=this.address();if(a&&typeof a==='object')process.send?.({type:'native-listening',host:a.address,port:a.port})});return listen.call(this,Number(port),'127.0.0.1',...args)};require('./app/server.js');\n";
  await writeFile(join(root,'loopback.cjs'),shim);
  const held=createServer();await new Promise<void>(done=>held.listen(0,'127.0.0.1',done));const port=(held.address() as {port:number}).port;await new Promise<void>(done=>held.close(()=>done()));
  let origin='http://127.0.0.1:'+port;
  const childEnv:NodeJS.ProcessEnv={};for(const key of ['PATH','Path','PATHEXT','SystemRoot','SYSTEMROOT','WINDIR','ComSpec','SystemDrive'])if(process.env[key])childEnv[key]=process.env[key];
  Object.assign(childEnv,{PORT:String(port),SESSION_SECRET:sessionSecret,NODE_ENV:'test',FORCE_SECURE_COOKIES:'false',CORS_ORIGIN:origin,NODE_PATH:join(source,'node_modules'),TEMP:join(root,'tmp'),TMP:join(root,'tmp')});
  // Upstream logs include request bodies. Discard both streams completely.
  child=spawn(process.execPath,[join(root,'loopback.cjs')],{cwd:root,env:childEnv,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});child.on('error',()=>{startupError=true;});
  child.on('message',input=>{if(input&&typeof input==='object'&&'type' in input&&input.type==='native-listening'&&'host' in input&&input.host==='127.0.0.1'&&'port' in input&&input.port===port)listening=true;});
  child.once('exit',()=>{listening=false;cancel.abort();});
  stage='native startup';const deadline=Date.now()+30000;
  while(true){cancel.signal.throwIfAborted();if(startupError||child.exitCode!==null)throw Error('Native process unavailable');if(listening)try{const r=await fetch(origin+'/api/auth/me',{redirect:'manual',signal:AbortSignal.any([cancel.signal,AbortSignal.timeout(2000)])});if(r.status===200)break;}catch{}if(Date.now()>deadline)throw Error('Native startup timeout');await new Promise(done=>setTimeout(done,100));}
  if(readable){
    proxy=createHttpServer((incoming,outgoing)=>{
      const upstream=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,headers:{...incoming.headers,host:`127.0.0.1:${port}`},agent:false},response=>{
        const headers={...response.headers};if(headers['set-cookie'])headers['set-cookie']=headers['set-cookie'].map(value=>value.replace(/;\s*httponly\s*(?=;|$)/gi,''));
        outgoing.writeHead(response.statusCode??502,headers);response.pipe(outgoing);response.on('error',()=>outgoing.destroy());
      });
      upstream.setTimeout(10000,()=>upstream.destroy());upstream.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});
      incoming.on('aborted',()=>upstream.destroy());outgoing.on('close',()=>upstream.destroy());incoming.pipe(upstream);
    });
    await new Promise<void>(done=>proxy!.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+(proxy.address() as {port:number}).port;
  }
  if(process.connected)process.send?.({type:'native-ready',root,pid:child.pid});
  const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(120000)]),check=async(p:Page)=>{
    const response=await p.goto(origin+'/api/auth/me');if(response?.status()!==200)return 'unknown' as const;
    const data=await response.json();return data.authenticated===true?'authenticated' as const:data.authenticated===false?'anonymous' as const:'unknown' as const;
  };
  let userId:number|undefined,sqlSessionVerified=false,sqlWriteVerified=false,anonymousDenied=false,sessionValues:string[]=[];
  let independentCookie:{secure:boolean;httpOnly:boolean}|undefined;
  stage='native registration and independent session oracle';
  const collected=await scanProjectPage(origin+'/api/auth/me',{allowedLocalOrigins:[origin],requireComplete:true,signal,channel,hooks:{
    prepare:async(_page,context)=>{
      // Explicit synthetic requests only; no redirects and no external services.
      const registered=await context.request.post(origin+'/api/auth/register',{data:{username,email:username+'@example.invalid',password},maxRedirects:0,timeout:5000});assert.equal(registered.status(),201,'Native registration');userId=(await registered.json()).userId;assert.ok(Number.isSafeInteger(userId));
      const login=await context.request.post(origin+'/api/auth/login',{data:{username,password},maxRedirects:0,timeout:5000});assert.equal(login.status(),200,'Native login');
      const cookies=await context.cookies();assert.equal(cookies.length,1,'Unambiguous native session');sessionValues=cookies.map(cookie=>cookie.value);
      independentCookie={secure:cookies[0].secure,httpOnly:cookies[0].httpOnly};
      const signed=decodeURIComponent(cookies[0].value);assert.ok(signed.startsWith('s:'));const split=signed.lastIndexOf('.'),sid=signed.slice(2,split),signature=signed.slice(split+1),expected=createHmac('sha256',sessionSecret).update(sid).digest('base64').replace(/=+$/,'');
      assert.equal(signature.length,expected.length);assert.ok(timingSafeEqual(Buffer.from(signature),Buffer.from(expected)),'Native signed session');
      const users=new DatabaseSync(join(app,'data','tabinator.db'),{readOnly:true}),sessions=new DatabaseSync(join(app,'data','sessions.db'),{readOnly:true});
      try{
        const user=users.prepare('SELECT id FROM users WHERE username = ?').get(username),session=sessions.prepare('SELECT sess FROM sessions WHERE sid = ?').get(sid);
        sqlSessionVerified=user?.id===userId&&typeof session?.sess==='string'&&JSON.parse(session.sess).userId===userId;
        assert.ok(sqlSessionVerified,'Independent SQLite session-to-user oracle');
      }finally{users.close();sessions.close();}
    },
    collected:async(_page,context,report)=>{
      browserVersion=context.browser()?.version()??'unknown';
      stage='native cookie removal and restoration';measurement=await measureAuthenticationCookies(context,report,{identityHash:identity,check},signal);
      assert.ok(measurement.targets.length>0,'Native dependency controls');
      stage='native HttpOnly controls';access=await measureCookieJavaScriptAccess(context,report,{identityHash:identity,check:async p=>{const authentication=await check(p);return{authentication,functionality:authentication==='authenticated'?'passed':'unknown'};}},signal);
      assert.ok(access.targets.length>0,'Scoped HttpOnly controls');assert.ok(access.targets.every(t=>t.facts.cookieJsAccessRequired.value===false));
      stage='native protected write and independent database oracle';
      const body={name:'VYLNT disposable bookmark',url:'https://example.invalid/vylnt-native-check',tags:[]};
      const written=await context.request.post(origin+'/api/links',{data:body,maxRedirects:0,timeout:5000});assert.equal(written.status(),201,'Native protected write');
      const database=new DatabaseSync(join(app,'data','tabinator.db'),{readOnly:true});
      try{
        const row=database.prepare('SELECT COUNT(*) AS count FROM links WHERE user_id = ? AND name = ? AND url = ?').get(userId!,body.name,body.url);sqlWriteVerified=row?.count===1;assert.ok(sqlWriteVerified,'Independent native bookmark readback');
        const before=database.prepare('SELECT COUNT(*) AS count FROM links').get()!.count;
        const anonymous=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
        try{const denied=await anonymous.request.post(origin+'/api/links',{data:{...body,url:'https://example.invalid/anonymous-check'},maxRedirects:0,timeout:5000});anonymousDenied=denied.status()===401;assert.ok(anonymousDenied,'Anonymous protected operation denied');}finally{await anonymous.close();}
        assert.equal(database.prepare('SELECT COUNT(*) AS count FROM links').get()!.count,before,'Denied operation must not mutate SQLite');
      }finally{database.close();}
    }
  }});
  stage='signed same-run inputs and privacy';assert.ok(measurement&&access);
  let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:meta.revision,configHash:await contentHash({scope:'native-api-profile-and-bookmark-operation',responseProfile,loopbackShimHash:hash(shim)}),adapterHash:identity},false);
  evidence=mergeCookieAccess(mergeAuthenticationRole(evidence,measurement),access);
  stage='native source inventory';
  evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/api/auth/me']}),signal});
  assert.equal(evidence.inspection.framework,'express');
  // This native adapter has checked the profile and one mutation, not all
  // separately mounted routers. A complete syntax inventory is not route scope.
  evidence.inspection.coverage='partial';
  stage='native complete-input preparation';
  const contexts=prepareProjectContexts(collected.report,evidence),inputs:Record<string,{complete:number;review:number}>={};
  for(const category of ['CK-001','CK-002']){
    inputs[category]={complete:0,review:0};for(const finding of collected.report.findings.filter(f=>f.ruleId===category)){
      const prepared=contexts(finding);inputs[category][prepared.requiresReview?'review':'complete']++;
      assert.equal(guardProjectAssessment(prepared,{...finding,severity:'high'},'contextual'),'needs-review');
    }
  }
  assert.ok(inputs['CK-001'].complete>0,'Complete native Secure input');if(readable)assert.ok(inputs['CK-002'].complete>0,'Complete native HttpOnly input');
  stage='native evidence signature';
  const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);assert.ok(await verifyProjectEvidence(seal,collected.report,signer.trustedKeys));
  stage='native privacy exclusions';
  const serialized=JSON.stringify({report:collected.report,seal});
  for(const secret of [password,sessionSecret,username,...sessionValues])assert.ok(!serialized.includes(secret),'Private source state must be excluded');
  await verifyPinnedSource();
  prototype={
    'report.json':collected.report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,
    'native-oracles.json':{version:'vylnt-native-session-oracles-v1',role:'development-prototype-exposure',repositoryId:meta.repositoryId,commit:meta.revision,responseProfile,
      originalScanHash:await contentHash(collected.report),evidenceHash:await contentHash(seal),adapterHash:identity,
      controls:{signedSessionMapsToSyntheticUser:sqlSessionVerified,nativeBookmarkRowVerified:sqlWriteVerified,anonymousDeniedWithoutMutation:anonymousDenied},
      scope:{profile:'/api/auth/me',mutation:'/api/links',routeCoverage:'partial'},eligibleForTraining:false,classLabelsAssigned:false,modelEvaluated:false},
    'source.json':meta
  };
  if(process.env.VYLNT_NATIVE_SEEDS==='1'){
    assert.ok(independentCookie);
    const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
    const unnecessary=access.checks.length>0&&access.checks.every(({baseline,restricted,restored})=>
      [baseline,restricted,restored].every(phase=>phase?.complete&&phase.authentication==='authenticated'&&phase.functionality==='passed')
      &&restricted?.read===false&&baseline.read===restored?.read);
    prototype['development-seeds.json']=await createTabinatorSeedBatch(collected.report,seal,signer.trustedKeys,
      {signedSessionMapsToSyntheticUser:sqlSessionVerified,nativeBookmarkRowVerified:sqlWriteVerified,anonymousDeniedWithoutMutation:anonymousDenied,
        cookie:independentCookie,javaScriptAccessUnnecessary:unnecessary},key);
  }
  result={version:1,completedAt:new Date().toISOString(),channel,responseProfile,source:{repository:meta.repository,revision:meta.revision,dependencyLockHash:meta.dependencyLockSha256},checkIdentity:identity,
    runtime:{node:process.versions.node,browser:browserVersion,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model??'unknown',logicalCpus:cpus().length,memoryBytes:totalmem(),elapsedMs:Math.round(performance.now()-started)},
    passed:true,eligibleForTraining:false,modelEvaluated:false,independentOracles:{signedSessionMapsToSyntheticUser:sqlSessionVerified,nativeBookmarkRowVerified:sqlWriteVerified,anonymousDeniedWithoutMutation:anonymousDenied},
    authDependencyTargets:measurement.targets.length,cookieAccessTargets:access.targets.length,authenticationInputs:inputs,
    cookieAccessChecks:access.checks.map(({baseline,restricted,restored})=>({baseline,restricted,restored})),
    sourceInspection:{framework:evidence.inspection.framework,coverage:evidence.inspection.coverage,sourceCount:evidence.inspection.sourceHashes.length},
    scope:'Native API profile GET plus one protected bookmark write. No frontend/CDN, other routes, CSRF, TLS, contextual-class, model-training or qualification claim. Two response profiles remain one family.'};
}catch{
  // Never expose upstream logs, credentials, SQL records or request bodies.
  throw Error('Native Tabinator acceptance failed during '+stage+(cancel.signal.aborted?' (cancelled)':''));
}finally{
  if(proxy){proxy.closeAllConnections();await new Promise<void>(done=>proxy!.close(()=>done()));}
  if(child?.pid&&child.exitCode===null){if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});else child.kill('SIGKILL');}
  const checked=await realpath(root),actualParent=await realpath(parent),workspace=await realpath(process.cwd());
  if(!actualParent.startsWith(workspace+sep)||!checked.startsWith(actualParent+sep))throw Error('Unexpected native cleanup path');
  await rm(checked,{recursive:true,force:true,maxRetries:8,retryDelay:200});
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);process.removeListener('message',message);if(process.connected)process.disconnect();
}
// Keep reproducible metadata-only observations for developer source work.
// There are deliberately no oracle class labels/source-lock claims. Dataset
// preparation cannot accept this as a registered training/holdout manifest.
assert.ok(prototype);
const observations=resolve('.local/ml-native-observations/tabinator');await mkdir(observations,{recursive:true});
const artifact=join(observations,randomUUID());await mkdir(artifact);
for(const [file,value] of Object.entries(prototype))await writeFile(join(artifact,file),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
const reload=async(file:string)=>JSON.parse(await readFile(join(artifact,file),'utf8'));
const savedReport=await reload('report.json'),savedSeal=await reload('evidence.json'),savedKeys=await reload('trusted-public-keys.json');
assert.ok(await verifyProjectEvidence(savedSeal,savedReport,savedKeys),'Saved prototype verifies after private key/data cleanup');
const altered=structuredClone(savedReport);altered.observation.cookies[0].secure=!altered.observation.cookies[0].secure;
assert.ok(!await verifyProjectEvidence(savedSeal,altered,savedKeys),'Modified observations must not retain same-run provenance');
const forged=structuredClone(savedSeal);forged.evidence.configHash='0'.repeat(64);
assert.ok(!await verifyProjectEvidence(forged,savedReport,savedKeys),'Changed evidence must not verify');
await writeFile(join(artifact,'acceptance.json'),JSON.stringify({version:1,completed:true,sourceRunCleanup:true,reloadVerified:true,alteredScanRejected:true,alteredEvidenceRejected:true,eligibleForTraining:false},null,2),{flag:'wx',mode:0o600});
await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/tabinator-${channel}${readable?'-readable-cookies':''}.json`,JSON.stringify({...result,cleanupCompleted:true},null,2));
console.log('Native Tabinator independent SQL/session and bounded cookie controls passed. Prototype metadata: '+relative(process.cwd(),artifact)+'. No category qualified.');

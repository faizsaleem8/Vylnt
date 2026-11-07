import {nativeAdapterIdentity} from '../packages/ml/native-producer-identity';
import assert from 'node:assert/strict';
import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,rm,realpath,lstat,copyFile} from 'node:fs/promises';
import {join,resolve,dirname,relative,sep,isAbsolute} from 'node:path';
import {createServer} from 'node:net';
import {createServer as createHttpServer,request} from 'node:http';
import {createServer as createHttpsServer} from 'node:https';
import {readNamedFixtureTls,readPreparedLocalTls} from '../packages/ml/local-tls';
import {measureResourceFunction,mergeResourceFunction,upgradeFixtureHost,type ResourceMeasurement} from '../apps/cli/project-resource-function';
import {measureHstsActivation,measureHstsDisable,measureHstsHostPolicy,measureHstsPlaintext,measureInvalidHsts,mergeHstsActivation,mergeHstsDisable,mergeHstsHostPolicy,mergeHstsPlaintext,mergeInvalidHsts} from '../apps/cli/project-hsts-plaintext';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes';
import {DatabaseSync} from 'node:sqlite';
import {cpus,totalmem} from 'node:os';
import type {Page} from 'playwright';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {measureAuthenticationCookies,mergeAuthenticationRole,type CookieDependencyMeasurement} from '../apps/cli/project-functional';
import {measureCookieJavaScriptAccess,mergeCookieAccess,type CookieAccessMeasurement} from '../apps/cli/project-cookie-access';
import {measureFramePolicy,mergeFramePolicy,type FramePolicyMeasurement} from '../apps/cli/project-frame-policy';
import {measureFraming,mergeFramedWrite,type FramingMeasurement} from '../apps/cli/project-framing';
import {measureCrossSite,mergeCrossSiteMutation} from '../apps/cli/project-cross-site';
import {broadFrameAncestors,duplicateFrameDeny} from '../packages/core/frame-policy-scope';
import {projectBroadFrameWritePolicy,projectDuplicateXfoPolicy} from '../packages/core/project-evidence';
import {projectEvalScriptPolicy,projectHashedScriptPolicy} from '../packages/core/project-evidence';
import {nativeHashedResponse} from '../packages/ml/native-jingo-profile';
import {measureScriptFunction,mergeScriptFunction,type ScriptMeasurement} from '../apps/cli/project-script-function';
import {inspectProject} from '../apps/server/project-inspection';
import {gateConfigSchema} from '../apps/cli/gate-config';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {invalidFixtureHsts,prepareProjectContexts,guardProjectAssessment,verifyProjectEvidence,projectFramePolicy,projectFrameWritePolicy,projectInlinePolicy,projectScriptPolicy,projectTransportPolicy,permissiveInlineDirective} from '../packages/core/project-evidence';
import {contentHash} from '../packages/core/integrity';
import {ProjectSigner} from '../apps/server/project-signing';
import {createNativeApiHstsSeedBatch,createTabinatorSeedBatch,createTabinatorScriptSeedBatch,type JingoScriptSeedControls} from '../packages/ml/project-seed-corpus';
import {applySessionProfile,matchesSessionProfile,parseCrossSiteSessionProfile,parseSessionProfile} from '../scripts/native-session-profile.mjs';
import {checkTabinatorEditor,tabinatorCosmeticIcon,tabinatorEditorAsset,tabinatorEditorLayout,tabinatorEditorProfiles,tabinatorExternalEditor,writeTabinatorBookmark,type TabinatorEditorProfile} from './native-tabinator-editor';

// Native development exposure and optional independently checked seed labels; no fitting/inference.
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
const crossSiteProfile=parseCrossSiteSessionProfile(process.env.VYLNT_NATIVE_COOKIE_VARIANT);
const sessionProfile=parseSessionProfile(process.env.VYLNT_NATIVE_COOKIE_VARIANT)??crossSiteProfile;
const duplicateXfo=process.env.VYLNT_NATIVE_FRAMING==='duplicate-deny';
const framingProfile=process.env.VYLNT_NATIVE_FRAMING==='1'||duplicateXfo;
const editorProfile=(process.env.VYLNT_NATIVE_EDITOR_PROFILE||undefined) as TabinatorEditorProfile|undefined;
if(editorProfile)assert.ok(tabinatorEditorProfiles.includes(editorProfile)&&!readable&&!sessionProfile&&!framingProfile&&process.env.VYLNT_NATIVE_TLS!=='1');
const broadFrameWrite=editorProfile==='framed-write-broad';
const hashedResponse=editorProfile==='script-hashed-response';
const evalResponse=editorProfile==='script-eval-response',specialResponse=hashedResponse||evalResponse;
const scriptProfile=editorProfile?.startsWith('script-'),framedWrite=editorProfile==='framed-write'||broadFrameWrite;
const layeredScript=editorProfile==='script-layered-meta';
const resourceProfile=process.env.VYLNT_NATIVE_RESOURCE_PROFILE||undefined;
if(resourceProfile)assert.ok(['resource-http','resource-upgrade'].includes(resourceProfile)&&!readable&&!sessionProfile&&!framingProfile&&!editorProfile&&process.env.VYLNT_NATIVE_TLS!=='1');
const scanPath=editorProfile||resourceProfile?'/':'/api/auth/me';
assert.ok(!(framingProfile&&process.env.VYLNT_NATIVE_TLS==='1'),'Framing adapter currently supports HTTP only');
const namedProfile=process.env.VYLNT_NATIVE_HSTS_PROFILE||undefined;
if(namedProfile)assert.ok(['hsts-disabled','hsts-positive','hsts-missing','hsts-host','hsts-invalid','hsts-invalid-host','hsts-disable-active','hsts-activate-native'].includes(namedProfile)&&!readable&&!sessionProfile&&!framingProfile&&!editorProfile&&!resourceProfile&&process.env.VYLNT_NATIVE_TLS!=='1');
const activateHsts=namedProfile==='hsts-activate-native',disableHsts=namedProfile==='hsts-disable-active',retainedHsts=namedProfile==='hsts-invalid-host';
const invalidHsts=namedProfile==='hsts-invalid'||retainedHsts;
const wireHsts=namedProfile==='hsts-disabled'||disableHsts?'max-age=0':namedProfile==='hsts-positive'||activateHsts?'max-age=086400':invalidHsts?invalidFixtureHsts:namedProfile?'absent':undefined;
const tlsProfile=Boolean(wireHsts||resourceProfile)||process.env.VYLNT_NATIVE_TLS==='1';
const namedTls=wireHsts||resourceProfile?await readNamedFixtureTls():undefined,tlsMaterial=namedTls??(tlsProfile?await readPreparedLocalTls():undefined);
const responseProfile=resourceProfile??namedProfile??editorProfile??(duplicateXfo?'framing-duplicate-deny':sessionProfile?process.env.VYLNT_NATIVE_COOKIE_VARIANT!:(framingProfile?'own-origin-framing-':'')+(tlsProfile?'strict-tls-':'')+(readable?'readable-cookie-attribute-control':'native'));
const identity=await nativeAdapterIdentity(meta);
const scratchParent=namedTls?.directory??parent;
const root=await mkdtemp(join(scratchParent,'native-tabinator-run-')),app=join(root,'app');
let child:ChildProcess|undefined,proxy:ReturnType<typeof createHttpServer>|ReturnType<typeof createHttpsServer>|undefined,stage='setup',result:Record<string,unknown>|undefined,prototype:Record<string,unknown>|undefined;
let startupError=false,listening=false,measurement:CookieDependencyMeasurement|undefined,access:CookieAccessMeasurement|undefined;
let framing:FramePolicyMeasurement|undefined;
let crossSite:Awaited<ReturnType<typeof measureCrossSite>>|undefined;
let plaintext:Awaited<ReturnType<typeof measureHstsPlaintext>>|undefined;
let hostPolicy:Awaited<ReturnType<typeof measureHstsHostPolicy>>|undefined;
let disablePolicy:Awaited<ReturnType<typeof measureHstsDisable>>|undefined;
let activationPolicy:Awaited<ReturnType<typeof measureHstsActivation>>|undefined;
let editorOverlayHash:string|undefined,script:ScriptMeasurement|undefined,framed:FramingMeasurement|undefined;
let hashedPolicy:string|undefined;
let resource:ResourceMeasurement|undefined,assetServer:ReturnType<typeof createHttpServer>|undefined;
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
  if(editorProfile){
    const editorFile=join(app,'app/index.html'),layout=tabinatorEditorLayout(await readFile(editorFile,'utf8'),editorProfile);
    const moved=specialResponse?nativeHashedResponse(layout,evalResponse?'eval':'inline'):undefined,overlay=moved?.html??layout;
    hashedPolicy=moved?.policy;
    await writeFile(editorFile,overlay);
    // The pinned decorative logo exceeds the 2 MiB functional response budget.
    await writeFile(join(app,'images/tabinator.png'),tabinatorCosmeticIcon);
    editorOverlayHash=await contentHash({html:hash(overlay),icon:hash(tabinatorCosmeticIcon)});
  }
  // A separately hashed development runner changes only the listening address.
  // The original server/auth/session/database modules are not rewritten.
  const shim="const net=require('node:net');const listen=net.Server.prototype.listen;net.Server.prototype.listen=function(port,...args){if(typeof port==='string'&&!/^\\d+$/.test(port)||typeof port==='object')throw Error('Unsupported native listener');if(typeof args[0]==='string')args.shift();this.once('listening',()=>{const a=this.address();if(a&&typeof a==='object')process.send?.({type:'native-listening',host:a.address,port:a.port})});return listen.call(this,Number(port),'127.0.0.1',...args)};require('./app/server.js');\n";
  await writeFile(join(root,'loopback.cjs'),shim);
  const held=createServer();await new Promise<void>(done=>held.listen(0,'127.0.0.1',done));const port=(held.address() as {port:number}).port;await new Promise<void>(done=>held.close(()=>done()));
  const upstreamOrigin='http://127.0.0.1:'+port;
  let origin=upstreamOrigin;
  let assetOrigin:string|undefined,assetScript:string|undefined;
  if(resourceProfile==='resource-http'){
    assetServer=createHttpServer((incoming,outgoing)=>{
      if(incoming.url!==tabinatorEditorAsset||incoming.method!=='GET'||!assetScript){outgoing.writeHead(404).end();return;}
      outgoing.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}).end(assetScript);
    });
    await new Promise<void>(done=>assetServer!.listen(0,'127.0.0.1',done));
    assetOrigin='http://127.0.0.1:'+(assetServer.address() as {port:number}).port;
  }
  const dependencyRoot=namedTls?join(parent,'native-linux-deps-tabinator'):source;
  if(namedTls){
    assert.equal(await realpath(dependencyRoot),dependencyRoot);
    assert.equal(hash(await readFile(join(dependencyRoot,'package-lock.json'))),meta.dependencyLockSha256);
    assert.deepEqual(await readFile(join(dependencyRoot,'package.json')),await readFile(join(source,'package.json')));
  }
  const childEnv:NodeJS.ProcessEnv={};for(const key of ['PATH','Path','PATHEXT','SystemRoot','SYSTEMROOT','WINDIR','ComSpec','SystemDrive'])if(process.env[key])childEnv[key]=process.env[key];
  Object.assign(childEnv,{PORT:String(port),SESSION_SECRET:sessionSecret,NODE_ENV:'test',FORCE_SECURE_COOKIES:'false',CORS_ORIGIN:origin,NODE_PATH:join(dependencyRoot,'node_modules'),TEMP:join(root,'tmp'),TMP:join(root,'tmp')});
  // Use the pinned server's native origin reflection. The fixture proxy only changes cookie attributes.
  if(crossSiteProfile)delete childEnv.CORS_ORIGIN;
  // Upstream logs include request bodies. Discard both streams completely.
  child=spawn(process.execPath,[join(root,'loopback.cjs')],{cwd:root,env:childEnv,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});child.on('error',()=>{startupError=true;});
  child.on('message',input=>{if(input&&typeof input==='object'&&'type' in input&&input.type==='native-listening'&&'host' in input&&input.host==='127.0.0.1'&&'port' in input&&input.port===port)listening=true;});
  child.once('exit',()=>{listening=false;cancel.abort();});
  stage='native startup';const deadline=Date.now()+(namedTls?120000:30000);
  while(true){cancel.signal.throwIfAborted();if(startupError||child.exitCode!==null)throw Error('Native process unavailable');if(listening)try{const r=await fetch(origin+'/api/auth/me',{redirect:'manual',signal:AbortSignal.any([cancel.signal,AbortSignal.timeout(2000)])});if(r.status===200)break;}catch{}if(Date.now()>deadline)throw Error('Native startup timeout');await new Promise(done=>setTimeout(done,100));}
  if(readable||tlsProfile||framingProfile||sessionProfile||layeredScript||editorProfile==='script-broad-response'||broadFrameWrite||specialResponse){
    const forward=(incoming:import('node:http').IncomingMessage,outgoing:import('node:http').ServerResponse)=>{
      const upstream=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,headers:{...incoming.headers,host:`127.0.0.1:${port}`},agent:false},response=>{
        const headers={...response.headers};if(readable&&headers['set-cookie'])headers['set-cookie']=headers['set-cookie'].map(value=>value.replace(/;\s*httponly\s*(?=;|$)/gi,''));
        if(sessionProfile&&headers['set-cookie'])headers['set-cookie']=applySessionProfile(headers['set-cookie'],'connect.sid',sessionProfile);
        // Explicit response configuration intervention; preserve native bodies,
        // auth/session source and database. This profile is still one family.
        if(duplicateXfo){delete headers['content-security-policy'];headers['x-frame-options']=duplicateFrameDeny;}
        else if(framingProfile)headers['content-security-policy']='frame-ancestors '+origin;
        if(broadFrameWrite&&incoming.url===scanPath){headers['content-security-policy']=broadFrameAncestors;delete headers['x-frame-options'];}
        if(wireHsts&&incoming.url===scanPath){
          if(wireHsts==='absent')delete headers['strict-transport-security'];
          else headers['strict-transport-security']=wireHsts;
        }
        if((layeredScript||editorProfile==='script-broad-response')&&incoming.url==='/')headers['content-security-policy']=permissiveInlineDirective;
        if(hashedPolicy&&incoming.url==='/')headers['content-security-policy']=hashedPolicy;
        if(resourceProfile==='resource-upgrade'&&incoming.url==='/')headers['content-security-policy']='upgrade-insecure-requests';
        outgoing.writeHead(response.statusCode??502,headers);response.pipe(outgoing);response.on('error',()=>outgoing.destroy());
      });
      upstream.setTimeout(10000,()=>upstream.destroy());upstream.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});
      incoming.on('aborted',()=>upstream.destroy());outgoing.on('close',()=>upstream.destroy());incoming.pipe(upstream);
    };
    proxy=tlsMaterial?createHttpsServer({cert:tlsMaterial.cert,key:tlsMaterial.key},forward):createHttpServer(forward);
    await new Promise<void>(done=>proxy!.listen(0,'127.0.0.1',done));origin=(namedTls?'https://'+upgradeFixtureHost+':':tlsProfile?'https://localhost:':'http://127.0.0.1:')+(proxy.address() as {port:number}).port;
  }
  if(resourceProfile){
    const editorFile=join(app,'app/index.html'),overlay=tabinatorExternalEditor(await readFile(editorFile,'utf8'),assetOrigin??origin.replace('https:','http:'));
    assetScript=overlay.script;
    if(resourceProfile==='resource-upgrade')await writeFile(join(app,'app',tabinatorEditorAsset.slice(1)),assetScript,{flag:'wx'});
    await writeFile(editorFile,overlay.html);
    await writeFile(join(app,'images/tabinator.png'),tabinatorCosmeticIcon);
    editorOverlayHash=await contentHash({html:hash(overlay.html),asset:hash(assetScript),icon:hash(tabinatorCosmeticIcon)});
  }
  if(process.connected)process.send?.({type:'native-ready',root,pid:child.pid});
  const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(120000)]),check=async(p:Page)=>{
    const response=await p.goto(origin+'/api/auth/me');if(response?.status()!==200)return 'unknown' as const;
    const data=await response.json();return data.authenticated===true?'authenticated' as const:data.authenticated===false?'anonymous' as const:'unknown' as const;
  };
  let userId:number|undefined,sqlSessionVerified=false,sqlWriteVerified=false,anonymousDenied=false,sessionValues:string[]=[];
  let independentCookie:{secure:boolean;httpOnly:boolean}|undefined;
  stage='native registration and independent session oracle';
  const apiOrigin=namedTls?upstreamOrigin:origin;
  const collected=await scanProjectPage(origin+scanPath,{allowedLocalOrigins:namedTls?[origin,origin.replace('https:','http:'),...(assetOrigin?[assetOrigin]:[])]:[origin],namedUpgradeFixture:!!namedTls,requireComplete:true,signal,channel,hooks:{
    prepare:async(page,context)=>{
      if(editorProfile)page.on('pageerror',error=>console.error('Native editor page error:',error.name,
        /null|undefined/.test(error.message)?'missing-or-undefined-value':'other'));
      // Explicit synthetic requests only; no redirects and no external services.
      stage='native registration request';
      const registered=await context.request.post(apiOrigin+'/api/auth/register',{data:{username,email:username+'@example.invalid',password},maxRedirects:0,timeout:5000});assert.equal(registered.status(),201,'Native registration');userId=(await registered.json()).userId;assert.ok(Number.isSafeInteger(userId));
      stage='native login request';
      const login=await context.request.post(apiOrigin+'/api/auth/login',{data:{username,password},maxRedirects:0,timeout:5000});assert.equal(login.status(),200,'Native login');
      stage='native session cookie oracle';
      const cookies=await context.cookies();stage='native session cookie count '+cookies.length;assert.equal(cookies.length,1,'Unambiguous native session');sessionValues=cookies.map(cookie=>cookie.value);
      independentCookie={secure:cookies[0].secure,httpOnly:cookies[0].httpOnly};
      stage='native session cookie format';const signed=decodeURIComponent(cookies[0].value);assert.ok(signed.startsWith('s:'));const split=signed.lastIndexOf('.'),sid=signed.slice(2,split),signature=signed.slice(split+1),expected=createHmac('sha256',sessionSecret).update(sid).digest('base64').replace(/=+$/,'');
      assert.equal(signature.length,expected.length);assert.ok(timingSafeEqual(Buffer.from(signature),Buffer.from(expected)),'Native signed session');
      stage='native session database link';const users=new DatabaseSync(join(app,'data','tabinator.db'),{readOnly:true}),sessions=new DatabaseSync(join(app,'data','sessions.db'),{readOnly:true});
      try{
        if(namedTls){users.exec('PRAGMA busy_timeout=5000');sessions.exec('PRAGMA busy_timeout=5000');}
        const user=users.prepare('SELECT id FROM users WHERE username = ?').get(username),session=sessions.prepare('SELECT sess FROM sessions WHERE sid = ?').get(sid);
        sqlSessionVerified=user?.id===userId&&typeof session?.sess==='string'&&JSON.parse(session.sess).userId===userId;
        assert.ok(sqlSessionVerified,'Independent SQLite session-to-user oracle');
      }finally{users.close();sessions.close();}
      if(namedTls)await context.addCookies(cookies.map(({name,value,httpOnly,sameSite,expires,secure})=>({url:origin,name,value,httpOnly,sameSite,expires,secure})));
    },
    collected:async(_page,context,report)=>{
      browserVersion=context.browser()?.version()??'unknown';
      if(sessionProfile){
        stage='browser session profile verification';
        const matching=report.observation.cookies?.filter(c=>c.name==='connect.sid');
        assert.ok(matching?.length===1&&matchesSessionProfile(matching[0],sessionProfile),'Browser session attributes differ from the registered profile');
      }
      if(framingProfile){
        stage='native own-origin framing controls';
        framing=await measureFramePolicy(context,report,{identityHash:identity,check:async frame=>frame.evaluate(()=>{
          try{return JSON.parse(document.querySelector('pre')?.textContent??'').authenticated===true;}catch{return false;}
        })},signal);
        assert.equal(framing.status,'verified','Native authenticated response and actual ancestor enforcement');
        const blocked=duplicateXfo?'xfo-blocked':'csp-blocked';
        assert.deepEqual(framing.controls,{permitted:'embedded',forbidden:blocked,repeatedForbidden:blocked,nestedForbidden:blocked,
          ...(duplicateXfo?{foreignWithoutHeader:'embedded',nestedWithoutHeader:'embedded'}:{})});
      }
      if(resourceProfile){
        stage='native bookmark editor resource controls';
        resource=await measureResourceFunction(context,report,{identityHash:identity,check:checkTabinatorEditor},signal);
        assert.equal(resource.status,'verified');
      }else if(namedTls){
        stage='strict TLS authenticated API response';
        assert.equal(_page.url(),origin+scanPath);
        assert.ok(await _page.locator('pre').evaluate(element=>JSON.parse(element.textContent??'').authenticated===true));
      }else if(scriptProfile){
        stage='native bookmark editor script controls';
        script=await measureScriptFunction(context,report,{identityHash:identity,check:checkTabinatorEditor},signal);
        assert.equal(script.status,'verified');
      }else if(!editorProfile){
        stage='native cookie removal and restoration';measurement=await measureAuthenticationCookies(context,report,{identityHash:identity,check},signal);
        assert.ok(measurement.targets.length>0,'Native dependency controls');
        stage='native HttpOnly controls';access=await measureCookieJavaScriptAccess(context,report,{identityHash:identity,check:async p=>{const authentication=await check(p);return{authentication,functionality:authentication==='authenticated'?'passed':'unknown'};}},signal);
        assert.ok(access.targets.length>0,'Scoped HttpOnly controls');assert.ok(access.targets.every(t=>t.facts.cookieJsAccessRequired.value===false));
      }
      stage='native protected write and independent database oracle';
      const body={name:'VYLNT disposable bookmark',url:'https://example.invalid/vylnt-native-check',tags:[]};
      const written=await context.request.post(apiOrigin+'/api/links',{data:body,maxRedirects:0,timeout:5000});assert.equal(written.status(),201,'Native protected write');
      const database=new DatabaseSync(join(app,'data','tabinator.db'),{readOnly:true});
      try{
        const row=database.prepare('SELECT COUNT(*) AS count FROM links WHERE user_id = ? AND name = ? AND url = ?').get(userId!,body.name,body.url);sqlWriteVerified=row?.count===1;assert.ok(sqlWriteVerified,'Independent native bookmark readback');
        const before=database.prepare('SELECT COUNT(*) AS count FROM links').get()!.count;
        const anonymous=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
        try{const denied=await anonymous.request.post(apiOrigin+'/api/links',{data:{...body,url:'https://example.invalid/anonymous-check'},maxRedirects:0,timeout:5000});anonymousDenied=denied.status()===401;assert.ok(anonymousDenied,'Anonymous protected operation denied');}finally{await anonymous.close();}
        assert.equal(database.prepare('SELECT COUNT(*) AS count FROM links').get()!.count,before,'Denied operation must not mutate SQLite');
        if(crossSiteProfile){
          stage='native cross-site JSON bookmark writes';
          crossSite=await measureCrossSite(context,report,{identityHash:identity,path:'/api/links',cookieName:'connect.sid',json:true,
            prepare:async phase=>({name:'Disposable '+phase,url:'https://example.invalid/'+phase}),
            observe:async phase=>{
              const rows=database.prepare('SELECT user_id,name FROM links WHERE url=?').all('https://example.invalid/'+phase);
              if(!rows.length)return 'unchanged';
              return rows.length===1&&rows[0].user_id===userId&&rows[0].name==='Disposable '+phase?'changed':'unknown';
            }},signal);
          const {sameSite,crossSite:foreign,repeated,anonymous}=crossSite.controls;
          assert.ok([sameSite,foreign,repeated].every(result=>result.outcome==='changed-with-cookie'&&result.status===201),'Three bookmark writes must pass');
          assert.ok(anonymous.complete&&anonymous.originVerified&&!anonymous.cookieSent&&anonymous.status===401&&anonymous.state==='unchanged');
          assert.equal(database.prepare('SELECT COUNT(*) AS count FROM links').get()!.count,Number(before)+3);
        }
        if(framedWrite){
          stage='native framed bookmark writes and SQLite readback';
          let frames=0;
          framed=await measureFraming(context,report,{identityHash:identity,writePath:'/api/links',
            check:frame=>writeTabinatorBookmark(frame,origin,database,userId!,++frames)},signal);
          assert.equal(framed.coverage,'complete');
          assert.equal(frames,3);
        }
      }finally{database.close();}
      if(namedTls&&activateHsts){
        stage='native HSTS activation from verified plaintext baseline';
        activationPolicy=await measureHstsActivation(_page,report,identity,namedTls,signal);
      }else if(namedTls&&disableHsts){
        stage='native HSTS removal after verified upgrade';
        disablePolicy=await measureHstsDisable(_page,report,identity,namedTls,signal);
      }else if(namedTls&&(namedProfile==='hsts-host'||retainedHsts)){
        stage='same-host HSTS installation and reset';
        hostPolicy=await measureHstsHostPolicy(_page,report,identity,namedTls,signal,retainedHsts?invalidFixtureHsts:undefined);
      }else if(namedTls&&(wireHsts==='absent'||invalidHsts)){
        stage='same-browser HSTS plaintext and positive control';
        plaintext=await (invalidHsts?measureInvalidHsts:measureHstsPlaintext)(context,report,identity,namedTls,signal);
      }
    }
  }});
  stage='signed same-run inputs and privacy';
  let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:meta.revision,configHash:await contentHash({scope:editorProfile||resourceProfile?'native-bookmark-editor':'native-api-profile-and-bookmark-operation',responseProfile,certificate:tlsMaterial?.manifest.sha256??null,loopbackShimHash:hash(shim),...(editorOverlayHash?{editorOverlayHash}:{}),...(crossSiteProfile?{cors:'native-reflect-origin'}:{})}),adapterHash:identity},false);
  evidence=mergeBrowserMeasurement(evidence,collected.measurement);
  if(tlsProfile){assert.equal(collected.measurement.tlsValidated?.value,true,'Native strict TLS validation');assert.equal(collected.measurement.hstsApplicable?.value,true,'Native DNS HSTS scope');}
  if(namedTls){
    evidence.policy=projectTransportPolicy;
    if(plaintext)evidence=await (invalidHsts?mergeInvalidHsts:mergeHstsPlaintext)(evidence,plaintext);
    if(hostPolicy)evidence=await mergeHstsHostPolicy(evidence,hostPolicy);
    if(disablePolicy)evidence=await mergeHstsDisable(evidence,disablePolicy);
    if(activationPolicy)evidence=await mergeHstsActivation(evidence,activationPolicy);
    if(resource)evidence=mergeResourceFunction(evidence,resource);
  }
  else if(editorProfile){
    if(script){evidence=mergeScriptFunction(evidence,script);evidence.policy=evalResponse?projectEvalScriptPolicy:hashedResponse?projectHashedScriptPolicy:editorProfile.startsWith('script-broad-')?projectInlinePolicy:projectScriptPolicy;}
    else{assert.ok(framed);evidence=mergeFramedWrite(evidence,framed);evidence.policy=broadFrameWrite?projectBroadFrameWritePolicy:projectFrameWritePolicy;}
  }else{assert.ok(measurement&&access);evidence=mergeCookieAccess(mergeAuthenticationRole(evidence,measurement),access);}
  if(framing){evidence=mergeFramePolicy(evidence,framing);evidence.policy=duplicateXfo?projectDuplicateXfoPolicy:projectFramePolicy;}
  if(crossSite){evidence=mergeCrossSiteMutation(evidence,crossSite);evidence.policy=projectTransportPolicy;}
  stage='native source inventory';
  evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:[scanPath]}),signal});
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
  if(!namedTls&&!editorProfile&&!sessionProfile?.secure)assert.ok(inputs['CK-001'].complete>0,'Complete native Secure input');
  if(readable||sessionProfile&&!sessionProfile.httpOnly)assert.ok(inputs['CK-002'].complete>0,'Complete native HttpOnly input');
  if(framing){
    const finding=collected.report.findings.find(f=>f.ruleId==='HDR-002');assert.ok(finding,'Keep original heuristic observation');
    const context=contexts(finding);assert.equal(context.requiresReview,false,'Executed own-origin response scope');
    assert.equal(guardProjectAssessment(context,finding,'contextual'),'contextual');
    assert.equal(guardProjectAssessment(context,{...finding,severity:'high'},'contextual'),'needs-review');
    assert.equal(context.projectFacts.embeddingPublicVerified,'unknown');assert.equal(context.projectFacts.sensitiveActionVerified,'unknown');
    assert.equal(prepareProjectContexts(collected.report,{...evidence,policy:'vylnt-project-assessment-v3'})(finding).requiresReview,true,'Archive policy unchanged');
  }
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
      controls:{signedSessionMapsToSyntheticUser:sqlSessionVerified,nativeBookmarkRowVerified:sqlWriteVerified,anonymousDeniedWithoutMutation:anonymousDenied,...(framing?{framing}: {}),...(framed?{framed}:{}),...(script?{script:script.controls}:{})},
      scope:{profile:scanPath,mutation:'/api/links',routeCoverage:'partial'},eligibleForTraining:false,classLabelsAssigned:false,modelEvaluated:false},
    'source.json':meta,
    ...(resource?{'resource-oracle.json':resource}:{}),
    ...(crossSite?{'cross-site-oracle.json':crossSite}:{}),
    ...(plaintext?{'hsts-oracle.json':plaintext}:{}),
    ...(hostPolicy?{'hsts-host-oracle.json':hostPolicy}:{}),
    ...(disablePolicy?{'hsts-disable-oracle.json':disablePolicy}:{}),
    ...(activationPolicy?{'hsts-activation-oracle.json':activationPolicy}:{})
  };
  if(process.env.VYLNT_NATIVE_SEEDS==='1'){
    assert.ok(independentCookie);
    const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
    const unnecessary=!!access&&access.checks.length>0&&access.checks.every(({baseline,restricted,restored})=>
      [baseline,restricted,restored].every(phase=>phase?.complete&&phase.authentication==='authenticated'&&phase.functionality==='passed')
      &&restricted?.read===false&&baseline.read===restored?.read);
    const scriptControls:JingoScriptSeedControls|undefined=script?{version:'vylnt-native-editor-oracle-v1',nativeWriteReadback:sqlSessionVerified&&sqlWriteVerified&&anonymousDenied,
      scanHash:script.originalScanHash,checkIdentity:identity,controls:script.controls,sourceScriptsHash:script.sourceScriptsHash}:undefined;
    const unknown={complete:false,functionality:'unknown',inline:'unknown'} as const;
    const resourceIds=resource?.targets.map(target=>target.findingId)??[];
    const batch=resource&&namedTls?await createTabinatorScriptSeedBatch(collected.report,seal,signer.trustedKeys,{
      version:'vylnt-native-editor-oracle-v1',nativeWriteReadback:sqlSessionVerified&&sqlWriteVerified&&anonymousDenied,
      scanHash:resource.originalScanHash,checkIdentity:identity,controls:{baseline:unknown,disabled:unknown,restored:unknown},
      transport:{leaf:namedTls.manifest.sha256,strictBrowserTls:true,wireHsts:'absent',directDependencyIds:resourceProfile==='resource-http'?resourceIds:[],
        ...(resourceProfile==='resource-upgrade'?{upgradedDependencyIds:resourceIds}:{})}},key):
      namedTls&&wireHsts?await createNativeApiHstsSeedBatch('tabinator',collected.report,seal,signer.trustedKeys,{
      nativeWriteReadback:sqlSessionVerified&&sqlWriteVerified&&anonymousDenied,checkIdentity:identity,leaf:namedTls.manifest.sha256,wireHsts,
      plaintextWitness:plaintext?await contentHash(plaintext):undefined,hostPolicyWitness:hostPolicy?await contentHash(hostPolicy):undefined},key):
      scriptControls?await createTabinatorScriptSeedBatch(collected.report,seal,signer.trustedKeys,scriptControls,key):await createTabinatorSeedBatch(collected.report,seal,signer.trustedKeys,
      {signedSessionMapsToSyntheticUser:sqlSessionVerified,nativeBookmarkRowVerified:sqlWriteVerified,anonymousDeniedWithoutMutation:anonymousDenied,
        cookie:independentCookie,javaScriptAccessUnnecessary:unnecessary,...(framing?{framePolicy:{version:framing.version,scanHash:framing.originalScanHash,checkIdentity:framing.checkIdentity,sourceHealthy:framing.sourceHealthy,
          ...(framing.mechanism?{mechanism:framing.mechanism}:{}),controls:{...framing.controls,permitted:framing.controls.permitted!,forbidden:framing.controls.forbidden!,repeatedForbidden:framing.controls.repeatedForbidden!,nestedForbidden:framing.controls.nestedForbidden!}}}:{}),...(framed?{framedWriteWitness:framed.witnessHash}:{}),...(crossSite?{crossSiteWitness:crossSite.witnessHash}:{})},key);
    prototype['development-seeds.json']=batch;
    if(resource)assert.ok(batch.rows.some(row=>row.category==='NET-001'&&!row.uncertain&&row.label===(resourceProfile==='resource-upgrade'?'contextual':'change-warranted')));
    if(wireHsts)assert.ok(batch.rows.some(row=>row.category==='HDR-001'&&!row.uncertain&&row.label===(wireHsts==='max-age=086400'||hostPolicy?'contextual':'change-warranted')));
    if(framing)assert.ok(batch.rows.some(row=>row.category==='HDR-002'&&row.label==='contextual'&&!row.uncertain),'Retained complete contextual framing seed');
    if(framed)assert.ok(batch.rows.some(row=>row.category==='HDR-002'&&row.label==='change-warranted'&&!row.uncertain));
    if(script)assert.ok(batch.rows.some(row=>row.category==='HDR-003'&&row.label===(hashedResponse||layeredScript||editorProfile==='script-early-meta'?'contextual':'change-warranted')&&!row.uncertain));
    if(sessionProfile){
      const expected=[...(!sessionProfile.secure?['CK-001']:[]),...(!sessionProfile.httpOnly?['CK-002']:[]),...(crossSite?['CK-003']:[])];
      assert.deepEqual(batch.rows.filter(r=>r.category.startsWith('CK-')&&!r.uncertain).map(r=>r.category).sort(),expected);
    }
  }
  result={version:1,completedAt:new Date().toISOString(),channel,responseProfile,source:{repository:meta.repository,revision:meta.revision,dependencyLockHash:meta.dependencyLockSha256},checkIdentity:identity,
    runtime:{node:process.versions.node,browser:browserVersion,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model??'unknown',logicalCpus:cpus().length,memoryBytes:totalmem(),elapsedMs:Math.round(performance.now()-started)},
    passed:true,eligibleForTraining:false,modelEvaluated:false,independentOracles:{signedSessionMapsToSyntheticUser:sqlSessionVerified,nativeBookmarkRowVerified:sqlWriteVerified,anonymousDeniedWithoutMutation:anonymousDenied},
    authDependencyTargets:measurement?.targets.length??0,cookieAccessTargets:access?.targets.length??0,authenticationInputs:inputs,
    cookieAccessChecks:access?.checks.map(({baseline,restricted,restored})=>({baseline,restricted,restored})),
    sourceInspection:{framework:evidence.inspection.framework,coverage:evidence.inspection.coverage,sourceCount:evidence.inspection.sourceHashes.length},
    strictTlsVerified:tlsProfile?collected.measurement.tlsValidated?.value:false,
    framingControls:framing?.controls,framingContextualSeed:framingProfile&&process.env.VYLNT_NATIVE_SEEDS==='1',
    scope:editorProfile||resourceProfile?'Native bookmark editor with a scoped script, resource or framing control and independently verified writes.':'Native API profile GET plus one protected bookmark write. Optional framing profile verifies only this response against own-origin, forbidden and nested ancestors. No frontend/CDN, route-wide protection, CSRF, training or qualification claim. Profiles remain one family.'};
}catch(error){
  // Never expose upstream logs, credentials, SQL records or request bodies.
  const message=error instanceof Error?error.message:'';
  const reason=/CERT|certificate|SSL|TLS|self.signed/i.test(message)?'certificate-validation':cancel.signal.aborted?'cancelled':'native-control-failed';
  const failed=resolve('test-results/native-projects/failures');await mkdir(failed,{recursive:true});
  const controls=script?.controls??(resource?{status:resource.status,sourceFunctionality:resource.sourceFunctionality,phases:resource.checks.map(check=>check.controls)}:undefined)
    ??(framed?{sameOrigin:framed.sameOrigin,crossOrigin:framed.crossOrigin,repeatedCrossOrigin:framed.repeatedCrossOrigin}:undefined);
  if(controls)console.error('Native editor control states:',JSON.stringify(controls));
  await writeFile(join(failed,'tabinator-'+randomUUID()+'.json'),JSON.stringify({family:'tabinator',channel,responseProfile,stage,reason,controls,certificate:tlsMaterial?.manifest.sha256??null,passed:false,qualification:false},null,2),{flag:'wx'});
  throw Error('Native Tabinator acceptance failed during '+stage+(cancel.signal.aborted?' (cancelled)':''));
}finally{
  if(proxy){proxy.closeAllConnections();await new Promise<void>(done=>proxy!.close(()=>done()));}
  if(assetServer){assetServer.closeAllConnections();await new Promise<void>(done=>assetServer!.close(()=>done()));}
  if(child?.pid&&child.exitCode===null){
    if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000}).catch(()=>{child!.kill('SIGKILL');});else child.kill('SIGKILL');
    if(child.exitCode===null&&child.signalCode===null)await new Promise<void>((done,reject)=>{
      const timer=setTimeout(()=>reject(Error('Native process cleanup did not complete')),5000);
      child!.once('exit',()=>{clearTimeout(timer);done();});
    });
  }
  const checked=await realpath(root),actualParent=await realpath(scratchParent),workspace=await realpath(process.cwd());
  if(actualParent!==scratchParent||checked!==root||dirname(checked)!==actualParent||
    (!namedTls&&!actualParent.startsWith(workspace+sep)))throw Error('Unexpected native cleanup path');
  await rm(checked,{recursive:true,force:true,maxRetries:8,retryDelay:200});
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);process.removeListener('message',message);if(process.connected)process.disconnect();
}
// Keep reproducible metadata-only observations for developer source work.
// Optional seed labels remain separate from source-lock claims. Dataset
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
await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/tabinator-${channel}${sessionProfile||editorProfile||namedProfile||resourceProfile||duplicateXfo?'-'+responseProfile:''}${tlsProfile?'-tls':''}${framingProfile?'-framing':''}${readable?'-readable-cookies':''}.json`,JSON.stringify({...result,cleanupCompleted:true},null,2));
console.log('Native Tabinator independent SQL/session and bounded cookie controls passed. Prototype metadata: '+relative(process.cwd(),artifact)+'. No category qualified.');

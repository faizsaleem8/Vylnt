import {nativeAdapterIdentity} from '../packages/ml/native-producer-identity';
import assert from 'node:assert/strict';
import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,rm,realpath,lstat,symlink,unlink} from 'node:fs/promises';
import {resolve,join,dirname,relative,sep,isAbsolute} from 'node:path';
import {createServer,request} from 'node:http';
import {createServer as createTlsServer} from 'node:https';
import {readNamedFixtureTls} from '../packages/ml/local-tls';
import {measureResourceFunction,mergeResourceFunction,upgradeFixtureHost,type ResourceMeasurement} from '../apps/cli/project-resource-function';
import {measureHstsActivation,measureHstsDisable,measureHstsHostPolicy,measureHstsPlaintext,measureInvalidHsts,mergeHstsActivation,mergeHstsDisable,mergeHstsHostPolicy,mergeHstsPlaintext,mergeInvalidHsts} from '../apps/cli/project-hsts-plaintext';
import {DatabaseSync} from 'node:sqlite';
import {cpus} from 'node:os';
import type {Page} from 'playwright';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {applyYoyoScriptProfile,checkYoyoEditor,writeFramedYoyo} from './native-yoyo-editor';
import {applySessionProfile,matchesSessionProfile,parseCrossSiteSessionProfile,parseSessionProfile} from '../scripts/native-session-profile.mjs';
import {measureFraming,mergeFramedWrite,type FramingMeasurement} from '../apps/cli/project-framing';
import {bookwiseScriptLayout,checkBookwiseEditor,checkBookwiseProfileMenu} from './native-bookwise-script';
import {measureScriptFunction,mergeScriptFunction,type ScriptMeasurement} from '../apps/cli/project-script-function';
import {measureAuthenticationCookies,mergeAuthenticationRole,type CookieDependencyMeasurement} from '../apps/cli/project-functional';
import {measureCrossSite,mergeCrossSiteMutation} from '../apps/cli/project-cross-site';
import {measureCookieJavaScriptAccess,mergeCookieAccess,type CookieAccessMeasurement} from '../apps/cli/project-cookie-access';
import {measureFramePolicy,mergeFramePolicy,type FramePolicyMeasurement} from '../apps/cli/project-frame-policy';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes';
import {inspectProject} from '../apps/server/project-inspection';
import {gateConfigSchema} from '../apps/cli/gate-config';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {invalidFixtureHsts,prepareProjectContexts,verifyProjectEvidence,projectFramePolicy,projectTransportPolicy,projectProtectedCrossSitePolicy,projectScriptPolicy,projectInlinePolicy,projectFrameWritePolicy,permissiveInlineDirective} from '../packages/core/project-evidence';
import {contentHash} from '../packages/core/integrity';
import {broadFrameAncestors,duplicateFrameDeny} from '../packages/core/frame-policy-scope';
import {projectBroadFrameWritePolicy,projectDuplicateXfoPolicy} from '../packages/core/project-evidence';
import {evalScriptDirective,projectEvalScriptPolicy,projectHashedScriptPolicy} from '../packages/core/project-evidence';
import {hashedFallbackForExternalScripts,nativeHashedResponse} from '../packages/ml/native-jingo-profile';
import {ProjectSigner} from '../apps/server/project-signing';
import {createBookwiseScriptSeedBatch,createYoyoScriptSeedBatch,createFieldPointResourceSeedBatch,createNativeWorkspaceScriptSeedBatch,createNativeApiHstsSeedBatch,createNativeSessionSeedBatch,nativeSessionSources,type JingoScriptSeedControls} from '../packages/ml/project-seed-corpus';
import {pinnedJingoBytes} from '../packages/ml/native-jingo-profile';
import {fieldPointMutationInventory,openFieldPointCrossSiteClients,probeFieldPointCrossSite} from './native-fieldpoint-cross-site';
import {nextFamilyDefinitions,checkNextAuthentication,habitLogoutPath,loginNextFamily,probeHabitLogout,writeNextFamily,wikiflowProfileCookie,wikiflowSessionProfile,type NextFamily,type NativePrincipal} from './native-next-family-adapters';

const family=process.env.VYLNT_NATIVE_FAMILY as 'fieldpoint'|'yoyo-collection'|NextFamily;
assert.ok(['fieldpoint','yoyo-collection','bookwise','wikiflow','habit-tracker'].includes(family));
const nextFamily=family==='bookwise'||family==='wikiflow'||family==='habit-tracker'?family:undefined;
const profile=process.env.VYLNT_NATIVE_PROFILE??'native';
const duplicateXfo=profile==='framing-duplicate-deny',frameProfile=profile==='framing'||duplicateXfo;
const protectedSession=family==='fieldpoint'&&profile.startsWith('protected-')?parseCrossSiteSessionProfile(profile.slice('protected-'.length)):undefined;
const protectedCrossSite=family==='fieldpoint'&&(profile==='cross-site-protected'||Boolean(protectedSession));
const overbroadSession=family==='fieldpoint'&&profile.startsWith('overbroad-')?parseCrossSiteSessionProfile(profile.slice('overbroad-'.length)):undefined;
const fieldPointCrossSite=protectedCrossSite||Boolean(overbroadSession);
const nativeEditor=family==='bookwise'||family==='yoyo-collection';
const resourceProfile=['resource-http','resource-upgrade','style-http','style-upgrade'].includes(profile);
const styleProfile=profile.startsWith('style-');
const resourceUpgrade=profile==='resource-upgrade'||profile==='style-upgrade';
const fieldPointResource=family==='fieldpoint'&&resourceProfile;
const fieldPointAsset=styleProfile?'/vendor/leaflet/leaflet.css':'/vendor/leaflet/leaflet.js';
const activateHsts=profile==='hsts-activate-native',disableHsts=profile==='hsts-disable-active',retainedHsts=profile==='hsts-invalid-host';
const hostHsts=profile==='hsts-host'||retainedHsts,invalidHsts=profile==='hsts-invalid'||retainedHsts;
const hsts=['hsts-disabled','hsts-positive','hsts-missing'].includes(profile)||hostHsts||invalidHsts||disableHsts||activateHsts;
const apiHstsFamily=family==='fieldpoint'||family==='habit-tracker'||family==='wikiflow'?family:undefined;
const apiHsts=apiHstsFamily!==undefined&&hsts;
const transportProfile=fieldPointResource||apiHsts||nativeEditor&&(resourceProfile||hsts);
const wireHsts=profile==='hsts-disabled'||disableHsts?'max-age=0':profile==='hsts-positive'||activateHsts?'max-age=086400':invalidHsts?invalidFixtureHsts:'absent';
const tls=transportProfile?await readNamedFixtureTls():undefined;
const layeredScript=profile==='script-layered-meta',restrictiveMeta=layeredScript||profile==='script-early-meta';
const hashedResponse=profile==='script-hashed-response';
const evalResponse=profile==='script-eval-response',specialResponse=hashedResponse||evalResponse;
const scriptProfile=(nativeEditor||family==='fieldpoint')&&['script-missing','script-early-meta','script-broad-response','script-broad-meta','script-layered-meta','script-hashed-response','script-eval-response'].includes(profile);
const fieldPointScript=family==='fieldpoint'&&scriptProfile;
const broadFrameWrite=profile==='framed-write-broad';
const framedWrite=(nativeEditor||family==='fieldpoint'||family==='habit-tracker')&&(profile==='framed-write'||broadFrameWrite);
const fieldPointFramedWrite=family==='fieldpoint'&&framedWrite;
const habitFramedWrite=family==='habit-tracker'&&framedWrite;
const editorPath=family==='bookwise'?'/categories':apiHsts?(nextFamily?nextFamilyDefinitions[nextFamily].path:'/api/auth/me'):'/';
const crossSiteProfile=['bookwise','yoyo-collection','habit-tracker'].includes(family)?parseCrossSiteSessionProfile(profile):undefined;
const sessionProfile=parseSessionProfile(profile)??crossSiteProfile;
const sessionCookie={'bookwise':'connect.sid','fieldpoint':'fp_session','yoyo-collection':'yoyo_session','habit-tracker':'habit_tracker.sid','wikiflow':wikiflowProfileCookie}[family];
const sessionCookieNames=family==='wikiflow'?[sessionCookie,sessionCookie+'.sig']:[sessionCookie];
assert.ok(fieldPointCrossSite||transportProfile||framedWrite||scriptProfile||frameProfile||['native','readable','cross-site-cookie'].includes(profile)||sessionProfile);
const source=resolve('.local/ml-native-expansion',family),parent=resolve('.local'),execute=promisify(execFile),cancel=new AbortController();
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium',started=performance.now();
const interrupt=()=>cancel.abort(),message=(m:unknown)=>{if(m&&typeof m==='object'&&'type' in m&&m.type==='cancel')interrupt();};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);process.on('message',message);
const env:NodeJS.ProcessEnv={};for(const key of ['PATH','Path','PATHEXT','SystemRoot','SYSTEMROOT','WINDIR','ComSpec','SystemDrive'])if(process.env[key])env[key]=process.env[key];
const git=async(args:string[])=>(await execute('git',args,{cwd:source,env,windowsHide:true,timeout:10000,maxBuffer:8*1024*1024,signal:cancel.signal})).stdout.trim();
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const meta=JSON.parse(await readFile(`ml/applications/native/${family}.source.json`,'utf8'));
assert.equal(meta.revision,nativeSessionSources[family].commit);assert.equal(meta.familyId,nativeSessionSources[family].family);
async function pinnedFiles(){
  assert.equal(await git(['rev-parse','HEAD']),meta.revision);const files:{file:string;bytes:Buffer}[]=[];let total=0;
  for(const entry of (await git(['ls-tree','-rz','--full-tree','HEAD'])).split('\0').filter(Boolean)){
    // Some upstream repositories commit dependency/cache trees, including
    // platform-specific symlinks. Never copy/execute those; npm ci installs the
    // independently pinned lock instead. All application files stay verified.
    const trackedPath=entry.slice(entry.indexOf('\t')+1);
    if(trackedPath.split('/').some(p=>p==='node_modules'||p==='.npm'))continue;
    const match=entry.match(/^100(?:644|755) blob ([a-f0-9]{40})\t(.+)$/s);assert.ok(match,'Only pinned regular source files');
    const [,expected,file]=match,path=resolve(source,file),within=relative(source,path),info=await lstat(path);
    assert.ok(!isAbsolute(within)&&within!=='..'&&!within.startsWith('..'+sep)&&info.isFile()&&!info.isSymbolicLink());
    assert.ok((await realpath(path)).startsWith(await realpath(source)+sep)&&info.size<=8*1024*1024&&(total+=info.size)<=32*1024*1024);
    files.push({file,bytes:pinnedJingoBytes(await readFile(path),expected)});
  }
  assert.ok(files.length>0&&files.length<=600);return files;
}
const files=await pinnedFiles();
const protectedInventory=fieldPointCrossSite?fieldPointMutationInventory(file=>{
  const entry=files.find(entry=>entry.file===file);assert.ok(entry);
  return entry.bytes.toString('utf8');
}):[];
for(const [file,expected] of Object.entries(meta.sourceSha256))assert.equal(hash(files.find(f=>f.file===file)!.bytes),expected,'Source identity');
assert.equal(hash(files.find(f=>f.file==='package-lock.json')!.bytes),meta.dependencyLockSha256);
const identity=await nativeAdapterIdentity(meta);
// Keep BookWise's two SQLite drivers on the same native filesystem during
// the Linux run. The other registered adapters retain their workspace root.
const scratchParent=tls&&(family==='bookwise'||family==='habit-tracker')?tls.directory:parent;
const root=await mkdtemp(join(scratchParent,'native-expansion-run-')),app=join(root,'app'),dbPath=family==='bookwise'?join(app,'books.sqlite'):family==='habit-tracker'?join(app,'server/data/habit-tracker.sqlite'):join(root,'native.sqlite');
const password='Vylnt1'+randomBytes(24).toString('hex'),secret=randomBytes(32).toString('hex'),username='fixture'+randomBytes(5).toString('hex');
let child:ChildProcess|undefined,proxy:ReturnType<typeof createServer>|ReturnType<typeof createTlsServer>|undefined,linked=false,stage='setup',port=0,startupFailed=false,browserVersion='unknown',applicationNode='unknown',unexpectedTls=0;
let assetProxy:ReturnType<typeof createServer>|undefined;
let measurement:CookieDependencyMeasurement|undefined,access:CookieAccessMeasurement|undefined,framing:FramePolicyMeasurement|undefined;
let scriptMeasurement:ScriptMeasurement|undefined;
let resourceMeasurement:ResourceMeasurement|undefined;
let plaintext:Awaited<ReturnType<typeof measureHstsPlaintext>>|undefined;
let hostPolicy:Awaited<ReturnType<typeof measureHstsHostPolicy>>|undefined;
let disablePolicy:Awaited<ReturnType<typeof measureHstsDisable>>|undefined;
let activationPolicy:Awaited<ReturnType<typeof measureHstsActivation>>|undefined;
let crossSiteClients:Awaited<ReturnType<typeof openFieldPointCrossSiteClients>>|undefined;
let protectedControls:Awaited<ReturnType<typeof probeFieldPointCrossSite>>|undefined;
let protectedWitness:string|undefined;
let writeMeasurement:FramingMeasurement|undefined;
let artifacts:Record<string,unknown>|undefined,result:Record<string,unknown>|undefined;
let sourceOverlayHash:string|undefined;
let selectedScriptPolicy=evalResponse?evalScriptDirective:hashedFallbackForExternalScripts;
try{
  await mkdir(join(root,'tmp'));await mkdir(join(root,'uploads'));
  for(const {file,bytes} of files){if(file.split('/').includes('node_modules')||file.startsWith('data/')||/\.(?:sqlite|sqlite3|db)(?:-wal|-shm)?$/i.test(file)||/(?:^|\/)\.env(?:\.|$)/.test(file))continue;const dest=join(app,file);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes);}
  if(family==='wikiflow'&&sessionProfile){
    const entry=join(app,'server.js'),overlay=wikiflowSessionProfile(await readFile(entry,'utf8'));
    await writeFile(entry,overlay);sourceOverlayHash=hash(overlay);
  }
  if(family==='bookwise'&&(scriptProfile||framedWrite||transportProfile)){
    const layout=join(app,'server/views/layouts/layout.hbs');
    const header=await readFile(join(app,'server/views/partials/structure/header-dashboard.hbs'),'utf8');
    const html=bookwiseScriptLayout(await readFile(layout,'utf8'),header,profile==='script-broad-meta'?'permissive-meta':restrictiveMeta||specialResponse);
    const moved=specialResponse?nativeHashedResponse(html,evalResponse?'eval':'inline'):undefined;
    if(moved)selectedScriptPolicy=moved.policy;
    await writeFile(layout,moved?.html??html);
  }
  if(family==='yoyo-collection'&&(restrictiveMeta||specialResponse||profile==='script-broad-meta')){
    const layout=join(app,'public/index.html');
    const html=applyYoyoScriptProfile(await readFile(layout,'utf8'),restrictiveMeta||specialResponse),moved=specialResponse?nativeHashedResponse(html,evalResponse?'eval':'inline'):undefined;
    if(moved)selectedScriptPolicy=moved.policy;
    await writeFile(layout,moved?.html??html);
  }
  if(fieldPointResource||fieldPointScript||fieldPointFramedWrite){
    const mapPath=join(app,'public/js/map.js'),map=await readFile(mapPath,'utf8');
    const external='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    assert.equal(map.split(external).length,2,'Expected the pinned tile template');
    // Preserve native Leaflet layout and events with an offline tile. The
    // dependency under test remains the original locked Leaflet asset.
    const tile='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22256%22%20height%3D%22256%22%3E%3Crect%20width%3D%22256%22%20height%3D%22256%22%20fill%3D%22%239cadad%22%2F%3E%3C%2Fsvg%3E';
    const overlay=map.replace(external,tile);
    await writeFile(mapPath,overlay);sourceOverlayHash=hash(overlay);
    if(fieldPointScript&&profile.endsWith('-meta')){
      const indexPath=join(app,'public/index.html'),html=await readFile(indexPath,'utf8');
      assert.equal(html.split('<head>').length,2);
      assert.ok(!/http-equiv\s*=\s*["']?content-security-policy/i.test(html));
      const directive=restrictiveMeta?"script-src 'self'":permissiveInlineDirective;
      const layout=html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${directive}">`);
      await writeFile(indexPath,layout);sourceOverlayHash=await contentHash({map:hash(overlay),html:hash(layout)});
    }
  }
  // Only dependencies are linked; the verified application source and all data
  // are disposable. Remove this junction before recursive cleanup.
  const dependencyRoot=transportProfile?join(parent,'native-linux-deps-'+family):source;
  if(transportProfile){
    assert.equal(await realpath(dependencyRoot),dependencyRoot);
    assert.equal(hash(await readFile(join(dependencyRoot,'package-lock.json'))),meta.dependencyLockSha256);
    assert.deepEqual(await readFile(join(dependencyRoot,'package.json')),files.find(f=>f.file==='package.json')?.bytes);
    if(family==='habit-tracker')for(const file of ['client/package.json','server/package.json'])
      assert.deepEqual(await readFile(join(dependencyRoot,file)),files.find(entry=>entry.file===file)?.bytes);
  }
  await symlink(join(dependencyRoot,'node_modules'),join(app,'node_modules'),process.platform==='win32'?'junction':'dir');linked=true;
  if(habitFramedWrite){
    stage='native Habit Tracker client build';
    const client=join(app,'client'),index=join(client,'index.html'),html=await readFile(index,'utf8');
    const fonts=/<link\s[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^">]*"[^>]*>/g;
    assert.equal([...html.matchAll(fonts)].length,3,'Expected only the reviewed cosmetic font links');
    const offline=html.replace(fonts,'');await writeFile(index,offline);
    const vite=join(dependencyRoot,'node_modules/vite/bin/vite.js');
    await execute(process.execPath,[vite,'build'],{cwd:client,env:{...env,NODE_ENV:'production'},windowsHide:true,timeout:60000,maxBuffer:1024*1024,signal:cancel.signal});
    const dist=await readFile(join(client,'dist/index.html'));
    sourceOverlayHash=await contentHash({html:hash(offline),builtPage:hash(dist)});
  }
  const listener="const net=require('node:net');const original=net.Server.prototype.listen;net.Server.prototype.listen=function(...args){if(typeof args[0]!=='number'&&typeof args[0]!=='string')throw Error('Unsupported native listener');const callback=args.find(x=>typeof x==='function');this.once('listening',()=>{const a=this.address();process.send?.({type:'listening',host:a.address,port:a.port,node:process.versions.node})});return original.call(this,0,'127.0.0.1',callback)};";
  const entry=nextFamily?nextFamilyDefinitions[nextFamily].bootstrap:family==='fieldpoint'?"Promise.all([import('./app/src/app.js'),import('./app/src/config.js')]).then(([a,c])=>a.createApp(c.loadConfig()).app.listen(0));":"import('./app/server.js');";
  await writeFile(join(root,'start.cjs'),listener+entry);
  if(fieldPointCrossSite)crossSiteClients=await openFieldPointCrossSiteClients();
  const allowedOrigins=crossSiteClients?[crossSiteClients.trusted,...(overbroadSession?[crossSiteClients.hostile]:[])].join(','):undefined;
  child=spawn(family==='wikiflow'?process.env.VYLNT_NATIVE_NODE20!:process.execPath,[join(root,'start.cjs')],{cwd:app,env:{...env,NODE_ENV:'test',PORT:'0',HOST:'127.0.0.1',DB_PATH:dbPath,SESSION_SECRET:secret,ADMIN_PASSWORD:password,VYLNT_SYNTH_USER:username,APP_KEY:secret,COOKIE_SECURE:'false',WF_ROTATE:'0',WIKI_BASE:'http://127.0.0.1:9',WIKI_GRAPHQL:'http://127.0.0.1:9/graphql',UPLOAD_DIR:join(root,'uploads'),RESTORE_TMP_DIR:join(root,'tmp'),TEMP:join(root,'tmp'),TMP:join(root,'tmp'),...(allowedOrigins?{ALLOWED_ORIGINS:allowedOrigins}:{})},stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  child.on('error',()=>{startupFailed=true;});child.once('exit',()=>cancel.abort());
  child.on('message',m=>{if(m&&typeof m==='object'&&'type' in m&&m.type==='listening'&&'host' in m&&m.host==='127.0.0.1'&&'port' in m&&typeof m.port==='number'&&'node' in m&&typeof m.node==='string'&&/^\d+\.\d+\.\d+$/.test(m.node)){port=m.port;applicationNode=m.node;}});
  // A first Linux launch on a Windows-mounted lock cache can take longer
  // while loading the native SQLite and password modules.
  stage='native startup';const deadline=Date.now()+(tls?120000:30000);
  while(!port){cancel.signal.throwIfAborted();assert.ok(!startupFailed&&child.exitCode===null,'Native startup');if(Date.now()>deadline)throw Error('Native startup timeout');await new Promise(r=>setTimeout(r,100));}
  const upstreamOrigin='http://127.0.0.1:'+port;
  let origin=upstreamOrigin;
  let directResourceOrigin=upstreamOrigin;
  if(fieldPointResource&&!resourceUpgrade){
    assetProxy=createServer((incoming,outgoing)=>{
      if(incoming.method!=='GET'||incoming.url!==fieldPointAsset){outgoing.writeHead(404).end();return;}
      // Expose one native asset on the fixture origin without forwarding
      // cookies, opening other application routes or modifying asset bytes.
      const upstream=request(upstreamOrigin+fieldPointAsset,{agent:false},response=>{
        const headers={...response.headers,'cross-origin-resource-policy':'cross-origin','cache-control':'no-store'};
        outgoing.writeHead(response.statusCode??502,headers);
        response.on('error',()=>outgoing.destroy());response.pipe(outgoing);
      });
      upstream.setTimeout(5000,()=>upstream.destroy());
      upstream.on('error',()=>outgoing.destroy());outgoing.on('close',()=>upstream.destroy());upstream.end();
    });
    await new Promise<void>(done=>assetProxy!.listen(0,'127.0.0.1',done));
    directResourceOrigin='http://127.0.0.1:'+(assetProxy.address() as {port:number}).port;
  }
  if(tls){
    const tlsProxy=createTlsServer({key:tls.key,cert:tls.cert},(incoming,outgoing)=>{
      const upstream=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,
        headers:{...incoming.headers,host:'127.0.0.1:'+port,'accept-encoding':'identity'},agent:false},response=>{
        const headers={...response.headers};
        if(incoming.url!==editorPath||response.statusCode!==200){outgoing.writeHead(response.statusCode??502,headers);response.pipe(outgoing);return;}
        if(wireHsts!=='absent')headers['strict-transport-security']=wireHsts;
        if(profile==='hsts-missing'||profile==='hsts-host')delete headers['strict-transport-security'];
        if(resourceUpgrade)headers['content-security-policy']='upgrade-insecure-requests';
        else if(fieldPointResource){
          const directive=styleProfile?'style-src':'script-src';
          const policy=headers['content-security-policy'];
          if(typeof policy!=='string'){outgoing.writeHead(502).end();response.resume();return;}
          const parts=policy.split(';').map(part=>part.trim()).filter(part=>part&&part!=='upgrade-insecure-requests');
          if(parts.filter(part=>part.startsWith(directive+' ')).length!==1){outgoing.writeHead(502).end();response.resume();return;}
          headers['content-security-policy']=parts.map(part=>part.startsWith(directive+' ')?part+' '+directResourceOrigin:part).join('; ');
        }
        if(!resourceProfile){outgoing.writeHead(response.statusCode,headers);response.pipe(outgoing);return;}
        const chunks:Buffer[]=[];let bytes=0;
        response.on('data',chunk=>{if((bytes+=chunk.length)>512*1024){response.destroy();outgoing.destroy();}else chunks.push(chunk);});
        response.on('end',()=>{
          const asset=fieldPointResource?fieldPointAsset:
            styleProfile?(family==='bookwise'?'/stylesheets/output.css':'/styles.css'):(family==='bookwise'?'/classes/Dropdown.js':'/app.js');
          const attr=styleProfile?'href':'src';
          let content=Buffer.concat(chunks).toString('utf8');
          if(fieldPointResource&&styleProfile){
            const map='<main id="map" role="application" aria-label="Map">';
            if(content.split(map).length!==2){outgoing.writeHead(502).end();return;}
            // Without Leaflet CSS, in-flow tiles can resize their own
            // container indefinitely. Bound the fixture viewport so the
            // native layout failure can be observed without a browser hang.
            content=content.replace(map,map.slice(0,-1)+' style="width:640px;height:480px;min-width:0;min-height:0;contain:size layout;overflow:hidden">');
          }
          const relative=attr+'="'+asset+'"';
          if(content.split(relative).length!==2){outgoing.writeHead(502).end();return;}
          const resourceOrigin=resourceUpgrade?origin.replace('https:','http:'):directResourceOrigin;
          delete headers['content-length'];delete headers['content-encoding'];delete headers.etag;
          outgoing.writeHead(response.statusCode!,headers).end(content.replace(relative,attr+'="'+resourceOrigin+asset+'"'));
        });
      });
      upstream.setTimeout(15000,()=>upstream.destroy());
      upstream.on('response',response=>response.on('error',()=>outgoing.destroy()));
      upstream.on('error',()=>outgoing.destroy());incoming.on('aborted',()=>upstream.destroy());outgoing.on('close',()=>upstream.destroy());incoming.pipe(upstream);
    });
    tlsProxy.on('tlsClientError',()=>{unexpectedTls++;});proxy=tlsProxy;
    await new Promise<void>(done=>tlsProxy.listen(0,'127.0.0.1',done));
    origin='https://'+upgradeFixtureHost+':'+(tlsProxy.address() as {port:number}).port;
  }
  if(!tls&&profile!=='native'&&(!framedWrite||fieldPointFramedWrite||broadFrameWrite)&&(!scriptProfile||fieldPointScript||layeredScript||specialResponse||profile==='script-broad-response')){
    proxy=createServer((incoming,outgoing)=>{
      const originHeader=incoming.headers.origin;
      // Pass both fixture origins through CORS for this one operation so
      // the application's origin check, not the proxy, decides the write.
      const requestedMethod=incoming.method==='OPTIONS'?incoming.headers['access-control-request-method']:incoming.method;
      const knownRoute=protectedInventory.some(route=>route.path===incoming.url&&route.method===requestedMethod);
      const diagnosticCors=Boolean(crossSiteClients&&originHeader&&knownRoute&&
        (originHeader===crossSiteClients.hostile||originHeader===crossSiteClients.trusted&&incoming.url==='/api/sites'&&requestedMethod==='POST'));
      const corsHeaders=diagnosticCors?{'access-control-allow-origin':originHeader,'access-control-allow-credentials':'true',vary:'Origin'}:{};
      if(diagnosticCors&&incoming.method==='OPTIONS'){
        if(incoming.headers['access-control-request-headers']!=='content-type'){
          outgoing.writeHead(400).end();return;
        }
        outgoing.writeHead(204,{...corsHeaders,'access-control-allow-methods':requestedMethod,'access-control-allow-headers':'content-type'}).end();return;
      }
      if(diagnosticCors&&originHeader)crossSiteClients!.observePost(originHeader,incoming.headers['sec-fetch-site']);
      const host=fieldPointFramedWrite?'127.0.0.1:'+(proxy!.address() as {port:number}).port:`127.0.0.1:${port}`;
      const upstream=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,headers:{...incoming.headers,host},agent:false},response=>{
        const headers:import('node:http').OutgoingHttpHeaders={...response.headers,...corsHeaders};if(profile==='readable'&&Array.isArray(headers['set-cookie']))headers['set-cookie']=headers['set-cookie'].map(v=>v.replace(/;\s*httponly\s*(?=;|$)/gi,''));
        if(sessionProfile&&Array.isArray(headers['set-cookie'])){
          for(const name of sessionCookieNames)headers['set-cookie']=applySessionProfile(headers['set-cookie'],name,sessionProfile);
        }
        const fieldPointSession=protectedSession??overbroadSession;
        if(fieldPointSession&&Array.isArray(headers['set-cookie'])){
          headers['set-cookie']=applySessionProfile(headers['set-cookie'],sessionCookie,fieldPointSession);
        }else if((profile==='cross-site-cookie'||protectedCrossSite)&&Array.isArray(headers['set-cookie'])){
          headers['set-cookie']=headers['set-cookie'].map(v=>v.replace(/;\s*SameSite=[^;]*/gi,'').replace(/;\s*Secure\s*(?=;|$)/gi,'')+'; Secure; SameSite=None');
        }
        if(incoming.url===editorPath){
          if(specialResponse)headers['content-security-policy']=selectedScriptPolicy;
          else if(layeredScript||profile==='script-broad-response')headers['content-security-policy']=permissiveInlineDirective;
          else if(fieldPointScript)delete headers['content-security-policy'];
          else if(fieldPointFramedWrite){
            const policy=headers['content-security-policy'];
            if(typeof policy!=='string'){outgoing.writeHead(502).end();response.resume();return;}
            const directives=policy.split(';').map(part=>part.trim()).filter(Boolean);
            const kept=directives.filter(part=>!/^frame-ancestors\s/i.test(part));
            if(kept.length!==directives.length-1){outgoing.writeHead(502).end();response.resume();return;}
            headers['content-security-policy']=(broadFrameWrite?[...kept,broadFrameAncestors]:kept).join('; ');
            delete headers['x-frame-options'];
          }else if(broadFrameWrite){
            headers['content-security-policy']=broadFrameAncestors;
            delete headers['x-frame-options'];
          }
        }
        if(profile==='framing'){headers['content-security-policy']='frame-ancestors '+origin;delete headers['x-frame-options'];}
        if(duplicateXfo){delete headers['content-security-policy'];headers['x-frame-options']=duplicateFrameDeny;}
        outgoing.writeHead(response.statusCode??502,headers);response.pipe(outgoing);response.on('error',()=>outgoing.destroy());
      });
      upstream.setTimeout(10000,()=>upstream.destroy());upstream.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});incoming.on('aborted',()=>upstream.destroy());outgoing.on('close',()=>upstream.destroy());incoming.pipe(upstream);
    });await new Promise<void>(done=>proxy!.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+(proxy.address() as {port:number}).port;
  }
  if(process.connected)process.send?.({type:'native-ready',pid:child.pid,root});
  const path=scriptProfile||framedWrite||transportProfile?editorPath:nextFamily?nextFamilyDefinitions[nextFamily].path:family==='fieldpoint'?'/api/auth/me':'/api/config',mutation=nextFamily?nextFamilyDefinitions[nextFamily].mutation:family==='fieldpoint'?'/api/sites':'/api/yoyos';
  const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(protectedCrossSite||fieldPointResource?240000:120000)]);
  const check=async(p:Page)=>{if(nextFamily)return checkNextAuthentication(nextFamily,p,origin);const response=await p.goto(origin+path);if(response?.status()!==200)return 'unknown' as const;const data=await response.json();
    return family==='fieldpoint'?(data.user?.id?'authenticated' as const:data.user===null?'anonymous' as const:'unknown' as const):(data.loggedIn===true?'authenticated' as const:data.loggedIn===false?'anonymous' as const:'unknown' as const);};
  let signedSession=false,nativeWrite=false,anonymousDenied=false,userId:number|undefined,values:string[]=[],cookie:{secure:boolean;httpOnly:boolean}|undefined;
  let principal:NativePrincipal|undefined,csrfRejected:boolean|undefined;
  let crossSiteControl:Awaited<ReturnType<typeof measureCrossSite>>|undefined;
  let nativeCookies:{name:string;secure:boolean;httpOnly:boolean}[]=[];
  const run={origin:tls?upstreamOrigin:origin,username,password,secret,dbPath};
  const allowedLocalOrigins=tls?[origin,origin.replace('https:','http:'),...(resourceProfile&&!resourceUpgrade?[directResourceOrigin]:[])]:[origin];
  const useTlsCookies=async(context:import('playwright').BrowserContext)=>{
    if(!tls)return;
    const cookies=await context.cookies(upstreamOrigin);await context.clearCookies();
    await context.addCookies(cookies.map(({name,value,httpOnly,sameSite,expires,secure})=>({url:origin,name,value,httpOnly,sameSite,expires,secure})));
  };
  stage='native login and independent session oracle';
  const collected=await scanProjectPage(origin+path,{allowedLocalOrigins,namedUpgradeFixture:!!tls,requireComplete:true,channel,signal,hooks:{
    prepare:async(_page,context)=>{
      if(nextFamily){
        principal=await loginNextFamily(nextFamily,context,run,sourceOverlayHash?wikiflowProfileCookie:undefined);signedSession=principal.signatureVerified;
        if(scriptProfile||framedWrite||transportProfile){
          const controls=await writeNextFamily(nextFamily,context,run,principal);
          nativeWrite=controls.nativeWrite;anonymousDenied=controls.anonymousDenied;csrfRejected=controls.csrfRejected;
        }
        await useTlsCookies(context);
        const cookies=await context.cookies();values=cookies.map(c=>c.value);if(principal.csrf)values.push(principal.csrf);
        nativeCookies=cookies.map(({name,secure,httpOnly})=>({name,secure,httpOnly}));cookie={secure:cookies[0].secure,httpOnly:cookies[0].httpOnly};return;
      }
      const response=await context.request.post(run.origin+(family==='fieldpoint'?'/api/auth/register':'/api/login'),{data:family==='fieldpoint'?{email:username+'@example.invalid',name:username,password}:{password},maxRedirects:0,timeout:10000});
      assert.equal(response.status(),family==='fieldpoint'?201:200,'Native login');if(family==='fieldpoint')userId=(await response.json()).user.id;
      const cookies=await context.cookies();assert.equal(cookies.length,1,'Unambiguous session');values=cookies.map(c=>c.value);cookie={secure:cookies[0].secure,httpOnly:cookies[0].httpOnly};
      const [id,sig,...extra]=decodeURIComponent(cookies[0].value).split('.');assert.equal(extra.length,0);const expected=createHmac('sha256',secret).update(id).digest(family==='fieldpoint'?'hex':'base64url');
      assert.equal(sig.length,expected.length);assert.ok(timingSafeEqual(Buffer.from(sig),Buffer.from(expected)),'Independent signature');
      if(family==='fieldpoint'){
        const db=new DatabaseSync(dbPath,{readOnly:true});try{const session=db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(id),user=db.prepare('SELECT id FROM users WHERE email = ?').get(username+'@example.invalid');
          signedSession=user?.id===userId&&session?.user_id===userId&&Number(session?.expires_at)>Date.now();}finally{db.close();}
      }else{const payload=JSON.parse(Buffer.from(id,'base64url').toString('utf8'));signedSession=Number.isSafeInteger(payload.exp)&&payload.exp>Date.now();}
      assert.ok(signedSession,'Native principal/session oracle');
      if(apiHsts||fieldPointResource||fieldPointScript||fieldPointFramedWrite){
        stage='native FieldPoint mutation and independent owner readback';
        const body={name:'VYLNT disposable site',lat:40,lng:-74,category:'office'};
        const written=await context.request.post(upstreamOrigin+mutation,{data:body,maxRedirects:0,timeout:5000});
        assert.equal(written.status(),201);
        const db=new DatabaseSync(dbPath,{readOnly:true}),denied=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
        try{
          const row=db.prepare('SELECT name, created_by FROM sites').all();
          assert.equal(row.length,1);assert.equal(row[0].name,body.name);assert.equal(row[0].created_by,userId);
          nativeWrite=true;
          const anonymous=await denied.request.post(upstreamOrigin+mutation,{data:body,maxRedirects:0,timeout:5000});
          anonymousDenied=[401,403].includes(anonymous.status());
          assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sites').get()?.count,1);
        }finally{db.close();await denied.close();}
      }
      await useTlsCookies(context);
    },
    collected:async(_page,context,report)=>{
      browserVersion=context.browser()?.version()??'unknown';
      if(tls){
        stage='strict TLS editor controls';
        assert.equal(_page.url(),origin+path,'Protected editor must load at its exact strict origin');
        if(apiHsts){
          stage='strict TLS authenticated API response';
          const authenticated=await _page.locator('pre').evaluate((element,which)=>{
            const data=JSON.parse(element.textContent??'');
            return which==='fieldpoint'?Boolean(data.user?.id):data.authenticated===true;
          },family);
          assert.ok(authenticated&&nativeWrite&&anonymousDenied&&signedSession&&unexpectedTls===0);
          if(family==='wikiflow')assert.equal(csrfRejected,true,'Native term write must reject a missing CSRF token');
          if(activateHsts){
            stage='native HSTS activation from verified plaintext baseline';
            activationPolicy=await measureHstsActivation(_page,report,identity,tls,signal);
          }else if(disableHsts){
            stage='native HSTS removal after verified upgrade';
            disablePolicy=await measureHstsDisable(_page,report,identity,tls,signal);
          }else if(hostHsts){
            stage='same-host HSTS installation and reset';
            hostPolicy=await measureHstsHostPolicy(_page,report,identity,tls,signal,retainedHsts?invalidFixtureHsts:undefined);
          }else if(profile==='hsts-missing'||invalidHsts){
            stage='same-browser HSTS plaintext and positive control';
            plaintext=await (invalidHsts?measureInvalidHsts:measureHstsPlaintext)(context,report,identity,tls,signal);
          }
          return;
        }
        const resourceCheck=fieldPointResource?async(p:Page)=>{
          const map=p.locator('#map'),pane=map.locator('.leaflet-tile-pane');
          if(await map.count()!==1)return 'unknown' as const;
          // Workspace imports are asynchronous even after the load event.
          // Wait for either native initialization or its visible error path.
          await p.waitForFunction(()=>document.querySelector('#map .leaflet-tile-pane')||
            document.querySelector<HTMLElement>('#auth-view')?.hidden===false,{},{timeout:3000}).catch(()=>null);
          if(!styleProfile&&await p.locator('#auth-view').isVisible()&&await pane.count()===0&&
            await p.evaluate(()=>!Object.hasOwn(globalThis,'L')))return 'failed' as const;
          if(!await map.isVisible()||await pane.count()!==1)return 'unknown' as const;
          if(styleProfile){
            const positioning=await pane.evaluate(element=>getComputedStyle(element).position);
            if(positioning==='static')return 'failed' as const;
            if(positioning!=='absolute')return 'unknown' as const;
            const tile=pane.locator('.leaflet-tile-loaded').first();
            if(!await tile.count())return 'unknown' as const;
            return await tile.evaluate(element=>getComputedStyle(element).position)==='absolute'?'passed' as const:'unknown' as const;
          }
          const dialog=p.locator('#site-dialog');
          if(await dialog.count()!==1||await dialog.isVisible())return 'unknown' as const;
          await map.click({button:'right',position:{x:120,y:120}});
          if(!await dialog.isVisible())return 'unknown' as const;
          const coordinates=await dialog.locator('input[name="lat"], input[name="lng"]').evaluateAll(inputs=>inputs.map(input=>(input as HTMLInputElement).value));
          await p.keyboard.press('Escape');
          return coordinates.length===2&&coordinates.every(value=>value!==''&&Number.isFinite(Number(value)))&&!await dialog.isVisible()?'passed' as const:'unknown' as const;
        }:family==='bookwise'?checkBookwiseProfileMenu:async(p:Page)=>{
          const result=await checkYoyoEditor(p);
          if(result==='passed'){await p.keyboard.press('Escape');if(await p.locator('#modal').isVisible())return 'unknown' as const;}
          return result;
        };
        if(resourceProfile){
          stage='strict TLS resource dependency controls';
          const check=styleProfile&&!fieldPointResource?async(p:Page)=>{
            const control=p.locator(family==='bookwise'?'#profileDropdownMenu':'#modal');
            const closedClass=family==='bookwise'?'invisible':'hidden';
            if(await control.count()!==1||!await control.evaluate((element,name)=>element.classList.contains(name),closedClass))return 'unknown' as const;
            // A closed control appearing onscreen is a measured behavior failure.
            if(await control.isVisible())return 'failed' as const;
            return resourceCheck(p);
          }:resourceCheck;
          resourceMeasurement=await measureResourceFunction(context,report,{identityHash:identity,check,...(styleProfile?{resourceKind:'stylesheet' as const}:{})},signal);
          assert.equal(resourceMeasurement.status,'verified',JSON.stringify(resourceMeasurement.checks.map(check=>check.controls)));
        }else assert.equal(await (family==='bookwise'?checkBookwiseEditor:resourceCheck)(_page),'passed');
        if(family==='yoyo-collection'){
          stage='strict TLS native write and SQLite readback';
          const db=new DatabaseSync(dbPath,{readOnly:true}),denied=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
          try{
            const response=await denied.request.post(upstreamOrigin+mutation,{data:{brand:'VYLNT fixture',model:'Anonymous denied'},maxRedirects:0,timeout:5000});
            assert.ok([401,403].includes(response.status()));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM yoyos').get()?.n,0);
            anonymousDenied=true;
            nativeWrite=await writeFramedYoyo(_page,origin,db,'Disposable editor write');
          }finally{db.close();await denied.close();}
        }
        assert.ok(nativeWrite&&anonymousDenied&&signedSession&&unexpectedTls===0);
        if(activateHsts){
          stage='native HSTS activation from verified plaintext baseline';
          activationPolicy=await measureHstsActivation(_page,report,identity,tls,signal);
        }else if(disableHsts){
          stage='native HSTS removal after verified upgrade';
          disablePolicy=await measureHstsDisable(_page,report,identity,tls,signal);
        }else if(hostHsts){
          stage='same-host HSTS installation and reset';
          hostPolicy=await measureHstsHostPolicy(_page,report,identity,tls,signal,retainedHsts?invalidFixtureHsts:undefined);
        }else if(profile==='hsts-missing'||invalidHsts){
          stage='same-browser HSTS plaintext and positive control';
          plaintext=await (invalidHsts?measureInvalidHsts:measureHstsPlaintext)(context,report,identity,tls,signal);
        }
        return;
      }
      if(sessionProfile){
        stage='browser session profile verification';
        for(const name of sessionCookieNames){
          const matching=report.observation.cookies?.filter(c=>c.name===name);
          assert.ok(matching?.length===1&&matchesSessionProfile(matching[0],sessionProfile),'Browser session attributes differ from the registered profile');
        }
      }
      if(protectedSession){
        const matching=report.observation.cookies?.filter(c=>c.name===sessionCookie);
        assert.ok(matching?.length===1&&matchesSessionProfile(matching[0],protectedSession),'Protected cross-site session attributes differ');
      }
      if(framedWrite){
        stage='authenticated framing writes';assert.ok(signedSession);
        if(habitFramedWrite){
          assert.ok(principal&&nativeWrite&&anonymousDenied);
          const db=new DatabaseSync(dbPath,{readOnly:true});
          try{
            let step=0;
            writeMeasurement=await measureFraming(context,report,{identityHash:identity,writePath:mutation,check:async frame=>{
              const marker='Disposable framed note '+step++,row=()=>db.prepare('SELECT id,month FROM notes WHERE content=?').get(marker);
              assert.equal(row(),undefined);
              const input=frame.getByPlaceholder('Add a note for this month…');
              await input.fill(marker);
              const [response]=await Promise.all([
                frame.page().waitForResponse(r=>r.url()===origin+mutation&&r.request().method()==='POST',{timeout:5000}),
                input.press('Enter'),
              ]);
              const saved=row();return response.status()===201&&typeof saved?.month==='string'&&/^\d{4}-\d{2}$/.test(saved.month);
            }},signal);
            assert.equal(writeMeasurement.coverage,'complete');assert.equal(step,3);
            assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notes').get()?.n,4);
          }finally{db.close();}
          return;
        }
        if(fieldPointFramedWrite){
          assert.ok(nativeWrite&&anonymousDenied&&Number.isSafeInteger(userId));
          const db=new DatabaseSync(dbPath,{readOnly:true});
          try{
            let step=0;
            writeMeasurement=await measureFraming(context,report,{identityHash:identity,writePath:mutation,check:async frame=>{
              const name='Disposable framed site '+step++,row=()=>db.prepare('SELECT created_by FROM sites WHERE name=?').get(name);
              assert.equal(row(),undefined);
              await frame.locator('#add-btn').click();
              const form=frame.locator('#site-form');
              await form.locator('input[name="name"]').fill(name);
              await form.locator('input[name="lat"]').fill('40');
              await form.locator('input[name="lng"]').fill('-74');
              const [response]=await Promise.all([
                frame.page().waitForResponse(r=>r.url()===origin+mutation&&r.request().method()==='POST',{timeout:5000}),
                form.locator('button[type="submit"]').click(),
              ]);
              return response.status()===201&&row()?.created_by===userId;
            }},signal);
            assert.equal(writeMeasurement.coverage,'complete');
            assert.equal(step,3);
            assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sites').get()?.n,4);
          }finally{db.close();}
          return;
        }
        if(family==='yoyo-collection'){
          const denied=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
          const db=new DatabaseSync(dbPath,{readOnly:true});
          try{
            const response=await denied.request.post(origin+mutation,{data:{brand:'VYLNT fixture',model:'Anonymous denied'},maxRedirects:0,timeout:5000});
            assert.ok([401,403].includes(response.status()));
            assert.equal(db.prepare('SELECT COUNT(*) AS n FROM yoyos').get()?.n,0);
            anonymousDenied=true;
            let step=0;
            writeMeasurement=await measureFraming(context,report,{identityHash:identity,writePath:mutation,
              check:frame=>writeFramedYoyo(frame,origin,db,`Disposable framed ${step++}`)},signal);
            assert.equal(writeMeasurement.coverage,'complete');assert.equal(step,3);
            assert.equal(db.prepare('SELECT COUNT(*) AS n FROM yoyos').get()?.n,3);
            nativeWrite=true;
          }finally{db.close();await denied.close();}
          return;
        }
        assert.ok(principal&&nativeWrite&&anonymousDenied);
        const db=new DatabaseSync(dbPath,{readOnly:true});
        try{
          let step=0;
          writeMeasurement=await measureFraming(context,report,{identityHash:identity,writePath:'/categories/api',check:async frame=>{
            const name='disposable-framed-'+step++;
            const count=()=>Number(db.prepare('SELECT COUNT(*) AS n FROM Categories WHERE userId=? AND name=?').get(principal!.id,name)!.n);
            assert.equal(count(),0);
            await frame.locator('#addCategoryForm input[name="name"]').fill(name);
            const response=frame.page().waitForResponse(r=>r.url()===origin+'/categories/api'&&r.request().method()==='POST');
            await frame.locator('#addCategoryForm button[type="submit"]').click();
            return (await response).status()===201&&count()===1;
          }},signal);
          assert.equal(writeMeasurement.coverage,'complete');assert.equal(step,3);
        }finally{db.close();}
        return;
      }
      if(scriptProfile){
        stage='native editor script controls';
        const checkEditor=fieldPointScript?async(p:Page)=>{
          const workspace=p.locator('#app-view'),pane=p.locator('#map .leaflet-tile-pane'),dialog=p.locator('#site-dialog');
          if(await workspace.count()!==1||await dialog.count()!==1)return 'unknown' as const;
          const initialized=await pane.waitFor({state:'attached',timeout:2000}).then(()=>true,()=>false);
          if(!initialized)return await workspace.isHidden()&&await dialog.isHidden()?'failed' as const:'unknown' as const;
          if(!await dialog.isHidden()||!await workspace.isVisible())return 'unknown' as const;
          await p.locator('#add-btn').click({timeout:1500});
          if(!await dialog.isVisible())return 'failed' as const;
          await dialog.locator('#cancel-btn').click({timeout:1500});
          return await dialog.isHidden()?'passed' as const:'unknown' as const;
        }:family==='bookwise'?checkBookwiseEditor:checkYoyoEditor;
        scriptMeasurement=await measureScriptFunction(context,report,{identityHash:identity,check:checkEditor},signal);
        if(scriptMeasurement.status!=='verified')console.error('Incomplete native script controls',scriptMeasurement.controls);
        assert.equal(scriptMeasurement.status,'verified');
        if(family==='bookwise'||fieldPointScript)return;
        stage='native editor independent write and anonymous denial';
        const db=new DatabaseSync(dbPath,{readOnly:true}),denied=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
        try{
          const response=await denied.request.post(origin+mutation,{data:{brand:'VYLNT fixture',model:'Anonymous denied'},maxRedirects:0,timeout:5000});
          assert.ok([401,403].includes(response.status()));
          assert.equal(db.prepare('SELECT COUNT(*) AS n FROM yoyos').get()?.n,0);
          anonymousDenied=true;
          assert.ok(await writeFramedYoyo(_page,origin,db,'Disposable editor write'));
          nativeWrite=true;
        }finally{db.close();await denied.close();}
        return;
      }
      if(frameProfile){
        stage='ancestor controls';framing=await measureFramePolicy(context,report,{identityHash:identity,check:frame=>frame.evaluate((which)=>{try{const data=JSON.parse(document.querySelector('pre')?.textContent??'');return which==='bookwise'?Array.isArray(data):which==='wikiflow'||which==='habit-tracker'?data.authenticated===true:which==='fieldpoint'?!!data.user?.id:data.loggedIn===true;}catch{return false;}},family)},signal);assert.equal(framing.status,'verified');
      }
      stage='cookie removal/restoration';measurement=await measureAuthenticationCookies(context,report,{identityHash:identity,check},signal);if(family!=='wikiflow')assert.ok(measurement.targets.length>0);
      stage='HttpOnly compatibility';access=await measureCookieJavaScriptAccess(context,report,{identityHash:identity,check:async p=>{const authentication=await check(p);return{authentication,functionality:authentication==='authenticated'?'passed':'unknown'};}},signal);
      stage='native mutation and independent SQLite readback';
      if(nextFamily){
        assert.ok(principal);const controls=await writeNextFamily(nextFamily,context,run,principal);nativeWrite=controls.nativeWrite;anonymousDenied=controls.anonymousDenied;csrfRejected=controls.csrfRejected;
        if(crossSiteProfile&&nextFamily==='habit-tracker'){
          stage='native cross-site session logout';
          crossSiteControl=await probeHabitLogout(context,report,run,identity,signal);
        }
        if((profile==='cross-site-cookie'||crossSiteProfile)&&nextFamily==='bookwise'){
          stage='cross-site category creation';
          const matching=report.findings.filter(f=>f.ruleId==='CK-003');assert.equal(matching.length,1);
          const cookieName=matching[0].evidence.cookieName;assert.equal(typeof cookieName,'string');assert.ok(typeof cookieName==='string');
          const db=new DatabaseSync(dbPath,{readOnly:true}),owner=principal.id;
          try{
            crossSiteControl=await measureCrossSite(context,report,{identityHash:identity,path:mutation,cookieName,
              prepare:async phase=>({name:'disposable-'+phase}),
              observe:async phase=>{
                const row=db.prepare('SELECT COUNT(*) AS n FROM Categories WHERE userId=? AND name=?').get(owner,'disposable-'+phase);
                return row?.n===1?'changed':row?.n===0?'unchanged':'unknown';
              }},signal);
          }finally{db.close();}
        }
        return;
      }
      const body=family==='fieldpoint'?{name:'VYLNT disposable site',lat:40,lng:-74,category:'office'}:{brand:'VYLNT fixture',model:'Disposable collection entry'};
      const written=await context.request.post(origin+mutation,{data:body,maxRedirects:0,timeout:5000});assert.equal(written.status(),201,'Native write');
      const db=new DatabaseSync(dbPath,{readOnly:true}),table=family==='fieldpoint'?'sites':'yoyos';
      try{
        nativeWrite=Number(db.prepare('SELECT COUNT(*) AS count FROM '+table).get()!.count)===1;assert.ok(nativeWrite,'Independent native row readback');
        const anon=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
        try{const denied=await anon.request.post(origin+mutation,{data:body,maxRedirects:0,timeout:5000});anonymousDenied=[401,403].includes(denied.status());}finally{await anon.close();}
        assert.ok(anonymousDenied);assert.equal(db.prepare('SELECT COUNT(*) AS count FROM '+table).get()!.count,1,'Anonymous mutation must not succeed');
        if(family==='yoyo-collection'&&crossSiteProfile){
          stage='native cross-site photo upload';
          const id=db.prepare('SELECT id FROM yoyos').get()?.id;
          assert.ok(typeof id==='number'&&Number.isSafeInteger(id)&&id>0);
          const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP2sAAAAASUVORK5CYII=','base64');
          const photos=()=>db.prepare('SELECT id,filename FROM photos WHERE yoyo_id=? ORDER BY id').all(id);
          let previous:ReturnType<typeof photos>=[];
          crossSiteControl=await measureCrossSite(context,report,{identityHash:identity,path:`/api/yoyos/${id}/photos`,cookieName:sessionCookie,
            multipartImage:{field:'photos',bytes},prepare:async()=>{previous=photos();return {};},
            observe:async()=>{
              const current=photos(),last=current.at(-1);
              if(JSON.stringify(current)===JSON.stringify(previous))return 'unchanged';
              if(current.length!==previous.length+1||JSON.stringify(current.slice(0,-1))!==JSON.stringify(previous)||
                typeof last?.filename!=='string'||!/^[a-zA-Z0-9_-]+\.png$/.test(last.filename))return 'unknown';
              const file=await readFile(join(root,'uploads',last.filename));
              return file.equals(bytes)?'changed':'unknown';
            }},signal);
          assert.equal(crossSiteControl.controls.anonymous.status,403);
          assert.equal(photos().length,3);
        }
        if(crossSiteClients){
          stage='cross-site FieldPoint site creation';
          protectedControls=await probeFieldPointCrossSite(context,origin+mutation,crossSiteClients,name=>{
            const row=db.prepare('SELECT created_by FROM sites WHERE name=?').get(name);
            return !row?'unchanged':row.created_by===userId?'owned':'different';
          },protectedInventory,()=>{
            const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
            assert.ok(tables.length<=40);
            const state=tables.map(({name})=>{
              assert.ok(typeof name==='string'&&/^[a-z_][a-z0-9_]*$/i.test(name));
              const rows=db.prepare('SELECT * FROM "'+name+'" LIMIT 101').all();
              assert.ok(rows.length<=100);
              return [name,rows.map(row=>JSON.stringify(row)).sort()];
            });
            // Database contents stay in process memory; the receipt keeps only
            // whether the before and after snapshots agreed.
            return hash(JSON.stringify(state));
          },signal,protectedSession??overbroadSession,overbroadSession?'overbroad':'protected');
          const {trusted,hostile,hostileRepeated,anonymous,lax,restored}=protectedControls;
          const created=(result:typeof trusted|undefined)=>result?.complete&&result.cookieSent&&result.status===201&&result.state==='owned';
          assert.ok(created(trusted)&&created(restored)&&
            [anonymous,lax].every(result=>result.complete&&!result.cookieSent&&result.status===401&&result.state==='unchanged'),
            'Expected trusted writes and cookie counterfactuals');
          if(overbroadSession)assert.ok(created(hostile)&&created(hostileRepeated)&&protectedControls.routeCoverage==='partial','Expected repeated foreign write in the overbroad configuration');
          else assert.ok(hostile.complete&&hostile.cookieSent&&hostile.nativeOriginDenial&&hostile.state==='unchanged'&&
            protectedControls.routeCoverage==='complete','Expected explicit application denial');
        }
      }finally{db.close();}
    }
  }});
  assert.ok(cookie&&(tls||writeMeasurement||scriptMeasurement||measurement&&access));stage='same-run evidence';
  const logoutProbe=family==='habit-tracker'&&crossSiteProfile?{crossSiteOperation:habitLogoutPath}:undefined;
  let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:meta.revision,configHash:await contentHash({profile,path,mutation,shim:hash(listener+entry),...logoutProbe,...(sourceOverlayHash?{sourceOverlayHash}:{}),...(tls?{leaf:tls.manifest.sha256}:{})}),adapterHash:identity},false);
  evidence=mergeBrowserMeasurement(evidence,collected.measurement);
  if(tls){
    assert.equal(collected.measurement.tlsValidated?.value,true);
    assert.equal(collected.measurement.hstsApplicable?.value,true);
    if(resourceMeasurement)evidence=mergeResourceFunction(evidence,resourceMeasurement);
    evidence.policy=projectTransportPolicy;
    if(plaintext)evidence=await (invalidHsts?mergeInvalidHsts:mergeHstsPlaintext)(evidence,plaintext);
    if(hostPolicy)evidence=await mergeHstsHostPolicy(evidence,hostPolicy);
    if(disablePolicy)evidence=await mergeHstsDisable(evidence,disablePolicy);
    if(activationPolicy)evidence=await mergeHstsActivation(evidence,activationPolicy);
  }else if(writeMeasurement){evidence=mergeFramedWrite(evidence,writeMeasurement);evidence.policy=broadFrameWrite?projectBroadFrameWritePolicy:projectFrameWritePolicy;}
  else if(scriptMeasurement){evidence=mergeScriptFunction(evidence,scriptMeasurement);evidence.policy=evalResponse?projectEvalScriptPolicy:hashedResponse?projectHashedScriptPolicy:profile.startsWith('script-broad-')?projectInlinePolicy:projectScriptPolicy;}
  else{assert.ok(measurement&&access);evidence=mergeCookieAccess(mergeAuthenticationRole(evidence,measurement),access);}
  if(framing){evidence=mergeFramePolicy(evidence,framing);evidence.policy=duplicateXfo?projectDuplicateXfoPolicy:projectFramePolicy;}
  if(crossSiteControl){evidence=mergeCrossSiteMutation(evidence,crossSiteControl);evidence.policy=projectTransportPolicy;}
  if(protectedControls){
    assert.equal(protectedControls.routeCoverage,overbroadSession?'partial':'complete');
    const target=evidence.targets.find(target=>target.category==='CK-003');
    assert.ok(target?.facts.cookieAuthDependency?.value===true&&target.facts.cookieAuthDependency.coverage==='complete');
    protectedWitness=await contentHash({controls:protectedControls,routeInventory:protectedInventory,adapterHash:identity,scanHash:await contentHash(collected.report)});
    const fact={source:'functional',coverage:'complete',value:true,witnessHash:protectedWitness} as const;
    if(overbroadSession){
      target.facts.csrfChecksPassed={...fact,value:false};
      evidence.policy=projectTransportPolicy;
    }else{
      Object.assign(target.facts,{cookieCrossSiteRequired:fact,csrfChecksPassed:fact,stateChangingRoutesCovered:fact});
      evidence.policy=projectProtectedCrossSitePolicy;
    }
  }
  stage='source inspection';
  evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:[path]}),signal});
  assert.equal(evidence.inspection.framework,'express');evidence.inspection.coverage='partial';
  stage='signature';
  const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);assert.ok(await verifyProjectEvidence(seal,collected.report,signer.trustedKeys));
  stage='privacy';const serialized=JSON.stringify({report:collected.report,seal});for(const privateValue of [password,secret,username,...values])assert.ok(!serialized.includes(privateValue),'No private source state retained');
  const unnecessary=!!access&&access.checks.length>0&&access.checks.every(({baseline,restricted,restored})=>[baseline,restricted,restored].every(p=>p?.complete&&p.authentication==='authenticated'&&p.functionality==='passed')&&restricted?.read===false&&baseline.read===restored?.read);
  const cookieControls=nextFamily&&!tls&&!scriptMeasurement&&!writeMeasurement?{cookies:nativeCookies.map(c=>{
    const findings=collected.report.findings.filter(f=>f.evidence.cookieName===c.name),ids=new Set(findings.map(f=>f.id));
    return {...c,authenticationRequired:findings.length>0&&findings.every(f=>measurement!.targets.some(t=>t.findingId===f.id&&t.facts.cookieAuthDependency.value===true)),javaScriptAccessUnnecessary:access!.checks.some(check=>check.findingIds.some(id=>ids.has(id)))&&unnecessary};
  })}:{cookie,javaScriptAccessUnnecessary:unnecessary};
  stage='seed creation';
  const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
  const unknown={complete:false,functionality:'unknown',inline:'unknown'} as const;
  const resourceIds=resourceMeasurement?.targets.map(target=>target.findingId)??[];
  const scriptControls:JingoScriptSeedControls|undefined=tls?{version:'vylnt-native-editor-oracle-v1',nativeWriteReadback:nativeWrite&&anonymousDenied&&signedSession,
    scanHash:await contentHash(collected.report),checkIdentity:identity,controls:{baseline:unknown,disabled:unknown,restored:unknown},
    transport:{leaf:tls.manifest.sha256,strictBrowserTls:true,wireHsts,directDependencyIds:resourceProfile&&!resourceUpgrade?resourceIds:[],
      ...(resourceUpgrade?{upgradedDependencyIds:resourceIds}:{}),
      ...(plaintext?{plaintextWitness:await contentHash(plaintext)}:{}),...(hostPolicy?{hostPolicyWitness:await contentHash(hostPolicy)}:{})}}:scriptMeasurement?{version:'vylnt-native-editor-oracle-v1',
    nativeWriteReadback:nativeWrite&&anonymousDenied&&signedSession,scanHash:scriptMeasurement.originalScanHash,
    checkIdentity:identity,controls:scriptMeasurement.controls,sourceScriptsHash:scriptMeasurement.sourceScriptsHash}:undefined;
  const scriptSeeds=fieldPointResource?createFieldPointResourceSeedBatch:
    fieldPointScript?createNativeWorkspaceScriptSeedBatch.bind(null,'fieldpoint'):family==='yoyo-collection'?createYoyoScriptSeedBatch:createBookwiseScriptSeedBatch;
  const seeds=apiHstsFamily&&apiHsts&&tls?
    await createNativeApiHstsSeedBatch(apiHstsFamily,collected.report,seal,signer.trustedKeys,{nativeWriteReadback:nativeWrite&&anonymousDenied&&signedSession,
      checkIdentity:identity,leaf:tls.manifest.sha256,wireHsts,plaintextWitness:plaintext?await contentHash(plaintext):undefined,
      hostPolicyWitness:hostPolicy?await contentHash(hostPolicy):undefined},key):
    scriptControls?await scriptSeeds(collected.report,seal,signer.trustedKeys,scriptControls,key):await createNativeSessionSeedBatch(family,collected.report,seal,signer.trustedKeys,{signedSessionMapsToSyntheticUser:signedSession,nativeBookmarkRowVerified:nativeWrite,anonymousDeniedWithoutMutation:anonymousDenied,...cookieControls,
    ...(crossSiteControl||protectedWitness?{crossSiteWitness:crossSiteControl?.witnessHash??protectedWitness}:{}),...(writeMeasurement?{framedWriteWitness:writeMeasurement.witnessHash}:{}),
    ...(framing?{framePolicy:{version:framing.version,scanHash:framing.originalScanHash,checkIdentity:framing.checkIdentity,sourceHealthy:framing.sourceHealthy,...(framing.mechanism?{mechanism:framing.mechanism}:{}),controls:{...framing.controls,permitted:framing.controls.permitted!,forbidden:framing.controls.forbidden!,repeatedForbidden:framing.controls.repeatedForbidden!,nestedForbidden:framing.controls.nestedForbidden!}}}:{})},key);
  stage='native cookie evidence';
  if(sessionProfile){
    const expected=[...(!sessionProfile.secure?['CK-001']:[]),...(!sessionProfile.httpOnly?['CK-002']:[]),...(crossSiteProfile?['CK-003']:[])];
    assert.deepEqual([...new Set(seeds.rows.filter(r=>r.category.startsWith('CK-')&&!r.uncertain).map(r=>r.category))].sort(),expected);
  }else if(tls){assert.ok(seeds.rows.some(r=>r.category===(resourceProfile?'NET-001':'HDR-001')&&!r.uncertain&&
    r.label===(resourceUpgrade||profile==='hsts-positive'||activateHsts||hostPolicy?'contextual':'change-warranted')));}
  else if(framedWrite){assert.ok(seeds.rows.some(r=>r.category==='HDR-002'&&!r.uncertain&&r.label==='change-warranted'));}
  else if(scriptProfile){
    assert.ok(seeds.rows.some(r=>r.category==='HDR-003'&&!r.uncertain&&r.label===(restrictiveMeta||hashedResponse?'contextual':'change-warranted')),'Supported category editor script outcome');
  }else if(profile==='cross-site-cookie'||fieldPointCrossSite){
    assert.ok(collected.report.observation.cookies?.some(c=>c.sameSite==='no_restriction'&&c.secure));
    assert.ok(seeds.rows.some(row=>row.category==='CK-003'&&(protectedCrossSite?row.label==='contextual'&&!row.uncertain:crossSiteControl||overbroadSession?row.label==='change-warranted'&&!row.uncertain:row.uncertain)));
  }else if(family!=='wikiflow')assert.ok(seeds.rows.some(r=>r.category==='CK-001'&&!r.uncertain&&r.label==='change-warranted'),'Complete native session example');
  if(profile==='readable'&&family!=='wikiflow')assert.ok(seeds.rows.some(r=>r.category==='CK-002'&&!r.uncertain&&r.label==='change-warranted'));
  if(frameProfile)assert.ok(seeds.rows.some(r=>r.category==='HDR-002'&&!r.uncertain&&r.label==='contextual'));
  stage='final source integrity';await pinnedFiles();
  artifacts={'report.json':collected.report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,'development-seeds.json':seeds,'source.json':meta,
    ...(protectedControls?{[overbroadSession?'overbroad-cross-site-oracle.json':'protected-cross-site-oracle.json']:protectedControls}:{}),
    ...(resourceMeasurement?{'resource-oracle.json':resourceMeasurement}:{}),
    ...(plaintext?{'hsts-oracle.json':plaintext}:{}),
    ...(hostPolicy?{'hsts-host-oracle.json':hostPolicy}:{}),
    ...(disablePolicy?{'hsts-disable-oracle.json':disablePolicy}:{}),
    ...(activationPolicy?{'hsts-activation-oracle.json':activationPolicy}:{}),
    'native-oracles.json':{version:'vylnt-native-session-expansion-v1',family,commit:meta.revision,profile,scanHash:await contentHash(collected.report),evidenceHash:await contentHash(seal),adapterHash:identity,...(crossSiteControl?{crossSiteControl}:{}),...(scriptControls?{scriptControls}:{}),...(writeMeasurement?{writeMeasurement}:{}),
      controls:{signatureVerified:signedSession,nativeWriteReadback:nativeWrite,anonymousDeniedWithoutMutation:anonymousDenied,csrfRejected},scope:{profile:path,mutation,...logoutProbe,routeCoverage:'partial',sessionOracle:nextFamily?nextFamilyDefinitions[nextFamily].sessionOracle:family==='fieldpoint'?'SQLite session-to-user':'signed owner token'},eligibleForTraining:false}};
  const contexts=prepareProjectContexts(collected.report,evidence);
  result={passed:true,completedAt:new Date().toISOString(),family,profile,channel,node:process.versions.node,applicationNode,browser:browserVersion,cpu:cpus()[0]?.model,elapsedMs:Math.round(performance.now()-started),
    findings:collected.report.findings.length,completeInputs:collected.report.findings.filter(f=>!contexts(f).requiresReview).length,seeds:seeds.rows.map(r=>({category:r.category,label:r.label,uncertain:r.uncertain})),...(protectedControls?{protectedControls}:{}),eligibleForTraining:false,qualification:false};
}catch(error){
  const sqliteCode=(error as {code?:string;errcode?:number}).code==='ERR_SQLITE_ERROR'&&(error as {errcode?:number}).errcode;
  const errorKind=error instanceof Error&&['AbortError','TimeoutError','AssertionError','TypeError'].includes(error.name)?error.name:'Error';
  const resourceControls=resourceMeasurement&&{status:resourceMeasurement.status,sourceFunctionality:resourceMeasurement.sourceFunctionality,
    phases:resourceMeasurement.checks.map(check=>check.controls)};
  await mkdir('test-results/native-projects/failures',{recursive:true});await writeFile(`test-results/native-projects/failures/${family}-${randomUUID()}.json`,JSON.stringify({family,channel,profile,passed:false,stage,errorKind,...(Number.isInteger(sqliteCode)?{sqliteCode}:{}),...(protectedControls?{protectedControls}:{}),...(resourceControls?{resourceControls}:{}),...(framing?{frameControls:framing.controls}:{}),cancelled:cancel.signal.aborted,qualification:false},null,2),{flag:'wx'});
  throw Error('Native '+family+' acquisition failed at '+stage+(cancel.signal.aborted?' (cancelled)':''));
}finally{
  await crossSiteClients?.close();
  if(proxy){proxy.closeAllConnections();await new Promise<void>(done=>proxy!.close(()=>done()));}
  if(assetProxy){assetProxy.closeAllConnections();await new Promise<void>(done=>assetProxy!.close(()=>done()));}
  if(child?.pid&&child.exitCode===null){
    if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000}).catch(()=>child!.kill('SIGKILL'));else child.kill('SIGKILL');
    if(child.exitCode===null&&child.signalCode===null)await new Promise<void>((done,reject)=>{const t=setTimeout(()=>reject(Error('Native cleanup timeout')),5000);child!.once('exit',()=>{clearTimeout(t);done();});});
  }
  const checked=await realpath(root),checkedParent=await realpath(scratchParent);
  assert.equal(checkedParent,scratchParent);
  assert.ok((scratchParent===tls?.directory||checkedParent.startsWith(await realpath(process.cwd())+sep))&&
    dirname(checked)===checkedParent&&checked===root);
  if(linked){assert.ok((await lstat(join(app,'node_modules'))).isSymbolicLink());await unlink(join(app,'node_modules'));}
  await rm(checked,{recursive:true,force:true,maxRetries:8,retryDelay:200});
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);process.removeListener('message',message);if(process.connected)process.disconnect();
}
assert.ok(artifacts&&result);const output=resolve('.local/ml-native-observations',family,randomUUID());await mkdir(output,{recursive:true});
for(const [file,value] of Object.entries(artifacts))await writeFile(join(output,file),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
const reload=async(file:string)=>JSON.parse(await readFile(join(output,file),'utf8'));
const report=await reload('report.json'),seal=await reload('evidence.json'),keys=await reload('trusted-public-keys.json');assert.ok(await verifyProjectEvidence(seal,report,keys));
const altered=structuredClone(report);altered.observation.cookies[0].secure=!altered.observation.cookies[0].secure;assert.ok(!await verifyProjectEvidence(seal,altered,keys));
const forged=structuredClone(seal);forged.evidence.configHash='0'.repeat(64);assert.ok(!await verifyProjectEvidence(forged,report,keys));
await writeFile(join(output,'acceptance.json'),JSON.stringify({completed:true,sourceRunCleanup:true,reloadVerified:true,alteredScanRejected:true,alteredEvidenceRejected:true,eligibleForTraining:false},null,2),{flag:'wx'});
await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/${family}-${channel}-${profile}.json`,JSON.stringify({...result,cleanupCompleted:true},null,2));
console.log('Native '+family+' '+profile+' passed; retained '+relative(process.cwd(),output)+'. No model fitted or category qualified.');

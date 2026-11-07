import {nativeAdapterIdentity} from '../packages/ml/native-producer-identity';
import assert from 'node:assert/strict';
import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,rm,realpath,lstat} from 'node:fs/promises';
import {join,resolve,dirname,relative,sep,isAbsolute} from 'node:path';
import {createServer,request} from 'node:http';
import {createServer as createTlsServer} from 'node:https';
import {readNamedFixtureTls,readPreparedLocalTls} from '../packages/ml/local-tls';
import {measureHstsActivation,measureHstsDisable,measureHstsHostPolicy,measureHstsPlaintext,measureInvalidHsts,mergeHstsActivation,mergeHstsDisable,mergeHstsHostPolicy,mergeHstsPlaintext,mergeInvalidHsts} from '../apps/cli/project-hsts-plaintext';
import {measureResourceFunction,mergeResourceFunction,upgradeFixtureHost,type ResourceMeasurement} from '../apps/cli/project-resource-function';
import {cpus,totalmem} from 'node:os';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {measureScriptFunction,mergeScriptFunction,type ScriptMeasurement} from '../apps/cli/project-script-function';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes';
import {inspectProject} from '../apps/server/project-inspection';
import {gateConfigSchema} from '../apps/cli/gate-config';
import {ProjectSigner} from '../apps/server/project-signing';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {applyJingoScriptProfile,pinnedJingoBytes,jingoScriptProfiles,type JingoScriptProfile} from '../packages/ml/native-jingo-profile';
import {applyJingoTransportProfile,jingoEditorStylesheet,nativeTransportProfiles,type NativeTransportProfile} from '../packages/ml/native-jingo-profile';
import {broadFrameAncestors,duplicateFrameDeny} from '../packages/core/frame-policy-scope';
import {projectBroadFrameWritePolicy,projectDuplicateXfoPolicy} from '../packages/core/project-evidence';
import {projectEvalScriptPolicy,projectHashedScriptPolicy} from '../packages/core/project-evidence';
import {nativeHashedResponse} from '../packages/ml/native-jingo-profile';
import {createJingoScriptSeedBatch,createNativeSessionSeedBatch,type JingoScriptSeedControls} from '../packages/ml/project-seed-corpus';
import {contentHash} from '../packages/core/integrity';
import {mergeAuthenticationRole} from '../apps/cli/project-functional';
import {mergeCookieAccess} from '../apps/cli/project-cookie-access';
import {measureCrossSite,mergeCrossSiteMutation} from '../apps/cli/project-cross-site';
import {measureFraming,mergeFramedWrite,type FramingMeasurement} from '../apps/cli/project-framing';
import {measureFramePolicy,mergeFramePolicy,type FramePolicyMeasurement} from '../apps/cli/project-frame-policy';
import {applySessionProfile,parseCrossSiteSessionProfile,parseSessionProfile} from '../scripts/native-session-profile.mjs';
import {checkJingoSession,jingoSessionCookies,verifyJingoPrincipal} from './native-jingo-session';
import {invalidFixtureHsts,prepareProjectContexts,guardProjectAssessment,verifyProjectEvidence,projectFramePolicy,projectFrameWritePolicy,projectScriptPolicy,projectTransportPolicy,projectInlinePolicy,permissiveInlineDirective} from '../packages/core/project-evidence';

const source=resolve('.local/ml-native-jingo'),parent=resolve('.local'),execute=promisify(execFile),cancel=new AbortController();
const profile=(process.env.VYLNT_SCRIPT_PROFILE??'missing') as JingoScriptProfile;
assert.ok(jingoScriptProfiles.includes(profile));
const restrictiveMeta=profile==='early-meta'||profile==='layered-meta';
const duplicateXfo=profile==='framing-duplicate-deny';
const hashedResponse=profile==='hashed-response';
const evalResponse=profile==='eval-response',specialResponse=hashedResponse||evalResponse;
const broadFrameWrite=profile==='framed-write-broad';
const framedWrite=profile==='framed-write'||broadFrameWrite,framingPolicy=profile==='framing-policy'||duplicateXfo,editorPath=framedWrite||framingPolicy?'/pages/Home/edit':'/pages/new';
const transport=process.env.VYLNT_JINGO_TRANSPORT as NativeTransportProfile|undefined;
if(transport)assert.ok(nativeTransportProfiles.includes(transport)&&profile==='missing');
const sessionId=process.env.VYLNT_JINGO_SESSION||undefined;
const sessionProfile=parseSessionProfile(sessionId)??parseCrossSiteSessionProfile(sessionId);
if(sessionId)assert.ok(sessionProfile&&!transport&&profile==='missing');
const styleResource=transport==='http-style'||transport==='https-upgrade-style';
const namedUpgrade=transport==='https-upgrade-editor'||transport==='https-upgrade-style',namedHsts=process.env.VYLNT_JINGO_NAMED_HSTS==='1';
assert.ok(!namedHsts||transport?.startsWith('hsts-'));
const activateHsts=transport==='hsts-activate-native',disableHsts=transport==='hsts-disable-active',retainedHsts=transport==='hsts-invalid-host';
const invalidHsts=transport==='hsts-invalid'||retainedHsts;
assert.ok(transport!=='hsts-missing'&&transport!=='hsts-host'&&!invalidHsts&&!disableHsts&&!activateHsts||namedHsts);
const namedTls=namedUpgrade||namedHsts||styleResource;
const tls=namedTls?await readNamedFixtureTls():transport?await readPreparedLocalTls():undefined;
let plaintext:Awaited<ReturnType<typeof measureHstsPlaintext>>|undefined;
let hostPolicy:Awaited<ReturnType<typeof measureHstsHostPolicy>>|undefined;
let disablePolicy:Awaited<ReturnType<typeof measureHstsDisable>>|undefined;
let activationPolicy:Awaited<ReturnType<typeof measureHstsActivation>>|undefined;
let resource:ResourceMeasurement|undefined,wireHsts:'max-age=0'|'max-age=086400'|'absent'|typeof invalidFixtureHsts|undefined;
const navStatus:{route:string;status:number}[]=[];
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium',started=performance.now();
const interrupt=()=>cancel.abort(),message=(m:unknown)=>{if(m&&typeof m==='object'&&'type' in m&&m.type==='cancel')interrupt();};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);process.on('message',message);
const env:NodeJS.ProcessEnv={};for(const key of ['PATH','Path','PATHEXT','SystemRoot','SYSTEMROOT','WINDIR','ComSpec','SystemDrive'])if(process.env[key])env[key]=process.env[key];
const git=async(args:string[],cwd=source)=>(await execute('git',args,{cwd,env,windowsHide:true,timeout:10000,maxBuffer:8*1024*1024,signal:cancel.signal})).stdout.trim();
const hash=(input:Uint8Array|string)=>createHash('sha256').update(input).digest('hex');
const meta=JSON.parse(await readFile('ml/applications/native/jingo.source.json','utf8'));
assert.equal(meta.revision,'10079c22d6cb66cfa0e7a91742c631fa0a153bd4');
async function pinnedFiles(){
  assert.equal(await git(['rev-parse','HEAD']),meta.revision);
  const files:{file:string;bytes:Buffer}[]=[];let bytes=0;
  for(const entry of (await git(['ls-tree','-rz','--full-tree','HEAD'])).split('\0').filter(Boolean)){
    const match=entry.match(/^100(?:644|755) blob ([a-f0-9]{40})\t(.+)$/s);assert.ok(match,'Pinned regular files only');
    const [,expected,file]=match,path=resolve(source,file),within=relative(source,path),info=await lstat(path);
    assert.ok(!isAbsolute(within)&&within!=='..'&&!within.startsWith('..'+sep)&&info.isFile()&&!info.isSymbolicLink());
    assert.ok((await realpath(path)).startsWith(await realpath(source)+sep)&&info.size<=4*1024*1024&&(bytes+=info.size)<=24*1024*1024);
    const data=pinnedJingoBytes(await readFile(path),expected);files.push({file,bytes:data});
  }
  assert.ok(files.length>0&&files.length<=200);return files;
}
const files=await pinnedFiles();assert.equal(await git(['rev-parse','HEAD:LICENSE']),meta.licenseGitBlob);
for(const [file,expected] of Object.entries(meta.sourceSha256))assert.equal(hash(files.find(entry=>entry.file===file)!.bytes),expected);
for(const file of [join(source,'package-lock.json'),'ml/applications/native/jingo.package-lock.json'])assert.equal(hash(await readFile(file)),meta.dependencyLockSha256);
const identity=await nativeAdapterIdentity(meta);
const root=await mkdtemp(join(parent,'native-jingo-script-run-')),app=join(root,'app'),wiki=join(root,'wiki');
let child:ChildProcess|undefined,proxy:ReturnType<typeof createServer>|ReturnType<typeof createTlsServer>|undefined,stage='setup',result:Record<string,unknown>|undefined,artifacts:Record<string,unknown>|undefined;
let measurement:ScriptMeasurement|undefined,nativeWriteReadback=false,browserVersion='unknown',port=0,startupError=false,startupDiagnostic='',profileError='',unexpectedTls=0;
let sessionCheck:Awaited<ReturnType<typeof checkJingoSession>>|undefined;
let crossSiteCheck:Awaited<ReturnType<typeof measureCrossSite>>|undefined;
let framed:FramingMeasurement|undefined;
let protectedFrame:FramePolicyMeasurement|undefined;
const password=randomBytes(24).toString('hex'),username='vylnt-'+randomBytes(6).toString('hex'),secret=randomBytes(32).toString('hex'),email='fixture@example.invalid';
const cookieValues:string[]=[];
try{
  await mkdir(wiki);await mkdir(join(root,'tmp'));await mkdir(join(root,'empty-hooks'));
  for(const {file,bytes} of files){const destination=join(app,file);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);}
  await git(['init','-q','-b','master'],wiki);
  for(const [key,value] of [['core.hooksPath',join(root,'empty-hooks')],['commit.gpgsign','false'],['user.name','VYLNT disposable fixture'],['user.email','fixture@example.invalid'],['core.autocrlf','false'],['core.safecrlf','false']])await git(['config',key,value],wiki);
  await writeFile(join(wiki,'Home.md'),'# Disposable native wiki\n');await git(['add','Home.md'],wiki);await git(['commit','-qm','disposable baseline'],wiki);
  const config={application:{repository:wiki,remote:'',pushInterval:0,secret,loggingMode:0},server:{hostname:'127.0.0.1',port:0,localOnly:false},features:{gravatar:false,codemirror:true,markitup:false},
    authentication:{google:{enabled:false},github:{enabled:false},ldap:{enabled:false},alone:{enabled:false},local:{enabled:true,accounts:[{username,passwordHash:createHash('sha1').update(password).digest('hex'),email}]}},
    authorization:{anonRead:true,validMatches:'.+',emptyEmailMatches:false},pages:{title:{fromFilename:true,fromContent:true}}};
  const configFile=join(root,'config.json');await writeFile(configFile,JSON.stringify(config),{mode:0o600});
  // Port zero plus a child-issued listening receipt excludes unrelated servers.
  // Resolve this copied app against its own locked dependencies, before any
  // unrelated parent workspace modules. Relative native modules stay intact.
  const shim="const Module=require('node:module');const paths=Module._nodeModulePaths;const app="+JSON.stringify(app)+",deps="+JSON.stringify(join(source,'node_modules'))+";Module._nodeModulePaths=function(from){const p=paths.call(this,from);return from===app||from.startsWith(app+require('node:path').sep)?[deps,...p.filter(x=>x.startsWith(app+require('node:path').sep))]:p};const net=require('node:net');const original=net.Server.prototype.listen;net.Server.prototype.listen=function(...args){this.once('listening',()=>{const a=this.address();if(a&&a.address==='127.0.0.1')process.send?.({type:'listening',port:a.port})});return original.apply(this,args)};\n";
  await writeFile(join(root,'listener.cjs'),shim);
  child=spawn(process.execPath,['--require',join(root,'listener.cjs'),'jingo','-c',configFile],{cwd:app,env:{...env,NW_ADDR:'127.0.0.1',NODE_ENV:'test',NODE_PATH:join(source,'node_modules'),TEMP:join(root,'tmp'),TMP:join(root,'tmp')},stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
  const capture=(bytes:Buffer)=>{if(stage==='native startup')startupDiagnostic+=bytes.toString().slice(0,Math.max(0,4096-startupDiagnostic.length));};child.stdout?.on('data',capture);child.stderr?.on('data',capture);
  child.on('error',()=>{startupError=true;});child.on('message',m=>{if(m&&typeof m==='object'&&'type' in m&&m.type==='listening'&&'port' in m&&Number.isSafeInteger(m.port))port=Number(m.port);});
  stage='native startup';const deadline=Date.now()+45000;
  while(!port){cancel.signal.throwIfAborted();if(startupError||child.exitCode!==null||Date.now()>deadline)throw Error('Native startup failed');await new Promise(done=>setTimeout(done,100));}
  if(tls){
    stage='native HTTP readiness';
    // First Pug render loads the pinned compiler and templates. A mounted
    // Windows checkout on Linux can take longer than a warm HTTP request.
    const ready=await fetch('http://127.0.0.1:'+port+'/login',{redirect:'manual',signal:AbortSignal.any([cancel.signal,AbortSignal.timeout(90000)])});
    assert.equal(ready.status,200,'Native login readiness');await ready.body?.cancel();
  }
  const forward:import('node:http').RequestListener=(incoming,outgoing)=>{
    const forwarded=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,headers:{...incoming.headers,host:'127.0.0.1:'+port,'accept-encoding':'identity'},agent:false},response=>{
      if(navStatus.length<12&&['/login','/pages/new','/'].includes(incoming.url??''))navStatus.push({route:incoming.url!,status:response.statusCode??0});
      const headers={...response.headers},isHtml=String(headers['content-type']).includes('text/html');
      if(sessionProfile&&headers['set-cookie']){
        for(const name of jingoSessionCookies)headers['set-cookie']=applySessionProfile(headers['set-cookie'],name,sessionProfile);
      }
      if((profile==='broad-response'||profile==='layered-meta')&&incoming.url==='/pages/new')headers['content-security-policy']=permissiveInlineDirective;
      if(framingPolicy&&incoming.url===editorPath){
        if(duplicateXfo){delete headers['content-security-policy'];headers['x-frame-options']=duplicateFrameDeny;}
        else headers['content-security-policy']='frame-ancestors '+origin;
      }
      if(broadFrameWrite&&incoming.url===editorPath){headers['content-security-policy']=broadFrameAncestors;delete headers['x-frame-options'];}
      if(transport==='hsts-disabled'||disableHsts)headers['strict-transport-security']='max-age=0';
      if(transport==='hsts-positive'||activateHsts)headers['strict-transport-security']='max-age=086400';
      if(transport==='hsts-missing'||transport==='hsts-host')delete headers['strict-transport-security'];
      if(invalidHsts)headers['strict-transport-security']=invalidFixtureHsts;
      if(namedUpgrade&&incoming.url==='/pages/new')headers['content-security-policy']='upgrade-insecure-requests';
      if(!isHtml||response.statusCode!==200||(!transport&&profile==='missing')){outgoing.writeHead(response.statusCode??502,headers);response.pipe(outgoing);response.on('error',()=>outgoing.destroy());return;}
      const chunks:Buffer[]=[];let size=0;
      response.on('data',chunk=>{if((size+=chunk.length)>512*1024){response.destroy();outgoing.destroy();}else chunks.push(chunk);});
      response.on('error',()=>outgoing.destroy());response.on('end',()=>{
        try{const html=Buffer.concat(chunks).toString('utf8'),resourcePort=namedUpgrade?(proxy!.address() as {port:number}).port:port;
          const body=transport?applyJingoTransportProfile(html,incoming.url==='/pages/new',transport,resourcePort):applyJingoScriptProfile(html,specialResponse&&incoming.url!==editorPath?'missing':profile);
          const moved=specialResponse&&incoming.url===editorPath?nativeHashedResponse(body,evalResponse?'eval':'inline'):undefined;
          if(moved)headers['content-security-policy']=moved.policy;
          delete headers['content-length'];delete headers.etag;delete headers['content-encoding'];outgoing.writeHead(response.statusCode??502,headers);outgoing.end(moved?.html??body);}catch(error){profileError=error instanceof Error?error.message:'Unknown profile failure';outgoing.writeHead(502);outgoing.end();}
      });
    });
    forwarded.setTimeout(10000,()=>forwarded.destroy());forwarded.on('error',error=>{if(transport)profileError=(error as NodeJS.ErrnoException).code??'upstream-error';if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});incoming.on('aborted',()=>forwarded.destroy());outgoing.on('close',()=>forwarded.destroy());incoming.pipe(forwarded);
  };
  proxy=tls?createTlsServer({cert:tls.cert,key:tls.key},forward):createServer(forward);
  if(namedTls)proxy.on('tlsClientError',()=>{unexpectedTls++;});
  await new Promise<void>(done=>proxy!.listen(0,'127.0.0.1',done));const origin=(namedTls?'https://'+upgradeFixtureHost+':':tls?'https://localhost:':'http://127.0.0.1:')+(proxy.address() as {port:number}).port;
  if(process.connected)process.send?.({type:'native-ready',root,pid:child.pid});
  const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(150000)]);
  const fontFallback=async(p:import('playwright').Page)=>{await p.route(url=>url.origin==='https://fonts.googleapis.com'&&url.pathname==='/css'&&url.searchParams.size===1&&url.searchParams.get('family')==='Ubuntu|Ubuntu Condensed',route=>route.fulfill({contentType:'text/css',body:'/* Controlled offline font fallback. */'}));};
  stage='native login';
  const allowedLocalOrigins=namedTls?[origin,origin.replace('https:','http:'),...(transport==='http-style'?['http://127.0.0.1:'+port]:[])]:transport==='http-editor'?[origin,'http://127.0.0.1:'+port]:[origin];
  const collected=await scanProjectPage(origin+editorPath,{allowedLocalOrigins,namedUpgradeFixture:namedTls,requireComplete:true,signal,channel,hooks:{prepare:async page=>{
    if(transport)page.on('response',async response=>{
      if(response.url()===origin+'/pages/new'&&response.status()===200&&response.request().isNavigationRequest()){
        const value=await response.headerValue('strict-transport-security').catch(()=>undefined);
        if(value===null||value==='max-age=0'||value==='max-age=086400'||value===invalidFixtureHsts)wireHsts=value??'absent';
      }
    });
    await fontFallback(page);stage='login page';const login=await page.goto(origin+'/login');assert.equal(login?.status(),200,'Native login response: '+profileError);await page.locator('input[name="username"]').fill(username);await page.locator('input[name="password"]').fill(password);stage='login submission';
    await Promise.all([page.waitForURL(url=>!url.pathname.startsWith('/login')),page.locator('form[action="/login"] button[type="submit"]').click()]);
    stage='editor navigation';
  },collected:async(page,context,report)=>{
    browserVersion=context.browser()?.version()??'unknown';cookieValues.push(...(await context.cookies()).map(cookie=>cookie.value));
    if(framedWrite||framingPolicy){
      stage='native authenticated wiki framing controls';
      await verifyJingoPrincipal(context,origin,username,email);
      const form=page.locator('form.edit'),writePath=await form.getAttribute('action');
      assert.ok(writePath&&/^\/pages\/home$/i.test(writePath));
      const landing='/wiki/'+writePath.slice('/pages/'.length);
      const initial=await git(['rev-parse','HEAD'],wiki);
      const denied=await context.browser()!.newContext({serviceWorkers:'block',acceptDownloads:false});
      try{
        const response=await denied.request.post(origin+writePath,{form:{_method:'put',pageTitle:'Home',content:'Disposable denied edit'},maxRedirects:0,timeout:5000});
        assert.equal(response.status(),302);assert.equal(response.headers().location,'/login');
        assert.equal(await git(['rev-parse','HEAD'],wiki),initial);
      }finally{await denied.close();}
      if(framingPolicy){
        protectedFrame=await measureFramePolicy(context,report,{identityHash:identity,check:async frame=>
          await frame.locator('form.edit input[name="pageTitle"]').count()===1&&await frame.locator('.CodeMirror').count()===1},signal);
        assert.equal(protectedFrame.status,'verified',JSON.stringify(protectedFrame.controls));
        const blocked=duplicateXfo?'xfo-blocked':'csp-blocked';
        assert.deepEqual(protectedFrame.controls,{permitted:'embedded',forbidden:blocked,repeatedForbidden:blocked,nestedForbidden:blocked,
          ...(duplicateXfo?{foreignWithoutHeader:'embedded',nestedWithoutHeader:'embedded'}:{})});
        const marker='Disposable framed wiki update protected';
        const response=await context.request.post(origin+writePath,{form:{_method:'put',pageTitle:'Home',content:marker},maxRedirects:0,timeout:5000});
        assert.equal(response.status(),302);assert.equal(response.headers().location,landing);
        nativeWriteReadback=await git(['rev-parse','HEAD'],wiki)!==initial&&await git(['log','-1','--format=%ae'],wiki)===email&&
          await git(['show','HEAD:Home.md'],wiki)==='# Home\n'+marker;
        assert.ok(nativeWriteReadback);return;
      }
      let step=0;
      framed=await measureFraming(context,report,{identityHash:identity,writePath,writeRedirectPaths:[landing,landing,landing],check:async frame=>{
        const marker='Disposable framed wiki update '+(++step),before=await git(['rev-parse','HEAD'],wiki);
        await frame.locator('.CodeMirror').click();
        await frame.page().keyboard.press('Control+a');
        await frame.page().keyboard.insertText(marker);
        const [response]=await Promise.all([
          frame.page().waitForResponse(r=>r.url()===origin+writePath&&r.request().method()==='POST',{timeout:5000}),
          frame.locator('form.edit input[type="submit"]').click(),
        ]);
        return response.status()===204&&await git(['rev-parse','HEAD'],wiki)!==before&&
          await git(['log','-1','--format=%ae'],wiki)===email&&await git(['show','HEAD:Home.md'],wiki)==='# Home\n'+marker;
      }},signal);
      assert.equal(framed.coverage,'complete',JSON.stringify([framed.sameOrigin,framed.crossOrigin,framed.repeatedCrossOrigin]));
      assert.equal(step,3);nativeWriteReadback=true;
      return;
    }
    if(sessionProfile){
      stage='native signed session, editor and Git update controls';
      sessionCheck=await checkJingoSession({context,report,origin,identity,profile:sessionProfile,username,email,fontFallback,signal,
        readWiki:async()=>({head:await git(['rev-parse','HEAD'],wiki),content:await git(['show','HEAD:Home.md'],wiki),email:await git(['log','-1','--format=%ae'],wiki)})});
      if(sessionProfile.sameSite==='no_restriction'){
        stage='native cross-site wiki creation and Git readback';
        const text='Disposable cross-site wiki entry.';
        let previousHead='',previousFiles:string[]=[];
        crossSiteCheck=await measureCrossSite(context,report,{identityHash:identity,path:'/pages',cookieName:jingoSessionCookies[0],
          prepare:async phase=>{
            previousHead=await git(['rev-parse','HEAD'],wiki);
            previousFiles=(await git(['ls-files'],wiki)).split('\n');
            return {pageTitle:'VYLNT-cross-site-'+phase,content:text};
          },observe:async phase=>{
            const head=await git(['rev-parse','HEAD'],wiki),files=(await git(['ls-files'],wiki)).split('\n');
            if(head===previousHead&&files.join('\n')===previousFiles.join('\n'))return 'unchanged';
            const added=files.filter(file=>!previousFiles.includes(file));
            if(added.length!==1||head===previousHead||await git(['log','-1','--format=%ae'],wiki)!==email)return 'unknown';
            return await git(['show','HEAD:'+added[0]],wiki)==='# VYLNT-cross-site-'+phase+'\n'+text?'changed':'unknown';
          }},signal);
      }
      return;
    }
    stage='native editor script controls';
    if(!namedTls)measurement=await measureScriptFunction(context,report,{identityHash:identity,prepare:fontFallback,check:async p=>{
      if(await p.locator('form[action="/pages"] input[name="pageTitle"]').count()!==1)return 'unknown';
      if(await p.locator('.CodeMirror').count()!==1)return 'failed';
      const text='Disposable script-dependent editor operation';await p.locator('.CodeMirror').click();await p.keyboard.insertText(text);
      return (await p.locator('.CodeMirror-code').innerText()).includes(text)?'passed':'failed';
    }},signal);
    if(transport==='http-editor'||namedUpgrade||styleResource){
      stage='native editor HTTP dependency controls';
      resource=await measureResourceFunction(context,report,{identityHash:identity,resourceKind:styleResource?'stylesheet':'script',check:async p=>{
        if(await p.locator('form[action="/pages"] input[name="pageTitle"]').count()!==1)return 'unknown';
        if(styleResource){
          const dialog=p.locator('#js--syntax-reference'),open=p.locator('.toolbar .info span');
          if(await dialog.count()!==1||await open.count()!==1)return 'unknown';
          if(await dialog.isVisible())return 'failed';
          await open.dispatchEvent('click');await dialog.waitFor({state:'visible',timeout:2000});
          await dialog.locator('button[data-dismiss="modal"]').dispatchEvent('click');
          await dialog.waitFor({state:'hidden',timeout:2000});return 'passed';
        }
        if(await p.locator('.CodeMirror').count()!==1)return 'failed';
        const marker='VYLNT probe';await p.locator('.CodeMirror').click();await p.keyboard.insertText(marker);
        const typed=(await p.locator('.CodeMirror-code').innerText()).includes(marker);
        await p.keyboard.press('Control+z');
        return typed?'passed':'failed';
      }},signal);
      assert.ok(report.findings.some(f=>f.ruleId==='NET-001'),'Native editor must exhibit the selected resource reference');
      if(namedUpgrade||styleResource)assert.equal(resource.status,'verified','Named native editor transfer and dependency controls: '+JSON.stringify(resource.checks.map(check=>check.controls)));
      if(styleResource)assert.ok(resource.targets.length===1&&report.findings.some(f=>f.id===resource!.targets[0].findingId&&
        f.evidence.resourceType==='link'&&new URL(f.url).pathname===jingoEditorStylesheet),'Only the pinned editor stylesheet can supply the proof');
    }else if(!transport){
      assert.ok(measurement);
      assert.equal(measurement.status,profile==='late-meta'?'needs-review':'verified',JSON.stringify(measurement.controls));
      if(profile!=='late-meta')assert.equal(measurement.controls.baseline.inline,restrictiveMeta||specialResponse?'blocked':'executed');
    }
    stage='independent native write readback';const before=(await git(['ls-files'],wiki)).split('\n'),head=await git(['rev-parse','HEAD'],wiki),body='Disposable native editor seed.';
    await page.locator('input[name="pageTitle"]').fill('VYLNT-native-write');await page.locator('.CodeMirror').click();await page.keyboard.insertText(body);
    const [saved]=await Promise.all([page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/pages'),page.locator('form[action="/pages"] input[type="submit"]').click()]);
    assert.equal(saved.status(),302);await page.waitForURL(url=>url.pathname.startsWith('/wiki/'));
    const added=(await git(['ls-files'],wiki)).split('\n').filter(file=>!before.includes(file));assert.equal(added.length,1);
    assert.equal((await readFile(join(wiki,added[0]),'utf8')).trim(),'# VYLNT-native-write\n'+body);assert.notEqual(await git(['rev-parse','HEAD'],wiki),head);nativeWriteReadback=true;
    if(transport==='hsts-missing'||transport==='hsts-host'||invalidHsts||disableHsts||activateHsts){
      stage='same-browser HSTS controls';
      assert.equal((await page.goto(origin+editorPath))?.status(),200);
      if(activateHsts)activationPolicy=await measureHstsActivation(page,report,identity,tls!,signal);
      else if(disableHsts)disablePolicy=await measureHstsDisable(page,report,identity,tls!,signal);
      else if(transport==='hsts-host'||retainedHsts)hostPolicy=await measureHstsHostPolicy(page,report,identity,tls!,signal,retainedHsts?invalidFixtureHsts:undefined);
      else plaintext=await (invalidHsts?measureInvalidHsts:measureHstsPlaintext)(context,report,identity,tls!,signal);
    }
  }}});
  stage='signed evidence and seed binding';
  if(framed||protectedFrame){
    let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:meta.revision,configHash:await contentHash({profile,editorPath,listenerHash:hash(shim)}),adapterHash:identity},false);
    if(framed){evidence=mergeFramedWrite(evidence,framed);evidence.policy=broadFrameWrite?projectBroadFrameWritePolicy:projectFrameWritePolicy;}
    else{evidence=mergeFramePolicy(evidence,protectedFrame!);evidence.policy=duplicateXfo?projectDuplicateXfoPolicy:projectFramePolicy;}
    evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:[editorPath]}),signal});
    assert.equal(evidence.inspection.framework,'express');evidence.inspection.coverage='partial';
    const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
    const cookies=(collected.report.observation.cookies??[]).map(({name,secure,httpOnly})=>{
      assert.ok(typeof secure==='boolean'&&typeof httpOnly==='boolean');
      return {name,secure,httpOnly,authenticationRequired:false,javaScriptAccessUnnecessary:false};
    });
    const controls={signedSessionMapsToSyntheticUser:true,nativeBookmarkRowVerified:nativeWriteReadback,anonymousDeniedWithoutMutation:true,cookies,
      ...(framed?{framedWriteWitness:framed.witnessHash}:{framePolicy:{version:protectedFrame!.version,scanHash:protectedFrame!.originalScanHash,
        checkIdentity:protectedFrame!.checkIdentity,sourceHealthy:protectedFrame!.sourceHealthy,...(protectedFrame!.mechanism?{mechanism:protectedFrame!.mechanism}:{}),controls:{...protectedFrame!.controls,permitted:protectedFrame!.controls.permitted!,
          forbidden:protectedFrame!.controls.forbidden!,repeatedForbidden:protectedFrame!.controls.repeatedForbidden!,nestedForbidden:protectedFrame!.controls.nestedForbidden!}}})};
    const batch=await createNativeSessionSeedBatch('jingo',collected.report,seal,signer.trustedKeys,controls,(await readFile('.local/insights-dataset-key','utf8')).trim());
    assert.ok(batch.rows.some(row=>row.category==='HDR-002'&&!row.uncertain&&row.label===(framed?'change-warranted':'contextual')));
    artifacts={'report.json':collected.report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,'native-oracles.json':controls,'source.json':meta,
      'development-seeds.json':batch,'framing-oracle.json':framed??protectedFrame};
    assert.ok(![password,secret,username,...cookieValues,'Disposable framed wiki update'].some(value=>JSON.stringify(artifacts).includes(value)));
    await pinnedFiles();result={version:1,passed:true,profile,channel,coverage:framed?.coverage??protectedFrame?.status,qualification:false,modelEvaluated:false};
  }else if(sessionProfile){
    assert.ok(sessionCheck);
    let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:meta.revision,configHash:await contentHash({version:1,sessionId,scope:'native-protected-wiki-update',listenerHash:hash(shim),offlineFont:true}),adapterHash:identity},false);
    evidence=mergeCookieAccess(mergeAuthenticationRole(evidence,sessionCheck.authentication),sessionCheck.access);
    if(crossSiteCheck){
      evidence=mergeCrossSiteMutation(evidence,crossSiteCheck);
      evidence.policy=projectTransportPolicy;
    }
    evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/pages/new']}),signal});
    assert.equal(evidence.inspection.framework,'express');
    const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
    const controls={...sessionCheck.controls,...(crossSiteCheck?{crossSiteWitness:crossSiteCheck.witnessHash}:{})};
    const batch=await createNativeSessionSeedBatch('jingo',collected.report,seal,signer.trustedKeys,controls,(await readFile('.local/insights-dataset-key','utf8')).trim());
    const categories=[...new Set(batch.rows.filter(row=>row.label==='change-warranted'&&!row.uncertain).map(row=>row.category))].sort();
    assert.deepEqual(categories,[...(!sessionProfile.secure?['CK-001']:[]),...(!sessionProfile.httpOnly?['CK-002']:[]),...(crossSiteCheck?['CK-003']:[])],'Native cookie profile must supply the expected change cases');
    artifacts={'report.json':collected.report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,'native-oracles.json':controls,'source.json':meta,'development-seeds.json':batch,
      ...(crossSiteCheck?{'cross-site-oracle.json':crossSiteCheck}:{})};
    assert.ok(![password,secret,username,...cookieValues].some(value=>JSON.stringify(artifacts).includes(value)),'Private values must not persist');
    await pinnedFiles();result={version:1,passed:true,channel,sessionId,categories,qualification:false,modelEvaluated:false};
  }else{
  assert.ok(measurement||namedTls);
  if(namedTls)assert.equal(unexpectedTls,0,'No plaintext or unexpected TLS handshake on the named listener');
  let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:meta.revision,configHash:await contentHash({version:1,profile,scope:'native-editor-create',listenerHash:hash(shim),offlineFont:true,...(tls?{transport,leaf:tls.manifest.sha256}:{})}),adapterHash:identity},false);
  evidence=mergeBrowserMeasurement(evidence,collected.measurement);
  if(measurement)evidence=mergeScriptFunction(evidence,measurement);
  evidence.policy=evalResponse?projectEvalScriptPolicy:hashedResponse?projectHashedScriptPolicy:profile.startsWith('broad-')?projectInlinePolicy:projectScriptPolicy;
  if(tls){assert.ok(wireHsts);assert.equal(collected.measurement.tlsValidated?.value,true);assert.equal(collected.measurement.hstsApplicable?.value,true);evidence.policy=projectTransportPolicy;}
  if(resource)evidence=mergeResourceFunction(evidence,resource);
  if(plaintext)evidence=await (invalidHsts?mergeInvalidHsts:mergeHstsPlaintext)(evidence,plaintext);
  if(hostPolicy)evidence=await mergeHstsHostPolicy(evidence,hostPolicy);
  if(disablePolicy)evidence=await mergeHstsDisable(evidence,disablePolicy);
  if(activationPolicy)evidence=await mergeHstsActivation(evidence,activationPolicy);
  // Inventory the verified Git mirror; the executed copy contains exactly its
  // pinned blobs (with checkout-only CRLF normalization), not a second revision.
  evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/pages/new']}),signal});
  assert.equal(evidence.inspection.framework,'express');evidence.inspection.coverage='partial';
  const finding=collected.report.findings.find(f=>f.ruleId==='HDR-003');assert.ok(finding,'Original rule finding must be retained');
  const prepared=prepareProjectContexts(collected.report,evidence)(finding);if(!transport)assert.equal(prepared.requiresReview,profile==='late-meta');
  for(const policy of ['vylnt-project-assessment-v3','vylnt-project-assessment-v4'] as const)assert.equal(prepareProjectContexts(collected.report,{...evidence,policy})(finding).requiresReview,true);
  assert.equal(guardProjectAssessment(prepared,{...finding,severity:'high'},'contextual'),'needs-review');
  const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
  const unknown={complete:false,functionality:'unknown',inline:'unknown'} as const;
  const resourceIds=resource?.targets.map(t=>t.findingId)??[];
  const controls:JingoScriptSeedControls={version:'vylnt-native-editor-oracle-v1',nativeWriteReadback,scanHash:await contentHash(collected.report),checkIdentity:identity,
    controls:measurement?.controls??{baseline:unknown,disabled:unknown,restored:unknown},
    ...(measurement?.sourceScriptsHash?{sourceScriptsHash:measurement.sourceScriptsHash}:{}),
    ...(tls&&wireHsts?{transport:{strictBrowserTls:true as const,wireHsts,leaf:tls.manifest.sha256,
      directDependencyIds:namedUpgrade?[]:resourceIds,...(namedUpgrade?{upgradedDependencyIds:resourceIds}:{}),
      ...(plaintext?{plaintextWitness:await contentHash(plaintext)}:{}),...(hostPolicy?{hostPolicyWitness:await contentHash(hostPolicy)}:{})}}:{})};
  const key=(await readFile('.local/insights-dataset-key','utf8')).trim(),batch=await createJingoScriptSeedBatch(collected.report,seal,signer.trustedKeys,controls,key);
  const row=batch.rows.find(r=>r.category==='HDR-003');assert.ok(row);if(!transport){assert.equal(row.label,restrictiveMeta||hashedResponse?'contextual':profile==='late-meta'?'needs-review':'change-warranted');assert.equal(row.uncertain,profile==='late-meta');}
  if(transport?.startsWith('hsts-'))assert.ok(batch.rows.some(r=>r.category==='HDR-001'&&!r.uncertain&&r.label===(transport==='hsts-positive'||activateHsts||hostPolicy?'contextual':'change-warranted')));
  if(namedUpgrade||styleResource)assert.ok(batch.rows.some(r=>r.category==='NET-001'&&!r.uncertain&&r.label===(namedUpgrade?'contextual':'change-warranted')));
  artifacts={'report.json':collected.report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,'native-oracles.json':controls,'source.json':meta,'development-seeds.json':batch,
    ...(resource?{'resource-oracle.json':resource}:{}),
    ...(plaintext?{'hsts-oracle.json':plaintext}:{}),
    ...(hostPolicy?{'hsts-host-oracle.json':hostPolicy}:{}),
    ...(disablePolicy?{'hsts-disable-oracle.json':disablePolicy}:{}),
    ...(activationPolicy?{'hsts-activation-oracle.json':activationPolicy}:{}),
    'run-manifest.json':{version:1,role:'development-prototype-exposure',profile,transport,adapterHash:identity,configHash:evidence.configHash,sourceRevision:meta.revision,
      scope:'Native editor interaction and one Git-backed create-page operation; route inventory remains partial.',
      intervention:styleResource?'Strict named loopback TLS and withholding of the native editor stylesheet under direct HTTP or pre-transfer upgrade.':namedUpgrade?'Strict named loopback TLS, pre-transfer upgrade and withholding of the native editor script.':namedHsts?'Strict named loopback TLS and a scoped HSTS profile.':transport?'Strict localhost TLS with a controlled response directive or a direct HTTP reference to the native editor script. Cosmetic remote font omitted.':'Loopback proxy applies the selected meta policy. Cosmetic remote font is fulfilled locally.',
      eligibleForTraining:false,modelEvaluated:false}};
  const serialized=JSON.stringify(artifacts);for(const value of [password,secret,username,...cookieValues,'Disposable native editor seed.','Disposable script-dependent editor operation','CodeMirror.fromTextArea'])assert.ok(!serialized.includes(value),'Private values or raw text must not persist');
  await pinnedFiles();result={version:1,passed:true,profile,channel,checkIdentity:identity,sourceRevision:meta.revision,controls:measurement?.controls??resource?.checks,label:row.label,uncertain:row.uncertain,
    nativeWriteReadback,inspection:evidence.inspection.coverage,eligibleForTraining:false,modelEvaluated:false,
    runtime:{node:process.versions.node,browser:browserVersion,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryBytes:totalmem(),elapsedMs:Math.round(performance.now()-started)}};
  }
}catch(error){
  const browserCode=error instanceof Error?error.message.match(/\b(?:net::)?ERR_[A-Z_]+\b/)?.[0]:undefined;
  if(browserCode)console.error('Native browser transport:',browserCode);
  if(transport)console.error('Native navigation status:',navStatus,'layout failure:',profileError);
  if(transport&&error instanceof Error)console.error('Failure class:',error.name,'timeout:',/time.?out/i.test(error.message),'child exit:',child?.exitCode);
  if(transport&&error instanceof Error&&error.cause instanceof Error)console.error('Native transport cause:',(error.cause as NodeJS.ErrnoException).code);
  if(process.connected)process.send?.({type:'failed',stage});
  // Assertions in this harness contain only bounded control results, never native logs.
  if(error instanceof assert.AssertionError)console.error('Native assertion:',error.message.slice(0,3000));
  if(stage==='native startup')console.error('Startup classification:',{missingModule:startupDiagnostic.match(/Cannot find module '([a-zA-Z0-9_./-]+)'/)?.[1],esm:/require is not defined|ERR_REQUIRE_ESM/.test(startupDiagnostic),git:/fatal:|git.*not.*found/i.test(startupDiagnostic),permission:/EACCES|EPERM/.test(startupDiagnostic),config:/config|authentication method/i.test(startupDiagnostic),exit:child?.exitCode});
  throw Error('Native Jingo script collection failed during '+stage+(cancel.signal.aborted?' (cancelled)':''));
}finally{
  if(proxy){proxy.closeAllConnections();await new Promise<void>(done=>proxy!.close(()=>done()));}
  if(child?.pid&&child.exitCode===null){
    if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000}).catch(()=>{child!.kill('SIGKILL');});else child.kill('SIGKILL');
    if(child.exitCode===null&&child.signalCode===null)await new Promise<void>((done,reject)=>{const timer=setTimeout(()=>reject(Error('Native cleanup timeout')),5000);child!.once('exit',()=>{clearTimeout(timer);done();});});
  }
  const actual=await realpath(root),base=await realpath(parent);if(!base.startsWith(await realpath(process.cwd())+sep)||!actual.startsWith(base+sep))throw Error('Unexpected cleanup path');
  await rm(actual,{recursive:true,force:true,maxRetries:8,retryDelay:200});
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);process.removeListener('message',message);
}
assert.ok(artifacts);const observations=resolve('.local/ml-native-observations/jingo');await mkdir(observations,{recursive:true});
const destination=join(observations,randomUUID());await mkdir(destination);
for(const [file,data] of Object.entries(artifacts))await writeFile(join(destination,file),JSON.stringify(data,null,2),{flag:'wx',mode:0o600});
const read=async(file:string)=>JSON.parse(await readFile(join(destination,file),'utf8')),report=await read('report.json'),seal=await read('evidence.json'),keys=await read('trusted-public-keys.json');
assert.ok(await verifyProjectEvidence(seal,report,keys));const changed=structuredClone(report);changed.observation.headers['content-security-policy']="script-src 'none'";assert.ok(!await verifyProjectEvidence(seal,changed,keys));
const changedSeal=structuredClone(seal);changedSeal.evidence.configHash='0'.repeat(64);assert.ok(!await verifyProjectEvidence(changedSeal,report,keys));
await writeFile(join(destination,'acceptance.json'),JSON.stringify({version:1,completed:true,sourceRunCleanup:true,reloadVerified:true,alteredScanRejected:true,alteredEvidenceRejected:true,eligibleForTraining:false},null,2),{flag:'wx',mode:0o600});
await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/jingo-${sessionProfile?'cookie':'script'}-${channel}-${sessionId||transport||profile}.json`,JSON.stringify({...result,transport,cleanupCompleted:true},null,2));
console.log('Native Jingo profile '+(sessionId??transport??profile)+' passed; private observations: '+relative(process.cwd(),destination)+'. No category qualified.');
if(process.connected)process.disconnect();

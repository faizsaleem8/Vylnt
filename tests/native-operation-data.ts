import {nativeAdapterIdentity} from '../packages/ml/native-producer-identity';
import assert from 'node:assert/strict';
import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,rm,realpath,lstat,symlink,unlink} from 'node:fs/promises';
import {resolve,join,dirname,relative,sep,isAbsolute} from 'node:path';
import {createServer,request} from 'node:http';
import {createServer as createTlsServer} from 'node:https';
import {cpus} from 'node:os';
import {transform} from 'esbuild';
import ts from 'typescript';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {measureFramePolicy,mergeFramePolicy,type FramePolicyMeasurement} from '../apps/cli/project-frame-policy';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes';
import {measureResourceFunction,mergeResourceFunction,upgradeFixtureHost,type ResourceMeasurement} from '../apps/cli/project-resource-function';
import {measureScriptFunction,mergeScriptFunction,type ScriptMeasurement} from '../apps/cli/project-script-function';
import {inspectProject} from '../apps/server/project-inspection';
import {gateConfigSchema} from '../apps/cli/gate-config';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {invalidFixtureHsts,verifyProjectEvidence,projectFramePolicy,projectTransportPolicy,projectInlinePolicy,projectScriptPolicy,permissiveInlineDirective} from '../packages/core/project-evidence';
import {contentHash} from '../packages/core/integrity';
import {duplicateFrameDeny} from '../packages/core/frame-policy-scope';
import {projectDuplicateXfoPolicy} from '../packages/core/project-evidence';
import {evalScriptDirective,projectEvalScriptPolicy,projectHashedScriptPolicy} from '../packages/core/project-evidence';
import {hashedFallbackForExternalScripts} from '../packages/ml/native-jingo-profile';
import {ProjectSigner} from '../apps/server/project-signing';
import {createNativeApiHstsSeedBatch,createNativeOperationSeedBatch,createNativeWorkspaceScriptSeedBatch,nativeOperationSources,type NativeOperationControls} from '../packages/ml/project-seed-corpus';
import {pinnedJingoBytes} from '../packages/ml/native-jingo-profile';
import {operationDefinitions,prepareOperation,operationHealthy,exerciseOperation,type OperationFamily} from './native-operation-adapters';
import {readNamedFixtureTls} from '../packages/ml/local-tls';
import {measureHstsActivation,measureHstsDisable,measureHstsHostPolicy,measureHstsPlaintext,measureInvalidHsts,mergeHstsActivation,mergeHstsDisable,mergeHstsHostPolicy,mergeHstsPlaintext,mergeInvalidHsts} from '../apps/cli/project-hsts-plaintext';

const family=process.env.VYLNT_NATIVE_FAMILY as OperationFamily;assert.ok(Object.hasOwn(operationDefinitions,family));
const profile=process.env.VYLNT_NATIVE_PROFILE??'native',style=family==='8star-links'&&['style-http','style-upgrade'].includes(profile);
const moduleResource=family==='8star-links'&&['module-http','module-upgrade'].includes(profile),resourceProfile=style||moduleResource;
const duplicateXfo=profile==='framing-duplicate-deny',frameProfile=profile==='framing'||duplicateXfo;
const activateHsts=profile==='hsts-activate-native',disableHsts=profile==='hsts-disable-active',retainedHsts=profile==='hsts-invalid-host';
const hostHsts=profile==='hsts-host'||retainedHsts,invalidHsts=profile==='hsts-invalid'||retainedHsts;
const hstsFamily=family==='8star-links'||family==='portal'||family==='personal-knowledge-manager'||family==='anonymous-notepad'?family:undefined;
const hsts=hstsFamily!==undefined&&(['hsts-disabled','hsts-positive','hsts-missing'].includes(profile)||hostHsts||invalidHsts||disableHsts||activateHsts);
const wireHsts=profile==='hsts-disabled'||disableHsts?'max-age=0':profile==='hsts-positive'||activateHsts?'max-age=086400':invalidHsts?invalidFixtureHsts:'absent';
const layeredScript=profile==='script-layered-meta',restrictiveMeta=layeredScript||profile==='script-early-meta';
const hashedResponse=profile==='script-hashed-response';
const evalResponse=profile==='script-eval-response';
const scriptProfile=family==='8star-links'&&['script-missing','script-early-meta','script-broad-response','script-broad-meta','script-layered-meta','script-hashed-response','script-eval-response'].includes(profile);
const upgraded=profile==='style-upgrade'||profile==='module-upgrade',asset=moduleResource?'/app.js':'/styles.css',scanPath=resourceProfile||scriptProfile?'/':operationDefinitions[family].path;
assert.ok(resourceProfile||hsts||scriptProfile||profile==='native'||frameProfile);
const tls=resourceProfile||hsts?await readNamedFixtureTls():undefined;
const definition=operationDefinitions[family],source=resolve('.local/ml-native-expansion',family),parent=resolve('.local'),execute=promisify(execFile),cancel=new AbortController();
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium',started=performance.now();
const interrupt=()=>cancel.abort(),message=(m:unknown)=>{if(m&&typeof m==='object'&&'type' in m&&m.type==='cancel')interrupt();};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);process.on('message',message);
const env:NodeJS.ProcessEnv={};for(const key of ['PATH','Path','PATHEXT','SystemRoot','SYSTEMROOT','WINDIR','ComSpec','SystemDrive'])if(process.env[key])env[key]=process.env[key];
const git=async(args:string[])=>(await execute('git',args,{cwd:source,env,windowsHide:true,timeout:10000,maxBuffer:8*1024*1024,signal:cancel.signal})).stdout.trim();
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const meta=JSON.parse(await readFile(`ml/applications/native/${family}.source.json`,'utf8'));
assert.equal(meta.revision,nativeOperationSources[family].commit);assert.equal(meta.familyId,nativeOperationSources[family].family);
async function pinnedFiles(){
  assert.equal(await git(['rev-parse','HEAD']),meta.revision);const files:{file:string;bytes:Buffer}[]=[];let total=0;
  for(const entry of (await git(['ls-tree','-rz','--full-tree','HEAD'])).split('\0').filter(Boolean)){
    const trackedPath=entry.slice(entry.indexOf('\t')+1);if(trackedPath.split('/').some(p=>p==='node_modules'||p==='.npm'))continue;
    const match=entry.match(/^100(?:644|755) blob ([a-f0-9]{40})\t(.+)$/s);assert.ok(match,'Only pinned regular source files');
    const [,expected,file]=match,path=resolve(source,file),within=relative(source,path),info=await lstat(path);
    assert.ok(!isAbsolute(within)&&within!=='..'&&!within.startsWith('..'+sep)&&info.isFile()&&!info.isSymbolicLink());
    assert.ok((await realpath(path)).startsWith(await realpath(source)+sep)&&info.size<=8*1024*1024&&(total+=info.size)<=32*1024*1024);
    files.push({file,bytes:pinnedJingoBytes(await readFile(path),expected)});
  }
  assert.ok(files.length>0&&files.length<=600);return files;
}
const files=await pinnedFiles();
for(const [file,expected] of Object.entries(meta.sourceSha256))assert.equal(hash(files.find(f=>f.file===file)!.bytes),expected,'Source identity');
assert.equal(hash(files.find(f=>f.file==='package-lock.json')!.bytes),meta.dependencyLockSha256);
const identity=await nativeAdapterIdentity(meta);
const scratchParent=tls?.directory??parent;
const root=await mkdtemp(join(scratchParent,'native-operation-run-')),app=join(root,'app'),dbPath=join(app,definition.database),password='Vylnt'+randomBytes(24).toString('hex');
let child:ChildProcess|undefined,proxy:ReturnType<typeof createServer>|ReturnType<typeof createTlsServer>|undefined,linked=false,port=0,applicationNode='',stage='source copy',framing:FramePolicyMeasurement|undefined;
let moduleServer:ReturnType<typeof createServer>|undefined;
let resource:ResourceMeasurement|undefined,script:ScriptMeasurement|undefined,overlayHash:string|undefined;
let plaintext:Awaited<ReturnType<typeof measureHstsPlaintext>>|undefined;
let hostPolicy:Awaited<ReturnType<typeof measureHstsHostPolicy>>|undefined;
let disablePolicy:Awaited<ReturnType<typeof measureHstsDisable>>|undefined;
let activationPolicy:Awaited<ReturnType<typeof measureHstsActivation>>|undefined;
let controls:NativeOperationControls|undefined,artifacts:Record<string,unknown>|undefined,result:Record<string,unknown>|undefined,browserVersion='';
try{
  await mkdir(join(root,'tmp'));await mkdir(join(app,'data'),{recursive:true});
  for(const {file,bytes} of files){
    if(file.split('/').some(p=>p==='data'||p==='node_modules')||/\.(?:sqlite|sqlite3|db)(?:-wal|-shm)?$/i.test(file)||/(?:^|\/)\.env(?:\.|$)/.test(file))continue;
    const dest=join(app,file);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,bytes);
    // Transpile only the inspected TypeScript backend, keeping its native
    // module layout, imports and SQL files. No bundling or source replacement.
    const backend=family==='portal'?file.startsWith('server/src/'):family==='personal-knowledge-manager'?file.startsWith('src/backend/'):false;
    if(definition.typescript&&backend&&file.endsWith('.ts')&&!file.endsWith('.d.ts')){
      const js=dest.slice(0,-3)+'.js';assert.ok(!files.some(f=>join(app,f.file)===js),'Generated path must not overwrite pinned JS');
      const transformed=await transform(bytes.toString('utf8'),{loader:'ts',format:'esm',target:family==='personal-knowledge-manager'?'node20':'node24',sourcemap:false});await writeFile(js,transformed.code);
    }
  }
  if(scriptProfile&&profile.endsWith('-meta')){
    const file=join(app,'public/index.html'),html=await readFile(file,'utf8');
    assert.equal(html.split('<head>').length,2);
    assert.ok(!/http-equiv\s*=\s*["']?content-security-policy/i.test(html));
    const directive=restrictiveMeta?"script-src 'self'":permissiveInlineDirective;
    const overlay=html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${directive}">`);
    await writeFile(file,overlay);overlayHash=hash(overlay);
  }
  const dependencies=tls?join(parent,'native-linux-deps-'+family):join(source,definition.dependencyDirectory);
  if(tls){
    assert.equal(await realpath(dependencies),dependencies);
    const backend=definition.dependencyDirectory==='.'?'':definition.dependencyDirectory+'/';
    const lockHash=backend?meta.sourceSha256[backend+'package-lock.json']:meta.dependencyLockSha256;
    assert.equal(hash(await readFile(join(dependencies,'package-lock.json'))),lockHash);
    const manifests=family==='portal'?['package.json','server/package.json','client/package.json']:['package.json'];
    for(const manifest of manifests)assert.deepEqual(await readFile(join(dependencies,manifest)),files.find(f=>f.file===backend+manifest)?.bytes);
  }
  await symlink(join(dependencies,'node_modules'),join(app,'node_modules'),process.platform==='win32'?'junction':'dir');linked=true;
  const listener="const net=require('node:net');const original=net.Server.prototype.listen;net.Server.prototype.listen=function(...args){if(typeof args[0]!=='number'&&typeof args[0]!=='string')throw Error('Unsupported native listener');const callback=args.find(x=>typeof x==='function');this.once('listening',()=>{const a=this.address();process.send?.({type:'listening',host:a.address,port:a.port,node:process.versions.node})});return original.call(this,0,'127.0.0.1',callback)};";
  await writeFile(join(root,'start.cjs'),listener+`import('./app/${definition.entry}').catch(e=>{process.send?.({type:'startup-error',code:typeof e.code==='string'?e.code:'error',kind:e.name});process.exit(2)});`);
  const childEnv={...env,NODE_ENV:family==='personal-knowledge-manager'?'production':'test',PORT:'0',HOST:'127.0.0.1',DATA_DIR:join(app,'data'),SQLITE_PATH:dbPath,
    API_KEY:password,ADMIN_PASS:password,BACKUP_RED:'',UPLOAD_DIR:join(root,'tmp'),TEMP:join(root,'tmp'),TMP:join(root,'tmp')};
  const runtime=family==='personal-knowledge-manager'&&process.platform==='win32'?process.env.VYLNT_NATIVE_NODE20!:process.execPath;
  child=spawn(runtime,[join(root,'start.cjs')],{cwd:app,env:childEnv,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  child.on('error',()=>cancel.abort());child.once('exit',()=>cancel.abort());
  child.on('message',m=>{if(m&&typeof m==='object'&&'type' in m){
    if(m.type==='listening'&&'host' in m&&m.host==='127.0.0.1'&&'port' in m&&typeof m.port==='number'&&'node' in m&&typeof m.node==='string'){port=m.port;applicationNode=m.node;}
    if(m.type==='startup-error'&&'code' in m&&typeof m.code==='string'&&/^[A-Z_]{1,48}$/.test(m.code))stage='native startup '+m.code;
  }});
  stage='native startup';const deadline=Date.now()+(tls?120000:30000);
  while(!port){cancel.signal.throwIfAborted();assert.ok(child.exitCode===null,'Native startup');if(Date.now()>deadline)throw Error('Native startup timeout');await new Promise(r=>setTimeout(r,100));}
  const upstreamOrigin='http://127.0.0.1:'+port;
  let origin=upstreamOrigin,directAssetOrigin=upstreamOrigin;
  if(moduleResource){
    const moduleBytes=files.find(file=>file.file==='public/app.js')?.bytes;
    assert.ok(moduleBytes&&moduleBytes.length<=128*1024);
    const moduleSource=ts.createSourceFile('app.js',moduleBytes.toString('utf8'),ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
    const rejectImports=(node:ts.Node)=>{
      assert.ok(!ts.isImportDeclaration(node)&&!ts.isImportEqualsDeclaration(node)&&
        !(ts.isExportDeclaration(node)&&node.moduleSpecifier)&&node.kind!==ts.SyntaxKind.ImportKeyword,'Expected a standalone module');
      ts.forEachChild(node,rejectImports);
    };
    rejectImports(moduleSource);
    if(!upgraded){
      moduleServer=createServer((incoming,outgoing)=>{
        if(incoming.method!=='GET'||incoming.url!==asset||incoming.headers.origin!==origin||incoming.headers.cookie||incoming.headers.authorization){outgoing.writeHead(404).end();return;}
        outgoing.writeHead(200,{'content-type':'text/javascript; charset=utf-8','access-control-allow-origin':origin,'cache-control':'no-store',vary:'Origin'}).end(moduleBytes);
      });
      await new Promise<void>(done=>moduleServer!.listen(0,'127.0.0.1',done));
      directAssetOrigin='http://127.0.0.1:'+(moduleServer.address() as {port:number}).port;
    }
  }
  if(frameProfile||tls||layeredScript||hashedResponse||evalResponse||profile==='script-broad-response'){
    const forward:import('node:http').RequestListener=(incoming,outgoing)=>{
      const upstream=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,headers:{...incoming.headers,host:`127.0.0.1:${port}`},agent:false},response=>{
        const headers={...response.headers};
        if(profile==='framing'){headers['content-security-policy']='frame-ancestors '+origin;delete headers['x-frame-options'];}
        if(duplicateXfo){delete headers['content-security-policy'];headers['x-frame-options']=duplicateFrameDeny;}
        if((layeredScript||profile==='script-broad-response')&&incoming.url===scanPath)headers['content-security-policy']=permissiveInlineDirective;
        if(hashedResponse&&incoming.url===scanPath)headers['content-security-policy']=hashedFallbackForExternalScripts;
        if(evalResponse&&incoming.url===scanPath)headers['content-security-policy']=evalScriptDirective;
        if(hsts&&incoming.url===scanPath&&response.statusCode===200){
          if(wireHsts==='absent')delete headers['strict-transport-security'];
          else headers['strict-transport-security']=wireHsts;
        }
        if(resourceProfile&&incoming.url===scanPath&&response.statusCode===200){
          if(upgraded)headers['content-security-policy']='upgrade-insecure-requests';
          const chunks:Buffer[]=[];let bytes=0;
          response.on('data',chunk=>{if((bytes+=chunk.length)>128*1024){response.destroy();outgoing.destroy();}else chunks.push(chunk);});
          response.on('error',()=>outgoing.destroy());
          response.on('end',()=>{
            const html=Buffer.concat(chunks).toString('utf8'),attribute=moduleResource?'src':'href',link=attribute+'="'+asset+'"';
            if(html.split(link).length!==2){outgoing.writeHead(502).end();return;}
            const assetOrigin=upgraded?origin.replace('https:','http:'):directAssetOrigin;
            delete headers['content-length'];delete headers['content-encoding'];delete headers.etag;
            outgoing.writeHead(200,headers).end(html.replace(link,attribute+'="'+assetOrigin+asset+'"'));
          });
          return;
        }
        outgoing.writeHead(response.statusCode??502,headers);response.pipe(outgoing);response.on('error',()=>outgoing.destroy());
      });
      upstream.setTimeout(10000,()=>upstream.destroy());upstream.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});incoming.on('aborted',()=>upstream.destroy());outgoing.on('close',()=>upstream.destroy());incoming.pipe(upstream);
    };
    proxy=tls?createTlsServer({key:tls.key,cert:tls.cert},forward):createServer(forward);
    await new Promise<void>(done=>proxy!.listen(0,'127.0.0.1',done));
    origin=(tls?'https://'+upgradeFixtureHost+':':'http://127.0.0.1:')+(proxy.address() as {port:number}).port;
  }
  if(process.connected)process.send?.({type:'native-ready',pid:child.pid,root});
  const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(120000)]),run={family,origin,apiOrigin:tls?upstreamOrigin:undefined,password,dbPath,headers:{},privateValues:[password]};
  stage='native operation and browser collection';
  const allowedLocalOrigins=tls?[origin,origin.replace('https:','http:'),...(!upgraded?[directAssetOrigin]:[])]:[origin];
  const collected=await scanProjectPage(origin+scanPath,{allowedLocalOrigins,namedUpgradeFixture:!!tls,requireComplete:true,channel,signal,hooks:{
    prepare:async(_page,context)=>prepareOperation(context,run),
    collected:async(page,context,report)=>{
      browserVersion=context.browser()?.version()??'unknown';
      if(resourceProfile){
        stage=moduleResource?'native settings module controls':'native settings stylesheet controls';
        resource=await measureResourceFunction(context,report,{identityHash:identity,...(moduleResource?{nativeModulePath:'/app.js' as const}:{resourceKind:'stylesheet' as const}),check:async view=>{
          const menu=view.locator('#settingsMenu'),button=view.locator('#settingsBtn');
          if(await menu.count()!==1||await button.count()!==1||!await menu.evaluate(element=>element.classList.contains('hidden')))return 'unknown';
          if(await menu.isVisible())return moduleResource?'unknown':'failed';
          await button.click({timeout:2000});
          if(!await menu.isVisible())return moduleResource?'failed':'unknown';
          await button.click({timeout:2000});
          return await menu.isHidden()?'passed':'unknown';
        }},signal);
        assert.equal(resource.status,'verified');
      }
      if(scriptProfile){
        stage='native settings script policy controls';
        script=await measureScriptFunction(context,report,{identityHash:identity,check:async view=>{
          const menu=view.locator('#settingsMenu'),button=view.locator('#settingsBtn');
          if(await menu.count()!==1||await button.count()!==1||!await menu.isHidden())return 'unknown';
          await button.click({timeout:2000});
          if(await menu.isHidden())return 'failed';
          await button.click({timeout:2000});
          return await menu.isHidden()?'passed':'unknown';
        }},signal);
        assert.equal(script.status,'verified');
      }
      stage='native write and independent SQLite readback';
      // The strict browser proof uses the fixture certificate. The independent
      // API client uses the original loopback listener, which owns the database.
      controls=await ((tls||scriptProfile)&&family!=='anonymous-notepad'?exerciseOperation(undefined,context,{...run,origin:upstreamOrigin}):exerciseOperation(page,context,run));
      if(activateHsts){
        stage='native HSTS activation from verified plaintext baseline';
        activationPolicy=await measureHstsActivation(page,report,identity,tls!,signal);
      }else if(disableHsts){
        stage='native HSTS removal after verified upgrade';
        disablePolicy=await measureHstsDisable(page,report,identity,tls!,signal);
      }else if(hostHsts){
        stage='same-host HSTS installation and reset';
        hostPolicy=await measureHstsHostPolicy(page,report,identity,tls!,signal,retainedHsts?invalidFixtureHsts:undefined);
      }else if(hsts&&(wireHsts==='absent'||invalidHsts)){
        stage='same-browser HSTS plaintext and positive control';
        plaintext=await (invalidHsts?measureInvalidHsts:measureHstsPlaintext)(context,report,identity,tls!,signal);
      }
      if(frameProfile){stage='ancestor controls';framing=await measureFramePolicy(context,report,{identityHash:identity,requestHeaders:run.headers,check:frame=>operationHealthy(frame,family)},signal);
        // The native notepad loads third-party assets and makes POSTs inside
        // frames. Keep those unsupported controls unknown; never rewrite the
        // application or expand the bounded GET-only frame transport.
        if(family!=='anonymous-notepad')assert.equal(framing.status,'verified',JSON.stringify(framing.controls));}
    }
  }});
  assert.ok(controls);stage='same-run evidence';
  let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:meta.revision,configHash:await contentHash({profile,path:scanPath,mutation:definition.mutation,shim:listener,transpile:definition.typescript,...(tls?{leaf:tls.manifest.sha256}:{}),...(overlayHash?{overlayHash}:{})}),adapterHash:identity},false);
  evidence=mergeBrowserMeasurement(evidence,collected.measurement);
  if(hsts){
    assert.equal(collected.measurement.tlsValidated?.value,true);
    evidence.policy=projectTransportPolicy;
    if(plaintext)evidence=await (invalidHsts?mergeInvalidHsts:mergeHstsPlaintext)(evidence,plaintext);
    if(hostPolicy)evidence=await mergeHstsHostPolicy(evidence,hostPolicy);
    if(disablePolicy)evidence=await mergeHstsDisable(evidence,disablePolicy);
    if(activationPolicy)evidence=await mergeHstsActivation(evidence,activationPolicy);
  }
  if(resource){
    assert.equal(collected.measurement.tlsValidated?.value,true);
    evidence=mergeResourceFunction(evidence,resource);evidence.policy=projectTransportPolicy;
    assert.equal(resource.targets.length,1);
    controls[moduleResource?'module':'stylesheet']={findingId:resource.targets[0].findingId,witnessHash:resource.targets[0].facts.resourceFunctionVerified.witnessHash};
  }
  if(script){
    evidence=mergeScriptFunction(evidence,script);
    evidence.policy=evalResponse?projectEvalScriptPolicy:hashedResponse?projectHashedScriptPolicy:profile.startsWith('script-broad-')?projectInlinePolicy:projectScriptPolicy;
  }
  if(framing){evidence=mergeFramePolicy(evidence,framing);evidence.policy=duplicateXfo?projectDuplicateXfoPolicy:projectFramePolicy;controls.framePolicy={version:framing.version,scanHash:framing.originalScanHash,checkIdentity:framing.checkIdentity,sourceHealthy:framing.sourceHealthy,...(framing.mechanism?{mechanism:framing.mechanism}:{}),controls:{...framing.controls,permitted:framing.controls.permitted!,forbidden:framing.controls.forbidden!,repeatedForbidden:framing.controls.repeatedForbidden!,nestedForbidden:framing.controls.nestedForbidden!}};}
  stage='source inspection';evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:[definition.path]}),signal});
  assert.equal(evidence.inspection.framework,'express');evidence.inspection.coverage='partial';
  stage='signing and privacy';const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);assert.ok(await verifyProjectEvidence(seal,collected.report,signer.trustedKeys));
  const serialized=JSON.stringify({report:collected.report,seal});for(const privateValue of [...run.privateValues,'VYLNT ephemeral native operation','Disposable local text','fixture-owner'])assert.ok(!serialized.includes(privateValue),'No private state retained');
  const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
  stage='registered seed labels';
  const hstsAccessVerified=hstsFamily==='personal-knowledge-manager'?
    controls.access==='header-authentication'&&controls.accessControl==='denied':
    hstsFamily==='anonymous-notepad'?controls.access==='document-password'&&controls.accessControl==='denied':
    controls.access==='public'&&controls.accessControl==='allowed';
  const seeds=hsts&&hstsFamily&&tls?await createNativeApiHstsSeedBatch(hstsFamily,collected.report,seal,signer.trustedKeys,{
    nativeWriteReadback:controls.nativeWriteReadback&&controls.sourceHealthy&&hstsAccessVerified,
    checkIdentity:identity,leaf:tls.manifest.sha256,wireHsts,plaintextWitness:plaintext?await contentHash(plaintext):undefined,
    hostPolicyWitness:hostPolicy?await contentHash(hostPolicy):undefined},key):
    script?await createNativeWorkspaceScriptSeedBatch('8star-links',collected.report,seal,signer.trustedKeys,{
    version:'vylnt-native-editor-oracle-v1',nativeWriteReadback:controls.nativeWriteReadback&&controls.sourceHealthy&&controls.access==='public'&&controls.accessControl==='allowed',
    scanHash:script.originalScanHash,checkIdentity:identity,controls:script.controls,sourceScriptsHash:script.sourceScriptsHash},key):
    await createNativeOperationSeedBatch(family,collected.report,seal,signer.trustedKeys,controls,key);
  if(frameProfile&&framing?.status==='verified')assert.ok(seeds.rows.some(r=>r.category==='HDR-002'&&r.label==='contextual'&&!r.uncertain),'Scoped framing example');
  if(framing?.status==='needs-review')assert.ok(seeds.rows.filter(r=>r.category==='HDR-002').every(r=>r.uncertain),'Unsupported framing retains review');
  if(resource)assert.ok(seeds.rows.some(r=>r.category==='NET-001'&&!r.uncertain&&r.label===(upgraded?'contextual':'change-warranted')));
  if(script)assert.ok(seeds.rows.some(r=>r.category==='HDR-003'&&!r.uncertain&&r.label===(restrictiveMeta||hashedResponse?'contextual':'change-warranted')));
  if(hsts)assert.ok(seeds.rows.some(r=>r.category==='HDR-001'&&!r.uncertain&&r.label===(wireHsts==='max-age=086400'||hostPolicy?'contextual':'change-warranted')));
  assert.ok(seeds.rows.every(r=>r.category==='HDR-002'||resource&&r.category==='NET-001'||script&&r.category==='HDR-003'||hsts&&r.category==='HDR-001'||r.uncertain),'No unsupported category labels');
  stage='final source integrity';await pinnedFiles();
  artifacts={'report.json':collected.report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,'development-seeds.json':seeds,'source.json':meta,
    ...(resource?{'resource-oracle.json':resource}:{}),
    ...(plaintext?{'hsts-oracle.json':plaintext}:{}),
    ...(hostPolicy?{'hsts-host-oracle.json':hostPolicy}:{}),
    ...(disablePolicy?{'hsts-disable-oracle.json':disablePolicy}:{}),
    ...(activationPolicy?{'hsts-activation-oracle.json':activationPolicy}:{}),
    ...(script?{'script-oracle.json':script}:{}),
    'native-oracles.json':{version:'vylnt-native-operation-v1',family,commit:meta.revision,profile,scanHash:await contentHash(collected.report),evidenceHash:await contentHash(seal),adapterHash:identity,controls,scope:{response:scanPath,mutation:definition.mutation,routeCoverage:'partial'},eligibleForTraining:false}};
  result={passed:true,completedAt:new Date().toISOString(),family,profile,channel,node:process.versions.node,applicationNode,browser:browserVersion,cpu:cpus()[0]?.model,elapsedMs:Math.round(performance.now()-started),
    findings:collected.report.findings.length,framePolicyStatus:framing?.status,seeds:seeds.rows.map(r=>({category:r.category,label:r.label,uncertain:r.uncertain})),eligibleForTraining:false,qualification:false};
}catch(error){
  const code=(error as {code?:string}).code;
  const sqlite=typeof code==='string'&&/^SQLITE_[A-Z_]{1,40}$/.test(code)?code:undefined;
  const operationCheck=error instanceof Error?['Native response healthy','Native create','Independent SQLite row count','Independent SQLite content','Public native operation allowed']
    .find(check=>error.message.startsWith(check)):undefined;
  await mkdir('test-results/native-projects/failures',{recursive:true});await writeFile(`test-results/native-projects/failures/${family}-${randomUUID()}.json`,JSON.stringify({family,channel,profile,passed:false,stage,sqlite,operationCheck,cancelled:cancel.signal.aborted,qualification:false},null,2),{flag:'wx'});
  throw Error('Native '+family+' acquisition failed at '+stage+(cancel.signal.aborted?' (cancelled)':''));
}finally{
  if(proxy){proxy.closeAllConnections();await new Promise<void>(done=>proxy!.close(()=>done()));}
  if(moduleServer){moduleServer.closeAllConnections();await new Promise<void>(done=>moduleServer!.close(()=>done()));}
  if(child?.pid&&child.exitCode===null){
    if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000}).catch(()=>child!.kill('SIGKILL'));else child.kill('SIGKILL');
    if(child.exitCode===null&&child.signalCode===null)await new Promise<void>((done,reject)=>{const t=setTimeout(()=>reject(Error('Native cleanup timeout')),5000);child!.once('exit',()=>{clearTimeout(t);done();});});
  }
  const checked=await realpath(root),checkedParent=await realpath(scratchParent);
  assert.ok(checkedParent===scratchParent&&checked===root&&dirname(checked)===checkedParent&&
    (checkedParent===tls?.directory||checkedParent.startsWith(await realpath(process.cwd())+sep)));
  if(linked){assert.ok((await lstat(join(app,'node_modules'))).isSymbolicLink());await unlink(join(app,'node_modules'));}
  await rm(checked,{recursive:true,force:true,maxRetries:8,retryDelay:200});
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);process.removeListener('message',message);if(process.connected)process.disconnect();
}
assert.ok(artifacts&&result);const output=resolve('.local/ml-native-observations',family,randomUUID());await mkdir(output,{recursive:true});
for(const [file,value] of Object.entries(artifacts))await writeFile(join(output,file),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
const reload=async(file:string)=>JSON.parse(await readFile(join(output,file),'utf8'));
const report=await reload('report.json'),seal=await reload('evidence.json'),keys=await reload('trusted-public-keys.json');assert.ok(await verifyProjectEvidence(seal,report,keys));
const altered=structuredClone(report);altered.observation.url+='-altered';assert.ok(!await verifyProjectEvidence(seal,altered,keys));
const forged=structuredClone(seal);forged.evidence.configHash='0'.repeat(64);assert.ok(!await verifyProjectEvidence(forged,report,keys));
await writeFile(join(output,'acceptance.json'),JSON.stringify({completed:true,sourceRunCleanup:true,reloadVerified:true,alteredScanRejected:true,alteredEvidenceRejected:true,eligibleForTraining:false},null,2),{flag:'wx'});
await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/${family}-${channel}-${profile}.json`,JSON.stringify({...result,cleanupCompleted:true},null,2));
console.log('Native '+family+' '+profile+' passed; retained '+relative(process.cwd(),output)+'. No model fitted or category qualified.');

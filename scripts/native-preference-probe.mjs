import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,createHmac,randomBytes,timingSafeEqual,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,rm,symlink,unlink,lstat,realpath,readdir} from 'node:fs/promises';
import {join,resolve,dirname,sep,delimiter} from 'node:path';
import {createServer,request} from 'node:http';
import {createServer as createTlsServer} from 'node:https';
import {parseArgs} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {loadPreferenceSource} from './native-preference-source.mjs';
import {preferenceAlias,preferenceProfile as applyPreferenceAlias} from './native-preference-profile.mjs';
import {scanProjectPage} from '../apps/cli/project-scanner.ts';
import {canonicalJson,contentHash} from '../packages/core/integrity.ts';
import {collectResponseFacts} from '../packages/ml/project-policy-facts.ts';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes.ts';
import {measureNativePreference,mergeNativePreference} from '../packages/ml/native-preference-evidence.ts';
import {readNativePreferenceRegistration} from '../packages/ml/native-preference-registration.ts';
import {nativeAdapterIdentity,nativeHarnessHash} from '../packages/ml/native-producer-identity.ts';
import {createNativeApiHstsSeedBatch,createNativePreferenceSeedBatch,createNativeSessionSeedBatch} from '../packages/ml/project-seed-corpus.ts';
import {readNamedFixtureTls} from '../packages/ml/local-tls.ts';
import {upgradeFixtureHost} from '../apps/cli/project-resource-function.ts';
import {measureHstsActivation,measureHstsDisable,mergeHstsActivation,mergeHstsDisable} from '../apps/cli/project-hsts-plaintext.ts';
import {ProjectSigner} from '../apps/server/project-signing.ts';
import {projectTransportPolicy,verifyProjectEvidence} from '../packages/core/project-evidence.ts';
import {measureAuthenticationCookies,mergeAuthenticationRole} from '../apps/cli/project-functional.ts';
import {measureCrossSite,mergeCrossSiteMutation} from '../apps/cli/project-cross-site.ts';
import {applySessionProfile,matchesSessionProfile,parseCrossSiteSessionProfile} from './native-session-profile.mjs';
import {inspectProject} from '../apps/server/project-inspection.ts';
import {gateConfigSchema} from '../apps/cli/gate-config.ts';

assert.ok(Number(process.versions.node.split('.')[0])>=24,'Use Node 24');
const {values}=parseArgs({options:{'readable-cookie':{type:'boolean'},'misleading-name':{type:'boolean'},seeds:{type:'boolean'},registration:{type:'string'},'samesite-profile':{type:'string'},'preference-profile':{type:'string'},'hsts-profile':{type:'string'}}});
const readable=values['readable-cookie']===true;
const misleading=values['misleading-name']===true;
const sameSite=parseCrossSiteSessionProfile(values['samesite-profile']);
const preferenceProfile=values['preference-profile'];
const hsts=values['hsts-profile'];
assert.ok(!hsts||(['hsts-disabled','hsts-positive','hsts-disable-active','hsts-activate-native'].includes(hsts)&&
  values.seeds&&values.registration&&!readable&&!misleading&&!sameSite&&!preferenceProfile));
const tls=hsts?await readNamedFixtureTls():undefined;
const wireHsts=hsts==='hsts-positive'||hsts==='hsts-activate-native'?'max-age=086400':'max-age=0';
assert.ok(!preferenceProfile||(/^(lax|strict)-(transient(?:-secure)?|persistent-secure)$/.test(preferenceProfile)&&readable&&misleading&&values.seeds&&values.registration&&!sameSite));
const preferenceSameSite=preferenceProfile?.startsWith('strict-')?'Strict':'Lax';
const securePreference=preferenceProfile?.endsWith('-secure')??false;
const transientPreference=preferenceProfile?.includes('-transient')??false;
assert.ok(!values['samesite-profile']||(sameSite&&values.seeds&&values.registration&&!readable&&!misleading));
assert.ok(!values.seeds||((readable&&misleading||sameSite||hsts)&&values.registration),'Registered seeds require a reviewed profile and --registration');
assert.ok(!values.registration||values.seeds,'Registration is only valid for seed acquisition');
assert.ok(!misleading||readable,'The alias profile requires explicit readable-cookie controls');
const preferenceName=misleading?preferenceAlias:'i18next',buildDirectory=misleading?'dist-preference':'dist';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
const {chromium}=await import('playwright');
const {verified,destination,meta,source}=await loadPreferenceSource({pinnedObjects:Boolean(tls)});
const key=values.seeds?(await readFile('.local/insights-dataset-key','utf8')).trim():undefined;
async function readHomeRegistration(){
  const base=await realpath('.local'),folder=await realpath(values.registration);
  assert.ok(folder.startsWith(base+sep));
  const path=join(folder,'registration.json'),info=await lstat(path);
  assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.size<16384);
  const {registrationHash,...body}=JSON.parse(await readFile(path,'utf8'));
  assert.equal(body.version,'vylnt-native-development-registration-v1');
  assert.equal(body.scope,hsts?'prospective-homeinventory-hsts':preferenceProfile?'prospective-homeinventory-language-variants':'prospective-homeinventory-house-create');
  assert.equal(createHmac('sha256',key).update('native-development:'+canonicalJson(body)).digest('hex'),registrationHash);
  assert.equal(body.harness,await nativeHarnessHash());
  assert.ok(Date.parse(body.registeredAt)<=Date.now());
  const sourcesPath=join(folder,'sources.json'),sourceInfo=await lstat(sourcesPath);
  assert.ok(sourceInfo.isFile()&&!sourceInfo.isSymbolicLink()&&sourceInfo.size<256*1024);
  const sources=JSON.parse(await readFile(sourcesPath,'utf8'));
  assert.equal(await contentHash(sources),body.sourceHash);
  const family=sources.families.find(entry=>entry.familyId===meta.familyId);
  assert.ok(family?.partition==='train'&&family.revisions.length===1&&family.revisions[0].commit===meta.revision);
  assert.equal(family.adapterHash,await nativeAdapterIdentity(meta));
  return {...body,registrationHash};
}
const registration=sameSite||preferenceProfile||hsts?await readHomeRegistration():values.seeds?await readNativePreferenceRegistration(values.registration,meta):undefined;
if(registration){
  assert.ok(!process.env.VYLNT_NATIVE_REGISTRATION||process.env.VYLNT_NATIVE_REGISTRATION===registration.registrationHash,'Another acquisition registration is selected');
  process.env.VYLNT_NATIVE_REGISTRATION=registration.registrationHash;
}
const adapterHash=values.seeds?await nativeAdapterIdentity(meta):undefined;
const languageSource=verified.find(entry=>entry.file==='client/src/utils/languageSupport.ts');
assert.ok(languageSource);
const languages=[...languageSource.bytes.toString('utf8').matchAll(/\{ code: '([A-Za-z-]+)'/g)].map(match=>match[1].toLowerCase());
assert.ok(languages.includes('de')&&languages.includes('fr')&&languages.includes('en'));
const parent=await realpath('.local'),execute=promisify(execFile);
const username='vylnt'+randomBytes(8).toString('hex'),password=randomBytes(24).toString('hex');
const secret=randomBytes(32).toString('hex'),encryption=randomBytes(32).toString('hex');
const hash=value=>createHash('sha256').update(value).digest('hex');
const collectorHash=hash(await readFile(process.argv[1]));
const overlayHashes={};
const scratchParent=tls?.directory??parent;
const root=await mkdtemp(join(scratchParent,'native-preference-run-')),app=join(root,'app');
const cancel=new AbortController();
const interrupt=()=>cancel.abort();
const message=value=>{if(value?.type==='cancel')interrupt();};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
process.on('message',message);
let child,browser,proxy,linked=false,stage='setup',port=0,owner,childFailed=false,result,diagnostic,observedReport,artifacts;
const phases=[];
const scanPath='/api/auth/me',writePath='/api/auth/create-house';
const privateCookieValues=[];
const preferenceCookie=(origin,value,httpOnly=false)=>({name:preferenceName,value,url:origin,httpOnly,
  sameSite:preferenceSameSite,secure:securePreference,expires:transientPreference?-1:Math.floor(Date.now()/1000)+(preferenceProfile?900:3600)});
const hasPreferenceProfile=(cookie,httpOnly)=>cookie&&cookie.sameSite===preferenceSameSite
  &&(cookie.expires===-1)===transientPreference&&cookie.secure===securePreference&&cookie.httpOnly===httpOnly;
const tracePreference=(context,key)=>context.addInitScript(({key,name,profile,securePreference,transientPreference})=>{
  const descriptor=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
  let read=false,wrote=false;
  if(!descriptor?.get||!descriptor.set||!descriptor.configurable)return;
  const getter=function(){
    const value=descriptor.get.call(this);
    if(value.split(';').some(part=>part.trim().startsWith(name+'=')))read=true;
    return value;
  };
  const setter=function(value){
    if(typeof value==='string'&&value.startsWith(name+'=')){
      wrote=true;
      if(profile){
        const [pair,...attributes]=value.split(';');
        const parsed=attributes.map(attribute=>attribute.trim().split('='));
        const removes=parsed.some(([key,raw])=>/^max-age$/i.test(key)&&Number(raw)<=0||/^expires$/i.test(key)&&Date.parse(raw)<=Date.now());
        if(!removes)value=[pair,...attributes.filter(attribute=>!/^\s*(?:samesite|max-age|expires)\s*=/i.test(attribute)&&!/^\s*secure\s*$/i.test(attribute)),
          'SameSite='+profile,...(transientPreference?[]:['Max-Age=900']),...(securePreference?['Secure']:[])].join(';');
      }
    }
    descriptor.set.call(this,value);
  };
  Object.defineProperty(Document.prototype,'cookie',{...descriptor,get:getter,set:setter});
  if(key)Object.defineProperty(globalThis,key,{value:()=>({read,wrote,valid:Object.getOwnPropertyDescriptor(Document.prototype,'cookie')?.get===getter&&Object.getOwnPropertyDescriptor(Document.prototype,'cookie')?.set===setter})});
},{key,name:preferenceName,profile:preferenceProfile?preferenceSameSite:null,securePreference,transientPreference});
cancel.signal.addEventListener('abort',()=>{void browser?.close().catch(()=>{});});
const env={};
for(const name of ['PATHEXT','SystemRoot','WINDIR','ComSpec','SystemDrive'])if(process.env[name])env[name]=process.env[name];
env.PATH=dirname(process.execPath)+delimiter+(process.env.PATH??process.env.Path??'');
let buildBytes=0,buildFiles=0;
const buildHashes=[];
async function copyBuild(from,to){
  const info=await lstat(from);
  assert.ok(!info.isSymbolicLink(),'Build symlinks are unsupported');
  if(info.isDirectory()){
    await mkdir(to,{recursive:true});
    for(const name of (await readdir(from)).sort())await copyBuild(join(from,name),join(to,name));
    return;
  }
  assert.ok(info.isFile()&&info.size<=16*1024*1024&&++buildFiles<=3000);
  const bytes=await readFile(from);buildBytes+=bytes.length;
  assert.ok(buildBytes<=64*1024*1024,'Client build budget exceeded');
  buildHashes.push(hash(bytes));await writeFile(to,bytes,{flag:'wx'});
}
try{
  await mkdir(join(root,'tmp'));await mkdir(join(root,'uploads'));
  for(const {file,bytes} of verified){
    const path=join(app,file);await mkdir(dirname(path),{recursive:true});
    const data=misleading&&['client/src/i18n.ts','config/i18n.js'].includes(file)?applyPreferenceAlias(file,bytes.toString('utf8')):bytes;
    if(data!==bytes)overlayHashes[file]=hash(data);
    await writeFile(path,data,{flag:'wx'});
  }
  await copyBuild(join(destination,'client',buildDirectory),join(app,'client',buildDirectory));
  for(const file of ['package-lock.json','client/package-lock.json']){
    const pinned=verified.find(entry=>entry.file===file);
    assert.equal(hash(await readFile(join(destination,file))),hash(pinned.bytes),'Dependency lock changed');
  }
  const dependencies=tls?join(tls.directory,'homeinventory-dependencies'):destination;
  if(tls){
    assert.equal(await realpath(dependencies),dependencies);
    assert.equal(hash(await readFile(join(dependencies,'package-lock.json'))),meta.dependencyLockSha256);
    assert.deepEqual(await readFile(join(dependencies,'package.json')),verified.find(entry=>entry.file==='package.json')?.bytes);
  }
  await symlink(join(dependencies,'node_modules'),join(app,'node_modules'),process.platform==='win32'?'junction':'dir');linked=true;
  const bootstrap=`
    const net=require('node:net');
    const listen=net.Server.prototype.listen;
    net.Server.prototype.listen=function(){
      this.once('listening',()=>{const address=this.address();process.send?.({type:'listening',port:address.port,host:address.address})});
      return listen.call(this,0,'127.0.0.1');
    };
    (async()=>{
      const [{default:db},fields,{default:bcrypt}]=await Promise.all([
        import('./app/database.js'),import('./app/utils/protectedFields.js'),import('./app/node_modules/bcrypt/bcrypt.js')
      ]);
      const name=process.env.VYLNT_SYNTH_USER,email=name+'@example.invalid';
      const row=db.prepare('INSERT INTO users (username,email,username_lookup,email_lookup,password_hash,role,is_verified) VALUES (?,?,?,?,?,?,1)')
        .run(fields.encryptUsername(name),fields.encryptEmail(email),fields.buildUsernameLookup(name),fields.buildEmailLookup(email),await bcrypt.hash(process.env.VYLNT_SYNTH_PASSWORD,10),'user');
      const owner=Number(row.lastInsertRowid);
      if(db.prepare('SELECT id FROM users WHERE username_lookup=?').get(fields.buildUsernameLookup(name))?.id!==owner)throw Error('Seed readback');
      process.send?.({type:'seeded',owner});
      await import('./app/app.js');
    })().catch(error=>{process.send?.({type:'startup-failure',code:typeof error.code==='string'?error.code:'NATIVE_STARTUP'});process.exitCode=2});
  `;
  await writeFile(join(root,'start.cjs'),bootstrap);
  child=spawn(process.execPath,[join(root,'start.cjs')],{cwd:app,windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],
    env:{...env,NODE_ENV:'production',PORT:'0',HOST:'127.0.0.1',SECRET_PROVIDER:'env',HOMEINVENTORY_LOCAL_HTTP:'true',
      HOMEINVENTORY_DB_PATH:join(root,'data/inventory.db'),HOMEINVENTORY_UPLOADS_DIR:join(root,'uploads'),
      BACKUP_DIR:join(root,'backups'),BACKUP_SCHEDULE:'off',UPDATE_CHECK:'false',
      APP_CLIENT_DIST_DIR:buildDirectory,
      JWT_SECRET:secret,APP_ENCRYPTION_KEY:encryption,APP_ENCRYPTION_KEY_ID:'disposable',
      VYLNT_SYNTH_USER:username,VYLNT_SYNTH_PASSWORD:password,TEMP:join(root,'tmp'),TMP:join(root,'tmp')}});
  child.on('error',()=>{childFailed=true;});
  child.on('message',message=>{
    if(message?.type==='seeded'&&Number.isSafeInteger(message.owner))owner=message.owner;
    if(message?.type==='listening'&&message.host==='127.0.0.1'&&Number.isSafeInteger(message.port))port=message.port;
    if(message?.type==='startup-failure'){childFailed=true;console.error('Native startup classification:',message.code);}
  });
  stage='native startup';const deadline=Date.now()+(tls?120000:45000);
  while(!port||!owner){
    cancel.signal.throwIfAborted();assert.ok(!childFailed&&child.exitCode===null,'Native startup failed');
    assert.ok(Date.now()<deadline,'Native startup timeout (owner '+Boolean(owner)+', listener '+Boolean(port)+')');await new Promise(done=>setTimeout(done,100));
  }
  const upstreamOrigin='http://127.0.0.1:'+port;
  let origin=upstreamOrigin;
  if(readable||sameSite||tls){
    const forward=(incoming,outgoing)=>{
      const restricted=incoming.headers['x-vylnt-preference-restricted']==='1';
      const headers={...incoming.headers,host:'127.0.0.1:'+port,'accept-encoding':'identity'};
      delete headers['x-vylnt-preference-restricted'];
      const upstream=request({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,headers,agent:false},response=>{
        const outgoingHeaders={...response.headers};
        if(tls){
          if(incoming.url===scanPath&&response.statusCode===200)outgoingHeaders['strict-transport-security']=wireHsts;
        }else if(sameSite&&outgoingHeaders['set-cookie'])outgoingHeaders['set-cookie']=applySessionProfile(outgoingHeaders['set-cookie'],'token',sameSite);
        else if(preferenceProfile&&outgoingHeaders['set-cookie'])outgoingHeaders['set-cookie']=applySessionProfile(outgoingHeaders['set-cookie'],preferenceName,
          {sameSite:preferenceSameSite.toLowerCase(),session:transientPreference,secure:securePreference,httpOnly:restricted});
        else if(outgoingHeaders['set-cookie'])outgoingHeaders['set-cookie']=outgoingHeaders['set-cookie'].map(cookie=>{
          if(!cookie.startsWith(preferenceName+'='))return cookie;
          let value=cookie.replace(/;\s*Secure\s*(?=;|$)/gi,'');
          if(!restricted)value=value.replace(/;\s*HttpOnly\s*(?=;|$)/gi,'');
          return value;
        });
        outgoing.writeHead(response.statusCode??502,outgoingHeaders);
        let size=0;response.on('data',bytes=>{size+=bytes.length;if(size>16*1024*1024)response.destroy();});
        response.on('error',()=>outgoing.destroy());response.pipe(outgoing);
      });
      upstream.setTimeout(10000,()=>upstream.destroy());
      upstream.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});
      incoming.on('aborted',()=>upstream.destroy());outgoing.on('close',()=>upstream.destroy());incoming.pipe(upstream);
    };
    proxy=tls?createTlsServer({cert:tls.cert,key:tls.key},forward):createServer(forward);
    await new Promise(done=>proxy.listen(0,'127.0.0.1',done));
    origin=(tls?'https://'+upgradeFixtureHost+':':'http://127.0.0.1:')+proxy.address().port;
  }
  browser=await chromium.launch({headless:true,...(process.env.VYLNT_TEST_BROWSER==='msedge'?{channel:'msedge'}:{})});
  stage='native login';const login=await browser.newContext({serviceWorkers:'block'});
  let cookies;
  try{
    const loginOrigin=tls?upstreamOrigin:origin;
    const response=await login.request.post(loginOrigin+'/api/auth/login',{data:{username,password},maxRedirects:0,timeout:10000});
    assert.equal(response.status(),200,'Native login status');assert.equal((await response.json()).user.id,owner);
    cookies=await login.cookies(loginOrigin);
    privateCookieValues.push(...cookies.filter(cookie=>cookie.value.length>16).map(cookie=>cookie.value));
  }finally{await login.close();}
  assert.ok(cookies.some(cookie=>cookie.name==='token'));
  if(!sameSite)assert.ok(cookies.find(cookie=>cookie.name==='token').httpOnly,'Native authentication cookie must remain HttpOnly');
  const token=cookies.find(cookie=>cookie.name==='token').value,parts=token.split('.');
  assert.equal(parts.length,3);
  assert.equal(JSON.parse(Buffer.from(parts[0],'base64url')).alg,'HS256');
  const signature=createHmac('sha256',secret).update(parts[0]+'.'+parts[1]).digest();
  const supplied=Buffer.from(parts[2],'base64url');assert.equal(signature.length,supplied.length);
  assert.ok(timingSafeEqual(signature,supplied));assert.equal(JSON.parse(Buffer.from(parts[1],'base64url')).id,owner);
  if(tls){
    stage='native HomeInventory house write and ownership readback';
    const db=new DatabaseSync(join(root,'data/inventory.db'),{readOnly:true});
    const active=await browser.newContext({serviceWorkers:'block'}),anonymous=await browser.newContext({serviceWorkers:'block'});
    try{
      db.exec('PRAGMA busy_timeout=5000');
      const rows=()=>db.prepare('SELECT id,user_id,is_owner,house_key FROM user_houses ORDER BY id').all();
      const before=rows(),requestOptions={data:{house_name:'VYLNT disposable house'},maxRedirects:0,timeout:10000};
      await active.addCookies(cookies);
      const written=await active.request.post(upstreamOrigin+writePath,requestOptions);
      assert.equal(written.status(),200,'Native house creation');
      const houseKey=(await written.json()).house_key,after=rows(),created=after.at(-1);
      assert.ok(typeof houseKey==='string'&&houseKey.length>16&&after.length===before.length+1&&created?.house_key===houseKey&&
        created.user_id===owner&&created.is_owner===1&&canonicalJson(after.slice(0,-1))===canonicalJson(before),'Independent house ownership readback');
      privateCookieValues.push(houseKey);
      const denied=await anonymous.request.post(upstreamOrigin+writePath,requestOptions);
      assert.ok([401,403].includes(denied.status())&&canonicalJson(rows())===canonicalJson(after),'Anonymous write must leave the database unchanged');
    }finally{db.close();await Promise.all([active.close(),anonymous.close()]);}

    stage='strict TLS HomeInventory collection';
    const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(120000)]);
    let disable,activation;
    const collected=await scanProjectPage(origin+scanPath,{allowedLocalOrigins:[origin,origin.replace('https:','http:')],
      namedUpgradeFixture:true,requireComplete:true,channel:'chromium',signal,hooks:{
        prepare:async(_page,context)=>context.addCookies(cookies.map(({name,value,httpOnly,sameSite,expires,secure})=>
          ({url:origin,name,value,httpOnly,sameSite,expires,secure}))),
        collected:async(page,_context,report)=>{
          assert.equal(page.url(),origin+scanPath);
          assert.ok(await page.locator('pre').evaluate((element,id)=>{
            const data=JSON.parse(element.textContent??'');
            return (data.user?.id??data.id)===id;
          },owner),'TLS response must identify the verified owner');
          if(hsts==='hsts-disable-active')disable=await measureHstsDisable(page,report,adapterHash,tls,signal);
          if(hsts==='hsts-activate-native')activation=await measureHstsActivation(page,report,adapterHash,tls,signal);
        }
      }});
    observedReport=collected.report;
    assert.ok(collected.measurement.tlsValidated?.value===true&&collected.measurement.hstsApplicable?.value===true&&
      Date.parse(observedReport.observation.scannedAt)>=Date.parse(registration.registeredAt));
    await loadPreferenceSource({pinnedObjects:true});
    assert.equal((await readHomeRegistration()).registrationHash,registration.registrationHash);
    stage='registered HSTS evidence';
    const configHash=await contentHash({profile:hsts,collectorHash,scanPath,writePath,bootstrapHash:hash(bootstrap),leaf:tls.manifest.sha256});
    let evidence=await collectResponseFacts(observedReport,{runId:randomUUID(),commit:meta.revision,adapterHash,configHash},false);
    evidence=mergeBrowserMeasurement(evidence,collected.measurement);
    evidence.collectionKind='application';evidence.policy=projectTransportPolicy;
    if(disable)evidence=await mergeHstsDisable(evidence,disable);
    if(activation)evidence=await mergeHstsActivation(evidence,activation);
    evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash,
      config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:[scanPath]}),signal});
    assert.equal(evidence.inspection.framework,'express');evidence.inspection.coverage='partial';
    const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
    assert.ok(await verifyProjectEvidence(seal,observedReport,signer.trustedKeys));
    const seeds=await createNativeApiHstsSeedBatch('homeinventory',observedReport,seal,signer.trustedKeys,{
      nativeWriteReadback:true,checkIdentity:adapterHash,leaf:tls.manifest.sha256,wireHsts},key);
    assert.deepEqual(seeds.rows.filter(row=>!row.uncertain).map(row=>[row.category,row.label]),
      [['HDR-001',wireHsts==='max-age=0'?'change-warranted':'contextual']]);
    artifacts={'report.json':observedReport,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,
      'development-seeds.json':seeds,'source.json':meta,'registration.json':registration,
      'native-oracles.json':{profile:hsts,signedOwner:true,nativeWriteReadback:true,anonymousDeniedWithoutMutation:true},
      ...(disable?{'hsts-disable-oracle.json':disable}:{}),...(activation?{'hsts-activation-oracle.json':activation}:{})};
    result={version:'vylnt-native-homeinventory-hsts-v1',sourceRevision:meta.revision,profile:hsts,rawScanHash:await contentHash(observedReport),
      registrationHash:registration.registrationHash,channel:'chromium',signedSeedsIssued:true,qualification:false};
  }else if(sameSite){
    stage='registered house creation';
    const db=new DatabaseSync(join(root,'data/inventory.db'),{readOnly:true});
    let dependency,crossSite;
    const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
    let collected;
    try{
      db.exec('PRAGMA busy_timeout=5000');
      const rows=()=>db.prepare('SELECT id,user_id,is_owner FROM user_houses ORDER BY id').all();
      const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(90000)]);
      collected=await scanProjectPage(origin+scanPath,{allowedLocalOrigins:[origin],requireComplete:true,channel,signal,hooks:{
        prepare:async(_page,context)=>context.addCookies(cookies),
        collected:async(_page,context,report)=>{
          const targets=report.observation.cookies?.filter(cookie=>cookie.name==='token');
          assert.ok(targets?.length===1&&matchesSessionProfile(targets[0],sameSite));
          const finding=report.findings.find(row=>row.ruleId==='CK-003'&&row.evidence.cookieName==='token');
          assert.ok(finding,'Shared detector must observe the target cookie');
          dependency=await measureAuthenticationCookies(context,report,{identityHash:adapterHash,check:async page=>{
            const response=await page.goto(origin+scanPath);
            if(response?.status()===401)return 'anonymous';
            if(response?.status()!==200)return 'unknown';
            const data=await response.json();
            return (data.user?.id??data.id)===owner?'authenticated':'unknown';
          }},signal);
          assert.ok(dependency.targets.some(target=>target.findingId===finding.id),'Native authentication dependency is required');
          let before=[];
          crossSite=await measureCrossSite(context,report,{identityHash:adapterHash,path:writePath,cookieName:'token',
            prepare:async phase=>{before=rows();assert.ok(before.length<16);return {house_name:'Disposable '+phase};},
            observe:async()=>{
              const after=rows(),last=after.at(-1);
              if(JSON.stringify(after)===JSON.stringify(before))return 'unchanged';
              return after.length===before.length+1&&JSON.stringify(after.slice(0,-1))===JSON.stringify(before)
                &&last.user_id===owner&&last.is_owner===1?'changed':'unknown';
            }},signal);
          const {sameSite:baseline,crossSite:foreign,repeated,anonymous}=crossSite.controls;
          assert.ok([baseline,foreign,repeated].every(probe=>probe.outcome==='changed-with-cookie'),JSON.stringify(crossSite.controls));
          assert.ok(anonymous.complete&&!anonymous.cookieSent&&anonymous.status===401&&anonymous.state==='unchanged',JSON.stringify(crossSite.controls));
        }
      }});
    }finally{db.close();}
    observedReport=collected.report;
    assert.ok(Date.parse(observedReport.observation.scannedAt)>=Date.parse(registration.registeredAt));
    await loadPreferenceSource();
    assert.equal((await readHomeRegistration()).registrationHash,registration.registrationHash);
    const configHash=await contentHash({profile:values['samesite-profile'],collectorHash,scanPath,writePath,bootstrapHash:hash(bootstrap)});
    let evidence=await collectResponseFacts(observedReport,{runId:randomUUID(),commit:meta.revision,adapterHash,configHash},false);
    evidence=mergeCrossSiteMutation(mergeAuthenticationRole(mergeBrowserMeasurement(evidence,collected.measurement),dependency),crossSite);
    evidence.collectionKind='application';evidence.policy=projectTransportPolicy;
    evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash,
      config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:[scanPath]}),signal:cancel.signal});
    assert.equal(evidence.inspection.framework,'express');evidence.inspection.coverage='partial';
    const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
    assert.ok(await verifyProjectEvidence(seal,observedReport,signer.trustedKeys));
    const controls={signedSessionMapsToSyntheticUser:true,nativeBookmarkRowVerified:true,anonymousDeniedWithoutMutation:true,
      cookies:observedReport.observation.cookies.map(cookie=>({name:cookie.name,httpOnly:cookie.httpOnly,secure:cookie.secure,
        authenticationRequired:cookie.name==='token',javaScriptAccessUnnecessary:false})),crossSiteWitness:crossSite.witnessHash};
    const seeds=await createNativeSessionSeedBatch('homeinventory',observedReport,seal,signer.trustedKeys,controls,key);
    assert.deepEqual(seeds.rows.filter(row=>!row.uncertain).map(row=>[row.category,row.label]),[['CK-003','change-warranted']]);
    artifacts={'report.json':observedReport,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,
      'development-seeds.json':seeds,'source.json':meta,'native-oracles.json':crossSite,'registration.json':registration};
    result={version:'vylnt-native-house-acquisition-v1',sourceRevision:meta.revision,profile:values['samesite-profile'],
      rawScanHash:await contentHash(observedReport),registrationHash:registration.registrationHash,channel,browser:browser.version(),
      signedSeedsIssued:true,qualification:false};
  }else{
  for(const mode of ['first','second','absent','restricted','restored','competing-storage','no-auth']){
    stage='preference phase '+mode;cancel.signal.throwIfAborted();
    assert.ok(child.exitCode===null&&child.signalCode===null,'Native application exited');
    const context=await browser.newContext({serviceWorkers:'block',locale:'en-US',acceptDownloads:false,
      extraHTTPHeaders:{'x-vylnt-preference-restricted':mode==='restricted'?'1':'0'}});
    let external=false,requests=0,page,traceKey;
    try{
      await context.route('**/*',async route=>{
        const request=route.request(),target=new URL(request.url());
        if(target.origin!==origin||++requests>300||target.username||target.password){external=true;await route.abort();return;}
        await route.continue();
      });
      await context.routeWebSocket('**/*',socket=>{external=true;socket.close();});
      await context.addCookies(mode==='no-auth'?[]:cookies);
      if(mode!=='absent')await context.addCookies([preferenceCookie(origin,mode==='second'?'fr':'de',mode==='restricted')]);
      else await context.clearCookies({name:preferenceName});
      const seeded=(await context.cookies(origin)).filter(cookie=>cookie.name===preferenceName);
      assert.ok(mode==='absent'?seeded.length===0:seeded.length===1&&seeded[0].value===(mode==='second'?'fr':'de')&&seeded[0].httpOnly===(mode==='restricted'),'Preference seed is unambiguous');
      if(mode==='competing-storage')await context.addInitScript(()=>{
        localStorage.setItem('i18next','fr');localStorage.setItem('i18nextLng','fr');
      });
      traceKey='__vylnt_preference_'+randomUUID().replaceAll('-','');
      await tracePreference(context,traceKey);
      page=await context.newPage();page.setDefaultTimeout(5000);
      page.on('worker',()=>{external=true;});
      diagnostic={scriptResponses:0,failedScriptResponses:0,pageErrors:0,cspErrors:0};
      page.on('pageerror',()=>{diagnostic.pageErrors++;});
      page.on('console',message=>{if(/content.security.policy|violates.*directive/i.test(message.text()))diagnostic.cspErrors++;});
      page.on('response',response=>{
        if(response.request().resourceType()==='script'){
          diagnostic.scriptResponses++;
          if(response.status()>=400)diagnostic.failedScriptResponses++;
        }
      });
      stage='preference '+mode+' navigation';
      const response=await page.goto(origin+'/',{waitUntil:'networkidle',timeout:30000});
      assert.equal(response?.status(),200,'Native client response');
      stage='preference '+mode+' script access';
      await page.waitForFunction(key=>globalThis[key]?.().wrote===true,traceKey,{timeout:15000});
      stage='preference '+mode+' language and owner';
      await page.waitForFunction(codes=>{
        const raw=document.documentElement.lang.toLowerCase();
        return codes.includes(raw)||codes.includes(raw.split('-')[0]);
      },languages);
      const rawLanguage=(await page.locator('html').getAttribute('lang')).toLowerCase();
      const language=languages.includes(rawLanguage)?rawLanguage:rawLanguage.split('-')[0];
      const protectedResponse=await context.request.get(origin+'/api/auth/me',{maxRedirects:0,timeout:10000});
      const authStatus=protectedResponse.status();
      if(authStatus===200)assert.equal((await protectedResponse.json()).user.id,owner,'Protected native owner');
      if(!['absent','restricted'].includes(mode)){
        const expected=mode==='second'||mode==='competing-storage'?'fr':'de';
        assert.equal(language,expected,'Native language counterfactual');
      }
      assert.equal(authStatus,mode==='no-auth'?401:200);
      const currentAuth=(await context.cookies(origin)).find(cookie=>cookie.name==='token');
      if(mode==='no-auth')assert.ok(!currentAuth);
      else{
        const originalAuth=cookies.find(cookie=>cookie.name==='token');
        assert.ok(currentAuth&&currentAuth.httpOnly===originalAuth.httpOnly&&currentAuth.secure===originalAuth.secure&&currentAuth.sameSite===originalAuth.sameSite,'Authentication cookie attributes changed');
      }
      let interaction;
      if(mode==='first'){
        await page.waitForFunction(()=>document.querySelector('#root')?.childElementCount>0,{},{timeout:15000});
        const trigger=page.locator('button[aria-haspopup="dialog"]').filter({has:page.locator('svg.lucide-globe')}).first();
        await trigger.click();
        await page.locator('button.language-picker-option').filter({has:page.locator('.language-picker-option-code',{hasText:/^FR$/i})}).first().click();
        await page.waitForFunction(()=>document.documentElement.lang==='fr');
        interaction=(await context.cookies(origin)).some(cookie=>cookie.name===preferenceName&&cookie.value==='fr');
        assert.ok(interaction,'Native language interaction persisted');
      }
      const access=await page.evaluate(key=>globalThis[key](),traceKey);
      assert.ok(access.valid&&access.wrote,'Native preference accessor trace');
      if(['first','second','restored'].includes(mode))assert.ok(access.read,'Native preference access observed');
      if(mode==='restricted')assert.equal(access.read,false);
      if(preferenceProfile){
        const actual=(await context.cookies(origin)).filter(cookie=>cookie.name===preferenceName);
        assert.ok(actual.length===1&&hasPreferenceProfile(actual[0],mode==='restricted'),'Native preference profile changed during controls');
      }
      assert.ok(!external,'Native browser left its explicit loopback scope');
      assert.ok(context.pages().length===1&&page.frames().length===1,'Unsupported native browsing context');
      phases.push({mode,language,authentication:authStatus===200?'authenticated':'anonymous',nativeInteraction:interaction,access,complete:true});
    }catch(error){
      diagnostic={...diagnostic,external,requests,errorClass:error?.name,
        state:await page?.evaluate(key=>({
          hasContent:!!document.querySelector('#root')?.childElementCount,
          language:/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(document.documentElement.lang)?document.documentElement.lang:'other',
          access:globalThis[key]?.()
        }),traceKey).catch(()=>undefined)};
      throw error;
    }finally{await context.close().catch(()=>{});}
  }
  stage='shared detector scan';
  const collected=await scanProjectPage(origin+'/',{allowedLocalOrigins:[origin],requireComplete:true,
    channel:process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium',signal:cancel.signal,hooks:{prepare:async(_page,context)=>{
      await context.addCookies(cookies.filter(cookie=>cookie.name!==preferenceName));
      await context.addCookies([preferenceCookie(origin,'de')]);
      if(preferenceProfile)await tracePreference(context);
    },ready:async(page,context)=>{
      await page.waitForLoadState('networkidle',{timeout:15000});
      await page.waitForFunction(()=>document.documentElement.lang==='de',undefined,{timeout:10000});
      const target=(await context.cookies(origin)).filter(cookie=>cookie.name===preferenceName);
      assert.ok(target.length===1&&target[0].secure===securePreference&&!target[0].httpOnly&&['Lax','Strict'].includes(target[0].sameSite),'Native preference metadata must settle before collection');
      if(preferenceProfile)assert.ok(hasPreferenceProfile(target[0],false),'Native preference profile changed during scan');
    }}});
  const categories=collected.report.findings.filter(finding=>finding.evidence.cookieName===preferenceName).map(finding=>finding.ruleId).sort();
  observedReport=collected.report;
  const expectedCategories=securePreference?['CK-002']:['CK-001','CK-002'];
  if(misleading)assert.deepEqual(categories,expectedCategories,'Actual shared-rule preference observations');
  if(registration){
    stage='registered preference source recheck';
    await loadPreferenceSource();
    const current=preferenceProfile?await readHomeRegistration():await readNativePreferenceRegistration(values.registration,meta);
    assert.equal(current.registrationHash,registration.registrationHash);
    assert.ok(Date.parse(observedReport.observation.scannedAt)>=Date.parse(registration.registeredAt));
    const binding={runId:randomUUID(),commit:meta.revision,adapterHash,
      configHash:await contentHash({profile:preferenceProfile??'misleading-native-language-cookie',collectorHash,overlayHashes,
        buildHash:hash(JSON.stringify(buildHashes)),bootstrapHash:hash(bootstrap),sourceGraphHash:await contentHash(meta.sourceSha256)})};
    stage='registered response evidence';
    let evidence=await collectResponseFacts(observedReport,binding,false);
    evidence=mergeBrowserMeasurement(evidence,collected.measurement);
    evidence.collectionKind='application';
    stage='registered native syntax inspection';
    evidence.inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:binding.configHash,
      config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/','/legal-consent']}),signal:cancel.signal});
    assert.equal(evidence.inspection.framework,'express');evidence.inspection.coverage='partial';
    const controls={version:'vylnt-native-preference-oracle-v1',scanHash:await contentHash(observedReport),adapterHash,
      sourceGraphHash:await contentHash(meta.sourceSha256),collectorHash,buildHash:hash(JSON.stringify(buildHashes)),overlayHash:await contentHash(overlayHashes),
      nativeSessionSignature:true,independentOwnerReadback:true,authenticationAttributesPreserved:true,sourceReverified:true,phases,
      ...(securePreference?{securePreference:true}:{})};
    stage='registered preference facts';
    const measurement=await measureNativePreference(observedReport,evidence,controls);
    assert.equal(measurement.status,'verified');evidence=await mergeNativePreference(evidence,measurement);
    stage='registered preference signing';
    const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
    assert.ok(await verifyProjectEvidence(seal,observedReport,signer.trustedKeys));
    stage='registered preference seed receipts';
    const seeds=await createNativePreferenceSeedBatch(observedReport,seal,signer.trustedKeys,controls,(await readFile('.local/insights-dataset-key','utf8')).trim());
    assert.equal(seeds.registrationHash,registration.registrationHash);
    assert.deepEqual(seeds.rows.filter(row=>!row.uncertain).map(row=>row.category).sort(),expectedCategories);
    assert.ok(seeds.rows.filter(row=>!row.uncertain).every(row=>row.label==='contextual'));
    artifacts={'report.json':observedReport,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,
      'development-seeds.json':seeds,'source.json':meta,'native-oracles.json':controls,'registration.json':registration};
  }
  result={version:registration?'vylnt-native-preference-acquisition-v1':'vylnt-native-preference-prototype-v1',sourceRevision:meta.revision,
    profile:preferenceProfile??(misleading?'misleading-native-language-cookie':readable?'target-only-readable-cookie':'native-server-cookie'),
    collectorHash,overlayHashes,
    rawScanHash:await contentHash(collected.report),rawFindingCategories:categories,
    sourceHashes:meta.sourceSha256,buildHash:hash(JSON.stringify(buildHashes)),bootstrapHash:hash(bootstrap),
    runtime:{node:process.versions.node,browser:browser.version(),platform:process.platform},phases,
    nativeSessionSignature:true,independentOwnerReadback:true,eligibleForTraining:false,qualification:false,
    ...(registration?{registrationHash:registration.registrationHash,signedSeedsIssued:true}:{}),
    limitation:registration?'Controlled native preference seeds only. Cohort preparation, model fitting and fresh qualification are separate gates.':
      'Native preference behavior only. No training label, model prediction or full-application security claim.'};
  }
}catch(error){
  await mkdir('test-results/native-preference',{recursive:true});
  await writeFile(join('test-results/native-preference','failure-'+randomUUID()+'.json'),JSON.stringify({
    passed:false,stage,diagnostic,completedPhases:phases,cancelled:cancel.signal.aborted,eligibleForTraining:false
  },null,2),{flag:'wx'});
  if(error instanceof assert.AssertionError)console.error('Native bounded assertion:',error.message);
  else console.error('Native failure classification:',/^(?:[A-Za-z]+)?Error$/.test(error?.name??'')?error.name:'unclassified',
    Array.isArray(error?.issues)?error.issues.map(issue=>({path:issue.path,code:issue.code})):[]);
  throw Error('Native preference acquisition failed during '+stage);
}finally{
  await browser?.close();
  if(proxy){proxy.closeAllConnections();await new Promise(done=>proxy.close(done));}
  if(child?.pid&&child.exitCode===null){
    if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000}).catch(()=>child.kill('SIGKILL'));
    else child.kill('SIGKILL');
    if(child.exitCode===null&&child.signalCode===null)await new Promise((done,reject)=>{
      const timer=setTimeout(()=>reject(Error('Native process cleanup timeout')),5000);
      child.once('exit',()=>{clearTimeout(timer);done();});
    });
  }
  const checked=await realpath(root);assert.ok(checked===root&&dirname(checked)===scratchParent);
  if(linked)await unlink(join(app,'node_modules'));
  await rm(checked,{recursive:true,force:true,maxRetries:8,retryDelay:200});
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
  process.removeListener('message',message);
  if(process.connected)process.disconnect();
}
assert.ok(result);
assert.ok(observedReport&&await contentHash(observedReport)===result.rawScanHash);
const serialized=JSON.stringify({result,report:observedReport,artifacts});
for(const privateValue of [username,password,secret,encryption,...privateCookieValues])assert.ok(!serialized.includes(privateValue));
await mkdir('test-results/native-preference',{recursive:true});
const runId=randomUUID(),output=join('test-results/native-preference',runId+'.json');
await writeFile(join('test-results/native-preference',runId+'-report.json'),JSON.stringify(observedReport,null,2),{flag:'wx',mode:0o600});
await writeFile(output,JSON.stringify({...result,passed:true,cleanupCompleted:true},null,2),{flag:'wx',mode:0o600});
if(artifacts){
  const folder=join('.local/ml-native-observations/homeinventory',runId);await mkdir(folder,{recursive:true});
  for(const [file,value] of Object.entries(artifacts))await writeFile(join(folder,file),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
  const reload=async file=>JSON.parse(await readFile(join(folder,file),'utf8'));
  const report=await reload('report.json'),seal=await reload('evidence.json'),keys=await reload('trusted-public-keys.json');
  assert.ok(await verifyProjectEvidence(seal,report,keys));
  const altered=structuredClone(report);altered.observation.url+='-altered';assert.ok(!await verifyProjectEvidence(seal,altered,keys));
  const forged=structuredClone(seal);forged.evidence.configHash='0'.repeat(64);assert.ok(!await verifyProjectEvidence(forged,report,keys));
  await writeFile(join(folder,'acceptance.json'),JSON.stringify({completed:true,sourceRunCleanup:true,reloadVerified:true,
    alteredScanRejected:true,alteredEvidenceRejected:true,eligibleForTraining:false,qualification:false},null,2),{flag:'wx',mode:0o600});
  console.log('Registered native controls and signed seeds passed: '+folder+'. No model fitted or category qualified.');
}else console.log('Native preference controls passed. Aggregate prototype result: '+output+'. No training examples issued.');

import assert from 'node:assert/strict';
import { spawn,execFile,type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash,randomBytes,randomUUID } from 'node:crypto';
import { mkdir,mkdtemp,readFile,writeFile,rm,realpath,lstat } from 'node:fs/promises';
import { resolve,join,sep } from 'node:path';
import { createServer } from 'node:net';
import { createServer as createHttpServer,request as requestHttp } from 'node:http';
import { scanProjectPage } from '../apps/cli/project-scanner';
import { measureAuthenticationCookies,mergeAuthenticationRole,type CookieDependencyMeasurement } from '../apps/cli/project-functional';
import { measureCookieJavaScriptAccess,mergeCookieAccess,type CookieAccessMeasurement } from '../apps/cli/project-cookie-access';
import { measureScriptFunction,mergeScriptFunction,type ScriptMeasurement } from '../apps/cli/project-script-function';
import { measureFraming,type FramingMeasurement } from '../apps/cli/project-framing';
import { measureCrossSite } from '../apps/cli/project-cross-site';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { ProjectSigner } from '../apps/server/project-signing';
import { verifyProjectEvidence,prepareProjectContexts,guardProjectAssessment } from '../packages/core/project-evidence';
import {inspectProject} from '../apps/server/project-inspection';
import {gateConfigSchema} from '../apps/cli/gate-config';
import { contentHash } from '../packages/core/integrity';

const execute=promisify(execFile),upstream='10079c22d6cb66cfa0e7a91742c631fa0a153bd4';
const readableCookies=process.env.VYLNT_NATIVE_COOKIE_VARIANT==='readable';
const crossSiteCookies=process.env.VYLNT_NATIVE_COOKIE_VARIANT==='cross-site';
const responseProfile=readableCookies?'readable-cookie-attribute-control':crossSiteCookies?'cross-site-cookie-attribute-control':'native';
const source=resolve('.local/ml-native-jingo'),parent=resolve('.local');
const cancel=new AbortController(),onInterrupt=()=>cancel.abort();
const onMessage=(message:unknown)=>{if(message&&typeof message==='object'&&'type' in message&&message.type==='cancel')onInterrupt();};
process.on('SIGINT',onInterrupt);process.on('SIGTERM',onInterrupt);process.on('message',onMessage);
const env={...process.env};for(const k of Object.keys(env))if(k.startsWith('GIT_'))delete env[k];
const git=async(args:string[],cwd=source)=>(await execute('git',args,{cwd,env,windowsHide:true,timeout:10000,signal:cancel.signal})).stdout.trim().replace(/\r\n/g,'\n');
assert.equal(await git(['rev-parse','HEAD']),upstream,'Use the pinned upstream revision');
assert.equal(await git(['status','--porcelain','--untracked-files=no']),'','Native source must be unchanged');
assert.match(await readFile(join(source,'LICENSE'),'utf8'),/MIT License/);
const dependencyLockHash=createHash('sha256').update(await readFile(join(source,'package-lock.json'))).digest('hex');
assert.equal(dependencyLockHash,createHash('sha256').update(await readFile('ml/applications/native/jingo.package-lock.json')).digest('hex'),'Install from the committed native dependency lock');
const checkIdentity=await contentHash({version:7,upstream,dependencyLockHash,
  responseProfile,
  harnessHash:createHash('sha256').update(await readFile('tests/native-jingo-acceptance.ts')).digest('hex'),
  producerHash:createHash('sha256').update(await readFile('apps/cli/project-functional.ts')).digest('hex'),
  cookieAccessProducerHash:createHash('sha256').update(await readFile('apps/cli/project-cookie-access.ts')).digest('hex'),
  scriptFunctionProducerHash:createHash('sha256').update(await readFile('apps/cli/project-script-function.ts')).digest('hex'),
  metaPolicyProducerHash:createHash('sha256').update(await readFile('apps/cli/project-meta-policy.ts')).digest('hex'),
  collectorHash:createHash('sha256').update(await readFile('apps/cli/project-scanner.ts')).digest('hex'),
  resourceObserverHash:createHash('sha256').update(await readFile('apps/cli/project-resource-function.ts')).digest('hex'),
  redirectGuardHash:createHash('sha256').update(await readFile('apps/cli/project-redirect-guard.ts')).digest('hex'),
  framePolicyHash:createHash('sha256').update(await readFile('apps/cli/project-frame-policy.ts')).digest('hex'),
  frameScopeHash:createHash('sha256').update(await readFile('packages/core/frame-policy-scope.ts')).digest('hex'),
  assessmentHash:createHash('sha256').update(await readFile('packages/core/project-evidence.ts')).digest('hex'),
  inspectionHash:createHash('sha256').update(await readFile('apps/server/project-inspection.ts')).digest('hex'),
  policyProducerHash:createHash('sha256').update(await readFile('packages/ml/project-policy-facts.ts')).digest('hex'),
  framingProducerHash:createHash('sha256').update(await readFile('apps/cli/project-framing.ts')).digest('hex'),
  crossSiteProducerHash:createHash('sha256').update(await readFile('apps/cli/project-cross-site.ts')).digest('hex'),
  transportHash:createHash('sha256').update(await readFile('apps/cli/project-loopback-transport.ts')).digest('hex'),
  flow:'native-local-login-protected-form-and-create-page'});
const root=await mkdtemp(join(parent,'native-jingo-run-')),wiki=join(root,'wiki');
let child:ChildProcess|undefined,stage='setup',measurement:CookieDependencyMeasurement|undefined,sensitiveActionVerified=false,startupDiagnostic='';
let proxy:ReturnType<typeof createHttpServer>|undefined;
let anonymousWriteStatus:number|undefined,anonymousWriteDenied=false;
let cookieAccess:CookieAccessMeasurement|undefined;
let scriptFunction:ScriptMeasurement|undefined;
let framing:FramingMeasurement|undefined;
let crossSite:Awaited<ReturnType<typeof measureCrossSite>>|undefined;
const crossSiteOperations:Record<string,Awaited<ReturnType<typeof measureCrossSite>>>={};
const revertReadbacks:Record<string,{workingTreeRestored:boolean;indexRestored:boolean;commitChanged:boolean}>={};
let result:Record<string,unknown>|undefined;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
try{
  await mkdir(wiki);await mkdir(join(root,'empty-hooks'));await git(['init','-q','-b','master'],wiki);await git(['config','core.hooksPath',join(root,'empty-hooks')],wiki);await git(['config','commit.gpgsign','false'],wiki);await git(['config','user.name','VYLNT disposable fixture'],wiki);await git(['config','user.email','fixture@example.invalid'],wiki);
  await git(['config','core.autocrlf','false'],wiki);await git(['config','core.safecrlf','false'],wiki);
  await writeFile(join(wiki,'Home.md'),'# Local native application fixture\n');await git(['add','Home.md'],wiki);await git(['commit','-qm','disposable local wiki'],wiki);
  const portServer=createServer();await new Promise<void>(done=>portServer.listen(0,'127.0.0.1',done));const port=(portServer.address() as {port:number}).port;await new Promise<void>(done=>portServer.close(()=>done()));
  let origin=`http://127.0.0.1:${port}`;const username='vylnt-disposable',password=randomBytes(24).toString('hex');
  const config={application:{repository:wiki,remote:'',pushInterval:0,secret:randomBytes(32).toString('hex'),loggingMode:0},
    server:{hostname:'127.0.0.1',port,localOnly:false},features:{gravatar:false,codemirror:true,markitup:false},
    authentication:{google:{enabled:false},github:{enabled:false},ldap:{enabled:false},alone:{enabled:false},local:{enabled:true,accounts:[{username,passwordHash:createHash('sha1').update(password).digest('hex'),email:'fixture@example.invalid'}]}},
    authorization:{anonRead:true,validMatches:'.+',emptyEmailMatches:false},pages:{title:{fromFilename:true,fromContent:true}}};
  const configPath=join(root,'config.json');await writeFile(configPath,JSON.stringify(config),{mode:0o600});
  child=spawn(process.execPath,['jingo','-c',configPath],{cwd:source,env:{...env,NW_ADDR:'127.0.0.1',NODE_ENV:'test'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  const capture=(chunk:Buffer)=>{if(startupDiagnostic.length<8192)startupDiagnostic+=chunk.toString().slice(0,8192-startupDiagnostic.length);};
  child.stdout?.on('data',capture);child.stderr?.on('data',capture);
  let startupError=false;child.on('error',()=>{startupError=true;});
  stage='native application startup';const deadline=Date.now()+45000;
  while(true){cancel.signal.throwIfAborted();if(startupError||child.exitCode!==null)throw Error('Native process exited');try{const r=await fetch(origin+'/favicon.ico',{signal:AbortSignal.any([cancel.signal,AbortSignal.timeout(3000)])});if(r.ok)break;}catch{}if(Date.now()>deadline)throw Error('Startup timeout');await new Promise(done=>setTimeout(done,100));}
  if(readableCookies||crossSiteCookies){
    // Controlled response-attribute scenario. Application/authentication code is
    // unchanged. This is still the same upstream family, never a new family.
    proxy=createHttpServer((incoming,outgoing)=>{
      const upstreamRequest=requestHttp({hostname:'127.0.0.1',port,path:incoming.url,method:incoming.method,headers:{...incoming.headers,host:`127.0.0.1:${port}`},agent:false},response=>{
        const headers={...response.headers};if(headers['set-cookie'])headers['set-cookie']=headers['set-cookie'].map(value=>{
          if(readableCookies)return value.replace(/;\s*httponly\s*(?=;|$)/gi,'');
          return value.replace(/;\s*samesite\s*=[^;]*/gi,'').replace(/;\s*secure\s*(?=;|$)/gi,'')+'; SameSite=None; Secure';
        });
        outgoing.writeHead(response.statusCode??502,headers);response.pipe(outgoing);response.on('error',()=>outgoing.destroy());
      });
      upstreamRequest.setTimeout(10000,()=>upstreamRequest.destroy());upstreamRequest.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});
      incoming.on('aborted',()=>upstreamRequest.destroy());outgoing.on('close',()=>upstreamRequest.destroy());incoming.pipe(upstreamRequest);
    });
    await new Promise<void>(done=>proxy!.listen(0,'127.0.0.1',done));origin='http://127.0.0.1:'+(proxy.address() as {port:number}).port;
  }
  if(process.connected)process.send?.({type:'native-ready',root,pid:child.pid});
  const abort=AbortSignal.any([cancel.signal,AbortSignal.timeout(180000)]);
  stage='native login and cookie dependency';
  const collected=await scanProjectPage(origin+'/pages/new',{allowedLocalOrigins:[origin],requireComplete:true,signal:abort,channel,hooks:{
    prepare:async page=>{
      await page.goto(origin+'/login');await page.locator('input[name="username"]').fill(username);await page.locator('input[name="password"]').fill(password);
      await Promise.all([page.waitForURL(url=>!url.pathname.startsWith('/login')),page.locator('form[action="/login"] button[type="submit"]').click()]);
      await page.goto(origin+'/pages/new');assert.equal(new URL(page.url()).pathname,'/pages/new');await page.locator('form[action="/pages"] input[name="pageTitle"]').waitFor();
    },
    collected:async(page,context,report)=>{
      measurement=await measureAuthenticationCookies(context,report,{identityHash:checkIdentity,check:async page=>{
        await page.route(url=>url.origin==='https://fonts.googleapis.com'&&url.pathname==='/css'&&url.searchParams.size===1&&url.searchParams.get('family')==='Ubuntu|Ubuntu Condensed',route=>route.fulfill({contentType:'text/css',body:'/* Controlled offline font fallback. */'}));
        const response=await page.goto(origin+'/pages/new');if(!response||response.status()!==200)return 'unknown';
        if(new URL(page.url()).pathname==='/login'&&await page.locator('form[action="/login"]').count()===1)return 'anonymous';
        if(new URL(page.url()).pathname==='/pages/new'&&await page.locator('form[action="/pages"] input[name="pageTitle"]').count()===1)return 'authenticated';
        return 'unknown';
      }},abort);
      stage='native editor HttpOnly intervention';
      cookieAccess=await measureCookieJavaScriptAccess(context,report,{identityHash:checkIdentity,check:async p=>{
        // The pinned layout requests this cosmetic font. Keep the native editor
        // entirely local, with an explicitly recorded empty stylesheet in all
        // three phases; never substitute authentication or application scripts.
        await p.route(url=>url.origin==='https://fonts.googleapis.com'&&url.pathname==='/css'&&url.searchParams.size===1&&url.searchParams.get('family')==='Ubuntu|Ubuntu Condensed',route=>route.fulfill({contentType:'text/css',body:'/* Controlled offline font fallback. */'}));
        await p.goto(origin+'/pages/new');
        if(new URL(p.url()).pathname==='/login')return {authentication:'anonymous',functionality:'unknown'};
        if(new URL(p.url()).pathname!=='/pages/new'||await p.locator('form[action="/pages"] input[name="pageTitle"]').count()!==1)return {authentication:'unknown',functionality:'unknown'};
        const sample='Disposable editor interaction';
        await p.locator('.CodeMirror').click();await p.keyboard.insertText(sample);
        return {authentication:'authenticated',functionality:(await p.locator('.CodeMirror-code').innerText()).includes(sample)?'passed':'failed'};
      }},abort);
      stage='native editor script dependency and CSP compatibility';
      scriptFunction=await measureScriptFunction(context,report,{identityHash:checkIdentity,prepare:async p=>{
        await p.route(url=>url.origin==='https://fonts.googleapis.com'&&url.pathname==='/css'&&url.searchParams.size===1&&url.searchParams.get('family')==='Ubuntu|Ubuntu Condensed',route=>route.fulfill({contentType:'text/css',body:'/* Controlled offline font fallback. */'}));
      },check:async p=>{
        if(await p.locator('form[action="/pages"] input[name="pageTitle"]').count()!==1)return 'unknown';
        if(await p.locator('.CodeMirror').count()!==1)return 'failed';
        const sample='Disposable script-dependent editor operation';
        await p.locator('.CodeMirror').click();await p.keyboard.insertText(sample);
        return (await p.locator('.CodeMirror-code').innerText()).includes(sample)?'passed':'failed';
      }},abort);
      assert.equal(scriptFunction.status,'verified','Native editor script controls: '+JSON.stringify(scriptFunction.controls));
      assert.equal(scriptFunction.controls.baseline.inline,'executed','Native missing CSP must not be described as protective');
      stage='native same-origin and cross-origin embedding';
      framing=await measureFraming(context,report,{identityHash:checkIdentity,prepare:async p=>{
        await p.route(url=>url.origin==='https://fonts.googleapis.com'&&url.pathname==='/css'&&url.searchParams.size===1&&url.searchParams.get('family')==='Ubuntu|Ubuntu Condensed',route=>route.fulfill({contentType:'text/css',body:'/* Controlled offline font fallback. */'}));
      },check:async frame=>await frame.locator('form[action="/pages"] input[name="pageTitle"]').count()===1},abort);
      assert.equal(framing.coverage,'complete','Native framing controls: '+JSON.stringify(framing));
      assert.equal(framing.sameOrigin,'embedded');assert.equal(framing.crossOrigin,'embedded');
      stage='native distinct-site POST and disposable mutation observation';
      let priorFiles:string[]=[],priorHead='',operation=0;
      const syntheticBody='Disposable cross-site native operation.';
      crossSite=await measureCrossSite(context,report,{identityHash:checkIdentity,path:'/pages',cookieName:'JingoSession',prepare:async()=>{
        priorFiles=(await git(['ls-files'],wiki)).split('\n');
        priorHead=await git(['rev-parse','HEAD'],wiki);
        return {pageTitle:'VYLNT-site-probe-'+(++operation),content:syntheticBody};
      },observe:async()=>{
        const added=(await git(['ls-files'],wiki)).split('\n').filter(name=>!priorFiles.includes(name));
        const afterHead=await git(['rev-parse','HEAD'],wiki);
        if(!added.length&&afterHead===priorHead)return 'unchanged';
        if(added.length===1&&afterHead!==priorHead&&(await readFile(join(wiki,added[0]),'utf8')).includes(syntheticBody))return 'changed';
        return 'unknown';
      }},abort);
      assert.equal(crossSite.controls.sameSite.outcome,'changed-with-cookie','Same-site native write must work: '+JSON.stringify(crossSite.controls));
      assert.equal(crossSite.routeCoverage,'partial');
      if(crossSiteCookies){assert.equal(crossSite.controls.crossSite.outcome,'changed-with-cookie',JSON.stringify(crossSite.controls));assert.equal(crossSite.controls.repeated.outcome,'changed-with-cookie');}
      assert.ok(!Object.values(crossSite.controls).some(control=>control.status===500&&control.outcome!=='unknown'));
      crossSiteOperations.create=crossSite;
      for(const method of ['PUT','DELETE'] as const){
        stage='native '+method+' override and independent committed-state checks';
        const name='routeprobe',file=join(wiki,name+'.md'),baseline='# routeprobe\nDisposable original state.\n',changed='Disposable changed state.';
        let beforeHead='';
        const observation=await measureCrossSite(context,report,{identityHash:checkIdentity,path:'/pages/'+name,cookieName:'JingoSession',effectiveMethod:method,prepare:async()=>{
          // Reset only this known file inside the checked disposable wiki.
          await writeFile(file,baseline);await git(['add','--',name+'.md'],wiki);await git(['commit','--allow-empty','-qm','reset disposable route state'],wiki);
          beforeHead=await git(['rev-parse','HEAD'],wiki);
          return {_method:method,pageTitle:name,content:changed,message:'disposable operation'};
        },observe:async()=>{
          const afterHead=await git(['rev-parse','HEAD'],wiki);
          const files=(await git(['ls-files'],wiki)).split('\n');
          if(method==='DELETE'&&!files.includes(name+'.md')){
            const absent=await lstat(file).then(()=>false,(error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return true;throw error;});
            return absent&&afterHead!==beforeHead?'changed':'unknown';
          }
          const text=await readFile(file,'utf8');
          if(text===baseline&&afterHead===beforeHead)return 'unchanged';
          if(method==='PUT'&&text.trim()==='# '+name+'\n'+changed&&afterHead!==beforeHead)return 'changed';
          return 'unknown';
        }},abort);
        crossSiteOperations[method.toLowerCase()]=observation;
        assert.equal(observation.controls.sameSite.outcome,'changed-with-cookie','Native '+method+' positive control: '+JSON.stringify(observation.controls));
        if(crossSiteCookies){assert.equal(observation.controls.crossSite.outcome,'changed-with-cookie','Native '+method+' cross-site: '+JSON.stringify(observation.controls));assert.equal(observation.controls.repeated.outcome,'changed-with-cookie');}
        assert.equal(observation.routeCoverage,'partial');crossSiteOperations[method.toLowerCase()]=observation;
      }
      stage='native explicit mutating GET revert';
      const revertName='getrevert',revertFile=join(wiki,revertName+'.md');
      const originalRevision='# getrevert\nOriginal disposable revision.\n',currentRevision='# getrevert\nCurrent disposable revision.\n';
      await writeFile(revertFile,originalRevision);await git(['add','--',revertName+'.md'],wiki);await git(['commit','--allow-empty','-qm','seed disposable revert anchor'],wiki);
      const anchor=await git(['rev-parse','HEAD'],wiki);let revertBefore='';
      const revert=await measureCrossSite(context,report,{identityHash:checkIdentity,path:'/pages/'+revertName+'/revert/'+anchor,cookieName:'JingoSession',wireMethod:'GET',effectiveMethod:'GET',prepare:async()=>{
        await writeFile(revertFile,currentRevision);await git(['add','--',revertName+'.md'],wiki);await git(['commit','--allow-empty','-qm','reset disposable current revision'],wiki);
        revertBefore=await git(['rev-parse','HEAD'],wiki);return {};
      },observe:async phase=>{
        // The pinned handler redirects before its asynchronous revert commits.
        const deadline=Date.now()+(phase==='anonymous'?500:5000);
        do{
          const text=await readFile(revertFile,'utf8'),head=await git(['rev-parse','HEAD'],wiki),index=await git(['show',':'+revertName+'.md'],wiki);
          const readback={workingTreeRestored:text===originalRevision,indexRestored:index===originalRevision.trim(),commitChanged:head!==revertBefore};
          revertReadbacks[phase]=readback;
          if(readback.workingTreeRestored&&readback.indexRestored&&readback.commitChanged)return 'changed';
          if(Date.now()>=deadline){
            return text===currentRevision&&index===currentRevision.trim()&&head===revertBefore?'unchanged':'unknown';
          }
          await new Promise(done=>setTimeout(done,100));
        }while(true);
      }},abort);
      crossSiteOperations.revert=revert;
      for(const [phase,control] of [['same-site',revert.controls.sameSite],['cross-site',revert.controls.crossSite],['repeated',revert.controls.repeated]] as const){
        const readback=revertReadbacks[phase];
        assert.ok(readback.workingTreeRestored&&readback.indexRestored,'Native GET must restore the disposable file/index');
        // A partial restore is a real side effect, but not a completed committed
        // revert. Retain that distinction rather than relaxing the oracle.
        assert.equal(control.outcome,readback.commitChanged?'changed-with-cookie':'unknown');
        assert.equal(control.initiatorVerified,true);assert.equal(control.cookieSent,true);
      }
      assert.equal(revert.controls.anonymous.state,'unchanged');assert.equal(revert.controls.anonymous.outcome,'unknown');
      assert.equal(revert.routeCoverage,'partial');
      stage='native authenticated write and anonymous denial';
      const before=await git(['ls-files'],wiki),body='Disposable native write acceptance.';
      const rejected=await fetch(origin+'/pages',{method:'POST',body:new URLSearchParams({pageTitle:'VYLNT-native-write',content:body}),redirect:'manual',signal:AbortSignal.timeout(10000)});
      anonymousWriteStatus=rejected.status;
      anonymousWriteDenied=rejected.status===302&&rejected.headers.get('location')==='/login';
      assert.equal(await git(['ls-files'],wiki),before,'Anonymous attempt must not modify the disposable wiki');
      await rejected.body?.cancel();
      stage='native editor interaction';
      await page.locator('input[name="pageTitle"]').fill('VYLNT-native-write');await page.locator('.CodeMirror').click();await page.keyboard.insertText(body);
      assert.ok((await page.locator('.CodeMirror-code').innerText()).includes(body),'Native editor must receive the synthetic text');
      stage='native save and readback';
      const [saved]=await Promise.all([page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/pages'),page.locator('form[action="/pages"] input[type="submit"]').click()]);
      stage=`native save response ${saved.status()}`;assert.equal(saved.status(),302);await page.waitForURL(url=>url.pathname.startsWith('/wiki/'));
      stage='native write file readback';
      const added=(await git(['ls-files'],wiki)).split('\n').filter(name=>!before.split('\n').includes(name));
      stage=`native write added-file count ${added.length}`;assert.equal(added.length,1);
      const created=(await readFile(join(wiki,added[0]),'utf8')).trim(),expected='# VYLNT-native-write\n'+body;
      stage=`native write content length ${created.length} (expected ${expected.length})`;assert.equal(created,expected);
      // An error response is not evidence of intentional authorization enforcement.
      sensitiveActionVerified=anonymousWriteDenied;
    }
  }});
  assert.ok(measurement&&measurement.targets.length>0,'At least one actual native session dependency must be observed');
  assert.ok(measurement.targets.every(t=>t.facts.cookieAuthDependency.value===true));
  if(readableCookies)assert.ok(collected.report.findings.some(f=>f.ruleId==='CK-002'),'Controlled readable-cookie response must produce actual HttpOnly observations');
  stage='same-run provenance and privacy';
  let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:upstream,configHash:await contentHash({scope:'disposable-local-native-login',anonymousRead:true,cookieAccessOfflineFontFallback:true,readableCookieResponseControl:readableCookies,crossSiteCookieResponseControl:crossSiteCookies}),adapterHash:checkIdentity},false);
  evidence=mergeAuthenticationRole(evidence,measurement);
  const inspection=await inspectProject({app:source,checkout:source,commit:upstream,configHash:evidence.configHash,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'native',routes:['/pages/new']}),signal:abort});evidence.inspection=inspection;
  assert.equal(evidence.inspection.framework,'express','The pinned explicit initializer should be recognized');
  assert.equal(evidence.inspection.coverage,'partial','Recognition must not manufacture complete source coverage');
  assert.ok(cookieAccess&&cookieAccess.targets.length>0,'Native editor needs complete HttpOnly controls: '+JSON.stringify(cookieAccess?.checks.map(({baseline,restricted,restored})=>({baseline,restricted,restored}))));
  assert.ok(cookieAccess.targets.every(t=>!t.facts.cookieJsAccessRequired.value),'The supported native editor must work with HttpOnly');
  evidence=mergeCookieAccess(evidence,cookieAccess);
  const nativeContexts=prepareProjectContexts(collected.report,evidence),authenticationInputs:Record<string,{complete:number;review:number}>={};
  for(const category of ['CK-001','CK-002']){
    const findings=collected.report.findings.filter(f=>f.ruleId===category&&evidence.targets.some(t=>t.findingId===f.id&&t.facts.cookieAuthDependency?.value===true));
    authenticationInputs[category]={complete:0,review:0};
    for(const finding of findings){const context=nativeContexts(finding);authenticationInputs[category][context.requiresReview?'review':'complete']++;
      assert.equal(guardProjectAssessment(context,{...finding,severity:'low'},'contextual'),'needs-review');}
  }
  assert.ok(authenticationInputs['CK-001'].complete>0,'Native Secure-cookie authentication evidence must be complete in its scoped positive inputs');
  if(readableCookies)assert.ok(authenticationInputs['CK-002'].complete>0,'Readable native session controls must supply positive HttpOnly inputs');
  assert.ok(scriptFunction);evidence=mergeScriptFunction(evidence,scriptFunction);
  assert.equal(evidence.targets.find(t=>t.category==='HDR-003')?.facts.cspProbeAllowed?.value,true);
  assert.equal(evidence.targets.find(t=>t.category==='HDR-003')?.facts.cspProbeBlocked?.value,false);
  if(sensitiveActionVerified)for(const target of evidence.targets.filter(t=>t.category==='HDR-002'))target.facts.sensitiveActionVerified={value:true,source:'functional',coverage:'complete',witnessHash:await contentHash({checkIdentity,scope:'native-pages-create-form',anonymousDenied:true,authenticatedWriteVerified:true})};
  const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
  assert.ok(await verifyProjectEvidence(seal,collected.report,signer.trustedKeys));
  const serialized=JSON.stringify({report:collected.report,seal});
  assert.ok(!serialized.includes(password)&&!serialized.includes(config.application.secret)&&!serialized.includes(username));
  result={version:1,completedAt:new Date().toISOString(),channel,responseProfile,source:{repository:'claudioc/jingo',revision:upstream,dependencyLockHash},passed:true,eligibleForTraining:false,modelEvaluated:false,
    checks:['native local login','protected form positive control','anonymous negative control','cookie removal and restoration','native authenticated write','anonymous write outcome retained without assuming enforcement','same-run signed evidence','credential exclusion'],
    anonymousWriteStatus,anonymousWriteDenied,writePolicyAssessment:sensitiveActionVerified?'scoped-control-observed':'needs-review',
    cookieAccessChecks:cookieAccess.checks.map(({baseline,restricted,restored})=>({baseline,restricted,restored})),
    cookieAccessScope:'Protected new-page editor interaction with offline font CSS fallback only; other application flows remain unverified.',
    scriptFunctionControls:scriptFunction.controls,
    framing,
    crossSite,
    crossSiteOperations,
    revertReadbacks,
    revertScope:'Working-tree/index restore observed separately from a completed committed revert. Partial completion remains unknown; other routes and cross-site necessity are unverified.',
    scriptFunctionScope:'Native editor normal/JavaScript-disabled/restored interaction and unapproved inline probe. Offline font CSS fallback only. No CSP protection inferred.',
    findingCount:collected.report.findings.length,authDependencyTargets:measurement.targets.length,cookieAccessTargets:cookieAccess.targets.length,
    authenticationInputs,sourceInspection:{framework:inspection.framework,coverage:inspection.coverage,sourceCount:inspection.sourceHashes.length},
    scope:'One native development prototype. No contextual class, dataset eligibility, model training or qualification claimed.'};
}catch(error){
  // Emit only a known failure classification, never application output/configuration.
  const kind=['EADDRINUSE','EACCES','ENOENT','Cannot find module','SyntaxError','TypeError','ReferenceError','Invalid configuration','Cannot run git',"doesn't look as git",'Unrecognized git semver','Bad repository path','Bad document subdirectory','Unrecognized configuration','Unrecognized section','No authentication method','Missing `application`','Starting with Jingo'].find(code=>startupDiagnostic.includes(code))??'unclassified';
  const knownFailures=['The pinned explicit initializer should be recognized','Recognition must not manufacture complete source coverage','Native Secure-cookie authentication evidence must be complete in its scoped positive inputs','Readable native session controls must supply positive HttpOnly inputs','Native producer receipt missing or changed','Native measurement does not match the scan or adapter'];
  const failure=error instanceof Error?knownFailures.find(message=>error.message.startsWith(message)):undefined;
  const controls=stage==='same-run provenance and privacy'?JSON.stringify({failure:failure??'unclassified',cookieAccess:cookieAccess?.checks.map(({baseline,restricted,restored})=>({baseline,restricted,restored}))}):'';
  const crossDiagnostic=stage.includes('override and independent')||stage==='native explicit mutating GET revert'?JSON.stringify(crossSiteOperations):stage==='native distinct-site POST and disposable mutation observation'?JSON.stringify(crossSite?.controls??{reason:error instanceof Error&&['Cross-site cookie matching is incomplete','Cross-site cookie metadata changed'].includes(error.message)?error.message:'unclassified'}):'';
  throw Error('Native Jingo acceptance failed during '+stage+(stage==='native application startup'?` (${kind}; exit ${child?.exitCode})`:'')+(controls?' controls='+controls:'')+(crossDiagnostic?' controls='+crossDiagnostic:''));
}
finally{
  if(proxy){proxy.closeAllConnections();await new Promise<void>(done=>proxy!.close(()=>done()));}
  if(child?.pid&&child.exitCode===null){if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});else child.kill('SIGKILL');}
  const checked=await realpath(root),actualParent=await realpath(parent),workspace=await realpath(process.cwd());
  if(!actualParent.startsWith(workspace+sep)||!checked.startsWith(actualParent+sep))throw Error('Unexpected native fixture cleanup path');await rm(checked,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  process.removeListener('SIGINT',onInterrupt);process.removeListener('SIGTERM',onInterrupt);process.removeListener('message',onMessage);if(process.connected)process.disconnect();
}
await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/jingo-${channel}${readableCookies?'-readable-cookies':crossSiteCookies?'-cross-site-cookies':''}.json`,JSON.stringify({...result,cleanupCompleted:true},null,2));
console.log(`Native Jingo login/session dependency acceptance passed. Anonymous write response: ${anonymousWriteStatus}; write-policy assessment: ${sensitiveActionVerified?'scoped-control-observed':'needs-review'}. No category qualified.`);

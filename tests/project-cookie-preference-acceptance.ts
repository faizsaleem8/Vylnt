import assert from 'node:assert/strict';
import { spawn,execFile,type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes,randomUUID,createHash } from 'node:crypto';
import { readFile,writeFile,mkdir,mkdtemp,symlink,rm,realpath } from 'node:fs/promises';
import { resolve,join,dirname,sep } from 'node:path';
import { createServer } from 'node:net';
import { scanProjectPage } from '../apps/cli/project-scanner';
import type { CookieDependencyMeasurement } from '../apps/cli/project-functional';
import { measureCookieJavaScriptAccess,mergeCookieAccess,type CookieAccessMeasurement,type NativeCookieAccessCheck } from '../apps/cli/project-cookie-access';
import { verifyPreferenceSource,measureCookiePreference,mergeCookiePreference,type PreferenceMeasurement } from '../apps/cli/project-cookie-preference';
import { inspectProject } from '../apps/server/project-inspection';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { contentHash,canonicalJson } from '../packages/core/integrity';
import { prepareProjectContexts,guardProjectAssessment,verifyProjectEvidence } from '../packages/core/project-evidence';
import { gateConfigSchema } from '../apps/cli/gate-config';
import { ProjectSigner } from '../apps/server/project-signing';

const execute=promisify(execFile),workspace=await realpath(resolve('.')),parent=join(workspace,'.local');
await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'cookie-purpose-run-'));
const controller=new AbortController(),interrupt=()=>controller.abort();
const message=(value:unknown)=>{if(value&&typeof value==='object'&&'type' in value&&value.type==='cancel')interrupt();};
process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);process.on('message',message);
const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('GIT_'))delete env[key];
const git=async(args:string[])=>(await execute('git',args,{cwd:root,env,windowsHide:true,timeout:10000,signal:controller.signal})).stdout.trim();
const files=['labs/ml-cookie-purpose/server.mjs','labs/ml-cookie-purpose/client.js','package-lock.json'];
let child:ChildProcess|undefined,stage='fixture setup',output:Record<string,unknown>|undefined;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
try{
  for(const path of files){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),await readFile(join(workspace,path)));}
  await writeFile(join(root,'package.json'),JSON.stringify({name:'vylnt-cookie-purpose-reference',private:true,type:'module'}));
  await symlink(join(workspace,'node_modules'),join(root,'node_modules'),process.platform==='win32'?'junction':'dir');
  await mkdir(join(root,'empty-hooks'));await git(['init','-q','-b','main']);
  for(const [key,value] of [['user.name','VYLNT disposable fixture'],['user.email','fixture@example.invalid'],['core.hooksPath',join(root,'empty-hooks')],['commit.gpgsign','false'],['core.autocrlf','false']])await git(['config',key,value]);
  await git(['add','--',...files,'package.json']);await git(['commit','-qm','controlled preference reference']);
  const profile=await verifyPreferenceSource(root,'vylnt-reference-layout-v1',controller.signal);
  const portServer=createServer();await new Promise<void>(done=>portServer.listen(0,'127.0.0.1',done));const port=(portServer.address() as {port:number}).port;await new Promise<void>(done=>portServer.close(()=>done()));
  const origin='http://127.0.0.1:'+port,user='fixture-'+randomUUID(),password=randomBytes(24).toString('hex'),instance=randomBytes(24).toString('hex');
  const appEnv=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE'].filter(key=>env[key]!==undefined).map(key=>[key,env[key]]));
  child=spawn(process.execPath,[join(root,files[0])],{cwd:root,env:{...appEnv,VYLNT_COOKIE_REFERENCE:'local',VYLNT_REFERENCE_USER:user,VYLNT_REFERENCE_PASSWORD:password,VYLNT_REFERENCE_RUN:instance,VYLNT_REFERENCE_HTTPONLY:'false',PORT:String(port)},stdio:'ignore',windowsHide:true});
  let failedStart=false;child.on('error',()=>{failedStart=true;});stage='reference startup';const deadline=Date.now()+20000;
  while(true){controller.signal.throwIfAborted();if(failedStart||child.exitCode!==null)throw Error('Reference startup failed');try{const response=await fetch(origin+'/ready',{signal:AbortSignal.timeout(1000)});if(response.ok&&response.headers.get('x-vylnt-reference-instance')===instance)break;}catch{}if(Date.now()>deadline)throw Error('Reference readiness timeout');await new Promise(done=>setTimeout(done,100));}
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(180000)]);
  const identityHash=await contentHash({version:1,profile:profile.proofHash,
    harness:createHash('sha256').update(await readFile('tests/project-cookie-preference-acceptance.ts')).digest('hex'),
    producer:createHash('sha256').update(await readFile('apps/cli/project-cookie-preference.ts')).digest('hex'),
    accessProducer:createHash('sha256').update(await readFile('apps/cli/project-cookie-access.ts')).digest('hex')});
  const check:NativeCookieAccessCheck={identityHash,check:async page=>{
    if(process.connected)process.send?.({type:'preference-control-started',root,pid:child?.pid});
    await page.goto(origin);await page.locator('html[data-ready="true"]').waitFor({state:'attached'});
    const density=await page.locator('html').getAttribute('data-density');
    const status=await page.evaluate(async()=> (await fetch('/api/protected',{cache:'no-store'})).status);
    return {authentication:status===200?'authenticated':status===401?'anonymous':'unknown',
      protectedStatus:status===200?200:status===401?401:'unknown',preference:density==='comfortable'?'first':density==='compact'?'second':'unknown',
      functionality:density==='comfortable'||density==='compact'?'passed':'unknown'};
  }};
  let purpose:PreferenceMeasurement|undefined,access:CookieAccessMeasurement|undefined,authentication:CookieDependencyMeasurement|undefined;
  stage='source-backed preference and authentication controls';
  const {report}=await scanProjectPage(origin,{allowedLocalOrigins:[origin],channel,signal,hooks:{prepare:async(page,context)=>{
    const login=await context.request.post(origin+'/api/login',{data:{user,password}});assert.equal(login.status(),200);
    await page.goto(origin);await page.locator('#density').selectOption('compact');
  },collected:async(_page,context,scan)=>{
    const before=canonicalJson(await context.cookies());
    purpose=await measureCookiePreference(context,scan,check,profile,signal);
    if(purpose.status!=='verified')console.error(JSON.stringify({status:purpose.status,controls:purpose.controls,authenticationTargets:purpose.authentication?.targets.length}));
    assert.equal(purpose.status,'verified','Preference controls must establish the scoped role');
    const errors=await measureCookiePreference(context,scan,{identityHash:await contentHash({identityHash,control:'unavailable-protected-operation'}),check:async page=>{
      await page.route(origin+'/api/protected',route=>route.fulfill({status:500,contentType:'application/json',body:'{}'}));
      return check.check(page);
    }},profile,signal);
    assert.equal(errors.status,'needs-review');assert.equal(errors.targets.length,0,'HTTP errors cannot establish protected-route coverage');
    authentication=purpose.authentication;
    access=await measureCookieJavaScriptAccess(context,scan,{identityHash,check:async page=>{
      const result=await check.check(page);return {...result,functionality:result.preference==='second'?'passed':'failed'};
    }},signal);
    assert.ok(canonicalJson(await context.cookies())===before,'The source browser cookie state must stay unchanged');
    const secrets=[user,password,instance,...(await context.cookies()).map(c=>c.value)];
    const serialized=JSON.stringify({purpose,access,authentication});assert.ok(secrets.every(value=>!serialized.includes(value)),'Producer outputs must exclude credentials and values');
  }}});
  assert.ok(purpose&&access&&authentication);assert.equal(purpose.targets.filter(t=>t.facts.cookiePreferenceVerified.value).length,2);
  stage='same-run evidence and conservative assessments';
  const config=gateConfigSchema.parse({version:1,directory:'.',startScript:'reference',routes:['/']});
  const configHash=await contentHash({profile:profile.id,entry:files[0],routes:['/'],authentication:'disposable-synthetic',authenticationHttpOnly:false});
  let evidence=await collectResponseFacts(report,{runId:randomUUID(),commit:profile.commit,configHash,adapterHash:identityHash},false);
  evidence.inspection=await inspectProject({checkout:root,app:root,config,commit:profile.commit,configHash,signal});
  assert.equal(evidence.inspection.coverage,'complete');assert.equal(evidence.inspection.framework,'express');
  evidence=mergeCookiePreference(evidence,purpose);evidence=mergeCookieAccess(evidence,access);
  assert.equal(evidence.collectionKind,'mechanism-fixture');
  const finding=report.findings.find(f=>f.ruleId==='CK-002'&&f.evidence.cookieName===profile.cookieName)!;
  const context=prepareProjectContexts(report,evidence)(finding);assert.equal(context.requiresReview,false);assert.equal(context.projectFacts.cookiePreferenceVerified,true);
  assert.equal(context.projectFacts.cookieAuthDependency,false);assert.equal(context.projectFacts.cookieJsAccessRequired,true);
  assert.equal(guardProjectAssessment(context,finding,'contextual'),'contextual','Future safeguard permits this supported preference case; no model decision is made');
  const authenticationFinding=report.findings.find(f=>f.ruleId==='CK-002'&&f.evidence.cookieName===profile.authenticationCookieName)!;
  const authenticationContext=prepareProjectContexts(report,evidence)(authenticationFinding);
  assert.equal(authenticationContext.requiresReview,false);assert.equal(authenticationContext.projectFacts.cookieAuthDependency,true);
  assert.equal(authenticationContext.projectFacts.cookiePreferenceVerified,false);assert.equal(authenticationContext.projectFacts.cookieJsAccessRequired,false);
  assert.notEqual(canonicalJson(authenticationContext.sequence),canonicalJson(context.sequence),'The two cookie roles must have distinguishable numeric evidence');
  assert.equal(guardProjectAssessment(authenticationContext,authenticationFinding,'change-warranted'),'change-warranted');
  assert.equal(guardProjectAssessment(authenticationContext,authenticationFinding,'contextual'),'needs-review');
  const high=report.findings.find(f=>f.ruleId==='CK-001'&&f.evidence.cookieName===profile.cookieName)!;
  assert.equal(guardProjectAssessment(prepareProjectContexts(report,evidence)(high),high,'contextual'),'needs-review');
  const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);assert.ok(await verifyProjectEvidence(seal,report,signer.trustedKeys));
  assert.throws(()=>mergeCookiePreference(evidence,JSON.parse(JSON.stringify(purpose))),/receipt/);
  const witness=purpose.targets[0].facts.cookiePreferenceVerified.witnessHash;purpose.targets[0].facts.cookiePreferenceVerified.witnessHash='a'.repeat(64);
  assert.throws(()=>mergeCookiePreference(evidence,purpose!),/receipt/);purpose.targets[0].facts.cookiePreferenceVerified.witnessHash=witness;
  assert.throws(()=>mergeCookiePreference({...evidence,commit:'a'.repeat(40)},purpose!),/binding/);
  const changed=structuredClone(evidence);changed.inspection!.sourceHashes=['a'.repeat(64)];assert.throws(()=>mergeCookiePreference(changed,purpose!),/binding/);
  stage='source tampering and stale profile';
  const client=await readFile(join(root,files[1]),'utf8'),serverSource=await readFile(join(root,files[0]),'utf8');
  await git(['config','core.autocrlf','true']);
  await writeFile(join(root,files[1]),client.replace(/\r?\n/g,'\r\n'));await writeFile(join(root,files[0]),serverSource.replace(/\r?\n/g,'\r\n'));
  const equivalent=await verifyPreferenceSource(root,profile.id,signal);assert.notEqual(canonicalJson(equivalent.sourceHashes),canonicalJson(profile.sourceHashes),'Record the executed source bytes even when reviewed LF-normalized code is equivalent');
  await assert.rejects(measureCookiePreference({} as never,report,check,profile,signal),/stale/);
  await writeFile(join(root,files[1]),(await readFile(join(root,files[1]),'utf8'))+'\n// changed\n');
  await assert.rejects(verifyPreferenceSource(root,profile.id));
  await assert.rejects(measureCookiePreference({} as never,report,check,profile,signal));
  output={passed:true,channel,role:'controlled-mechanism-reference-only',sourceProfile:profile.id,sourceProofHash:profile.proofHash,
    controls:purpose.controls,preferenceTargets:purpose.targets.filter(t=>t.facts.cookiePreferenceVerified.value).length,authenticationTargets:authentication.targets.length,
    accessTargets:access.targets.length,sourceTamperingRejected:true,forgedReceiptRejected:true,highSeverityVisible:true,
    supportedPreferenceContext:true,supportedAuthenticationChange:true,unavailableProtectionRemainsReview:true,sourceLineEndingsBound:true,
    trained:false,qualifiedCategories:0,scope:'One closed-use reference, not an independent application cohort. Proposed assessment safeguards tested without a model release.'};
}catch{throw Error('Preference acceptance failed during '+stage);}
finally{
  if(child?.pid&&child.exitCode===null){if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});else child.kill('SIGKILL');}
  const actual=await realpath(root);if(!actual.startsWith(parent+sep))throw Error('Unexpected preference cleanup path');await rm(actual,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);process.removeListener('message',message);if(process.connected)process.disconnect();
}
await mkdir('test-results/cookie-preference',{recursive:true});await writeFile(`test-results/cookie-preference/${channel}.json`,JSON.stringify({...output,cleanupCompleted:true},null,2));
console.log(`Cookie preference source/behaviour acceptance passed (${channel}). No category qualified.`);

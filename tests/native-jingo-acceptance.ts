import assert from 'node:assert/strict';
import { spawn,execFile,type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash,randomBytes,randomUUID } from 'node:crypto';
import { mkdir,mkdtemp,readFile,writeFile,rm,realpath } from 'node:fs/promises';
import { resolve,join,sep } from 'node:path';
import { createServer } from 'node:net';
import { scanProjectPage } from '../apps/cli/project-scanner';
import { measureAuthenticationCookies,mergeCookieDependency,type CookieDependencyMeasurement } from '../apps/cli/project-functional';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { ProjectSigner } from '../apps/server/project-signing';
import { verifyProjectEvidence } from '../packages/core/project-evidence';
import { contentHash } from '../packages/core/integrity';

const execute=promisify(execFile),upstream='10079c22d6cb66cfa0e7a91742c631fa0a153bd4';
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
const checkIdentity=await contentHash({version:2,upstream,dependencyLockHash,
  harnessHash:createHash('sha256').update(await readFile('tests/native-jingo-acceptance.ts')).digest('hex'),
  producerHash:createHash('sha256').update(await readFile('apps/cli/project-functional.ts')).digest('hex'),
  flow:'native-local-login-protected-form-and-create-page'});
const root=await mkdtemp(join(parent,'native-jingo-run-')),wiki=join(root,'wiki');
let child:ChildProcess|undefined,stage='setup',measurement:CookieDependencyMeasurement|undefined,sensitiveActionVerified=false,startupDiagnostic='';
let anonymousWriteStatus:number|undefined,anonymousWriteDenied=false;
let result:Record<string,unknown>|undefined;
const channel=process.env.VYLNT_TEST_BROWSER==='msedge'?'msedge':'chromium';
try{
  await mkdir(wiki);await mkdir(join(root,'empty-hooks'));await git(['init','-q','-b','master'],wiki);await git(['config','core.hooksPath',join(root,'empty-hooks')],wiki);await git(['config','commit.gpgsign','false'],wiki);await git(['config','user.name','VYLNT disposable fixture'],wiki);await git(['config','user.email','fixture@example.invalid'],wiki);
  await git(['config','core.autocrlf','false'],wiki);await git(['config','core.safecrlf','false'],wiki);
  await writeFile(join(wiki,'Home.md'),'# Local native application fixture\n');await git(['add','Home.md'],wiki);await git(['commit','-qm','disposable local wiki'],wiki);
  const portServer=createServer();await new Promise<void>(done=>portServer.listen(0,'127.0.0.1',done));const port=(portServer.address() as {port:number}).port;await new Promise<void>(done=>portServer.close(()=>done()));
  const origin=`http://127.0.0.1:${port}`,username='vylnt-disposable',password=randomBytes(24).toString('hex');
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
  if(process.connected)process.send?.({type:'native-ready',root,pid:child.pid});
  const abort=AbortSignal.any([cancel.signal,AbortSignal.timeout(120000)]);
  stage='native login and cookie dependency';
  const collected=await scanProjectPage(origin+'/pages/new',{allowedLocalOrigins:[origin],requireComplete:true,signal:abort,channel,hooks:{
    prepare:async page=>{
      await page.goto(origin+'/login');await page.locator('input[name="username"]').fill(username);await page.locator('input[name="password"]').fill(password);
      await Promise.all([page.waitForURL(url=>!url.pathname.startsWith('/login')),page.locator('form[action="/login"] button[type="submit"]').click()]);
      await page.goto(origin+'/pages/new');assert.equal(new URL(page.url()).pathname,'/pages/new');await page.locator('form[action="/pages"] input[name="pageTitle"]').waitFor();
    },
    collected:async(page,context,report)=>{
      measurement=await measureAuthenticationCookies(context,report,{identityHash:checkIdentity,check:async page=>{
        const response=await page.goto(origin+'/pages/new');if(!response||response.status()!==200)return 'unknown';
        if(new URL(page.url()).pathname==='/login'&&await page.locator('form[action="/login"]').count()===1)return 'anonymous';
        if(new URL(page.url()).pathname==='/pages/new'&&await page.locator('form[action="/pages"] input[name="pageTitle"]').count()===1)return 'authenticated';
        return 'unknown';
      }},abort);
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
  stage='same-run provenance and privacy';
  let evidence=await collectResponseFacts(collected.report,{runId:randomUUID(),commit:upstream,configHash:await contentHash({scope:'disposable-local-native-login',anonymousRead:true}),adapterHash:checkIdentity},false);
  evidence=mergeCookieDependency(evidence,measurement);
  if(sensitiveActionVerified)for(const target of evidence.targets.filter(t=>t.category==='HDR-002'))target.facts.sensitiveActionVerified={value:true,source:'functional',coverage:'complete',witnessHash:await contentHash({checkIdentity,scope:'native-pages-create-form',anonymousDenied:true,authenticatedWriteVerified:true})};
  const signer=await ProjectSigner.open(join(root,'signer')),seal=signer.seal(evidence);
  assert.ok(await verifyProjectEvidence(seal,collected.report,signer.trustedKeys));
  const serialized=JSON.stringify({report:collected.report,seal});
  assert.ok(!serialized.includes(password)&&!serialized.includes(config.application.secret)&&!serialized.includes(username));
  result={version:1,completedAt:new Date().toISOString(),channel,source:{repository:'claudioc/jingo',revision:upstream,dependencyLockHash},passed:true,eligibleForTraining:false,modelEvaluated:false,
    checks:['native local login','protected form positive control','anonymous negative control','cookie removal and restoration','native authenticated write','anonymous write outcome retained without assuming enforcement','same-run signed evidence','credential exclusion'],
    anonymousWriteStatus,anonymousWriteDenied,writePolicyAssessment:sensitiveActionVerified?'scoped-control-observed':'needs-review',
    findingCount:collected.report.findings.length,authDependencyTargets:measurement.targets.length,
    scope:'One native development prototype. No contextual class, dataset eligibility, model training or qualification claimed.'};
}catch{
  // Emit only a known failure classification, never application output/configuration.
  const kind=['EADDRINUSE','EACCES','ENOENT','Cannot find module','SyntaxError','TypeError','ReferenceError','Invalid configuration','Cannot run git',"doesn't look as git",'Unrecognized git semver','Bad repository path','Bad document subdirectory','Unrecognized configuration','Unrecognized section','No authentication method','Missing `application`','Starting with Jingo'].find(code=>startupDiagnostic.includes(code))??'unclassified';
  throw Error('Native Jingo acceptance failed during '+stage+(stage==='native application startup'?` (${kind}; exit ${child?.exitCode})`:''));
}
finally{
  if(child?.pid&&child.exitCode===null){if(process.platform==='win32')await execute('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});else child.kill('SIGKILL');}
  const checked=await realpath(root),actualParent=await realpath(parent),workspace=await realpath(process.cwd());
  if(!actualParent.startsWith(workspace+sep)||!checked.startsWith(actualParent+sep))throw Error('Unexpected native fixture cleanup path');await rm(checked,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  process.removeListener('SIGINT',onInterrupt);process.removeListener('SIGTERM',onInterrupt);process.removeListener('message',onMessage);if(process.connected)process.disconnect();
}
await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/jingo-${channel}.json`,JSON.stringify({...result,cleanupCompleted:true},null,2));
console.log(`Native Jingo login/session dependency acceptance passed. Anonymous write response: ${anonymousWriteStatus}; write-policy assessment: ${sensitiveActionVerified?'scoped-control-observed':'needs-review'}. No category qualified.`);

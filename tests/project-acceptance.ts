import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, type Browser } from 'playwright';
import express from 'express';
import { createApp } from '../apps/server/app';
import { FileStore } from '../apps/server/store';
import { ProjectService } from '../apps/server/projects';
import { verifyProjectEvidence } from '../packages/core/project-evidence';
import { freezeInsights } from '../packages/ml/frozen-insights';
import { contentHash } from '../packages/core/integrity';

process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
const channel=process.env.VYLNT_BROWSER_CHANNEL??'chromium';assert.ok(['chromium','msedge'].includes(channel));
const root=await mkdtemp(resolve('.local/project-acceptance-')),repo=join(root,'website'),journal=join(root,'journal');
const execute=promisify(execFile),git=async(args:string[])=>(await execute('git',args,{cwd:repo,windowsHide:true})).stdout.trim();
const owner={ownerId:'companion-acceptance',token:'PRIVATE_PROJECT_ACCEPTANCE_TOKEN'},store=new FileStore();
let browser:Browser|undefined,service:ProjectService|undefined,server:ReturnType<ReturnType<typeof createApp>['listen']>|undefined;
try{
  await mkdir(repo);await mkdir(join(repo,'.vynlt'));await cp('examples/security-gate-demo',join(repo,'app'),{recursive:true});
  const appSource=await readFile(join(repo,'app/server.mjs'),'utf8');
  await writeFile(join(repo,'app/server.mjs'),"if(process.env.NODE_ENV!=='test'||process.env.VYLNT_PROJECT_RUN!=='1'||!process.env.VYLNT_DATA_DIR)throw Error('Expected disposable project environment');\n"+appSource);
  await writeFile(join(repo,'app/security.json'),'{"mode":"insecure"}');
  await writeFile(join(repo,'.vynlt/gate.json'),JSON.stringify({version:1,directory:'app',buildScript:'build',startScript:'start',routes:['/','/account'],protocol:'https',ignoreHTTPSErrors:true,commandTimeoutMs:30000}));
  await git(['init','-q','-b','main']);await git(['config','user.name','VYLNT local fixture']);await git(['config','user.email','fixture@example.invalid']);await git(['add','--all']);await git(['commit','-qm','insecure committed fixture']);const commit=await git(['rev-parse','HEAD']);
  await writeFile(join(repo,'app/security.json'),'{"mode":"secure"}'); // Must not approve committed code.
  service=await ProjectService.open(journal,store);const host=express();
  server=host.listen(0,'127.0.0.1');await new Promise<void>(done=>server!.once('listening',done));const address=server.address();assert.ok(address&&typeof address!=='string');const origin=`http://127.0.0.1:${address.port}`;
  host.use(createApp({projects:service,store,mode:'local',origins:[origin],auth:{authenticate:async token=>token===owner.token?owner:undefined},dashboardDir:resolve('dist/dashboard')}));
  browser=await chromium.launch({headless:true,...(channel==='msedge'?{channel:'msedge'}:{})});const page=await browser.newPage({viewport:{width:1280,height:900}});
  const pageErrors:string[]=[];let projectPolls=0;
  page.on('pageerror',error=>{pageErrors.push(error.message);console.error('Fixture page error:',error.message);});
  page.on('request',request=>{if(new URL(request.url()).pathname==='/api/project-runs')projectPolls++;});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  assert.equal((await (await fetch(origin+'/api/config')).json()).mode,'local');
  await page.goto(origin);await page.getByRole('heading',{name:'Security observations',exact:true}).waitFor();
  await page.getByLabel('Local API token from your .env file').fill(owner.token);await page.getByRole('button',{name:'Connect workspace',exact:true}).click();
  await page.getByRole('button',{name:'Local projects',exact:true}).click();await page.getByRole('button',{name:'Register a project',exact:true}).focus();await page.keyboard.press('Enter');
  const command=await page.locator('pre.code-block').textContent();const code=/--code ([a-f0-9]{48})/.exec(command??'')?.[1];assert.ok(code);
  await execute(process.execPath,[resolve('dist/cli/project.js'),'--api',origin,'--repo',repo,'--code',code],{windowsHide:true});
  await page.getByRole('button',{name:'Scan project',exact:true}).click({timeout:15000});
  await page.getByText('website · completed',{exact:true}).waitFor({timeout:120000});const run=(await service.runs(owner.ownerId))[0];assert.equal(run.commit,commit);assert.equal(run.scanIds.length,2);
  for(const id of run.scanIds){const saved=(await store.get(owner,id))!;assert.ok(saved.report.findings.some(f=>f.ruleId==='NET-001'));const seal=await service.evidence(owner.ownerId,id,saved.report);assert.ok(seal);assert.ok(await verifyProjectEvidence(seal,saved.report,[service.signer.publicKey]));assert.equal(seal.evidence.inspection?.framework,'unsupported');}
  console.log('PASS: dashboard pairing, exact committed two-page scan, signed same-run evidence and unsupported-framework scope');
  assert.ok(!(await readFile(join(journal,'registry.json'),'utf8')).includes(owner.token));
  await mkdir('test-results/projects',{recursive:true});await page.screenshot({path:`test-results/projects/${channel}-runs.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`test-results/projects/${channel}-narrow.png`,fullPage:true});await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'Open scan 1',exact:true}).click();await page.getByRole('heading',{name:'Scan report',exact:true}).waitFor();
  const pollsAfterLeaving=projectPolls;await page.waitForTimeout(3300);assert.equal(projectPolls,pollsAfterLeaving,'Polling stops when leaving Local projects');
  assert.ok(await page.getByRole('button',{name:'Print / Save PDF',exact:true}).isVisible());
  const headers={Authorization:`Bearer ${owner.token}`},id=run.scanIds[0];
  assert.equal((await fetch(`${origin}/api/reports/${id}/pdf`,{headers})).status,200);
  const content=await freezeInsights((await store.get(owner,id))!.report);
  const frozen=await fetch(`${origin}/api/scans/${id}/insight-reports`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({analysisHash:await contentHash(content.analysis)})});assert.ok([200,201].includes(frozen.status));
  console.log('PASS: raw PDF and existing frozen report remain available; no v4 model promotion');
  await page.getByRole('button',{name:'Local projects',exact:true}).click();await page.getByRole('button',{name:'Scan project',exact:true}).click();await page.getByRole('button',{name:'Cancel run',exact:true}).click();await page.getByText('website · cancelled',{exact:true}).waitFor({timeout:30000});
  console.log('PASS: UI cancellation stops a newly started run');
  await browser.close();browser=undefined;await service.close();const restored=await ProjectService.open(journal,store);service=restored;
  const saved=(await store.get(owner,id))!;assert.ok(await restored.evidence(owner.ownerId,id,saved.report));
  console.log('PASS: API-service restart retains trusted provenance');
  assert.deepEqual(pageErrors,[]);
  await writeFile(`test-results/projects/${channel}-result.json`,JSON.stringify({browser:channel,commit,checks:['pairing','exact-commit','signed-evidence','unsupported-fallback','raw-pdf','frozen-report','cancel','restart','keyboard-registration','responsive-width','poll-cancellation'],qualifiedCategoriesAdded:[]},null,2));
}finally{
  await browser?.close();await service?.close();if(server)await new Promise<void>((done,reject)=>server!.close(error=>error?reject(error):done()));
  if(resolve(root).startsWith(resolve('.local')+sep))await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}

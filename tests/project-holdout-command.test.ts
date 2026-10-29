import {it,expect,afterEach} from 'vitest';
import {mkdtemp,mkdir,cp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {watch} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,createHmac} from 'node:crypto';
import {holdoutHash as hash,qualifyProjectCategory,type HoldoutRow} from '../packages/ml/project-holdout';
import {evidenceFeatureNames4 as features,projectRules} from '../packages/core/project-evidence';
import {ProjectSigner} from '../apps/server/project-signing';
const execute=promisify(execFile),dirs:string[]=[];
const secret='isolated-mechanics-key-not-user-data-'.repeat(2);
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const opaque=(name:string)=>createHmac('sha256',secret).update('family:'+name).digest('hex');
const signed=(body:object)=>({...body,auth:createHmac('sha256',secret).update('vylnt-private-project-holdout-v1:'+hash(body)).digest('hex')});
afterEach(async()=>{for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true});});
async function setup(overflow=false){
  const parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'holdout-command-'));dirs.push(root);
  await cp('packages',join(root,'packages'),{recursive:true});await mkdir(join(root,'scripts'));await cp('scripts/ml-project-holdout.mjs',join(root,'scripts/ml-project-holdout.mjs'));
  await mkdir(join(root,'ml/applications'),{recursive:true});await cp('ml/applications/native',join(root,'ml/applications/native'),{recursive:true});
  await cp('scripts/ml-project-release.mjs',join(root,'scripts/ml-project-release.mjs'));
  const local=join(root,'.local');await mkdir(local);await writeFile(join(local,'insights-dataset-key'),secret);
  const save=async(path:string,value:unknown)=>writeFile(join(local,path),JSON.stringify(value,null,2));
  const json=async(path:string)=>JSON.parse(await readFile(join(local,path),'utf8'));
  function sources(holdout=false){return {version:holdout?'vylnt-project-holdout-sources-v1':'vylnt-project-development-v1',experiment:crypto.randomUUID(),assessmentPolicyHash:hash('assessment'),harnessHash:hash('harness'),families:Array.from({length:12},(_,i)=>{
    const name=`fixture/${holdout?'holdout':'development'}-${i}`;return {familyId:'upstream:'+name,repositoryId:(holdout?200:100)+i,repository:'https://github.com/'+name,partition:holdout?'holdout':i<8?'train':'validation',license:'MIT',licenseHash:hash('licence'),securityImplementationHashes:[hash(name+'implementation')],revisions:[{commit:'a'.repeat(40),sourceHashes:[hash(name+'source')]}],adapterHash:hash('adapter'),oracleHash:hash(name+'oracle')};
  })};}
  const developmentSources=sources(),holdoutSources=sources(true);
  function rows(holdout=false){return projectRules.flatMap(category=>Array.from({length:holdout?60:90},(_,i)=>{
    const part=holdout?'holdout':i<60?'train':'validation',j=holdout?i:part==='train'?i:i-60;
    const sequence=[features.map((_n,k)=>k<8?Number(Boolean(j&(1<<k))):k===8?Number(holdout):k===9?Number(part==='validation'):-1),features.map(n=>n.startsWith('rule_')?Number(n==='rule_'+category):-1)];
    const family=holdout?holdoutSources.families[i%12]:developmentSources.families[part==='train'?i%8:8+i%4];
    return {family:opaque(family.familyId),variant:hash(sequence),sequence,category,severity:'medium',label:j<(holdout?30:part==='train'?30:15)?'change-warranted':'contextual',uncertain:false,evidenceRecord:hash('record'),scenario:hash('scenario'),...(holdout?{contextualAllowed:true,evidenceRequiresReview:false}:{})};
  }));}
  const development={schemaVersion:'vylnt-evidence-v4',featureNames:[...features],sourceLockHash:hash(developmentSources),examples:rows()};
  const split={version:'vylnt-project-development-split-v1',sourceLockHash:hash(developmentSources),families:Object.fromEntries(developmentSources.families.map(f=>[opaque(f.familyId),f.partition]))};
  await mkdir(join(local,'development'));await save('development/dataset.json',development);await save('development/split.json',split);await save('development-sources.json',developmentSources);await save('holdout-sources.json',holdoutSources);
  await save('exposure.json',{version:1,policy:'vylnt-external-holdout-v1',datasets:{historic:hash('history')},families:[hash('historical-family')],variants:[hash('historical-input')]});
  const width=features.length,flat=74*width+1;
  const model={schemaVersion:'vylnt-evidence-v4',kind:'evidence-lstm',featureNames:[...features],hiddenSize:8,maxSteps:74,gateOrder:'ifgo',weightInput:Array.from({length:32},()=>Array(width).fill(0)),weightHidden:Array.from({length:32},()=>Array(8).fill(0)),biasInput:Array(32).fill(0),biasHidden:Array(32).fill(0),outputWeight:Array(8).fill(0),outputBias:0,releaseStatus:'experimental',datasetHash:hash(development),splitHash:hash(split)};
  const policy={version:'vylnt-project-candidate-v1',releaseStatus:'experimental',categories:Object.fromEntries(projectRules.map(c=>[c,{supported:true,calibration:{temperature:1},thresholds:{contextual:.2,change:.8},logisticCalibration:{temperature:1},logisticThresholds:{contextual:.2,change:.8}}]))};
  const files={'model.json':model,'logistic.json':{mean:Array(flat).fill(0),scale:Array(flat).fill(1),weight:Array(flat).fill(overflow?1e308:0),bias:0},'category-policy.json':policy,
    'registration.json':{datasetHash:hash(development),splitHash:hash(split)},'training.json':{testPredictions:0},'parity.json':{version:2,tolerance:1e-6,cases:projectRules.map(category=>({category})),contractCases:Array(28).fill({})}};
  await mkdir(join(local,'candidate'));for(const [name,value] of Object.entries(files))await save('candidate/'+name,value);
  const fileHashes=Object.fromEntries(await Promise.all(Object.keys(files).map(async name=>[name,sha(await readFile(join(local,'candidate',name)))])));
  await save('candidate/candidate.json',{version:'vylnt-project-candidate-v1',releaseStatus:'experimental',qualification:false,files:fileHashes});
  const candidateHash=sha(await readFile(join(local,'candidate/candidate.json')));
  // Synthetic records exercise binding checks only. No claimed browser/model qualification.
  for(const environment of ['node','chromium','msedge'])await save('candidate/'+(environment==='node'?'javascript-parity.json':`javascript-parity-${environment}.json`),{version:2,environment,candidateHash,modelHash:fileHashes['model.json'],runtimeHash:sha(await readFile('packages/core/ml-lstm.ts')),decisionRuntimeHash:sha(await readFile('packages/ml/project-candidate-runtime.ts')),cases:7,decisionCases:7,contractCasesChecked:28,tolerance:1e-6,maximumError:0,passed:true,logisticChecked:true,categoryDecisionsChecked:true});
  const run=async(args:string[])=>{try{return {code:0,...await execute(process.execPath,['scripts/ml-project-holdout.mjs',...args],{cwd:root,windowsHide:true,timeout:60000})};}catch(error){const e=error as {code:number;stdout:string;stderr:string};return e;}};
  const registered=await run(['register','--candidate','.local/candidate','--development','.local/development','--development-sources','.local/development-sources.json','--source','.local/holdout-sources.json','--exposure','.local/exposure.json','--output','.local/registration']);
  expect(registered.code,registered.stderr).toBe(0);
  const {auth:_,...registration}=await json('registration/registration.json');
  const dataset={schemaVersion:'vylnt-evidence-v4',featureNames:[...features],sourceLockHash:hash(holdoutSources),examples:rows(true)};
  const prepared={'dataset.json':dataset,'split.json':{version:'vylnt-project-holdout-split-v1',sourceLockHash:hash(holdoutSources),families:Object.fromEntries(holdoutSources.families.map(f=>[opaque(f.familyId),'holdout']))},'audit.json':{datasetHash:hash(dataset)},'rejected.json':[]};
  await mkdir(join(local,'prepared'));for(const [name,value] of Object.entries(prepared))await save('prepared/'+name,value);
  await save('prepared/receipt.json',signed({version:'vylnt-project-holdout-v1',registrationHash:hash(registration),files:Object.fromEntries(Object.entries(prepared).map(([name,value])=>[name,hash(value)]))}));
  return {root,local,run,json,save,candidateHash,dataset};
}
it('rejects a renamed exposed native repository at registration',async()=>{
  const f=await setup(),sources=await f.json('holdout-sources.json');
  sources.families[0].repositoryId=1087821022;
  await f.save('holdout-sources.json',sources);
  const result=await f.run(['register','--candidate','.local/candidate','--development','.local/development','--development-sources','.local/development-sources.json','--source','.local/holdout-sources.json','--exposure','.local/exposure.json','--output','.local/refused-registration']);
  expect(result.code).not.toBe(0);expect(result.stderr).toContain('development-exposed native application');
  await expect(access(join(f.local,'refused-registration'))).rejects.toThrow();
},60000);
it('binds native development exposures before any holdout prediction',async()=>{
  const f=await setup();const file=join(f.root,'ml/applications/native/tabinator.source.json');
  const record=JSON.parse(await readFile(file,'utf8'));record.revision='d'.repeat(40);await writeFile(file,JSON.stringify(record));
  const result=await f.run(['evaluate','--registration','.local/registration','--prepared','.local/prepared','--output','.local/changed-exposure']);
  expect(result.code).not.toBe(0);expect(result.stderr).toContain('registration/code/source/exposure changed');
  await expect(access(join(f.local,'project-holdout-consumed',f.candidateHash+'.json'))).rejects.toThrow();
  await expect(access(join(f.local,'changed-exposure'))).rejects.toThrow();
},60000);
it('refuses a missing native exposure inventory rather than silently forgetting development',async()=>{
  const f=await setup();await rm(join(f.root,'ml/applications/native/tabinator.source.json'));
  const result=await f.run(['preflight','--registration','.local/registration','--prepared','.local/prepared']);
  expect(result.code).not.toBe(0);expect(result.stderr).toContain('exposure inventory is missing');
},60000);
it('runs private registration/preflight/failed evaluation and rejects tampering and repeat consumption',async()=>{
  const f=await setup(),common=['--registration','.local/registration','--prepared','.local/prepared'];
  expect((await f.run(['--help'])).code).toBe(0);
  const preflight=await f.run(['preflight',...common]);expect(preflight.code,preflight.stderr).toBe(0);expect(JSON.parse(preflight.stdout).testPredictions).toBe(0);
  await expect(access(join(f.local,'project-holdout-consumed'))).rejects.toThrow();
  const signer=await ProjectSigner.open(join(f.local,'signer'));await f.save('keys.json',signer.trustedKeys);await f.save('manifest.json',{version:'vylnt-project-manifest-v1',examples:[]});
  const empty=await f.run(['prepare','--registration','.local/registration','--manifest','.local/manifest.json','--keys','.local/keys.json','--output','.local/empty']);
  expect(empty.code,empty.stderr).toBe(2);expect(JSON.parse(empty.stdout).deficits).toHaveLength(21);
  const ineligible=await f.run(['evaluate','--registration','.local/registration','--prepared','.local/empty','--output','.local/ineligible']);expect(ineligible.code,ineligible.stderr).toBe(2);
  await expect(access(join(f.local,'project-holdout-consumed'))).rejects.toThrow();
  for(const filename of ['candidate/model.json','candidate/category-policy.json','candidate/javascript-parity.json','registration/registration.json','registration/sources.json','registration/exposure.json']){
    const path=join(f.local,filename),original=await readFile(path);const changed=JSON.parse(original.toString('utf8'));changed.tampered=true;await f.save(filename,changed);
    expect((await f.run(['preflight',...common])).code,filename).not.toBe(0);await writeFile(path,original);
  }
  const changed=structuredClone(f.dataset);changed.examples[0].sequence[0][0]=1;await f.save('prepared/dataset.json',changed);
  expect((await f.run(['evaluate',...common,'--output','.local/tampered'])).code).not.toBe(0);await expect(access(join(f.local,'project-holdout-consumed'))).rejects.toThrow();
  await f.save('prepared/dataset.json',f.dataset);
  const evaluated=await f.run(['evaluate',...common,'--output','.local/evaluated']);expect(evaluated.code,evaluated.stderr).toBe(1);
  const result=await f.json('evaluated/evaluation.json');expect(result.result.passed).toBe(false);expect(result.result.passingCategories).toEqual([]);expect(result.result.releaseStatus).toBe('experimental');
  const rejectedStage=await execute(process.execPath,['scripts/ml-project-release.mjs','--registration','.local/registration','--prepared','.local/prepared','--evaluation','.local/evaluated','--output','.local/rejected-stage'],{cwd:f.root,windowsHide:true,timeout:60000}).then(()=>({code:0,stderr:''}),error=>error as {code:number;stderr:string});
  expect(rejectedStage.code).not.toBe(0);expect(rejectedStage.stderr).toContain('No category passed');await expect(access(join(f.local,'rejected-stage'))).rejects.toThrow();
  const marker=await readFile(join(f.local,'project-holdout-consumed',f.candidateHash+'.json'),'utf8');
  expect((await f.run(['evaluate',...common,'--output','.local/repeated'])).code).not.toBe(0);
  const repeated=await f.run(['preflight',...common]);expect(repeated.code).toBe(2);expect(JSON.parse(repeated.stdout).candidateConsumed).toBe(true);
  expect(await readFile(join(f.local,'project-holdout-consumed',f.candidateHash+'.json'),'utf8')).toBe(marker);
},60000);

it('stages authenticated hypothetical passing records without predictions and rejects changed receipts',async()=>{
  // Isolated signed mechanics only. These hypothetical decisions are not model
  // predictions and never qualify, bundle or release any real application model.
  const f=await setup(),preflight=JSON.parse((await f.run(['preflight','--registration','.local/registration','--prepared','.local/prepared'])).stdout);
  const {auth:_auth,...registration}=await f.json('registration/registration.json');
  const binding={version:'vylnt-project-holdout-v1',registrationHash:hash(registration),candidateHash:f.candidateHash,datasetHash:hash(f.dataset),startedAt:'2026-10-29T00:00:00Z'};
  const categories=Object.fromEntries(projectRules.map(category=>{
    const rows=f.dataset.examples.filter(r=>r.category===category) as HoldoutRow[];return[category,qualifyProjectCategory(rows,rows.map(r=>r.label),rows.map(r=>r.label))];
  }));
  const result={version:'vylnt-project-holdout-v1',categories,passingCategories:[...projectRules],passed:true,uniqueInputs:new Set(f.dataset.examples.map(r=>r.variant)).size,
    releaseStatus:'experimental',qualificationScope:'Controlled project applications only; release/runtime acceptance is still required.'};
  await mkdir(join(f.local,'project-holdout-consumed'));await mkdir(join(f.local,'evaluation'));
  await f.save('project-holdout-consumed/'+f.candidateHash+'.json',signed(binding));await f.save('evaluation/evaluation-started.json',signed(binding));
  await f.save('evaluation/evaluation.json',signed({...binding,completedAt:'2026-10-29T00:01:00Z',preflight,result}));
  const common=['--registration','.local/registration','--prepared','.local/prepared','--evaluation','.local/evaluation'];
  const run=async(args:string[])=>{try{return{code:0,...await execute(process.execPath,['scripts/ml-project-release.mjs',...args],{cwd:f.root,windowsHide:true,timeout:60000})};}catch(error){return error as {code:number;stderr:string;stdout:string};}};
  const marker=await readFile(join(f.local,'project-holdout-consumed',f.candidateHash+'.json'),'utf8');
  const staged=await run([...common,'--output','.local/staged']);expect(staged.code,staged.stderr).toBe(0);
  const release=await f.json('staged/release.json'),receipt=await f.json('staged/staging-receipt.json');
  expect(release.stagedCategories).toEqual([...projectRules]);expect(release.runtimeEnabled).toBe(false);expect(release.runtimeAcceptance).toBe('pending');
  expect(receipt.testPredictions).toBe(0);expect(release.modelJson).toBe(await readFile(join(f.local,'candidate/model.json'),'utf8'));
  expect(await readFile(join(f.local,'project-holdout-consumed',f.candidateHash+'.json'),'utf8')).toBe(marker);
  expect((await run([...common,'--output','.local/staged'])).code).not.toBe(0);
  for(const name of ['evaluation/evaluation.json','evaluation/evaluation-started.json','project-holdout-consumed/'+f.candidateHash+'.json']){
    const original=await readFile(join(f.local,name));const changed=JSON.parse(original.toString());changed.tampered=true;await f.save(name,changed);
    expect((await run([...common,'--output','.local/changed'])).code,name).not.toBe(0);await writeFile(join(f.local,name),original);
    await expect(access(join(f.local,'changed'))).rejects.toThrow();
  }
  await f.save('evaluation/evaluation-failed.json',signed({...binding,failed:true}));expect((await run([...common,'--output','.local/failed-stage'])).code).not.toBe(0);
  await expect(access(join(f.local,'failed-stage'))).rejects.toThrow();
},60000);
it('records a post-consumption numeric failure and keeps the failed candidate consumed',async()=>{
  const f=await setup(true),common=['--registration','.local/registration','--prepared','.local/prepared'];
  const failed=await f.run(['evaluate',...common,'--output','.local/failed']);expect(failed.code).not.toBe(0);
  expect((await f.json('failed/evaluation-failed.json')).failed).toBe(true);await access(join(f.local,'project-holdout-consumed',f.candidateHash+'.json'));
  await expect(access(join(f.local,'failed/evaluation.json'))).rejects.toThrow();expect((await f.run(['evaluate',...common,'--output','.local/retry'])).code).not.toBe(0);
},60000);
it('retains consumption after actual process interruption and refuses another evaluation',async()=>{
  const f=await setup(),consumed=join(f.local,'project-holdout-consumed');await mkdir(consumed);
  const child=spawn(process.execPath,['scripts/ml-project-holdout.mjs','evaluate','--registration','.local/registration','--prepared','.local/prepared','--output','.local/interrupted'],{cwd:f.root,windowsHide:true,stdio:'ignore'});
  let interrupted=false;const watcher=watch(consumed,(_event,name)=>{if(!interrupted&&name?.toString()===f.candidateHash+'.json'){interrupted=child.kill();}});
  const timer=setTimeout(()=>child.kill(),30000);
  try{await new Promise<void>((done,reject)=>{child.on('exit',()=>done());child.on('error',reject);});}finally{clearTimeout(timer);watcher.close();}
  expect(interrupted).toBe(true);await access(join(consumed,f.candidateHash+'.json'));
  expect((await f.run(['evaluate','--registration','.local/registration','--prepared','.local/prepared','--output','.local/retry'])).code).not.toBe(0);
},60000);

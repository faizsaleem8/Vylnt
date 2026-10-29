// Private developer workflow. Never retrains, changes thresholds or promotes a release.
import {readFile,writeFile,mkdir,stat,realpath,rm} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {parseArgs} from 'node:util';
import {build} from 'esbuild';
async function main(){
const {values,positionals}=parseArgs({allowPositionals:true,options:{...Object.fromEntries(['candidate','development','development-sources','source','exposure','registration','manifest','keys','prepared','output'].map(key=>[key,{type:'string'}])),help:{type:'boolean'}}});
if(values.help){console.log('VYLNT fresh holdout: register, prepare, preflight, evaluate. Developer-only; no training or release promotion. See docs/ML_PROJECT_HOLDOUT.md for required paths and once-only rules.');return;}
const action=positionals[0];
if(!['register','prepare','preflight','evaluate'].includes(action)||positionals.length!==1)throw Error('Use register, prepare, preflight or evaluate; see docs/ML_PROJECT_HOLDOUT.md');
await mkdir('.local',{recursive:true});const privateRoot=await realpath('.local');
async function privatePath(path,exists=true){
  if(typeof path!=='string')throw Error('Missing private input/output path');const result=resolve(path);
  if(!result.startsWith(resolve('.local')+sep))throw Error('Holdout data must remain under .local/');
  const actual=await realpath(exists?result:dirname(result));
  if(actual!==privateRoot&&!actual.startsWith(privateRoot+sep))throw Error('Holdout path escapes the private directory');return result;
}
let readBytes=0;
async function bytes(path,limit=1024*1024){const p=await privatePath(path),size=(await stat(p)).size;readBytes+=size;if(size>limit||readBytes>96*1024*1024)throw Error('Holdout input budget exceeded');return readFile(p);}
const json=async(path,limit)=>JSON.parse((await bytes(path,limit)).toString('utf8'));
const fileHash=value=>createHash('sha256').update(value).digest('hex');
const secret=(await bytes('.local/insights-dataset-key',1024)).toString('utf8').trim();if(secret.length<32)throw Error('Use the existing private family key');
const compiled=resolve('.local/project-holdout-'+randomUUID()+'.mjs');
await build({entryPoints:['packages/ml/project-holdout.ts'],outfile:compiled,bundle:true,platform:'node',format:'esm',packages:'external'});
try{
const M=await import(pathToFileURL(compiled).href),hash=M.holdoutHash;
const nativeExposures=await M.readNativeProjectExposures();
const protocolHash=hash({module:fileHash(await readFile(compiled)),runner:fileHash(await readFile('scripts/ml-project-holdout.mjs')),nativeExposures:hash(nativeExposures)});
const sign=value=>createHmac('sha256',secret).update('vylnt-private-project-holdout-v1:'+hash(value)).digest('hex');
const authenticate=value=>({...value,auth:sign(value)});
function checked(value){const {auth,...body}=value;if(typeof auth!=='string'||!/^[a-f0-9]{64}$/.test(auth)||!timingSafeEqual(Buffer.from(auth,'hex'),Buffer.from(sign(body),'hex')))throw Error('Private holdout record changed');return body;}
const save=(root,name,value)=>writeFile(resolve(root,name),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
async function consumed(candidateHash){try{await stat(resolve(privateRoot,'project-holdout-consumed',candidateHash+'.json'));return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function candidate(root){
  const manifestBytes=await bytes(resolve(root,'candidate.json')),manifest=JSON.parse(manifestBytes);
  const names=['category-policy.json','logistic.json','model.json','parity.json','registration.json','training.json'];
  if(manifest.version!=='vylnt-project-candidate-v1'||manifest.qualification!==false||manifest.releaseStatus!=='experimental'||JSON.stringify(Object.keys(manifest.files??{}).sort())!==JSON.stringify(names))throw Error('Invalid experimental candidate');
  const files={};for(const name of names){const raw=await bytes(resolve(root,name),name==='parity.json'?16*1024*1024:1024*1024);if(fileHash(raw)!==manifest.files[name])throw Error('Frozen candidate changed');files[name]=JSON.parse(raw);}
  const model=files['model.json'];M.projectCategoryPolicySchema.parse(files['category-policy.json']);
  if((await stat(resolve(root,'model.json'))).size>128*1024||model.schemaVersion!=='vylnt-evidence-v4'||model.kind!=='evidence-lstm'||model.gateOrder!=='ifgo'||model.hiddenSize!==8||model.maxSteps!==74||model.releaseStatus!=='experimental'||hash(model.featureNames)!==hash(M.evidenceFeatureNames4))throw Error('Invalid model contract');
  if(model.datasetHash!==files['registration.json'].datasetHash||model.splitHash!==files['registration.json'].splitHash||files['training.json'].testPredictions!==0)throw Error('Candidate development binding changed');
  M.checkProjectModels(model,files['logistic.json']);
  const manifestHash=fileHash(manifestBytes),modelHash=manifest.files['model.json'],parityHashes={};
  const fixtures=files['parity.json'];
  if(fixtures.version!==2||fixtures.tolerance!==1e-6||!Array.isArray(fixtures.cases)||fixtures.cases.length<7||fixtures.cases.length>56||!Array.isArray(fixtures.contractCases)||fixtures.contractCases.length!==28)throw Error('Missing category-decision parity fixtures');
  for(const category of ['HDR-001','HDR-002','HDR-003','CK-001','CK-002','CK-003','NET-001'])if(!fixtures.cases.some(c=>c.category===category))throw Error('Candidate parity lacks category coverage');
  for(const environment of ['node','chromium','msedge']){
    const name=environment==='node'?'javascript-parity.json':`javascript-parity-${environment}.json`,raw=await bytes(resolve(root,name)),p=JSON.parse(raw);
    if(p.version!==2||p.environment!==environment||p.passed!==true||p.categoryDecisionsChecked!==true||p.logisticChecked!==true||p.candidateHash!==manifestHash||p.modelHash!==modelHash||p.runtimeHash!==fileHash(await readFile('packages/core/ml-lstm.ts'))||p.decisionRuntimeHash!==fileHash(await readFile('packages/ml/project-candidate-runtime.ts'))||p.tolerance!==1e-6||!Number.isFinite(p.maximumError)||p.maximumError<0||p.maximumError>1e-6||p.cases!==fixtures.cases.length||p.decisionCases!==fixtures.cases.length||p.contractCasesChecked!==28)throw Error('Executed Node/Chromium/Edge parity record is missing or stale');
    parityHashes[environment]=fileHash(raw);
  }
  return {manifestHash,parityHashes,files};
}
if(action==='register'){
  const root=await privatePath(values.output,false),candidateRoot=await privatePath(values.candidate),c=await candidate(candidateRoot);
  if(await consumed(c.manifestHash))throw Error('Candidate already consumed; retain the result and create a new development experiment');
  const source=M.projectHoldoutSourceLockSchema.parse(await json(values.source)),developmentSources=M.projectSourceLockSchema.parse(await json(values['development-sources']));
  if(source.families.length!==12)throw Error('Select exactly twelve independent holdout source families before collection');
  M.assertFreshNativeSources(source.families,nativeExposures);
  if(source.assessmentPolicyHash!==developmentSources.assessmentPolicyHash)throw Error('Holdout assessment policy differs from development');
  const development=await json(resolve(values.development??'','dataset.json'),64*1024*1024),split=await json(resolve(values.development??'','split.json'));
  if(hash(development)!==c.files['registration.json'].datasetHash||hash(split)!==c.files['registration.json'].splitHash||development.sourceLockHash!==hash(developmentSources)||split.sourceLockHash!==hash(developmentSources))throw Error('Candidate/development/source binding changed');
  M.checkDevelopmentReadiness(development,split);
  const familyAssignments=Object.fromEntries(developmentSources.families.map(f=>[createHmac('sha256',secret).update('family:'+f.familyId).digest('hex'),f.partition]));
  if(hash(split.families)!==hash(familyAssignments))throw Error('Development source/private-family assignments changed');
  const exposure=await json(values.exposure,24*1024*1024);
  if(exposure.version!==1||exposure.policy!=='vylnt-external-holdout-v1'||!Object.keys(exposure.datasets??{}).length||!exposure.families?.length||!exposure.variants?.length)throw Error('Complete historical exposure registry required');
  const own=new Set(developmentSources.families.flatMap(f=>f.securityImplementationHashes));
  const repositoryIds=new Set(developmentSources.families.map(f=>f.repositoryId));
  const trees=new Set(developmentSources.families.flatMap(f=>f.revisions.map(r=>hash([...r.sourceHashes].sort()))));
  for(const f of source.families)if(repositoryIds.has(f.repositoryId)||f.securityImplementationHashes.some(h=>own.has(h))||f.revisions.some(r=>trees.has(hash([...r.sourceHashes].sort()))))throw Error('Holdout reuses a development repository/security implementation/template');
  const combined={...exposure,families:[...new Set([...exposure.families,...Object.keys(split.families)])],variants:[...new Set([...exposure.variants,...development.examples.map(r=>r.variant)])]};
  await M.prepareProjectHoldout([],source,combined,secret,[]);
  await mkdir(root);
  const registration={version:M.holdoutVersion,id:randomUUID(),registeredAt:new Date().toISOString(),candidateRoot,candidateHash:c.manifestHash,parityHashes:c.parityHashes,
    developmentHash:hash(development),sourceHash:hash(source),exposureHash:hash(combined),protocolHash,familyKeyHash:fileHash(secret),predictions:0};
  await save(root,'registration.json',authenticate(registration));await save(root,'sources.json',source);await save(root,'exposure.json',combined);
  console.log('Frozen twelve-source holdout selection against the existing candidate. No test predictions.');
}else{
  const registrationRoot=await privatePath(values.registration),registration=checked(await json(resolve(registrationRoot,'registration.json')));
  const source=M.projectHoldoutSourceLockSchema.parse(await json(resolve(registrationRoot,'sources.json'))),exposure=await json(resolve(registrationRoot,'exposure.json'),24*1024*1024);
  M.assertFreshNativeSources(source.families,nativeExposures);
  if(registration.version!==M.holdoutVersion||registration.protocolHash!==protocolHash||registration.familyKeyHash!==fileHash(secret)||registration.sourceHash!==hash(source)||registration.exposureHash!==hash(exposure))throw Error('Holdout registration/code/source/exposure changed');
  const c=await candidate(registration.candidateRoot);
  if(c.manifestHash!==registration.candidateHash||hash(c.parityHashes)!==hash(registration.parityHashes))throw Error('Registered candidate or executed parity changed');
  if(action==='prepare'){
    if(await consumed(c.manifestHash))throw Error('Cannot prepare a replacement holdout for a consumed candidate');
    const manifest=await json(values.manifest,4*1024*1024),keys=await json(values.keys);
    if(manifest.version!=='vylnt-project-manifest-v1'||!Array.isArray(manifest.examples)||manifest.examples.length>50000||!Array.isArray(keys)||!keys.length||keys.length>32)throw Error('Invalid private manifest or trusted key archive');
    const inputs=[];for(const entry of manifest.examples){if(!entry||!['report','seal','oracle'].every(k=>typeof entry[k]==='string'))throw Error('Invalid manifest entry');const base=dirname(values.manifest);inputs.push({report:await json(resolve(base,entry.report),512*1024),seal:await json(resolve(base,entry.seal),132*1024),oracle:await json(resolve(base,entry.oracle),16*1024)});}
    const prepared=await M.prepareProjectHoldout(inputs,source,exposure,secret,keys),root=await privatePath(values.output,false);
    const preflight=M.inspectProjectHoldout(prepared.dataset,prepared.split.families,exposure,c.files['category-policy.json']);
    await mkdir(root);for(const [name,value] of Object.entries(prepared))await save(root,name+'.json',value);
    await save(root,'receipt.json',authenticate({version:M.holdoutVersion,registrationHash:hash(registration),files:Object.fromEntries(Object.entries(prepared).map(([name,value])=>[name+'.json',hash(value)]))}));
    console.log(JSON.stringify(preflight,null,2));if(!preflight.ready)process.exitCode=2;
  }else{
    const preparedRoot=await privatePath(values.prepared),receipt=checked(await json(resolve(preparedRoot,'receipt.json')));
    if(receipt.version!==M.holdoutVersion||receipt.registrationHash!==hash(registration)||JSON.stringify(Object.keys(receipt.files??{}).sort())!==JSON.stringify(['audit.json','dataset.json','rejected.json','split.json']))throw Error('Holdout preparation receipt changed');
    const prepared={};for(const [name,digest] of Object.entries(receipt.files)){const value=await json(resolve(preparedRoot,name),64*1024*1024);if(hash(value)!==digest)throw Error('Prepared holdout changed');prepared[name]=value;}
    const data=prepared['dataset.json'],split=prepared['split.json'];
    if(data.sourceLockHash!==registration.sourceHash||split.sourceLockHash!==registration.sourceHash||split.version!=='vylnt-project-holdout-split-v1'||prepared['audit.json'].datasetHash!==hash(data))throw Error('Holdout source/split/audit binding changed');
    const preflight=M.inspectProjectHoldout(data,split.families,exposure,c.files['category-policy.json']);
    preflight.candidateConsumed=await consumed(c.manifestHash);
    if(preflight.candidateConsumed){preflight.ready=false;preflight.deficits.push('Frozen candidate already consumed; no repeat evaluation is permitted');}
    if(action==='preflight'||!preflight.ready){console.log(JSON.stringify(preflight,null,2));if(!preflight.ready)process.exitCode=2;}
    else{
      const output=await privatePath(values.output,false);await mkdir(output);
      const consumed=resolve(privateRoot,'project-holdout-consumed');await mkdir(consumed,{recursive:true});
      const binding={version:M.holdoutVersion,registrationHash:hash(registration),candidateHash:c.manifestHash,datasetHash:hash(data),startedAt:new Date().toISOString()};
      // Exclusive across registrations of this same frozen candidate, before inference.
      await save(consumed,c.manifestHash+'.json',authenticate(binding));
      await save(output,'evaluation-started.json',authenticate(binding));
      try{
        const result=M.evaluateProjectHoldout(data,c.files['model.json'],c.files['logistic.json'],c.files['category-policy.json']);
        await save(output,'evaluation.json',authenticate({...binding,completedAt:new Date().toISOString(),preflight,result}));
        console.log(JSON.stringify({passed:result.passed,passingCategories:result.passingCategories,releaseStatus:result.releaseStatus},null,2));if(!result.passed)process.exitCode=1;
      }catch(error){await save(output,'evaluation-failed.json',authenticate({...binding,failed:true,reason:'Evaluation interrupted or failed; candidate remains consumed.'}));throw error;}
    }
  }
}
}finally{await rm(compiled,{force:true});}
}
await main().catch(error=>{console.error('VYLNT holdout command failed: '+(error instanceof Error?error.message.slice(0,1000):'Unknown execution error'));process.exitCode=2;});

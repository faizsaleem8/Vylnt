// Read-only qualification verification and private staging. Never predicts or bundles.
import {readFile,writeFile,mkdir,stat,realpath,rm} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {parseArgs,promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {build} from 'esbuild';
async function main(){
  const {values}=parseArgs({options:{...Object.fromEntries(['registration','prepared','evaluation','output'].map(n=>[n,{type:'string'}])),help:{type:'boolean'}}});
  if(values.help){console.log('VYLNT project release staging: --registration <private dir> --prepared <private dir> --evaluation <private dir> --output <new private dir>. No predictions, runtime activation or bundling.');return;}
  if(['registration','prepared','evaluation','output'].some(n=>!values[n]))throw Error('Registration, prepared holdout, completed evaluation and new output paths are required');
  const privateRoot=await realpath('.local');let readBytes=0;
  async function privatePath(path,exists=true){
    const p=resolve(path);if(!p.startsWith(resolve('.local')+sep))throw Error('Release inputs and output must remain under .local/');
    const actual=await realpath(exists?p:dirname(p));if(actual!==privateRoot&&!actual.startsWith(privateRoot+sep))throw Error('Release path escapes the private directory');return p;
  }
  async function bytes(path,limit=1024*1024){const p=await privatePath(path),size=(await stat(p)).size;readBytes+=size;if(size>limit||readBytes>96*1024*1024)throw Error('Release input budget exceeded');return readFile(p);}
  const json=async(path,limit)=>JSON.parse((await bytes(path,limit)).toString('utf8'));
  const sha=value=>createHash('sha256').update(value).digest('hex');
  const secret=(await bytes('.local/insights-dataset-key',1024)).toString('utf8').trim();if(secret.length<32)throw Error('The existing private family key is required');
  const compiled=resolve('.local/project-release-'+randomUUID()+'.mjs');
  await build({entryPoints:['packages/ml/project-release.ts'],outfile:compiled,bundle:true,platform:'node',format:'esm',packages:'external'});
  try{
    const {stageProjectRelease,canonicalJson:canonical}=await import(pathToFileURL(compiled).href);
    const hash=value=>sha(canonical(value));
    const sign=value=>createHmac('sha256',secret).update('vylnt-private-project-holdout-v1:'+hash(value)).digest('hex');
    function checked(value){const {auth,...body}=value;if(typeof auth!=='string'||!/^[a-f0-9]{64}$/.test(auth)||!timingSafeEqual(Buffer.from(auth,'hex'),Buffer.from(sign(body),'hex')))throw Error('Private qualification record changed');return body;}
    const registrationRoot=await privatePath(values.registration),preparedRoot=await privatePath(values.prepared),evaluationRoot=await privatePath(values.evaluation),output=await privatePath(values.output,false);
    // Reuse the complete, immutable-source/candidate/parity preflight. Its only
    // permitted deficit is the consumption required for staging, not prediction.
    let processResult;
    try{processResult={code:0,...await promisify(execFile)(process.execPath,['scripts/ml-project-holdout.mjs','preflight','--registration',registrationRoot,'--prepared',preparedRoot],{windowsHide:true,timeout:60000,maxBuffer:1024*1024})};}
    catch(error){processResult={code:error.code,stdout:error.stdout,stderr:error.stderr};}
    let preflight;try{preflight=JSON.parse(processResult.stdout);}catch{throw Error('Frozen holdout preflight failed; no release staged');}
    const consumedDeficit='Frozen candidate already consumed; no repeat evaluation is permitted';
    if(processResult.code!==2||preflight.candidateConsumed!==true||preflight.ready!==false||canonical(preflight.deficits)!==canonical([consumedDeficit]))throw Error('Expected an eligible, already-consumed frozen evaluation');
    const registration=checked(await json(resolve(registrationRoot,'registration.json'))),candidateRoot=await privatePath(registration.candidateRoot);
    const source=await json(resolve(registrationRoot,'sources.json')),exposure=await json(resolve(registrationRoot,'exposure.json'),24*1024*1024);
    if(hash(source)!==registration.sourceHash||hash(exposure)!==registration.exposureHash||registration.familyKeyHash!==sha(secret))throw Error('Qualification registration changed during staging');
    const manifestBytes=await bytes(resolve(candidateRoot,'candidate.json')),manifest=JSON.parse(manifestBytes),candidateHash=sha(manifestBytes);
    if(candidateHash!==registration.candidateHash)throw Error('Candidate changed during staging');
    const files={},fileBytes={};
    const expected=['category-policy.json','logistic.json','model.json','parity.json','registration.json','training.json'];
    if(canonical(Object.keys(manifest.files??{}).sort())!==canonical(expected))throw Error('Candidate artifact manifest changed');
    for(const name of expected){const raw=await bytes(resolve(candidateRoot,name),name==='parity.json'?16*1024*1024:1024*1024);if(sha(raw)!==manifest.files[name])throw Error('Candidate artifact changed during staging');files[name]=JSON.parse(raw);fileBytes[name]=raw;}
    const parityHashes={};for(const environment of ['node','chromium','msedge']){
      const raw=await bytes(resolve(candidateRoot,environment==='node'?'javascript-parity.json':`javascript-parity-${environment}.json`));parityHashes[environment]=sha(raw);
    }
    if(hash(parityHashes)!==hash(registration.parityHashes))throw Error('Executed parity changed during staging');
    const receipt=checked(await json(resolve(preparedRoot,'receipt.json')));
    if(receipt.registrationHash!==hash(registration)||canonical(Object.keys(receipt.files??{}).sort())!==canonical(['audit.json','dataset.json','rejected.json','split.json']))throw Error('Prepared receipt changed');
    const prepared={};for(const [name,digest]of Object.entries(receipt.files)){const value=await json(resolve(preparedRoot,name),64*1024*1024);if(hash(value)!==digest)throw Error('Prepared evidence changed');prepared[name]=value;}
    const data=prepared['dataset.json'];if(data.sourceLockHash!==registration.sourceHash||prepared['split.json'].sourceLockHash!==registration.sourceHash||prepared['audit.json'].datasetHash!==hash(data))throw Error('Prepared source binding changed');
    const marker=checked(await json(resolve(privateRoot,'project-holdout-consumed',candidateHash+'.json')));
    const started=checked(await json(resolve(evaluationRoot,'evaluation-started.json')));
    if(hash(marker)!==hash(started)||marker.candidateHash!==candidateHash||marker.registrationHash!==hash(registration)||marker.datasetHash!==hash(data))throw Error('Evaluation start/consumption binding changed');
    try{await stat(resolve(evaluationRoot,'evaluation-failed.json'));throw Error('Interrupted or failed evaluation cannot stage a release');}catch(error){if(error.code!=='ENOENT')throw error;}
    const evaluationBytes=await bytes(resolve(evaluationRoot,'evaluation.json')),evaluation=checked(JSON.parse(evaluationBytes));
    const {completedAt,preflight:savedPreflight,result,...binding}=evaluation;
    if(hash(binding)!==hash(marker)||!Number.isFinite(Date.parse(completedAt))||!Number.isFinite(Date.parse(marker.startedAt))||Date.parse(completedAt)<Date.parse(marker.startedAt))throw Error('Completed evaluation binding changed');
    const eligible={...preflight,ready:true,deficits:[],candidateConsumed:false};
    if(hash(savedPreflight)!==hash(eligible))throw Error('Evaluation counts/preflight changed');
    delete eligible.candidateConsumed;
    const identity={candidateHash,modelHash:manifest.files['model.json'],categoryPolicyHash:manifest.files['category-policy.json'],evaluationHash:sha(evaluationBytes),registrationHash:hash(registration),
      holdoutHash:hash(data),sourceLockHash:registration.sourceHash,exposureHash:registration.exposureHash,assessmentPolicyHash:source.assessmentPolicyHash,harnessHash:source.harnessHash,parityHashes};
    const release=stageProjectRelease({identity,preflight:eligible,result,modelJson:fileBytes['model.json'].toString('utf8'),logistic:files['logistic.json'],categoryPolicy:files['category-policy.json']});
    const stagingProtocolHash=hash({module:sha(await readFile(compiled)),runner:sha(await readFile('scripts/ml-project-release.mjs'))});
    // Output is exclusively created after all checks. Incomplete staging can
    // never look like a runtime-accepted or bundled release.
    await mkdir(output);
    await writeFile(resolve(output,'release.json'),JSON.stringify(release,null,2),{flag:'wx',mode:0o600});
    const record={version:'vylnt-project-release-staging-v1',releaseHash:release.releaseHash,releaseFileHash:sha(await readFile(resolve(output,'release.json'))),stagingProtocolHash,
      evaluationHash:identity.evaluationHash,candidateHash,runtimeEnabled:false,runtimeAcceptance:'pending',testPredictions:0};
    const auth=createHmac('sha256',secret).update('vylnt-private-project-release-v1:'+hash(record)).digest('hex');
    await writeFile(resolve(output,'staging-receipt.json'),JSON.stringify({...record,auth},null,2),{flag:'wx',mode:0o600});
    console.log(JSON.stringify({stagedCategories:release.stagedCategories,runtimeEnabled:false,runtimeAcceptance:'pending',testPredictions:0},null,2));
  }finally{await rm(compiled,{force:true});}
}
await main().catch(error=>{console.error('VYLNT release staging failed: '+(error instanceof Error?error.message.slice(0,700):'Unknown error'));process.exitCode=2;});

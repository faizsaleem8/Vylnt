import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { resolve,join,sep } from 'node:path';
import { randomUUID,createHash,generateKeyPairSync } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute=promisify(execFile),parent=resolve('.local');await mkdir(parent,{recursive:true});
const root=await mkdtemp(join(parent,'project-data-acceptance-'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const save=(name,value)=>writeFile(join(root,name),JSON.stringify(value));
async function run(args,expected){
  try{await execute(process.execPath,['scripts/ml-prepare-projects.mjs',...args],{windowsHide:true,timeout:30000,maxBuffer:128*1024});assert.equal(expected,0);}
  catch(error){if(error.code!==expected)throw error;}
}
try{
  // Synthetic command fixtures only. They are deleted and never used for fitting.
  const lock={version:'vylnt-project-development-v1',experiment:randomUUID(),assessmentPolicyHash:hash('policy'),harnessHash:hash('harness'),families:Array.from({length:12},(_,i)=>({
    familyId:`upstream:fixture/app-${i}`,repository:`https://github.com/fixture/app-${i}`,repositoryId:1000+i,partition:i<8?'train':'validation',license:'MIT',licenseHash:hash('licence'),
    securityImplementationHashes:[hash('implementation-'+i)],revisions:[{commit:hash('commit-'+i).slice(0,40),sourceHashes:[hash('source-'+i)]}],adapterHash:hash('adapter'),oracleHash:hash('oracle')}))};
  const exposure={version:1,policy:'vylnt-external-holdout-v1',datasets:{[hash('historical-data')]:['synthetic-fixture-only']},families:[hash('prior-family')],variants:[hash('prior-input')]};
  await save('sources.json',lock);await save('exposure.json',exposure);await save('manifest.json',{version:'vylnt-project-manifest-v1',examples:[]});
  const {publicKey}=generateKeyPairSync('ed25519'),spki=publicKey.export({type:'spki',format:'der'}).toString('base64');
  await save('keys.json',[{keyId:hash(JSON.stringify({algorithm:'Ed25519',spki})),spki}]);
  const registration=join(root,'registration'),output=join(root,'prepared');
  const args=['register','--source',join(root,'sources.json'),'--exposure',join(root,'exposure.json'),'--output',registration];
  await run(args,0);const original=await readFile(join(registration,'registration.json'),'utf8');
  await run(args,1);assert.equal(await readFile(join(registration,'registration.json'),'utf8'),original,'registration cannot be overwritten');
  const prepare=['prepare','--registration',registration,'--manifest',join(root,'manifest.json'),'--keys',join(root,'keys.json'),'--output',output];
  await run(prepare,2);const audit=JSON.parse(await readFile(join(output,'audit.json'),'utf8'));
  assert.equal(audit.ready,false);assert.equal(audit.testPredictions,0);assert.equal(audit.qualification,false);assert.equal(Object.keys(audit.categories).length,7);
  assert.equal(audit.trainFamilies,8);assert.equal(audit.validationFamilies,4);
  for(const category of Object.values(audit.categories))for(const part of Object.values(category.partitions))for(const value of Object.values(part.classes))assert.equal(value.contexts,0);
  lock.families[0].repositoryId=9999;await writeFile(join(registration,'sources.json'),JSON.stringify(lock));
  await run([...prepare.slice(0,-1),join(root,'altered-output')],1);
  await mkdir('test-results/project-data',{recursive:true});
  await writeFile('test-results/project-data/commands.json',JSON.stringify({version:1,passed:['exclusive registration','stable preparation identity','empty-data deficits and exit 2','changed registration rejection'],scope:'Synthetic command lifecycle fixtures only; no application corpus or model evaluation.'},null,2));
  console.log('Project data registration/preparation command acceptance passed. No model trained.');
}finally{
  const checked=resolve(root);if(!checked.startsWith(parent+sep))throw Error('Unexpected fixture cleanup path');
  await rm(checked,{recursive:true,force:true,maxRetries:3});
}

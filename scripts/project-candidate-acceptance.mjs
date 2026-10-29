import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir,mkdtemp,rm,realpath } from 'node:fs/promises';
import { resolve,join,sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
await mkdir('.local',{recursive:true});
const execute=promisify(execFile),parent=await realpath('.local'),root=await mkdtemp(join(parent,'candidate-command-'));
const hash=value=>createHash('sha256').update(JSON.stringify(value,Object.keys(value).sort())).digest('hex');
try{
  // Generate the authoritative TS feature contract through the real wrapper.
  try{await execute(process.execPath,['scripts/ml-project-candidate.mjs','--help'],{windowsHide:true,timeout:30000});}catch(error){throw Error('Candidate command failed to load: '+error.code);}
  const features=JSON.parse(await readFile('.local/project-feature-contract.json','utf8'));
  const data={examples:[],featureNames:features,schemaVersion:'vylnt-evidence-v4',sourceLockHash:'a'.repeat(64)};
  const split={version:'vylnt-project-development-split-v1',sourceLockHash:data.sourceLockHash,families:Object.fromEntries(Array.from({length:12},(_,i)=>['fixture-'+i,i<8?'train':'validation']))};
  for(const [name,value] of Object.entries({dataset:data,split,audit:{datasetHash:hash(data),ready:false},registration:{version:'vylnt-project-registration-v1'}}))await writeFile(join(root,name+'.json'),JSON.stringify(value));
  let status;
  try{await execute(process.execPath,['scripts/ml-project-candidate.mjs','preflight','--prepared',root],{windowsHide:true,timeout:30000});throw Error('Empty data passed');}
  catch(error){assert.equal(error.code,2);status=JSON.parse(error.stdout);assert.equal(status.ready,false);assert.equal(status.deficits.length,28);assert.equal(status.testPredictions,0);}
  try{await execute(process.execPath,['scripts/ml-project-candidate.mjs','register','--prepared',root,'--output',join(root,'candidate')],{windowsHide:true,timeout:30000});throw Error('Empty data registered');}
  catch(error){assert.equal(error.code,1);}
  await mkdir('test-results/project-candidate',{recursive:true});await writeFile('test-results/project-candidate/commands.json',JSON.stringify({passed:true,deficitCount:status.deficits.length,testPredictions:0,qualification:false,scope:'Empty synthetic command fixture only; no fitting.'},null,2));
  console.log('Candidate command preflight/registration rejection passed. No fitting or qualification.');
}finally{
  const actual=await realpath(root);if(!actual.startsWith(parent+sep))throw Error('Unexpected candidate cleanup path');await rm(actual,{recursive:true,force:true});
}

// Actual changed-source rejection. Run only when no native collectors are active.
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve,join,relative,sep,isAbsolute} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),parent=await realpath('.local');
const active=async()=>(await readdir(parent)).filter(n=>/^native-(?:operation|expansion)-run-/.test(n));
assert.deepEqual(await active(),[],'Stop native collectors before source checks');
for(const family of ['habit-tracker','portal','personal-knowledge-manager','stockbase','8star-links','anonymous-notepad']){
  const meta=JSON.parse(await readFile(`ml/applications/native/${family}.source.json`,'utf8'));
  const filename=Object.keys(meta.sourceSha256).find(f=>/\.[jt]s$/.test(f));assert.ok(filename);
  const source=await realpath(join(parent,'ml-native-expansion',family)),path=resolve(source,filename),within=relative(source,path);
  assert.ok(!isAbsolute(within)&&within!=='..'&&!within.startsWith('..'+sep)&&(await realpath(path)).startsWith(source+sep));
  const info=await lstat(path);assert.ok(info.isFile()&&!info.isSymbolicLink());const original=await readFile(path);
  let rejected=false;
  try{
    await writeFile(path,Buffer.concat([original,Buffer.from('\n// VYLNT changed-source acceptance control\n')]));
    try{await exec(process.execPath,['scripts/native-expansion-data.mjs','--family',family],{windowsHide:true,timeout:30000,maxBuffer:128*1024});}
    catch(error){assert.notEqual(error.code,0);assert.ok(!error.killed&&String(error.stderr).includes('Native source differs from the pinned Git blob'),'Expected source integrity rejection, not runtime failure');rejected=true;}
    assert.ok(rejected);assert.deepEqual(await active(),[],'Rejected source must not create an application run');
  }finally{await writeFile(path,original);assert.deepEqual(await readFile(path),original);}
  await mkdir('test-results/native-projects',{recursive:true});
  await writeFile(`test-results/native-projects/${family}-source-integrity.json`,JSON.stringify({passed:true,commit:meta.revision,modifiedSourceRejectedBeforeStartup:true,originalBytesRestored:true,noRunDirectoryCreated:true},null,2));
  console.log(family+': changed source rejected before startup; original bytes restored.');
}

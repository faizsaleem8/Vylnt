import {parseArgs} from 'node:util';
import {readFile,readdir,writeFile,mkdir,realpath,lstat,rm} from 'node:fs/promises';
import {resolve,join,dirname,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const {values}=parseArgs({options:{collect:{type:'boolean'},output:{type:'string'},help:{type:'boolean'}}});
if(values.help){console.log('Use ml:projects:seeds -- [--collect] --output <new directory directly inside .local>. Collect runs the native/default and readable-cookie profiles. Writes seven seed datasets and a training-readiness audit; never fits or promotes a model.');process.exit(0);}
if(!values.output)throw Error('Provide a new --output directory inside .local');
const privateRoot=await realpath('.local'),output=resolve(values.output);
if(dirname(output)!==resolve('.local')||await realpath(dirname(output))!==privateRoot)throw Error('Seed output must be a new directory directly inside .local');
try{await lstat(output);throw Error('Seed output already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
const secret=(await readFile(join(privateRoot,'insights-dataset-key'),'utf8')).trim();
if(secret.length<32)throw Error('Keep the existing private family key; it is missing or invalid');
if(values.collect){
  for(const profile of [[],['--readable-cookies']])await new Promise((done,reject)=>{
    const child=spawn(process.execPath,['scripts/native-tabinator-acceptance.mjs',...profile,'--seeds'],{stdio:['inherit','inherit','inherit','ipc'],windowsHide:true});
    let cancelled=false;
    const cancel=()=>{cancelled=true;if(child.connected)child.send({type:'cancel'},()=>{});};
    process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
    const clear=()=>{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);};
    child.on('error',error=>{clear();reject(error);});
    child.on('exit',code=>{clear();if(code!==0||cancelled)reject(Error('Native seed collection failed or was cancelled; no corpus written'));else done();});
  });
}
const observations=resolve('.local/ml-native-observations/tabinator');
if(!(await realpath(observations)).startsWith(privateRoot+sep))throw Error('Native observations escape the private workspace');
const files=[];let bytesRead=0;
const directories=await readdir(observations,{withFileTypes:true});
if(directories.length>1000)throw Error('Native observation inventory exceeds budget');
async function boundedJson(file,limit){
  const info=await lstat(file);
  if(!info.isFile()||info.isSymbolicLink()||info.size>limit||(bytesRead+=info.size)>32*1024*1024)throw Error('Seed input exceeds private file budget');
  try{return JSON.parse(await readFile(file,'utf8'));}catch{throw Error('Invalid native metadata JSON');}
}
for(const dir of directories){
  if(!dir.isDirectory()||dir.isSymbolicLink())continue;
  const root=join(observations,dir.name),file=join(root,'development-seeds.json');
  try{
    const batch=await boundedJson(file,2*1024*1024),acceptance=await boundedJson(join(root,'acceptance.json'),8*1024);
    if(acceptance.completed!==true||acceptance.sourceRunCleanup!==true||acceptance.reloadVerified!==true)throw Error('Native seed run did not finish acceptance and cleanup');
    files.push(batch);
  }catch(error){if(error.code!=='ENOENT')throw error;}
}
const compiled=join(privateRoot,'project-seeds-'+randomUUID()+'.mjs');
try{
  await build({entryPoints:['packages/ml/project-seed-corpus.ts'],outfile:compiled,bundle:true,format:'esm',platform:'node',packages:'external'});
  const {assembleNativeSeedCorpus}=await import(pathToFileURL(compiled).href),result=await assembleNativeSeedCorpus(files,secret);
  await mkdir(output);
  const save=(name,value)=>writeFile(join(output,name),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
  for(const [category,data] of Object.entries(result.categories))await save(category+'.json',data);
  await save('proofs.json',result.proofs);await save('audit.json',result.audit);
  await save('training-status.json',{status:'blocked',modelFitted:false,qualification:false,reason:'Native seed data does not meet the registered development-cohort requirements.',categories:result.audit.categories});
  console.log(JSON.stringify(result.audit,null,2));console.log('Saved native seed artifacts: '+output);
  // Explicitly unsuccessful for training, even though seed extraction succeeded.
  process.exitCode=2;
}finally{await rm(compiled,{force:true});}

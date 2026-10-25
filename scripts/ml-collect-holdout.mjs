// Bounded independent application processes; a failed attempt is retained, never scored.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {parseArgs} from 'node:util';
import {resolve} from 'node:path';
const {values}=parseArgs({options:{'source-lock':{type:'string'},output:{type:'string'}}});
if(!values['source-lock']||!values.output)throw Error('Use --source-lock <pinned lock> --output <new private collection directory>');
const directory=resolve(values.output);
if(!directory.startsWith(resolve('.local')+'\\')&&!directory.startsWith(resolve('.local')+'/'))throw Error('Collection output must be private under .local');
const lock=JSON.parse(await readFile(values['source-lock'],'utf8'));
const pending=[...lock.applications],results=[],children=new Set();
if(!pending.length||pending.length>30||pending.some(a=>!/^q1-[a-z0-9-]+$/.test(a.id)))throw Error('Expected bounded registered external application IDs');
await mkdir(directory,{recursive:false});
let stopped=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;for(const child of children)child.kill('SIGTERM');});
async function worker(){while(pending.length&&!stopped){const app=pending.shift();let run=null;
  for(let attempt=1;attempt<=2&&!run&&!stopped;attempt++){
    let log='';const code=await new Promise(done=>{const child=spawn(process.execPath,['scripts/ml-application-corpus.mjs','--source-lock',values['source-lock'],'--application',app.id,'--holdout'],{windowsHide:true,stdio:['ignore','pipe','pipe']});children.add(child);child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});child.on('exit',code=>{children.delete(child);done(code);});child.on('error',()=>{children.delete(child);done(-1);});});
    await writeFile(resolve(directory,`${app.id}-attempt-${attempt}.log`),log,{flag:'wx'});
    if(code===0)run=log.match(/Saved private corpus to (.+?)\. Controlled provenance/)?.[1]??null;
    results.push({app:app.id,attempt,code,run});console.log(`${run?'PASS':'FAIL'} ${app.id}, attempt ${attempt}`);
  }
}}
await Promise.all([worker(),worker(),worker()]);
const runs=results.filter(r=>r.run).map(r=>r.run),complete=!stopped&&runs.length===lock.applications.length;
await writeFile(resolve(directory,'collection.json'),JSON.stringify({version:1,complete,sourceLock:resolve(values['source-lock']),attempts:results,runs},null,2),{flag:'wx'});
console.log(JSON.stringify({complete,families:runs.length,directory}));process.exitCode=complete?0:1;

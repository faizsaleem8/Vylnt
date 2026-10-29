import { build } from 'esbuild';
import { mkdir,access,writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
await mkdir('.local',{recursive:true});
await build({entryPoints:['tests/project-cookie-preference-acceptance.ts'],outfile:'.local/project-cookie-preference-acceptance.mjs',bundle:true,platform:'node',format:'esm',packages:'external',target:'node20'});
const cancellation=process.argv.includes('--cancel');let ready;
const child=spawn(process.execPath,['.local/project-cookie-preference-acceptance.mjs'],{stdio:['inherit',cancellation?'ignore':'inherit',cancellation?'ignore':'inherit','ipc'],windowsHide:true});
child.on('message',message=>{if(cancellation&&!ready&&message?.type==='preference-control-started'){ready=message;child.send({type:'cancel'},()=>{});}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(child.connected)child.send({type:'cancel'},()=>{});});
child.on('exit',async code=>{
  if(!cancellation){process.exitCode=code??2;return;}
  if(!ready||code===0)throw Error('Preference cancellation was not exercised');
  await access(ready.root).then(()=>{throw Error('Cancelled preference data was not removed');},error=>{if(error.code!=='ENOENT')throw error;});
  let alive=true;try{process.kill(ready.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
  if(alive)throw Error('Cancelled reference server remains running');
  await mkdir('test-results/cookie-preference',{recursive:true});await writeFile('test-results/cookie-preference/cancellation.json',JSON.stringify({passed:true,interruptedActiveControl:true,serverStopped:true,temporaryDataRemoved:true},null,2));
  console.log('Cookie preference active-control cancellation cleanup passed.');
});

import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { access,mkdir,writeFile } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
await build({entryPoints:['tests/native-jingo-acceptance.ts'],outfile:'.local/native-jingo-acceptance.mjs',bundle:true,platform:'node',format:'esm',packages:'external',target:'node20'});
const cancellation=process.argv.includes('--cancel');let ready;
const child=spawn(process.execPath,['.local/native-jingo-acceptance.mjs'],{env:{...process.env,VYLNT_NATIVE_COOKIE_VARIANT:process.argv.includes('--readable-cookies')?'readable':process.argv.includes('--cross-site-cookies')?'cross-site':'native'},stdio:['inherit',cancellation?'ignore':'inherit',cancellation?'ignore':'inherit','ipc'],windowsHide:true});
child.on('message',message=>{if(cancellation&&message?.type==='native-ready'){ready=message;child.send({type:'cancel'},()=>{});}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(child.connected)child.send({type:'cancel'},()=>{});});
child.on('exit',async code=>{
  if(!cancellation){process.exitCode=code??2;return;}
  if(!ready||code===0)throw Error('Native cancellation was not exercised');
  await access(ready.root).then(()=>{throw Error('Cancelled native data was not removed');},error=>{if(error.code!=='ENOENT')throw error;});
  let alive=true;try{process.kill(ready.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
  if(alive)throw Error('Cancelled native server is still running');
  await mkdir('test-results/native-projects',{recursive:true});await writeFile('test-results/native-projects/cancellation.json',JSON.stringify({passed:true,responseProfile:process.argv.includes('--readable-cookies')?'readable-cookie-attribute-control':'native',serverStopped:true,temporaryDataRemoved:true},null,2));
  console.log('Native cancellation cleanup passed. Server stopped and disposable data removed.');
});

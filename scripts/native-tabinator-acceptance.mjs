import {build} from 'esbuild';
import {spawn,execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
import {access,mkdir,writeFile} from 'node:fs/promises';

if(Number(process.versions.node.split('.')[0])<24){
  const runtime=process.env.VYLNT_NODE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin',process.platform==='win32'?'node.exe':'node');
  await access(runtime);if(Number(execFileSync(runtime,['-p','process.versions.node.split(".")[0]'],{timeout:5000,windowsHide:true}).toString().trim())<24)throw Error('Native SQLite oracle requires Node 24; set VYLNT_NODE');
  const child=spawn(runtime,[process.argv[1],...process.argv.slice(2)],{stdio:['inherit','inherit','inherit','ipc'],windowsHide:true});
  const cancel=()=>{if(child.connected)child.send({type:'cancel'},()=>{});};for(const signal of ['SIGINT','SIGTERM'])process.on(signal,cancel);
  child.on('error',()=>{process.exitCode=2;});child.on('exit',code=>{process.exitCode=code??2;});
}else{
  if(process.argv.includes('--seeds'))process.env.VYLNT_NATIVE_SEEDS='1';
  process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
  await build({entryPoints:['tests/native-tabinator-acceptance.ts'],outfile:'.local/native-tabinator-acceptance.mjs',bundle:true,platform:'node',format:'esm',packages:'external',target:'node24'});
  const cancellation=process.argv.includes('--cancel');let ready;
  const child=spawn(process.execPath,['.local/native-tabinator-acceptance.mjs'],{env:{...process.env,VYLNT_NATIVE_COOKIE_VARIANT:process.argv.includes('--readable-cookies')?'readable':'native'},stdio:['inherit',cancellation?'ignore':'inherit',cancellation?'ignore':'inherit','ipc'],windowsHide:true});
  const cancel=()=>{if(child.connected)child.send({type:'cancel'},()=>{});};for(const signal of ['SIGINT','SIGTERM'])process.on(signal,cancel);process.on('message',input=>{if(input?.type==='cancel')cancel();});
  child.on('message',input=>{if(cancellation&&input?.type==='native-ready'){ready=input;cancel();}});
  child.on('error',()=>{process.exitCode=2;});
  child.on('exit',async code=>{
    if(!cancellation){process.exitCode=code??2;if(process.connected)process.disconnect();return;}
    if(!ready||code===0)throw Error('Native cancellation was not exercised');
    await access(ready.root).then(()=>{throw Error('Cancelled native data still exists');},error=>{if(error.code!=='ENOENT')throw error;});
    let alive=true;try{process.kill(ready.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}if(alive)throw Error('Cancelled native process still running');
    await mkdir('test-results/native-projects',{recursive:true});await writeFile('test-results/native-projects/tabinator-cancellation.json',JSON.stringify({passed:true,serverStopped:true,temporaryDataRemoved:true},null,2));
    console.log('Tabinator cancellation cleanup passed; server stopped and disposable data removed.');
    if(process.connected)process.disconnect();
  });
}

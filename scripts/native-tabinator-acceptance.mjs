import {build} from 'esbuild';
import {spawn,execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
import {access,mkdir,writeFile} from 'node:fs/promises';
import {parseCrossSiteSessionProfile,parseSessionProfile} from './native-session-profile.mjs';

if(Number(process.versions.node.split('.')[0])<24){
  const runtime=process.env.VYLNT_NODE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin',process.platform==='win32'?'node.exe':'node');
  await access(runtime);if(Number(execFileSync(runtime,['-p','process.versions.node.split(".")[0]'],{timeout:5000,windowsHide:true}).toString().trim())<24)throw Error('Native SQLite oracle requires Node 24; set VYLNT_NODE');
  const child=spawn(runtime,[process.argv[1],...process.argv.slice(2)],{stdio:['inherit','inherit','inherit','ipc'],windowsHide:true});
  const cancel=()=>{if(child.connected)child.send({type:'cancel'},()=>{});};for(const signal of ['SIGINT','SIGTERM'])process.on(signal,cancel);
  const finish=code=>{process.exitCode=code??2;if(process.connected)process.disconnect();};
  process.on('message',input=>{if(input?.type==='cancel')cancel();});
  child.once('error',()=>finish(2));child.once('exit',finish);
}else{
  const sessionArg=process.argv.find(arg=>arg.startsWith('--session-profile='));
  const sessionProfile=sessionArg?.slice('--session-profile='.length);
  const editorArgs=process.argv.filter(arg=>arg.startsWith('--editor-profile='));
  const editorProfile=editorArgs[0]?.slice('--editor-profile='.length);
  const hstsArgs=process.argv.filter(arg=>arg.startsWith('--hsts-profile='));
  const hstsProfile=hstsArgs[0]?.slice('--hsts-profile='.length);
  const resourceArgs=process.argv.filter(arg=>arg.startsWith('--resource-profile='));
  const resourceProfile=resourceArgs[0]?.slice('--resource-profile='.length);
  const duplicateXfo=process.argv.includes('--framing-duplicate-deny');
  if(duplicateXfo&&process.argv.includes('--framing-policy'))throw Error('Select one framing profile.');
  const otherProfile=process.argv.some(arg=>['--readable-cookies','--tls','--framing-policy','--framing-duplicate-deny'].includes(arg));
  if(resourceArgs.length&&(resourceArgs.length!==1||sessionArg||editorArgs.length||hstsArgs.length||otherProfile||!['resource-http','resource-upgrade'].includes(resourceProfile)))throw Error('Select one supported resource profile.');
  if(hstsArgs.length&&(hstsArgs.length!==1||sessionArg||editorArgs.length||otherProfile||!['hsts-disabled','hsts-positive','hsts-missing','hsts-host','hsts-invalid','hsts-invalid-host','hsts-disable-active','hsts-activate-native'].includes(hstsProfile)))throw Error('Select one supported named HSTS profile.');
  if(editorArgs.length&&(editorArgs.length!==1||sessionArg||otherProfile||!['script-missing','script-early-meta','script-broad-response','script-broad-meta','script-layered-meta','script-hashed-response','script-eval-response','framed-write','framed-write-broad'].includes(editorProfile)))throw Error('Select one supported editor profile.');
  if(sessionArg&&(!(parseSessionProfile(sessionProfile)||parseCrossSiteSessionProfile(sessionProfile))||otherProfile))throw Error('Select one supported session matrix profile.');
  if(process.argv.includes('--seeds'))process.env.VYLNT_NATIVE_SEEDS='1';
  if(process.argv.includes('--tls'))process.env.VYLNT_NATIVE_TLS='1';
  if(process.argv.includes('--framing-policy'))process.env.VYLNT_NATIVE_FRAMING='1';
  if(duplicateXfo)process.env.VYLNT_NATIVE_FRAMING='duplicate-deny';
  process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
  await build({entryPoints:['tests/native-tabinator-acceptance.ts'],outfile:'.local/native-tabinator-acceptance.mjs',bundle:true,platform:'node',format:'esm',packages:'external',target:'node24'});
  const cancellation=process.argv.includes('--cancel');let ready;
  const child=spawn(process.execPath,['.local/native-tabinator-acceptance.mjs'],{env:{...process.env,VYLNT_NATIVE_HSTS_PROFILE:hstsProfile??'',VYLNT_NATIVE_EDITOR_PROFILE:editorProfile??'',VYLNT_NATIVE_RESOURCE_PROFILE:resourceProfile??'',VYLNT_NATIVE_COOKIE_VARIANT:sessionProfile??(process.argv.includes('--readable-cookies')?'readable':'native')},stdio:['inherit',cancellation?'ignore':'inherit',cancellation?'ignore':'inherit','ipc'],windowsHide:true});
  const cancel=()=>{if(child.connected)child.send({type:'cancel'},()=>{});};for(const signal of ['SIGINT','SIGTERM'])process.on(signal,cancel);process.on('message',input=>{if(input?.type==='cancel')cancel();});
  child.on('message',input=>{if(cancellation&&input?.type==='native-ready'){ready=input;cancel();}});
  child.on('error',()=>{process.exitCode=2;if(process.connected)process.disconnect();});
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

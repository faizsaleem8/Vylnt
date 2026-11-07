import {build} from 'esbuild';
import {spawn,execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {access,mkdir,writeFile} from 'node:fs/promises';
import {crossSiteSessionProfiles,sessionProfiles} from './native-session-profile.mjs';

const {values}=parseArgs({options:{family:{type:'string'},profile:{type:'string',default:'native'},cancel:{type:'boolean'},help:{type:'boolean'}}});
const sessions=['fieldpoint','yoyo-collection','bookwise','wikiflow','habit-tracker'],operations=['portal','personal-knowledge-manager','stockbase','8star-links','anonymous-notepad'];
if(values.help){console.log('Native development acquisition: --family '+[...sessions,...operations].join('|')+' [--profile native|framing] [--cancel]. Session families also support readable and the registered session-attribute matrix. BookWise, FieldPoint, Yoyo Collection and Habit Tracker support cross-site-cookie. BookWise and Yoyo Collection support native editor profiles. Existing pinned caches and locked dependencies required.');process.exit(0);}
const operation=operations.includes(values.family);
const crossSiteFamilies=['bookwise','fieldpoint','yoyo-collection','habit-tracker'];
const profiles=operation?['native','framing']:['native','readable','framing'];
if(values.family!=='anonymous-notepad')profiles.push('framing-duplicate-deny');
if(values.family==='8star-links')profiles.push('style-http','style-upgrade','module-http','module-upgrade');
if(['8star-links','portal','personal-knowledge-manager','anonymous-notepad','bookwise','yoyo-collection','fieldpoint','habit-tracker','wikiflow'].includes(values.family))
  profiles.push('hsts-disabled','hsts-positive','hsts-missing','hsts-host','hsts-invalid','hsts-invalid-host','hsts-disable-active','hsts-activate-native');
if(['8star-links','fieldpoint','bookwise','yoyo-collection'].includes(values.family))
  profiles.push('script-missing','script-early-meta','script-broad-response','script-broad-meta','script-layered-meta','script-hashed-response','script-eval-response');
if(sessions.includes(values.family))profiles.push(...sessionProfiles);
if(crossSiteFamilies.includes(values.family))profiles.push('cross-site-cookie');
if(values.family==='fieldpoint')profiles.push('cross-site-protected',...crossSiteSessionProfiles.flatMap(profile=>['protected-'+profile,'overbroad-'+profile]),
  'framed-write','resource-http','resource-upgrade','style-http','style-upgrade');
if(['bookwise','yoyo-collection','habit-tracker'].includes(values.family))profiles.push(...crossSiteSessionProfiles);
if(['bookwise','yoyo-collection'].includes(values.family))profiles.push('framed-write','resource-http','resource-upgrade','style-http','style-upgrade');
if(values.family==='habit-tracker')profiles.push('framed-write');
if(['bookwise','fieldpoint','habit-tracker','yoyo-collection'].includes(values.family))profiles.push('framed-write-broad');
if(![...sessions,...operations].includes(values.family)||!profiles.includes(values.profile))throw Error('Choose an explicitly supported family and response profile.');
const legacyNative=values.family==='wikiflow'||values.family==='personal-knowledge-manager'&&process.platform==='win32';
if(legacyNative&&!process.env.VYLNT_NATIVE_NODE20){
  const major=Number(process.versions.node.split('.')[0]);
  process.env.VYLNT_NATIVE_NODE20=major===20?process.execPath:execFileSync('node',['-p','process.execPath'],{windowsHide:true,timeout:5000}).toString().trim();
}
if(legacyNative&&Number(execFileSync(process.env.VYLNT_NATIVE_NODE20,['-p','process.versions.node.split(".")[0]'],{windowsHide:true,timeout:5000}).toString().trim())!==20)throw Error('Set VYLNT_NATIVE_NODE20 to the Node 20 runtime used to install this application\'s dependencies');
if(Number(process.versions.node.split('.')[0])<24){
  const runtime=process.env.VYLNT_NODE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin',process.platform==='win32'?'node.exe':'node');
  await access(runtime);if(Number(execFileSync(runtime,['-p','process.versions.node.split(".")[0]'],{timeout:5000,windowsHide:true}).toString().trim())<24)throw Error('Node 24 is required');
  const child=spawn(runtime,[process.argv[1],...process.argv.slice(2)],{stdio:['inherit','inherit','inherit','ipc'],windowsHide:true});
  const cancel=()=>{if(child.connected)child.send({type:'cancel'},()=>{});};for(const signal of ['SIGINT','SIGTERM'])process.on(signal,cancel);
  const finish=code=>{process.exitCode=code??2;if(process.connected)process.disconnect();};
  process.on('message',m=>{if(m?.type==='cancel')cancel();});
  child.once('error',()=>finish(2));child.once('exit',finish);
}else{
  process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
  const collector=operation?'native-operation-data':'native-expansion-data';
  const bundle=resolve('.local',collector+'-'+values.family+'.mjs');
  await build({entryPoints:['tests/'+collector+'.ts'],outfile:bundle,bundle:true,platform:'node',format:'esm',packages:'external',target:'node24'});
  const child=spawn(process.execPath,[bundle],{env:{...process.env,VYLNT_NATIVE_FAMILY:values.family,VYLNT_NATIVE_PROFILE:values.profile},stdio:['inherit',values.cancel?'ignore':'inherit','inherit','ipc'],windowsHide:true});
  let ready;const cancel=()=>{if(child.connected)child.send({type:'cancel'},()=>{});};
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,cancel);process.on('message',m=>{if(m?.type==='cancel')cancel();});
  child.on('message',m=>{if(values.cancel&&m?.type==='native-ready'){ready=m;cancel();}});
  child.on('error',()=>{process.exitCode=2;if(process.connected)process.disconnect();});
  child.on('exit',async code=>{
    if(!values.cancel){process.exitCode=code??2;if(process.connected)process.disconnect();return;}
    if(!ready||code===0)throw Error('Cancellation was not exercised');
    await access(ready.root).then(()=>{throw Error('Temporary data survived cancellation');},e=>{if(e.code!=='ENOENT')throw e;});
    try{process.kill(ready.pid,0);throw Error('Native process survived cancellation');}catch(e){if(e.code!=='ESRCH')throw e;}
    await mkdir('test-results/native-projects',{recursive:true});await writeFile(`test-results/native-projects/${values.family}-cancellation.json`,JSON.stringify({passed:true,temporaryDataRemoved:true,serverStopped:true},null,2));
    console.log('Native cancellation and cleanup passed.');if(process.connected)process.disconnect();
  });
}

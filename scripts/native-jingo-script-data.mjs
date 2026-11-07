import {build} from 'esbuild';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {access,mkdir,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {randomUUID} from 'node:crypto';
import {sessionProfiles,crossSiteSessionProfiles} from './native-session-profile.mjs';
const {values}=parseArgs({options:{profile:{type:'string'},transport:{type:'string'},session:{type:'string',multiple:true},cancel:{type:'boolean'},'named-hsts':{type:'boolean'}}});
if(values.profile&&!['missing','early-meta','late-meta','broad-response','broad-meta','layered-meta','hashed-response','eval-response','framed-write','framed-write-broad','framing-policy','framing-duplicate-deny'].includes(values.profile))throw Error('Choose a supported Jingo profile');
if(values.transport&&(values.profile||values.cancel||!['hsts-disabled','hsts-positive','hsts-missing','hsts-host','hsts-invalid','hsts-invalid-host','hsts-disable-active','hsts-activate-native','http-editor','https-upgrade-editor','http-style','https-upgrade-style'].includes(values.transport)))throw Error('Choose one supported transport profile');
if((values['named-hsts']&&!values.transport?.startsWith('hsts-'))||(['hsts-missing','hsts-host','hsts-invalid','hsts-invalid-host','hsts-disable-active','hsts-activate-native'].includes(values.transport)&&!values['named-hsts']))throw Error('Choose a supported named HSTS profile');
const sessions=[...new Set(values.session??[])];
if(sessions.length&&(values.profile||values.transport||values.cancel||sessions.some(id=>!sessionProfiles.includes(id)&&!crossSiteSessionProfiles.includes(id))))throw Error('Choose only supported session profiles');
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
await build({entryPoints:['tests/native-jingo-script-data.ts'],outfile:'.local/native-jingo-script-data.mjs',bundle:true,platform:'node',format:'esm',packages:'external',target:'node20'});
const profiles=values.cancel||values.transport?['missing']:values.profile?[values.profile]:['missing','early-meta','late-meta','broad-response','broad-meta'];
let interrupted=false;
for(const {profile,session} of sessions.length?sessions.map(session=>({profile:'missing',session})):profiles.map(profile=>({profile,session:''}))){
  await new Promise((done,reject)=>{
    let ready,failureStage='before ready';const startedAt=new Date().toISOString();
    const child=spawn(process.execPath,['.local/native-jingo-script-data.mjs'],{env:{...process.env,VYLNT_SCRIPT_PROFILE:profile,VYLNT_JINGO_TRANSPORT:values.transport??'',VYLNT_JINGO_SESSION:session,VYLNT_JINGO_NAMED_HSTS:values['named-hsts']?'1':''},stdio:['ignore',values.cancel?'ignore':'inherit',values.cancel?'ignore':'inherit','ipc'],windowsHide:true});
    const cancel=()=>{interrupted=true;if(child.connected)child.send({type:'cancel'},()=>{});};
    const message=input=>{if(input?.type==='cancel')cancel();};
    process.on('SIGINT',cancel);process.on('SIGTERM',cancel);process.on('message',message);
    const clear=()=>{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);process.removeListener('message',message);};
    child.on('message',input=>{if(input?.type==='failed'&&typeof input.stage==='string')failureStage=input.stage.slice(0,160);if(values.cancel&&input?.type==='native-ready'){ready=input;if(child.connected)child.send({type:'cancel'},()=>{});}});
    child.on('error',error=>{clear();reject(error);});
    child.on('exit',async code=>{
      clear();try{
        if(!values.cancel){if(code!==0||interrupted){
          await mkdir('test-results/native-projects/jingo-script-failures',{recursive:true});
          await writeFile('test-results/native-projects/jingo-script-failures/'+randomUUID()+'.json',JSON.stringify({version:1,startedAt,profile,transport:values.transport,session:session||undefined,stage:failureStage,exitCode:code,interrupted,accepted:false,modelEvaluated:false},null,2),{flag:'wx'});
          throw Error('Native script profile failed or cancelled');
        }done();return;}
        if(!ready||code===0)throw Error('Cancellation was not exercised');
        await access(ready.root).then(()=>{throw Error('Cancelled native data remains');},error=>{if(error.code!=='ENOENT')throw error;});
        let alive=true;try{process.kill(ready.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}if(alive)throw Error('Cancelled native process remains');
        await mkdir('test-results/native-projects',{recursive:true});await writeFile('test-results/native-projects/jingo-script-cancellation.json',JSON.stringify({passed:true,serverStopped:true,temporaryDataRemoved:true},null,2));
        console.log('Jingo script cancellation cleanup passed.');done();
      }catch(error){reject(error);}
    });
  });
}
if(process.connected)process.disconnect();

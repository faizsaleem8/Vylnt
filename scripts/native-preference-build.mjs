import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join,dirname,delimiter} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {loadPreferenceSource} from './native-preference-source.mjs';
import {preferenceProfile} from './native-preference-profile.mjs';

assert.ok(Number(process.versions.node.split('.')[0])>=24,'Use Node 24');
const {verified,destination}=await loadPreferenceSource();
const file='client/src/i18n.ts',original=verified.find(entry=>entry.file===file).bytes;
const path=join(destination,file);
assert.ok((await readFile(path)).equals(original),'Staged native source changed');
const env={};
for(const key of ['PATHEXT','SystemRoot','WINDIR','ComSpec','SystemDrive'])if(process.env[key])env[key]=process.env[key];
env.PATH=dirname(process.execPath)+delimiter+(process.env.PATH??process.env.Path??'');
env.APP_BUILD_OUT_DIR='dist-preference';
try{
  await writeFile(path,preferenceProfile(file,original.toString('utf8')));
  await new Promise((done,reject)=>{
    const child=spawn(process.execPath,['scripts/build.mjs'],{cwd:join(destination,'client'),env,windowsHide:true,stdio:'inherit'});
    let cancelled=false;
    const stop=()=>{
      cancelled=true;
      if(process.platform==='win32'&&child.pid)execFile('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000},()=>{});
      else child.kill('SIGTERM');
    };
    const timer=setTimeout(stop,120000);
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
    const finish=()=>{
      clearTimeout(timer);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
    };
    child.on('error',error=>{finish();reject(error);});
    child.on('exit',code=>{finish();code===0&&!cancelled?done():reject(Error('Native preference build failed or cancelled'));});
  });
}finally{await writeFile(path,original);}
assert.ok((await readFile(path)).equals(original));
console.log('Built declared native cookie-name profile. Original staged source restored.');

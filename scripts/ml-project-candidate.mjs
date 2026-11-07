import { build } from 'esbuild';
import { mkdir,mkdtemp,writeFile,rm } from 'node:fs/promises';
import { resolve,dirname,basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
await mkdir('.local',{recursive:true});
// Each command owns its feature module and JSON. Concurrent preflights must
// never import a partially rewritten bundle or replace another command's input.
const temporary=await mkdtemp(resolve('.local','project-candidate-command-'));
try{
  const modulePath=resolve(temporary,'features.mjs');
  await build({entryPoints:['packages/core/project-evidence.ts'],outfile:modulePath,bundle:true,platform:'node',format:'esm',packages:'external'});
  const {evidenceFeatureNames4}=await import(pathToFileURL(modulePath).href);
  if(!Array.isArray(evidenceFeatureNames4))throw Error('Project feature contract unavailable');
  const features=resolve(temporary,'features.json');
  await writeFile(features,JSON.stringify(evidenceFeatureNames4));
  const child=spawn(process.env.VYLNT_PYTHON??'python',['-B','ml/project_candidate.py',...process.argv.slice(2),'--features',features],{stdio:'inherit',windowsHide:true});
  const interrupt=()=>child.kill('SIGINT'),terminate=()=>child.kill('SIGTERM');
  process.on('SIGINT',interrupt);process.on('SIGTERM',terminate);
  try{
    process.exitCode=await new Promise(done=>{
      child.once('error',()=>{console.error('Python runtime unavailable. Set VYLNT_PYTHON to the installed ML runtime.');done(2);});
      child.once('exit',code=>done(code??2));
    });
  }finally{process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',terminate);}
}finally{
  // Only this uniquely created command directory is removed.
  if(dirname(resolve(temporary))!==resolve('.local')||!basename(temporary).startsWith('project-candidate-command-'))throw Error('Unexpected command cleanup path');
  await rm(temporary,{recursive:true,force:true});
}

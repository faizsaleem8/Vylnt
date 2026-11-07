import {build} from 'esbuild';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {rm} from 'node:fs/promises';

if(Number(process.versions.node.split('.')[0])<24)throw Error('Run this command using the prepared Node 24 runtime');
const bundle=resolve('.local','native-preference-probe-'+randomUUID()+'.mjs');
await build({entryPoints:['scripts/native-preference-probe.mjs'],outfile:bundle,
  bundle:true,platform:'node',format:'esm',packages:'external',target:'node24'});
const child=spawn(process.execPath,[bundle,...process.argv.slice(2)],
  {env:process.env,windowsHide:true,stdio:['inherit','inherit','inherit','ipc']});
const cancel=()=>{if(child.connected)child.send({type:'cancel'},()=>{});};
process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
child.on('error',()=>{process.exitCode=2;});
child.on('close',async code=>{
  process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);
  process.exitCode=code===0?0:2;await rm(bundle,{force:true});
});

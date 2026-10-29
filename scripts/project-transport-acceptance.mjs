import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
await mkdir('.local',{recursive:true});process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
await build({entryPoints:['tests/project-transport-acceptance.ts'],outfile:'.local/project-transport-acceptance.mjs',bundle:true,format:'esm',platform:'node',packages:'external'});
const child=spawn(process.execPath,['.local/project-transport-acceptance.mjs'],{stdio:['inherit','inherit','inherit','ipc'],windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(child.connected)child.send({type:'cancel'},()=>{});});
child.on('error',()=>{process.exitCode=2;});child.on('exit',code=>{process.exitCode=code??2;});

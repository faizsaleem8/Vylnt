import {build} from 'esbuild';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
await build({entryPoints:['tests/project-trusted-tls-acceptance.ts'],outfile:'.local/project-trusted-tls-acceptance.mjs',bundle:true,format:'esm',platform:'node',packages:'external'});
const child=spawn(process.execPath,['.local/project-trusted-tls-acceptance.mjs'],{stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{process.exitCode=2;});child.on('exit',code=>{process.exitCode=code??2;});

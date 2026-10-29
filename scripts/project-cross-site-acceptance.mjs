import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
await mkdir('.local',{recursive:true});process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
await build({entryPoints:['tests/project-cross-site-acceptance.ts'],outfile:'.local/project-cross-site-acceptance.mjs',bundle:true,platform:'node',format:'esm',packages:'external',target:'node20'});
const child=spawn(process.execPath,['.local/project-cross-site-acceptance.mjs'],{stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exitCode=code??2);

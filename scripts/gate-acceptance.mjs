import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
await mkdir('.local', { recursive: true });
await build({ entryPoints: ['tests/gate-acceptance.ts'], outfile: '.local/gate-acceptance.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', target: 'node20' });
const child = spawn(process.execPath, ['.local/gate-acceptance.mjs'], { stdio: 'inherit', windowsHide: true });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exitCode = code ?? 2);

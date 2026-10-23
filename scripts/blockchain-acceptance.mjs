import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
if (Number(process.versions.node.split('.')[0]) < 24) {
  const node = process.env.VYNLT_NODE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin', process.platform === 'win32' ? 'node.exe' : 'node');
  const child = spawn(node, [process.argv[1]], { stdio: 'inherit', windowsHide: true });
  child.on('exit', code => process.exit(code ?? 1));
} else {
  const { build } = await import('esbuild');
  await build({ entryPoints: ['tests/blockchain-acceptance.ts'], outfile: '.local/blockchain-acceptance.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  await import('../.local/blockchain-acceptance.mjs?' + Date.now());
}

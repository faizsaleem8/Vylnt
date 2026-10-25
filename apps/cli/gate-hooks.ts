import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, chmod, unlink, lstat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const execute = promisify(execFile);
const quote = (value: string) => { if (/[\r\n\0]/.test(value)) throw new Error('Unsupported hook path'); return "'" + value.replace(/'/g, "'\"'\"'") + "'"; };
function hookText(entry: string) {
  return `#!/bin/sh\n# VYLNT managed pre-push v1\nexec ${quote(process.execPath.replace(/\\/g, '/'))} ${quote(resolve(entry).replace(/\\/g, '/'))} --pre-push\n`;
}
export async function manageHook(repo: string, entry: string, remove = false) {
  const raw = (await execute('git', ['rev-parse', '--git-path', 'hooks/pre-push'], { cwd: repo, windowsHide: true })).stdout.trim();
  const path = resolve(repo, raw), text = hookText(entry);
  let existing: string | undefined;
  try { if ((await lstat(path)).isSymbolicLink()) throw new Error('Existing hook is a link; preserve it and integrate manually'); existing = await readFile(path, 'utf8'); }
  catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause; }
  // Accept only the exact former managed hook, not arbitrary hooks with a marker.
  const managed = existing?.replace('# VYNLT managed pre-push v1', '# VYLNT managed pre-push v1') === text;
  if (existing !== undefined && !managed) throw new Error('Existing pre-push hook is not this VYLNT installation; it was not changed. Integrate it manually.');
  if (remove) { if (managed) await unlink(path); return; }
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, text, { flag: existing ? 'w' : 'wx', mode: 0o755 }); await chmod(path, 0o755);
}

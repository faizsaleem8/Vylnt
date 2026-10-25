// Explicit network step. Downloads pinned browser assets, never runs upstream scripts.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { 'source-lock': { type: 'string' } } });
await mkdir('.local/ml-applications', { recursive: true });
const modulePath = resolve('.local/ml-applications/source-verifier.mjs');
await build({ entryPoints: ['packages/ml/application-corpus.ts'], bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { parseApplicationLock, sourceDigest, loadVerifiedApplication } = await import(pathToFileURL(modulePath).href);
const applications = parseApplicationLock(JSON.parse(await readFile(values['source-lock'] ?? 'ml/applications/sources.lock.json', 'utf8')));
const cache = resolve('.local/ml-applications/cache');
let downloaded = 0;
for (const app of applications) {
  for (const file of app.files) {
    const output = resolve(cache, app.id, file.path);
    try {
      const bytes = await readFile(output);
      if (sourceDigest(bytes) !== file.sha256 || bytes.length !== file.bytes) throw new Error(`Cached source differs from lock: ${app.id}/${file.path}`);
      continue;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const url = `https://raw.githubusercontent.com/${app.repository}/${app.revision}/${file.path}`;
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok || !response.body) throw new Error(`Pinned source download failed (${response.status})`);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > file.bytes) throw new Error('Pinned source exceeds expected size'); chunks.push(chunk); }
    const bytes = Buffer.concat(chunks);
    if (size !== file.bytes || sourceDigest(bytes) !== file.sha256) throw new Error(`Downloaded source differs from lock: ${app.id}/${file.path}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, bytes, { flag: 'wx', mode: 0o600 }); downloaded++;
  }
  await loadVerifiedApplication(app, cache);
}
console.log(`Verified ${applications.length} pinned application sources; downloaded ${downloaded} files. Licences retained; no dependency/build scripts executed.`);

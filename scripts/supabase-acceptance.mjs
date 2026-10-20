import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

await mkdir('.local', { recursive: true });
const entry = resolve('.local/supabase-acceptance.mjs');
await build({ entryPoints: ['apps/acceptance/server.ts'], bundle: true, outfile: entry, platform: 'node', format: 'esm', packages: 'external' });
await (await import(pathToFileURL(entry).href)).startAcceptance();

import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('dist/extension', { recursive: true });
for (const entry of ['background', 'content', 'popup', 'report']) {
  await build({ entryPoints: [`apps/extension/${entry}.ts`], bundle: true,
    outfile: `dist/extension/${entry}.js`, format: entry === 'background' ? 'esm' : 'iife',
    target: 'chrome120', sourcemap: true });
}
for (const name of ['manifest.json', 'popup.html', 'report.html', 'styles.css']) {
  await copyFile(`apps/extension/${name}`, `dist/extension/${name}`);
}
console.log('Built unpacked extension: dist/extension');
for (const entry of ['server', 'cli']) {
  await build({ entryPoints: [`apps/${entry}/index.ts`], bundle: true, outfile: `dist/${entry}/index.js`,
    platform: 'node', format: 'esm', packages: 'external', target: 'node20', sourcemap: true });
}
console.log('Built API server and CLI');

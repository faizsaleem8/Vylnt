import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';

await mkdir('dist/extension', { recursive: true });
for (const name of ['popup.html', 'popup.js', 'popup.js.map']) await rm(`dist/extension/${name}`, { force: true });
for (const entry of ['background', 'content', 'report']) {
  await build({ entryPoints: [`apps/extension/${entry}.ts`], bundle: true,
    outfile: `dist/extension/${entry}.js`, format: entry === 'background' ? 'esm' : 'iife',
    target: 'chrome120', sourcemap: true });
}
for (const name of ['manifest.json', 'report.html', 'styles.css']) {
  await copyFile(`apps/extension/${name}`, `dist/extension/${name}`);
}
await copyFile('packages/ui/theme.css', 'dist/extension/theme.css');
await mkdir('dist/extension/fonts', { recursive: true });
for (const name of ['plex-sans.ttf', 'OFL.txt']) {
  await copyFile(`packages/ui/fonts/${name}`, `dist/extension/fonts/${name}`);
}
console.log('Built unpacked extension: dist/extension');
for (const entry of ['server', 'cli']) {
  await build({ entryPoints: [`apps/${entry}/index.ts`], bundle: true, outfile: `dist/${entry}/index.js`,
    platform: 'node', format: 'esm', packages: 'external', target: 'node20', sourcemap: true });
}
console.log('Built API server and CLI');

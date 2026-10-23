import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [{ name: 'vynlt-font-license', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'font-license.txt', source: readFileSync(new URL('../../packages/ui/fonts/OFL.txt', import.meta.url), 'utf8') });
  } }],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4318', '/demo-api': 'http://127.0.0.1:4318' } },
  build: { outDir: '../../dist/dashboard', emptyOutDir: true, rollupOptions: { input: { dashboard: fileURLToPath(new URL('index.html', import.meta.url)), ledger: fileURLToPath(new URL('ledger.html', import.meta.url)) } } }
});

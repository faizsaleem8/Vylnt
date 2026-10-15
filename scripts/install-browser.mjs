import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
const require = createRequire(import.meta.url);
const result = spawnSync(process.execPath, [resolve(dirname(require.resolve('playwright/package.json')), 'cli.js'), 'install', 'chromium'], {
  stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: resolve('.local/browsers') }
});
process.exitCode = result.status ?? 1;

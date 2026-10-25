import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runGate } from './gate-runner';
import { manageHook } from './gate-hooks';
import { outgoingCommits } from './gate-config';

const { values } = parseArgs({ options: { repo: { type: 'string', default: '.' }, commit: { type: 'string', default: 'HEAD' }, output: { type: 'string', default: '.local/gate' }, 'pre-push': { type: 'boolean' }, 'install-hook': { type: 'boolean' }, 'uninstall-hook': { type: 'boolean' }, help: { type: 'boolean' } } });
const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => controller.abort());
try {
  if (values.help) console.log('VYLNT fresh security gate\n--repo <npm website git repo> --commit <HEAD|full SHA> --output <artifact parent>\n--install-hook | --uninstall-hook | --pre-push\nExit: 0 pass, 1 blocking findings, 2 execution/configuration failure. No exceptions.');
  else {
    const modes = [values['pre-push'], values['install-hook'], values['uninstall-hook']].filter(Boolean);
    if (modes.length > 1) throw new Error('Choose only one hook command');
    const repo = (await promisify(execFile)('git', ['rev-parse', '--show-toplevel'], { cwd: resolve(values.repo), windowsHide: true })).stdout.trim();
    const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(resolve(toolRoot, '.local/browsers'))) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(toolRoot, '.local/browsers');
    if (values['install-hook'] || values['uninstall-hook']) {
      await manageHook(repo, fileURLToPath(import.meta.url), Boolean(values['uninstall-hook']));
      console.log(values['uninstall-hook'] ? 'VYLNT hook removed (if installed).' : 'VYLNT pre-push hook installed. GitHub protection is still required.');
    } else {
      let commits = [values.commit];
      if (values['pre-push']) {
        let input = ''; for await (const chunk of process.stdin) { input += String(chunk); if (input.length > 1024 * 1024) throw new Error('Too many push updates'); }
        commits = outgoingCommits(input);
      }
      let exit = 0;
      for (const commit of commits) {
        const output = resolve(repo, values.output, randomUUID());
        const result = await runGate({ repo, commit, output, signal: controller.signal, summary: process.env.GITHUB_STEP_SUMMARY });
        exit = Math.max(exit, result.status === 'error' ? 2 : result.status === 'blocked' ? 1 : 0);
        if (controller.signal.aborted) break;
      }
      process.exitCode = exit;
    }
  }
} catch (cause) { console.error(cause instanceof Error ? cause.message : 'Gate unavailable'); process.exitCode = 2; }

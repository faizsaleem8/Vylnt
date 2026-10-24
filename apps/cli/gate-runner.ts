import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, mkdir, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { createServer } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { contentHash } from '../../packages/core/integrity';
import { evaluateGate, gatePolicy } from '../../packages/core/gate';
import { RULESET_VERSION } from '../../packages/core';
import { freezeInsights } from '../../packages/ml/frozen-insights';
import { scanPage } from './scanner';
import { gateConfigSchema } from './gate-config';

const execute = promisify(execFile);
const escape = (value: string) => value.replace(/[&<>"'`|\[\]()*_!\\]/g, ch => `&#${ch.charCodeAt(0)};`).replace(/[\r\n]/g, ' ');
export type GateResult = { version: 1; commit: string; policy: string; rulesetVersion: string; toolHash?: string; configHash?: string; status: 'passed' | 'blocked' | 'error'; error?: string; checks: { route: string; blocking: number; warnings: number; model: unknown; analysis: { inputSchema: string; decisionPolicy: string; remediationCatalog: string } }[] };

async function killTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') { await execute('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }).catch(() => {}); }
  else { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ } }
}
function childEnvironment(port?: number) {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'LANG', 'LC_ALL']) if (process.env[key]) env[key] = process.env[key];
  return { ...env, CI: 'true', HOST: '127.0.0.1', ...(port ? { PORT: String(port) } : {}) };
}
async function availablePort(port: number) {
  const server = createServer();
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
  const selected = (server.address() as { port: number }).port;
  await new Promise<void>(done => server.close(() => done())); return selected;
}
async function ready(url: string, ignore: boolean) {
  return new Promise<boolean>(done => {
    const request = (url.startsWith('https:') ? https : http).get(url, { rejectUnauthorized: !ignore, timeout: 1000 }, response => { response.resume(); done((response.statusCode ?? 500) < 400); });
    request.on('error', () => done(false)); request.on('timeout', () => { request.destroy(); done(false); });
  });
}
/** Execute trusted application scripts from an immutable local Git revision, never working-tree build output. */
export async function runGate(options: { repo: string; commit?: string; output: string; signal?: AbortSignal; summary?: string }): Promise<GateResult> {
  const repo = resolve(options.repo), output = resolve(options.output);
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(600000)]) : AbortSignal.timeout(600000);
  const children = new Set<ChildProcess>();
  const abort = () => { for (const child of children) void killTree(child); };
  signal.addEventListener('abort', abort);
  let temporary: string | undefined, stage = 'commit resolution';
  const result: GateResult = { version: 1, commit: options.commit ?? 'HEAD', policy: gatePolicy, rulesetVersion: RULESET_VERSION, status: 'error', checks: [] };
  const summary = ['# VYNLT security gate', '', 'Fresh commit scan · experimental ML does not decide the gate.', ''];
  const gitEnv = { ...process.env }; for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete gitEnv[name];
  const git = async (args: string[], cwd = repo) => (await execute('git', ['-c', 'core.hooksPath=' + join(temporary ?? tmpdir(), 'no-hooks'), ...args], { cwd, signal, env: gitEnv, windowsHide: true, maxBuffer: 16 * 1024 * 1024 })).stdout.trim();
  function start(args: string[], cwd: string, port?: number) {
    signal.throwIfAborted();
    // Script names are validated identifiers; cwd is never interpolated into shell text.
    const child = process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm.cmd ' + args.join(' ')], { cwd, env: childEnvironment(port), windowsHide: true, stdio: 'ignore' })
      : spawn('npm', args, { cwd, env: childEnvironment(port), detached: true, stdio: 'ignore' });
    children.add(child);
    let error: Error | undefined; child.on('error', cause => { error = cause; });
    const finished = new Promise<number | null>(done => { child.once('error', () => done(null)); child.once('exit', code => done(code)); });
    return { child, finished, error: () => error };
  }
  async function command(args: string[], cwd: string, timeout: number) {
    const task = start(args, cwd);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const code = await Promise.race([task.finished, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Command timed out')), timeout); })]);
      signal.throwIfAborted(); if (code !== 0 || task.error()) throw new Error('Command failed');
    } finally { clearTimeout(timer); await killTree(task.child); children.delete(task.child); }
  }
  try {
    result.toolHash = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
    if (!/^(?:HEAD|[0-9a-f]{40}(?:[0-9a-f]{24})?)$/.test(result.commit)) throw new Error('Use HEAD or a full commit SHA');
    result.commit = await git(['rev-parse', '--verify', result.commit + '^{commit}']);
    console.log(`VYNLT: checking exact commit ${result.commit}`);
    await mkdir(output, { recursive: true });
    temporary = await mkdtemp(join(tmpdir(), 'vynlt-gate-'));
    // Refuse links/submodules rather than following files outside the proposed tree.
    stage = 'snapshot validation';
    const tree = await git(['ls-tree', '-r', result.commit]);
    if (/^(120000|160000) /m.test(tree)) throw new Error('Symlinks/submodules are not supported by the gate');
    const checkout = join(temporary, 'checkout');
    await git(['clone', '--quiet', '--no-checkout', '--no-hardlinks', '--', repo, checkout]);
    await git(['checkout', '--quiet', '--detach', result.commit], checkout);
    stage = 'configuration';
    const config = gateConfigSchema.parse(JSON.parse(await readFile(join(checkout, '.vynlt/gate.json'), 'utf8')));
    result.configHash = await contentHash(config);
    const app = await realpath(resolve(checkout, config.directory));
    const rel = relative(await realpath(checkout), app);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep)) throw new Error('Application is outside snapshot');
    const pkg = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
    if (typeof pkg.scripts?.[config.startScript] !== 'string' || (config.buildScript && typeof pkg.scripts?.[config.buildScript] !== 'string')) throw new Error('Configured npm script missing');
    await readFile(join(app, 'package-lock.json'));
    stage = 'dependency installation'; console.log('VYNLT: installing locked application dependencies'); await command(['ci', '--ignore-scripts', '--no-audit', '--no-fund'], app, config.commandTimeoutMs);
    if (config.buildScript) { stage = 'application build'; await command(['run', config.buildScript], app, config.commandTimeoutMs); }
    stage = 'application startup';
    const port = await availablePort(config.port), origin = `${config.protocol}://127.0.0.1:${port}`;
    const application = start(['run', config.startScript], app, port);
    const deadline = Date.now() + config.readyTimeoutMs;
    while (true) {
      signal.throwIfAborted();
      if (application.error() || application.child.exitCode !== null || application.child.signalCode !== null) throw new Error('Application exited before scanning');
      if (await ready(origin + config.routes[0], config.ignoreHTTPSErrors)) break;
      if (Date.now() >= deadline) throw new Error('Application readiness timed out');
      await new Promise(done => setTimeout(done, 100));
    }
    for (const [index, route] of config.routes.entries()) {
      stage = 'fresh page scan'; signal.throwIfAborted();
      if (application.child.exitCode !== null || application.error()) throw new Error('Application stopped');
      console.log(`VYNLT: fresh scan ${index + 1}/${config.routes.length}`);
      const report = await scanPage(origin + route, { allowedLocalOrigins: [origin], ignoreHTTPSErrors: config.ignoreHTTPSErrors, signal, requireComplete: true });
      if (new URL(report.observation.url).origin !== origin) throw new Error('Unexpected scan origin');
      const policy = evaluateGate(report), insights = await freezeInsights(report);
      await writeFile(join(output, `page-${index + 1}.raw.json`), JSON.stringify(report, null, 2));
      await writeFile(join(output, `page-${index + 1}.insights.json`), JSON.stringify({ kind: 'vynlt-ci-insights-v1', commit: result.commit, contentHash: await contentHash(insights), content: insights, anchored: false }, null, 2));
      result.checks.push({ route, blocking: policy.blocking.length, warnings: policy.warnings.length, model: insights.analysis.model, analysis: { inputSchema: insights.analysis.inputSchema, decisionPolicy: insights.analysis.decisionPolicy, remediationCatalog: insights.analysis.remediationCatalog } });
      summary.push(`## Page ${index + 1}`, `${policy.blocking.length} blocking · ${policy.warnings.length} warnings`, '');
      for (const finding of [...policy.blocking, ...policy.warnings]) {
        const blocked = policy.blocking.includes(finding);
        console.log(`${blocked ? 'BLOCK' : 'WARN'} ${finding.ruleId} ${finding.severity}/${finding.confidence}: ${finding.title} — ${finding.url}\n  Fix: ${finding.recommendation}`);
        summary.push(`- **${blocked ? 'BLOCK' : 'WARN'} ${escape(finding.ruleId)}** ${escape(finding.title)} (${escape(finding.severity)}/${escape(finding.confidence)}). ${escape(finding.url)}. Fix: ${escape(finding.recommendation)}`);
      }
    }
    signal.throwIfAborted();
    if (application.child.exitCode !== null || application.error()) throw new Error('Application exited while scanning');
    result.status = result.checks.some(check => check.blocking > 0) ? 'blocked' : 'passed';
  } catch (cause) {
    const safeReasons = ['Command failed', 'Command timed out', 'Application exited before scanning', 'Application readiness timed out', 'Application stopped', 'Application exited while scanning', 'Unexpected scan origin', 'Gate collection budget exceeded', 'Required scan coverage or compatible ruleset is missing', 'Configured npm script missing', 'Symlinks/submodules are not supported by the gate'];
    const detail = cause instanceof Error && safeReasons.includes(cause.message) ? ` (${cause.message})` : '';
    result.status = 'error'; result.error = `Gate could not complete: ${stage}${signal.aborted ? ' (cancelled or timed out)' : detail}. Run the application scripts manually to diagnose; script output is not stored in reports.`;
  } finally {
    for (const child of children) await killTree(child);
    signal.removeEventListener('abort', abort);
    if (temporary) {
      // Only delete the exact directory allocated by mkdtemp, never a configured path.
      if (resolve(temporary).startsWith(resolve(tmpdir()) + sep) && temporary.split(sep).at(-1)?.startsWith('vynlt-gate-')) await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'gate-result.json'), JSON.stringify(result, null, 2));
    summary.push('', `**Result: ${result.status.toUpperCase()}**`, result.error ?? '', '', `Commit: ${escape(result.commit)}`, `Policy: ${gatePolicy}`, '', 'CI observations are not blockchain-anchored and do not establish exploitability.');
    await writeFile(join(output, 'summary.md'), summary.join('\n'));
    if (options.summary) await writeFile(options.summary, summary.join('\n') + '\n', { flag: 'a' });
    console.log(`VYNLT gate: ${result.status}. Artifacts: ${output}`);
    if (result.error) console.error(result.error);
  }
  return result;
}

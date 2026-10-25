import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import https from 'node:https';
import { runGate } from '../apps/cli/gate-runner';
import { manageHook } from '../apps/cli/gate-hooks';

const execute = promisify(execFile);
const root = await mkdtemp(resolve('.local/gate-acceptance-')), repo = join(root, 'website'), remote = join(root, 'remote.git');
const entry = resolve('dist/cli/gate.js');
const passed: string[] = [];
const pass = (name: string) => { passed.push(name); console.log('PASS:', name); };
const git = async (args: string[], cwd = repo) => (await execute('git', args, { cwd, windowsHide: true, maxBuffer: 4 * 1024 * 1024 })).stdout.trim();
const initial = { version: 1, directory: 'app', buildScript: 'build', startScript: 'start', protocol: 'https', ignoreHTTPSErrors: true, port: 0, routes: ['/', '/account'], readyTimeoutMs: 15000, commandTimeoutMs: 30000 };
let run = 0;
async function commit(name: string) { await git(['add', '--all']); await git(['commit', '-qm', name]); return git(['rev-parse', 'HEAD']); }
async function gate(sha: string, signal?: AbortSignal) { return runGate({ repo, commit: sha, output: join(root, 'run-' + ++run), signal }); }
async function failure(work: () => Promise<unknown>, pattern: RegExp) {
  let caught: unknown;
  try { await work(); } catch (cause) { caught = cause; }
  assert.ok(caught, 'Expected operation to fail');
  const error = caught as { stdout?: string; stderr?: string; message?: string };
  assert.match([error.stdout, error.stderr, error.message].join('\n'), pattern);
}
await mkdir(repo); await mkdir(join(repo, '.vynlt'));
await cp('examples/security-gate-demo', join(repo, 'app'), { recursive: true });
await writeFile(join(repo, 'app/security.json'), '{"mode":"secure"}');
await writeFile(join(repo, '.gitignore'), '.local/\n');
await writeFile(join(repo, '.vynlt/gate.json'), JSON.stringify(initial));
const serverPath = join(repo, 'app/server.mjs');
let server = await readFile(serverPath, 'utf8');
server = server.replace("'Content-Type': 'text/html',", "'Content-Type': 'text/html', 'Set-Cookie': 'preference=PRIVATE_COOKIE_VALUE; Secure; HttpOnly; SameSite=Lax',");
server = server.replace('<h1>Local security gate demo</h1>', '<h1>PRIVATE_PAGE_TEXT</h1>');
await writeFile(serverPath, server);
await git(['init', '-q', '-b', 'main']); await git(['config', 'user.name', 'VYLNT gate fixture']); await git(['config', 'user.email', 'fixture@example.invalid']);
await git(['init', '--bare', '-q', remote], root); await git(['remote', 'add', 'origin', remote]);
const secure = await commit('secure fixture');
assert.equal((await gate(secure)).status, 'passed');
await git(['push', '-q', 'origin', 'main']);
pass('committed secure application builds and passes fresh two-page scan');

await writeFile(join(repo, 'app/security.json'), '{"mode":"insecure"}');
const insecure = await commit('insecure fixture');
await writeFile(join(repo, 'app/security.json'), '{"mode":"secure"}');
const blocked = await gate(insecure);
assert.equal(blocked.status, 'blocked'); assert.equal(blocked.checks.length, 2); assert.ok(blocked.checks.every(row => row.blocking > 0));
pass('insecure exact commit is blocked despite an uncommitted working-tree fix');
for (const file of await readdir(join(root, 'run-2'))) {
  const text = await readFile(join(root, 'run-2', file), 'utf8');
  assert.ok(!/PRIVATE_COOKIE_VALUE|PRIVATE_PAGE_TEXT/.test(text), 'Artifacts contain no cookie values/page text');
}
await writeFile(join(repo, 'previous-report.json'), '{"status":"passed","review":"fixed"}');
await manageHook(repo, entry);
await failure(() => git(['push', 'origin', 'main']), /VYLNT gate: blocked/);
assert.equal(await git(['rev-parse', 'refs/heads/main'], remote), secure);
pass('actual pre-push hook rejects vulnerable code; old/fixed-labelled reports cannot clear it');

await git(['push', '--no-verify', '-q', 'origin', `${insecure}:refs/heads/bypassed`]);
assert.equal(await git(['rev-parse', 'refs/heads/bypassed'], remote), insecure);
assert.equal((await gate(insecure)).status, 'blocked');
pass('local hook bypass is demonstrably possible, but fresh CI-equivalent scan still fails');

const fixed = await commit('fix insecure reference');
await git(['push', '-q', 'origin', 'main']);
assert.equal(await git(['rev-parse', 'refs/heads/main'], remote), fixed);
pass('committed fix is rescanned and actual push succeeds');
await failure(() => git(['push', 'origin', `${fixed}:refs/heads/good`, `${insecure}:refs/heads/bad`]), /VYLNT gate: blocked/);
await failure(() => git(['rev-parse', '--verify', 'refs/heads/good'], remote), /unknown revision|Needed a single revision/);
pass('multi-ref push checks all distinct outgoing commits and rejects the push if any fails');

await manageHook(repo, entry, true);
await git(['config', 'core.hooksPath', '.custom-hooks']);
await manageHook(repo, entry); assert.equal(await git(['config', '--get', 'core.hooksPath']), '.custom-hooks');
await manageHook(repo, entry, true);
await writeFile(join(repo, '.custom-hooks/pre-push'), '#!/bin/sh\necho existing\n');
await assert.rejects(() => manageHook(repo, entry), /Existing pre-push/);
await assert.rejects(() => manageHook(repo, entry, true), /Existing pre-push/);
assert.match(await readFile(join(repo, '.custom-hooks/pre-push'), 'utf8'), /echo existing/);
await unlink(join(repo, '.custom-hooks/pre-push'));
pass('custom hook path is preserved; install/uninstall refuse to change another hook');

await writeFile(join(repo, '.vynlt/gate.json'), JSON.stringify({ ...initial, buildScript: 'missing' }));
assert.equal((await gate(await commit('missing script'))).status, 'error');
await writeFile(join(repo, '.vynlt/gate.json'), JSON.stringify({ ...initial, routes: ['/missing'], readyTimeoutMs: 1000 }));
assert.equal((await gate(await commit('unavailable page'))).status, 'error');
pass('missing scripts and unavailable pages fail closed rather than passing');

const listener = createServer(); await new Promise<void>(done => listener.listen(0, '127.0.0.1', done));
try {
  const port = (listener.address() as { port: number }).port;
  await writeFile(join(repo, '.vynlt/gate.json'), JSON.stringify({ ...initial, port }));
  assert.equal((await gate(await commit('occupied port'))).status, 'error');
  assert.equal(listener.listening, true);
} finally { await new Promise<void>(done => listener.close(() => done())); }
pass('occupied port cannot scan or kill an unrelated running server');

await writeFile(join(repo, '.vynlt/gate.json'), JSON.stringify(initial));
await writeFile(serverPath, server.replace('<h1>PRIVATE_PAGE_TEXT</h1>', '<h1>PRIVATE_PAGE_TEXT</h1>' + '<img src="/asset">'.repeat(301)));
const overBudget = await gate(await commit('collection budget fixture'));
assert.equal(overBudget.status, 'error'); assert.match(overBudget.error!, /Gate collection budget exceeded/);
await writeFile(serverPath, server);
pass('truncated DOM/resource collection cannot silently pass the gate');

await writeFile(join(repo, '.vynlt/gate.json'), JSON.stringify({ ...initial, buildScript: 'hang', commandTimeoutMs: 30000 }));
const pkg = JSON.parse(await readFile(join(repo, 'app/package.json'), 'utf8'));
pkg.scripts.hang = 'node -e "setInterval(()=>{},1000)"';
await writeFile(join(repo, 'app/package.json'), JSON.stringify(pkg));
const timedOut = await gate(await commit('bounded build timeout'));
assert.equal(timedOut.status, 'error'); assert.match(timedOut.error!, /application build.*Command timed out/);
const probe = createServer(); await new Promise<void>(done => probe.listen(0, '127.0.0.1', done));
const cancelPort = (probe.address() as { port: number }).port; await new Promise<void>(done => probe.close(() => done()));
await writeFile(join(repo, '.vynlt/gate.json'), JSON.stringify({ ...initial, port: cancelPort }));
const cancelCommit = await commit('cancel fixture');
const controller = new AbortController(); const running = gate(cancelCommit, controller.signal);
const deadline = Date.now() + 120000;
while (true) {
  const connected = await new Promise<boolean>(done => { const req = https.get(`https://127.0.0.1:${cancelPort}/`, { rejectUnauthorized: false, timeout: 1000 }, res => { res.resume(); done(true); }); req.on('error', () => done(false)); req.on('timeout', () => { req.destroy(); done(false); }); });
  if (connected) break;
  if (Date.now() >= deadline) { controller.abort(); throw new Error('Cancellation test application did not start'); }
  await new Promise(done => setTimeout(done, 100));
}
controller.abort(); assert.equal((await running).status, 'error');
const cleaned = createServer(); await new Promise<void>((done, reject) => { cleaned.once('error', reject); cleaned.listen(cancelPort, '127.0.0.1', done); }); await new Promise<void>(done => cleaned.close(() => done()));
pass('command timeouts and cancellation produce error artifacts and clean up owned processes');

await mkdir('test-results', { recursive: true });
await writeFile('test-results/gate-acceptance.json', JSON.stringify({ passed, failures: [], artifacts: root, scope: `local Git + real Chromium on ${process.platform}; no hosted GitHub protection claim` }, null, 2));
console.log('VYLNT gate acceptance passed:', passed.length);

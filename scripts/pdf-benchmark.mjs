import { fork, execFile, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cpus, platform, release, totalmem } from 'node:os';
import { build } from 'esbuild';

const execute = promisify(execFile);
const runs = Number((process.env.VYLNT_BENCH_RUNS ?? process.env.VYNLT_BENCH_RUNS) ?? 3);
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('VYLNT_BENCH_RUNS must be 1..10');
await mkdir('.local', { recursive: true });
await mkdir('test-results/pdf-benchmark', { recursive: true });
const modulePath = resolve('.local/pdf-benchmark-module.mjs');
await build({ stdin: { contents: `export { generatePdf } from './apps/server/pdf'; export { parseSubmission } from './packages/core/validation'; export { reportHash } from './apps/server/store';`, resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });

async function treeMemory(root) {
  const { stdout } = await execute('ps', ['-e', '-o', 'pid=,ppid=,rss='], { timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
  const rows = stdout.trim().split('\n').map(line => { const [pid, parent, rss] = line.trim().split(/\s+/).map(Number); return { pid, parent, bytes: rss * 1024 }; });
  const ids = new Set([root]);
  for (let changed = true; changed;) { changed = false; for (const p of rows) if (ids.has(p.parent) && !ids.has(p.pid)) { ids.add(p.pid); changed = true; } }
  const members = rows.filter(p => ids.has(p.pid));
  return { bytes: members.reduce((sum, p) => sum + p.bytes, 0), processes: members.length };
}

async function measure(profile, iteration) {
  const child = fork(resolve('scripts/pdf-benchmark-worker.mjs'), [], { env: { ...process.env, VYLNT_BENCH_MODULE: modulePath, VYLNT_BENCH_PROFILE: profile }, stdio: ['ignore', 'inherit', 'inherit', 'ipc'], windowsHide: true });
  let finished = false, peakBytes = 0, peakProcesses = 0, samples = 0, memoryError, result, sampling;
  const completion = new Promise((resolveDone, reject) => {
    child.on('error', reject);
    child.on('message', message => {
      if (message.type === 'ready') {
        const record = sample => { if (sample.processes) { samples++; peakBytes = Math.max(peakBytes, sample.bytes); peakProcesses = Math.max(peakProcesses, sample.processes); } };
        if (process.platform === 'win32') {
          // Start the persistent sampler before rendering so PowerShell startup does not hide short-lived children.
          sampling = new Promise(resolveSampling => {
            const monitor = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', resolve('scripts/pdf-memory-sampler.ps1')], { env: { ...process.env, VYLNT_BENCH_PID: String(child.pid) }, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
            let started = false;
            const start = () => { if (!started) { started = true; if (child.connected) child.send({ type: 'start' }); } };
            const timeout = setTimeout(() => { memoryError = 'Memory sampler startup timed out.'; monitor.kill(); start(); }, 10000);
            const lines = createInterface({ input: monitor.stdout });
            lines.on('line', line => { try { record(JSON.parse(line)); clearTimeout(timeout); start(); } catch { memoryError = 'Invalid memory sample.'; } });
            child.once('exit', () => monitor.kill());
            const done = () => { clearTimeout(timeout); lines.close(); if (!finished) memoryError = 'Memory sampler stopped before rendering completed.'; start(); resolveSampling(); };
            monitor.once('error', done); monitor.once('exit', done);
          });
          return;
        }
        sampling = (async () => {
          while (!finished) {
            try { record(await treeMemory(child.pid)); }
            catch { memoryError = 'OS process sampling unavailable; tree memory is not verified.'; }
            if (!finished) await new Promise(r => setTimeout(r, 250));
          }
        })();
        child.send({ type: 'start' });
      }
      if (message.type === 'result') result = message;
    });
    child.on('exit', code => { finished = true; code === 0 && result ? resolveDone() : reject(new Error(`Benchmark worker failed (${code})`)); });
  });
  await completion;
  await sampling;
  const { type, ...metrics } = result;
  return { profile, iteration, ...metrics, sampledTreePeakBytes: samples ? peakBytes : null, memorySamples: samples, maximumObservedProcesses: peakProcesses,
    ...(memoryError ? { memoryError } : {}), ...(peakProcesses < 2 ? { memoryWarning: 'Sampling did not observe Chromium children; tree peak is incomplete.' } : {}) };
}
const measurements = [];
for (const profile of ['typical', 'medium', 'large']) for (let iteration = 1; iteration <= runs; iteration++) {
  const value = await measure(profile, iteration); measurements.push(value);
  console.log(`${profile} ${iteration}/${runs}: ${value.status}, ${value.elapsedMs} ms, ${value.findingCount} findings, sampled tree ${value.sampledTreePeakBytes === null ? 'unavailable' : (value.sampledTreePeakBytes / 1048576).toFixed(1) + ' MiB'}`);
}
const result = { measuredAt: new Date().toISOString(), environment: { os: platform(), release: release(), node: process.version, cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem() },
  methodology: 'Fresh Node worker and Chromium for each render; sequential synthetic API-valid submissions. Elapsed time includes browser launch, font loading, PDF generation and browser shutdown, but excludes API/database/network. Tree working set/RSS is sampled with OS queries plus 250 ms between queries; it can miss peaks and double-count shared pages. Sampling overhead affects timing. Node peak RSS excludes Chromium. No real reports, credentials or process command lines are stored. These are local observations, not production capacity or maximum-input certification.', measurements };
await writeFile('test-results/pdf-benchmark/results.json', JSON.stringify(result, null, 2));
const lines = ['# VYLNT PDF benchmark', '', result.methodology, '', '| Profile | Run | Status | Findings | Time (ms) | PDF bytes | Node peak (MiB) | Sampled tree peak (MiB) | Samples |', '|---|---:|---|---:|---:|---:|---:|---:|---:|'];
for (const r of measurements) lines.push(`| ${r.profile} | ${r.iteration} | ${r.status} | ${r.findingCount} | ${r.elapsedMs} | ${r.pdfBytes ?? '-'} | ${(r.nodePeakRssBytes / 1048576).toFixed(1)} | ${r.sampledTreePeakBytes === null ? '-' : (r.sampledTreePeakBytes / 1048576).toFixed(1)} | ${r.memorySamples} |`);
await writeFile('test-results/pdf-benchmark/summary.md', lines.join('\n') + '\n');
if (measurements.some(r => r.status !== 'success')) process.exitCode = 1;

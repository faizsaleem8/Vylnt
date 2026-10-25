import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
const lstm = process.argv.includes('--lstm');
const output = lstm ? 'test-results/ml-lstm-demo' : 'test-results/ml-demo';

await mkdir('.local', { recursive: true });
await mkdir(output, { recursive: true });
const modulePath = resolve('.local/ml-demo.mjs');
await build({ stdin: { contents: `export * from './packages/ml/dataset'; export * from './packages/ml/sequence-dataset'; export { parseSubmission } from './packages/core/validation';`, resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const module = await import(pathToFileURL(modulePath).href);
const { parseSubmission } = module;
const datasetExample = lstm ? module.sequenceDatasetExample : module.datasetExample;
const datasetEnvelope = lstm ? module.sequenceDatasetEnvelope : module.datasetEnvelope;
const key = randomBytes(32).toString('hex'), examples = [];
// Synthetic, deliberately assigned labels exercise both classes per family.
// They are not independent evidence of impact and must never be presented as reviewed data.
for (let family = 0; family < 30; family++) for (const label of ['actionable', 'contextual']) {
  const report = parseSubmission({ scanId: randomUUID(), observation: { url: `https://fixture-${family}.example.test/page`, scannedAt: '2026-10-20T00:00:00Z', headers: {}, resources: lstm ? [{ url: 'http://asset.example.test/image.png', type: 'image', outcome: 'completed' }] : [], scripts: lstm ? [{ url: 'https://cdn.example.test/app.js', integrity: false }] : [], ...(lstm ? { cookies: [{ name: 'session', secure: false, httpOnly: false, sameSite: 'no_restriction', session: true }] } : {}), domCollected: true } });
  for (let index = 0; index < (lstm ? report.findings.length : 1); index++) examples.push(datasetExample(report, index, { familyId: `synthetic-family-${family}`, label, provenance: 'synthetic', reason: label === 'actionable' ? 'security-impact-confirmed' : 'intended-configuration' }, key));
}
await writeFile(output + '/dataset.json', JSON.stringify(datasetEnvelope(examples), null, 2));
const code = await new Promise((done, reject) => {
  const child = spawn((process.env.VYLNT_ML_PYTHON ?? process.env.VYNLT_ML_PYTHON) ?? 'python', [lstm ? 'ml/lstm.py' : 'ml/baseline.py', '--dataset', output + '/dataset.json', '--output', output + '/model'], { stdio: 'inherit', windowsHide: true });
  child.on('error', reject); child.on('exit', done);
});
process.exitCode = code ?? 1;

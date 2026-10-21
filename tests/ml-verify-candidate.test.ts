import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fixture from '../ml/fixtures/evidence-lstm-v3-parity.json';

const run = promisify(execFile), dirs: string[] = [];
const sha = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
afterEach(async () => { for (const path of dirs.splice(0)) { if (!path.startsWith(resolve('.local') + sep)) throw new Error('Unsafe test cleanup'); await rm(path, { recursive: true, force: true }); } });
async function setup(badScore = false) {
  // Fabricated artifact mechanics only. No security training/quality assertion.
  await mkdir('.local', { recursive: true });
  const root = await mkdtemp(resolve('.local/candidate-verify-')); dirs.push(root);
  const parity = structuredClone(fixture.parity);
  if (badScore) parity.cases[0].rawScore = parity.cases[0].rawScore < .5 ? 1 : 0;
  const files = { 'model.json': fixture.modelJson, 'logistic.json': '{}', 'training.json': '{}', 'parity.json': JSON.stringify(parity) };
  await Promise.all(Object.entries(files).map(([name, value]) => writeFile(`${root}/${name}`, value)));
  await writeFile(`${root}/candidate.json`, JSON.stringify({ version: 2, safetyPolicy: 'development-only-v2', datasetHash: fixture.model.datasetHash,
    splitHash: fixture.model.splitHash, files: Object.fromEntries(Object.entries(files).map(([name, value]) => [name, sha(value)])) }));
  return root;
}
const invoke = (root: string, output = `${root}/result.json`) => run(process.execPath, ['scripts/ml-verify-candidate.mjs', '--candidate', root, '--output', output]);
it('checks actual v3 runtime parity without consuming a holdout or creating a release', async () => {
  const root = await setup(); await invoke(root);
  const result = JSON.parse(await readFile(`${root}/result.json`, 'utf8'));
  expect(result).toMatchObject({ schemaVersion: 'vynlt-evidence-v3', qualification: 'not-assessed', parity: { cases: 32, tolerance: 1e-6 } });
  await expect(readFile(`${root}/test-consumed.json`)).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(invoke(root)).rejects.toThrow();
});
it('rejects changed artifact bytes and numerically incorrect hash-bound parity', async () => {
  const root = await setup(); await writeFile(`${root}/model.json`, '{}');
  await expect(invoke(root)).rejects.toThrow();
  const bad = await setup(true); await expect(invoke(bad)).rejects.toThrow();
  await expect(readFile(`${bad}/result.json`)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('refuses to overwrite candidate files', async () => {
  const root = await setup(); const before = await readFile(`${root}/candidate.json`, 'utf8');
  await expect(invoke(root, `${root}/candidate.json`)).rejects.toThrow();
  expect(await readFile(`${root}/candidate.json`, 'utf8')).toBe(before);
});
it('recognises the controlled v3 candidate policy without promoting a release', async () => {
  const root = await setup();
  const manifest = JSON.parse(await readFile(`${root}/candidate.json`, 'utf8'));
  await writeFile(`${root}/candidate.json`, JSON.stringify({ ...manifest, version: 3, safetyPolicy: 'controlled-evidence-v3' }));
  await invoke(root);
  const result = JSON.parse(await readFile(`${root}/result.json`, 'utf8'));
  expect(result.qualification).toBe('not-assessed');
});

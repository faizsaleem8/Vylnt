import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fixture from '../ml/fixtures/evidence-lstm-parity.json';
import { canonicalJson } from '../packages/core/integrity';

const run = promisify(execFile), dirs: string[] = [];
const sha = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
afterEach(async () => { for (const path of dirs.splice(0)) { if (!path.startsWith(resolve('.local') + sep)) throw new Error('Unsafe test cleanup'); await rm(path, { recursive: true, force: true }); } });

async function setup() {
  // Fabricated numeric/binding mechanics ONLY, not fitted security quality data.
  await mkdir('.local', { recursive: true }); const root = await mkdtemp(resolve('.local/experimental-command-')); dirs.push(root);
  const candidate = `${root}/candidate`; await mkdir(candidate);
  const rows = ['train', 'validation', 'test'].map((part, i) => ({ family: sha(part), variant: sha(canonicalJson(fixture.parity.cases[i % 2].sequence)), sequence: fixture.parity.cases[i % 2].sequence, category: 'HDR-001', severity: 'medium', label: i % 2 ? 'contextual' : 'change-warranted', provenance: 'controlled', evidenceRecord: sha('unit-only'), rulesetVersion: '0.2.0', uncertain: false }));
  const data = { schemaVersion: fixture.model.schemaVersion, featureNames: fixture.model.featureNames, examples: rows };
  const split = { families: Object.fromEntries(rows.map((r, i) => [r.family, ['train', 'validation', 'test'][i]])) };
  const model = { ...fixture.model, datasetHash: sha(canonicalJson(data)), splitHash: sha(canonicalJson(split)) };
  const modelJson = JSON.stringify(model), modelHash = sha(modelJson);
  const files: Record<string, string> = { 'model.json': modelJson, 'logistic.json': '{}', 'training.json': '{}', 'parity.json': JSON.stringify({ ...fixture.parity, modelHash }) };
  const manifest = JSON.stringify({ version: 2, safetyPolicy: 'development-only-v2', datasetHash: model.datasetHash, splitHash: model.splitHash, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, sha(v)])) });
  for (const [name, value] of Object.entries(files)) await writeFile(`${candidate}/${name}`, value);
  await writeFile(`${candidate}/candidate.json`, manifest); await writeFile(`${candidate}/split.json`, JSON.stringify(split));
  await writeFile(`${candidate}/test-consumed.json`, JSON.stringify({ candidateHash: sha(manifest), modelHash, datasetHash: model.datasetHash }));
  await writeFile(`${candidate}/evaluation.json`, JSON.stringify({ evaluationVersion: 2, safetyPolicy: 'development-only-v2', candidateHash: sha(manifest), modelHash, datasetHash: model.datasetHash, splitHash: model.splitHash, provenance: 'controlled', testFamilies: 1, categories: { 'HDR-001': { afterSafeguards: { sampleCount: 1 }, approved: false } } }));
  await writeFile(`${root}/dataset.json`, JSON.stringify(data)); return { root, candidate };
}
const invoke = (root: string, candidate: string) => run(process.execPath, ['scripts/ml-release-experimental.mjs', '--candidate', candidate, '--dataset', `${root}/dataset.json`, '--output', `${root}/release.json`]);
it('stages a clearly experimental display-only artifact without fabricated reviews or category approval', async () => {
  const { root, candidate } = await setup(); await invoke(root, candidate);
  const release = JSON.parse(await readFile(`${root}/release.json`, 'utf8'));
  expect(release.effect).toBe('display-only'); expect(release.evaluation.qualifiedCategories).toBe(0); expect(release.qualificationPolicy).toBe('vynlt-controlled-signal-v1');
});
it('rejects post-freeze parameter changes before writing an experimental release', async () => {
  const { root, candidate } = await setup(); await writeFile(`${candidate}/model.json`, '{}');
  await expect(invoke(root, candidate)).rejects.toThrow(); await expect(readFile(`${root}/release.json`)).rejects.toMatchObject({ code: 'ENOENT' });
});
it('rejects an absent or mismatched frozen test consumption marker', async () => {
  const { root, candidate } = await setup(); await writeFile(`${candidate}/test-consumed.json`, JSON.stringify({ candidateHash: 'f'.repeat(64) }));
  await expect(invoke(root, candidate)).rejects.toThrow();
});

import { afterEach, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fixture from '../ml/fixtures/evidence-lstm-parity.json';

const run = promisify(execFile), dirs: string[] = [];
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
afterEach(async () => { for (const dir of dirs.splice(0)) { if (!dir.startsWith(resolve('.local') + sep)) throw new Error('Invalid test cleanup path'); await rm(dir, { recursive: true, force: true }); } });
async function candidate(incorrectParity = false) {
  await mkdir('.local', { recursive: true }); const dir = await mkdtemp(resolve('.local/release-command-test-')); dirs.push(dir);
  // Fabricated mechanics only: never bundled and never a genuine application review.
  const model = { ...fixture.model, provenance: 'human-reviewed' };
  const modelJson = JSON.stringify(model);
  await writeFile(`${dir}/model.json`, modelJson);
  for (const f of ['logistic.json', 'training.json']) await writeFile(`${dir}/${f}`, '{}');
  const parity = structuredClone(fixture.parity);
  if (incorrectParity) parity.cases[0].rawScore = .1;
  await writeFile(`${dir}/parity.json`, JSON.stringify({ ...parity, modelHash: sha(modelJson) }));
  const files = Object.fromEntries(await Promise.all(['model.json', 'logistic.json', 'training.json', 'parity.json'].map(async f => [f, sha(await readFile(`${dir}/${f}`, 'utf8'))])));
  const manifest = JSON.stringify({ version: 2, safetyPolicy: 'development-only-v2', datasetHash: model.datasetHash, splitHash: model.splitHash, files });
  await writeFile(`${dir}/candidate.json`, manifest);
  const gates = Object.fromEntries(['tenTestFamilies', 'classCounts', 'classFamilies', 'precision', 'recall', 'coverage', 'noHighCriticalContextual', 'noInsufficientEvidenceDeemphasis', 'ruleComparator', 'reviewedApplicationScope'].map(k => [k, true]));
  const evaluation = { evaluationVersion: 2, safetyPolicy: 'development-only-v2', candidateHash: sha(manifest), modelHash: sha(modelJson), datasetHash: model.datasetHash, splitHash: model.splitHash, provenance: 'human-reviewed', testFamilies: 10,
    categories: { 'HDR-001': { approved: true, gates, afterSafeguards: { precision: .95, recall: .98, coverage: .6, precision95: [.8, 1], recall95: [.8, 1], coverage95: [.4, .8] }, classCounts: { 'change-warranted': 30, contextual: 30 }, classFamilies: { 'change-warranted': 3, contextual: 3 }, highCriticalContextual: 0, ruleOnly: { precision: .5, recall: 1 } } } };
  const text = JSON.stringify(evaluation); await writeFile(`${dir}/evaluation.json`, text);
  await writeFile(`${dir}/review.json`, JSON.stringify({ version: 1, independentApplicationReview: true, evaluationHash: sha(text), datasetHash: model.datasetHash, scope: 'UNIT MECHANICS ONLY; no real review', approvedCategories: ['HDR-001'] }));
  return dir;
}
const invoke = (dir: string) => run(process.execPath, ['scripts/ml-release-insights.mjs', '--model', `${dir}/model.json`, '--evaluation', `${dir}/evaluation.json`, '--review', `${dir}/review.json`, '--output', `${dir}/release.json`], { cwd: process.cwd() });
it('binds a staged release to frozen candidate, evaluation and review without bundling it', async () => {
  const dir = await candidate(); await invoke(dir);
  const release = JSON.parse(await readFile(`${dir}/release.json`, 'utf8'));
  expect(release.qualificationPolicy).toBe('vynlt-reviewed-release-v2'); expect(release.candidateHash).toMatch(/^[0-9a-f]{64}$/);
});
it('rejects a changed comparator even when the model and evaluation files are unchanged', async () => {
  const dir = await candidate(); await writeFile(`${dir}/logistic.json`, '{"tampered":true}');
  await expect(invoke(dir)).rejects.toMatchObject({ stderr: expect.stringContaining('changed after its frozen evaluation') });
});
it('rejects a frozen, hash-consistent candidate whose browser inference disagrees with Python', async () => {
  const dir = await candidate(true);
  await expect(invoke(dir)).rejects.toMatchObject({ stderr: expect.stringContaining('Python/browser LSTM parity failed') });
  await expect(readFile(`${dir}/release.json`)).rejects.toMatchObject({ code: 'ENOENT' });
});

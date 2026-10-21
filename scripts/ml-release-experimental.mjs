// Explicit developer-owned experimental release: never qualifies relevance or hides findings.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
const { values } = parseArgs({ options: { candidate: { type: 'string' }, dataset: { type: 'string' }, output: { type: 'string' }, bundle: { type: 'boolean', default: false } } });
if (!values.candidate || !values.dataset || !values.output) throw new Error('Use --candidate <frozen candidate directory> --dataset <private dataset> --output <new experimental release.json> [--bundle]');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const root = resolve(values.candidate), output = resolve(values.output);
if (output.startsWith(root + '/') || output.startsWith(root + '\\') || output === resolve(values.dataset)) throw new Error('Release output must not overwrite candidate or dataset');
await mkdir('.local', { recursive: true });
const modulePath = resolve(`.local/experimental-release-${randomUUID()}.mjs`);
await build({ stdin: { contents: "export { canonicalJson } from './packages/core/integrity'; export { parseEvidenceLstm } from './packages/core/evidence-lstm'; export { verifyCandidateParity } from './packages/ml/candidate-parity'; export { experimentalReleaseSchema } from './packages/ml/experimental-evidence'; export { assertPrivateMlPath } from './packages/ml/private-path'; export * from './packages/ml/bundled-evidence';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { canonicalJson, parseEvidenceLstm, verifyCandidateParity, experimentalReleaseSchema, assertPrivateMlPath, currentEvidenceRelease, archivedEvidenceReleases } = await import(pathToFileURL(modulePath).href);
assertPrivateMlPath(output);
const files = Object.fromEntries(await Promise.all(['model.json', 'logistic.json', 'parity.json', 'training.json', 'candidate.json', 'split.json', 'evaluation.json', 'test-consumed.json'].map(async name => [name, await readFile(resolve(root, name), 'utf8')])));
const model = parseEvidenceLstm(JSON.parse(files['model.json'])), candidate = JSON.parse(files['candidate.json']), evaluation = JSON.parse(files['evaluation.json']), split = JSON.parse(files['split.json']), consumed = JSON.parse(files['test-consumed.json']);
if (model.schemaVersion !== 'vynlt-evidence-v2') throw new Error('This release policy supports evidence-v2 only; v3 remains a developer experiment');
const datasetBytes = await readFile(values.dataset);
if (datasetBytes.length > 64 * 1024 * 1024) throw new Error('Dataset exceeds private preparation limit');
const data = JSON.parse(datasetBytes.toString());
if (model.provenance !== 'controlled' || evaluation.provenance !== 'controlled' || data.schemaVersion !== model.schemaVersion || canonicalJson(data.featureNames) !== canonicalJson(model.featureNames) || !Array.isArray(data.examples) || !data.examples.length || data.examples.some(r => r.provenance !== 'controlled')) throw new Error('Experimental release requires matching controlled data; never relabel reviews or synthetic fixtures');
if (candidate.version !== 2 || candidate.safetyPolicy !== 'development-only-v2' || evaluation.evaluationVersion !== 2 || evaluation.safetyPolicy !== candidate.safetyPolicy) throw new Error('Unsupported frozen evaluation policy');
const expectedFiles = ['model.json', 'logistic.json', 'parity.json', 'training.json'];
if (Object.keys(candidate.files ?? {}).sort().join() !== [...expectedFiles].sort().join() || expectedFiles.some(name => candidate.files[name] !== sha(files[name]))) throw new Error('Candidate files changed after freezing');
const modelHash = sha(files['model.json']), candidateHash = sha(files['candidate.json']);
if (candidateHash !== evaluation.candidateHash || candidateHash !== consumed.candidateHash || modelHash !== evaluation.modelHash || modelHash !== consumed.modelHash || model.datasetHash !== sha(canonicalJson(data)) || model.splitHash !== sha(canonicalJson(split)) || candidate.datasetHash !== model.datasetHash || candidate.splitHash !== model.splitHash || evaluation.datasetHash !== model.datasetHash || evaluation.splitHash !== model.splitHash || consumed.datasetHash !== model.datasetHash) throw new Error('Dataset, split, consumption marker or evaluation binding failed');
const test = data.examples.filter(r => split.families[r.family] === 'test');
const testFamilies = new Set(test.map(r => r.family)).size;
if (!test.length || testFamilies !== evaluation.testFamilies) throw new Error('Frozen test count mismatch');
for (const [rule, category] of Object.entries(evaluation.categories)) {
  if (category.afterSafeguards?.sampleCount !== test.filter(r => r.category === rule).length) throw new Error('Frozen category evaluation count mismatch');
}
const development = data.examples.filter(r => ['train', 'validation'].includes(split.families[r.family]) && !r.uncertain && !model.conflictVariants.includes(r.variant) && ['change-warranted', 'contextual'].includes(r.label));
const supportVariants = [...new Set(development.map(r => r.variant))].sort();
const supportedRules = [...new Set(development.map(r => r.category))].sort();
const parity = verifyCandidateParity(model, modelHash, JSON.parse(files['parity.json']), supportedRules);
const release = experimentalReleaseSchema.parse({ qualificationPolicy: 'vynlt-controlled-signal-v1', effect: 'display-only', name: 'VYNLT controlled LSTM / experimental',
  scope: `Developer-controlled local configurations only; ${new Set(data.examples.map(r => r.family)).size} application families. Cookie persistence is a fixture correlation and does not establish real application purpose. No category qualifies for de-emphasis.`,
  candidateHash, evaluationHash: sha(files['evaluation.json']), modelHash, datasetHash: model.datasetHash, splitHash: model.splitHash, modelJson: files['model.json'],
  supportedRules, supportVariants, evaluation: { testFamilies, testExamples: test.length, qualifiedCategories: 0 } });
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(release, null, 2), { flag: 'wx', mode: 0o600 });
if (values.bundle) {
  const archive = [...archivedEvidenceReleases];
  if (currentEvidenceRelease && canonicalJson(currentEvidenceRelease) !== canonicalJson(release) && !archive.some(r => canonicalJson(r) === canonicalJson(currentEvidenceRelease))) archive.push(currentEvidenceRelease);
  await writeFile('packages/ml/bundled-evidence.ts', `import type { EvidenceRelease } from './evidence-release';\nexport const currentEvidenceRelease: EvidenceRelease | null = ${JSON.stringify(release)};\nexport const archivedEvidenceReleases: EvidenceRelease[] = ${JSON.stringify(archive)};\n`);
}
console.log(`Prepared display-only controlled LSTM; ${parity.cases} parity cases passed, maximum error ${parity.maximumError}. Frozen test: ${test.length} examples / ${testFamilies} families. Zero categories qualified; evaluation failures are retained, findings unchanged.`);

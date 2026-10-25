// Extend a frozen developer corpus only from a complete, independently checked run.
// Private inputs/keys are never printed or included in published evaluations.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const { values } = parseArgs({ options: { 'base-manifest': { type: 'string' }, 'base-dataset': { type: 'string' }, run: { type: 'string' }, output: { type: 'string' } } });
if (Object.values(values).length !== 4) throw new Error('Use --base-manifest --base-dataset --run --output <new private directory>');
const secret = process.env.VYLNT_ML_DATASET_KEY ?? process.env.VYNLT_ML_DATASET_KEY;
if (!secret || secret.length < 32) throw new Error('The original private dataset key is required to preserve family identities');
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const sha = x => createHash('sha256').update(x).digest('hex');
const root = resolve(values.output), run = resolve(values.run);
await mkdir('.local', { recursive: true });
const bundle = resolve(`.local/corpus-extension-${randomUUID()}.mjs`);
await build({ stdin: { contents: "export { prepareInsightData, assertPrivateMlPath } from './packages/ml/prepare-insight-data'; export { canonicalJson } from './packages/core/integrity';", resolveDir: process.cwd() }, bundle: true, outfile: bundle, format: 'esm', platform: 'node', packages: 'external' });
const { prepareInsightData, assertPrivateMlPath, canonicalJson } = await import(pathToFileURL(bundle).href);
assertPrivateMlPath(resolve(root, 'dataset.json'));
const prior = await json(values['base-dataset']);
const baseManifest = await json(values['base-manifest']);
const current = await json(resolve(run, 'manifest.json'));
const summary = await json(resolve(run, 'summary.json'));
const records = await json(resolve(run, 'oracle-records.json'));
if (baseManifest.version !== 2 || current.version !== 2 || !Array.isArray(records) || summary.passed !== records.length || summary.provenance !== 'controlled'
    || !records.length || records.some(r => r.behavior?.passed !== true || r.oracle?.configurationPassed !== true || r.sourceLockHash !== summary.sourceLockHash || r.harnessHash !== summary.harnessHash)) throw new Error('Incomplete or inconsistent controlled run');
if (summary.sourceLockHash !== sha(await readFile('ml/applications/sources.lock.json'))) throw new Error('Source lock differs from completed run');
if (new Set(records.map(r => r.familyId)).size !== summary.sourceFamilies) throw new Error('Application family count disagrees');
if (current.examples?.length !== summary.annotations || summary.annotations !== records.length
    || new Set(records.map(r => r.evidenceRecord)).size !== records.length) throw new Error('Missing or duplicated oracle annotations');
const load = async (manifest, base) => {
  if (!Array.isArray(manifest.examples) || manifest.examples.length > 50000) throw new Error('Invalid manifest');
  return Promise.all(manifest.examples.map(async annotation => ({ report: await json(resolve(base, annotation.reportFile)), annotation })));
};
const base = await load(baseManifest, dirname(resolve(values['base-manifest'])));
const original = prepareInsightData(base, secret, prior.schemaVersion).dataset;
if (canonicalJson(original) !== canonicalJson(prior)) throw new Error('Original dataset no longer reproduces exactly; do not rename or remap families');
const added = await load(current, run);
const matchedRecords = new Set();
for (const input of added) {
  const record = records.find(r => r.evidenceRecord === input.annotation.evidenceRecord);
  if (!record || record.familyId !== input.annotation.familyId || record.label !== input.annotation.label
      || record.reportHash !== sha(JSON.stringify(input.report))) throw new Error('New annotation lacks matching completed oracle evidence');
  matchedRecords.add(record.evidenceRecord);
}
if (matchedRecords.size !== records.length) throw new Error('Every completed oracle case must have exactly one annotation');
const { dataset, audit } = prepareInsightData([...base, ...added], secret, prior.schemaVersion);
const rows = new Map(dataset.examples.map(r => [`${r.family}/${r.variant}/${r.label}`, canonicalJson(r)]));
if (prior.examples.some(r => rows.get(`${r.family}/${r.variant}/${r.label}`) !== canonicalJson(r))) throw new Error('Extension changed an existing frozen example');
await mkdir(dirname(root), { recursive: true });
await mkdir(root);
const save = (name, value) => writeFile(resolve(root, name), JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
await save('dataset.json', dataset);
await save('dataset.json.audit.json', audit);
await save('manifest.json', { version: 2, examples: [...baseManifest.examples.map(a => ({ ...a, reportFile: resolve(dirname(resolve(values['base-manifest'])), a.reportFile) })), ...current.examples.map(a => ({ ...a, reportFile: resolve(run, a.reportFile) }))] });
await save('lineage.json', { version: 1, baseDatasetHash: sha(canonicalJson(prior)), datasetHash: sha(canonicalJson(dataset)), sourceLockHash: summary.sourceLockHash,
  runSummaryHash: sha(await readFile(resolve(run, 'summary.json'))), addedOracleScenarios: summary.passed, originalExamples: prior.examples.length,
  combinedExamples: dataset.examples.length, originalExamplesPreserved: true, originalFamilyIdentitiesPreserved: true,
  limitation: 'Additional configurations on existing families; not new independent applications or fresh held-out evaluation.' });
console.log(`Preserved ${prior.examples.length} original rows/identities; ${dataset.examples.length} combined rows from ${summary.passed} additional passing scenarios. No model trained or test evaluated.`);

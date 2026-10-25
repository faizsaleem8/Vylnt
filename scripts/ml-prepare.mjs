import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const { values } = parseArgs({ options: { manifest: { type: 'string' }, output: { type: 'string' }, sequence: { type: 'boolean', default: false } } });
if (!values.manifest || !values.output) throw new Error('Use --manifest <private annotation manifest.json> --output <dataset.json>');
const secret = (process.env.VYLNT_ML_DATASET_KEY ?? process.env.VYNLT_ML_DATASET_KEY) ?? '';
if (secret.length < 32) throw new Error('Set VYLNT_ML_DATASET_KEY to a private random key of at least 32 characters');
const manifestPath = resolve(values.manifest), output = resolve(values.output);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.version !== 1 || !Array.isArray(manifest.examples) || !manifest.examples.length || manifest.examples.length > 50000) throw new Error('Expected manifest version 1 with 1..50000 examples');
await mkdir('.local', { recursive: true });
const modulePath = resolve('.local/ml-dataset.mjs');
await build({ stdin: { contents: "export * from './packages/ml/dataset'; export * from './packages/ml/sequence-dataset';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const module = await import(pathToFileURL(modulePath).href);
const datasetExample = values.sequence ? module.sequenceDatasetExample : module.datasetExample;
const datasetEnvelope = values.sequence ? module.sequenceDatasetEnvelope : module.datasetEnvelope;
const examples = [], ids = new Set(), scanFamilies = new Map();
for (const item of manifest.examples) {
  if (!item || typeof item.reportFile !== 'string' || !Number.isInteger(item.findingIndex) || item.findingIndex < 0) throw new Error('Every annotation needs reportFile and a nonnegative findingIndex');
  const reportPath = resolve(dirname(manifestPath), item.reportFile);
  if (output === reportPath || output === manifestPath) throw new Error('Dataset output must not overwrite input files');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const row = datasetExample({ scanId: report.scanId, observation: report.observation, rulesetVersion: report.rulesetVersion }, item.findingIndex, { familyId: item.familyId, label: item.label, provenance: item.provenance, reason: item.reason }, secret);
  if (ids.has(row.sampleId)) throw new Error('Duplicate finding annotation; resolve conflicting/duplicate reviews');
  if (scanFamilies.has(row.scanGroup) && scanFamilies.get(row.scanGroup) !== row.siteGroup) throw new Error('One scan cannot belong to multiple application families');
  scanFamilies.set(row.scanGroup, row.siteGroup); ids.add(row.sampleId); examples.push(row);
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(datasetEnvelope(examples), null, 2), { mode: 0o600 });
console.log(`Prepared ${examples.length} feature-only examples. Independently verify application-family grouping before training.`);

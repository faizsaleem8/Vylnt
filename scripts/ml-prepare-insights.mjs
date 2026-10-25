// Developer-only. Private manifests/reports stay outside the shipped application.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
const { values } = parseArgs({ options: { manifest: { type: 'string' }, output: { type: 'string' }, schema: { type: 'string', default: 'vynlt-evidence-v2' } } });
if (!values.manifest || !values.output) throw new Error('Use --manifest <developer review manifest> --output <private dataset.json>');
const secret = (process.env.VYLNT_ML_DATASET_KEY ?? process.env.VYNLT_ML_DATASET_KEY);
if (!secret || secret.length < 32) throw new Error('Set a private VYLNT_ML_DATASET_KEY of at least 32 characters');
const manifestPath = resolve(values.manifest), output = resolve(values.output);
if (manifestPath === output || manifestPath === `${output}.audit.json`) throw new Error('Output must not overwrite manifest');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.version !== 2 || !Array.isArray(manifest.examples) || !manifest.examples.length || manifest.examples.length > 50000) throw new Error('Expected v2 review manifest');
await mkdir('.local', { recursive: true });
const modulePath = resolve('.local/insight-data.mjs');
await build({ entryPoints: ['packages/ml/prepare-insight-data.ts'], bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { prepareInsightData, assertPrivateMlPath } = await import(pathToFileURL(modulePath).href);
assertPrivateMlPath(output);
const inputs = [];
for (const item of manifest.examples) {
  if (!item || typeof item.reportFile !== 'string') throw new Error('Every annotation requires reportFile');
  const reportPath = resolve(dirname(manifestPath), item.reportFile);
  if (reportPath === output || reportPath === `${output}.audit.json`) throw new Error('Output must not overwrite a report');
  inputs.push({ report: JSON.parse(await readFile(reportPath, 'utf8')), annotation: item });
}
const { dataset, audit } = prepareInsightData(inputs, secret, values.schema);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(dataset, null, 2), { flag: 'wx', mode: 0o600 });
await writeFile(`${output}.audit.json`, JSON.stringify(audit, null, 2), { flag: 'wx', mode: 0o600 });
console.log(`Prepared ${dataset.examples.length} distinct family/context labels; ${audit.independentReviewedTargets} paired review targets. Controlled provenance is retained; user-prepared training data is not required.`);

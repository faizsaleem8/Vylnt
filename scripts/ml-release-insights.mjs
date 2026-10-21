import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const { values } = parseArgs({ options: { model: { type: 'string' }, evaluation: { type: 'string' }, review: { type: 'string' }, output: { type: 'string' }, bundle: { type: 'boolean', default: false } } });
if (!values.model || !values.evaluation || !values.review || !values.output) throw new Error('Use --model --evaluation --review <private independent application review record> --output <release.json> [--bundle]');
const hash = value => createHash('sha256').update(value).digest('hex');
const [modelJson, evaluationJson, reviewJson] = await Promise.all([values.model, values.evaluation, values.review].map(p => readFile(p, 'utf8')));
await mkdir('.local', { recursive: true });
const modulePath = resolve('.local/insight-release-check.mjs');
await build({ stdin: { contents: "export { parseEvidenceLstm } from './packages/core/evidence-lstm'; export * from './packages/ml/bundled-evidence';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { parseEvidenceLstm, currentEvidenceRelease, archivedEvidenceReleases } = await import(pathToFileURL(modulePath).href);
const model = parseEvidenceLstm(JSON.parse(modelJson)), evaluation = JSON.parse(evaluationJson), review = JSON.parse(reviewJson);
if (Buffer.byteLength(modelJson) > 128 * 1024) throw new Error('Model artifact exceeds 128 KiB');
if (model.provenance !== 'human-reviewed' || evaluation.provenance !== 'human-reviewed') throw new Error('Controlled/synthetic data cannot qualify application relevance');
if (evaluation.modelHash !== hash(modelJson) || model.datasetHash !== evaluation.datasetHash || model.splitHash !== evaluation.splitHash) throw new Error('Evaluation does not identify this frozen candidate');
if (review.version !== 1 || review.independentApplicationReview !== true || review.evaluationHash !== hash(evaluationJson) || review.datasetHash !== model.datasetHash || typeof review.scope !== 'string' || !review.scope.trim() || review.scope.length > 512 || !Array.isArray(review.approvedCategories) || !review.approvedCategories.length) throw new Error('Missing independent application review, scope or evaluation binding');
const categories = {};
for (const rule of review.approvedCategories) {
  const result = evaluation.categories[rule];
  const requiredGates = ['tenTestFamilies', 'classCounts', 'classFamilies', 'precision', 'recall', 'coverage', 'noHighCriticalContextual', 'ruleComparator', 'reviewedApplicationScope'];
  if (!result?.approved || !requiredGates.every(key => result.gates[key] === true) || !result.afterSafeguards.precision95 || !result.afterSafeguards.recall95 || !result.afterSafeguards.coverage95) throw new Error(`Category ${rule} failed evaluation/review gates`);
  categories[rule] = { changeCount: result.classCounts['change-warranted'], contextualCount: result.classCounts.contextual, changeFamilies: result.classFamilies['change-warranted'], contextualFamilies: result.classFamilies.contextual,
    precision: result.afterSafeguards.precision, recall: result.afterSafeguards.recall, coverage: result.afterSafeguards.coverage, highCriticalContextual: result.highCriticalContextual,
    rulePrecision: result.ruleOnly.precision, ruleRecall: result.ruleOnly.recall, testFamilies: evaluation.testFamilies };
}
const release = { name: review.name ?? 'VYNLT reviewed category LSTM', modelJson, modelHash: hash(modelJson), datasetHash: model.datasetHash, splitHash: model.splitHash, reviewRecordHash: hash(reviewJson), reviewedScope: review.scope, categories };
const output = resolve(values.output);
if ([values.model, values.evaluation, values.review].some(p => resolve(p) === output)) throw new Error('Output must not overwrite private inputs');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(release, null, 2), { flag: 'wx', mode: 0o600 });
if (values.bundle) {
  const archive = [...archivedEvidenceReleases];
  if (currentEvidenceRelease && currentEvidenceRelease.modelHash !== release.modelHash && !archive.some(r => r.modelHash === currentEvidenceRelease.modelHash)) archive.push(currentEvidenceRelease);
  await writeFile('packages/ml/bundled-evidence.ts', `import type { EvidenceRelease } from './evidence-release';\nexport const currentEvidenceRelease: EvidenceRelease | null = ${JSON.stringify(release)};\nexport const archivedEvidenceReleases: EvidenceRelease[] = ${JSON.stringify(archive)};\n`);
}
console.log(`Prepared ${Object.keys(categories).length} qualified categories with archived identities preserved. Independent review declarations remain a developer responsibility. Update PLAN.md and run the full regression before shipping.`);

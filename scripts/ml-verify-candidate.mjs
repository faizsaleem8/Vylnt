// Offline artifact integrity/parity, not model quality approval or release staging.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
const { values } = parseArgs({ options: { candidate: { type: 'string' }, output: { type: 'string' } } });
if (!values.candidate || !values.output) throw new Error('Use --candidate <frozen candidate directory> --output <new private parity result.json>');
const root = resolve(values.candidate), output = resolve(values.output);
let names = ['model.json', 'logistic.json', 'parity.json', 'training.json'];
if (['candidate.json', 'split.json', 'frozen-input.json', 'evaluation.json', 'test-consumed.json', ...names].some(name => resolve(root, name) === output)) throw new Error('Output must not overwrite candidate input');
const sha = data => createHash('sha256').update(data).digest('hex');
await mkdir('.local', { recursive: true });
const modulePath = resolve(`.local/candidate-verifier-${randomUUID()}.mjs`);
await build({ stdin: { contents: "export { parseEvidenceLstm } from './packages/core/evidence-lstm'; export { verifyCandidateParity } from './packages/ml/candidate-parity'; export { assertPrivateMlPath } from './packages/ml/private-path'; export { categoryCandidateSchema, categoryCandidateDecision } from './packages/ml/category-candidate';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { parseEvidenceLstm, verifyCandidateParity, assertPrivateMlPath, categoryCandidateSchema, categoryCandidateDecision } = await import(pathToFileURL(modulePath).href);
assertPrivateMlPath(output);
const candidateBytes = await readFile(resolve(root, 'candidate.json'));
const candidate = JSON.parse(candidateBytes);
const legacyPolicy = candidate.version === 2 && candidate.safetyPolicy === 'development-only-v2';
const controlledPolicy = candidate.version === 3 && candidate.safetyPolicy === 'controlled-evidence-v3';
const categoryPolicy = candidate.version === 4 && candidate.safetyPolicy === 'controlled-category-v4';
if (categoryPolicy) names = [...names, 'category-policy.json', 'registration.json', 'decision-parity.json'];
if (names.some(name => resolve(root, name) === output)) throw new Error('Output must not overwrite candidate input');
if ((!legacyPolicy && !controlledPolicy && !categoryPolicy) || Object.keys(candidate.files ?? {}).sort().join() !== [...names].sort().join()) throw new Error('Unsupported frozen candidate policy');
const files = Object.fromEntries(await Promise.all(names.map(async name => [name, await readFile(resolve(root, name))])));
if (names.some(name => sha(files[name]) !== candidate.files[name])) throw new Error('Candidate artifact changed after freezing');
const model = parseEvidenceLstm(JSON.parse(files['model.json']));
if ((controlledPolicy || categoryPolicy) && (model.schemaVersion !== 'vynlt-evidence-v3' || model.provenance !== 'controlled')) throw new Error('Controlled v3 policy requires compatible controlled evidence');
if (model.datasetHash !== candidate.datasetHash || model.splitHash !== candidate.splitHash) throw new Error('Candidate dataset/split identity mismatch');
let supportedCategories = [];
let decisionParityCases = 0;
if (categoryPolicy) {
  const policy = categoryCandidateSchema.parse(JSON.parse(files['category-policy.json']));
  const registration = JSON.parse(files['registration.json']);
  supportedCategories = Object.entries(policy.categories).filter(([, v]) => v.supported).map(([rule]) => rule);
  if (!supportedCategories.length || JSON.stringify(registration.categories) !== JSON.stringify(supportedCategories)
      || registration.datasetHash !== model.datasetHash || registration.splitHash !== model.splitHash
      || model.thresholds.contextual !== 0 || model.thresholds.change !== 1) throw new Error('Invalid category scope or enabled global fallback');
  // Fixed adversarial logits verify unsupported categories cannot be activated by saturation.
  for (const [rule, entry] of Object.entries(policy.categories)) if (!entry.supported) {
    for (const logit of [-1000, 0, 1000]) if (categoryCandidateDecision(logit, rule, policy) !== 'needs-review') throw new Error('Unsupported category did not abstain');
  }
  const decisions = JSON.parse(files['decision-parity.json']);
  if (decisions.version !== 1 || !Array.isArray(decisions.cases) || decisions.cases.length < 80 || decisions.cases.length > 160) throw new Error('Missing bounded decision parity cases');
  const covered = new Set();
  for (const item of decisions.cases) {
    if (!Object.hasOwn(policy.categories, item.category) || typeof item.logistic !== 'boolean' || !Number.isFinite(item.logit)
        || categoryCandidateDecision(item.logit, item.category, policy, item.logistic) !== item.expected) throw new Error('Category decision parity failed');
    covered.add(`${item.category}/${item.logistic}`);
  }
  if (covered.size !== 16) throw new Error('Decision parity must cover both classifiers and all eight categories');
  decisionParityCases = decisions.cases.length;
}
const parity = verifyCandidateParity(model, candidate.files['model.json'], JSON.parse(files['parity.json']), supportedCategories);
const result = { version: 1, schemaVersion: model.schemaVersion, candidateHash: sha(candidateBytes), modelHash: candidate.files['model.json'], modelBytes: files['model.json'].length,
  datasetHash: model.datasetHash, splitHash: model.splitHash, parity, ...(categoryPolicy ? { supportedDevelopmentCategories: supportedCategories, unsupportedAbstentionChecked: true, decisionParityCases } : {}), qualification: 'not-assessed', limitation: 'Numeric artifact integrity/parity only. This check does not consume test data, approve categories, or promote the active model.' };
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
console.log(`Verified ${result.schemaVersion}: ${parity.cases} parity cases, maximum error ${parity.maximumError}; ${result.modelBytes} bytes. No quality approval or release change.`);

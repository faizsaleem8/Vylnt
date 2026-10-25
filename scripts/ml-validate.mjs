// Offline developer validation. Never promotes a release or consumes a holdout.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';

const { values } = parseArgs({ options: {
  dataset: { type: 'string' }, candidate: { type: 'string' }, output: { type: 'string' },
  reproduce: { type: 'boolean', default: false },
} });

function execute(program, args) {
  const result = spawnSync(program, args, { encoding: 'utf8', timeout: 180_000, windowsHide: true,
    maxBuffer: 1024 * 1024, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  if (result.error || result.status !== 0) {
    // Inputs may contain private evidence; do not echo Python stack traces/data.
    throw new Error('ML validation subprocess failed. Check input identities, candidate policy and installed ML dependencies.');
  }
}

function markdown(audit) {
  const ready = audit.preflight;
  const percent = v => v == null ? 'Undefined' : `${(v * 100).toFixed(1)}%`;
  const lines = ['# VYLNT ML validation', '', `Status: **${audit.status}**.`, '',
    `Schema: \`${audit.schemaVersion}\`. Provenance: **${ready.provenance}**.`,
    `Dataset: \`${ready.datasetHash}\`.`, `Split: \`${ready.splitHash}\`.`, '',
    '## Engineering checks', '',
    audit.candidate ? `Frozen candidate integrity passed. Python/JavaScript parity: ${audit.parity.parity.cases} cases, maximum error ${audit.parity.parity.maximumError} (tolerance 1e-6).` : 'Dataset preflight only; candidate integrity/parity were not tested.',
    'No model was released, no source-candidate parameters changed and no held-out predictions were rerun.',
    audit.reproduction ? `Training reproduction: ${audit.reproduction.status}, ${audit.reproduction.epochs} epochs, seed ${audit.reproduction.seed}; both LSTM and logistic outputs match. No test was evaluated.` : 'Training reproduction was not requested.', '',
    '## Qualification coverage', '',
    `Test families: ${ready.partitions.test.families}/10; additional-family deficit: ${ready.testFamilyDeficit}.`,
    `Distinct numeric inputs: ${ready.uniqueInputVariants}; conflicting variants: ${ready.conflictingVariants} (${ready.developmentConflictingVariants} in development).`, '',
    '| Category | Train change/context | Validation change/context | Test change/context | Missing test change/context | Test class families |',
    '|---|---:|---:|---:|---:|---:|'];
  for (const [rule, value] of Object.entries(ready.categories)) {
    const pair = counts => `${counts['change-warranted']}/${counts.contextual}`;
    lines.push(`| ${rule} | ${pair(value.developmentClasses.train)} | ${pair(value.developmentClasses.validation)} | ${pair(value.testCounts)} | ${value.testDeficits['change-warranted'].examples}/${value.testDeficits.contextual.examples} | ${pair(value.testClassFamilies)} |`);
  }
  lines.push('', 'Counts are minima, not a promise that more examples will pass. Each category needs 30 examples of each class, with each class spanning at least three test families.', '');
  if (audit.evaluation?.status === 'record-consistent') {
    lines.push('## Previously frozen test results', '',
      'These are the existing historical results, checked for identity/count/gate consistency. They are not a fresh accuracy measurement.', '',
      '| Category | Guarded precision | Recall | Coverage | Failed gates |', '|---|---:|---:|---:|---|');
    for (const [rule, value] of Object.entries(audit.evaluation.categories)) {
      const m = value.afterSafeguards;
      lines.push(`| ${rule} | ${percent(m.precision)} | ${percent(m.recall)} | ${percent(m.coverage)} | ${value.failedGates.join(', ') || 'None'} |`);
    }
  }
  lines.push('', '## Next developer work', '',
    '1. Collect genuinely distinguishable controlled configurations across independent application families. Keep missing intent/context as Needs review.',
    '2. Retain original family identities and shared-input grouping. Do not multiply the same template to fill count deficits.',
    '3. Register a new candidate and untouched holdout before training; select parameters on training/validation only.',
    '4. Pass coverage preflight before consuming that holdout. Publish failed candidates and uncertainty intervals.',
    '5. Integrate a separately versioned qualified release only after category-level gates pass. Current dashboard findings remain visible.', '',
    'Human reviewer recruitment is not required for the controlled policy. Controlled results do not establish real-application accuracy.', '');
  return lines.join('\n');
}

try {
  if (!values.dataset || !values.output) throw new Error('Use --dataset <private dataset.json> [--candidate <frozen directory>] --output <new .local directory>');
  if (values.reproduce && !values.candidate) throw new Error('--reproduce requires --candidate');
  const output = resolve(values.output);
  const privateRoot = resolve('.local');
  if (!output.startsWith(privateRoot + (process.platform === 'win32' ? '\\' : '/'))) throw new Error('Output must be a new directory under .local/');
  // Exclusive directory and files protect frozen inputs and previous run records.
  await mkdir(privateRoot, { recursive: true });
  await mkdir(output);
  const auditPath = join(output, 'audit.json');
  const args = ['-B', 'ml/validation.py', '--dataset', resolve(values.dataset), '--output', auditPath];
  if (values.candidate) args.push('--candidate', resolve(values.candidate));
  if (values.reproduce) args.push('--reproduce');
  execute(process.env.VYLNT_ML_PYTHON || process.env.VYNLT_ML_PYTHON || 'python', args);
  const audit = JSON.parse(await readFile(auditPath, 'utf8'));
  if (values.candidate) {
    const parityPath = join(output, 'parity.json');
    execute(process.execPath, ['scripts/ml-verify-candidate.mjs', '--candidate', resolve(values.candidate), '--output', parityPath]);
    audit.parity = JSON.parse(await readFile(parityPath, 'utf8'));
    if (audit.parity.candidateHash !== audit.candidate.candidateHash) throw new Error('Candidate changed between checks');
  }
  const ready = audit.preflight.readyCategories.length === 8;
  const recorded = audit.evaluation?.approvedCategories.length === 8;
  audit.status = values.candidate && ready && recorded ? 'recorded-gates-pass-release-review-required' : 'qualification-blocked';
  audit.engineeringChecksPassed = true;
  await writeFile(join(output, 'validation.json'), JSON.stringify(audit, null, 2), { flag: 'wx', mode: 0o600 });
  await writeFile(join(output, 'validation.md'), markdown(audit), { flag: 'wx', mode: 0o600 });
  console.log(`VYLNT: ${audit.status}. Engineering checks passed; qualified release unchanged.`);
  console.log(`Test families: ${audit.preflight.partitions.test.families}/10. Coverage-ready categories: ${audit.preflight.readyCategories.length}/8.`);
  console.log(`Read ${join(output, 'validation.md')}`);
  process.exitCode = audit.status === 'qualification-blocked' ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'ML validation failed.');
  process.exitCode = 2;
}

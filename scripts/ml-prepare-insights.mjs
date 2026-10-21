// Developer-only. Private manifests/reports stay outside the shipped application.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHmac, createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
const { values } = parseArgs({ options: { manifest: { type: 'string' }, output: { type: 'string' } } });
if (!values.manifest || !values.output) throw new Error('Use --manifest <developer review manifest> --output <private dataset.json>');
const secret = process.env.VYNLT_ML_DATASET_KEY;
if (!secret || secret.length < 32) throw new Error('Set a private VYNLT_ML_DATASET_KEY of at least 32 characters');
const manifestPath = resolve(values.manifest), output = resolve(values.output);
if (manifestPath === output) throw new Error('Output must not overwrite manifest');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.version !== 2 || !Array.isArray(manifest.examples) || !manifest.examples.length || manifest.examples.length > 50000) throw new Error('Expected v2 review manifest');
await mkdir('.local', { recursive: true });
const modulePath = resolve('.local/insight-data.mjs');
await build({ stdin: { contents: "export * from './packages/core/evidence-context'; export * from './packages/core/validation';", resolveDir: process.cwd() }, bundle: true, outfile: modulePath, platform: 'node', format: 'esm', packages: 'external' });
const { parseSubmission, evidenceContext, evidenceFeatureNames, contextRequiresReview } = await import(pathToFileURL(modulePath).href);
const opaque = value => createHmac('sha256', secret).update(value).digest('hex');
const rows = [], seen = new Set(), reviews = new Map();
let duplicates = 0;
for (const item of manifest.examples) {
  if (!item.familyId || !item.evidenceRecord || !['change-warranted', 'contextual', 'needs-review'].includes(item.label) || !['controlled', 'human-reviewed'].includes(item.provenance)) throw new Error('Missing family, label or independent evidence provenance');
  if (item.provenance === 'controlled' && (!item.oracleVersion || !item.oraclePassed)) throw new Error('Controlled data requires a passed independent oracle record');
  if (item.provenance === 'human-reviewed' && (!item.reviewer || !item.reviewedAt || !item.reviewScope)) throw new Error('Application data requires private review attribution and scope');
  const reportPath = resolve(dirname(manifestPath), item.reportFile);
  if (reportPath === output) throw new Error('Output must not overwrite a report');
  const raw = JSON.parse(await readFile(reportPath, 'utf8'));
  const report = parseSubmission({ scanId: raw.scanId, observation: raw.observation });
  if (!Number.isInteger(item.findingIndex) || !report.findings[item.findingIndex]) throw new Error('Invalid finding position');
  const finding = report.findings[item.findingIndex], context = evidenceContext(report, finding);
  if (item.provenance === 'human-reviewed') {
    const key = opaque(`review-target:${report.scanId}:${finding.id}`);
    const entries = reviews.get(key) ?? [];
    const reviewer = opaque(`reviewer:${item.reviewer}`);
    if (entries.some(e => e.reviewer === reviewer)) throw new Error('One reviewer cannot count twice for the same finding');
    entries.push({ reviewer, label: item.label }); reviews.set(key, entries);
  }
  const family = opaque(`family:${item.familyId}`), variant = createHash('sha256').update(context.variant).digest('hex');
  const key = `${family}:${variant}:${item.label}`;
  if (seen.has(key)) { duplicates++; continue; } // Repeated resources/exports are not independent examples.
  seen.add(key);
  rows.push({ family, variant, sequence: context.sequence, category: finding.ruleId, severity: finding.severity,
    label: item.label, provenance: item.provenance, evidenceRecord: opaque(`record:${item.evidenceRecord}`),
    rulesetVersion: report.rulesetVersion, uncertain: contextRequiresReview(report, context) });
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ schemaVersion: 'vynlt-evidence-v2', featureNames: evidenceFeatureNames, examples: rows }, null, 2), { mode: 0o600 });
const paired = [...reviews.values()].filter(v => v.length >= 2);
const agreed = paired.filter(v => new Set(v.map(r => r.label)).size === 1).length;
await writeFile(`${output}.audit.json`, JSON.stringify({ version: 1, independentReviewedTargets: paired.length, exactAgreement: paired.length ? agreed / paired.length : null,
  disagreements: paired.length - agreed, repeatedContextLabelsRemoved: duplicates, familyCount: new Set(rows.map(r => r.family)).size,
  limitations: 'Reviewer identities are declarations, not attested independence. Controlled scenario labels are excluded from agreement. Identical-input label conflicts are separately audited by the frozen split command.' }, null, 2), { mode: 0o600 });
console.log(`Prepared ${rows.length} distinct family/context labels. Provenance declarations still require developer audit; users do not label data.`);

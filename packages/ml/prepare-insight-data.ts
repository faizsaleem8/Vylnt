import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { canonicalJson } from '../core/integrity';
import { parseSubmission } from '../core/validation';
import { evidenceContext, evidenceFeatureNames, contextRequiresReview } from '../core/evidence-context';
import { evidenceVersion3, evidenceFeatureNames3, prepareEvidenceContexts3 } from '../core/evidence-v3';
export { assertPrivateMlPath } from './private-path';

const annotation = z.object({ findingIndex: z.number().int().min(0), familyId: z.string().trim().min(1).max(200),
  label: z.enum(['change-warranted', 'contextual', 'needs-review']), provenance: z.enum(['controlled', 'human-reviewed']),
  evidenceRecord: z.string().trim().min(1).max(512), oracleVersion: z.string().min(1).max(100).optional(), oraclePassed: z.boolean().optional(),
  reviewer: z.string().trim().min(1).max(120).optional(), reviewedAt: z.iso.datetime().optional(), reviewScope: z.string().trim().min(1).max(512).optional() }).passthrough();
type Input = { report: unknown; annotation: unknown };
export function prepareInsightData(inputs: Input[], secret: string, version: 'vynlt-evidence-v2' | typeof evidenceVersion3 = 'vynlt-evidence-v2') {
  if (!['vynlt-evidence-v2', evidenceVersion3].includes(version)) throw new Error('Unsupported evidence version');
  if (secret.length < 32 || !inputs.length || inputs.length > 50000) throw new Error('Expected private dataset key and 1..50000 annotation inputs');
  const opaque = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  const sha = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
  const groups = new Map<string, { report: ReturnType<typeof parseSubmission>; findingIndex: number; family: string; provenance: 'controlled' | 'human-reviewed'; reviews: z.infer<typeof annotation>[] }>();
  const scanIdentity = new Map<string, { hash: string; family: string }>();
  for (const input of inputs) {
    const a = annotation.parse(input.annotation);
    const source = z.object({ scanId: z.string(), observation: z.unknown() }).passthrough().parse(input.report);
    const report = parseSubmission({ scanId: source.scanId, observation: source.observation });
    const sourceHash = sha({ scanId: report.scanId, observation: report.observation }), prior = scanIdentity.get(report.scanId);
    if (prior && (prior.hash !== sourceHash || prior.family !== a.familyId)) throw new Error('A scan cannot change evidence or belong to multiple application families');
    scanIdentity.set(report.scanId, { hash: sourceHash, family: a.familyId });
    if (!report.findings[a.findingIndex]) throw new Error('Invalid finding position');
    if (a.provenance === 'controlled' && (!a.oracleVersion || a.oraclePassed !== true)) throw new Error('Controlled data requires an independent passed oracle');
    if (a.provenance === 'human-reviewed' && (!a.reviewer || !a.reviewedAt || !a.reviewScope)) throw new Error('Application data requires private review attribution, date and scope');
    const key = `${sourceHash}:${report.findings[a.findingIndex].id}`;
    const group = groups.get(key);
    if (group) {
      if (group.provenance !== a.provenance) throw new Error('Do not mix controlled and application review provenance for one target');
      if (a.provenance === 'human-reviewed' && group.reviews.some(r => r.reviewer === a.reviewer)) throw new Error('One reviewer cannot count twice for the same finding');
      group.reviews.push(a);
    } else groups.set(key, { report, findingIndex: a.findingIndex, family: a.familyId, provenance: a.provenance, reviews: [a] });
  }
  const rows = [], seen = new Set<string>();
  let duplicates = 0, paired = 0, agreed = 0;
  for (const group of groups.values()) {
    const { report, reviews, family, provenance, findingIndex } = group;
    const labels = new Set(reviews.map(r => r.label));
    if (provenance === 'human-reviewed') {
      if (reviews.length < 2) throw new Error('Application targets require two distinct independent review declarations; use ml:review to track pending cases');
      paired++; if (labels.size === 1) agreed++;
    }
    // Annotation disagreements are one uncertain target, not two independent examples.
    const label = labels.size === 1 ? reviews[0].label : 'needs-review';
    const finding = report.findings[findingIndex], legacy = evidenceContext(report, finding);
    const context = version === evidenceVersion3 ? prepareEvidenceContexts3(report)(finding) : legacy;
    const variant = createHash('sha256').update(context.variant).digest('hex'), familyHash = opaque(`family:${family}`);
    const key = `${familyHash}:${variant}:${label}`;
    if (seen.has(key)) { duplicates++; continue; } seen.add(key);
    rows.push({ family: familyHash, variant, sequence: context.sequence, category: finding.ruleId, severity: finding.severity,
      label, provenance, evidenceRecord: opaque(`records:${canonicalJson(reviews.map(r => r.evidenceRecord).sort())}`),
      rulesetVersion: report.rulesetVersion, uncertain: contextRequiresReview(report, legacy) || (version === evidenceVersion3 && finding.ruleId === 'JS-002' && ['unknown', 'contradictory'].includes(String(context.facts.targetCspSourceConstraint))) });
  }
  return { dataset: { schemaVersion: version, featureNames: [...(version === evidenceVersion3 ? evidenceFeatureNames3 : evidenceFeatureNames)], examples: rows },
    audit: { version: 2, independentReviewedTargets: paired, exactAgreement: paired ? agreed / paired : null, disagreements: paired - agreed,
      repeatedContextLabelsRemoved: duplicates, familyCount: new Set(rows.map(r => r.family)).size,
      limitations: 'Review declarations are not attested identities. Same-target disagreements become one needs-review example. Different target contexts still undergo frozen input-conflict auditing.' } };
}

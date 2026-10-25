import type { Report } from '../core';
import { RULESET_VERSION } from '../core';
import { prepareEvidenceContexts, evidenceRules, contextRequiresReview } from '../core/evidence-context';
import { parseEvidenceLstm } from '../core/evidence-lstm';
import { predictSequence } from '../core/ml-lstm';
import type { AssessmentState } from '../core/insight-contracts';
import { buildInsightAnalysis } from './insight-analysis';
import { categoryQualifies, type CategoryQualification } from './release-gates';
import { currentEvidenceRelease } from './bundled-evidence';
import { analyseExperimentalEvidence, type ExperimentalEvidenceRelease } from './experimental-evidence';
import { analyseControlledCategory, type ControlledCategoryRelease } from './controlled-category-release';
export { archivedEvidenceReleases } from './bundled-evidence';

export interface ReviewedEvidenceRelease {
  qualificationPolicy: 'vynlt-reviewed-release-v2';
  candidateHash: string;
  evaluationHash: string;
  name: string;
  /** Exact offline artifact bytes encoded as UTF-8, SHA-256 bound to evaluation. */
  modelJson: string;
  modelHash: string;
  datasetHash: string;
  splitHash: string;
  reviewRecordHash: string;
  reviewedScope: string;
  categories: Record<string, CategoryQualification>;
}
export type EvidenceRelease = ReviewedEvidenceRelease | ExperimentalEvidenceRelease | ControlledCategoryRelease;
// Developer-owned release. No candidate may be silently promoted by an end user.
export const bundledEvidenceRelease: EvidenceRelease | null = currentEvidenceRelease;
const sha = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
export async function analyseEvidenceReport(report: Report, release: EvidenceRelease | null = bundledEvidenceRelease) {
  const fallback = buildInsightAnalysis(report);
  if (!release) return fallback;
  try {
    if (release.qualificationPolicy === 'vynlt-controlled-signal-v1') return await analyseExperimentalEvidence(report, release);
    if (release.qualificationPolicy === 'vylnt-controlled-category-release-v1') return await analyseControlledCategory(report, release);
    if (release.qualificationPolicy !== 'vynlt-reviewed-release-v2' || !/^[0-9a-f]{64}$/.test(release.candidateHash) || !/^[0-9a-f]{64}$/.test(release.evaluationHash)) throw new Error('Unsupported qualification policy');
    if (new TextEncoder().encode(release.modelJson).length > 128 * 1024 || !/^[0-9a-f]{64}$/.test(release.reviewRecordHash) || !release.reviewedScope || await sha(release.modelJson) !== release.modelHash) throw new Error('Unverified release identity');
    const model = parseEvidenceLstm(JSON.parse(release.modelJson));
    if (model.schemaVersion !== 'vynlt-evidence-v2' || model.provenance !== 'human-reviewed' || model.datasetHash !== release.datasetHash || model.splitHash !== release.splitHash || model.rulesetVersion !== report.rulesetVersion || report.rulesetVersion !== RULESET_VERSION) throw new Error('Unqualified release provenance or compatibility');
    const approved = evidenceRules.filter(rule => categoryQualifies(release.categories[rule]));
    if (!approved.length) throw new Error('No category passed release gates');
    const cache = new Map<string, AssessmentState>(), decisions = new Map<string, AssessmentState>();
    const extract = prepareEvidenceContexts(report);
    for (const finding of report.findings) {
      const context = extract(finding);
      if (!approved.includes(finding.ruleId as typeof approved[number])) { decisions.set(finding.id, 'needs-review'); continue; }
      let decision = cache.get(context.variant);
      if (!decision) {
        const conflict = model.conflictVariants.includes(await sha(context.variant));
        if (contextRequiresReview(report, context) || conflict || (model.thresholds.contextual === 0 && model.thresholds.change === 1)) decision = 'needs-review';
        else {
          const raw = Math.min(1 - 1e-15, Math.max(1e-15, predictSequence(model, context.sequence)));
          const score = 1 / (1 + Math.exp(-Math.log(raw / (1 - raw)) / model.calibration.temperature));
          decision = score >= model.thresholds.change ? 'change-warranted' : score <= model.thresholds.contextual ? 'contextual' : 'needs-review';
        }
        cache.set(context.variant, decision);
      }
      decisions.set(finding.id, decision);
    }
    const result = buildInsightAnalysis(report, { decisions, model: { name: release.name, hash: release.modelHash, status: 'qualified', approvedCategories: approved } });
    result.limitations = [`Model categories are qualified only within this independently reviewed scope: ${release.reviewedScope}. Other categories require review.`, ...fallback.limitations.slice(1)];
    return result;
  } catch {
    fallback.limitations.push('Configured model release failed identity, compatibility or qualification checks; evidence-summary mode remains active.');
    return fallback;
  }
}

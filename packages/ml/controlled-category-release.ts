import type { Report } from '../core';
import { RULESET_VERSION } from '../core';
import { canonicalJson } from '../core/integrity';
import { prepareEvidenceContexts, contextRequiresReview } from '../core/evidence-context';
import { prepareEvidenceContexts3 } from '../core/evidence-v3';
import { parseEvidenceLstm } from '../core/evidence-lstm';
import { predictSequence } from '../core/ml-lstm';
import type { AssessmentState } from '../core/insight-contracts';
import { categoryCandidateSchema, categoryCandidateDecision } from './category-candidate';
import { categoryQualifies, type CategoryQualification } from './release-gates';
import { buildInsightAnalysis } from './insight-analysis';

export interface ControlledCategoryRelease {
  qualificationPolicy: 'vylnt-controlled-category-release-v1';
  name: string; modelJson: string; modelHash: string; categoryPolicyJson: string; categoryPolicyHash: string;
  candidateHash: string; evaluationHash: string; registrationHash: string; holdoutHash: string;
  exposureHash: string; sourceLockHash: string; harnessHash: string; parityHash: string;
  datasetHash: string; splitHash: string; testedScope: string;
  approvedCategories: ['JS-002'];
  categories: { 'JS-002': CategoryQualification & { insufficientEvidenceContextual: number } };
}
const sha = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
/** Shared Worker/API entry point. Only a developer-produced, qualified release reaches this branch. */
export async function analyseControlledCategory(report: Report, release: ControlledCategoryRelease) {
  for (const key of ['modelHash','categoryPolicyHash','candidateHash','evaluationHash','registrationHash','holdoutHash','exposureHash','sourceLockHash','harnessHash','parityHash','datasetHash','splitHash'] as const)
    if (!/^[a-f0-9]{64}$/.test(release[key])) throw new Error('Incomplete controlled release identity');
  if (await sha(release.modelJson) !== release.modelHash || await sha(release.categoryPolicyJson) !== release.categoryPolicyHash) throw new Error('Altered controlled release');
  if (!release.testedScope || canonicalJson(release.approvedCategories) !== '["JS-002"]' || Object.keys(release.categories).join() !== 'JS-002') throw new Error('Unsupported approved scope');
  const qualification = release.categories['JS-002'];
  if (!categoryQualifies(qualification) || qualification.insufficientEvidenceContextual !== 0) throw new Error('Controlled category failed gates');
  const model = parseEvidenceLstm(JSON.parse(release.modelJson));
  const policy = categoryCandidateSchema.parse(JSON.parse(release.categoryPolicyJson));
  if (model.schemaVersion !== 'vynlt-evidence-v3' || model.provenance !== 'controlled' || model.rulesetVersion !== RULESET_VERSION || report.rulesetVersion !== RULESET_VERSION || model.datasetHash !== release.datasetHash || model.splitHash !== release.splitHash) throw new Error('Incompatible controlled model');
  if (!policy.categories['JS-002'].supported || Object.entries(policy.categories).some(([key,p]) => key !== 'JS-002' && p.supported)) throw new Error('Unsupported category policy');
  const extract = prepareEvidenceContexts3(report), legacy = prepareEvidenceContexts(report);
  const cache = new Map<string, AssessmentState>(), decisions = new Map<string, AssessmentState>();
  for (const finding of report.findings) {
    if (finding.ruleId !== 'JS-002') continue; // Preserve evidence-only assessments for the other categories.
    const context = extract(finding);
    let decision = cache.get(context.variant);
    if (!decision) {
      const uncertain = contextRequiresReview(report, legacy(finding)) || ['unknown', 'contradictory'].includes(String(context.facts.targetCspSourceConstraint));
      if (uncertain || model.conflictVariants.includes(await sha(context.variant))) decision = 'needs-review';
      else {
        const raw = Math.min(1 - 1e-15, Math.max(1e-15, predictSequence(model, context.sequence)));
        decision = categoryCandidateDecision(Math.log(raw / (1 - raw)), finding.ruleId, policy);
      }
      cache.set(context.variant, decision);
    }
    decisions.set(finding.id, decision);
  }
  const result = buildInsightAnalysis(report, { inputSchema: 'vynlt-evidence-v3', decisions,
    model: { name: release.name, hash: release.modelHash, status: 'qualified', approvedCategories: ['JS-002'], candidateHash: release.candidateHash, evaluationHash: release.evaluationHash, scope: release.testedScope, categoryPolicyHash: release.categoryPolicyHash, qualificationPolicy: release.qualificationPolicy, registrationHash: release.registrationHash, holdoutHash: release.holdoutHash } });
  result.limitations = [`Script integrity qualified on controlled applications. Tested scope: ${release.testedScope}. The other seven categories are not qualified.`, 'Controlled results are not independent application review or universal accuracy.', ...result.limitations.slice(1)];
  return result;
}

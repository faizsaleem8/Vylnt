import type { Report, Severity } from './index';
import type { SealedProjectEvidence } from './project-evidence';

export const evidenceVersion = 'vynlt-evidence-v2' as const;
export const insightVersion = 'vynlt-insights-v1' as const;
export const decisionVersion = 'vynlt-conservative-v1' as const;
export const catalogVersion = 'vynlt-remediation-v1' as const;
export type AssessmentState = 'change-warranted' | 'needs-review' | 'contextual';
export type EvidenceValue = boolean | number | 'unknown' | string;
export interface EvidenceContext {
  version: typeof evidenceVersion;
  category: string;
  findingId: string;
  matching: 'unique' | 'equivalent' | 'ambiguous' | 'missing';
  facts: Record<string, EvidenceValue>;
  missingContext: string[];
  sequence: number[][];
  /** Identifier-free canonical numeric input. Only this key may deduplicate inference. */
  variant: string;
  order: 'structural-snapshot';
}
export interface InsightAssessment {
  category: string;
  title: string;
  findingIds: string[];
  variants: string[];
  evidenceContexts: { variant: string; findingIds: string[]; facts: Record<string, EvidenceValue>; missingContext: string[] }[];
  observedFacts: Record<string, EvidenceValue>[];
  missingContext: string[];
  assessment: AssessmentState;
  reviewPriority: 'high' | 'normal' | 'informational';
  originalSeverity: Severity;
  explanation: string;
  recommendedChange: string;
  compatibility: string;
  verification: string;
  remediationReferences: string[];
  experimentalSignal?: { minScore: number; maxScore: number; scoredVariants: number; reviewOnlyVariants: number };
}
export interface InsightAnalysis {
  schemaVersion: typeof insightVersion | 'vylnt-insights-v2';
  inputSchema: typeof evidenceVersion | 'vynlt-evidence-v3';
  decisionPolicy: typeof decisionVersion | 'vynlt-controlled-signal-v1' | 'vylnt-controlled-category-v1';
  remediationCatalog: typeof catalogVersion;
  scanId: string;
  model: { name: string; hash: string | null; status: 'unavailable' | 'experimental' | 'qualified'; approvedCategories: string[]; evaluationHash?: string; candidateHash?: string; scope?: string; categoryPolicyHash?: string; qualificationPolicy?: string; registrationHash?: string; holdoutHash?: string };
  mode: 'evidence-summary' | 'qualified-model' | 'experimental-model';
  limitations: string[];
  summary: string;
  issues: InsightAssessment[];
  contextual: InsightAssessment[];
}
/** Frozen content has no export timestamp or mutable review notes. Identical content has one hash. */
export interface LegacyInsightReport {
  version: 'vynlt-frozen-insights-v1';
  originalScan: Report;
  originalScanHash: string;
  analysis: InsightAnalysis;
}
export interface ProjectInsightReport extends Omit<LegacyInsightReport,'version'> {
  version:'vylnt-frozen-insights-v2';
  project:{seal:SealedProjectEvidence;assessment:'not-enabled'};
}
export type InsightReport=LegacyInsightReport|ProjectInsightReport;
export interface StoredInsightReport {
  id: string;
  hash: string;
  createdAt: string;
  content: InsightReport;
}

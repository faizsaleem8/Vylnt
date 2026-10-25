// Developer-only Node module. Never import into the dashboard or extension.
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { RULESET_VERSION, type Report } from '../core';
import { canonicalJson } from '../core/integrity';
import { parseSubmission } from '../core/validation';
import { prepareEvidenceContexts } from '../core/evidence-context';
import { evidenceVersion } from '../core/insight-contracts';
export { assertPrivateMlPath } from './private-path';

const hash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const hex = z.string().regex(/^[0-9a-f]{64}$/);
export const reviewDecisionSchema = z.object({
  packetHash: hex, caseId: hex, reviewerId: z.string().trim().min(1).max(120),
  reviewedAt: z.iso.datetime(), scope: z.string().trim().min(1).max(512),
  label: z.enum(['change-warranted', 'contextual', 'needs-review']),
  independentEvidence: z.object({ recordId: z.string().trim().min(1).max(200), sha256: hex, independentOfVylntRules: z.literal(true) }).strict(),
}).strict();
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
type ReviewCase = { id: string; category: string; variantHash: string; findingIds: string[]; representativeFindingIndex: number;
  facts: Record<string, string | boolean | number>; missingContext: string[] };
export interface ReviewPacket {
  version: 1; inputSchema: typeof evidenceVersion; rulesetVersion: string; familyId: string; sourceKind: 'controlled' | 'application';
  source: { scanId: string; observation: Report['observation'] }; sourceHash: string;
  cases: ReviewCase[]; packetHash: string; decisions: ReviewDecision[];
}
/** No suggested labels, model scores, rule recommendations or page text are put in review cases. */
export function createReviewPacket(input: unknown, familyInput: string, kindInput: 'controlled' | 'application' = 'controlled'): ReviewPacket {
  const familyId = z.string().trim().min(1).max(200).parse(familyInput);
  const sourceKind = z.enum(['controlled', 'application']).parse(kindInput);
  const raw = z.object({ scanId: z.string(), observation: z.unknown(), rulesetVersion: z.literal(RULESET_VERSION).optional() }).passthrough().parse(input);
  const report = parseSubmission({ scanId: raw.scanId, observation: raw.observation });
  const source = { scanId: report.scanId, observation: report.observation }, sourceHash = hash(source);
  const extract = prepareEvidenceContexts(report), groups = new Map<string, ReviewCase>();
  report.findings.forEach((finding, index) => {
    const context = extract(finding), variantHash = createHash('sha256').update(context.variant).digest('hex');
    const existing = groups.get(variantHash);
    if (existing) { existing.findingIds.push(finding.id); return; }
    groups.set(variantHash, { id: hash({ sourceHash, variantHash }), category: finding.ruleId, variantHash,
      findingIds: [finding.id], representativeFindingIndex: index, facts: context.facts, missingContext: context.missingContext });
  });
  const cases = [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
  const content = { version: 1 as const, inputSchema: evidenceVersion, rulesetVersion: RULESET_VERSION, familyId, sourceKind, source, sourceHash, cases };
  return { ...content, packetHash: hash(content), decisions: [] };
}
export function parseReviewPacket(value: unknown): ReviewPacket {
  if (!value || typeof value !== 'object') throw new Error('Invalid review packet');
  const input = value as ReviewPacket;
  if (input.version !== 1 || !input.source || !Array.isArray(input.decisions) || input.decisions.length > 4000) throw new Error('Invalid review packet');
  const recreated = createReviewPacket(input.source, input.familyId, input.sourceKind);
  const { decisions, ...content } = input;
  const { decisions: _empty, ...expected } = recreated;
  if (canonicalJson(content) !== canonicalJson(expected)) throw new Error('Review packet metadata or evidence changed; generate a new packet and obtain new reviews');
  let packet = recreated;
  for (const decision of decisions) packet = addReviewDecision(packet, decision);
  return packet;
}
export function addReviewDecision(packet: ReviewPacket, value: unknown): ReviewPacket {
  const decision = reviewDecisionSchema.parse(value);
  if (decision.packetHash !== packet.packetHash || !packet.cases.some(c => c.id === decision.caseId)) throw new Error('Review references stale or unknown evidence');
  if (packet.decisions.some(d => d.caseId === decision.caseId && d.reviewerId === decision.reviewerId)) throw new Error('A reviewer may submit only one decision per case; retain the original record');
  return { ...packet, decisions: [...packet.decisions, decision] };
}
/** Two declared independent reviewers are required. Disagreement is preserved, never majority-voted. */
export function reviewReadiness(packet: ReviewPacket) {
  let ready = 0, pending = 0, disagreements = 0;
  for (const item of packet.cases) {
    const decisions = packet.decisions.filter(d => d.caseId === item.id);
    if (new Set(decisions.map(d => d.reviewerId)).size < 2) { pending++; continue; }
    ready++;
    if (new Set(decisions.map(d => d.label)).size > 1) disagreements++;
  }
  return { cases: packet.cases.length, ready, pending, disagreements, exactAgreement: ready ? (ready - disagreements) / ready : null,
    limitations: 'Reviewer identity/independence and evidence references require developer audit. This packet does not attest a human review occurred.' };
}
export function reviewedExamples(packet: ReviewPacket, sourceFile: string) {
  const rows: { reportFile: string; findingIndex: number; familyId: string; label: ReviewDecision['label']; provenance: 'human-reviewed'; reviewer: string; reviewedAt: string; reviewScope: string; evidenceRecord: string }[] = [];
  // Human review of a controlled fixture is still controlled-data evidence.
  // It must not pass the independently reviewed application release gate.
  if (packet.sourceKind !== 'application') return rows;
  for (const item of packet.cases) {
    const decisions = packet.decisions.filter(d => d.caseId === item.id);
    if (new Set(decisions.map(d => d.reviewerId)).size < 2) continue;
    for (const d of decisions) rows.push({ reportFile: sourceFile, findingIndex: item.representativeFindingIndex, familyId: packet.familyId,
      label: d.label, provenance: 'human-reviewed', reviewer: d.reviewerId, reviewedAt: d.reviewedAt, reviewScope: d.scope,
      evidenceRecord: `${d.independentEvidence.recordId}:${d.independentEvidence.sha256}` });
  }
  return rows;
}

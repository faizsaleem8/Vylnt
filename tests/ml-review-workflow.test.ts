import { describe, expect, it } from 'vitest';
import { createReviewPacket, parseReviewPacket, addReviewDecision, reviewReadiness, reviewedExamples } from '../packages/ml/review-workflow';

const fixture = () => ({ scanId: crypto.randomUUID(), observation: { url: 'https://user:password@app.test/path?private=discard#token', scannedAt: '2026-10-21T00:00:00Z', headers: {}, resources: [], scripts: Array.from({ length: 71 }, (_, i) => ({ url: `https://cdn.test/${i}.js?secret=discard`, integrity: false })), cookies: [], domCollected: true } });
const decision = (packet: ReturnType<typeof createReviewPacket>, reviewerId: string, label = 'needs-review') => ({ packetHash: packet.packetHash, caseId: packet.cases.find(c => c.category === 'JS-002')!.id, reviewerId,
  label, reviewedAt: '2026-10-21T00:00:00Z', scope: 'Unit test only; not a genuine application review', independentEvidence: { recordId: 'test-only-reference', sha256: 'a'.repeat(64), independentOfVylntRules: true } });
describe('developer independent review packets', () => {
  it('collapses repeated targets, keeps attribution private and strips URL secrets', () => {
    const packet = createReviewPacket(fixture(), 'one-related-template');
    expect(packet.cases.find(c => c.category === 'JS-002')!.findingIds).toHaveLength(71);
    expect(packet.cases).toHaveLength(4); expect(packet.decisions).toEqual([]);
    expect(JSON.stringify(packet)).not.toContain('password'); expect(JSON.stringify(packet)).not.toContain('discard');
    expect(JSON.stringify(packet)).not.toContain('recommendation'); expect(JSON.stringify(packet)).not.toContain('modelScore');
    expect(parseReviewPacket(packet)).toEqual(packet);
    expect(reviewReadiness(packet).exactAgreement).toBeNull();
  });
  it('requires two reviewers and preserves disagreements instead of majority voting', () => {
    let packet = createReviewPacket(fixture(), 'same-family', 'application');
    packet = addReviewDecision(packet, decision(packet, 'reviewer-1', 'change-warranted'));
    expect(reviewedExamples(packet, 'private-source.json')).toEqual([]);
    expect(() => addReviewDecision(packet, decision(packet, 'reviewer-1'))).toThrow('only one');
    packet = addReviewDecision(packet, decision(packet, 'reviewer-2', 'contextual'));
    expect(reviewReadiness(packet)).toMatchObject({ ready: 1, pending: 3, disagreements: 1, exactAgreement: 0 });
    expect(reviewedExamples(packet, 'private-source.json').map(r => r.label)).toEqual(['change-warranted', 'contextual']);
  });
  it('rejects changed evidence, stale references and non-independent declarations', () => {
    const packet = createReviewPacket(fixture(), 'family');
    const changed = structuredClone(packet); changed.source.observation.domCollected = false;
    expect(() => parseReviewPacket(changed)).toThrow('changed');
    expect(() => addReviewDecision(packet, { ...decision(packet, 'r'), packetHash: '0'.repeat(64) })).toThrow('stale');
    const notIndependent = decision(packet, 'r'); notIndependent.independentEvidence.independentOfVylntRules = false;
    expect(() => addReviewDecision(packet, notIndependent)).toThrow();
  });
  it('does not promote controlled fixtures through human review declarations', () => {
    let packet = createReviewPacket(fixture(), 'controlled-family');
    packet = addReviewDecision(packet, decision(packet, 'one'));
    packet = addReviewDecision(packet, decision(packet, 'two'));
    expect(reviewReadiness(packet).ready).toBe(1);
    expect(reviewedExamples(packet, 'controlled.json')).toEqual([]);
  });
});

# VYLNT evidence and insights contracts

Authoritative TypeScript definitions: `packages/core/insight-contracts.ts`. The eight-unit candidate schema is in `packages/core/evidence-lstm.ts`; the feature columns and extraction are in `packages/core/evidence-context.ts`.

## EvidenceContext / vynlt-evidence-v2

Developer-only v3 extends the numeric schema to 46 columns with `targetCspSourceExcluded` before the eight rule columns. `EvidenceContext3` is defined in `packages/core/evidence-v3.ts`; this leaves v2 extraction and saved-report derivation unchanged. Observations may carry `cspEvidenceComplete`, a boolean computed before response-policy truncation/privacy transforms. Missing legacy coverage is unknown, not true. Source constraints require this flag plus supported syntax; contradictory completed resources and unsupported policies remain unknown. V3 model parsing/inspection, private preparation, Python training and numeric parity are implemented; current report release policies remain v2-only. See `ML_EVIDENCE_V3.md` for scope and results.

Each target has a category, finding ID, matching state (unique/equivalent/ambiguous/missing), bounded facts, missing context, sequence, variant and structural-snapshot order. Matching uses sanitized URLs or cookie names in memory only. Model tensors contain neither identifiers nor application text. Unknown numeric values are -1, observed false is 0, true is 1. Token kinds identify coverage/resource/script/cookie/target; other kind positions are unknown. The final target row always survives the 24-per-context-kind cap, giving at most 74 rows. Context rows are deduplicated and sorted numerically via canonical JSON before capping. This is not an execution trace.

Relevant script attributes are optional in stored observations: scriptType (classic/module/other), async, defer. Legacy missing fields remain unknown. Same-name cookies with different attributes are ambiguous. Resource matching uses the finding's observed outcome when available; multiple outcomes without a distinguishing target outcome remain ambiguous. The resource URL's own scheme is retained even when matching is ambiguous. Reaching collection bounds is disclosed; a full collection is never inferred from a legacy absence of truncation metadata. Policy flags describe syntax observed in response headers, not policy effectiveness.

## InsightAssessment / vynlt-insights-v1

Every issue retains category, all findingIds, unique numeric variants, observedFacts, missingContext, assessment, reviewPriority, originalSeverity, explanation, recommendedChange, compatibility, verification and remediationReferences. Facts are distinct metadata contexts; original complete evidence stays in originalScan. No severity is inferred from repetition. Groups use the rule category; distinct contexts remain available inside the issue.

States are change-warranted, needs-review and contextual. The current evidence-summary policy recommends changing matched HTTP references on HTTPS pages, including references that may have failed. It does not claim content executed. Every other category needs review. Unknown matching, unsupported categories/rulesets and unavailable model qualification cannot be contextual. High/critical findings remain in the main report. No model category is currently qualified.

The additive `experimental-model` mode uses decision policy `vynlt-controlled-signal-v1` and model status `experimental`. Its model identity includes candidateHash, evaluationHash and controlled scope. Optional issue `experimentalSignal` contains minScore/maxScore (rounded to four decimals), scoredVariants and reviewOnlyVariants. Only known non-conflicting compatible development variants may receive scores. Existing evidence assessments and severities are retained exactly; no experimental score can assign contextual/change states. Old evidence-summary and qualified-model derivations remain unchanged for saved-report verification. Current and archived releases with the same weight hash are all considered when verifying older scope metadata; the entire trusted frozen content must still match. A policy change requires a new policy identity and preserved historical implementation.

Example assessment (71 equivalent third-party scripts):

```json
{
  "category": "JS-002",
  "title": "Third-party script has no integrity attribute",
  "findingIds": ["JS-002:https://cdn.example.test/1.js:", "… all 71 original IDs …"],
  "assessment": "needs-review",
  "reviewPriority": "normal",
  "originalSeverity": "info",
  "explanation": "The rule observed a configuration or inventory condition. Available metadata does not establish application impact or justify treating this observation as harmless.",
  "recommendedChange": "For stable third-party scripts, consider pinned versions and Subresource Integrity; otherwise review CSP and supplier controls.",
  "missingContext": ["Vendor trust, static content stability and integrity compatibility are unknown."]
}
```

This abbreviated illustration is not a full parser fixture. Executable acceptance fixtures are in `tests/insight-assessment.test.ts` and `tests/frozen-insights.test.ts`; they retain all 71 IDs and verify attribute changes, identity invariance, ambiguity and legacy unknowns.

## Frozen InsightReport / vynlt-frozen-insights-v1

Content contains version, originalScan, originalScanHash and analysis. Analysis freezes schema/input/decision/catalog versions, model identity/status/approved categories, limitations, summary, issues and contextual groups. A stored envelope adds id, hash and createdAt. ID and hash equal SHA-256 of VYLNT canonical JSON of content, excluding envelope timestamps. Original scan SHA-256 remains separate. This is not a blockchain anchor. Mutable feedback is excluded.

Equal content reuses the same version. Changed source evidence, schema, decision/catalog version or model identity changes content and therefore hash. Both PDF and JSON use that content; PDF bytes need not match across renderer versions. The combined JSON uses the PostgreSQL jsonb byte calculation and rejects over 1 MiB. No truncation is used to fit reports.

Authenticated finalisation accepts only an analysisHash and recomputes all trusted fields. Retrieval verifies both integrity and trusted derivation, including rows created directly through the user-scoped database RPC. Storage is not proof of API origin. Existing policy/catalog implementations must be archived when introducing future versions: unsupported historical derivations currently return an explicit integrity/compatibility error, never silently regenerate a changed report.

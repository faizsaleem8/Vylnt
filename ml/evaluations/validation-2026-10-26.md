# VYLNT ML validation

Status: **qualification-blocked**.

Schema: `vynlt-evidence-v3`. Provenance: **controlled**.
Dataset: `7caabbc2143d7acc3708a2dd16668173af7edafdae4ea75e7d12d4cbf5409d94`.
Split: `e5f9539f213583136465fcf9ddf65e730078f3137bb8026b62d6f549be1650fc`.

## Engineering checks

Frozen candidate integrity passed. Python/JavaScript parity: 18 cases, maximum error 5.717118400916377e-8 (tolerance 1e-6).
No model was released, no source-candidate parameters changed and no held-out predictions were rerun.
Training reproduction: exact-numeric-match, 60 epochs, seed 42; both LSTM and logistic outputs match. No test was evaluated.

## Qualification coverage

Test families: 2/10; additional-family deficit: 8.
Distinct numeric inputs: 163; conflicting variants: 19 (17 in development).

| Category | Train change/context | Validation change/context | Test change/context | Missing test change/context | Test class families |
|---|---:|---:|---:|---:|---:|
| HDR-001 | 7/0 | 2/0 | 2/0 | 28/30 | 2/0 |
| HDR-002 | 5/0 | 2/0 | 2/0 | 28/30 | 2/0 |
| HDR-003 | 6/0 | 2/0 | 2/0 | 28/30 | 2/0 |
| CK-001 | 6/0 | 2/0 | 2/0 | 28/30 | 2/0 |
| CK-002 | 0/7 | 0/2 | 2/2 | 28/28 | 2/2 |
| CK-003 | 6/0 | 2/0 | 2/0 | 28/30 | 2/0 |
| NET-001 | 7/0 | 2/0 | 2/0 | 28/30 | 2/0 |
| JS-002 | 24/18 | 8/6 | 8/6 | 22/24 | 2/2 |

Counts are minima, not a promise that more examples will pass. Each category needs 30 examples of each class, with each class spanning at least three test families.

## Previously frozen test results

These are the existing historical results, checked for identity/count/gate consistency. They are not a fresh accuracy measurement.

| Category | Guarded precision | Recall | Coverage | Failed gates |
|---|---:|---:|---:|---|
| HDR-001 | 100.0% | 100.0% | 100.0% | tenTestFamilies, classCounts, classFamilies, ruleComparator |
| HDR-002 | 100.0% | 100.0% | 100.0% | tenTestFamilies, classCounts, classFamilies, ruleComparator |
| HDR-003 | 100.0% | 100.0% | 100.0% | tenTestFamilies, classCounts, classFamilies, ruleComparator |
| CK-001 | 100.0% | 100.0% | 100.0% | tenTestFamilies, classCounts, classFamilies, ruleComparator |
| CK-002 | Undefined | 0.0% | 66.7% | tenTestFamilies, classCounts, classFamilies, precision, recall, noInsufficientEvidenceDeemphasis, ruleComparator |
| CK-003 | 100.0% | 100.0% | 100.0% | tenTestFamilies, classCounts, classFamilies, ruleComparator |
| NET-001 | 100.0% | 100.0% | 100.0% | tenTestFamilies, classCounts, classFamilies, ruleComparator |
| JS-002 | 100.0% | 100.0% | 100.0% | tenTestFamilies, classCounts, classFamilies |

## Next developer work

1. Collect genuinely distinguishable controlled configurations across independent application families. Keep missing intent/context as Needs review.
2. Retain original family identities and shared-input grouping. Do not multiply the same template to fill count deficits.
3. Register a new candidate and untouched holdout before training; select parameters on training/validation only.
4. Pass coverage preflight before consuming that holdout. Publish failed candidates and uncertainty intervals.
5. Integrate a separately versioned qualified release only after category-level gates pass. Current dashboard findings remain visible.

Human reviewer recruitment is not required for the controlled policy. Controlled results do not establish real-application accuracy.

# VYLNT controlled LSTM experiment — 2026-10-22

## Fresh JS-002 holdout — 2026-10-26

[Measured results](fresh-holdout-js002-2026-10-26.md), [immutable aggregate record](fresh-holdout-js002-2026-10-26.json): the frozen v4 candidate passed all gates on eleven fresh eligible families, 80 change-required and 79 contextual distinct inputs. Model-only/safeguarded precision, recall and coverage were 100% on this controlled suite. Published intervals and limitations apply; no universal or independently reviewed accuracy claim. Runtime release acceptance is tracked in PLAN.md. All other categories remain unqualified. Historical experiments below retain their original failed outcomes.

## Category-policy v4 development — 2026-10-26

[Results](category-v4-2026-10-26.md) and [aggregate record](category-v4-2026-10-26.json): 140 new browser scenarios passed on the existing ten applications; 300 combined rows preserve the original 190. Twenty opposite-purpose cookie pairs have identical numeric inputs and remain conflicts. The new category-balanced eight-unit LSTM fitted on 96 JS-002 examples, with 32 validation examples; unsupported categories abstain. The 55,101-byte candidate passed four numeric parity cases (max error 4.53e-8) and 84 decision cases. Its qualification attempt stopped before test inference because the holdout has only two previously seen families and insufficient class counts. Development scores are not unbiased accuracy. No category is qualified and no active release changed. [Protocol/commands](../../docs/ML_CATEGORY_CANDIDATE.md).

## Validation audit — 2026-10-26

[Readable audit](validation-2026-10-26.md) and [aggregate numeric record](validation-2026-10-26.json) verify frozen identities, summary/count/gate/uncertainty consistency, exact development training reproduction and 18-case Python/JavaScript parity. They do not rerun test predictions or turn historical metrics into a fresh evaluation. Both LSTM and logistic parameters/calibration/checkpoint selection reproduced exactly with seed 42 and 60 epochs. The current dataset has no eligible actionable CK-002 development examples and no contextual development examples for six other categories. Test coverage and quality gates still fail; no model is promoted. Commands and full validation scope: [ML validation](../../docs/ML_VALIDATION.md).

## Latest expanded v3 result

Experimental M6 is closed by user decision; [ML-Q qualification](../../docs/ML_QUALIFICATION_PLAN.md) remains open. The new v3 candidate is not bundled. Exact [evaluation](expanded-v3-2026-10-22.json), [training](expanded-v3-2026-10-22-training.json), [parity](expanded-v3-2026-10-22-parity.json) and [readiness](expanded-v3-2026-10-22-readiness.json) records are published without private reports/annotations/source.

Ten pinned MIT applications / 90 files passed 170 controlled scenarios. Combined cohort: 190 rows, 163 tensors, 11 actual families, 19 conflicts (17 development); train/validation/test 126/32/32 rows and 7/2/2 families. Eligible training/validation examples: 86/28. Seed 42 / 60 epochs, validation-selected epoch 60. Model 54,469 bytes; 18 parity cases, maximum error 5.72e-8 against 1e-6. Published expanded JSON preserves the exact frozen bytes (including CRLF where originally written), protected by `.gitattributes`; private source/model artifacts remain unchanged. Training is the immutable pre-test record; the subsequent evaluation consumed the frozen test once.

| Category | Guarded precision | Recall | Coverage | Test rows | Qualified |
|---|---:|---:|---:|---:|---|
| HDR-001 | 1 | 1 | 1 | 2 | No |
| HDR-002 | 1 | 1 | 1 | 2 | No |
| HDR-003 | 1 | 1 | 1 | 2 | No |
| CK-001 | 1 | 1 | 1 | 2 | No |
| CK-002 | Undefined | 0 | 0.667 | 6 | No |
| CK-003 | 1 | 1 | 1 | 2 | No |
| NET-001 | 1 | 1 | 1 | 2 | No |
| JS-002 | 1 | 1 | 1 | 14 | No |

These tiny controlled category counts are not accuracy claims. All categories lack required families/class counts; CK-002 also produces contextual mistakes, including insufficient-evidence de-emphasis in offline evaluation. Precision is undefined when no positive call is made. No release promotion is permitted by these results. Intervals, same-input logistic/rule comparison and every failed gate are retained in the evaluation. The active v2 policy remains display-only, with zero qualified categories. Earlier artifacts below are preserved historical experiments.

New evidence-v3 development result: [readiness](controlled-v3-2026-10-22-readiness.json), [training](controlled-v3-2026-10-22-training.json) and [executed browser parity](controlled-v3-2026-10-22-parity.json). The 78-row/four-family cohort includes CSP script scenarios independently checked in the browser. Its 53,472-byte candidate passed 18 parity cases (maximum error about 5.77e-8). Preflight still lacks holdout families and per-category class counts, so its test was not consumed and no v3 accuracy or qualification is claimed. The active v2 release remains unchanged. See [the preregistered protocol](../../docs/ML_EVIDENCE_V3.md). The failed v2 evaluation below is preserved.

This is a failed qualification experiment, not evidence of useful real-world security accuracy. The user removed mandatory human review from the current experimental phase; all labels retain controlled provenance.

Dataset: 60 distinct family/context/label rows, 41 tensors, four actual families, 12 audited conflicts (three development conflicts). Train/validation/test contain 20/10/30 rows across 2/1/1 families. Conflict/uncertainty filtering leaves 16 training and eight validation binary examples. Adding a persistent, JavaScript-readable preference fixture makes development fitting eligible; persistence is a fixture correlation, not proof of real cookie purpose. Original ambiguous cases are retained, not relabelled.

The eight-unit LSTM and same-input logistic comparator use the same frozen split. Seed 42, 60 epochs; validation selects epoch 60, temperature and two thresholds. Weights, calibration, thresholds, comparator, parity and training provenance freeze before the test. The held-out set is evaluated once; no thresholds are changed afterward. The test is one earlier generated template family, which is inadequate for representative qualification. Within-family correlation limits Wilson intervals; family-bootstrap intervals are null where fewer than two families are available.

| Category | LSTM precision after guards | Recall | Non-abstention coverage | Test rows | Qualified |
|---|---:|---:|---:|---:|---|
| HDR-001 | 0.500 | 1.000 | 1.000 | 4 | No |
| HDR-002 | 0.333 | 1.000 | 1.000 | 3 | No |
| HDR-003 | 0.333 | 1.000 | 1.000 | 3 | No |
| CK-001 | 0.333 | 1.000 | 1.000 | 3 | No |
| CK-002 | Undefined | 0.000 | 1.000 | 4 | No |
| CK-003 | 0.333 | 1.000 | 1.000 | 3 | No |
| NET-001 | 0.500 | 1.000 | 1.000 | 4 | No |
| JS-002 | 0.500 | 1.000 | 1.000 | 6 | No |

CK-002 precision is undefined because it made no positive calls; this is not zero errors. These are the offline candidate's classification metrics before the additional restrictions of the deployed display-only policy, which assigns no classifications at all. No category meets the original count/family/metric/comparator acceptance gates, irrespective of removal of human review. Coverage alone does not establish quality. Do not treat raw model classifications as safe-to-ignore advice.

Exact model-only/guarded LSTM and logistic results, rule comparator, counts, Wilson intervals, family uncertainty and every failed gate are published in [controlled-2026-10-22.json](controlled-2026-10-22.json). Versions, fitting sizes, seed/checkpoint and validation loss are in [training provenance](controlled-2026-10-22-training.json). These contain no private reports, cookie values, page text or annotations.

Identities:

- Dataset: `57c76a73771a26191628868fc2d202ea08f65e1f79845869f0e58aba2dd69a13`.
- Split: `19ebef4290d0d8ee46c25fc8c767e303ea6d49888e617d9cf20764b904d0358a`.
- Model: `608494ae3de7379ea1a96e68dbfb67a44509d92000a712d209ee71bc2e39c5e7`.
- Model size: 52,581 bytes; 16 Python/browser parity cases, maximum error about `6.9e-8` against tolerance `1e-6`.

The bundled `vylnt-controlled-signal-v1` policy is explicitly **display-only**. It attaches rounded scores for compatible known development variants, never changes evidence assessments/severity, never hides findings, and never qualifies contextual de-emphasis. Unknown/conflicting contexts get no score. This completes experimental execution, not M6's quality acceptance. Better distinguishable configurations and broader frozen held-out families are the next developer-owned model work; no user dataset preparation or reviewer recruitment is required.

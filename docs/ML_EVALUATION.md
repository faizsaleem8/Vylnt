# VYLNT evidence-v2 evaluation record

## Latest: fresh evidence-v3 JS-002 qualification

The separate [ML-Q1 holdout](ML_FRESH_HOLDOUT_PLAN.md) passed on 2026-10-26: eleven eligible fresh families, 159 distinct numeric contexts, 80 change-required and 79 contextual. Model-only/safeguarded precision, recall and coverage were 100% on this controlled suite. [Published comparisons, intervals, provenance and limitations](../ml/evaluations/fresh-holdout-js002-2026-10-26.md). The frozen candidate was evaluated once without fitting or threshold changes. Only JS-002 qualifies; seven categories remain open. Runtime/export release acceptance is recorded in PLAN.md. Earlier results below retain their original outcomes and were not re-evaluated.

## 2026-10-26 category-policy v4 development

A new controlled candidate has been fitted; [results](../ml/evaluations/category-v4-2026-10-26.md) distinguish its selected validation scores from held-out accuracy. All 140 additional browser scenarios passed; 300 combined rows retain the original 190. JS-002 is the only supported development category, with explicit abstention elsewhere. Four numeric and 84 decision parity cases passed. The fresh-holdout/count guard refused evaluation before test inference, so there are no new test metrics and no qualification or release change. The earlier experiments below remain historical evidence.

## 2026-10-26 engineering validation

The read-only [qualification audit](../ml/evaluations/validation-2026-10-26.md) checks the existing expanded v3 result without rerunning its test predictions. Exact seed-42/60-epoch training reproduction and 18-case Python/JavaScript parity passed. All 223 TypeScript and 40 Python tests, type/build and Chromium worker/report checks passed. Seven categories lack one eligible development class; test-family and per-class counts remain insufficient. No candidate was promoted, no accuracy gate was waived and no fresh held-out measurement is claimed. See [numeric records](../ml/evaluations/validation-2026-10-26.json) and [commands](ML_VALIDATION.md).

## Current expanded result and milestone scope

Experimental M6 is closed by user decision on 2026-10-22. Qualification remains open as [ML-Q](ML_QUALIFICATION_PLAN.md), with all original numerical/safety gates unchanged. Expanded controlled v3 has 190 rows / 11 families overall, but only 32 rows / two held-out families. No category is approved; HttpOnly recall is zero and offline contextual mistakes are unsafe. The developer-only candidate is not bundled. See [exact numeric results](../ml/evaluations/README.md) and [preregistered expansion](ML_CORPUS_EXPANSION.md). Earlier data/review requirements below describe historical tracks; independent human review is not a prerequisite for the current controlled phase.

Date: 2026-10-22. **No category is approved. The shipped controlled release is experimental and display-only.**

Latest experiment: the active release now has `experimental-model` mode with display-only policy `vynlt-controlled-signal-v1`; its underlying evidence assessments remain unchanged. A fit-eligible 60-row/four-family controlled cohort trained the eight-unit LSTM and same-input logistic comparator. Validation selected checkpoint/calibration/thresholds before one frozen 30-row test. All categories failed qualification, including low precision and zero CK-002 recall; the test is only one generated family. Exact metrics and provenance are published in `ml/evaluations/README.md` and its linked JSON files. The 52,581-byte artifact passed 16 parity cases with maximum error ~6.9e-8. This is an experimental reporting implementation, not completion of M6's quality gates. Prior null-release/failed-fitting paragraphs below are historical snapshots, superseded for current implementation status.

Current scope override: the user removed independent human review from the experimental ML phase on 2026-10-22. Controlled specifications and automated oracles supply ground truth; reviewer recruitment is not a prerequisite. Historical reviewed-application gates below remain records of the original policy. Fitting is now eligible after adding genuinely different persistent preference cases; the separately identified display-only release is implemented. Neither that dataset change nor the removal of review establishes accuracy, changes provenance or qualifies a model category.

## Approved upstream controlled corpus

The user approved selecting open-source applications for local assessment. Three MIT-licensed source families (2048, TodoMVC JavaScript ES6 and reveal.js barebones) are now pinned by commit and 23 file hashes. Two full collection runs passed 33 scenarios each, with independent network assertions and working browser interactions. No live upstream deployment was scanned. Headers/cookies/fixture resources and their controlled labels belong to the VYLNT harness, not upstream vulnerability claims. Full scope, source links and reproduction are in `docs/ML_APPLICATION_CORPUS.md`.

The new cohort has 30 rows / 24 input variants / three families and three conflicting variants. The combined frozen snapshot has 59 rows / 37 variants / four families and 12 audited conflicts (three development conflicts). Train/validation/test have 20/10/29 rows across 2/1/1 families; the only test family remains the earlier generated template. Contextual development examples conflict with equally observable change/unknown examples and are excluded. Readiness remains false, no security candidate is fitted and no test evaluation or accuracy claim is published. There are zero independent human reviews. More copies or relabelled families cannot cure missing observable context.

Validation for this increment: 159 tests / 33 suites, TypeScript/build, all 33 final browser scenarios, source-cache integrity/licence checks, private preparation and frozen audit/readiness/collection briefs passed. A separate browser check verified scoped collection sends zero requests to another localhost service while its unscoped control does contact that service. The product release remains null; independently reviewed application acceptance remains open.

## 2026-10-22 collection and evaluation increment

The user confirms no application repositories or independent reviewers are available. The private collection brief (`.local/ml-controlled/collection-plan-reviewed-gates-2026-10-22.json`) records one shared-input component, one observed test family, no eligible training/validation classes and nine conflicting/insufficient-context variants. Because provenance is controlled, reviewed acceptance still requires ten test application families and, for every category, 30 change-required and 30 contextual targets each across three families. No security candidate has been fitted or approved.

Evaluation now publishes deterministic paired family-bootstrap intervals alongside Wilson intervals, separately for raw/guarded LSTM, logistic and rule-only results and paired comparator differences. Single-family cohorts and unstable undefined denominators produce null intervals. These are descriptive, not parameter-selection inputs or new accuracy claims. Release staging now runs Python-reference parity through the JavaScript runtime before writing a release; valid hashes alone cannot satisfy parity. Development fixtures cover every approved category before staging. A separate reproducible synthetic numeric reference covers all eight categories at 2/26/50/74 steps, without adding any training examples or reviews. Validation results are recorded in PLAN.md.

## Continuation correction and readiness

The generated scenarios use one shared server/application template. Earlier per-rule grouping overstated application diversity; **the corrected cohort has one family**, not eight. The original figures below are historical and do not support a release gate. A fresh run passed all 32 controlled scenarios; paired-data preparation retained 29 distinct labelled rows / 13 input variants with nine audited conflicts and zero human-reviewed targets.

The fixed frozen assignment places that single family in test, leaving no training/validation families. Readiness correctly reports fitReady=false. The full audit may report those nine test conflicts, but none enter a learned safety list (developmentConflictVariants=0). Changing held-out labels leaves fitted weights/calibration/thresholds unchanged in regression tests. No security candidate was fitted from the corrected cohort and no test metrics are claimed.

Developer tools now generate private hash-bound review packets and require paired review declarations; disagreements become one needs-review training target. The seeded controlled script packet has two pending cases and no decisions. Controlled fixtures cannot be promoted to independently reviewed application provenance through this workflow. More genuine application families and independent review are required; none have been invented to satisfy gates.

ML-7 is independently live-verified: the private two-account helper recorded 14 passed hosted checks with zero skips, failure or cleanup failures on 2026-10-21, including migration 005, JSON/PDF retrieval, idempotency/stale-analysis rejection, immutable writes, owner isolation and source-delete cascade. This verifies report infrastructure, not model accuracy.

## Controlled suite and failed training experiment

The expanded localhost suite passed 32 scenario/network assertions in one shared template family (the former eight per-rule family identifiers were incorrect). Preparation produced 29 distinct family/context/label rows after removing three repeated rows. The frozen split audit found nine input variants with conflicting or insufficient-evidence labels. There are zero independently reviewed application targets; annotation agreement is unavailable, not 100%.

| Category | Change-required labels | Contextual labels | Needs-review labels |
|---|---:|---:|---:|
| HDR-001 | 2 | 1 | 1 |
| HDR-002 | 1 | 1 | 1 |
| HDR-003 | 1 | 1 | 1 |
| CK-001 | 1 | 1 | 1 |
| CK-002 | 1 | 1 | 1 |
| CK-003 | 1 | 1 | 1 |
| NET-001 | 2 | 1 | 1 |
| JS-002 | 3 | 1 | 2 |

These are controlled specification labels, not measured real-world security outcomes. The independent network oracle verifies configuration facts and resource outcomes. It does not establish that a cookie is a real authentication mechanism, prove compensating defences or certify contextual safety.

Training refused both the initial and expanded cohorts because training/validation did not retain both classes after the conflict/uncertainty audit. This is the expected safe outcome; the labels were not changed to manufacture separability. Private audit/split/failure records are under `.local/ml-controlled/` and are not shipped. Reproduce the suite and preparation with the developer workflow and a stable private dataset key.

No security precision, recall, coverage or uncertainty interval is reported for a model trained on this cohort: no eligible candidate was fitted. No frozen security test set was consumed to tune thresholds. Candidate mechanics tests use a clearly identified numeric fixture; their PyTorch/TypeScript parity tolerance is 1e-6 and their fabricated labels/metrics establish no security quality.

## Release gates still open

At least ten held-out application families overall; each approved category needs 30 change-required and 30 contextual test contexts, each class across three families; precision >=90%, recall >=95%, non-abstention coverage >=50%; no high/critical actionable contextual misclassification; precision improvement over rule-only with recall within five percentage points; published intervals and independently reviewed application scope. The present cohort cannot satisfy these gates.

Next data work belongs to VYLNT developers: independently verify more application configurations, retain related templates in one family, review evidence/labels with independent reviewers, audit disagreements and freeze the expanded split before fitting. Users are never asked to prepare training data. Context that the scanner cannot observe continues to require abstention.

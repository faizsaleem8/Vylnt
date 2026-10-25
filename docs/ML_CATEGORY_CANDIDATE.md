# Controlled category candidate protocol — 2026-10-26

Registered before new collection and fitting. This is a development experiment, not a model release or a relaxation of ML-Q.

## Data changes

Retain the ten existing pinned application repositories and their actual family IDs. Add five script attribute combinations (classic blocking, classic async+defer, module async, module defer and module async+defer), each permitted/excluded by the controlled enforced CSP. Preserve the original script cases. The browser must independently verify execution or an enforced CSP violation and exercise the original application. These are distinct metadata variants, not new application families.

Add two cookie counterexamples: a session-lived preference that requires JavaScript access, and a persistent server-only fixture cookie. Verify preference readability and server authorization behavior independently of detection rules. Keep cookie values and page content out of evidence and training. Compare these with the existing persistent preference and session-lived server-only case. Expiry is not proof of purpose. Conflicting identical inputs must remain conflicts and cannot be relabelled to make training pass.

All additional data remains controlled. Preserve original records, frozen datasets, evaluated candidates and published failures. Do not count annotations or repeated resources as independent examples. No additional repositories, family counts or human reviews are implied by this increment.

## Candidate policy 4

Reuse the evidence-v3 numeric schema, eight-unit LSTM, 74-step bound, 128 KiB model ceiling, seed 42 and 60 epochs. Keep the existing family/identical-input split algorithm. Fit only categories with both classes in both training and validation after uncertainty/conflict filtering. Unsupported categories always abstain. Balance training loss by category and class; select the checkpoint on the corresponding balanced validation loss. The logistic comparator uses the identical eligible examples, complete input tensors, family partitions and sample weights.

Calibrate and select the existing two thresholds separately for each supported category on validation only. Store those decisions in a hash-bound policy sidecar; do not change the historical model format or use global thresholds as a fallback. The model's legacy global threshold pair is explicitly disabled. Numeric parity uses eligible development examples only.

Freeze the candidate, model, logistic parameters, training recipe, category policy and parity before any test. Evaluation must refuse unless each requested category passes count/family preflight and its test families and exact numeric variants are disjoint from the prior experiment corpus, including previous training and validation. The original consumed holdout cannot become a fresh test merely because the candidate policy or family names changed. This increment supplies no fresh independent holdout; a new collection of independent applications is still required for qualification.

The new candidate is developer-only. Existing release commands must reject it. No score may suppress dashboard findings, change severity, affect GitHub blocking or silently alter frozen reports. Passing development metrics is not qualification. All original per-category precision/recall/coverage/comparator and safety targets remain required.

## Acceptance

- Collect all new cases with passing configuration, original-application and browser behavior oracles.
- Demonstrate opposite cookie purposes can have identical numeric features, without learning purpose from names or lifetime.
- Verify unsupported-category abstention, train-only fitting, validation-only threshold selection, same-input logistic comparison, exact frozen identities and rejection of consumed/insufficient holdouts.
- Fit once using the registered recipe, execute Python/JavaScript parity and publish development results and remaining deficits. Do not consume an ineligible test.

## Executed result

All 140 controlled browser cases passed. The original 190 examples reproduce exactly and remain unchanged in the combined 300-row corpus. Twenty opposite-purpose cookie pairs have identical numeric inputs and retain conflicting labels. The candidate fitted once on 96 JS-002 training examples, selecting its checkpoint/calibration on 32 validation examples. Its 55,101-byte artifact passed four numeric parity cases (maximum error 4.53e-8) and 84 category/comparator decision cases. Seven unsupported categories always abstain. The test command refused before inference: two previously seen held-out families and insufficient per-category counts cannot qualify the model. No release changed.

See [readable results](../ml/evaluations/category-v4-2026-10-26.md) and [aggregate numeric records](../ml/evaluations/category-v4-2026-10-26.json). No external provider, Docker, deployment, user training controls or private user scans are involved.

## Developer commands

Collect the profiles above using `ml:applications` and the unchanged pinned source lock. Use `ml:extend:corpus -- --base-manifest <original manifest> --base-dataset <original dataset> --run <completed run> --output <new private cohort directory>`. Supply the original private `VYLNT_ML_DATASET_KEY` through the process environment; never print or commit it. The command requires matching completed oracle records, reproduces the original dataset and rejects changed old rows/family identities. Output belongs under ignored `.local/`.

These paths refer to this machine's private corpus, not files shipped to end users. Use a new candidate directory; existing registration/training/evaluation outputs cannot be overwritten.

```powershell
npm.cmd run ml:insights:v4 -- readiness --dataset .local/ml-category/cohort-2026-10-26/dataset.json --previous-dataset .local/ml-expansion/cohort-2026-10-22/dataset.json --output .local/new-category-readiness.json
npm.cmd run ml:insights:v4 -- register --dataset .local/ml-category/cohort-2026-10-26/dataset.json --previous-dataset .local/ml-expansion/cohort-2026-10-22/dataset.json --output .local/new-category-candidate --epochs 60
npm.cmd run ml:insights:v4 -- train --dataset .local/ml-category/cohort-2026-10-26/dataset.json --previous-dataset .local/ml-expansion/cohort-2026-10-22/dataset.json --output .local/new-category-candidate
npm.cmd run ml:verify:candidate -- --candidate .local/new-category-candidate --output .local/new-category-candidate/browser-parity.json
npm.cmd run ml:insights:v4 -- evaluate --dataset .local/ml-category/cohort-2026-10-26/dataset.json --previous-dataset .local/ml-expansion/cohort-2026-10-22/dataset.json --output .local/new-category-candidate
```

The current corpus fails the final command with a fresh-holdout/count error. It writes `evaluation-blocked.json` without consuming the test. An eligible candidate also needs an executed, matching `browser-parity.json` before the exclusive test-consumption marker is created. Numeric unit fixtures exercise this once-only path; they do not count as application qualification evidence. Neither `ml:validate`'s legacy audit nor the existing release commands approve v4 candidates.

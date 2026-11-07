# VYLNT evidence-v4 candidate training

Implemented 2026-10-28. This is developer-owned Stage D tooling, not a qualified model or a user dataset workflow. The JS-002 release and historical engines remain unchanged.

## Registration and fitting

The latest preparation is `.local/ml-q-material-datasets-006`. Candidate
preflight credits **47 of 630 eligible examples** with all seven categories
below their fitting gates. Five signed Yoyo cases extend the original family
in validation, with the same twelve source roles. See the measured data and
per-class gaps. [Dataset results](ML_REGISTERED_DATASETS.md)

**7 November native-context continuation.** The earlier development preparation
is `.local/ml-q-material-datasets-005`, with **42/630 eligible examples** and zero
categories ready for fitting. It preserves eleven previous source roles and
adds registered HomeInventory preference contexts in the replaced Notepad
training slot. Each of Secure and HttpOnly has two contextual target variants
in one family; contextual validation coverage is still absent. Candidate
creation is refused. Actual copied-data checks retain the historical 18/38
counts, reject forged readiness and verify that no candidate output is created.
No remaining-category model was fitted or qualified. [Exact counts and source
scope](ML_REGISTERED_DATASETS.md).

**6 November counting correction.** New authenticated preparation
`vylnt-native-prepared-v2` uses the user-approved material-context policy.
`.local/ml-q-material-datasets-002` credits 38/630 cases, leaving all seven
categories below fitting requirements. It recomputes the category projection in
both TypeScript and Python and checks its registered implementation hashes.
Within-family repeats are excluded; equal numeric inputs across independent
families are audited and permitted. Unknown examples contribute no fitting
weight, and supported conflicts abstain. LSTM and logistic fitting, scaler,
validation checkpoint loss, temperature calibration and threshold selection
apply equal-family weights within category/class. Calibration uses validation
only. The grid, uncertain interval and quality thresholds remain unchanged.

Legacy native-v1 preparation retains its stricter behavior and 18-case result.
The sections below describing cross-partition exclusions apply to that legacy
format. The material format is intentionally not accepted by the current strict
holdout/release path. Family-clustered qualification and conflict-aware runtime
abstention remain required before promotion. No real remaining-category model
was fitted. [Current preparation and counts](ML_REGISTERED_DATASETS.md)

Concurrent candidate commands now use separately created feature modules and
JSON contracts and remove their own temporary command directories. Actual
concurrent preflights preserve both protocols' results. Authenticated material
reader tests, weighting/calibration tests and actual tampered-data refusal
checks passed. Complete Python ML validation passed 72 tests.

Current native acquisition (5 November): `.local/project-native-seeds-009` has twelve families/52 completed batches, with 67 repeated inputs removed. Actual preflight refuses fitting because this remains a seed aggregate, lacks eligible registered 8/4 assignments and does not meet any category's distinct class-count requirements. No real seven-category fit occurred. See `ML_NATIVE_TWELVE_FAMILIES.md`; twelve collected sources or generated category filenames do not establish training readiness. Earlier aggregates remain unchanged.

`ml/project_candidate.py` reads the output of the existing signed-project preparation workflow. The Node wrapper generates the feature contract from the current TypeScript evidence-v4 extractor. Readiness is recomputed from the rows and frozen assignments, not accepted just because an audit says ready.

Requirements before registration/fitting:

- Exactly eight training and four validation application families.
- For each of the seven categories: 30 distinct examples per class in training and 15 per class in validation, with each class across at least three families.
- Correct numeric variant identities, compatible schema and unchanged dataset/split/preparation binding.
- No test partition. Unknown/conflicting contexts and cross-partition equivalent inputs are excluded; duplicates cannot inflate counts.

There is currently no eligible twelve-family development dataset. Preflight reports the exact deficits and exits 2. Candidate registration refuses insufficient data and creates no output directory. The code cannot supply missing family independence, native evidence or oracle correctness; those remain prerequisites from the preparation workflow in `ML_PROJECT_DATA.md`. Hashes bind local prepared artifacts, not independent source truth or protection against a malicious process running as the same OS user.

Registration binds the dataset, split, feature contract, preparation registration, epochs, seed and trainer/imported-engine source hashes. Registration/output files are exclusive. A changed registration is rejected. `training-started.json` is written before fitting; interrupted/failed attempts remain recorded and cannot silently rerun in the same candidate directory. Register a separate experiment for a new attempt.

Fitting uses an eight-unit LSTM, at most 74 steps and a maximum 128 KiB numeric model. Seed 42, deterministic Torch operations, Adam at 0.01, gradient clipping and the existing 60-epoch default are retained. Category/class balancing is applied. Checkpoint selection, category calibration and two decision thresholds use validation only. The logistic comparator uses the same complete ordered inputs/length and partitions; its scaler and parameters are fitted on training only.

Artifacts are experimental: model, logistic comparator, category policy, numeric parity fixtures, training record and a byte-hash candidate manifest. Global thresholds stay disabled for classification; there is no release promotion or holdout prediction command here. Archived models/parsers, active React/API analysis and frozen reports are not changed.

## Commands

```powershell
npm run ml:projects:candidate -- preflight --prepared .local/project-development-prepared
npm run ml:projects:candidate -- register --prepared .local/project-development-prepared --output .local/project-candidate-001
npm run ml:projects:candidate -- fit --prepared .local/project-development-prepared --output .local/project-candidate-001
npm run ml:projects:parity -- .local/project-candidate-001
```

Use `--epochs` during registration only if selecting a separately registered protocol. The wrapper supplies the actual feature contract automatically. Set `VYLNT_PYTHON` if the installed PyTorch/scikit-learn runtime is not the default `python`. Private inputs and output remain under `.local/`; no family key is replaced or printed.

The parity command checks manifest/file hashes, bounds and numeric shapes, then executes JavaScript against Python fixtures at tolerance 1e-6. Version-2 fixtures compare the archived shared LSTM probability kernel, a separate experimental v4 logit kernel, complete-input logistic inference, per-category calibrated scores and exact model-only decisions. Logits are retained directly; inverting a saturated sigmoid would lose calibration information. The logistic comparator uses the full 74-step padded vector and normalized length, matching Python.

Synthetic policy-contract cases separately exercise all three states, threshold boundaries, saturation, disabled 0/1 policies and unsupported categories. They are not additional application examples, model evaluation cases or qualification evidence. Existing evidence-v4 uncertainty/high-severity safeguards still belong after model proposals; this developer runtime does not bypass them or activate a Worker/API classifier.

```powershell
npm run ml:projects:parity -- .local/project-candidate-001 --browser chromium
npm run ml:projects:parity -- .local/project-candidate-001 --browser msedge
```

Each environment writes an exclusive record bound to the candidate/model and numeric/decision runtime source hashes. Browser checks use an isolated blank page with network requests blocked and close the browser afterward. Legacy version-1 fixtures can still receive numeric-only verification; their records explicitly say category decisions/logistic parity were not checked. They are not silently upgraded. Historical kernels, releases and saved report bytes remain unchanged.

## Validation and remaining gates

2026-11-05: preflight now recognizes seed-audit v2 as well as v1. The parameterized Python command regression passed all preflight/register/fit refusal paths for both formats. Actual preflight against `.local/project-native-seeds-004` reports the unmet cohort/class gates and performs no fitting or predictions, even though the corpus now retains one contextual framing scenario. This is a compatibility/refusal change; any future candidate must register the current trainer identity rather than reuse historical registration bytes.

Five Python tests passed: detailed deficits, duplicate/conflict/cross-partition exclusion, schema/dataset/test-partition tampering, refusal before fitting, and temporary optimizer/logistic/calibration/export/parity mechanics with immutable registration. The optimizer smoke mocks readiness inside the test only, uses synthetic temporary data and deletes its artifacts. It is not a real application candidate or eligible corpus. The real CLI keeps every readiness gate.

`npm run test:projects:candidate` passed the real wrapper/TypeScript-contract/empty-data preflight and registration-refusal lifecycle. No fitting occurs in that command. Initial Python temporary-directory sandbox denial was resolved by using disposable workspace-local test directories. No quality gate was relaxed.

2026-10-28 decision-parity phase: four runtime unit tests plus seven existing evidence tests passed. The five Python mechanics tests passed with executed Node, Chromium and Edge parity, including 28 synthetic policy-contract cases per environment, exact candidate decisions, numeric agreement within 1e-6, immutable registration and historical-engine isolation. The temporary candidates are removed; the non-identifying execution summary is `test-results/project-candidate/decision-parity.json`. Type checking passed. This verifies implementation agreement, not real-world quality or all-category evaluation coverage.

Still open: eligible independent applications/oracles and development collection; real candidate fitting and frozen release provenance; genuinely fresh holdout registration/evaluation with original quality gates; qualified Worker/API/report integration and migration 006. Runtime/qualified-report acceptance is separate from these mechanics tests. ML-Q cannot close from parity alone.

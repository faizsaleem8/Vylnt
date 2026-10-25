# ML validation

The validation command separates working software from a qualified security model. It does not alter the dashboard release, original scans, saved insights or blockchain hashes. Ordinary users do not prepare training data or run Python.

## Run the developer audit

Use the existing offline Python dependencies in `ml/requirements-lstm.txt` and the repository's locked npm dependencies. `VYLNT_ML_PYTHON` can select the Python executable; the legacy environment name remains an alias.

```powershell
# This private dataset/candidate already exists on the development machine.
npm.cmd run ml:validate -- --dataset .local/ml-expansion/cohort-2026-10-22/dataset.json --candidate .local/ml-expansion/cohort-2026-10-22/candidate-v1 --reproduce --output .local/ml-validation-new-run
```

Choose a **new** output directory for each run. Existing results and inputs are never overwritten. The output must be under ignored `.local/`; private datasets are not downloaded or bundled automatically. On a fresh checkout, developers must first reproduce the authorized collection/preparation workflow in `ML_DEVELOPER_WORKFLOW.md` and `ML_CORPUS_EXPANSION.md`.

For coverage preflight on a proposed dataset, omit `--candidate` and `--reproduce`. This performs no inference. Check each requested category before registering/fitting a new qualification candidate. A global `fitReady` value only means the development cohort contains both classes overall; it does not establish class coverage within every category.

Outputs:

- `validation.md`: readable coverage, failed gates and next work.
- `validation.json`: aggregate numeric audit, development diagnostics, historical metrics/intervals and parity identities.
- `audit.json`, `parity.json`: intermediate records; only the final validation files mean all requested stages completed.
- `reproduction/`: optional separately fitted copy, never evaluated on the held-out set or promoted.

Exit codes: **0** means all eight categories satisfy both coverage preflight and the recorded gates, with release review/integration still required; **1** means the audit completed but qualification remains blocked (including dataset-only preflight); **2** means invalid input, artifact disagreement, failed parity/reproduction, an existing output directory or an execution error. A subprocess error does not print private evidence or raw Python traceback values.

## What is checked

- Exact schema, bounded numeric examples, duplicate identities, actual family/shared-input partitions and conflicts.
- Policy-specific controlled versus reviewed provenance; the controlled v3 policy does not require human reviewers.
- Training/validation class availability per category, ten held-out families, 30 examples per class and three families per class.
- Frozen candidate file hashes, dataset/split identities, training partition counts and development-only conflict safeguards.
- Historical evaluation/consumption identities, class/family counts, feasible summary metrics, Wilson intervals, family-bootstrap structure, comparator consistency and independently recomputed approval booleans.
- Python reference scores through the same numeric JavaScript implementation used in the browser, with tolerance `1e-6`.
- Optional exact reproduction of LSTM weights/calibration/thresholds, logistic parameters and validation checkpoint selection using the frozen training recipe.

The audit never predicts on the held-out set. Existing test metrics are inspected for consistency rather than re-measured; a mutable local evaluation file is not a signature or independent attestation. Runtime/browser acceptance is a separate check. Reproduction runs training and validation only, with the original seed/epochs, in a new directory and cannot create a test-consumption marker.

## Current data diagnosis

The newer [category-policy v4 experiment](ML_CATEGORY_CANDIDATE.md) expands the corpus to 300 rows and fits a JS-002-only development candidate. It has its own `readiness/register/train/evaluate` commands and an executed category-parity check. The legacy `ml:validate` audit below still applies to v2/v3 frozen evaluations; it does not approve or audit v4 release quality. The newer candidate also remains blocked, with no holdout predictions or release change.

The existing expanded v3 cohort has 190 rows, 163 numeric variants, 11 total application families and only **two held-out families**. Nineteen inputs have conflicting/unknown labels; 17 are in development. After uncertainty/conflict filtering:

- HttpOnly (`CK-002`) has **zero change-required examples** in both training and validation. Its historical held-out recall is zero. Matching observable metadata with conflicting intent must remain uncertain.
- HSTS, framing, script policy, Secure cookies, SameSite and mixed-resource categories have **zero contextual development examples**. Their tiny test results cannot establish useful binary discrimination or improved precision over rules.
- Script integrity (`JS-002`) has both classes in development, but its held-out 8 change-required / 6 contextual examples and two families fail coverage gates.

Adding more copies of the same harness or changing family identifiers cannot solve these gaps. Developers need genuinely distinguishable scenarios and independent application families, preserving unknown labels where the scanner cannot observe the deciding context. A new untouched test cohort and preregistered candidate are required before another qualification experiment. The published failed holdout must not guide thresholds or checkpoint selection.

The current release remains experimental and display-only. No new category is approved by this work. Controlled measurements cannot establish general accuracy on users' applications. See [qualification plan](ML_QUALIFICATION_PLAN.md) and [measured records](../ml/evaluations/README.md).

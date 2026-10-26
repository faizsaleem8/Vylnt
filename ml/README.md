# VYLNT experimental ML

Current status (2026-10-27): JS-002 is qualified only within its recorded controlled-application scope. The remaining seven categories are open under [ML-Q project-backed qualification](../docs/ML_PROJECT_QUALIFICATION.md). Evidence-v4 and the local companion are development infrastructure; no v4 candidate is trained or released yet. The older dated sections below describe historical experimental models, not the current category release. See PLAN.md for current validation results.

Current milestone status (2026-10-23): **experimental M6 is closed by user approval**. [Model qualification](../docs/ML_QUALIFICATION_PLAN.md) is tracked separately and remains open; no category is validated. The expanded v3 experiment failed qualification and remains developer-only. Active v2 analysis is display-only and cannot hide findings or change severity. Local M5 blockchain acceptance is complete; next product work is remaining GitHub Actions M4; Docker/deployment are excluded. See [ML build plan](../docs/ML_BUILD_PLAN.md).

## Current evidence-v2 workflow

The active v2 release is now a trained controlled LSTM under the display-only `vynlt-controlled-signal-v1` policy. Saved scans run automatically in a React Worker; eligible known variants receive experimental scores, while findings/assessments/severity remain unchanged and missing/conflicting/unfamiliar inputs receive no score. No category is qualified. The actual failed category evaluation and training provenance are in [evaluations](evaluations/README.md). Human review is not required for the current controlled phase. Full-data Print / PDF remains separate from immutable insights JSON/PDF; combined and original hashes are distinct. Migration 005/report retrieval passed 14 live two-account checks. The older v1 sections below are historical mechanics and do not describe the current release.

Use [ML build plan](../docs/ML_BUILD_PLAN.md), [developer review/training workflow](../docs/ML_DEVELOPER_WORKFLOW.md) and [evaluation record](../docs/ML_EVALUATION.md) for current commands. Evidence-v2 uses matched target metadata, unknown=-1, identifier-free variants, an eight-unit numeric LSTM and at most 74 steps / 128 KiB model bytes. Human-review disagreements become one needs-review target. Candidate parameters are frozen before test; runtime/staging require the current qualification policy. Controlled-data and numeric-fixture results are not real-world quality evidence.

## Legacy v1 snapshot LSTM reference (development fixtures)

The following v1 feature schema, fixed threshold and 64 KiB artifacts describe the retained synthetic development fixtures. They are not the current reporting/release workflow and cannot de-emphasise real findings. Their earlier repetitive same-rule scores motivated issue-specific evidence-v2 extraction.

The sequence schema is `vynlt-snapshot-sequence-v1`: 24 binary values per step, with coverage first, up to 24 resource tokens, up to 24 script tokens, up to 24 cookie tokens, then one target-rule token (maximum 74 steps). It encodes flags such as HTTPS/external resource, failed load, script integrity, cookie attributes and missing collection. A truncation flag discloses when a group exceeds its cap. Within each group the existing array order is retained. This is **structural snapshot order**, not event chronology, execution behavior or source-to-sink flow. No URLs, cookie names/values, page text, credentials, request bodies or review notes enter the sequence.

The model uses one 8-unit LSTM layer and a binary output head. Python trains on CPU with Adam, balanced training loss, gradient clipping and a checkpoint selected using validation loss. The threshold stays 0.5; test data is excluded from optimization/checkpoint choice. Sequence lengths are packed so padding does not change hidden states. Logistic and all-alerts comparators use the same application-family splits. Only rules with both labels in the training partition are supported; other findings produce abstentions. This mechanical coverage check is not statistical sufficiency or approval. Scores remain uncalibrated.

The browser runs the recurrent equations directly from validated numeric JSON, using PyTorch's input/forget/candidate/output gate order; no Python service, model execution code, GPU, Docker or extra site permissions are required. State resets for each target. The recurrent implementation is checked against independent PyTorch scores, including 2-step and 74-step inputs. Model parsing rejects unknown fields, dimensions, nonfinite/oversized parameters, incompatible features and approval claims. Model release size remains capped at 64 KiB. Both logistic and LSTM artifacts are accepted by the developer bundle tool.

### Run or train the LSTM

```powershell
# Use the private Python environment described below. PyTorch is training-only.
python -m pip install -r ml/requirements-lstm.txt
npm run ml:demo:lstm
python -m unittest discover -s ml/tests

# Developer-only preparation of independently annotated exports; same private HMAC key.
npm run ml:prepare -- --sequence --manifest ml/data/annotations.json --output ml/data/sequences.json
npm run ml:train:lstm -- --dataset ml/data/sequences.json --output ml/artifacts/lstm-v1 --epochs 60
npm run ml:bundle -- --model ml/artifacts/lstm-v1/model.json --check
# Bundle only after reviewing the recorded evaluation/limitations.
npm run ml:bundle -- --model ml/artifacts/lstm-v1/model.json --name "VYLNT experimental LSTM"
npm run check
```

Multiple sequence datasets may follow `--dataset`; global duplicate/family/schema checks run before training. Combined files are capped at 64 MiB and 50,000 examples. Baseline feature exports cannot be silently converted into sequences; prepare again from the sanitized source reports. No ordinary user training controls are added. `VYLNT_ML_PYTHON` selects the interpreter for demo commands; direct training/test commands use the invoked `python`.

Artifacts: `model.json`, `evaluation.json`, `split-groups.json`, independent framework `parity.json`, and logistic `baseline.json`. Evaluation records dependency versions, merged dataset SHA-256, split/training seeds, losses and held-out confusion/precision/recall/F1/FPR/FNR. Missing denominators are null. Freeze the dataset and review family identity before interpreting results. The committed browser parity fixture contains only synthetic numeric inputs/weights.

The first bundled experiment used 480 synthetic examples across 30 families (288 training; 96 validation; 96 test), covering all eight current rule IDs. Identical inputs intentionally carry opposing assigned labels. In this release, test LSTM F1 is 0 and false-negative rate is 1, while the logistic/all-alerts F1 is 0.667 and false-positive rate is 1. These deliberately ambiguous fixtures validate mechanics only and establish **no useful detection quality or improvement**. The dashboard displays a prominent synthetic warning and never hides or rescales findings. This is not a model for security decisions. Research acceptance must use independent evidence rather than these figures.

Still needed: independent category labels and agreement audit, representative data/frozen holdouts, real evaluation/calibration, consented operation sequences for behavioral claims, category-specific remediation review, and combined-report persistence/export. The snapshot LSTM does not complete M6. See [pipeline](../docs/PIPELINE.md).

Equation reference: [official PyTorch LSTM documentation](https://docs.pytorch.org/docs/stable/generated/torch.nn.LSTM.html). The locally validated training environment is PyTorch 2.7.1+cpu, Python 3.12.6, NumPy 1.26.4 and scikit-learn 1.5.2; other dependency versions need validation.

## Logistic baseline reference (earlier increment)

This first ML increment implements an offline logistic-regression baseline and data preparation pipeline. Its target is whether an existing configuration alert warrants follow-up (`actionable`) or is independently adjudicated as expected in context (`contextual`). Neither label means exploitable/safe. `unreviewed` examples are excluded from training/evaluation.

The logistic baseline remains available for comparison and release compatibility. The dashboard now defaults to the synthetic snapshot LSTM described above. There is no approved production model, Python inference service or automatic suppression. The scanner's eight rules, severity, confidence and score remain unchanged. More instrumentation and reviewed data are needed for meaningful behavioral detection.

## Automatic ML in the React dashboard

Open a saved scan. VYLNT automatically loads its bundled model and runs analysis in React; users do not prepare datasets, upload models or click Run. The visible ML section reports progress, errors, results and model identity. Loading does not depend on expanding a disclosure. When a scan changes, the previous results disappear immediately; pending analyses cannot restore results after navigation/disconnect. The model must match the scan ruleset, otherwise analysis reports unavailable and original rule findings remain usable.

Inference validates the numeric release and dispatches to the matching logistic or LSTM feature schema/runtime, abstaining on unsupported rules. It runs locally with no prediction API request. Loading the interface fetches its static code chunk; no report/model/feature data is sent elsewhere for analysis. Results remain in page memory and are excluded from existing JSON/PDF/hash exports until combined-report finalization is implemented. This currently analyses the saved scan being viewed, not all remote scans while the dashboard is closed.

**The bundled release is synthetic.** Its trained weights demonstrate automation and recurrent inference only; scores are no longer fixed at 0.500. It has no established real-world accuracy and must not guide security decisions. Nothing is hidden, suppressed, marked fixed or re-scored. A vetted real-data model is still needed.

## Developer model ownership and release

VYLNT developers own data preparation, independent labeling, training, held-out evaluation and model releases. Ordinary users should not perform these tasks. Keep private source reports, annotations, datasets and evaluation records outside the product interface; the manifest workflow below remains available for developer use. Do not automatically turn rule scores, model predictions or saved review verdicts into ground-truth labels. Feature extraction is automatic; trustworthy security labels require independent evidence.

After training and evaluating an experimental model, validate and bundle it for the React build:

```powershell
npm run ml:bundle -- --model ml/artifacts/baseline-v1/model.json --check
npm run ml:bundle -- --model ml/artifacts/baseline-v1/model.json --name "VYLNT experimental baseline"
npm run check
```

The command validates size (64 KiB), exact feature schema/order, finite numeric parameters, supported experimental format and current ruleset before writing `packages/ml/bundled-model.ts`. `--check` validates without replacing the release file. Document the model identity, dataset/evaluation and limitations in PLAN.md, then rebuild/deploy the dashboard. These checks establish artifact compatibility, not quality approval. The current schema requires `liveUseApproved: false`; production acceptance/rollout remains open. No private dataset, annotations or Python/scikit-learn dependency is bundled into React. Users receive the numeric model with the app, and its canonical SHA-256 is displayed automatically.

## Run the synthetic pipeline

Use Python 3.10+ with NumPy/scikit-learn. From the project root:

```powershell
python -m venv .local/ml-venv
.local/ml-venv/Scripts/python.exe -m pip install -r ml/requirements.txt
$env:VYLNT_ML_PYTHON = (Resolve-Path .local/ml-venv/Scripts/python.exe).Path
npm run ml:demo
```

On Linux/macOS use `.local/ml-venv/bin/python`. Alternatively an existing `python` environment with the dependencies works; `VYLNT_ML_PYTHON` selects the interpreter for the demo only. The full Python test suite now includes the LSTM and requires `requirements-lstm.txt`: `python -m unittest discover -s ml/tests` (or `npm run test:ml` for system Python). For baseline-only dependencies use `python -m unittest discover -s ml/tests -p test_baseline.py`. The initial validated environment is Python 3.12.6, scikit-learn 1.5.2, NumPy 1.26.4; other allowed dependency versions need revalidation. Freeze the environment used for a research result.

The demo writes `test-results/ml-demo/dataset.json` and `model/{model,evaluation,split-groups}.json`. It creates 60 synthetic examples in 30 synthetic application families. Each family deliberately has identical observable metadata with opposing assigned labels. Those labels exercise mechanics only; they are not independent evidence of impact. In the first run, logistic regression matched the all-alerts-actionable comparator (test precision 0.5, recall 1, F1 0.667, false-positive rate 1). **No false-positive improvement or real-world accuracy is established.** Timing is batch-local and includes preprocessing; it is not a service latency benchmark.

## Prepare independently reviewed examples

### Prepare from a private annotation manifest

Place exported report JSON files and a private annotation manifest under ignored `ml/data/`. Example manifest:

```json
{
  "version": 1,
  "examples": [
    {
      "reportFile": "reports/scan.json",
      "findingIndex": 0,
      "familyId": "private-application-family-reference",
      "label": "actionable",
      "provenance": "reviewed",
      "reason": "security-impact-confirmed"
    }
  ]
}
```

The index is zero-based in the current ruleset's recomputed, sorted findings. Exported `rulesetVersion` must match the current ruleset; re-review after rule changes. Annotators must examine the finding in context and retain independent supporting records privately. Do not use this example's label without that review. Valid pairs are:

| Label | Reason | Interpretation |
|---|---|---|
| `actionable` | `security-impact-confirmed` | Independent context confirms a security-relevant follow-up is warranted |
| `contextual` | `intended-configuration` | Independent review establishes the alert is expected in this context |
| `unreviewed` | `insufficient-evidence` | Ground truth is unavailable; exclude from supervised evaluation |

Review verdicts (`fixed`, `accepted_risk`, `false_positive`, `open`) are not imported as ground truth. A user decision or rule score alone cannot establish the training label. Provenance is `reviewed` for genuinely adjudicated examples and `synthetic` for generated fixtures; experiments reject mixing them.

Assign the same family ID to all related sites, subdomains, ports, local copies, templates and variants of an application. A family is not merely an origin. The system cannot infer shared ownership or template ancestry automatically. Misgrouping can invalidate evaluation even though no group IDs overlap.

Create a private random HMAC key once, keep it outside source control, and reuse it for this dataset's preparation. For example, generate a value with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, then set it locally as `VYLNT_ML_DATASET_KEY`. Never put it or credentials in annotations or chat.

```powershell
npm run ml:prepare -- --manifest ml/data/annotations.json --output ml/data/dataset.json
python ml/baseline.py --dataset ml/data/dataset.json --output ml/artifacts/baseline-v1
```

The preparer recalculates findings from sanitized observations and exports only a fixed numeric feature vector, opaque HMAC IDs, versions, labels and bounded reason/provenance categories. It omits URLs, cookie names/values, credentials, page/source text, raw evidence, review notes, rule scores and family names. HMAC groups are pseudonymous, not a guarantee of anonymization. Do not publish datasets without an appropriate review. Preparation rejects duplicate annotations and assigns each identical scan to one family.

The feature schema has 24 numeric values: rule/severity/confidence one-hot indicators, header/DOM/cookie availability, HTTPS, normalized cookie/script counts and external-script/mixed-resource fractions. Availability flags distinguish missing collection from zero observations. Current features do not capture JavaScript source/sink flow, actual exploitability or application intent.

## Evaluation and artifacts

The trainer validates exact schema/feature names, finite ranges, one-hot fields, unique samples and one family per scan. It requires one ruleset/provenance per experiment. Complete families are assigned deterministically by a seeded hash to roughly 60/20/20 train/validation/test partitions, independent of labels. At least five families and both labels in every split are required mechanically; these are not statistical sufficiency criteria. Do not search seeds by test performance to get a favorable split.

Scaling and class-balanced logistic regression are fit on training data only. The threshold is fixed at 0.5; validation and test reports include precision, recall, F1, false-positive/negative rates, confusion counts and local inference timings against a comparator that marks every alert actionable. These metrics concern triage of existing alerts; they do not measure vulnerabilities that the rules never generated a finding for. Undefined denominators become JSON `null`. Scores are uncalibrated triage scores, not probabilities of compromise. This follows the separation principles in scikit-learn's [data leakage guidance](https://scikit-learn.org/1.8/common_pitfalls.html) and [grouped evaluation documentation](https://scikit-learn.org/stable/modules/cross_validation.html).

The artifact is numeric JSON, not an executable pickle. It records feature order/version, ruleset, scaling, coefficients, intercept, threshold, provenance and `liveUseApproved: false`. The evaluation records dependency versions and merged dataset SHA-256; split manifests retain only opaque family IDs. Keep dataset and split manifests fixed when comparing baseline/LSTM. Adding families can change assignment boundaries; future retraining needs a frozen independent holdout protocol and acceptance review. Training and explicit annotation export are separate from normal scanning.

## Historical v1 next-work notes (use ML_BUILD_PLAN for current scope)

1. Collect independently reviewed examples across genuinely distinct application families, with per-rule coverage and documented label agreement.
2. Audit class balance, near-duplicate/template families, rule/coverage confounding and representativeness; freeze evaluation data and acceptance criteria.
3. Implement consented source/sink or operation-category sequence collection without raw code/page text. Define sequence meaning and missing coverage before choosing a vocabulary.
4. Train and compare an LSTM on the same held-out families; calibrate/review thresholds using validation only and report false negatives by severity.
5. After acceptance, decide whether browser inference is sufficient or a versioned Python endpoint is needed for a larger model. Automatic React analysis is already available; production approval, evaluated model rollout and backend annotations remain future work. Preserve every original finding, especially high severity.

No Docker, new SQL migration, hosted account, GPU or TensorFlow is needed for this baseline increment.

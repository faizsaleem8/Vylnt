# VYLNT evidence-v4 fresh holdout

Implemented 2026-10-29 as Stage E developer tooling. There is still no eligible seven-category development corpus, fitted real candidate or selected fresh holdout. This workflow does not qualify a category, collect user datasets, retrain a model or promote a release. JS-002 and its historical artifacts remain unchanged.

## Registration before collection

Finish the existing independent development preparation and candidate fitting first. Execute version-2 Node, Chromium and Edge parity using the candidate commands in `ML_PROJECT_CANDIDATE.md`. Then select twelve new independent application families without predicting their results.

The holdout source lock uses `vylnt-project-holdout-sources-v1` and `partition: "holdout"` for all families. Its other source, licence, revision, implementation, adapter and oracle fields follow the development source schema. The assessment specification must match development. Selection still requires developer checks of native suitability, upstream/fork relationships and licence/source truth; hashes do not establish those facts.

```powershell
npm run ml:projects:holdout -- register --candidate .local/project-candidate-001 --development .local/project-development-prepared --development-sources .local/project-development-registration/sources.json --source .local/project-holdout-sources.json --exposure .local/historical-exposure.json --output .local/project-holdout-registration-001
```

Use the complete retained historical exposure registry. Registration adds the candidate's development family/input identities to a private copy; it does not alter historical files or the existing private family key. It rejects canonical-family/repository reuse, shared security implementations and duplicate source templates against development and within selection. Previously exposed family hashes are rejected. Independent review of historical fork/template relationships remains necessary where the registry lacks source details.

The frozen registration binds the candidate and policy files, development dataset/split/source lock, historical exposure, selected sources, executed parity identities, feature/preparation/evaluator code and private family identity. Candidate file changes, stale parity or changed registrations cannot proceed. No prediction occurs during registration or preparation.

## Prepare signed application observations

Run the registered developer-owned adapters and independent scenario oracles against the selected disposable applications. The manifest uses the existing `vylnt-project-manifest-v1` report/seal/oracle file references. Each oracle must bind the **holdout** source-lock hash. Supply the installation's retained trusted public-key archive; keys supplied by an uploaded report are not trusted.

```powershell
npm run ml:projects:holdout -- prepare --registration .local/project-holdout-registration-001 --manifest .local/project-holdout-manifest.json --keys .local/project-trusted-public-keys.json --output .local/project-holdout-prepared-001
npm run ml:projects:holdout -- preflight --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001
```

The common signed-input pipeline verifies report sanitization/recalculated findings, Ed25519 source linkage, commit/inspection hashes and scenario identities. Mechanism-fixture evidence cannot enter the application corpus. Previously exposed numeric inputs and repeated observations are retained as rejected records. Conflicts remain uncertain; they never become majority-vote labels.

Only numeric evidence, opaque family identities, severity, provenance hashes and bounded audit/safeguard flags enter the prepared dataset. Safeguard flags come from the existing evidence-v4 policy applied to the original verified evidence. Oracle labels/conflicts are used for readiness and measurement, **never to change inference or repair a test prediction**. Private preparation receipts authenticate dataset/split/audit/rejection hashes and bind the registration.

Preflight recomputes prerequisites rather than accepting `audit.ready`: all seven categories require ten eligible families, thirty distinct contexts per class, each class across three families, compatible target-category features and a validation-selected supported policy. Unknown/conflicting examples cannot satisfy counts. Numeric/previous-family overlap, repeated rows and changed signed receipts fail before consumption. Concrete deficits exit 2 without predicting.

## Once-only evaluation

```powershell
npm run ml:projects:holdout -- evaluate --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001 --output .local/project-holdout-evaluation-001
```

After successful preflight the command writes an exclusive candidate consumption marker under `.local/project-holdout-consumed/` **before inference**. The same frozen candidate cannot be evaluated again through another registration. A crash/interruption retains consumption; a caught calculation failure also writes a failure record. Do not delete markers to retry, select favourable thresholds or substitute applications. Register a genuinely new development experiment and preserve the failed experiment.

The existing JavaScript LSTM/logistic kernels, calibration and category thresholds are reused without fitting. Each numeric variant is inferred once, retaining all observation/family links. Point metrics deduplicate equivalent input/label/uncertainty contexts and preserve the highest severity and conservative evidence safeguards. Repeated resources cannot inflate metric counts. Family-linked uncertainty uses a deterministic 1,000-repetition cluster bootstrap (seed 42); Wilson intervals are also published. Bootstrap samples retain application links rather than treating them as independent resources.

Every category publishes model-only/safeguarded and logistic/rule-only results, abstentions, contextual mistakes and original gates: precision at least 90%, recall at least 95%, coverage at least 50%, zero model-only high/critical actionable contextual decisions, zero safeguarded insufficient-evidence de-emphasis, improved rule precision and at most five percentage points of recall loss. A failed category stays failed. Exit 0 means all evaluation gates passed; 1 means completed evaluation with failed quality gates; 2 means ineligible data or execution/configuration failure.

Even passing evaluation output remains experimental. A gated release command, qualified Worker/API/report integration, migration 006, runtime/export/performance acceptance and their provenance are still required before promotion. No model is bundled by this workflow.

## Bounds and trust

All inputs/outputs stay beneath the current workspace's `.local/`, with resolved-path checks, exclusive writes, bounded reads and at most 50,000 rows, 74 steps and the existing 128 KiB model limit. No cookie values, bodies, credentials, page text or source code enter datasets. Local HMAC receipts protect against accidental edits or unsupported uploaded claims. They are not independent attestation or protection against malicious code running as the same OS user, who controls the files and key. Frozen report limits and existing blockchain/report bytes are unchanged.

Validation: 296 TypeScript tests/56 suites passed, followed by 20 focused tests and type checking after final command hardening. Five Python candidate mechanics tests and production builds passed. The command lifecycle covers authenticated empty preparation/no-prediction deficits, candidate/policy/parity/registration/source/exposure/preparation tampering, failed metrics, post-consumption numerical failure, real process interruption and repeat refusal. An initial test watcher overwrote a successful interruption signal on later filesystem events; the corrected watcher passed both focused and full runs. Unit/command fixtures are synthetic and removed afterward; they do not constitute real candidate fitting, executed application cohorts or qualification. Command mechanics fixtures use isolated synthetic parity records; genuine registrations still require the actual Node/Chromium/Edge parity workflow. Full results and remaining work are in PLAN.md.

# VYLNT seven-category release staging

This developer component verifies a completed frozen evaluation and stages a category manifest. It does not train, repeat held-out predictions, activate a model or change the qualified JS-002 release.

There is currently no eligible twelve-family development corpus, real seven-category candidate or passing project holdout. No real release has been staged by implementing this tool.

## Command

```powershell
npm run ml:projects:release -- --registration .local/project-holdout-registration --prepared .local/project-holdout-prepared --evaluation .local/project-holdout-evaluation --output .local/project-release-stage
```

Use a new output directory. All inputs and outputs remain under ignored `.local/`. The existing private family key is read without replacement; never share it. `--help` does not require data. There is deliberately no `--bundle` or runtime-enable option.

## Verification

The command reuses the complete holdout preflight. Its only accepted deficit is that the otherwise eligible candidate was already consumed. It then verifies private-record authentication, candidate bytes, registered source/exposure identities, prepared-data receipts, exact Node/Chromium/Edge parity records and matching evaluation-start/consumption records. A failed/interrupted marker, missing completion or altered binding rejects staging before output creation.

The completed evaluation's preflight must match current frozen counts. Staging never calls inference to regenerate test results, changes calibration/thresholds or overwrites candidate/evaluation files. Existing holdout registration/evaluation engines are unchanged.

For each category the verifier recomputes the original quality gates from saved metrics: precision at least 90%, recall at least 95%, coverage at least 50%, no model-only high/critical actionable contextual classification, no contextual de-emphasis of insufficient evidence after safeguards, and better rule-only precision with recall loss at most five percentage points. It also enforces ten eligible families, thirty distinct contexts per class and three families per class. Model-only/safeguarded, logistic/rule comparisons, Wilson intervals and family-cluster intervals are retained.

Gate flags and passing-category summaries must agree with those metrics. No passing categories means refusal. Categories that fail remain disabled in the derived runtime policy; thresholds/calibration for passing categories retain their frozen validation settings. The manifest records both the original policy-file identity and the derived runtime-policy hash. Numeric models remain eight-unit/evidence-v4/74-step artifacts bounded to 128 KiB.

## Output and boundaries

`release.json` contains immutable model bytes, staged-category mappings, evidence/policy/evaluation identities, controlled scope, aggregate counts and measured uncertainty. Raw examples, family identifiers, oracle records and private receipts are excluded. Failed categories are not included in the category map. `staging-receipt.json` authenticates the staged file and implementation identity.

Both records explicitly retain `runtimeEnabled: false` and `runtimeAcceptance: pending`. Passing a controlled evaluation is not universal accuracy, independent review or full ML-Q closure. Qualified Worker/API/report acceptance and a separate guarded bundling step remain required. The current application does not consume these staged manifests.

Private HMACs detect altered or mismatched local records. They do not establish source independence/oracle truth or defend against a malicious process with the same OS user's family key. Those remain developer-owned collection/provenance responsibilities.

## Validation

Actual checks are recorded in PLAN.md. Unit tests use hypothetical metrics; command tests use isolated synthetic candidate/source/parity records and a separate test key. They exercise staging/refusal mechanics, not model quality or native application-family eligibility. Test fixtures are removed and never bundled. No real candidate was fitted, no real qualification holdout was consumed and no category was promoted.

On 2026-10-29, 28 tests across five files, type checking, production builds and help passed. Tests cover failed-evaluation refusal, consumed/interrupted/tampered records, exclusive output, partial-category staging, unchanged artifacts/markers and original safety/count gates. Existing Zod/Rollup annotation warnings remain. An initial sandbox temporary-file error was resolved with workspace-local temporary files and an approved test invocation; no timeout or quality gate was relaxed.

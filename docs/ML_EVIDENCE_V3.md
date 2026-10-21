# Evidence v3 experiment protocol

## Expanded controlled-policy checkpoint

The expanded candidate uses candidate/evaluation policy version 3, `controlled-evidence-v3`, with true controlled provenance and all numerical/safety gates retained. Legacy reviewed v2 policy and earlier private v3/version-2 experiments remain historical. Current v2 release staging rejects v3. The 190-row candidate was tested once, failed qualification and is not active; [results](../ml/evaluations/README.md) and [protocol](ML_CORPUS_EXPANSION.md) record the failures. Experimental M6 is closed by user decision; [ML-Q](ML_QUALIFICATION_PLAN.md) is separate and open.

Status: development experiment, registered 2026-10-22 before collection or fitting. Not an approved model release.

The failed evidence-v2 experiment remains immutable. This increment tests whether target-specific CSP metadata resolves one source of identical script inputs. It does not change category quality targets, family identities, fixed split seed, shared-input component grouping, training defaults, comparators or the rule/report severity policy.

## Input and label scope

`vynlt-evidence-v3` adds one column, `targetCspSourceExcluded`, immediately before the eight target-rule columns. All other columns and the 74-step structural snapshot limit remain unchanged. Only the target step receives `1` (simple enforced response policy excludes its source), `0` (recognised source lists permit it), or `-1` (unknown/contradictory/not applicable). This is not observed execution order or a browser execution verdict.

The conservative matcher recognises HTTPS targets and exact HTTPS origins, self, none, and inline hash entries for an external script without integrity. It honours first-directive precedence, script-src-elem fallback and intersecting response policies. Nonces, strict-dynamic, wildcard/path/scheme sources, malformed expressions, missing policy and report-only-only policy remain unknown. A completed resource contradicting exclusion is unknown for the numeric input. URLs are used for local matching only; names, source code and identifiers never enter features.

Reference: [W3C CSP3](https://www.w3.org/TR/CSP3/), particularly source-list matching and directive fallback. The implementation intentionally supports a subset and abstains elsewhere.

## Controlled collection

Collection coverage is explicit: only `cspEvidenceComplete: true` permits source constraints. The CLI/extension compute this boolean before header truncation/redaction; old scans omit it and remain unknown. Truncated headers, nonce redaction and URL privacy changes other than an equivalent origin root slash cannot assert complete source syntax. No raw policy secrets are retained. A strengthened browser/metadata comparison caught root-slash normalisation after the first collection; that initial candidate is diagnostic only and was never tested or promoted. New collection must pass the corrected comparison and actual enforced violation checks.

Use the existing three pinned licensed applications and their existing family IDs. Add six imposed script scenarios: classic defer, classic async and module, each permitted or excluded by an enforced response CSP. Verify actual fixture execution/non-execution with a browser oracle, separately from VYNLT rules and the feature extractor, and verify original application interactions still work. Record only booleans/counts and sanitized scans.

Under this controlled specification, the permitted immutable fixture without integrity is change-warranted; an excluded inventory fixture is contextual for prioritisation only. This does not establish general harmlessness, trust, actual exploitation or intent on arbitrary applications. No failed-resource outcome alone supplies a contextual label.

The same harness applied to more source repositories is not enough to establish independent security scenarios. Repository inventory is exploratory only. Do not inflate holdout family counts, add irrelevant feature variation, move identical inputs across partitions or tune against the consumed v2 test. All v3 labels and collisions undergo the existing frozen component audit before fitting. Failure to obtain independent eligible partitions remains a published failure, not a reason to alter the split.

## Qualification

Use the existing eight-unit PyTorch LSTM, same-input logistic comparator and validation-only calibration/threshold selection. Evaluate a frozen new candidate once only if development partitions are eligible. Browser parity tolerance is 1e-6 and artifacts remain bounded to 128 KiB. Preserve existing raw PDF, active v2 release and frozen report derivation. V3 is developer inspection only until separately measured qualification and release integration pass.

No human reviewer recruitment is required by the user. No Docker, deployment, background user-scan training or blockchain work is part of this experiment.

Validation and measured results are appended after running checks; protocol statements above are not verification claims.

## Measured development result — 2026-10-22

The corrected application run passed all 51 scenarios, including actual enforced CSP violation events, fixture execution/non-execution, metadata constraint agreement and original application interactions. Combined with the previously checked 33-case generated suite, preparation produced 78 rows / 59 tensors / four actual families. Twelve conflicts (three development conflicts) remain audited. Frozen train/validation/test partitions have 32/16/30 rows across 2/1/1 families; filtering leaves 28 training and 14 validation binary examples. The final private run is `.local/ml-applications/runs/2026-10-21T20-41-58-949Z-c786b886`.

The eight-unit LSTM and same-input logistic comparator fitted for 60 fixed epochs with seed 42. Validation selected epoch 60 (loss 0.2741263806819916), calibration and thresholds. The 53,472-byte candidate passed 18 Python/browser comparisons (maximum error 5.766010469088201e-8, tolerance 1e-6). Separate reproducible numeric-only fixtures cover all eight categories at 2/26/50/74 steps, with nonzero weights on the added feature. Parity establishes runtime agreement, not prediction quality.

Coverage preflight still fails: one test family versus ten required; every category lacks 30 examples per class across three families. No v3 held-out predictions were evaluated or test-consumption marker created. No category is approved and the active display-only v2 release remains unchanged. Published numeric records are `ml/evaluations/controlled-v3-2026-10-22-{readiness,training,parity}.json`. Initial pre-correction candidates and the failed stronger harness run remain private diagnostics, never evaluated or promoted.

Reproduce with `npm run ml:prepare:insights -- --schema vynlt-evidence-v3 --manifest <private-manifest> --output <new-private-dataset>`, then `npm run ml:insights:v3 -- readiness|train --dataset <dataset> --output <new-output>`. Keep the private dataset key in the environment. `npm run ml:verify:candidate -- --candidate <directory> --output <new-private-result>` verifies frozen file hashes and executes runtime parity without consuming a holdout or staging a release. Existing v2 release policies explicitly reject v3 artifacts. Final functional validation is recorded in PLAN.md; no hosted/native Edge/accessibility/PDF recertification is implied by these data changes.

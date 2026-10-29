# VYLNT native Tabinator evidence

This second pinned native development application complements Jingo. It is not an eligible training cohort, held-out family count or qualified category. Selection/exclusions were recorded before collection in [ML_NATIVE_COHORT_PLAN.md](ML_NATIVE_COHORT_PLAN.md).

The source manifest pins repository/revision, MIT licence/blob, dependency lock and auth/session/database hashes. The original licence and lock are retained beside it. The runner refuses changed tracked source, copies regular files into disposable storage and excludes existing data. A separately hashed runner binds the listener to loopback. Native auth/session modules are unchanged. Only basic runtime environment variables and fresh synthetic secrets reach the application; upstream logs are discarded because they include body fields.

Independent SQLite reads check that the signed browser session maps to the newly registered synthetic user and that an authenticated bookmark operation creates the expected row. An anonymous request must receive 401 without changing SQLite. These oracles use native behavior, not detection rules, cookie-name heuristics or predictions. The producer separately requires original/anonymous/cookie-removed/restored authentication and original/HttpOnly/restored profile controls.

Default and controlled readable-cookie response profiles remain one family. The latter changes only the response's HttpOnly attribute. The tested native API profile/bookmark scope is partial; it does not establish CSRF protection, TLS, frontend compatibility or behavior on all routes. The upstream frontend requires external CDN scripts and is outside this offline prototype. No authentication wrapper or CDN script is substituted.

After checks and disposable-data cleanup, each run retains a new ignored `.local/ml-native-observations/tabinator/<uuid>/`:

- `report.json`: original sanitized metadata-only scan.
- `evidence.json`: signed evidence-v4 bound to that scan/commit/configuration/adapter.
- `trusted-public-keys.json`: test verification keys, never installed into API trust.
- `native-oracles.json`: separate bounded database/control outcomes and partial route scope, without class labels.
- `source.json`: pinned public-source metadata.
- `acceptance.json`: completed cleanup/reload/tamper checks; only runs with this marker completed all checks.

Cookie values, credentials, session IDs, SQL user records, request bodies, page text and source code are excluded. Temporary databases/private signing keys are deleted. Aggregate checks go to ignored `test-results/native-projects/tabinator-*.json`.

The runner requires a private IPC acknowledgement from its newly started child owning the declared loopback listener before making readiness requests. Child exit cancels active collection; an unrelated already-running service cannot satisfy startup merely by returning 200. Aggregate results record Node/browser versions, hardware and elapsed time separately from model inputs. No broad or near-limit performance claim is made from these typical runs.

Records explicitly remain `eligibleForTraining: false` and `classLabelsAssigned: false`. They are not registered training/holdout manifests. Freeze the full independent cohort/assignments and independently checked class records before eligible collection. Preserve canonical family identities; development-exposed sources cannot become fresh holdout families. Actual checks and limitations are recorded in PLAN.md.

The subsequent `--seeds` acquisition mode writes labels in a **separate** `development-seeds.json` receipt, using the same-run independent controls; the raw `native-oracles.json` above still contains no class labels. Seed receipts have their own schema and remain ineligible for training. The new category files, measured counts and missing classes are documented in `ML_NATIVE_DATASETS.md`. Historical raw observations are not relabelled or rewritten.

Source hashes use exact upstream Git blob bytes, with newline conversion disabled in this dedicated cache. The retained licence/lock are marked binary for checkout preservation; the new harness uses LF. Early prototype observations captured Windows-converted bytes and retain their original source snapshots/adapter identities unchanged. They remain development-only and ineligible. No historical candidate, evaluation or qualified artifact was rewritten.

All regular runtime source files are checked directly against the pinned HEAD blob hashes before and after execution, with file/total byte budgets and symlink/path refusal. Copying uses this immutable tree, not mutable index entries. This catches edited source even when Git's cached stat results are stale. Source and private observations remain distinct from registered class examples.

Still required: twelve eligible independent development families with complete native positive/contextual/uncertain coverage, real fitting, fresh holdouts, passing original category gates and qualified runtime/export acceptance. The seven remaining categories are unqualified. Existing JS-002 weights, classifiers, raw severity/PDFs and GitHub policy are unchanged.

## Executed checks (2026-10-29)

Final canonical-source Chromium default/readable and Edge readable profiles passed native login, independent signed-session/SQL readback, cookie controls, same-run signatures, privacy checks, reload after temporary key deletion and altered-observation/evidence refusal. The default profile yielded one complete CK-001 input; readable profiles yielded one complete CK-001 and one CK-002 input. These remain unlabelled prototype measurements, not qualified predictions or independent duplicate examples.

The direct HEAD-blob guard rejected an actual reversible source edit before server/data startup. Cancellation stopped the server and removed temporary data. Final process/directory inspection found no remaining native test processes or run directories. All 49 relevant regressions/six files, type checking and production builds passed. Node 24.22.1 and measured Chromium/Edge versions/hardware/timing are in the ignored aggregate results. Existing Zod/Rollup and Node 20 Ed25519 warnings remain. Linux, near-limit performance and full UI/PDF acceptance were not executed for this developer-only increment. PLAN.md records limitations and the source-pin/negative-test corrections.

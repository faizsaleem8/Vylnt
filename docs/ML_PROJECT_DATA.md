# VYLNT project-backed development data

This is developer tooling for Stage C, not a user data-entry workflow or model qualification. It prepares evidence-v4 numeric inputs from signed companion scans and independent, developer-owned functional oracle records. No historical dataset, family key, model, evaluator or held-out result is overwritten.

Earlier 2026-10-29 policy increment: v2 introduced executed framing-policy controls; current producers emit v3 as described below. V1/V2 remain readable with their original uncertainty rules. New source/oracle registrations must bind the actual assessment policy and updated harness; do not relabel old rows or reuse old registration identities for new semantics. Mechanism framing fixtures remain excluded from application counts. See `ML_FRAME_POLICY.md`.

Fresh holdout preparation is a separate workflow in `ML_PROJECT_HOLDOUT.md`; it uses a distinct source-lock version/holdout partition and cannot be passed into development fitting. Both paths share signature, sanitization, source/oracle and overlap checks. The new producer code changes the preparation identity: existing registrations are retained and are not silently upgraded. Register a new preparation experiment where the new producer is required; do not rewrite old artifacts.

## Register before collecting

Native acquisition now has a separate `ml:projects:seeds` workflow and category files, documented in `ML_NATIVE_DATASETS.md`. These are explicitly pre-cohort seed observations, not registered training inputs. Native labels are issued during new same-run controls; historical unlabelled prototypes are not rewritten. Current scope supplies measured CK-001/CK-002 positive seeds only; other observed findings remain uncertain. The two response profiles share an adapter identity and remain one family. Collection and type checking passed; PLAN.md records final counts and tests. An eligible 8/4 family source selection and independent contextual cases remain necessary before the registration/fitting commands below can run successfully.

Frozen project reports additionally carry a signed pseudonymous `ownerTag`. It is report-authorization metadata and is excluded from numeric features; old sidecar signatures retain their original bytes. Report finalisation creates an authorized sealed copy without rewriting the collection sidecar. This does not create oracle labels, development examples or a new family. Source/harness/schema changes still require fresh preparation registration. See `ML_PROJECT_FROZEN_REPORTS.md`.

Authentication-role producers now emit assessment policy v3 and functional measurement v2. V1/V2 evidence retains its original semantics. New registrations must bind the updated inspector, producer, policy and harness identities; do not relabel historical rows or overwrite registrations. The native Jingo profile still represents one development-exposed family, and mechanism fixtures remain ineligible. See `ML_AUTHENTICATION_EVIDENCE.md`.

Keep the source lock, oracle outputs, scans, seals, source audits and manifests under ignored `.local/`. Preserve `.local/insights-dataset-key`; the command reads this existing key and never creates a replacement. The complete historical exposure registry remains required.

Create a `vylnt-project-development-v1` source lock with exactly twelve checked independent application families, eight assigned to training and four to validation. The strict schema is in `packages/ml/project-dataset.ts`. Each family records its canonical `upstream:owner/repository` identity, GitHub repository ID and URL, permissive licence/hash, native security-implementation hashes, permitted committed revisions and inspected source hashes, and pinned adapter/oracle hashes. The lock also binds the assessment policy and collection harness. This is not an independence certificate: developers must check forks, renamed repositories, templates, source suitability and native functionality. Reusing one security wrapper across repositories is not independent coverage.

```powershell
npm run ml:projects:register -- --source .local/project-source-lock.json --exposure .local/historical-exposure.json --output .local/project-development-registration
```

Registration refuses repeated/renamed family entries, duplicate source templates, shared security implementations, previously exposed family identities and an incorrect eight/four split. It writes exclusive source, exposure and registration files. Changing the preparation implementation, selected sources, exposure inventory or private family key requires a new registration; existing records remain intact.

## Collect and prepare

Native adapters and their independent oracles must still be implemented and pinned for the selected applications. Ordinary response facts and syntax inventories cannot be used as proof of authentication purpose or functional compatibility. The new browser mechanism fixtures are excluded from application-family counts.

An oracle record uses `vylnt-project-oracle-v1` and binds the original scan hash, signed evidence hash, source-lock hash, commit, configuration, adapter, harness, oracle implementation and scenario. It identifies one observed finding/category and a verified label. A passed flag alone is not an independent oracle: the pinned oracle implementation and source/scenario audit must establish the outcome. Scenario labels never enter model tensors.

The private `vylnt-project-manifest-v1` contains `examples`, each with relative `report`, `seal` and `oracle` JSON paths. Pass the installation-owned public-key archive separately; keys embedded in a report are not trusted.

```powershell
npm run ml:projects:prepare -- --registration .local/project-development-registration --manifest .local/project-collection/manifest.json --keys .local/project-companion/trusted-public-keys.json --output .local/project-development-prepared
```

The command validates unchanged registration and source identities, signed provenance, recomputed raw rule results, revision/source inspection and exact oracle/scan bindings. It writes private dataset, split, rejected records and aggregate audit files exclusively. Reports are capped at 512 KiB, individual seals at 132 KiB and aggregate input reads at 64 MiB. No fitting or predictions occur.

Readiness counts distinct numeric contexts, not repeated resources. Opposing labels or unknown evidence make the entire numeric variant uncertain. Inputs repeated across training/validation remain recorded but are excluded from eligibility. Prior numeric overlaps and repeated contexts retain rejection records. Each category needs 30 distinct examples per class in training and 15 in validation, each class across at least three families. Insufficient data produces a detailed audit and exit code 2; a ready development audit still does not qualify a model.

Historical repositories that have moved/been renamed and shared native implementations require the source-independence audit in addition to canonical-name, repository-ID and hash checks. Schema-v4 numeric identities must be added to the complete exposure inventory before a future fresh holdout is selected. No external-holdout evaluator or release promotion is supplied by these preparation commands.

## Current measured status

Candidate development commands are now available in `ML_PROJECT_CANDIDATE.md`. They recompute all seven categories' family/class/context readiness and refuse to register or fit this currently insufficient corpus. Numerical/export smoke tests do not supply real application examples or qualify a model.

Cookie-purpose references carry signed `collectionKind: mechanism-fixture` metadata. Preparation rejects those records even when supplied with an application-family declaration; they cannot fill development counts. Existing sidecars without this optional provenance field retain their parsing/signature path. The new field is not a model input. Its rejection regression and the full 272-test/50-suite regression passed, alongside final Chromium/Edge reference acceptance, type checking and builds. See `ML_COOKIE_PURPOSE.md` for scope and limitations. No independent family, dataset, candidate or qualification was added.

Latest native increment: 265 TypeScript tests/48 suites, Chromium/Edge collector mechanisms and native Jingo interaction/signature checks passed. Native cancellation removed the process and temporary data. The prototype's anonymous write returned 500 and remains `needs-review`; it supplies no eligible training record. Jingo is recorded as development-exposed in `ml/applications/native/jingo.source.json` and must be excluded from a future fresh holdout. Source locks, independent native oracles and all class/family gates are still required before fitting.

Seven preparation unit tests pass: deduplication/privacy, conflicting labels, unsupported evidence, tampered bindings, previous exposure, family/template grouping and cross-partition equivalence. Command lifecycle acceptance also passes exclusive registration, stable preparation identity, changed-registration rejection and the empty-data audit/exit code 2 (`npm run test:projects:data`). Those synthetic command fixtures are deleted and never used for fitting. Browser mechanism acceptance passes in Chromium and Edge. The full TypeScript regression passed 258 tests/47 suites; final evidence/dataset checks passed 14 tests after the scan-size guard. There is no registered eligible native application cohort, new fitted candidate, consumed project holdout or promoted category. The seven remaining categories stay open.

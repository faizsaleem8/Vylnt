# VYLNT project-backed development data

This is developer tooling for Stage C, not a user data-entry workflow or model qualification. It prepares evidence-v4 numeric inputs from signed companion scans and independent, developer-owned functional oracle records. No historical dataset, family key, model, evaluator or held-out result is overwritten.

## Register before collecting

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

Latest native increment: 265 TypeScript tests/48 suites, Chromium/Edge collector mechanisms and native Jingo interaction/signature checks passed. Native cancellation removed the process and temporary data. The prototype's anonymous write returned 500 and remains `needs-review`; it supplies no eligible training record. Jingo is recorded as development-exposed in `ml/applications/native/jingo.source.json` and must be excluded from a future fresh holdout. Source locks, independent native oracles and all class/family gates are still required before fitting.

Seven preparation unit tests pass: deduplication/privacy, conflicting labels, unsupported evidence, tampered bindings, previous exposure, family/template grouping and cross-partition equivalence. Command lifecycle acceptance also passes exclusive registration, stable preparation identity, changed-registration rejection and the empty-data audit/exit code 2 (`npm run test:projects:data`). Those synthetic command fixtures are deleted and never used for fitting. Browser mechanism acceptance passes in Chromium and Edge. The full TypeScript regression passed 258 tests/47 suites; final evidence/dataset checks passed 14 tests after the scan-size guard. There is no registered eligible native application cohort, new fitted candidate, consumed project holdout or promoted category. The seven remaining categories stay open.

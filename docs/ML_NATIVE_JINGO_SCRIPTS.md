# VYLNT native Jingo script-policy data

Implemented 5 November 2026. This is developer-owned HDR-003 acquisition from a second native application family, not a qualified model or an eligible development corpus.

## Source and isolation

The existing MIT Jingo source lock pins `claudioc/jingo` at `10079c22d6cb66cfa0e7a91742c631fa0a153bd4`. Its licence blob, complete tracked source, key source hashes and dependency lock are checked before execution. Windows CRLF text is accepted only if lossless normalization produces the exact pinned Git blob; other changes are rejected. The run copies those canonical blobs to a disposable directory and resolves dependencies from the pinned installation, rather than unrelated parent workspace modules.

A separate disposable Git wiki and synthetic local account exercise native authentication, the CodeMirror editor and page creation. A child-issued listening receipt identifies its loopback port. Browser traffic stays on that origin; the pinned cosmetic remote font request is fulfilled with an explicit empty local stylesheet in every phase. No external script or authentication response is substituted. Native startup output is discarded after bounded, redacted error classification. This is process isolation for trusted source, not an OS sandbox.

## Profiles and independent controls

| Profile | Intervention | Required observed result | Seed label |
| --- | --- | --- | --- |
| `missing` | Preserve native response and HTML | Editor works with scripts, fails with scripts disabled, works after restoration; unapproved inline script executes twice; native saved file and Git commit verified | Change warranted |
| `early-meta` | Insert restrictive `script-src` meta in the head before scripts; retain self-hosted scripts and exact hashes of native inline initializers | Same native functionality/removal/restoration; unapproved inline script blocked twice; stable policy present at first application statement; native write verified | Contextual for this scoped script-policy observation |
| `late-meta` | Insert the same policy after scripts in the body | Native write still works, but execution timing/coverage is insufficient | Needs review |

Only successful HTML responses are transformed. Login redirects, cookies, native script bytes, application source and Git storage behavior stay unchanged. Inline source is read transiently to construct this controlled fixture's CSP hashes; it is neither persisted nor used as training text. This is not a production policy-generation feature.

The native save is checked independently by reading the one newly committed wiki file and checking that Git HEAD changed. Dataset labels derive from these native checks and observed script/CSP controls, not detector severity, model predictions or the profile name. Changed scans, adapters, source commits, execution witnesses or missing controls prevent a usable label. No finding is fabricated when the detector supplies no HDR-003 observation.

## Evidence and retention

Opt-in `vylnt-project-assessment-v5` permits bounded script-policy evidence from a partially inspected Express application. It requires nonempty inspected source hashes and matching complete functional witnesses. Contextual use additionally requires matching early-policy browser facts. A missing response policy is distinct from a present policy whose capture is incomplete. The default producer remains v3; v1–v4 retain their earlier decisions. High/critical findings remain visible for review.

The script measurement retains a digest of bounded script attributes so the separate seed oracle can recompute its execution witness. This digest, family key, source names, URLs and profile labels are not numeric identity features. Native saved reports and seals remain separate from the authenticated numeric seed batch. No cookie values, credentials, bodies, source code or page text are retained.

Successful runs write private observations under `.local/ml-native-observations/jingo/<run>/` only after temporary application cleanup. Reload and changed-report/evidence rejection must pass before `acceptance.json` is written. The assembler accepts completed runs from Jingo and Tabinator, verifies HMAC receipts, deduplicates inputs and preserves uncertainty/conflicts. Failed subsequent runs are recorded separately under ignored `test-results/native-projects/jingo-script-failures/` and never enter the dataset. Initial implementation failures are recorded in PLAN.md.

## Commands

```powershell
npm run test:projects:native:scripts
npm run test:projects:native:scripts -- --profile early-meta
npm run test:projects:native:scripts:cancel
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:native:scripts
Remove-Item Env:VYLNT_TEST_BROWSER
```

The pinned Jingo installation and existing private family key must already exist. Do not recreate the key. To assemble completed runs, use `npm run ml:projects:seeds -- --output .local/project-native-seeds-NEW`. The directory must be new. Exit 2 deliberately means acquisition data is not ready for training.

## Scope and remaining gates

Executed acceptance: all three profiles passed in Chromium and Edge, including private-value exclusions, saved-seal reload, altered-content rejection and disposable cleanup. Cancellation after server startup passed. The focused TypeScript run passed 50 tests/seven files; Python seed-audit refusal, type checking and production builds passed. See the latest `.local/project-native-seeds-005/audit.json` for measured two-family counts. No training or qualification evaluation ran.

The three profiles and browser repetitions are **one Jingo family**, not three independent applications. Native context and a controlled policy intervention establish only the tested editor flow; they do not prove route-wide protection, XSS absence, vendor trust or model accuracy. Jingo remains development-exposed and excluded from future fresh holdouts.

See PLAN.md and `ML_NATIVE_DATASETS.md` for actual counts and executed checks. The twelve-family 8/4 development split, adequate distinct examples for all seven categories, real fitting, fresh holdout gates, qualified Worker/API activation and full performance/export/hosted acceptance remain open. JS-002 and historical reports remain unchanged.

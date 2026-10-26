# VYLNT ML-Q2: remaining-category evidence and validation

Started 2026-10-27. ML-Q remains open until the existing category gates pass. This increment does not change the qualified JS-002 model or consume another test set.

## Ordered work

1. Audit **development partitions only** for missing classes and identical numeric inputs with opposed ground truth. Publish aggregate counts, input-schema identity and concrete evidence gaps; keep private examples and family keys private. Historical test outcomes are not development data.
2. Correct the extension's missing resource completion/failure collection. Correlate browser events with the original request and committed document, preserve separate requests after URL sanitization, cap storage, and retain no response bodies/error strings. A completed transfer is not proof of execution; a failed transfer is not proof of CSP blocking or harmlessness.
3. Validate current inference, cancellation, saved reports and exports on automated Chromium and the installed desktop Edge runtime where available. Record runtime versions and scope; performance measurements are not universal capacity claims.
4. Only categories with distinguishable evidence and both development classes may proceed to a separately registered candidate. Preserve the existing eight-unit/74-step model bounds, validation-only calibration and LSTM/logistic input parity. Never rewrite the ML-Q1 evaluator, candidate, release or consumed test.
5. Select a new independent source cohort before predictions. Require ten eligible fresh families, 30 distinct examples per class/category across three families per class, original precision/recall/coverage and safety/comparator gates, once-only evaluation, and runtime/export acceptance before releasing any additional category.

## Boundaries and closure

Automatic bounded metadata collection is authorized; developer-owned data only. Edge and automated Chromium are the compatibility scope. No Docker, deployment, new credentials, production scanning, app-authentication probing, user labels or optional purpose declarations.

Cookie names/lifetime do not establish authentication purpose, JavaScript requirements or CSRF protection. A missing framing policy does not establish whether embedding is intentional; missing HSTS does not establish preload status. Do not force contextual/change labels when this context is unavailable. Repetition or nuisance attributes must not manufacture distinct qualification examples.

An evidence audit passing its tests is **not** a category qualification. Categories with failed preflight or quality gates stay open. JS-002's qualified scope and immutable archived reports remain intact. Raw findings, rule severity and GitHub policy remain unchanged.

## Validation record

- Completed the development audit and published [aggregate evidence](../ml/evaluations/evidence-audit-2026-10-27.md). HDR-001/002/003, CK-001/003 and NET-001 have no eligible contextual inputs in both development partitions. CK-002 has 17 opposed-label inputs; no eligible change-required inputs in either partition and no contextual validation inputs. Only JS-002 has both development classes. This is a current-corpus result, not proof that new observable contexts can never exist.
- Extension now records terminal network outcomes by request/document identity, including service-worker restart recovery and SPA preservation. Redirect outcomes remain unknown; sanitized URL collisions cannot overwrite another request. Request IDs stay in bounded browser-session bookkeeping and never enter reports/model inputs. Unit checks and actual browser request completion/failure checks passed; an HTTP 500 transfer correctly counts as completed without claiming successful execution.
- 59 Python tests passed. The full TypeScript run passed 234 tests/43 suites with one worker; the subsequent additional service-worker restart test passed in the 13-test background suite. Type checking and production builds passed. Initial sandbox temporary-file/localhost failures were resolved with workspace-local test temporary files and an approved test run outside the sandbox; parallel subprocess timeout failures passed under the single-worker run.
- Worker checks passed on Chromium 156.0.8078.4 and installed Edge 156.0.4314.42 using disposable headless sessions. Both handled 318 findings, cancellation, malformed input and a 523,855-byte report without dropping finding references. Typical inference was 154/250 ms respectively; boundary inference 112/125 ms; maximum main-thread timer gaps 11.3/12.2 ms. These are single local observations, not p95 estimates or universal budgets.
- Full-extension cache/restart/normal and simulated 6x CPU stress passed in Chromium. The observer retained its 150-script cap and explicit collection worked after the automatic budget. Headless Edge Worker acceptance does not certify Edge's native extension side panel, screen reader or browser permission prompts.
- Full end-to-end extension/CLI/dashboard regression passed: permissions, TLS rules, navigation/tabs, privacy, automatic API sync, side-panel history/detail/export/hash, pause/resume, SPA and worker restart; CLI secure/insecure gate and rule agreement; dashboard auth, feedback, frozen/raw downloads, import, comparisons, filtering, deletion, narrow layout and no JavaScript errors. No new holdout was consumed, no candidate trained, and no category/release promoted. ML-Q remains open for seven categories.

## Remaining work

Resolve the category-specific evidence gaps before selecting another training run. Add independently checked, genuinely distinguishable development contexts without cookie-name, family-identity or nuisance-feature shortcuts. Then register and evaluate a new candidate on untouched application families using the original gates. Current missing-context cases retain Needs review; passing engineering checks must not close their qualification.

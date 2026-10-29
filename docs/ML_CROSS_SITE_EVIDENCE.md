# VYLNT distinct-site operation observations

Implemented 2026-10-29 in `apps/cli/project-cross-site.ts`. Developer-owned mutating checks run only against disposable local applications. Ordinary extension scans and user projects do not automatically run this adapter. These are diagnostic observations, not qualified CK-003 decisions.

## Explicit mutating-GET iteration

The helper now supports an explicitly declared GET operation with **no fields**, credentials, query or fragment. It rejects GET/POST declaration mismatches before browser access and rejects GET fields before the target request. Existing POST form overrides retain their bounds. Diagnostic format `vylnt-cross-site-v3` records the actual method and `initiatorVerified` separately from `originVerified`; no frozen envelope, model input or archived report format changes.

GET form navigation normally has no Origin header. The helper verifies the actual browser referrer plus expected Fetch Metadata when available. Intercepted navigation headers in the tested browsers omit Fetch Metadata; the fallback requires both that referrer and the browser's exact owned initiating document/navigation. Contradictory metadata cannot use the fallback. No Origin or Fetch Metadata header is fabricated.

The mechanism fixture measures same-site, cross-site, anonymous and repeated GET controls with a Lax cookie. Only actual transmitted cookies, independently changed server state and complete initiator evidence produce `changed-with-cookie`. Lax POST omission must not be generalized to top-level GET safety. Rejected GET fields cannot mutate the application or enter a query string. Original cookies stay unchanged, external redirects are not followed, and private values/routes stay out of results.

The pinned Jingo adapter additionally exercises its native GET revert route. It independently reads the disposable file, Git index and HEAD with bounded asynchronous polling. A restored file/index without a new commit is a **partial operation**, retained as `unknown` for the committed-revert oracle. Boolean `revertReadbacks` record that side effect separately; the adapter does not silently relabel partial completion as a committed success. Anonymous unchanged redirects remain unknown, rather than proving CSRF protection. Native source/authentication is unchanged. This remains one family and partial route coverage; necessity, authentication/conditional routes and other vectors remain open.

Validation for this iteration is recorded in PLAN.md. Commands below include these controls; none starts a persistent project service or qualifies a model.

## Document-operation coverage iteration (prior increment)

The pinned native flow now checks **creation, content editing and deletion**, each under same-site, cross-site, anonymous and repeated controls. PUT/DELETE are the reviewed Express form method overrides: the actual browser/network method is POST. Diagnostic format `vylnt-cross-site-v2` records `wireMethod` separately from `effectiveMethod`, and includes operation identity in the witness digest. This version applies to diagnostic test outputs, not frozen report envelopes or model inputs.

Overrides must be declared explicitly and match the `_method` field exactly. An undeclared override, mismatched verb, unsupported verb or oversized field set is rejected before the target request. The browser fixture verifies a mismatched DELETE/PUT declaration cannot mutate state. This does not establish which method arbitrary application code dispatches; the native adapter is bound to the pinned source and verifies the expected operation independently.

| Operation | Independent native verification |
|---|---|
| Create | One new tracked document with expected content and a changed Git HEAD |
| Edit | Exact expected file content and a changed Git HEAD |
| Delete | Document absent from both filesystem and tracked tree, with changed Git HEAD |

Each edit/delete phase starts from a reset synthetic document committed inside the disposable wiki. No user repository data is edited/deleted. A first edit fixture unintentionally exercised Jingo's slug/title rename behavior; the unchanged file stayed unknown. The corrected alphanumeric fixture isolates content editing. An initial TypeScript bracket typo was fixed before the passing build/checks.

This is three operations within one application family, **not complete application coverage or three independent families**. Mutating GET revert, authentication, conditional routes, preview behavior, direct PUT/DELETE requests and other CSRF vectors remain untested. No `stateChangingRoutesCovered` or `csrfChecksPassed` model fact is set. Diagnostics remain outside frozen reports/signed training sidecars.

Iteration validation: 283 TypeScript tests/54 suites, 17 focused regressions, type checking and production builds passed. Chromium/Edge mechanism checks verified mismatched overrides did not reach the application. Native default and labelled cross-site cookie profiles passed in both browsers with creation/edit/deletion state readback. Existing commands remain unchanged. No real dataset, model fit or holdout evaluation was performed.

## Controls and interpretation

An explicit HTTP `127.0.0.1` target and an owned `127.0.0.2` actor are distinct sites. Four fresh contexts run same-site, cross-site, anonymous and repeated cross-site form operations. The browser chooses cookies/Origin/referrer; the helper does not fabricate those headers. A trusted adapter supplies disposable fields and independently checks application state.

- `changed-with-cookie`: verified initiator, actual target-cookie transmission, successful/redirect response and independent mutation observation.
- `explicit-denial`: verified initiator, transmitted cookie, unchanged state and HTTP 401/403.
- `unknown`: missing/incomplete evidence, cookie omission, errors, failed observation or other status combinations. HTTP 500 never establishes protection.

A transmitted cookie does not prove its authentication purpose or causal necessity. Route coverage is always partial. The helper does not supply cross-site necessity, complete CSRF enforcement, route-wide coverage or signed model facts. These remain prerequisites before training labels or qualified decisions.

The real request reaches the application. After its response, a neutral browser document stops redirects. Private response bodies/headers are not exported; success comes from independent state readback, not that document. Original cookies and scan stay unchanged; disposable application state is intentionally modified. Cancellation closes further work but cannot recall a mutation already applied by the server.

## Bounds and privacy

Only an explicit same-origin route without credentials/query/fragment is allowed. Matching requires one unambiguous, unpartitioned cookie with unchanged observed metadata; at most 100 cookies, 32 POST fields, a 64 KiB body and 2 MiB response are allowed. GET fields must be empty. Each phase is bounded to 12 seconds; the helper to 60 seconds. Only the synthetic parent GET and one explicitly declared target operation are permitted. Other requests/WebSockets are blocked and service workers disabled. Contexts, network requests, timers and the owned parent server close afterward.

Outputs contain only enums, booleans, status codes and hashes. No cookie values, credentials, bodies, page text, raw response headers or actor URL are persisted. No normal API accepts a callback or a client declaration of this evidence.

## Native results

The pinned MIT Jingo prototype passed in Chromium and Edge:

| Cookie profile | Cross-site behavior | Interpretation |
|---|---|---|
| Native response attributes, POST operations | Cross-site cookie omitted; no tested mutation; redirect/error | Unknown, not protection |
| Labelled SameSite=None/Secure response control | Cookie sent; committed create/edit/delete; HTTP 302; repeated | Changed with cookie |

Only response cookie attributes change in the second profile; native application/authentication code stays pinned. Both profiles are the same family, not independent examples. An initial native attempt selected an unused middleware cookie and failed closed. The corrected adapter matches the actually collected `JingoSession` cookie.

Cloning cookie state normalizes SameSite metadata; default-cookie creation-age exceptions are not reconstructed. Omission cannot establish original-session behavior. Local HTTP acceptance of Secure cookies in these browser checks does not establish TLS validity or production behavior. The native anonymous-write HTTP 500 remains unknown. No application intent or whole-site CSRF protection is inferred.

## Commands and checks

```powershell
npm run test:projects:cross-site
npm run test:projects:native
npm run test:projects:native:cross-site
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cross-site
npm run test:projects:native
npm run test:projects:native:cross-site
Remove-Item Env:VYLNT_TEST_BROWSER
```

Native setup is in `ML_NATIVE_PROJECT_CHECKS.md`; no user data/account is needed. Mechanisms cover mutation, explicit Origin/token denial, Lax omission, errors, anonymous controls, unchanged cookies, privacy and helper cancellation. Sixteen focused unit regressions, type checking and production build passed. Browser/default-native/controlled-native checks passed in Chromium and Edge. Full-suite results are in PLAN.md. Results: `test-results/cross-site/` and `test-results/native-projects/`.

The consolidated TypeScript regression passed all 282 tests across 54 suites. Archived JS-002 collector/evaluator/kernel files have no diff. The developer scenarios do not change raw rules, severity, the GitHub gate, existing frozen reports or blockchain hashes.

Remaining: source-backed route completeness/necessity and native compatibility, signed integration, independent datasets, real model fitting, fresh qualification and qualified runtime/report integration. No holdout was consumed or category qualified.

Reference: [SameSite and Secure cookie semantics](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

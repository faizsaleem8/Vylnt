# VYLNT distinct-site operation observations

Implemented 2026-10-29 in `apps/cli/project-cross-site.ts`. Developer-owned mutating checks run only against disposable local applications. Ordinary extension scans and user projects do not automatically run this adapter. These are diagnostic observations, not qualified CK-003 decisions.

## FieldPoint split-origin deployment fixture

The overbroad-origin profiles use the same pinned app and add the unrelated
client to FieldPoint's native `ALLOWED_ORIGINS` in the disposable process.
The browser must send the authenticated cookie from that distinct site
twice, and both requests must create rows owned by the synthetic user.
Requests from the same unrelated origin with an absent cookie or a Lax
counterfactual must return 401 and leave storage unchanged. The intended
client must remain functional before and after the checks. The receipt
covers site creation. Other routes remain outside this result, and the
fixture says nothing about the application's default deployment.

The pinned FieldPoint adapter runs the native Express origin allowlist against
a trusted client on `127.0.0.2` and an untrusted client on `127.0.0.3`. FieldPoint's
bundled frontend uses same-origin requests. This controlled deployment instead
uses its supported origin allowlist with a disposable client and a
`Secure; SameSite=None` session. A fixture proxy supplies CORS for both
origins so the native middleware decides whether requests proceed.

Chromium sent the real signed session to both clients' API requests. A
trusted client created a site owned by the synthetic account. With Lax or
no cookie, the same operation returned 401 and wrote no row. Restoring the
original cookie restored the write. The hostile client received FieldPoint's
explicit 403 on all 38 declared API mutation routes with JSON and on all 19
POST routes with a simple form-encoded request. A before/after SQLite
comparison found no state change from those probes. Only the equality
result is retained.

Assessment policy v11 requires the pinned revision, matching session
observation, native authentication dependency and a shared witness for
cookie necessity, request protection and route coverage. An incomplete
matrix leaves the finding uncertain. Coverage is limited to the pinned
loopback deployment and the executed request shapes. It does not establish
other routes, deployment policies or production browser behavior.

The registered supplement reruns the full matrix under three additional
readability and lifetime configurations. Each uses the original signed
session value and native allowlist. The profile changes only the
selected cookie attributes in the fixture response.

## Yoyo Collection native multipart write

A controlled same-site or foreign browser document submits a small
generated PNG through the native photo-upload form route. The probe
validates the browser's multipart request, checks the actual cookie and
Origin, and verifies both a new SQLite photo row and exact stored bytes.
The repeated foreign write also succeeds. The anonymous control
receives 403 and leaves the photo rows unchanged. This supports one
scoped change assessment per independently checked cookie configuration.
The captures keep outcome metadata and the binding digest.

## Credentialed JSON on a distinct site

The JSON probe uses an owned loopback document and Chromium's request controls.
It lets the server handle the actual CORS preflight and verifies the browser's
Origin, selected cookie and write outcome. Playwright's ordinary interception
can answer preflight itself, so that path remains limited to the form probes.
No request body, cookie value or CORS response header is retained.

The Tabinator profile uses the pinned server's development origin reflection
with credentials. The disposable response proxy varies only the selected
session cookie attributes. The native bookmark endpoint must return 201 for
the same-origin write and both foreign writes. Independent SQLite reads verify
each bookmark's owner and fields. The foreign anonymous control must receive
401 and leave storage unchanged. This profile covers one route under the
tested permissive CORS configuration.

Source screening for contextual cases found that Tabinator also exposes
a body-independent logout POST. A restrictive CORS response can block
the tested foreign JSON operation at preflight, but it does not make a
simple form request subject to preflight. The logout handler has no
route-level origin check. Tabinator's CORS setting alone therefore supplies
no contextual SameSite seed. This is a source-screening result.

## Habit Tracker logout form

Habit Tracker's native logout ignores the request body, so a plain browser
form can exercise the route without enabling credentialed CORS. A disposable
SQLite snapshot resets the exact signed session between phases. The oracle
checks that the session row exists before each request, disappears after
authenticated logout and survives the anonymous control. The endpoint's
HTTP 200 alone carries no evidentiary weight because it also returns 200
without a cookie. The proof covers session revocation on the tested route.

## HomeInventory house creation form

The native route accepts a form-encoded house name. The fixture modifies
only the signed authentication cookie's browser attributes. It verifies
the JWT and account, then checks the authenticated response with the
cookie present, absent and restored. The separate write oracle compares
SQLite ownership rows before and after each submission. The evidence
scope is one native operation. Cookie values, house names, request
bodies and database contents stay in the disposable run.

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

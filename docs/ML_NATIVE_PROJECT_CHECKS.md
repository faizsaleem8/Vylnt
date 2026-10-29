# VYLNT native project evidence

This development increment exercises a real upstream application. It does not qualify a category or create a twelve-family dataset.

2026-10-29 authentication-role increment: adapter identity v7 also binds the syntax inspector. Issued authentication dependency excludes a solely non-sensitive preference role for CK-001/CK-002; the default and readable-cookie profiles audit complete positive-input counts. Bounded recognition of the native exported initializer always retains partial coverage. Policy v3 supports this positive-only path; contextual authentication and JS-required authentication stay review-only. Current validation is recorded in PLAN.md and `ML_AUTHENTICATION_EVIDENCE.md`. Native profiles remain one exposed family, not an eligible corpus.

2026-10-29 framing-policy regression: native adapter identity v6 additionally binds the new frame-policy producer, scope parser and assessment contract. The existing missing-policy native check retains unknown purpose; it is not relabelled as a positive restricting-policy example. Results are recorded in PLAN.md.

2026-10-29 resource-observer regression: adapter identity v5 additionally binds collector, resource-observer and response-stage redirect-guard hashes. The native HTTP application retains its existing checks; it is not an HTTPS NET-001 training profile. Results and limitations are in PLAN.md and `ML_RESOURCE_COMPATIBILITY.md`.

2026-10-29 meta-policy extension: the native harness binds both the timing-producer and policy-parser source hashes in its adapter identity. The existing no-CSP enhanced-editor check is retained under the first-statement observer. Meta-specific positive/unknown cases are separate mechanism fixtures; Jingo is not relabelled or multiplied into new families. Validation and boundaries are in `ML_META_POLICY.md` and PLAN.md.

2026-10-29 explicit-GET increment: existing native commands also exercise the pinned revert route using empty-field GET forms and same-site/cross-site/anonymous/repeated controls. The adapter independently reads disposable file content, the Git index and HEAD. A file/index restore without a new commit remains a partial result (`unknown`), with boolean readbacks retained separately. This does not establish a completed revert, whole-route coverage or cross-site necessity. Native Lax GET transmission is not treated like POST omission. See `ML_CROSS_SITE_EVIDENCE.md` and PLAN.md for results.

2026-10-29 document-operation iteration: existing native/cross-site commands now include content editing and deletion alongside creation. Explicit `_method=PUT/DELETE` forms exercise the pinned middleware; Git HEAD and exact filesystem state independently establish each operation. Disposable reset documents stay inside the temporary wiki. Mutating GET revert and other routes remain untested, so application coverage stays partial. The controlled cookie profile is the same source family and supplies no independent training count. See `ML_CROSS_SITE_EVIDENCE.md`.

2026-10-29 cross-site extension: forms from 127.0.0.2 submitted to the disposable 127.0.0.1 wiki. Native cookie omission/HTTP 500 stays unknown. A labelled SameSite=None/Secure response profile sent the cookie and repeatedly created a committed page in Chromium/Edge. Upstream application/authentication code is unchanged; this adds no family. Route-wide protection and cross-site necessity remain unknown. See `ML_CROSS_SITE_EVIDENCE.md` for commands and normalization limits.

2026-10-28 framing extension: the authenticated new-page form loaded under synthetic same-origin and different-origin parents in Chromium and Edge, with repeated cross-origin agreement. The original source, target headers and login state were preserved; the existing bound cosmetic font fallback was used. These observations remain separate from signed model facts and supply no public-embedding/sensitivity label. Different ports are not distinct-site CSRF checks. See `ML_FRAMING_EVIDENCE.md` for limits and commands.

2026-10-28 script-compatibility extension: the pinned native enhanced editor passed normal / JavaScript-disabled / restored controls in Chromium and Edge. The unapproved inline probe executed under the native missing CSP; no protection was inferred. Evidence binds the scan, adapter, response-policy metadata and live script-attribute digest, then uses the existing signing path. The check covers the enhanced editor, not alternative textarea editing or every route. The cosmetic font fallback is identical in each phase. See `ML_SCRIPT_COMPATIBILITY.md`; broader regressions are recorded in PLAN.md. The existing anonymous-write HTTP 500 remains review-only.

## Pinned Jingo prototype

Source: `claudioc/jingo`, commit `10079c22d6cb66cfa0e7a91742c631fa0a153bd4`. The MIT licence, source identity and dependency lock are retained under `ml/applications/native/`. Jingo is now development-exposed and must not be selected for a future fresh holdout. No model prediction was used to select it.

The acceptance command creates a disposable Git wiki, synthetic account and random temporary session secret, then starts the unchanged native application on `127.0.0.1`. External authentication, Git remotes, background pushes, access logging and Gravatar are disabled. Browser traffic stays on its loopback origin; WebSockets and service workers are blocked. The account/configuration/wiki are removed after the check. Native application code runs as trusted local code, not inside an OS sandbox.

The VYLNT-maintained flow logs in through Jingo's own login form and checks its protected new-page form. Fresh browser contexts independently establish:

1. The original cookie state reaches the protected form.
2. An empty cookie state reaches the login form.
3. Removing one unambiguous cookie prevents access.
4. Restoring the original state restores access.

Only successful positive dependency evidence becomes `cookieAuthDependency=true`. Removal making no difference does **not** mean preference, harmlessness or irrelevance on another route. Failed controls, conflicting attributes and name/path collisions remain unknown. The evidence is bound to the captured scan digest and signed by a temporary installation key. Cookie values and credentials never enter measurement results, witness hashes or saved test artifacts.

The native editor also creates a page, with its configured title prefix and content checked directly in the disposable Git wiki. The anonymous POST control returned HTTP 500 in both tested browsers' runs. No page was written by that request, but an error is not proof of intentional authorization enforcement. Consequently `sensitiveActionVerified` is not emitted from this write control, `writePolicyAssessment` remains `needs-review`, and no CSRF or complete-route-coverage claim is made. This limitation is retained rather than converted into a contextual label.

`apps/cli/project-functional.ts` bounds each callback, closes its context and supports cancellation. Trusted collector hooks have time limits and cannot mutate the returned raw report. Hooks are internal developer code; repository JSON and ordinary scan endpoints cannot provide callbacks. The native flow is currently a developer acceptance harness, **not** an automatically enabled production companion adapter.

## Reproduce locally

Run these developer setup commands from the VYLNT repository. Do not reuse this fixture with production data.

```powershell
git clone --no-checkout https://github.com/claudioc/jingo.git .local/ml-native-jingo
git -C .local/ml-native-jingo checkout --detach 10079c22d6cb66cfa0e7a91742c631fa0a153bd4
Copy-Item ml/applications/native/jingo.package-lock.json .local/ml-native-jingo/package-lock.json
npm --prefix .local/ml-native-jingo ci --ignore-scripts --no-audit --no-fund
npm run test:projects:native
npm run test:projects:native:cancel
```

For an existing checkout, verify its revision and tracked files before reusing it; the acceptance command refuses a different revision or modified tracked source. It also requires the recorded dependency lock. Set `$env:VYLNT_TEST_BROWSER='msedge'` to repeat in installed Edge, then remove that environment variable afterward.

Results: `test-results/native-projects/jingo-chromium.json` and `jingo-msedge.json`. These contain source identity, check names and aggregate counts, not credentials, page content, cookie values or a training label.

Validation on 2026-10-27: the native interaction/privacy/signature checks passed in Chromium and installed Edge; the write control retained the HTTP 500/needs-review result. Cancellation passed with the native server stopped and temporary data removed. The collector mechanism checks passed in both browsers, all 265 TypeScript tests/48 suites passed, and type checking/build passed. Test artifacts explicitly set `eligibleForTraining: false` and `modelEvaluated: false`. Setup failures around the editor's supported configuration, Windows Git output and native title-prefixed storage were corrected before these passing runs. No source was replaced or model evaluated based on those outcomes.

## Remaining evidence work

2026-10-28: the harness adds scoped HttpOnly intervention checks for the native editor and a separate controlled readable-cookie response profile. Both profiles retain the same upstream family and use an explicit offline cosmetic-font fallback during the probe. Source login/session/editor scripts are unchanged. Details, limits and commands are in `ML_COOKIE_ACCESS.md`; these results do not qualify CK-002 or establish JavaScript requirements across the application.

The original prototype proved one scoped native authentication dependency. Later bounded controls are described above and in the linked component documents. The syntax inspector now recognizes the exported initializer while retaining partial coverage. None of these checks establishes complete application coverage, an independent application family, or model qualification.

Further work still requires all seven positive/contextual/unknown scenario sets, independent development families and fixed assignments, a separately fitted candidate, untouched held-out applications, original qualification targets and qualified Worker/API/frozen-report integration. Existing JS-002 artifacts remain unchanged.

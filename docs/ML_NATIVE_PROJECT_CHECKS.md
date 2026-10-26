# VYLNT native project evidence

This development increment exercises a real upstream application. It does not qualify a category or create a twelve-family dataset.

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

This proves one scoped native authentication dependency. It does not establish preference purpose, necessity of JavaScript cookie access, cross-site necessity, complete CSRF protection, TLS/HSTS applicability, public embedding intent, required script compatibility or resource upgrades. The current generic Express syntax inspector does not support Jingo's factory initialization; the prototype does not override that limitation or make an assessment confident.

Further work still requires all seven positive/contextual/unknown scenario sets, independent development families and fixed assignments, a separately fitted candidate, untouched held-out applications, original qualification targets and qualified Worker/API/frozen-report integration. Existing JS-002 artifacts remain unchanged.

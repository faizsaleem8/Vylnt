# VYLNT cookie JavaScript access checks

Implemented 2026-10-28 for the ML-Q evidence stage. These developer-owned probes supply scoped evidence for CK-002. They do not qualify a category, establish preference purpose or enable a new dashboard model.

## What the probe measures

`apps/cli/project-cookie-access.ts` runs a reviewed native interaction in three fresh browser contexts:

1. Original cookie state: authentication and the intended interaction must work.
2. Only the target cookie is made HttpOnly: authentication is checked separately from the interaction.
3. Original state is restored: the interaction and observed access must reproduce.

The probe observes `document.cookie` and Cookie Store reads. It does not count a read as proof of necessity. If the interaction still works with HttpOnly, `cookieJsAccessRequired=false` applies to that declared interaction. If the interaction fails while authentication still works, the original/restored interaction succeeds, and readable access is observed in both controls, it records `true`. Otherwise it records unknown controls and emits no decision-bearing facts.

`cookieJsAccessObserved` and `cookieJsAccessRequired` are versioned functional facts with a shared witness digest. Findings are matched to unambiguous cookie metadata. Domain/path collisions, changed attributes, partitioned cookies, lost authentication, failed restoration and contradictory controls cannot supply confident facts. These facts do not establish cookie purpose or functionality on other routes.

## Bounds and privacy

- One explicitly scoped loopback origin, one page/document, no extra frames, popups, workers or WebSockets.
- HTTP redirects are refused before the browser receives them. A separate Node transport never follows them and has no browser cookie jar.
- HttpOnly is enforced on the initial browser cookie and on the target's subsequent Set-Cookie responses. Other cookie headers are preserved. The original scan and browser context are not modified.
- At most six target cookie names, 100 stored cookie entries, 80 requests/phase, 64 KiB request bodies, 2 MiB per response and 8 MiB total response bytes/phase. Each phase is limited to ten seconds; the complete probe has a three-minute bound and supports cancellation.
- Instrumentation changes, target writes, unresolved Cookie Store operations, further navigation, incomplete resources and unsupported flows require review. The interaction must reach a quiet network state within its bound.
- Cookie values, request bodies and response content are transient transport/application data. Only enumerated control outcomes, read flags, sanitized finding references and hashes leave the producer. Callback output is explicitly whitelisted.

The native callback is reviewed developer code. It must observe DOM or operation outcomes rather than reading cookies itself, inventing an authentication result or supplying a scenario label. No application configuration or uploaded JSON can register such a callback through an ordinary scan endpoint.

## Native Jingo coverage

The pinned Jingo harness now tests its protected new-page editor in the three contexts. It uses the unchanged native login/session/editor code and disposable local data. Its known Google Fonts stylesheet is fulfilled with empty CSS in all probe phases; this offline cosmetic fallback is included in the adapter/configuration identity. Authentication and application scripts are not substituted.

Two response profiles belong to the **same** upstream family:

- Native cookie attributes.
- A controlled loopback response proxy removes HttpOnly while preserving cookie values and the native authentication implementation. This produces actual CK-002 observations. The probe then restores HttpOnly for one target at a time and repeats the editor interaction.

The profile, harness, producers, original scan and configuration are bound to the signed evidence. The native editor result covers only that interaction. The application's anonymous write still returns HTTP 500 and remains `needs-review`; it supplies no CSRF/protection claim. Neither profile is an eligible training record or a new independent family.

## Commands

```powershell
npm run test:projects:cookie-access
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cookie-access
npm run test:projects:native:cookie-access
Remove-Item Env:VYLNT_TEST_BROWSER
npm run test:projects:native:cookie-access
npm run test:projects:native:cancel
```

The native commands need the pinned source and dependency setup from `ML_NATIVE_PROJECT_CHECKS.md`. Browser mechanism results are in `test-results/cookie-access/`; native results use `jingo-<browser>-readable-cookies.json` under `test-results/native-projects/`.

## Remaining work

Validation on 2026-10-28: Chromium and Edge passed the intervention mechanisms. Native Jingo controls passed in Chromium; the readable-cookie profile passed in Chromium and Edge with six raw findings and four linked cookie targets. The tested editor continued working while HttpOnly was enforced, while the anonymous-write HTTP 500 remained review-only. Thirty-one distinct targeted regressions passed, including the frozen-report test after rerunning with permitted loopback access. Type checking and production build passed. No holdout, model fitting or qualification prediction occurred.

The final readable-profile cancellation test also passed: the native process stopped and temporary data was removed. Tests leave no running dashboard, blockchain or native fixture service.

The ordinary Local projects companion does not automatically execute this developer prototype. Native preference-purpose checks, supported cross-site/CSRF coverage, the other category adapters, eligible independent development sources, candidate fitting and untouched qualification data remain required. Qualified Worker/API/report integration and migration 006 remain pending. Existing JS-002 releases and exported report hashes are unchanged.

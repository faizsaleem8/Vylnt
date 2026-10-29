# VYLNT scoped script-function evidence

Implementation increment: 2026-10-28. This implements the required-interaction portion of HDR-003 evidence collection. It does not qualify HDR-003 or close the entire evidence stage.

2026-10-29 extension: private measurement version 2 adds supported meta-policy timing and original/replay binding. A first-application-statement observation plus unchanged policy metadata is required; DOM order alone is insufficient. Early self/hash profiles can contribute scoped facts, while late/mutated/report-only/unsupported policies and nonce-generation uncertainty stay review-only. See `ML_META_POLICY.md` and PLAN.md for controls, results and limits.

## What is measured

`apps/cli/project-script-function.ts` executes a developer-maintained interaction in three fresh browser contexts: normal JavaScript, JavaScript disabled and normal JavaScript restored. Normal/restored controls must pass, the disabled control must positively fail, and all phases must finish with complete supported coverage. A timeout or exception is unknown, not a positive failure. A function that works without JavaScript does not establish script necessity.

The normal/restored pages also run the existing unapproved inline-script probe. Both execution/enforced-blocking results must agree. Report-only CSP does not count as enforced blocking, and Trusted Types rejection remains unknown. `cspProbeAllowed` means the scoped JavaScript-dependent application interaction worked; it does not mean every script or route was checked. `cspProbeBlocked` records only the specific unapproved inline probe.

Replay requires the same response security-policy metadata as the raw scan and matching live script-attribute digests in normal/restored contexts. An unmatched original page cannot supply this binding. Metadata hashes do not prove script byte identity, execution order or vendor trust. Changed metadata and failed restoration stay review-only. No meta-policy timing fact is inferred from DOM order.

## Bounds and provenance

Only a plain loopback origin is allowed. The shared `project-loopback-transport.ts` never follows redirects and retains payloads only transiently. Each phase permits at most 80 requests, 2 MiB per response, 8 MiB total responses and 64 KiB per request body. Its time bound is 15 seconds; the helper is bounded to 60 seconds. Cookie state is capped at 100 entries and script metadata at 150 bounded entries.

Unsupported frames, workers, WebSockets, additional pages/navigation, cross-origin resources and redirects make coverage incomplete. Contexts, requests and timers close on completion or cancellation. The original context and raw report remain unchanged. Only allowlisted enums, booleans and digests leave the producer; cookie values, bodies, page text and script source do not enter evidence or training.

Measurements merge only with a process-local producer receipt and matching scan hash/identity and adapter identity. Uploaded, cloned or altered measurements cannot acquire that receipt. Conflicting existing facts are rejected. Completed evidence uses the existing signing path. Callbacks are trusted developer tooling, not repository-provided code or an ordinary API upload.

## Native application scope

The pinned MIT Jingo prototype exercises its enhanced CodeMirror editor. The disposable authenticated form must exist; normal/restored phases insert synthetic text into the enhanced editor, while the disabled phase observes that the enhancement is absent. This does not establish that alternative textarea editing/saving is impossible or that every route is compatible.

The known cosmetic font receives the same bound offline CSS fallback in all phases. Application/authentication scripts and policies are not replaced. The missing native CSP permits the inline probe, so functionality passes without a protection claim. The anonymous-write HTTP 500 remains unknown authorization/CSRF evidence.

Jingo is still one development-exposed family. Controlled mechanism fixtures are marked `mechanism-fixture` and excluded from application dataset preparation. No training label, independent cohort or qualified model is created.

## Commands and acceptance

```powershell
npm run test:projects:scripts
npm run test:projects:native
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:scripts
npm run test:projects:native
Remove-Item Env:VYLNT_TEST_BROWSER
```

Native setup uses the pinned source/lock in `ML_NATIVE_PROJECT_CHECKS.md`. Synthetic credentials and temporary wiki data are created automatically. Results are under `test-results/script-function/` and `test-results/native-projects/`.

Acceptance covers normal/disabled/restored functionality, enforced/report-only/Trusted Types behavior, absent dependency, thrown callbacks, failed restoration, changed metadata, redirect isolation, cancellation, unchanged cookies, privacy and rejected forged measurements. Actual results are recorded in PLAN.md.

Validation: 274 unit tests/51 suites, type checking and production builds passed. Native Jingo and mechanism acceptance passed in Chromium and Edge. The final replay extension includes a path-scoped authenticated session; cookies are copied for the actual page path rather than just the origin. Existing Chromium cookie-access acceptance passed after transport extraction. The native temporary wiki/process cleanup completed. These are local compatibility results, not throughput, universal coverage or model-quality claims.

## Remaining work

Supported meta-policy timing is implemented for the bounded profiles in `ML_META_POLICY.md`. Source-backed nonce generation and broader native/dynamic compatibility remain open. The generic Local projects runner does not automatically execute this developer Jingo profile. Independent datasets, a new model/fresh holdout, qualified Worker/API integration and migration 006 remain open. JS-002, raw findings/severity, archived reports, the GitHub gate and blockchain digests retain their existing paths.

References: [Playwright context JavaScript configuration](https://playwright.dev/docs/api/class-browser#browser-new-context), [CSP enforcement and report-only policies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

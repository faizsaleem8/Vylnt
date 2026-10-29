# VYLNT framing observations

Implemented 2026-10-28 in `apps/cli/project-framing.ts`. This advances HDR-002 collection; it is not a category qualification or an embedding-purpose classifier.

## Checks

The trusted developer helper creates a synthetic parent at the target origin and an owned temporary loopback parent at a different origin. Fresh contexts test same-origin, cross-origin and repeated cross-origin framing. Target cookies are copied privately for the actual target path. A developer-maintained frame check must positively recognize the supported application state.

`embedded` requires the actual target document and successful state check. `csp-blocked` requires a matching successful target response, failed document embedding and an explicit enforced `frame-ancestors` browser audit. Report-only events do not count. Other failed loads, HTTP errors, redirects, mismatched response policies, extra frames/pages, unavailable checks and inconsistent repeats produce unknown/partial coverage. X-Frame-Options-only blocking currently remains unknown; it is not reconstructed from an error page. Meta `frame-ancestors` is not treated as protection.

The cross-origin parent uses the same loopback host with a different port. This tests origin-based framing; **it is not a distinct-site SameSite/CSRF test**.

## Bounds and privacy

HTTP loopback only. Each phase has a 12-second bound, at most 80 requests including synthetic parents, 100 copied cookies, 64 KiB request bodies, 2 MiB per response and 8 MiB total responses. The helper has a 45-second bound. Redirects never leave the bounded Node transport. Other origins, workers and WebSockets are rejected; service workers are disabled. Contexts, requests, timers and the owned parent server close on completion/cancellation.

Only outcome enums, coverage and hashes leave the producer. Cookie values, response/request bodies, page text, raw audit messages and parent URLs are not persisted. The witness binds the scan identity/hash, check identity and outcomes; it is a consistency digest, not an independent attestation or trusted upload signature.

Observations are currently diagnostic records, separate from signed evidence-v4 facts and frozen reports. They do not fill `embeddingPublicVerified` or `sensitiveActionVerified`, cannot de-emphasize findings and are not accepted as project provenance through an ordinary scan upload.

## Native application

The pinned Jingo prototype tests recognition of its authenticated new-page form in each frame. The reviewed offline cosmetic-font fallback is identical across contexts; application code and target security headers are unchanged. An embeddable authenticated form does not establish sensitivity or exploitation. Its separate anonymous-write HTTP 500 remains unknown authorization evidence. Jingo remains one development-exposed family, not three examples/families from repeated frame contexts.

## Commands

```powershell
npm run test:projects:framing
npm run test:projects:native
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:framing
npm run test:projects:native
Remove-Item Env:VYLNT_TEST_BROWSER
```

Native prerequisites are in `ML_NATIVE_PROJECT_CHECKS.md`. Results are written under `test-results/framing/` and `test-results/native-projects/`. No user credentials/dataset preparation is required.

## Remaining

2026-10-29 extension: the separate `ML_FRAME_POLICY.md` component adds exact loopback allowlists, CSP/XFO precedence, nested ancestor controls and same-run signed-fact integration. The earlier diagnostic function remains available. XFO-only enforcement, purpose/trust relationships and broader native/HTTPS scenarios are still unsupported; no category is qualified.

Source-backed public-embedding versus sensitive-action intent, broader native scenarios, XFO/nested-ancestor support, signed adapter/report integration, independent datasets, training and fresh qualification remain open. This does not automatically enable the developer prototype for arbitrary Local projects.

Protocol references: [frame-ancestors behavior and meta limitations](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [Chromium browser audit schema](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json).

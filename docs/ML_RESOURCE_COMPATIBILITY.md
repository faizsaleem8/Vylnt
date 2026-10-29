# VYLNT direct-resource dependency evidence

Implemented 2026-10-29 for a bounded NET-001 development component. No model is trained, evaluated or promoted by this work.

## Supported evidence

The experimental project collector installs a request observer before navigation. It retains request identity in memory, checks completion and actual loopback server address, and binds the original report hash plus script/policy metadata to that page. A second page at the same URL cannot substitute for the original collection receipt.

A trusted developer adapter can measure a **direct HTTP classic-script dependency in an HTTPS document**. It must positively observe the intended read-only interaction in the original document, then compare fresh normal, resource-withheld and restored contexts. Each receives a copy of transient cookies. Functional failure must be positively observed, not a timeout. Passing original/normal/restored interactions plus a failed withheld interaction establish dependency only for that operation.

A successful target receives four functional facts: HTTP transfer observed, no pre-transfer TLS upgrade, required functionality verified, and the direct target request chain complete. Original/normal/restored transfers must be completed successful direct responses with an actual loopback server address. Synthetic fulfilment, redirects, absent/failed requests, modules and ambiguous identifiers cannot supply this proof. All affected finding IDs are retained; controls run once per supported identifier. Unsupported members keep unknown fields.

Results contain statuses, finding links and metadata/witness digests. Raw matching URLs/query strings, policy text, cookies, source, page text and request bodies are not added to stored measurements. Identifiers are never model features. Process-local receipts reject uploaded/edited measurements; merges require the exact scan/adapter binding before existing installation signing. No ordinary API accepts caller-declared verified project facts.

## Network controls and bounds

Playwright route callbacks do not repeat for every URL in a redirect chain. A response-stage CDP guard now checks redirects before following them. The source collector permits only valid destinations in its explicit loopback allowlist; replay rejects all HTTP redirects and marks coverage incomplete. The guard reads no response body. Routing, blocked service workers/WebSockets, one-page/one-frame checks and cancellation remain in place. This is scoped instrumentation for trusted local projects, not an OS sandbox.

Limits: 150 script metadata entries, 16 policy-meta entries, 64 KiB snapshot, 300 observed requests, 8 MiB measured HTTP-script response bytes, 80 requests/12 seconds per replay, three candidate HTTP script identifiers and 60 seconds per helper. Source interaction has a five-second bound; browser response metadata has a 1.5-second bound. Main-document/redirect metadata is not mistaken for a script transfer. Oversized, changed or unsupported evidence cannot issue confident facts. Concurrent cancellation and cleanup await the same context-close promise.

## Explicit limits

- Verified pre-transfer HTTPS upgrades remain open. A CSP upgrade header alone proves no particular upgrade. The controlled loopback case retained HTTP transfer despite that directive; facts record what happened.
- HTTPS fixtures explicitly ignore local self-signed certificate errors. They demonstrate intervention mechanics, not TLS validation, HSTS applicability, public-web mixed-content behaviour or independent training families. No trust-store settings change.
- Redirected/cached/blocked/broken resources, modules, images/CSS/media, dynamic script graphs, byte identity and application-wide dependency claims remain unsupported. Failure or absence is never labelled harmless.
- Generic Local projects runs retain the in-memory receipt; automatic native functional adapters remain separate. No native NET-001 cohort is created here. Mechanism fixtures are excluded from training preparation.
- NET-001 remains unqualified. Existing raw findings, severity, GitHub policy, archived reports and JS-002's frozen release retain their paths.

## Commands and validation

```powershell
npm run lab:tls
npm run test:projects:resources
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:resources
Remove-Item Env:VYLNT_TEST_BROWSER
```

The TLS command reuses or creates ignored fixture files without installing trust. Checks cover dependency, misleading upgrade headers, unnecessary scripts, blocking/failure/404, redirects, query collisions, modules, synthetic fulfilment, stale/forged receipts, failed restoration, metadata drift, cookie/report preservation and cancellation. Results: `test-results/resource-function/`; final regression results: PLAN.md.

Validation on 2026-10-29: final full suite 305 tests/58 suites; 12 focused tests; type checking and production builds passed. The ten-case resource matrix passed in Chromium/Edge. Existing collector and native Jingo regressions passed in both browsers; native cleanup is recorded. The stalled Edge collector check passed after bounding metadata waits, with a unit regression preventing timed-out metadata from issuing facts. Earlier cancellation and redirect failures were corrected before the passing runs. These are engineering checks, not model-quality or application-independence measurements.

Remaining: verified pre-transfer TLS upgrades with functionality, broader resources/native adapters; independent development/holdout cohorts, real fitting/evaluation, qualified release/runtime/report acceptance and migration 006.

References: [Playwright routing](https://playwright.dev/docs/api/class-page#page-route), [response server address](https://playwright.dev/docs/api/class-response#response-server-addr), [CDP Fetch](https://chromedevtools.github.io/devtools-protocol/tot/Fetch/).

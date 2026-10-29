# VYLNT executed framing-policy evidence

Implemented 2026-10-29 as an HDR-002 development evidence component. No model is trained, qualified or released by these checks.

## Response-policy controls

`frame-policy-scope.ts` independently parses a narrow response `frame-ancestors` scope: self, none and finite exact HTTP loopback origins. It respects the first directive in each policy and intersects multiple enforced policies. Broad schemes, wildcards, external origins, paths, malformed/oversized syntax and absent policies stay unsupported. Meta and report-only policies cannot supply enforced ancestor restrictions. HTTP source-expression matching can also permit secure scheme variants; this component's execution scope is explicitly HTTP loopback ancestors, not every web origin.

The collector records a private same-run source capability bound to the unchanged raw scan. Any subsequent main-frame navigation or history change invalidates it, even if the URL is restored. A separate page at the same URL cannot supply that capability.

A developer-maintained read-only callback must positively observe the original target as healthy. Fresh contexts then test a permitted parent, a forbidden parent, repeated forbidden embedding and a nested chain containing the permitted intermediary inside the forbidden outer parent. Empty policy intersections have no permitted control; the healthy standalone target plus repeated enforced denial are required. No finding is invented when the unchanged detection rules already recognize the policy.

Each replay verifies the target response status and exact security-header metadata. The browser audit is bound to the protected origin, violating outer ancestor, matched target navigation and expected frame graph. Chromium reports the protected origin rather than the complete target path, so string equality with the full report URL is insufficient. Timeouts, unrelated/unlinked audits, XFO-only failures, unavailable targets, redirects, policy drift and incomplete graphs stay unknown. An allowed load must pass the target callback; a failed load alone never proves protection.

Successful HDR-002 targets receive `framePolicyEnforced=true` and `frameAncestorsRestricted=true`, with browser provenance and a common witness digest. Public-embedding purpose, sensitive-action intent and the trustworthiness of allowed parents remain unasserted. These are measured configuration controls within the declared scope, not exploitability or application-wide safety findings.

## Assessment policy and compatibility

New project evidence uses `vylnt-project-assessment-v2`. Its future candidate safeguard can use the two complete browser-proven policy facts with the same witness only when complete response policy also establishes self/no-parent scope in the supported HTTP ancestor domain. This avoids fabricating purpose values. Other permitted origins retain Needs review until their trust/purpose relationship is supported. Unsupported framework/collection, contradictory known purpose, high/critical severity and incomplete controls retain review safeguards. Response-parser facts alone cannot select this path.

Policy-v1 seals still parse and verify with their original bytes, hashes and stricter purpose requirements. The evidence-v4 tensor layout and the frozen JS-002 release are unchanged. Generic companion collection only records source provenance; native functional adapters and qualified Worker/API/frozen-report integration are still separate work. No active qualified v4 classifier or migration 006 is enabled here. New development registrations must bind the v2 assessment policy and current producer hashes; do not rewrite older registrations or consumed experiments.

## Bounds and privacy

Targets are clean HTTP loopback URLs. Parent HTML is synthetic and intercepted; no unrelated service at a permitted parent port is contacted. Only the actual target origin is fetched through the bounded no-redirect transport. Service workers, WebSockets, extra pages, unexpected frame graphs and non-GET operations cannot supply complete coverage.

Bounds: 16 policies, 16 source expressions per directive, an 8 KiB header limit, 80 requests/8 MiB per replay, 2 MiB per transferred response, 12 seconds per phase, five seconds for source health and 65 seconds per helper. All contexts, timers, network operations and temporary parent servers are closed on success, failure and cancellation. Concurrent cleanup awaits the same context-close promise. Native applications remain trusted local code, not OS-sandboxed code.

Stored measurements contain booleans/enums, finding links and digests. Matching URLs, policy text, raw bodies, page text, cookies and credentials do not enter their output or numeric features. Only process-local issued receipts may be merged; scan and adapter identity must match before existing installation signing. Uploaded/edited facts cannot mint a receipt. Mechanism fixtures are explicitly excluded from application datasets.

## Commands and validation

```powershell
npm run test:projects:frame-policy
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:frame-policy
Remove-Item Env:VYLNT_TEST_BROWSER
```

The matrix exercises explicit allowlists, multiple/duplicate directives, CSP/XFO precedence, self/none, empty intersections, missing/report-only/meta/broad policies, failed callbacks, stale/forged bindings, policy drift, redirects, URL-history invalidation, nested denial, legacy seal/hash verification, privacy and cancellation. Results: `test-results/frame-policy/`; actual checks and remaining work: PLAN.md.

Validation on 2026-10-29: the full suite passed 309 tests/59 files with one worker. Final source-hashing hardening passed 12 focused tests; the regression checks both raced invalidation and an uninterrupted valid binding. Type checking/builds passed. Chromium/Edge passed 12 browser scenarios each; native Jingo passed standalone with cleanup. Initial full-URL audit matching was corrected to origin/ancestor/navigation linkage. Parallel holdout/native failures are retained in PLAN.md alongside passing isolated runs; limits were not relaxed. These are implementation checks, not measured model quality.

Remaining: source-backed public-embedding/sensitive-action relationships, trust/suitability of configured parents, broader/native/HTTPS scope and automatic adapters; independent application cohorts, real fitting, untouched holdout gates, gated runtime/report release and migration 006. HDR-002 and the other six remaining categories stay unqualified.

Reference: [CSP Level 3 ancestor processing and X-Frame-Options precedence](https://www.w3.org/TR/CSP3/#directive-frame-ancestors).

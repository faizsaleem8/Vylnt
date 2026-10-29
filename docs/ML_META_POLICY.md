# VYLNT meta-CSP evidence

Implemented 2026-10-29 for the supported HDR-003 developer workflow. This collects scoped facts; it does not qualify HDR-003 or enable a model release. Ordinary extension scans retain their existing behavior.

## Timing and identity

The project collector starts `project-meta-policy.ts` before navigating the committed application. It waits for that owned document to commit, then uses Chromium's `scriptFirstStatement` event breakpoint to inspect metadata before the first supported application statement. A post-load DOM order alone is not timing evidence.

Playwright itself installs scripts for bindings and WebSocket isolation. Their exact browser-reported hashes are learned in a separate fresh `about:blank` context with all network/WebSocket traffic blocked. Only exact matching anonymous tooling scripts are excluded. URL names, prefixes and arbitrary anonymous scripts are not trusted. No application script source is retrieved. Unknown contexts/source labels or ambiguous previously parsed application scripts require review.

The first-statement callback captures bounded policy metadata and installs a private mutation observer before resuming the page. A debugger-owned object handle retains the observer; no page-global marker is exposed. Final metadata is read in a separate isolated world. Changes to security-policy tags, including removal/reinsertion with identical final markup, invalidate the proof. Unrelated viewport metadata changes do not. Previously compiled/unobserved application scripts cannot be treated as protected merely because a meta tag was subsequently moved before them.

Supported policies must be stable, enforced meta policies in the document head, before the first DOM script, and present at the measured execution boundary. This deliberately rejects some valid deferred/module/data-script layouts rather than guessing their ordering. Original and normal/restored replay metadata identities must agree. Redirected/dirty document identities, changed policies, late/body/report-only meta tags, unsupported expressions and exhausted budgets remain unknown.

## Function and enforcement

`project-script-function.ts` private measurement version 2 retains normal, JavaScript-disabled and restored contexts. A supported interaction must succeed with scripts, positively fail without them, then succeed again. The unapproved inline probe must independently execute or generate the expected enforced CSP violation consistently. A transfer, timeout or Trusted Types rejection cannot stand in for execution or CSP enforcement.

Only compatible measurements can add `metaPolicyBeforeScripts`, `scriptPolicyEnforced` and `scriptSourcesRestricted` alongside the existing compatibility/probe facts. Effective restrictions account for the conjunction of supported response and meta policies. Unsupported enforcing response syntax remains review-only even with a supported meta policy. Only HDR-003 targets are enriched. A meta `frame-ancestors` directive never supplies framing protection; real same/cross-origin embedding controls exercise that limitation.

The narrow parser recognizes self/explicit HTTPS-origin restrictions, first-directive/fallback semantics, multiple enforced policies and correctly sized SHA-256/384/512 source hashes. Browser mechanism checks exercise SHA-256; the other digest lengths have parser boundary checks. It recognizes bounded nonce syntax (16–128 decoded bytes), but a functioning nonce-controlled page does **not** prove unpredictable, fresh generation. Nonce-dependent profiles remain `needs-review` with no qualified assessment facts until a source-backed adapter supplies that context. Per-response nonce/token normalization and broader dynamic configurations remain open. These syntax/interaction controls are not cryptographic-quality or exploitability claims.

## Bounds, privacy and integration

Limits: sixteen relevant meta tags, 8,191 characters per content value, 32 KiB total snapshot metadata, 200 tracked contexts/scripts, 4,096 observed mutation records and a 1.5-second debugger-pause recovery bound. Existing 15-second phase/60-second helper and network/body limits remain. The source navigation keeps its existing timeout. Browser pause failures recover to review; callbacks, sessions, object handles, mutation observers and injected observation worlds are cleaned up. Native source and authentication are not replaced.

Only enums, booleans, counts and digests leave the timing producer. Meta directives, nonces, hash tokens, script URLs, page text, cookies, credentials, request bodies and application source do not enter its stored output. Identity digests bind replay; they are not numeric model identity features. Process-local receipts still reject cloned/uploaded/tampered measurements. Completed evidence uses the existing installation signing path.

The generic Local projects collector captures timing in memory; automatic application-specific functional adapters are still separate work. No normal API accepts a caller's claimed meta proof. Mechanism fixtures are excluded from application datasets. Native Jingo remains one development-exposed family. Existing scan severities, raw exports, archived insights, the qualified JS-002 model, GitHub policy and blockchain/report digests retain their existing paths.

## Checks and commands

```powershell
npm run test:projects:scripts
npm run test:projects:native
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:scripts
npm run test:projects:native
Remove-Item Env:VYLNT_TEST_BROWSER
```

The mechanism suite covers early/self/hash and broad policies, measured-but-review-only nonces, response/meta conjunction, report-only/late/body/unsupported policies, metadata movement/rewrite/removal/reinsertion, an earlier inline-event flow, source/replay drift, irrelevant viewport changes, limits, privacy, idempotency and forged receipts. It also retains prior cancellation, cookie/session preservation, redirected-resource isolation and failed-restoration checks. Tests assert a working application in the late inline-event case, so rejection cannot be attributed merely to broken fixture code.

Results are in `test-results/script-function/`, `test-results/native-projects/` and PLAN.md. Initial pre-execution-breakpoint attempts could not inspect the paused environment and failed closed; the implementation uses the tested first-statement event instead. A strict-response fixture was corrected to respect the existing rule's absence of an HDR-003 finding. No warning was invented to populate an assessment.

Validation on 2026-10-29: 300 tests/57 suites passed in the full TypeScript run. Final hardening passed 30 focused tests/5 suites, type checking and production builds. The 24-case script-function matrix, project-collector regressions and native Jingo acceptance passed in Chromium and Edge; native cleanup is recorded. Production builds emitted the existing Zod/Rollup annotation warnings. These are implementation/compatibility results, not model-quality measurements.

Remaining: source-backed nonce generation, broader native policy/compatibility coverage and signed companion adapters; independent development/holdout families, actual fitting/evaluation and qualified runtime/report integration with migration 006. No holdout is consumed and no category is promoted by these checks.

Reference: [Chromium first-statement event-breakpoint implementation](https://chromium.googlesource.com/chromium/src/+/eb59c72731d60b8f7d2e13189246a7fd2bbe0e26/third_party/blink/renderer/core/inspector/inspector_event_breakpoints_agent.cc).

# VYNLT M5 — local blockchain reports

2026-10-24 automatic generation follow-up complete: React finalises and hashes insights when analysis completes, not only on export. It shows the full canonical SHA-256 and separate submission status, reuses immutable versions, merges concurrent history reads and aborts obsolete work. Save failures expose an explicit retry; existing backend submission/backoff remains unchanged. Real-chain acceptance passed 15 groups including automatic generation/save/hash/anchoring without a download. Full browser regression, final type checking and builds passed; original acceptance below remains historical. No new hosted/native/public-network certification or ML qualification is claimed.

Status: **complete for local blockchain scope**, 2026-10-23. All 14 grouped real-chain/client checks and the full browser regression passed.

Approved scope: automatically queue the canonical combined insights digest after authenticated finalisation; local Hardhat EVM only (31337, loopback RPC), Solidity writer-only immutable digest registry and ethers v6. No Docker, public deployment, paid services, browser wallet or ML qualification claims.

- [x] Contract, pinned compiler/toolchain, local deployment commands and instance identity.
- [x] Durable owner-scoped journal, single nonce worker, signed-before-broadcast recovery, bounded retries and deletion cancellation.
- [x] Automatic finalisation integration and owner-scoped status/retry/live verification/proof APIs. Raw endpoints and frozen exports remain unchanged.
- [x] React/extension saved-version status, verification/retry/proof controls, polling cancellation and accessibility.
- [x] Contract/API/recovery/tamper/browser acceptance, type checking/build and documentation.

Verification must recompute canonical content and source linkage, validate configured bytecode/instance, receipt/event/canonical block and contract lookup. One confirmation is sufficient only for this disposable local demonstration. Proof metadata stays outside immutable JSON/PDF. Chain resets invalidate current verification; local journal persistence is not blockchain persistence or public attestation. Anchor metadata remains local even for Supabase report storage; no new SQL migration.

M5 closure is supported by an actual saved report anchored/verified on the local EVM, altered-content rejection, API restart recovery and rejection of historical confirmations after chain reset. Update PLAN.md and this checklist after each increment; preserve unverified limitations.

## Validation record

First complete isolated-chain acceptance passed 11 grouped checks: zero/unauthorized contract writes, automatic/concurrent finalisation and isolation, durable signed-byte recovery after a simulated lost broadcast and API restart, canonical/tamper/wrong deployment/block/event checks, contract duplicates, unsent deletion, real dashboard and unpacked extension verification/proof controls, narrow layouts/axe, offline report access, five-attempt/retry persistence and chain reset rejection. Artifacts are private in `.local/blockchain-acceptance-*`; summary is `test-results/blockchain-acceptance.json`. Full TypeScript suite passed 209 tests / 38 suites, type checking and builds passed. Final CLI/client checks are rerunning after a hidden-button CSS correction found in screenshot inspection.

Initial failures were preserved: sandboxed Vitest temporary-file EPERM (normal-access rerun passed), skipped native EDR optional dependency (Node-24 npm repair), test timing before next receipt poll, missing test mode/origin and Playwright's required explicit context. None was resolved by weakening chain verification. Scoped solc/tmp override removes the newly introduced high advisory; two pre-existing moderate Vitest/mocker advisories remain. No hosted Supabase/native Edge/public network recertification is claimed.

## Final closure record

All 14 grouped checks passed, including actual CLI exit behavior, separate-report serialized nonces and UI Retry recovery from a seeded failed journal job. Actual offline retry exhaustion is independently tested. Malformed export content is classified separately from chain unavailability. Final full browser regression passed extension/CLI/dashboard and existing JSON/PDF/reload/cancellation behavior with no JS errors. Its obsolete request-count assertion now explicitly permits only scan read, frozen-version history and separate anchor status; no prediction API is allowed. Screenshot inspection confirms scoped hidden controls and wrapping; native Edge/hosted/public acceptance is not claimed.

The normal :8545 local contract is deployed and `.env` enables it; restart the API/reload extension. No real user scan was submitted during implementation; synthetic acceptance uses its own :18545 chain and :18546 API. Final type checking, builds and whitespace checks passed. Remain aware of the documented two pre-existing moderate Vitest/mocker advisories. No Docker or public deployment was added. M4 hosted GitHub Actions is next; ML-Q remains separate.

Final full regression: 210 tests / 38 suites passed. Type checking, production builds, all 14 blockchain acceptance groups, full browser acceptance and whitespace checks passed.

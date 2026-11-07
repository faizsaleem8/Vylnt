# VYLNT local strict-TLS collection environment

Prepared 2026-10-29. This is part of ML-Q evidence collection. It is not a dataset or model release.

## Project commands

```powershell
npm run ml:projects:tls -- prepare
npm run ml:projects:tls -- review
npm run test:projects:tls:trusted
npm run test:projects:native:tabinator -- --tls --seeds
```

Preparation creates a two-day self-signed **leaf** certificate with localhost/127.0.0.1 SANs, CA:FALSE, no certificate-signing key usage, and serverAuth usage. All files stay under ignored `.local/ml-local-tls/`; no private key enters data/model/report artifacts. Review checks its exact SHA-256, thumbprint, validity, self-signature, SANs, matching private key, bounded paths/files and public DER. Existing registrations are never silently replaced. Expired certificates require a deliberately new registration; old data must retain its original certificate identity.

The preparation/review command never changes certificate trust. It displays exact identity-bound import/removal commands for a separately authorized local trust window. On Windows, trust installation/removal changes account security settings and requires explicit authorization. Never import an arbitrary project-supplied certificate or remove unrelated roots. A trust entry alone does not prove that Windows or the browser validates its chain; strict browser tests are authoritative. Do not use `ignoreHTTPSErrors` to make these tests pass.

## Native profile

The `--tls` Tabinator profile serves the disposable unchanged native application behind a loopback HTTPS termination proxy using the prepared leaf. Native SQLite session/user, protected bookmark, cookie removal/restoration and HttpOnly controls remain active. Browser certificate bypass stays disabled. HTTPS/DNS measurement receipts feed same-run evidence. Configuration includes the transport profile and certificate digest; the adapter remains the same implementation across profiles. Profiles and browser repeats remain one family. HTTP profiles are supported unchanged in purpose.

The source inspector still has partial route coverage. This profile does not establish all native category context or dataset eligibility. Existing Secure/HttpOnly seed labels remain separate from the HSTS observations; no new HSTS class label is inferred just because TLS works.

## Actual results and blockers

5 November: after explicit approval for a fresh leaf (the old one expired), certificate SHA-256 `678544a617b6b06b57b3860384b58a7475b31e4de44410aeee2b641e1ff2dcbb`, thumbprint `3EB40D92EB35B600AB3E9017A8202CFF173248E2`, passed strict Chromium missing/positive/disabled HSTS mechanism profiles. The actual resource upgrade did not execute; the report remains partial. Native Tabinator HTTPS attempts still failed certificate validation after API preparation; they produced no accepted native artifacts or seeds. New diagnostic records are under ignored `test-results/native-projects/failures/`; prior trust failures below remain historical. The exact leaf was removed in each trust-window finally block, and a fresh CurrentUser Root read confirmed zero remaining entries. No issuing CA or certificate bypass was used. Native TLS/upgrade readiness remains open.

The user explicitly authorized a temporary trust window for the prepared leaf and its removal. The first Chromium attempt completed strict HTTPS measurement of three HSTS header profiles before failing the resource-upgrade execution assertion. This demonstrates an observed mechanism branch, not a retained native training dataset or complete acceptance. The localhost CSP-upgrade probe did not execute its expected script; subsequent code retains that as a failed/unsupported probe rather than issuing an upgrade label.

Repeat trust attempts were inconsistent: a fresh process initially still listed the leaf after provider removal. Exact API-based removal plus a fresh-process read verified absence. A later store-API trust window yielded Chromium `ERR_CERT_AUTHORITY_INVALID`; a subsequent Import-Certificate attempt returned Windows error `0x80092004`; certutil reported import success but Windows chain validation remained false. These are retained failures, not passing quality evidence. Additional trust-store changes were stopped. Fresh checks confirmed the exact leaf absent from CurrentUser Root, Disallowed and TrustedPeople, and its Windows chain untrusted. No general issuing CA was installed.

The trusted mechanism now records per-profile failure checkpoints. Positive native TLS collection remains blocked until Windows/browser trust is reliably established for an approved local test certificate. Native TLS code is implemented and type-checked but is not claimed as successfully collected. Existing negative TLS, certificate-identity guards and HTTP native regressions are documented in PLAN.md.

Even if strict TLS profiles pass, a missing resource-upgrade execution result produces a **partial** report and exit 2, never a complete acceptance pass. The local trust setup must not be treated as category qualification.

## Remaining ordered work

1. Resolve reliable, authorized strict local certificate validation; repeat Chromium/Edge and native TLS acceptance, keeping failed attempts.
2. Establish explicit resource-upgrade/initiator and native compatibility controls. Counterpart-only diagnostics remain insufficient.
3. Complete native category contexts and independently checked class data across the registered development cohort.
4. Fit and calibrate the candidate, evaluate a fresh untouched holdout, and integrate only passing categories.

JS-002 remains the only qualified category. No acceptance target or data requirement was lowered.

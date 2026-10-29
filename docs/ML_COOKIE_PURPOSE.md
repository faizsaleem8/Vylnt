# VYLNT source-backed cookie purpose evidence

Implementation increment: 2026-10-28. This advances the cookie evidence work in ML-Q. It does not train or qualify any category.

## Supported proof

`apps/cli/project-cookie-preference.ts` combines a reviewed source graph with browser interventions. A theme-like name or a login that survives cookie removal cannot establish preference purpose by itself.

The first supported profile is `vylnt-reference-layout-v1`, a deliberately small Express reference under `labs/ml-cookie-purpose/`. Its entire application logic comprises the reviewed server and client files; its dependency lock is also checked. Authentication uses a separate server session cookie. The preference cookie has one known use: layout density. The source profile approves these exact uses, not application-supplied comments or declarations.

Verification requires tracked, committed source, reviewed LF-normalized file hashes, an unchanged dependency lock and matching revision. The proof records the actual JS source-byte hashes, so Windows CRLF checkouts bind to the same bytes as the source inspector. Source and revision are rechecked before and after collection. This process-local capability cannot be acquired by uploading a JSON declaration.

## Executed controls

The producer runs fresh, origin-limited browser contexts with:

1. The first supported preference value and existing authentication.
2. The second supported value, preserving authentication.
3. The preference removed: presentation returns to the reviewed default and protected access still works.
4. Only the preference retained: presentation changes, but the protected operation must return an explicit 401/403 denial.
5. The first value restored: the original presentation and protected operation reproduce.

Cookie values stay in transient browser state and are compared privately to verify each intervention held. Returned controls contain only enumerated states and HTTP status classes. They do not contain the actual preference values, credentials, cookie values or page text.

The known authentication cookie also undergoes original/anonymous/removal/restoration controls. Its dependency must be observed against the protected operation. Together with the closed source graph, this supports `cookieAuthDependency=true, cookiePreferenceVerified=false` for that cookie. The preference receives the opposite facts only after all preference controls pass. Error responses, incomplete coverage, mixed uses, changed metadata and failed restoration remain uncertain.

The earlier HttpOnly producer then independently tests whether each cookie needs JavaScript access. In this reference, the readable authentication cookie can become HttpOnly without breaking the tested interaction, while hiding the preference prevents the selected layout from being restored. Those cases produce distinguishable evidence-v4 tensors. Existing conservative safeguards still keep high-severity findings visible.

## Reference and data boundaries

This application is a **mechanism reference**, not a new independent application family or a training corpus. Its signed project evidence is marked `collectionKind: mechanism-fixture`; developer dataset preparation explicitly rejects it. Other applications require their own reviewed source profiles and checked native flows. Reusing this reference across repositories cannot supply the required independent families.

Only a receipt produced in the current trusted producer can merge source-backed purpose facts. JSON-cloned, altered or fabricated receipts are rejected. Evidence must match the original scan hash, commit and inspected source hashes. Completed evidence uses the existing installation signing path; this establishes local provenance, not independent attestation or protection against a malicious process running as the same OS user.

The reference runs from a temporary committed checkout, has synthetic in-memory credentials/session state, binds to loopback and exposes a per-run readiness identity. The harness verifies that identity before sending credentials. Source files, dependency junction and signing state are cleaned up after completion or cancellation. No production account, database, Docker service or additional credential is used.

## Developer commands

```powershell
npm run test:projects:cookie-preference
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cookie-preference
Remove-Item Env:VYLNT_TEST_BROWSER
npm run test:projects:cookie-preference:cancel
```

Results are stored under `test-results/cookie-preference/`. The producer is not automatically enabled for ordinary Local projects or extension scans. The reference's proposed assessment safeguards are exercised without a trained model or category promotion.

## Recorded validation

All 272 unit tests/50 suites, type checking and production builds passed. The final Chromium and installed Edge source/behaviour acceptance passed: paired roles and distinct evidence-v4 tensors, HTTP-error abstention, high-severity visibility, private output, source tampering, stale/forged receipts, CRLF source-byte binding and signed evidence. Active-control cancellation stopped the reference server and removed temporary data. The existing Chromium cookie-access browser regression passed after the shared-flow extension.

An Edge attempt concurrent with the broad unit suite failed during source-backed controls; a standalone rerun passed. No timeout or evidence gate was weakened. This does not establish performance under contention. A sandboxed setup attempt also failed before the fixture could run; the permitted temporary-Git/loopback run supplied the passing results. Historical JS-002 collector/evaluator files have no diff.

## Remaining ML-Q work

General native profiles, target-write necessity, cross-site/CSRF flows, remaining header/resource evidence, independent development and untouched holdout cohorts, fitting/evaluation and qualified Worker/API/frozen-report integration remain open. Migration 006 is still pending. JS-002 and historical reports retain their existing release and verification paths.

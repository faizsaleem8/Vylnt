# Native preference acquisition

## Secure preference variants

The HomeInventory language and Etherpad editor collectors can exercise a
readable preference cookie with Secure enabled, two SameSite modes and two
browser lifetimes. Chromium verifies the actual attributes on loopback.
The receipt must match the observed Secure flag. These HTTP loopback
captures establish browser cookie behavior within the two local applications.
They supply no TLS, HSTS or production compatibility evidence.

Each application tests the native preference with JavaScript access,
then with HttpOnly and again after restoring access. Separate controls
check that the preference itself does not grant access to protected
functionality. The shared rule issues CK-002 for the tested cookie and
does not issue CK-001 when Secure is set. Existing family assignments
remain in force. [Measured counts](ML_REGISTERED_DATASETS.md)

Registered source-selection intent on 6 November 2026, before execution or prediction.

## Selected source

HomeInventory, upstream `asdteke/HomeInventory`, revision
`ffbdb191ac9eeb0d6e19a91db0c9fea4b476e49b`, MIT.
The earlier screening excluded its 719 files under the general 600-file copy cap.
A dedicated adapter may copy at most 1,000 pinned regular files, 128 MiB total,
with an 8 MiB maximum per file. Scan and combined-report limits keep their
existing definitions. Source suitability is based on native behavior.

The source contains SQLite authentication and a native i18next language cookie.
Its client checks local storage before cookies and can rewrite the preference
while starting. Those interactions require dedicated counterfactual controls.
The existing read-only cookie accessor check cannot qualify this behavior.

## Required native controls

- Run a disposable copy with synthetic account, independent database ownership
  checks, temporary encryption keys and loopback-only listeners.
- Serve the application's own built client. Exercise the native language control
  and authenticated route. Observe language and access outcomes as bounded facts.
- Establish both cookie-driven and local-storage-driven behavior separately.
  Clear competing preference stores in cookie-driven trials. Include fresh,
  restricted and restored states.
- Establish preference purpose independently of cookie naming. Any controlled
  misleading-name profile must rename the corresponding native reader and writer
  together, preserve authentication controls and record the intervention.
- Attribute JavaScript necessity to an exercised operation. Observe access and
  bounded cookie rewrites. A cookie read alone cannot establish necessity.
- Block external browser traffic, external identity/email providers and startup
  integrations. Keep all database, upload, backup and temporary paths disposable.
- Verify source blobs and lockfile hashes before and after every acquisition.
  Retain no cookie values, account details, source code or page text in evidence.

## Executed prototype results

The 719 files passed Git-blob verification. Both dependency locks were used with
installation scripts initially disabled. The native SQLite build required the
existing Microsoft compiler with `--clang=0` under a checksum-verified local Node
24.11.1 runtime. Both the original and controlled client builds completed.

The unmodified server profile failed the first preference control. The server
sets a language cookie with HttpOnly while the native client also reads it.
The supported experimental response profile removes HttpOnly and Secure only
from that preference cookie on local HTTP. Its restricted-access phase preserves
HttpOnly. Authentication-cookie options are passed through.

| Control | Observed language | Authentication |
|---|---|---|
| Fresh German preference | German | Authenticated |
| Fresh French preference | French | Authenticated |
| Preference absent | Turkish fallback | Authenticated |
| JavaScript access restricted | English | Authenticated |
| Preference restored | German | Authenticated |
| Competing French local storage | French | Authenticated |
| Authentication removed | German | Denied |

The native language selector also successfully changed German to French.
Accessor traces retained booleans only. This scope covers the cookie-driven
flow with empty competing storage and the separately observed storage fallback.
It does not establish JavaScript necessity across all application flows.

The readable-cookie and controlled-name trials passed in Chromium and Edge.
A profile renaming the corresponding native server
lookup and client cookie reader/writer to `session-language-preference`
reproduced the real CK-001/CK-002 warnings after all seven controls passed.
The profile targets the native server lookup and client cookie reader/writer.
The staged source is restored after building that profile.

Results are under `test-results/native-preference/`. Final data commands
preserve the sanitized raw scan with its content hash, the executed collector
hash and the two controlled source-overlay hashes. All prototype outputs
declare `eligibleForTraining: false`. No model predictions or fitting occurred.

## Signed evidence and cohort entry

### Signed acquisition continuation

Policy v9 is opt-in for the exact native cookie-driven localization scope.
The native client redirects signed-in accounts to `/legal-consent`. Its own
cookie writer uses SameSite=Lax; the pinned language detector can write Strict.
Both actual native states are supported. Other metadata remains uncertain.
An optional bounded native-readiness step runs before the shared snapshot,
waiting for the real localization flow without changing cookie metadata.
Earlier attempts were rejected for unsupported path and mismatching metadata;
their failure files remain and issue no accepted seed.

The first accepted `native-preference-registration-04` froze the source graph, collector/harness,
assessment and training role before acquisition. All seven controls passed in
Chromium and Edge, followed by signed report evidence, authenticated contextual
seed extraction, reload verification and modified-scan/evidence rejection.
Both accepted batches remain one source family. The Secure finding retains its
original high severity and therefore stays visible for review, including when
the independently established purpose label is contextual. The HttpOnly purpose
assessment only covers the cookie-driven localization flow with empty competing
storage; the separate local-storage counterfactual is retained.

Final registration `07` includes the source-verified Lax/Strict scope and
bounded native readiness. Both Chromium and Edge acquisitions passed. Material
registration `06` froze those two captures before the additional Chromium
compatibility repetition. Preparation `.local/ml-q-material-datasets-005`
credits four preference contexts, two per category, in one family. The complete
cohort now has 42/630 eligible cases. Intermediate registrations and rejected
attempts remain preserved; they are not added to that manifest.

The source graph, actual scan, adapter, inspection and all four cookie facts
share verified bindings. Only the trusted developer collector can issue the
process-local merge receipt. Uploaded or cloned measurements cannot acquire
this capability. Incomplete controls and unsupported categories remain uncertain.
The native authentication cookie is not relabelled as a preference.

### New development cohort selection

Before new candidate fitting, the next separately registered development
snapshot replaces Anonymous Notepad's training slot with HomeInventory's
prospectively registered training source. The other eleven source identities
and original roles remain fixed. All four validation families stay in validation.
Anonymous Notepad's native external assets and mutating frame requests exceed
the supported framing context; it has no supported contextual cookie flow in
the inspected adapter. The replacement is based on native functional suitability,
not model predictions. Its source history, captures and exclusion reason remain
recorded; it stays excluded from future holdouts.

The new cohort adopts authenticated existing development captures and the new
registered preference captures. It cannot attach a native purpose claim to an
older extension scan. Every adopted numeric input must reproduce its original
authenticated tensor. Each source retains its capture registration; the new
manifest freezes both origins and all exclusions before preparation. Counts,
family minimums, fresh-holdout gates and model status remain to be measured.

The source remains excluded from future qualification holdouts after exposure.
Seed envelopes deliberately retain `eligibleForTraining: false`: a seed alone
cannot establish a complete eligible cohort. Authenticated preparation and the
independent candidate preflight credit the four supported contexts after source,
split, signature and extraction checks. Every category still fails its overall
count/family requirements, so no new model is fitted or qualified.

Final validation passed 133 relevant TypeScript tests/twelve files, 72 Python
tests, type checking and builds. Actual readiness tests exercise native settling
and missing-readiness failure/cleanup. The existing collector acceptance passed.
Copied actual data rejects forged readiness and refuses candidate creation;
archived counts remain unchanged. No certificate trust or ordinary scan limits
changed. Broader native cancellation/performance, full corpus coverage, fresh
qualification and qualified runtime/export acceptance remain separate work.

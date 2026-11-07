# VYLNT browser transport and HSTS evidence

Implemented 2026-10-29 as the next ML-Q evidence increment. This supplies a transport producer; it does not qualify HDR-001 or supply a twelve-family corpus.

## Observed transport

The HomeInventory profiles use the signed authentication session on
`/api/auth/me`. A native house write must create exactly one row for
the same synthetic owner. The anonymous replay must leave those rows
unchanged. The HTTPS runner reads and verifies pinned Git objects,
checks the exact backend dependency lock and keeps disposable application
files and dependencies on the Ubuntu filesystem during the run.

The `hsts-activate-native` fixture first clears any dynamic policy with a
credential-free strict TLS response, then observes plaintext at the
loopback listener. The application reload supplies the only positive HSTS
response during the probe. The browser must attempt TLS instead of sending
plaintext on the next request. This directly observes policy installation
and distinguishes it from parsing a positive directive in isolation.

Anonymous Notepad is collected at its pinned editor route. The browser
edits a disposable note over HTTPS and an independent SQLite connection
checks the saved value. A separate native control sets a document password,
verifies a wrong-password write leaves storage unchanged and confirms
that an authorized write succeeds. The password and note contents stay
in the disposable run.

The `hsts-disable-active` fixture measures removal of a previously active
policy. It observes plaintext before installation, a TLS handshake after
installation, then plaintext after reloading the native response with
`max-age=0`. The control server never sends a reset directive during this
profile. The registered receipt binds the scan and adapter and records the
negative preload fact for this exact loopback fixture. The unmeasured
disabled-header profile leaves preload status unknown.

The protected Personal Knowledge Manager notes endpoint is covered by the
registered fixture. The browser scans `/api/notes` with strict certificate
validation. Separately, the application's native API writes a disposable
note, an independent SQLite read confirms it, and missing or invalid
credentials leave storage unchanged. Scoped response overrides exercise
disabled, valid, missing and malformed HSTS, plus active same-host policy
with missing or malformed headers. Policy-installation and reset traffic
stays on the fixture host and uses no application credentials. The results
describe that endpoint under the tested configuration.

The Wikiflow fixture repeats the six profiles against `/api/session`.
Chromium must receive the authenticated response over strict TLS. The
collector checks the native signed cookie against the disposable owner row,
verifies a term write through an independent SQLite connection, and confirms
that missing or invalid CSRF tokens and anonymous writes leave the term
table unchanged. The evidence is limited to the tested route and write.

The companion scanner passes its actual strict-certificate-validation setting to the browser measurement. The producer traverses at most ten explicitly allowed redirect hops and reads each response's browser security details. Only a complete chain whose hops all use HTTPS with supported TLS 1.2/1.3 metadata, under strict certificate validation, establishes `tlsValidated=true`. HTTP hops, absent security details, unsupported protocols, unavailable responses, scope limits and changed navigation remain uncertain. A bypassed browser session explicitly cannot establish validation.

For a DNS host, positive transport establishes HSTS host applicability for the scanned scope. IP literals are explicitly inapplicable. This is not a claim that the browser installed an HSTS policy, that a host is preloaded, or that all application routes are covered. Parsed HSTS directives remain separate response facts. Preload membership remains unknown.

The producer binds its facts to the original scan and records a private in-memory receipt over the complete measurement. Merging rejects copied, altered or stale measurements. The API no longer derives positive validation solely from its launch configuration. New producer/harness identities require new future data registrations; historical sealed evidence and hashes retain their original bytes and meaning.

The witness retains sanitized chain metadata and protocol-observation booleans, not certificate subjects, issuers, query strings, fragments, URL credentials, page text, request bodies or cookie values. Protocol strings are reduced to bounded booleans before persistence.

## Validation

```powershell
npm run test:projects:transport
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:transport
Remove-Item Env:VYLNT_TEST_BROWSER
```

The browser mechanism creates a disposable self-signed localhost certificate and loopback servers. Strict navigation must reject that certificate; bypassed navigation, IP-host applicability and an HTTP-to-HTTPS redirect cannot manufacture validated HSTS facts. The servers and certificate files are removed afterward. Nothing is installed into the certificate trust store. Test certificates and mechanism applications are excluded from application training counts.

Unit tests exercise the positive transport branch with mocked Playwright responses, plus incomplete/missing/altered transport. Separate native collection uses a disposable Linux Chromium trust store to validate the named loopback origin with certificate checking enabled. Current application evidence and remaining qualification gaps are recorded in [the dataset log](ML_REGISTERED_DATASETS.md).

The 8star Links HSTS profile varies the directive on the native API response
and verifies the application's own SQLite write. The Jingo profile uses the
authenticated editor response and independently reads the new Git-backed
page. The Portal profile uses the native `/api/groups` response and checks
the native create operation against its independently reopened SQLite file.
Its group operation is public in this fixture, so the result carries no
authentication claim. For the missing-header profile, the same browser first reaches a
plaintext listener, then receives a valid HSTS control over HTTPS. A repeat
request sends a TLS ClientHello to the plaintext port without transmitting
HTTP. This distinguishes the scoped missing policy from a host that already
has effective HSTS in that browser. The test covers the configured loopback
response and does not assert a production preload or site-wide policy.

The same-host profile adds two checks before crediting a contextual case.
After a separate response installs HSTS, the browser reloads the exact
native URL over strict TLS and confirms that its response is still
headerless. The wire probe verifies a TLS handshake where plaintext
previously succeeded. A verified `max-age=0` control then restores
plaintext. Assessment v12 allows the resulting browser fact only for
the scoped named fixture. The raw response still records an absent header
and makes no preload claim.

The BookWise diagnostic found a cookie on the reset request even after
clearing the cookie jar. The browser now sends the reset with credentials
omitted and checks its actual TLS response. The listener still rejects
Cookie and Authorization headers. The diagnostic retains only booleans
and a bounded request classification.

The malformed-directive profile uses the exact fixture value
`max-age=invalid`. The browser must first load the native HTTPS response
with strict certificate validation, then reach the plaintext listener.
A separate valid HTTPS policy must turn the same HTTP attempt into a
TLS handshake. Assessment v13 records an ineffective browser policy
only with this scoped receipt. Other unsupported directives and
incomplete captures continue to require review.

The retained-policy profile tests the same exact malformed value in a
browser that has learned a valid policy from a separate HTTPS response
on the same host. Assessment v14 requires a strict-TLS reload of the
original native URL that still returns the malformed value. The wire
probe must observe plaintext before installation, a TLS handshake while
the policy is active, and plaintext after a credential-free reset. The
numeric evidence keeps the syntax unsupported and records the verified
browser policy as active. The contextual assessment applies to that
browser state and observed response. A first-time visitor can still
receive the malformed directive without any active protection.

References: [Playwright response security details](https://playwright.dev/docs/api/class-response#response-security-details), [HSTS host and transport semantics](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security).

# VYLNT browser transport and HSTS evidence

Implemented 2026-10-29 as the next ML-Q evidence increment. This supplies a transport producer; it does not qualify HDR-001 or supply a twelve-family corpus.

## Observed transport

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

Unit tests exercise the positive transport branch with mocked Playwright responses, plus incomplete/missing/altered transport. These mocks are not positive real-application TLS observations. Actual browser results and companion regressions are recorded in PLAN.md. This release still needs successful strict validation against a browser-trusted local certificate, independent native application scenarios, contextual examples, eligible source families and measured qualification.

References: [Playwright response security details](https://playwright.dev/docs/api/class-response#response-security-details), [HSTS host and transport semantics](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security).

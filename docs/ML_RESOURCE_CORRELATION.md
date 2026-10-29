# VYLNT mixed-resource transfer correlation

Implemented 2026-10-29 as the next NET-001 evidence component.

`correlateResourceTransfers(page, report)` matches an original HTTP script reference to its same-scan browser requests. The existing observer now collects bounded HTTP and HTTPS response status, actual loopback response metadata and supported TLS protocol metadata when certificate validation is strict. Query strings are used transiently for exact matching; they do not leave the observer.

The result explicitly distinguishes an HTTP request, an HTTPS counterpart, ambiguous matching, an unobserved request and an unsupported script. Transfer outcomes distinguish completed response bodies, failed requests, HTTP errors and unavailable metadata. A timeout fetching response metadata is unknown rather than an observed network failure. Synthetic route fulfilment cannot establish wire transfer. Neither transfer completion nor an HTTPS URL establishes script execution.

The receipt is tied to the same Page, scan hash, original DOM metadata and explicitly allowed loopback origins. A changed scan, DOM or navigation cannot reuse it. Duplicate DOM references that collapse to one sanitized URL, redirect relationships and multiple matching requests remain ambiguous. Every affected finding retains its reference. Module-script causal interpretation remains unsupported. Raw URLs, query values, response bodies, certificate identities and cookie values are absent from returned diagnostics.

## Limits and next component

The output always records `upgradeVerified: false` and `functionVerified: false`. In particular, an HTTPS counterpart is insufficient to prove that the browser upgraded the original request before transfer: it may have another initiator. It also does not establish complete native functionality. This diagnostic format is not accepted by the project-fact merger or model as a contextual assessment. Existing HTTP baseline/withheld/restored causal controls remain separate and retain their original decision rules.

Next work is explicit browser upgrade/initiator evidence, strict trusted TLS and native baseline/withheld/restored functional controls for that upgrade path. Native examples, the independent development split, candidate training, fresh holdout evaluation and release acceptance remain open. This component does not qualify NET-001 or increase the qualified-category count.

## Checks

```powershell
npm run test:projects:resources
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:resources
Remove-Item Env:VYLNT_TEST_BROWSER
```

These are mechanism fixtures with bypassed local certificate validation, excluded from application training counts. Unit tests additionally exercise an HTTPS counterpart using mocked response metadata; that is not a real strict-TLS application measurement. Actual execution results and limitations are recorded in PLAN.md.

References: [Playwright request lifecycle and redirects](https://playwright.dev/docs/api/class-request), [CSP upgrade semantics](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests).

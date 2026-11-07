# VYLNT direct-resource dependency evidence

Implemented 2026-10-29 for a bounded NET-001 development component. No model is trained, evaluated or promoted by this work.

## Native stylesheet scenarios

The BookWise and Yoyo development adapters can target the native
stylesheet used by the profile menu or collection editor. The fixture
changes one stylesheet URL in the pinned page to a loopback HTTP URL.
The upgrade variant adds the same response policy used by the strict
script upgrade fixture. The browser must observe the expected wire
transport and show that the control starts closed, opens and closes
on demand, and recovers after restoring the stylesheet. A closed
control rendered onscreen during the withheld phase is a measured
failure. A timeout or ambiguous link leaves the result uncertain.

The DOM finding is the single target. The network record for the same
stylesheet provides transfer evidence, so a page reference and its
completed request cannot earn separate examples. The stylesheet
inventory is capped at 60 entries in the shared metadata snapshot.
Disabled and alternate stylesheets and duplicate sanitized references
cannot issue proof. The strict upgrade flow requires a validated
fixture TLS connection and no original HTTP request. These tests
measure the reviewed control on the pinned page.

## 8star Links settings menu

The disposable 8star Links run uses its native `styles.css` and
settings menu. Withholding the stylesheet leaves the closed menu
visible. Restoring it recovers the original hidden, open and closed
behavior. The direct-HTTP and strict HTTPS-upgrade runs retain the
browser's transport evidence and a separate public folder write
verified against SQLite. The write check uses the app's original
loopback API listener. Both profiles contribute training cases from
the same application family.

The module profiles preserve the original `type="module"` and pinned
`app.js` bytes. The direct HTTP fixture serves only that asset and
allows only the exact HTTPS fixture origin, with credential-bearing
requests rejected. The upgrade profile serves the same module over
validated HTTPS. Both use the original settings-menu interaction and
check a separate native SQLite write. The module must transfer, its
absence must leave the menu toggle inoperative, and restoration must
recover the interaction. The adapter checks that the pinned module has
no imports. This profile covers the one reviewed asset.
[HTML Standard on module scripts](https://html.spec.whatwg.org/multipage/scripting.html)

The direct HTTP result uses the browser's loopback treatment. It does
not predict whether a browser will load the same HTTP reference from a
production origin. [W3C Secure Contexts](https://www.w3.org/TR/secure-contexts/)

## Tabinator bookmark editor

A disposable copy serves the pinned editor's original script bytes
from one controlled loopback asset URL. It omits the CDN presentation
assets and cosmetic favicon requests. The browser measures whether the
native event handler opens the bookmark editor in the original,
withheld and restored phases. An independent SQLite oracle checks a
native protected write and anonymous denial. Both the direct HTTP and
strict HTTPS-upgrade cases passed in Ubuntu Chromium and entered the
validation split. They cover the editor operation in this fixture.

## Jingo editor help dialog

The Jingo profile targets the pinned Bootstrap stylesheet used by the
editor's Markdown help dialog. The browser exercises the native toolbar
and dismiss button. Withholding the stylesheet must make the closed
dialog visible, and restoring it must recover the original behavior.
The independent write check verifies a new page in Jingo's disposable
Git repository. Both variants use a strictly validated local TLS
document. The upgrade variant requires the browser to send the asset
request over HTTPS without first transferring it over HTTP. The result
applies to this stylesheet and editor interaction.

## FieldPoint native map

The FieldPoint adapter uses the locked Leaflet assets. The JavaScript
check exercises the map's native right-click site editor. The stylesheet
check compares actual tile positioning. A local fixture tile avoids
contacting the external basemap provider. The stylesheet replay also
pins the viewport dimensions so unstyled tiles cannot continually
resize their own container. These are controlled deployment changes.
The direct-HTTP listener forwards only the selected asset and sends
no application credentials upstream. The independent application
check verifies a synthetic authenticated write against SQLite and
checks anonymous denial.

## Supported evidence

The experimental project collector installs a request observer before navigation. It retains request identity in memory, checks completion and actual loopback server address, and binds the original report hash plus script/policy metadata to that page. A second page at the same URL cannot substitute for the original collection receipt.

A trusted developer adapter can measure a **direct HTTP classic-script dependency in an HTTPS document**. It must positively observe the intended read-only interaction in the original document, then compare fresh normal, resource-withheld and restored contexts. Each receives a copy of transient cookies. Functional failure must be positively observed, not a timeout. Passing original/normal/restored interactions plus a failed withheld interaction establish dependency only for that operation.

A successful target receives four functional facts: HTTP transfer observed, no pre-transfer TLS upgrade, required functionality verified, and the direct target request chain complete. Original/normal/restored transfers must be completed successful direct responses with an actual loopback server address. Synthetic fulfilment, redirects, absent/failed requests, modules and ambiguous identifiers cannot supply this proof. All affected finding IDs are retained; controls run once per supported identifier. Unsupported members keep unknown fields.

Results contain statuses, finding links and metadata/witness digests. Raw matching URLs/query strings, policy text, cookies, source, page text and request bodies are not added to stored measurements. Identifiers are never model features. Process-local receipts reject uploaded/edited measurements; merges require the exact scan/adapter binding before existing installation signing. No ordinary API accepts caller-declared verified project facts.

## Network controls and bounds

Playwright route callbacks do not repeat for every URL in a redirect chain. A response-stage CDP guard now checks redirects before following them. The source collector permits only valid destinations in its explicit loopback allowlist; replay rejects all HTTP redirects and marks coverage incomplete. The guard reads no response body. Routing, blocked service workers/WebSockets, one-page/one-frame checks and cancellation remain in place. This is scoped instrumentation for trusted local projects, not an OS sandbox.

Limits: 150 script metadata entries, 16 policy-meta entries, 64 KiB snapshot, 300 observed requests, 8 MiB measured HTTP-script response bytes, 80 requests/12 seconds per replay, three candidate HTTP script identifiers and 60 seconds per helper. Source interaction has a five-second bound; browser response metadata has a 1.5-second bound. Main-document/redirect metadata is not mistaken for a script transfer. Oversized, changed or unsupported evidence cannot issue confident facts. Concurrent cancellation and cleanup await the same context-close promise.

## Explicit limits

- Native pre-transfer HTTPS upgrade collection supports the pinned Jingo,
  BookWise and Yoyo Collection workflows. Broader families, resource types and
  coverage remain open.
  A CSP upgrade header alone cannot establish a transfer or dependency.
- HTTPS fixtures explicitly ignore local self-signed certificate errors. They demonstrate intervention mechanics, not TLS validation, HSTS applicability, public-web mixed-content behaviour or independent training families. No trust-store settings change.
- Redirected/cached/blocked/broken resources, modules, images and media,
  dynamic script graphs, byte identity and application-wide dependency
  claims remain unsupported. Failure or absence is never labelled harmless.
- Generic Local projects runs retain the in-memory receipt. Native acquisition
  uses a separate developer command. Mechanism fixtures are excluded from
  training preparation.
- NET-001 remains unqualified. Existing raw findings, severity, GitHub policy, archived reports and JS-002's frozen release retain their paths.

## Commands and validation

### Native Jingo editor

The prospective Jingo run kept the pinned application and native CodeMirror
asset. A disposable proxy changed the one editor script reference to HTTP
and supplied the CSP upgrade directive. The browser verified strict TLS,
direct transfer, exact resource matching, and successful typing. A fresh
browser context withheld the HTTPS request and positively observed editor
failure. Restoring the request restored editing. The final native save
produced the expected wiki file and new Git commit. The isolated TLS
listener reported no unexpected handshake. Signed scan/evidence reload,
tamper rejection and native cleanup passed. Preparation admitted one
contextual validation case, with the original high-severity finding still
requiring runtime review. [Dataset counts](ML_REGISTERED_DATASETS.md)

### Yoyo Collection

The pinned application's native add form depends on its existing classic
script. The test proxy changed the one script reference and applied the
controlled response policy. Chromium used HTTPS before transfer,
withholding prevented the modal from opening, and restoration let the
form submit successfully. An independent SQLite read verified the new
row. Both strict HSTS configurations passed on the same application
family in separate runs. The first direct HTTP attempt failed. The retry
explicitly preserved the numeric loopback asset origin and passed direct
HTTP, withheld, restored and SQLite readback controls.
[Dataset counts](ML_REGISTERED_DATASETS.md)

### BookWise

Both transfer cases exercise the native profile menu with the pinned
classic script. The normal and restored replays open the menu, while
withholding the target leaves it closed. The HSTS cases exercise the
native category editor instead. A separate native category operation and
independent SQLite owner/content readback establish a healthy application
for all four profiles. The BookWise scope does not claim the profile-menu
script is a dependency of the category write. The four signed cases were
admitted to training. [Dataset counts](ML_REGISTERED_DATASETS.md)

### Strict named-origin upgrade fixture

Ubuntu Chromium 156.0.8078.4 passed five controls. A reserved `.test` name
maps to loopback only inside the browser. The matching non-CA certificate
leaf is trusted only in a disposable NSS profile. Both document and script
use normal TLS validation. The probe checks the original DOM reference,
response status and TLS metadata, loopback peer address, request type,
redirect absence and script execution. It checks the server for plaintext
requests and verifies that detection with a positive plaintext control.

| Case | HTTPS script transfers | Plaintext script transfers | Executed |
|---|---:|---:|---|
| Without the directive | 0 | 0 | No |
| Directive enabled | 1 | 0 | Over HTTPS |
| Upgraded request withheld | 0 | 0 | No |
| Upgraded request restored | 1 | 0 | Over HTTPS |
| Localhost resource control | 0 | 1 | Over HTTP |

The final run confirmed deletion of the disposable trust profile. No
Windows trust change was needed. This fixture adds zero training
observations. [W3C upgrade algorithm](https://w3c.github.io/webappsec-upgrade-insecure-requests/#upgrade-request)

### Direct HTTP resource checks

```powershell
npm run lab:tls
npm run test:projects:resources
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:resources
Remove-Item Env:VYLNT_TEST_BROWSER
```

The TLS command reuses or creates ignored fixture files without installing trust. Checks cover dependency, misleading upgrade headers, unnecessary scripts, blocking/failure/404, redirects, query collisions, modules, synthetic fulfilment, stale/forged receipts, failed restoration, metadata drift, cookie/report preservation and cancellation. Results: `test-results/resource-function/`; final regression results: PLAN.md.

Validation on 2026-10-29: final full suite 305 tests/58 suites; 12 focused tests; type checking and production builds passed. The ten-case resource matrix passed in Chromium/Edge. Existing collector and native Jingo regressions passed in both browsers; native cleanup is recorded. The stalled Edge collector check passed after bounding metadata waits, with a unit regression preventing timed-out metadata from issuing facts. Earlier cancellation and redirect failures were corrected before the passing runs. These are engineering checks, not model-quality or application-independence measurements.

Remaining: additional independent native resource families, broader
resource types and outcomes, fresh holdout, fitting and evaluation,
qualified runtime and report acceptance, and migration 006 verification.

References: [Playwright routing](https://playwright.dev/docs/api/class-page#page-route), [response server address](https://playwright.dev/docs/api/class-response#response-server-addr), [CDP Fetch](https://chromedevtools.github.io/devtools-protocol/tot/Fetch/).

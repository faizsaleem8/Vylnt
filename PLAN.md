# VYLNT implementation plan

Last updated: 2026-11-07 (Asia/Calcutta)

## Current milestone

**7 November — Technical report and demo study guide.** Updated the
[editable report](docs/VYLNT_TECHNICAL_REPORT.md) and rebuilt the
[38-page PDF](output/pdf/VYLNT_Technical_Report_and_Presentation_Guide.pdf).
The guide now traces one finding from browser collection through report
generation, blockchain verification and GitHub checks. It includes a
timed demo, a troubleshooting guide and interview practice. The PDF
verifier rendered all 38 pages and found no content outside page bounds.
All rendered pages were reviewed at thumbnail scale. The update uses
the existing dataset `056` and recorded evaluations. No new application
tests, model training or qualification runs were performed for the report.

**7 November — Etherpad HSTS validation supplement.** The adapter registers
against the active validation family, requires the native protected pad
response over strict HTTPS, and checks an authorized pad write against
the disposable database. Anonymous writes must leave the stored value
unchanged. The pinned Linux-local runtime is being prepared to address
the prior startup timeout. Dataset `056` remains the latest admitted corpus.

**7 November — HomeInventory HSTS training supplement.** The collector
registers against the active signed source split and reuses the pinned
HomeInventory server, signed session and disposable Ubuntu dependencies.
The scoped browser report identifies the same owner as the native house
write and independent SQLite readback. Anonymous writes left storage
unchanged. Two earlier attempts timed out before the listener opened.
Using verified Git objects and a Linux-local dependency copy resolved
startup. All four registered Chromium runs passed.

Dataset `056` credits **326/630, 304 outstanding, 22 class or family
deficits and 0/7 ready to fit**. HSTS reaches **84/90**. Its training quotas
are complete at 30 per class from eight families. Validation still needs
three change-warranted and three contextual cases. Type checking, 55
focused tests and production builds passed. Preflight exited 2. Datasets
`055` and `056` each reproduced all 14 files byte for byte. Etherpad's pinned Ubuntu
stage and frozen lock install passed, but its first Linux smoke test
timed out before readiness. It adds no cases. No model fitting or holdout
evaluation ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Native response installs HSTS.** The new profile verifies a
credential-free reset and plaintext baseline in Chromium. It reloads the
strict HTTPS application response and requires a TLS handshake in place of
plaintext after the positive directive. The receipt binds the verified
negative preload fact to the scan. Seven training and three validation
families passed. Dataset `055` credits **322/630**, with 308 outstanding
and 24 class or family deficits. HSTS reaches **80/90**. Each HSTS class
needs two more training and three more validation examples. Type checking,
44 focused tests and production builds passed. Datasets `054` and `055`
each reproduced all 14 files byte for byte. Preflight exited 2.
All ten admitted activation receipts passed the wire and cleanup audit.

Four additional Anonymous Notepad Chromium runs passed, with native
editor, SQLite and wrong-password controls. The material importer
rejected the supplement because HomeInventory replaced Anonymous Notepad
in the active training split. Those captures remain private and add
zero examples. The updated adapter passed type checking, 45 focused tests
and production builds. The remaining HSTS acquisition targets the active
HomeInventory and Etherpad families. HomeInventory's pinned Ubuntu
dependency installation passed its lock check and SQLite, bcrypt and
Sharp smoke checks. Its HSTS adapter and browser runs remain open.
No fitting or holdout evaluation ran.

**7 November — Application response clears active HSTS.** A new registered
browser profile starts with a plaintext baseline, installs a valid policy
and verifies a TLS handshake in place of plaintext. It then reloads the
application over strict HTTPS and requires the actual `max-age=0` response
to restore plaintext. Separate policy-control listeners reject credentials.
The signed capture retains the wire receipt and the verified preload fact
for the scoped fixture. Ten Chromium runs passed across seven training
and three validation families. BookWise passed on retry after its initial
plaintext check failed. Type checking, 43 focused tests and production
builds passed.

Dataset `054` adds **ten change-warranted HSTS examples** and credits
**312/630, 318 outstanding, 24 class or family deficits and 0/7 ready
to fit**. HSTS reaches 70/90, with two change-warranted and nine contextual
training cases plus three change-warranted and six contextual validation
cases still needed. Preflight exited 2. All ten signed capture receipts
passed the wire-control and cleanup audit. Datasets `053` and `054`
each reproduced all 14 files byte for byte. No fitting or holdout
evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Wikiflow signed-session HSTS collector.** The strict
loopback HTTPS runner now supports Wikiflow's pinned `/api/session` route
and requires a verified signed session, native term write, independent
SQLite owner readback, anonymous denial and the application's own CSRF
checks. The Ubuntu Node 20 fixture runtime passed its release checksum,
and the locked SQLite and password addons passed smoke checks. All six
registered Chromium runs passed, covering three change-warranted and
three contextual HSTS cases from the same training family.

Dataset `053` credits **302/630, 328 outstanding, 24 class or family
deficits and 0/7 ready to fit**. HSTS is at 60/90. Type checking, 38 focused
tests and production builds passed. Preflight exited 2 with the remaining
gaps. Datasets `052` and `053` each reproduced all 14 files byte for byte. The result
covers one authenticated API route and the verified write. No model
fitting or holdout evaluation ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Protected notes endpoint HSTS collector.** The strict
loopback HTTPS harness now supports Personal Knowledge Manager's pinned
`/api/notes` route. Its native write and SQLite readback are separate from
the browser transport control. The collector checks the backend dependency
lock and package manifest before startup. The pinned SQLite addon compiled
under Ubuntu Node 24 using workspace-local tools. The initial browser run
reached the seed stage but was rejected by the public-route check. A new
registration verified the notes API's missing- and invalid-credential
denials instead. All six registered Chromium runs then passed.

Dataset `052` adds **six HSTS training examples**, three change-warranted
and three contextual, and credits **296/630, 334 outstanding, 24 class
or family deficits and 0/7 ready to fit**. Type checking, production builds
and 41 focused tests passed. Preflight exited 2 with the remaining gaps.
Datasets `051` and `052` reproduced all 14 files byte for byte. The new
evidence covers one protected API route. No model fitting or holdout
evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Etherpad contextual HttpOnly validation.** Four registered
Chromium runs verified the native line-number preference with Secure set.
They tested save and reload, editor failure under HttpOnly, recovery after
restoring access, and denial of pad access with the preference cookie alone.
The first batch timed out at startup. The isolated retry passed three
cases, and the final case passed on its own retry after an initial save
failure. All credited runs completed cleanup and signature checks.

Dataset `051` adds **four contextual HttpOnly validation examples** on top
of HomeInventory's four training examples. It credits **290/630, 340
outstanding, 24 class or family deficits and 0/7 ready to fit**. Contextual
HttpOnly has eight cases from one family in each split. Preflight exited 2
with the remaining gaps. Dataset `051` reproduced all 14 files byte for
byte. No fitting or holdout evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Secure cookies that still need JavaScript.** Four registered
HomeInventory Chromium runs verified the native language preference with
Secure set, across two SameSite values and two browser lifetimes. The native
preference worked with JavaScript access, failed with HttpOnly and worked
after restoration. The control preserved the authentication cookie
attributes and verified a separate native write through storage readback.

Dataset `050` adds **four contextual HttpOnly training examples** and
credits **286/630, 344 outstanding, 24 class or family deficits and 0/7
ready to fit**. Type checking, 46 focused tests and production builds
passed. Datasets `049` and `050` reproduced all 14 files byte for byte.
Preflight exited 2 with the remaining gaps. The training
and validation contextual HttpOnly sets still have only one family each.
No model fitting or holdout evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Standalone module transport.** Two registered Chromium
runs preserved 8star Links' native module bytes and `type="module"`.
The settings toggle stopped working only while the module was withheld.
One run transferred the module over HTTP on loopback. The other verified
an HTTPS upgrade before transfer. A separate native write passed SQLite
readback in both runs. The profile covers this one reviewed module.

Dataset `049` adds **two mixed-resource training examples** and credits
**282/630, 348 outstanding, 24 class or family deficits and 0/7 ready to
fit**. Type checking, 59 focused tests, both native Chromium runs, the
Chromium resource regression and production builds passed. Preflight
exited 2 with the remaining gaps. Datasets `048` and `049` reproduced all
14 files byte for byte. No model fitting or holdout evaluation
ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — String evaluation in the script response policy.** Six
registered Chromium runs blocked unapproved inline elements while the
bounded string-evaluation probe executed. Removing only `unsafe-eval`
blocked string evaluation while preserving the tested native interaction.
The debugger's CSP bypass was disabled. Assessment v18 requires the
matched response and paired receipt. The result applies to the tested
interaction and does not establish an attacker-controlled input.

Dataset `048` adds **six change-warranted script-policy examples** and
credits **280/630, 350 outstanding, 24 class or family deficits and 0/7
ready to fit**. Type checking, 65 focused tests, six native Chromium runs
and production builds passed. Preflight exited 2 with the remaining gaps.
Datasets `047` and `048` each reproduced all 14 files byte for byte.
No model fitting or holdout evaluation ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Hash-based script response policy.** Six registered
Chromium runs verified that the native interaction worked while an
unapproved inline probe was blocked by the response policy. Each app's
native write also passed independent storage readback. Assessment v17
requires the exact policy and matching browser facts with no meta policy.
BookWise and Yoyo Collection passed sequential reruns after initial
startup failures.

Dataset `047` adds **six contextual script-policy examples** and credits
**274/630, 356 outstanding, 24 class or family deficits and 0/7 ready
to fit**. Type checking, 58 focused tests, Chromium script acceptance and
production builds passed. Datasets `046` and `047` reproduced all 14 files
byte for byte. Preflight exited 2 with the remaining gaps. No model fitting or holdout
evaluation ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Broad ancestor policy and authenticated writes.** Six
registered applications performed their native authenticated action in
same-origin and repeated foreign frames under `frame-ancestors http:`.
Storage readback verified each action. BookWise passed an isolated rerun
after an inconclusive parallel run. Assessment v16 treats the exercised
configuration as change-warranted. Its scope is one tested route and action.

Dataset `046` adds **six eligible examples** and credits **268/630,
362 outstanding, 24 class or family deficits and 0/7 ready to fit**. The
first import hit the 16-entry historical adapter-list cap. Preparation now
uses the existing bounded capture limit for adapter identities and continues
to require signed provenance, the original family and split, and material
deduplication. Type checking, 74 focused tests, Chromium framing acceptance
and production builds passed. Preflight exited 2 with the remaining gaps.
Datasets `045` and `046` each replayed byte for byte across all 14 files.
No model fitting or holdout evaluation ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Paired framing denial controls.** Three previously
inconclusive applications and Jingo passed the duplicate `DENY` profile.
The producer binds Chromium's blocked request to the error frame and
requires successful loads after removing only the header in otherwise
identical direct and nested foreign frames. The three earlier direct-frame
runs lacked the expected Chromium diagnostic despite a blocked request.

Dataset `045` adds **four contextual framing examples** and credits
**262/630, 368 outstanding, 24 class or family deficits and 0/7 ready
to fit**. Type checking, 65 focused tests, four registered Chromium runs
and production builds passed. A separate Portal run passed in Microsoft
Edge outside the dataset. Preflight exited 2 with the remaining gaps.
Datasets `044` and `045` each replayed byte for byte across all 14 files.
No model fitting or holdout evaluation ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Duplicate framing denial.** Chromium blocked direct,
repeated and nested foreign framing under the exact duplicate `DENY`
header. Removing only the header let the native response load in a
same-origin control. Assessment v15 preserves the raw rule finding
and records the scoped browser result. The initial policy incorrectly
made adjacent cookie evidence incomplete. The correction keeps that
evidence eligible, and the final runs use a fresh registration.

Dataset `044` adds **six contextual framing examples** and credits
**258/630, 372 outstanding, 24 class or family deficits and 0/7 ready
to fit**. Three attempted applications did not pass all framing controls
and supplied no examples. Type checking, 52 focused tests, the existing
Chromium framing acceptance and production builds passed. Candidate
preflight exited 2 with the remaining gaps. Datasets `043` and `044`
each replayed byte for byte across all 14 files. No model fitting or holdout
evaluation ran. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Jingo stylesheet transport.** Two registered Chromium
runs verified Jingo's native help dialog with its Bootstrap stylesheet
loaded, withheld and restored. One case used direct HTTP and the other
proved an HTTPS upgrade before transfer. Both independently verified a
native Git-backed page write. Both cases entered mixed-resource validation.

Dataset `043` credits **252/630, 378 outstanding, 24 class or family
deficits and 0/7 ready to fit**. Type checking, 22 focused tests, both
browser runs and production builds passed. Preflight exited 2 with the
remaining gaps. Datasets `042` and `043` each replayed byte for byte
across all 14 files. No model fitting or holdout evaluation ran. Source screening
found that Tabinator's CORS configuration alone leaves a body-independent
logout POST outside the JSON preflight defense. It adds no contextual
SameSite example. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — FieldPoint origin configuration.** Four registered
Chromium profiles verified repeated authenticated writes from an
unrelated site after it was added to the native origin allowlist.
Removing the cookie or setting Lax stopped writes from that same site.
The protected configuration passed separately and contributed no new
credits. The four new cases cover one native route and training family.

Dataset `042` credits **250/630, 380 outstanding, 24 class or family
deficits and 0/7 ready to fit**. SameSite change-warranted training now
has 16 examples from four families. Contextual validation still has zero
examples. Type checking, 37 focused tests, five browser runs and production
builds passed. Candidate preflight exited 2 with the remaining gaps. No
model fitting or holdout evaluation ran. Datasets `041` and `042` each
replayed byte for byte across all 14 files. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Portal HSTS coverage.** All six registered Chromium
profiles passed on Portal's pinned `/api/groups` route with strict TLS.
The collector independently verified the native public group operation
in SQLite. All three change-warranted and all three contextual examples
were admitted into Portal's existing training split.

Dataset `041` credits **246/630, 384 outstanding, 24 class or family
deficits and 0/7 ready to fit**. Type checking, 59 focused tests and
production builds passed. Candidate preflight exited 2 with the
remaining gaps. Datasets `040` and `041` each replayed byte for byte
across all 14 preparation files. No model fitting or holdout evaluation ran. HSTS
still needs 42 examples across its four class and split cells.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Retained HSTS policy.** Seven pinned application families
passed Chromium checks showing that an already-installed policy still
upgrades requests when the native response sends `max-age=invalid`.
Assessment v14 preserves the unsupported header syntax and requires
the scoped browser receipt, including a credential-free reset. The
result applies to the tested browser state. First-time visits still
need a valid policy.

Dataset `040` adds **seven eligible contextual examples** and credits
**240/630, 390 outstanding, 24 class or family deficits and 0/7 ready
to fit**. Type checking, 80 focused tests and production builds passed.
Four localhost tests initially hit restricted network access and
passed with access to their disposable local servers. Preflight exited
2 with the remaining gaps. No model fitting or holdout evaluation ran.
Both the archived `039` and the new `040` reproduced all 14 files
byte for byte.
Remaining work includes additional HSTS mechanisms, native framing and
script policy cases, preference and cross-site cookie cases, and
functional resource upgrade examples. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Malformed HSTS evidence.** Seven pinned Chromium
runs verified that the exact malformed directive left plaintext
reachable. A valid HTTPS control then caused a TLS handshake in
place of plaintext. Assessment v13 requires this scoped browser
receipt, strict TLS and the original response. Other unsupported
directives continue to require review.

Dataset `039` credits **233/630, 397 outstanding, 24 class or family
deficits and 0/7 ready to fit**. All seven cases were admitted,
four in training and three in validation. Type checking, 52 focused
tests, all seven browser runs and the production build passed.
Datasets `038` and `039` reproduced all 14 files byte for byte.
Candidate preflight exited 2 with the remaining gaps. No model
fitting or holdout evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — HSTS reset isolation.** BookWise's reset carried a
cookie even after the browser cookie jar was cleared. The reset now
uses a browser request with credentials omitted. The listener still
rejects Cookie and Authorization headers. BookWise and Tabinator
passed strict TLS, the headerless reload, the wire upgrade and
plaintext after reset. An earlier Tabinator capture was excluded
because its producer had changed after registration. The rerun
matches the signed registration.

Dataset `038` credits **226/630, 404 outstanding, 24 class or family
deficits and 0/7 ready to fit**. BookWise adds one contextual HSTS
training case and Tabinator adds one validation case. Type checking,
43 focused tests, both Chromium captures and the production build
passed. Dataset replay matched all 14 files byte for byte. Candidate
preflight exited 2 with the remaining gaps. The proof covers the
tested named loopback responses.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Same-host HSTS evidence.** Assessment v12 distinguishes
the absent raw header from an observed effective policy installed
by another HTTPS response on the same host. Five Chromium runs
verified the original headerless route, a wire-level upgrade while
the policy was active and a return to plaintext after reset. The
expected failed TLS navigation runs in a separate page to keep the
reset navigation independent. BookWise still failed its reset and
contributed no example.

Dataset `037` credits **224/630, 406 outstanding, 24 class or family
deficits and 0/7 ready to fit**. The five contextual HSTS cases add
three training and two validation examples. Evidence remains scoped
to named loopback fixtures. Type checking, 51 focused tests, five
Chromium captures and the production build passed. Datasets `036`
and `037` reproduced byte for byte. Candidate preflight exited 2
with the remaining gaps. No model fitting or holdout evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Native HSTS expansion.** Strict Chromium runs on
8star Links and Jingo covered disabled, positive and missing
response directives. The 8star Links oracle verified its native
SQLite write. The Jingo oracle verified a new Git-backed page.
For missing directives, both applications passed the same-browser
plaintext control followed by the HTTPS policy control. The disabled
and positive Jingo runs reproduced existing contexts.

Dataset `036` credits **219/630, 411 outstanding, 24 class or family
deficits and 0/7 ready to fit**. 8star Links adds three HSTS training
cases and Jingo adds one missing-header validation case. The proof
covers the tested named loopback responses. Type checking, 54 focused
tests, six Chromium profiles and the production build passed.
Replay matched all 14 dataset files byte for byte. Candidate
preflight exited 2 with 24 gaps. No model fitting or holdout
evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — HomeInventory transient language cookies.** Two
registered Chromium captures exercised Lax and Strict session
variants of the existing language preference. The profile modifies
only the preference cookie's lifetime and SameSite attributes on
native server and browser writes. All seven browser controls passed,
including the language switch and denial with the preference alone.
The original browser profile also passed its regression check.

Dataset `035` credits **215/630, 415 outstanding, 24 class or family
deficits and 0/7 ready to fit**. Contextual Secure and HttpOnly
training each have four of 30 examples from one of three required
families. This evidence covers the tested language interaction on
loopback. Type checking, 51 focused tests and both new Chromium
captures passed. Replay matched all 14 dataset files byte for byte.
Candidate preflight exited 2 with 24 gaps. No model fitting or
holdout evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Etherpad preference variants.** Three registered
Chromium captures supplement Etherpad's existing validation slot. The
editor rewrote the initial browser-injected attributes before the
first attempt could sign. The corrected test changes only lifetime
and SameSite on writes to the single native preference cookie. It
then verifies the attributes after reload, the native read failure
under HttpOnly, restoration and denial with the preference alone.
Material preparation now checks the original rotation separately
from each signed supplemental Etherpad adapter. The prior dataset
reproduced byte for byte after that fix.

Dataset `034` credits **211/630, 419 outstanding, 24 class or family
deficits and 0/7 ready to fit**. Contextual Secure and HttpOnly
validation each have four examples from one family. This evidence
covers one editor preference under controlled loopback settings.
Type checking, 47 focused tests, three Chromium captures, the
production build and whitespace checks passed. The new dataset
reproduced all 14 files byte for byte. Candidate preflight exited 2
with 24 gaps. No model was fitted and no holdout was evaluated.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — HomeInventory SameSite evidence.** Four registered
cookie configurations now cover native house creation. The signed
account cookie was required for authentication. Foreign form submissions
created owner-linked SQLite rows twice, while the anonymous control
returned 401 and left rows unchanged. The first run exposed a mismatch
when comparing cookie objects across a copied scan. The corrected
collector binds to the finding and verified cookie dependency.

Dataset `033` credits **205/630, 425 outstanding, 24 class or family
deficits and 0/7 ready to fit**. SameSite change cases meet the
three-family minimum in both splits. Training has 12 of 30 cases
and validation has 12 of 15. The new proof covers one route with
explicit cookie settings. Type checking, 47 focused tests, four
Chromium captures, the existing language-preference browser check
and the production build passed. All 14 dataset files reproduced
byte for byte. Candidate preflight exited 2 with the remaining gaps.
No candidate was fitted or evaluated.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Native logout SameSite evidence.** Habit Tracker now
contributes four registered training cases across session lifetime and
readability variants. The browser's foreign form revoked the signed
session in both repeated trials. The anonymous control returned the
same HTTP 200 and left the session intact. The first acquisition used
an empty body that the form probe could not validate. The corrected
profile sends one inert field that native logout ignores.

Dataset `032` credits **201/630, 429 outstanding, 24 class or family
deficits and 0/7 ready to fit**. SameSite training change is now
8 of 30 cases from two families. The test covers session revocation
on the one route under the tested cookie settings. Type checking,
47 focused tests, all four Chromium captures and the production build
passed. Replay matched all 14 files byte for byte. Candidate preflight
exited 2 with 24 remaining gaps. No candidate was fitted and no holdout
was used.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Native JSON SameSite evidence.** The Tabinator development
profile now tests credentialed bookmark writes across two distinct loopback
sites. The JSON probe lets Chromium and the pinned server handle preflight.
The original intercepted attempt did not provide a valid browser CORS
test. The corrected fixture verifies that all six foreign preflights
reach the server and that denying CORS prevents every foreign write.
All four registered Tabinator cookie variants produced a same-origin and
two foreign 201 responses with independent owner-specific SQLite readback.
Their anonymous controls returned 401 and left storage unchanged.

Dataset `031` credits **197/630, 433 outstanding, 24 class or family
deficits and 0/7 ready to fit**. SameSite validation change reaches
three families and 12 of 15 examples. Contextual validation still has
zero cases. The new cases cover the single bookmark route with
permissive development CORS. Type checking, 47 focused tests, Chromium
and Edge browser acceptance, the production build and whitespace checks
passed. Replay matched all 14 dataset files byte for byte. Candidate
preflight exited 2 with the remaining gaps. No candidate was fitted and
no holdout was used.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — SameSite cookie variants.** The FieldPoint split-origin
adapter can verify separate readable and persistent cookie configurations.
Each capture repeats the trusted, anonymous, Lax, restored and hostile
mutation controls. The collector checks the actual browser cookie
attributes before labelling. All three variants passed and contributed
contextual training cases. Yoyo Collection contributed four validation
change cases across its readable and persistent cookie configurations.
The browser's foreign multipart form sent the owner cookie and added a
generated photo. Independent SQLite and file readback confirmed the
mutation. The anonymous request received 403 and left photo rows unchanged.

Dataset `030` credits **193/630, 437 outstanding, 24 class or family
deficits and 0/7 ready to fit**. SameSite has four examples per training
class from one family per class. Validation has eight change cases
from two families and zero contextual cases. The FieldPoint results
cover the reviewed split-origin deployment. The Yoyo results cover
one native upload route in the tested cookie configurations. Type
checking, 54 focused tests, the Chromium cross-site regression, the
production build and whitespace checks passed. Both dataset versions
reproduced all 14 files byte for byte. Candidate preflight exited 2
with the remaining deficits. No model fitting or holdout evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Framed native write acquisition.** FieldPoint's site
editor and Jingo's wiki editor now have scoped browser profiles. The
FieldPoint profile changes only the target document's framing policy
and uses an offline tile. The Jingo replay checks the exact native
POST success redirect before returning a neutral terminal response.
The adapters require owner-specific SQLite or author-specific Git
readback and separate anonymous non-mutation. Habit Tracker builds its
pinned native client with cosmetic external fonts omitted, then verifies
the framed note form against SQLite. The first client build failed
because a Windows dependency was missing. Its lockfile-verified binding
restored the build. The protected Jingo profile checks the native editor
against own-origin, foreign, repeated and nested parents.

All four signed cases passed admission. Dataset `028` credits
**186/630, 444 outstanding, 24 class or family deficits and 0/7 ready
to fit**. HDR-002 meets the three-family minimum for both classes and
both splits. It has three change and seven contextual training cases,
and three of each in validation. Type checking, 62 focused tests,
the production build, whitespace checks and both Chromium framing
regressions passed. All 14 dataset files reproduced byte for byte.
Candidate preflight exited 2. These cases establish only the tested
response and native operation.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Native script-policy training acquisition.** FieldPoint
and 8star Links now have controlled missing, broad response, broad
meta and restrictive early meta profiles. The adapters compare native
site editor or settings menu behavior with scripts enabled, disabled
and restored, and independently verify a disposable native write.
All eight Chromium captures passed and were admitted. A separate
layered profile paired a permissive response header with a restrictive
early meta policy in FieldPoint, 8star Links, BookWise, Yoyo Collection,
Tabinator and Jingo. All six passed. The browser blocked the unapproved
inline probe, kept the native control working and reproduced the
behavior after script restoration.

Dataset `026` credits **182/630, 448 outstanding, 24 class or family
deficits and 0/7 ready to fit**. HDR-003 now meets the three-family
minimum in both classes and both splits. Training has nine change
and six contextual cases. Validation also has nine change and six
contextual cases. These fixtures establish the measured policy and
interaction behavior on the tested pages. Type checking, 69 focused
tests, the production build and whitespace checks passed. Datasets
`025` and `026` both reproduced all 14 files byte for byte.
Preflight still rejects fitting.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — 8star Links mixed-resource training.** The native
operation adapter measures the settings menu against a matched
stylesheet and independently verifies a disposable folder write. A
cache miss required a pinned Linux dependency install. The first
browser runs failed the independent write check. The corrected runs
kept strict TLS in Chromium and used the original loopback API
listener for the SQLite oracle. Both direct HTTP and pre-transfer
HTTPS-upgrade captures passed and were admitted.

Dataset `024` credits **168/630, 462 outstanding, 24 class or family
deficits and 0/7 ready to fit**. NET-001 now meets the three-family
minimum in both classes and both splits. It has five examples per
class in training and four in validation, below the numerical minima
of 30 and 15. The 8star case tests one native settings menu and a
public folder operation. Type checking, 69 focused tests, the
production build and whitespace checks passed. All 14 dataset files
reproduced byte for byte. Preflight still rejects fitting.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Tabinator mixed-resource validation.** A disposable
Tabinator profile serves the verified native bookmark editor script as
one loopback asset. It retains the existing editor interaction check
and independent native SQLite write and anonymous-denial checks.
Both Chromium profiles passed. The editor operation worked after the
direct HTTP transfer or pre-transfer HTTPS upgrade, failed with the
script withheld and recovered when it was restored. The fixture serves
the original script bytes and omits unrelated external presentation
assets. The interaction measures the native bookmark handler in that
fixture.

Dataset `023` credits **166/630, 464 outstanding, 24 class or family
deficits and 0/7 ready to fit**. The two captures bring NET-001
validation to four cases per class from three families, satisfying its
validation family minimum. Training still has four cases per class
from two families. Both splits need additional examples. Preflight
exited 2, and all 14 dataset files reproduced byte for byte. Type
checking, 69 focused tests, the production build and whitespace
checks passed.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — FieldPoint mixed-resource acquisition.** The pinned
FieldPoint adapter targets native Leaflet JavaScript and stylesheet
dependencies. An offline tile removes the external basemap dependency.
The direct-HTTP fixture listener exposes only the selected asset.
The browser verified that withholding Leaflet JavaScript broke map
initialization and that restoring it recovered the right-click site
editor. Both direct HTTP and the working HTTPS upgrade passed, with
independent native write readback and anonymous-denial checks.

The initial stylesheet replays stopped without complete evidence.
A withheld stylesheet left the browser renderer busy. Bounding the
map viewport let the corrected run verify that tile positioning failed
with Leaflet CSS withheld and recovered when restored. Both correctly
registered stylesheet profiles passed.

Dataset `022` credits **164/630, 466 outstanding, 24 class or family
deficits and 0/7 ready to fit**. NET-001 has four examples per class in
training and three per class in validation, with two families per
class in each split. Type checking, 66 focused tests, the production
build and whitespace checks passed. All 14 dataset files reproduced
byte for byte. Candidate preflight exited 2. Fitting and qualification
remain open.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Native stylesheet dependency evidence.** The bounded
resource collector now supports a matched stylesheet on a pinned
BookWise or Yoyo page. It requires the native control to behave with
the stylesheet present, fail measurably when withheld and recover on
restoration. It binds the DOM finding to the wire transfer without
crediting them as two examples. The first BookWise captures proved
both transports but are excluded from the successor preparation
because the direct-HTTP capture duplicated its target.

All four corrected Chromium captures passed and were admitted, one
direct HTTP and one working HTTPS upgrade in each family. Dataset
`020` credits **160/630, 470 outstanding, 24 class or family deficits,
and 0/7 ready to fit**. NET-001 now has two change and two contextual
examples in training, and three of each in validation. Type checking,
66 focused tests, the Chromium resource regression, production build and
whitespace checks passed. Both dataset versions replayed all 14 files
byte for byte. Candidate preflight exited 2 with 24 class or family
deficits. Additional resource types and independent families, candidate
fitting and fresh qualification remain open.
[Resource evidence](docs/ML_RESOURCE_COMPATIBILITY.md)

**7 November — Protected cross-site SameSite evidence.** The pinned
FieldPoint adapter now verifies cookie necessity and native origin
protection in a controlled split-origin deployment. Chromium exercised
38 declared JSON mutation routes and 19 form-encoded POST variants.
The hostile requests carried the signed session and received the
application's explicit denial without changing SQLite state. The trusted
site creation succeeded with SameSite=None, failed with Lax or no cookie,
and succeeded again after restoration. The bundled client is same-origin.
The measured scope is the pinned loopback fixture and tested API requests.

Dataset `019` credits **156/630, 474 outstanding, 24 class or family
deficits and 0/7 ready to fit**. Its one new credit is the first contextual
SameSite example, in training. Validation still has no contextual SameSite
examples. Additional independent families and relevant scenarios are
required. Candidate preflight rejected fitting. No model fitting or holdout
evaluation ran. Type checking, 56 focused tests, the production build and
whitespace checks passed. All 14 files in each of the previous and new
datasets reproduced byte for byte. The new evidence policy rejects partial
coverage and mismatched witnesses. [Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — Missing HSTS header wire control.** Added a bounded
named-loopback browser probe for a distinct missing-header scenario.
It requires a real plaintext transfer after the application's strict
HTTPS response and a TLS attempt after applying a positive control in
the same browser. The scanner sends no credentials to the control
listeners. The scoped evidence policy preserves the same feature shape
and leaves unrelated findings uncertain. The first browser attempt
failed the wire receipt and supplied no example. The revised probe
let Chromium perform its internal rewrite, with request routing
limited to the two owned listeners. All five native runs then passed
and supplied distinct admitted cases.

Dataset `018` credits **155/630, 475 outstanding, 24 class or family
deficits and 0/7 ready to fit**. The missing-header cases add three
training and two validation change examples. HSTS change coverage is
now 6/30 in training and 5/15 in validation. Contextual coverage is
still 3/30 and 3/15. The result establishes behavior only for the
isolated browser instance and named fixture.

Type checking, 55 focused tests, the production build and whitespace
checks passed. Both the previous and current preparations replayed
all 14 frozen files byte for byte. Cleanup found
no temporary trust profiles or application scratch directories.
No model fitting or holdout evaluation ran. See
[measured datasets](docs/ML_REGISTERED_DATASETS.md).

**7 November — HSTS coverage for authenticated APIs.** FieldPoint,
Habit Tracker and Tabinator now have bounded named TLS profiles for
disabled and valid positive HSTS. The collector checks the actual
authenticated browser response, verifies a native write through
independent storage readback and checks anonymous denial. The HSTS
seed issuer checks the exact response scope and leaves other findings
uncertain. All six signed cases passed admission. FieldPoint and Habit
Tracker add training coverage, and Tabinator adds validation coverage.
Both HSTS classes now meet the three-family requirement in both splits.
Each class has three examples against minima of 30 in training and 15
in validation. Additional materially different policy contexts remain
necessary.

Dataset `017` credits **150/630, 480 outstanding, 24 class or family
deficits and 0/7 ready to fit**. No fitting or holdout evaluation ran.
Fifty-four focused tests, type checking, the production build and
whitespace checks passed. All 14 frozen files replayed byte for byte.
Habit Tracker's initial install tried to compile its locked SQLite
dependency. The retry used the package's bundled Linux binary and
verified it with an in-memory query before collection. Cleanup removed
all disposable application and browser trust profiles. See
[measured datasets](docs/ML_REGISTERED_DATASETS.md).

**7 November — BookWise and Yoyo transport acquisition.** The named strict
TLS collector now supports direct HTTP script dependencies, pre-transfer
HTTPS upgrades and two HSTS directives for these pinned applications.
BookWise verifies the profile-menu interaction and an independent native
category write. Yoyo verifies the native add form and the matching SQLite
row. Both use disposable authentication and separate locked Ubuntu
dependencies. The named browser permits only its paired fixture origins
and, for direct HTTP, one explicitly registered numeric loopback origin.
The tests cover mismatched origins and mixed replay outcomes.

All eight controlled cases passed browser collection, native readback,
signature reload, tamper checks, cleanup and dataset admission. BookWise
adds the first training example in each class for HDR-001 and NET-001.
Yoyo adds the second validation family in each class. The fixed 8/4 split
is preserved. Dataset `016` credits **144/630, 486 outstanding, 24 class
or family deficits and 0/7 ready to fit**. The next transport acquisition
needs additional independent families and materially distinct scenarios.
High-severity resource findings still require review.

Type checking, 53 focused tests, the production build and whitespace
checks passed. Preparations `014` through `016` replayed all 14 files byte
for byte. No temporary trust profiles or app scratch directories remained.
The first attempts timed out or failed browser/SQLite checks and supplied
zero observations. The passing runs use a bounded cold-start allowance,
a bounded SQLite lock wait, verified UI interactions and an explicit
numeric-loopback resolver exception. No fitting or holdout evaluation ran.
[Measured datasets](docs/ML_REGISTERED_DATASETS.md)

**7 November — First eligible contextual NET-001 case.** Pinned Jingo
ran on a disposable Ubuntu loopback wiki. Chromium validated the temporary
certificate and upgraded the original HTTP CodeMirror reference to a
direct HTTPS script request. Withholding that script broke the editor
interaction. Restoring it recovered the interaction, and an actual editor
save created the expected content in a new Git commit. The named listener
observed no plaintext or unexpected TLS handshake. Reload verified the
signed evidence, and altered scans and seals were rejected.

The frozen 8/4 cohort now credits **136/630, 494 outstanding, 24 class or
family deficits and 0/7 ready to fit**. The first contextual mixed-resource
case is in validation. This classic-script finding remains high severity
and eligible only for review under the runtime safeguard. NET-001 still
needs both classes in training and more independent validation families.
No candidate was fitted and no holdout was consumed.

Fifty-six focused tests, type checking and the production build passed.
The certificate tests initially could not start the bundled OpenSSL in
the restricted runner, then passed in the approved local run. Both
cohorts replayed all 14 frozen files byte for byte. The Ubuntu cleanup
check found no remaining browser trust profile. See
[measured datasets](docs/ML_REGISTERED_DATASETS.md) and
[resource evidence](docs/ML_RESOURCE_COMPATIBILITY.md).

**7 November — Verified pre-transfer HTTPS resource-upgrade fixture.**
Ubuntu Chromium 156.0.8078.4 mapped a reserved test name to loopback and
trusted its leaf only in a disposable browser profile. With the CSP upgrade
directive, the original HTTP script reference produced one direct HTTPS
script response, no plaintext request and successful execution. Without the
directive the browser blocked the script. Withholding the HTTPS request
stopped execution and restoring it recovered execution. The localhost
control still fetched and ran over HTTP. Chromium reported a successful
script response, TLS metadata and the exact loopback server address. An
explicit plaintext probe verified the listener's HTTP detection. The initial
multiplexed listener timed out. The replacement fixture passed twice and
the final cleanup check found no remaining trust profile.

This is a mechanism fixture. The admitted dataset remains **135/630,
495 outstanding, with 0/7 remaining categories ready to fit**. NET-001's
contextual class still needs signed native application cases. Next, bind
the upgrade and withholding controls to a pinned editor's real operation,
independent storage readback and existing provenance. Preserve the fixed
split and historical reports. See [resource evidence](docs/ML_RESOURCE_COMPATIBILITY.md).

**7 November — Etherpad signed validation examples.** The new prospective
development cohort credits **135/630 examples, with 495 remaining and
24 class or family deficits**. Secure and HttpOnly each gain their first
contextual validation example. Etherpad takes StockBase's validation slot
before fitting. The rotation preserves eight training and four validation
families and retires two StockBase captures from the new cohort, costing
one contextual framing credit. The previous cohort remains archived.

The signed capture binds a sanitized snapshot from the running editor to
the native preference save, reload, HttpOnly intervention, restoration and
protected-pad authentication controls. It rechecks pinned source after
cleanup. Reload verification passed, and changes to the scan or evidence
invalidated the signature. An altered prospective parent binding was
rejected before writing a replacement cohort. Both preparations reproduced
all 14 frozen files byte for byte. The new preflight processed 140
captures and 443 finding observations. Seventy-seven focused tests, type
checking, the production build and whitespace checks passed.

**0/7 remaining categories are ready to fit or qualified.** Contextual
SameSite and mixed-resource examples remain at zero. The next acquisition
needs native protected cross-site flows, verified HTTPS upgrades and
additional contextual cookie families. No model was fitted and no
holdout was used. See [registered datasets](docs/ML_REGISTERED_DATASETS.md)
and [developer commands](RUN_COMMANDS.md).

**7 November — Etherpad preference prototype verified.** The
pinned preference candidate is now runnable locally. Staging copied 1,167
verified Git blobs, totaling 16,903,864 bytes. Exact re-verification passed
and a modified settings template was rejected. pnpm 12.4.2 installed the
frozen dependency lock with lifecycle scripts disabled. Etherpad's startup
also invokes pnpm for an installed-plugin inventory. The isolated runner
uses the same exact binary in offline mode for that operation.

The disposable native process opened an ephemeral loopback listener. The same
pad returned 401 for an anonymous request and HTML for a synthetic account.
The runner restricted outbound Node sockets to loopback and removed the
temporary settings and database. Chromium saved the native line-number
preference and reproduced it in a fresh context. With the same cookie set to
HttpOnly, the exact preference-read error prevented editor initialization.
Restoring access restored the saved setting. The preference cookie alone
still returned 401. Earlier attempts exposed startup-tool and asynchronous
editor readiness issues. The final run passed all four browser controls and
saved a metadata-only receipt after cleanup.

Etherpad's executed revision and reviewed code digests now appear in the
mandatory native development exposure inventory. Reusing the revision or
renaming the same preference implementation fails fresh-holdout screening.
Thirty-three focused tests, type checking, production build, source
re-verification and whitespace checks passed.

The credited cohort remains **134/630, with 496 examples and 24 class or
family deficits outstanding**. Etherpad remains outside the fixed 8/4
development cohort. Its next step is prospectively registered, signed
preference collection with a fixed family role and independent provenance.
Candidate fitting, fresh holdout and category release remain gated.
[Acquisition constraints](docs/ML_DATA_ACQUISITION_CAPACITY.md)
and [developer commands](RUN_COMMANDS.md).

**7 November — Tabinator bookmark editor acquisition complete.** The five
registered Chromium scenarios add five eligible development examples and move
ML-Q to **134/630, with 496 remaining**. Script-policy validation now has nine
change and three contextual cases, each across three families. Framing has two
validation change cases across two families. The fixed twelve-family split
remains in place and **0/7 categories are ready for fitting**.

The script scenarios use the native editor with missing, restrictive early
meta, broad response and broad early meta policies. Normal and restored
editor interaction worked, and disabling JavaScript stopped it. The scoped
framing case submitted three real bookmark writes under one same-origin and
two foreign-origin parents. SQLite verified owner, name and URL after each
write, and the anonymous check left storage unchanged. The first attempt
exceeded the functional replay limit on Tabinator's 3.8 MB logo. The rerun
uses a small local icon in the disposable copy and retains the replay limit.

`.local/ml-q-material-datasets-011` has 141 signed runs, 441 observations,
195 retained rows and 45 uncertain rows. All 14 preparation files reproduced
byte for byte. The five new reports passed reload, tamper and cookie-value
exclusion checks. Preflight reports 24 outstanding class or family deficits,
with zero predictions or holdout consumption. The restrictive editor policy
and framed write passed separate Edge runs. The existing Chromium API profile,
49 focused tests, type checking, production build and whitespace checks passed.

Etherpad `v3.3.15` was pinned and screened in a read-only clone. The recorded
license, lock and selected source hashes match the pinned Git objects. Source
review found a native browser preference path and a configurable cookie
prefix, with a separate author-token mechanism. The screened source has no
partition assignment or eligible examples. Next acquisition requires a local
adapter and independent preference and protected-access controls. Broader
header contexts and verified resource upgrades also remain open.
[Current counts](docs/ML_REGISTERED_DATASETS.md) and
[source provenance](ml/applications/native/etherpad.source.json).

**7 November — Wikiflow, Jingo and BookWise cookie collection complete.**
Twenty new signed browser runs increased the cohort from 110 to **129/630
eligible development examples**. **501 remain**, across 24 class or family
deficits. The fixed twelve-family split remains intact.

- **Secure and HttpOnly.** The Wikiflow matrix closed both training change
  requirements. Secure has 32 and HttpOnly has 34 training change contexts,
  each across four families. Each category gained six credits before its
  30-example cap. The disposable Wikiflow profile uses a controlled session
  name and independently verifies the app's signature, session-to-account
  binding, CSRF controls and SQLite writes.
- **SameSite.** Repeated cross-site form submissions and Git readbacks added
  four Jingo validation contexts. Equivalent controls with independent SQLite
  readbacks added three distinct BookWise training contexts. The anonymous
  controls left state unchanged. The exercised operations yielded change
  examples. Necessary protected cross-site use remains unverified.

`.local/ml-q-material-datasets-010` contains 136 signed runs, 426 observations,
189 retained rows and 44 uncertain rows. All 14 prepared files reproduced byte
for byte. The 20 new captures passed reload, tamper rejection and cookie-value
exclusion checks. All registered Chromium runs passed, and separate Wikiflow
and Jingo repeats passed in Edge. Forty-nine focused tests, type checking and
the production build passed. Candidate preflight remains blocked at **0/7
categories ready**, with zero predictions or holdout consumption. Candidate
registration rejected the incomplete cohort and created no output.

Next work requires contextual cookie flows from additional independent
applications, broader header cases, and verified functional resource upgrades.
The current two admitted HSTS cases would supply at most 24 of 90 HSTS credits
even across all twelve families. Additional materially distinct, independently
verified HSTS mechanisms are needed. [Current counts](docs/ML_REGISTERED_DATASETS.md)
and [acquisition constraints](docs/ML_DATA_ACQUISITION_CAPACITY.md).

**7 November — Jingo completes two validation requirements.** Secure and
HttpOnly change cases now each have **19 contexts across three validation
families**. Both cells meet the requirement of 15 contexts and three families.
The development preflight drops from 28 to **26 remaining class or family
deficits**. The credited total remains **110/630**, with **520 still needed**,
because both validation classes already reached the numeric credit cap.

Four prospectively registered Chromium profiles verified Jingo's issued
session and signature in memory, protected editor access after cookie removal
and restoration, and editor compatibility with HttpOnly. The authenticated
wiki update produced the expected committed page and synthetic author. The
anonymous request redirected to login and left Git unchanged. The repeat
in Edge and the existing Chromium early-meta script profile passed. All
four registered reports passed reload, alteration
rejection and cookie-value exclusion checks. The same 12 source roles remain.
The new preparation `.local/ml-q-material-datasets-008` has 116 signed runs,
348 observations and 158 retained rows, including 40 uncertain rows. All 14
prepared files reproduced byte for byte. Forty-four focused tests, type
checking and the production build passed.

The remaining cookie training change cells each need six more contexts.
Each contextual training cell has two examples from HomeInventory, and both
contextual validation cells remain empty. A bounded audit of the pinned sources
found no second verified browser-cookie preference flow. The next acquisition
requires source-suitable independent apps and matching behavior controls.
The other five categories' eligible counts are unchanged. Zero of the seven
categories is ready for fitting and no holdout was consumed.
[Measured dataset](docs/ML_REGISTERED_DATASETS.md)

**7 November — native session-cookie matrix acquired and frozen.** The cohort
now credits **110/630 eligible development examples**, up from 47. **520 remain**
and **0/7 categories are ready for fitting**. Chromium executed 12 registered
profiles in each of BookWise, FieldPoint, Habit Tracker, Yoyo Collection and
Tabinator. Each capture checked the real issued session's Secure, HttpOnly,
SameSite and persistence attributes, the authenticated operation, anonymous
denial and storage readback. Fifty-eight scenarios passed on the first complete
batch. The BookWise startup and Habit Tracker source-inspection failures passed
on individual retry. Two signed captures from the earlier stalled batch were
also preserved. The Node 20 wrappers now release their process channel after
the Node 24 collector exits.

`.local/ml-q-material-datasets-007` preserves the 12 existing family roles
and contains 112 authenticated runs, 328 observations, 151 retained rows and
39 uncertain rows. All 14 prepared files reproduced byte for byte. The 60 new
matrix reports passed the cookie-value exclusion check and all matrix scratch
app directories were cleaned up. Type checking, production builds, 72 Python
tests and 74 of 75 focused TypeScript tests passed on the first run. The
release-staging test that timed out during collection passed on its own rerun.
Preflight recorded 28 remaining class or family deficits and zero predictions.
Candidate registration refused the incomplete cohort and created no files.

Secure and HttpOnly each now have 24 change examples across three training
families and 16 across two validation families. Each validation change cell
meets the numerical minimum and still needs a third family. Contextual cookie
coverage, verified cross-site protections and functional HTTPS upgrades are
still missing across the required families, along with broader header coverage.
Candidate fitting, fresh holdout evaluation and qualified runtime acceptance
remain open. [Counts by category](docs/ML_REGISTERED_DATASETS.md)

**7 November — Yoyo Collection validation acquisition complete.** The existing
validation family supplied five eligible editor cases. Chromium exercised an
authenticated native form write from same-origin and repeated foreign-origin
parents, plus missing, permissive response, permissive early meta and restrictive
early meta script policies. Native writes were read back from disposable SQLite.
The anonymous request was denied with no row created. Script policy labels also
require browser execution and native editor controls. Edge passed separate
framed-write and restrictive-policy repeats after the capture manifest froze.

**47/630 eligible, 583 still required.** `.local/ml-q-material-datasets-006`
extends the frozen baseline through `.local/native-material-registration-07`
and prospective `.local/native-dev-registration-07`. All 45 baseline captures
and twelve roles were preserved. Five new captures raised the total to 50 runs,
148 observations, 86 retained rows and 62 removed repeats. Of the retained rows,
39 remain uncertain. Validation gained its first framing change case. Script
policy validation now has six change cases and two contextual cases from two
families. All seven categories still fall below fitting requirements.

Supplemental adapter identities are bound to the same upstream family and
partition. Strict preparation and material holdout require their original
adapter binding. The actual preparation reproduced byte for byte and rejected
duplicate adoption and an edited readiness flag. Candidate registration refused
the incomplete cohort before creating an output. The five signed captures
passed reload and tamper checks, and their reports contain no cookie values.
Seventy focused TypeScript tests across seven files, 72 Python tests, type
checking and production builds passed. No candidate was fitted or evaluated.
Remaining work includes broader per-class family coverage, verified necessary
cross-site flows and resource upgrades, training, fresh holdout evaluation and
qualified runtime acceptance. [Current counts](docs/ML_REGISTERED_DATASETS.md)

**7 November — signed native preference acquisition and cohort preparation
completed.** Opt-in assessment v9 now accepts the exercised HomeInventory
cookie-driven localization scope. Seven counterfactual controls bind source,
scan, adapter and inspection to matching cookie facts. Native signed-session,
owner readback, anonymous denial, JS restriction/restoration and competing
storage controls passed in Chromium and Edge under prospective registration
`.local/native-preference-registration-07`. A further Chromium repetition passed
after the dataset manifest was frozen and supplies compatibility evidence only.
Signed evidence survived reload; altered scans/evidence were rejected.

**42/630 eligible, 588 still required.** New snapshot
`.local/ml-q-material-datasets-005` adopts 43 authenticated prior runs and two
new preference runs under `.local/native-material-registration-06`. HomeInventory
replaces unsupported Anonymous Notepad in its training slot; the other eleven
identities/roles, including all four validation families, stay fixed. The two
excluded captures and their reasons remain recorded. Forty-five runs produced
133 observations, 80 retained rows and 53 removed material repeats; 38 rows stay
uncertain. Secure and HttpOnly each gained two contextual target variants in
**one** family, covering the native Lax/Strict writers. Original high severity
still keeps Secure findings visible. These are four contexts, not four families.
The independent candidate preflight still reports **0/7 training-ready** and no
model fitting or holdout predictions. [Current counts](docs/ML_REGISTERED_DATASETS.md)

**Collector correction and limits.** The app's native consent redirect and two
cookie writers are explicitly supported. Rejected path/metadata/timing attempts
remain failure records and contributed no accepted examples. An optional,
bounded native-readiness hook runs before the shared snapshot; real Chromium
tests verify settled metadata, absence of retained values and failure/cleanup
when readiness is missing. The existing project-browser acceptance passed.
Final validation passed **133 relevant TypeScript tests across twelve files**,
all **72 Python ML tests**, type checking and production builds. Actual
copied-data checks preserved the archived 18/38 counts and current 42 count,
rejected forged readiness and refused candidate registration. All eleven kept
source roles were verified, and the saved scans contain no cookie values.
No new
certificate trust, rule, released model, GitHub policy or archived report bytes
were changed. Signed development preparation does not establish ML quality.

**Next qualification work.** Collect the remaining category/class coverage and
at least three contributing families per class/partition, including native
protected necessary cross-site flows, functioning pre-transfer upgrades and
richer verified effective-policy contexts. Fit only after the 630-case gate;
then freeze a new candidate and fresh-family holdout. Material-protocol
holdout/family-clustered intervals, ambiguous-input runtime abstention and
qualified Worker/API/export acceptance remain open. **ML-Q is not closed;
JS-002 remains the only qualified category.**

**Approved counting correction implemented for development preparation.** The user's 6 November approval is recorded in [the protocol](docs/ML_COUNTING_CORRECTION_PROPOSAL.md). New registration `.local/native-material-registration-02` freezes category-specific target projections and authenticates adoption of all 45 original captures. Preparation rechecks source roles, acquisition receipts, signatures, original scan/evidence bindings, labels and capture hashes. Independently supported families may share numeric inputs. Within-family material repeats, identifiers and unrelated background cannot increase credit. Unknown rows receive no fitting weight; supported conflicts abstain. LSTM/logistic fitting, checkpoint selection and validation calibration use equal-family weights within category/class. All original family, 630-example, accuracy and safety gates remain.

**Measured recount: 18 → 38 eligible examples.** `.local/ml-q-material-datasets-002` contains 78 retained rows from 129 observations; 51 repeated material contexts were removed and 40 rows remain uncertain. Eleven train/validation numeric overlaps are retained and audited. All seven datasets remain below fitting requirements, with **592 additional eligible development cases required**, plus the minimum contributing families in every cell. A direct archived preflight still credits the strict corpus at 18. No new category model was fitted, holdout consumed or release enabled. [Category counts and exact remaining work](docs/ML_REGISTERED_DATASETS.md)

**Validation.** All 72 relevant TypeScript tests across seven files and all 72 Python ML tests passed, including executed Python/JavaScript projection parity, authenticated v2 preparation, conflicts, family weighting/calibration, strict holdout/release refusal and archived frozen reports. Type checking and the production build passed. On copied actual data, changed labels, claimed readiness, changed policy and altered registration were rejected; candidate registration refused to create a candidate. Two concurrent preflights completed after fixing shared temporary-feature-file races. Final checks found no disposable preference-run or candidate-command directory remaining. Old artifacts remain intact. Existing Zod/Ed25519 and synthetic scaler warnings remain. The new family-clustered holdout protocol, runtime abstention for ambiguous material contexts and qualified activation/export acceptance still need implementation before promotion. The existing strict holdout path rejects the new preparation format rather than silently applying its older protocol.

**Native preference continuation.** The pinned MIT HomeInventory source passed verification of all 719 tracked files (53,426,165 bytes). Locked frontend and backend dependencies were installed in ignored staging. A verified isolated Node 24.11.1 runtime and the existing Microsoft compiler built its SQLite dependency with `--clang=0`; the initial Node 24 builds failed because ClangCL was unavailable. The application runs with disposable SQLite, synthetic credentials, fresh encryption keys, loopback listeners and a temporary browser profile.

**Measured controls.** Seven native readable-cookie trials passed in Chromium and Edge. The native language control changed German to French. Removing the preference preserved authentication, restricting JavaScript access changed the preference outcome, restoration recovered German, local storage took precedence when supplied, and removing authentication denied access while preserving localization. A declared misleading-name profile also passed all seven controls and reproduced CK-001/CK-002 through the shared scanner. Readiness failures and the native server's HttpOnly-cookie conflict remain recorded. The observed absent-cookie fallback was Turkish, so the probe records native fallback behavior instead of manufacturing English defaults. Final Chromium and Edge repetitions also passed collector/overlay identity and authentication-attribute guards. These remain prototype controls and contribute no training credit. The approved recount above credits 38 existing cases; zero of the seven categories is training-ready or newly qualified. Signed evidence/seed integration and a prospectively registered suitable cohort are still required before preference observations can count. [Protocol and exact scope](docs/ML_NATIVE_PREFERENCE_PLAN.md)

**6 November — authenticated framing and acquisition feasibility.** Added a native BookWise framing-write profile. It checks a same-origin frame and two separately loaded foreign-origin frames, performs the actual category form operation, and verifies the expected owner-specific SQLite row each time. A prior native operation independently checks anonymous denial and session ownership. The exploratory run passed. The new v8 scope and issued browser receipt keep incomplete, escaped or forged measurements in review. Registration `native-dev-registration-05` starts a new cohort. The completed 45-run, 12-family preparation retained 107 of 129 observations and removed 22 repeats. Candidate preflight credits **18/630 cases, leaving 612**. HDR-002 now has one change-warranted training example. Other eligible category counts held steady. The new profile passed in Chromium and Edge. Browser tests rejected escaped post-action traffic and copied or tampered receipts. Validation passed 59 focused tests, final incomplete-evidence guards, type checking and the production build. A BookWise login failure passed on retry. All seven categories remain below fitting minimums. Results are in `.local/ml-q-seven-datasets-004`.

**Capacity correction.** The remaining 613 are a minimum data requirement, not examples that the implemented collectors can generate by increasing batch size. The current nine change and three contextual mechanisms have an optimistic ceiling of 144 credits across the fixed 8/4 split before deduplication. Native cookie preferences, protected necessary cross-site flows and verified resource upgrades still lack contextual oracles. [Acquisition capacity and required new evidence](docs/ML_DATA_ACQUISITION_CAPACITY.md)

**6 November — permissive script policies.** Registered a new 8/4 acquisition (`.local/native-dev-registration-04`) with two additional HDR-003 mechanisms on the BookWise and Jingo editors. One case delivers an enforcing response header permitting inline scripts. The other places a permissive policy in the document head before scripts. The opt-in v7 evidence policy requires an executed inline probe, repeated native functionality and signed same-run facts. The 12-family rerun accepted 44 scans. Preparation retained 105 of 126 observations and preflight credited all four new cases. **17/630 eligible, 613 remaining, 0/7 ready for fitting.** Two separate BookWise Edge checks passed. Validation passed 58 focused tests, type checking and the production build. Next collection needs independent contextual mechanisms and additional contributing families in each partition. No model was fitted or holdout consumed.

**6 November — BookWise category-editor acquisition.** Added two HDR-003 development profiles to the pinned BookWise application. Chromium exercised the native category editor with JavaScript enabled, disabled and restored. The functional controls, inline execution probe, signed source evidence, owned SQLite row and anonymous-write denial passed in both exploratory runs. A separate prospective registration (`.local/native-dev-registration-03`) retains the eight/four family assignments. Only captures made under that registration can enter its preparation. Qualification and fitting still require the existing count, independence and quality gates.

**Result.** The new cohort finished 40 accepted runs across 12 families. The seven rebuilt files in `.local/ml-q-seven-datasets-002/` contain 112 observations, 97 retained rows and 15 repeats removed. Candidate preflight credits **13 distinct cases**, up from 11. HDR-003 now has one change-warranted and one contextual example in training (BookWise) and one of each in validation (Jingo). The other six category counts held steady. All seven still fall short of fitting. Both new scenarios also passed separately in Edge. An initial Windows Jingo login failed and the three HTTP profiles passed on retry. The three strict HTTPS profiles passed in isolated Linux Chromium. Type checking, production build, 48 focused TypeScript tests and 66 Python ML tests passed.

**Next collection.** Register materially distinct application behaviours with independently checked causes in both partitions. The current script-policy cause key gives each family at most one example of each class, so repeating these two profiles cannot reach the required 30/15 per class. Authenticated framing and verified cookie-purpose controls are also missing. See the [category table and acquisition limits](docs/ML_REGISTERED_DATASETS.md). Candidate fitting, an untouched qualification holdout and release acceptance remain open.

**6 November — registered seven-category acquisition.** The first prospective source lock with eight training and four validation families passed the repository, revision, licence, inspection, historical family/input and split checks. The registration incorporates the published JS-002 holdout's unfiltered exposure. Acquisition receipts bind new scans to this registration. The first diagnostic registration was superseded before collecting its corpus. Earlier seed batches are preserved outside the new split.

BookWise's controlled SameSite=None/Secure session demonstrated a cross-site category write twice on distinct loopback sites. Each write returned 201 and created the expected owner's row. The anonymous control redirected and left storage unchanged. Three other native session profiles supplied uncertain examples. Windows rejected the strict TLS test connection and the exact temporary leaf was removed. An isolated Linux Chromium profile produced Jingo HSTS disabled/positive records and a direct HTTP editor dependency proven by transfer, withholding, functional recovery and Git readback.

**Measured preparation.** `.local/ml-q-seven-datasets-001/` has **7/7 populated datasets, 38 accepted runs, 12 families, 106 observations, 93 retained rows, 13 repeats discarded**. Seventeen overlapping numeric variants are excluded from both sides of candidate fitting. Preflight credits 11 separate material cases. **0/7 training-ready, 0/7 newly qualified**. The LSTM/logistic fit and fresh holdout stay gated. Current example deficits, licence/provenance scope and per-category counts are in [the registered dataset report](docs/ML_REGISTERED_DATASETS.md). Developer commands are in [RUN_COMMANDS.md](RUN_COMMANDS.md).

Validation included the executed browser runs, 59 focused TypeScript tests, type checking and production builds. Strict Windows attempts and the initial Linux cold-start attempts are retained as failures. The native/Linux HSTS and HTTP-dependency results apply to the exercised Jingo response/editor. Next acquisition needs positive framing, protected legitimate cross-site flows, verified native cookie preferences and working pre-transfer upgrades in independently supported applications, in both partitions. Additional observations must pass the existing uniqueness, family and class gates before fitting. JS-002 remains the single qualified category.

The full Python ML suite passed **66 tests**. On the actual prepared corpus, candidate preflight returned exit 2 with 28 class/partition deficits, candidate registration refused to create a candidate, and altering a copied audit to claim readiness failed its installation receipt. Final checks found no Windows native run directories and zero copies of the temporary leaf in CurrentUser Root. The production build and whitespace check passed.

**2026-11-05 twelve-family acquisition completed:** Portal, Personal Knowledge Manager, StockBase, 8star Links, Anonymous Notepad and Habit Tracker now have executed collectors, expanding retained acquisition **6 → 12 native application families**. All use exact pinned source, verified MIT licences, locked dependencies, disposable SQLite data and native operations with independent SQLite readback. The user explicitly approved installing and running all six. No new application authentication/session wrapper supplies fabricated independence or cookie labels. Public/header/document-password operations use separate bounded controls; Habit Tracker uses its native signed SQLite owner session and note creation. This completes the requested collection-family expansion, not the eligible Stage C training corpus.

The new immutable aggregate `.local/project-native-seeds-009/` has **52 accepted batches, 12 families and 67 removed repeated inputs**. The prior `008` intermediate and earlier aggregates remain unchanged. HDR-002 has ten complete contextual scenario groups/five unique numeric variants and fourteen unknown inputs; HDR-003 has one change and one contextual scenario/variant with twenty-eight unknowns. CK-001 has five change scenario groups/six unique variants plus one unknown; CK-002 has five change scenarios/two variants. HDR-001, CK-003 and NET-001 still have no retained native seed examples. All seven files exist but **0/7 are training-ready**. The actual candidate preflight refuses fitting with unchanged registered 8-training/4-validation, distinct class-count and family-coverage requirements. No new model, calibration, holdout consumption, category release or accuracy claim occurred; **1/8 categories remain qualified**.

Source selection: the original screening lock remains unchanged; `expansion-next.candidates.json` records two newly pinned sources and exclusions before prediction. HomeInventory's 719 files exceed the unchanged 600-file copy limit; the Electron source and a newly screened template are excluded. Known-source manifests now require all twelve development exposures; removing/renaming them cannot make future qualification sources fresh. Exact implementation hashes were checked for overlap with the prior two public source locks and each other; this is not a general independence certificate or the required full historical numeric-exposure/split audit.

Validation: all thirteen new Chromium native/framing/readable runs and six Edge framing runs completed with privacy, same-run signatures, reload, tampering rejection and cleanup. Five new framing adapters produced verified controls in each browser. Anonymous Notepad remains **Needs review** in the framing profile because its native external assets and POSTs exceed the GET-only framing scope; it is not a passed protection assessment. Its native editor/write and password-denial checks passed. All six explicit cancellations and all six actual source-tampering-before-startup checks passed; original bytes were restored. **109 relevant tests/seven files passed**, type checking and production builds passed. Existing Node Ed25519/Zod warnings and third-party dependency warnings remain. Initial Personal Knowledge Manager ABI and header-auth framing failures were resolved with the compatible Node 20 child runtime and transient target-only headers; no upstream dependency versions or source logic were rewritten. Other new apps/collectors use Node 24. Headers are bounded/allowlisted and never retained or sent to synthetic ancestor origins. Broad UI/PDF/performance and hosted migration-006 acceptance were not rerun.

Remaining: obtain materially distinct positive/contextual native cases and missing HTTPS/HSTS, cross-site and upgrade/dependency evidence; audit historical input overlap, source suitability/independence and freeze eligible 8/4 assignments; then fit/calibrate, evaluate untouched families and accept qualified runtime/exports. Twelve collected families alone cannot close these gates. See `docs/ML_NATIVE_TWELVE_FAMILIES.md`, the updated ML-Q/data/cohort documentation and `RUN_COMMANDS.md`. No certificate trust, deployment, Docker or GitHub policy changes were made.

Final checks: the executed overlap audit found no exact implementation/repository reuse among the twelve native sources or the 22 applications in the two historical public source locks. Command-help and whitespace checks passed. A restricted CIM query was unavailable; the subsequent successful read-only process inspection confirmed **zero owned native processes and zero temporary native run directories**. Source cancellation/tamper tests left no running project. These checks do not establish production compatibility or full numeric-exposure eligibility.

**2026-11-05 BookWise/Wikiflow acquisition completed:** two further pinned applications now have executed native collectors, increasing retained acquisition from **four to six families**. BookWise uses its native Sequelize models to seed a disposable verified user, then native login, signed-session validation, independent SQLite user/category ownership and protected-write/anonymous-denial controls. Wikiflow uses its native signed two-cookie session, SQLite user/term ownership and valid-anonymous-CSRF authentication-denial checks; missing and wrong CSRF tokens are separately rejected without mutation. These are bounded native operations, not whole-site protection or real cross-site qualification.

All three profiles (native, readable-cookie, own-origin framing) passed in Chromium for both applications; both framing profiles passed in Edge. Both startup cancellation and actual altered-source-before-startup rejection checks passed, with original source bytes restored. Existing FieldPoint acquisition also passed. Metadata records collector Node 24.22.1 and, in current Edge results, BookWise Node 24.22.1 / Wikiflow Node 20.18.0. Exact native code remains pinned; upstream vendored dependencies/cache trees are excluded from application copying and replaced by the pinned npm lock installation. Old native dependency deprecation warnings remain; they are isolated developer fixtures, not shipped application dependencies. The user explicitly approved both dependency installations/native runs.

The seed mapper now validates multiple cookie controls by unique name/attributes, with separate authentication/access outcomes; names stay outside numeric inputs. Missing purpose stays uncertain. Original single-cookie receipts remain valid. **Wikiflow's `wf_sess` names do not trigger the existing cookie-name heuristic**: no cookie findings or labels are fabricated and no names/rules were changed to improve counts. It contributes framing data and uncertain script-policy data. Its scoped CSRF checks do not populate a CK-003 qualification dataset. Both new source manifests are mandatory in future exposure checks; deletion/renaming cannot make the known sources fresh again.

Actual new immutable aggregate `.local/project-native-seeds-007/`: **33 completed batches, six families, 54 repeated inputs discarded**. HDR-002 has five complete contextual scenario groups/three unique numeric variants and seven uncertain inputs. HDR-003 retains one change and one contextual scenario/variant with sixteen uncertain inputs. CK-001 has four change scenarios/six unique variants plus one unknown; CK-002 has four change scenarios/two unique variants. HDR-001, CK-003 and NET-001 remain empty. More family instances did not manufacture new numeric cookie variants. **0/7 datasets are training-ready**, and actual candidate preflight refuses fitting with the original cohort/class-count deficits. No candidate training, holdout consumption or category release occurred; **ML-Q remains open, 1/8 categories qualified**.

Validation: **87 relevant tests/seven files passed**, covering multi-cookie matching/unknowns/privacy, family/commit binding, missing native exposures, once-only holdout mechanics with synthetic fixtures, source inspection, archived frozen reports and existing framing/script evidence. Type checking, production builds and whitespace checks passed. Initial failures (anonymous landing-page external assets and upstream tracked dependency symlinks) were resolved without relaxing collection limits, changing rule verdicts or rewriting native authentication. Native tests retain failures separately; only completed privacy/signature/reload/cleanup runs contribute seeds. Final process/directory checks found no owned native application left running. No certificate trust changes occurred in this increment. Broad UI/PDF/performance and hosted migration-006 checks were not rerun.

Remaining: additional suitable independent families (five screened candidates remain unexecuted; the excluded Electron source cannot fill the target), native contextual cookie/JavaScript-use cases, sufficient script/framing classes, reliable native HTTPS/HSTS and actual resource-upgrade/dependency evidence, cross-site coverage and adequate materially distinct examples. Then register eligible 8/4 preparation, fit/calibrate, evaluate genuinely untouched families and accept qualified runtime/exports. Updated `docs/ML_NATIVE_BOOKWISE_WIKIFLOW.md`, native/cohort/ML-Q docs and `RUN_COMMANDS.md` with actual results and commands. This closes these two family collectors, not Stage C or ML-Q.

**2026-11-05 native dataset expansion completed for two additional applications:** pinned FieldPoint and Yoyo Collection now contribute actual native observations, expanding retained acquisition from **two to four families**. Native session implementations remain unchanged: FieldPoint's signed SQLite session-to-user link and Yoyo's signed expiring owner token are checked separately, followed by native protected writes, independent SQLite readback and anonymous non-mutation. Native/readable-cookie/own-origin-framing response profiles are explicitly identified; repeated profiles/browsers remain the same family. Source inspection now recognises bounded exported ESM Express factories and monolithic files up to 256 KiB (4 MiB total), retaining partial coverage. No application-purpose claim comes from syntax counts. Native source signatures/receipts, privacy, reload and tampering guards remain active.

Actual aggregate `.local/project-native-seeds-006/`: **24 completed batches, four families, 48 repeated inputs discarded**. HDR-002 has three complete contextual scenario groups/two numeric variants and five uncertain inputs. HDR-003 retains one change and one contextual scenario/variant with ten uncertain inputs. CK-001 has three native change scenarios/six numeric variants plus one unknown; CK-002 has three change scenarios/two numeric variants. HDR-001, CK-003 and NET-001 still have no retained native seed observations. Seven category files were regenerated, but **0/7 are training-ready**. The actual candidate preflight refuses fitting and reports the missing eligible 8/4 cohort and 30/15 per-class distinct examples. No candidate was trained or holdout consumed; **ML-Q remains open, 1/8 categories qualified**.

Source screening: ten additional repositories were pinned before prediction and actual MIT licence text/hash checked. Two are executed adapters, seven remain unexecuted suitability candidates, and `inventory_management` is excluded because its pinned code is an Electron desktop application. The twelve inspected/pinned repositories therefore do not establish twelve eligible data families. Source manifests/exposure checks prevent FieldPoint/Yoyo reuse as fresh qualification sources. The original family key and old aggregates remain unchanged. See `docs/ML_NATIVE_EXPANSION.md` and `ml/applications/native/expansion.audit.json`.

Validation: **75 focused TypeScript tests/seven files passed** (69 passed initially; loopback API and OpenSSL restrictions required rerunning the remaining two files outside those restrictions, where all 13 passed). Type checking and production builds passed; existing Ed25519 and Zod/Rollup warnings remain. All six native Chromium profiles, both Edge framing profiles, both explicit startup cancellations, private artifact reload/tampering and cleanup passed. Initial native source-inspection failures were corrected before accepted records were written. Failure metadata remains separate from accepted data. Automatic approval review initially rejected third-party execution; after the user's explicit approval for these two applications, runs proceeded with disposable databases, synthetic identities, restricted environments and loopback listeners. This is process isolation, not an OS sandbox.

HTTPS: the user approved a fresh two-day localhost-only non-CA leaf. Strict Chromium mechanism checks passed missing/positive/disabled HSTS profiles, while actual resource upgrade/execution failed (partial result, not acceptance). Native Tabinator HTTPS attempts still failed browser certificate validation and contributed no accepted data. The exact temporary trust entry was removed after each attempt; a fresh store read confirmed **zero remaining entries**, and process/directory inspection found no owned native runs left. No CA, certificate bypass, new category release or service deployment was introduced.

Remaining dataset work: native contextual cookie/JavaScript-necessity and cross-site protection cases, reliable native strict HTTPS/HSTS and verified upgrade/functionality evidence, additional eligible independent families and sufficient materially distinct class examples, then registered preparation/fitting and untouched holdout qualification. Complete Worker/API/report activation, broader performance/UI/PDF and hosted migration-006 acceptance remain separate. This increment expands measured data; it does **not** complete the requested seven training datasets. Qualification targets and raw detection/GitHub policy remain unchanged.

Final expansion checks: altered FieldPoint source was rejected before startup/run-directory creation and original bytes were restored. The seed assembler's actual-command tests (15 tests) passed after adding four-family collection orchestration. Both new source exposure records are now mandatory, so removing one cannot make it eligible for a new holdout registration. **All nine holdout-command tests passed**, including missing-record, changed-registry, once-only/failed-evaluation and release mechanics with disposable synthetic test fixtures; these are not real model evaluations. Combined validation is **84 tests/eight files passed**. Source-exposure tests (11) and final type checking also passed. Individual native profiles were executed as recorded; the full `--collect` orchestration was not rerun in one invocation. No frozen JS-002 release or historical evaluation was changed. New source setup/profile/aggregation commands and exact remaining counts are documented separately in `RUN_COMMANDS.md`.

**2026-11-05 native Jingo script-data increment completed and executed:** the pinned second native family now supplies missing-policy, restrictive early-meta and late-meta HDR-003 development profiles. Native editor interaction, JavaScript removal/restoration, repeated inline execution/blocking and independent saved-file/Git-commit readback establish scoped labels. A disposable exact-blob copy uses pinned dependencies; only controlled meta-policy insertion and cosmetic offline font fulfilment change responses. Authentication, native scripts, storage and redirects remain intact. Opt-in assessment v5 permits the exercised scope despite partial source inventory; v1-v4/default producer behavior stays unchanged. Unknown timing, truncated present policies, missing witnesses and high/critical contextual proposals retain review.

Actual data: ignored `.local/project-native-seeds-005/` combines **16 completed batches, two native families, 42 repeated inputs discarded**. HDR-003 now has **one complete change scenario and one complete contextual scenario** (one numeric variant each), plus six uncertain inputs. HDR-002 retains one contextual scenario and three uncertain observations. CK-001 retains one change scenario/three numeric variants plus one unknown native observation; CK-002 retains one change scenario/variant. HDR-001, CK-003 and NET-001 remain empty. Jingo profiles and Chromium/Edge repetitions are one family, not separate training applications. Authenticated seed v2 binds native controls to source/scan/adapter/witness identities; old receipts remain valid. The new script metadata digest is provenance, never an identity feature or source code.

Validation: **50 TypeScript tests/seven files passed**, covering native profile/pinned-byte guards, class and uncertainty controls, signature/oracle tampering, deduplication, archived policies, high-severity safeguards and frozen report reload/unchanged analysis. The Python seed-audit command regression passed (v1/v2 preflight and refusal to register/fit). Type checking and production builds passed. All three real native profiles passed in **Chromium and Edge**, including privacy, signature/reload, altered-scan/evidence rejection and cleanup. Explicit cancellation after native startup passed; final process/directory inspection found no disposable native run remaining. The actual combined-data preflight reports seven deficits and no fitting/prediction. Existing Node 20 Ed25519 and Zod/Rollup warnings remain.

Initial execution failures were resolved without changing detection rules or quality gates: Windows CRLF bytes now require exact pinned Git-blob confirmation; copied app resolution now uses its own dependencies; inspection uses the same verified Git mirror; absent response CSP is distinguished from incomplete present CSP; native redirect responses bypass HTML intervention. Subsequent failed/cancelled profile runs have separate metadata-only failure records and cannot become accepted seed batches. The full repository suite, broad UI/PDF/performance, hosted migration-006 verification and TLS trust were not rerun or changed. Frozen JS-002 model/evaluator files and raw detection/GitHub policy have no diff.

**ML-Q remains open: 1/8 categories qualified, 0/7 new datasets training-ready, and no seven-category candidate fitted.** Next work remains strict repeatable HTTPS/HSTS and upgrade/functionality evidence, native contextual cookie/cross-site cases, an eligible independent twelve-family 8/4 development cohort with sufficient distinct classes, real fitting, fresh holdout gates and qualified runtime/export/hosted/performance acceptance. This increment closes native HDR-003 seed acquisition for one tested editor flow, not Stage C or ML-Q. Updated `docs/ML_NATIVE_JINGO_SCRIPTS.md`, dataset/qualification/cohort/meta-policy/ML-Q documents and `RUN_COMMANDS.md` with actual commands and boundaries.

**2026-11-05 native contextual framing acquisition completed and executed:** the pinned Tabinator native authentication response now passes healthy own-origin embedding and enforced forbidden/repeated/nested ancestor controls in Chromium and Edge. An explicit proxy response-header intervention preserves native authentication, session, database and response-body code. Independent SQLite session/bookmark/anonymous-write checks remain active. Opt-in assessment policy v4 supports this bounded response protection with nonempty inspected source hashes while retaining partial route coverage; v1-v3 decisions and the default producer remain unchanged. High/critical safeguards, unknown purpose and unsupported/foreign-parent review remain intact. This does not assert native frontend or route-wide protection.

Actual data: new ignored `.local/project-native-seeds-004/` combines **eight completed batches, one family, fifteen repeated inputs discarded**. HDR-002 now has **one complete contextual scenario/one numeric variant** and two uncertain observations. CK-001 retains one change scenario/three numeric variants; CK-002 retains one change scenario/variant. HDR-003 has five uncertain inputs; HDR-001, CK-003 and NET-001 remain empty. Seed v2 binds the policy identity, preserves v1 receipt verification and propagates duplicate uncertainty regardless of ordering. Conflicting labels cannot inflate counts. Browser repetitions/profiles still count as one native family.

Validation: **64 TypeScript tests/nine files passed**, plus a Python command regression exercising seed-audit v1/v2 preflight and refusal to register/fit. Type checking and production builds passed. Actual Chromium/Edge framing runs, fresh default/readable collection, privacy/signature/reload/tampering checks and cancellation passed. Frozen v4 provenance retains `assessment: not-enabled`, with unchanged prior analysis/scan hashes and archived verification. The actual candidate preflight reports all seven deficits, with no fitting or predictions. Initial unit fixture syntax/sanitization/type errors were corrected. Restricted native startup and API tests could not access loopback; approved execution outside that restriction passed. A stalled restricted taskkill was stopped only after exact process identification; cleanup now has a timeout/fallback, and final inspection confirmed no native test processes or temporary run directories. Existing Node 20 Ed25519 and Zod/Rollup warnings remain. Frozen JS-002 model/evaluator files have no diff; whitespace checks passed.

**ML-Q remains open: 1/8 categories qualified and 0/7 new datasets training-ready.** The first native contextual seed closes the zero-contextual-data gap only. Reliable strict HTTPS/HSTS and upgrade/functionality, other native category contexts, the eligible 12-family 8/4 development cohort, real candidate fitting, untouched holdout gates and qualified runtime/export/performance/hosted migration-006 acceptance remain. No trust-store changes, model promotion, new holdout evaluation or broader UI/PDF/live Supabase acceptance occurred. Updated `docs/ML_NATIVE_DATASETS.md`, `docs/ML_PROJECT_QUALIFICATION.md`, related ML-Q documents and `RUN_COMMANDS.md` with the executed scope and commands.

**2026-10-29 technical report and presentation guide completed:** `docs/VYLNT_TECHNICAL_REPORT.md` and the **29-page** `output/pdf/VYLNT_Technical_Report_and_Presentation_Guide.pdf` cover all seven requested technical sections, architecture/data flow, stack trade-offs, component lifecycles, typeset LSTM/loss equations, measured JS-002 results, derived confusion matrices, limitations, five defense questions and a timed presentation/demo guide. A repository evidence register and primary technical references identify claim sources. It separates active JS-002 qualification from unfinished seven-category work, local EVM integrity from assessment validity, and uploaded-report CI from fresh-commit checks. Missing AUC, percentile, attribution and production measurements remain explicitly unmeasured.

Validation: reproducible PDF build and verification scripts passed required-content/derived-metric assertions; every page rendered, with no detected horizontal text-bound violations or sparse body pages. Contact sheets and detailed equation/chart/final-pagination pages were visually reviewed. Editable Markdown retains numeric confusion tables; the PDF renders their equivalent annotated plots. This is documentation/artifact validation, not a rerun of application tests or new model/hosted/performance acceptance. No runtime behavior, historical evaluation or model release changed. Existing ML-Q and production-readiness gaps remain open.

**2026-10-29 strict local-TLS environment and native profile implemented; positive acceptance blocked:** `ml:projects:tls prepare|review` creates/checks an identity-bound two-day localhost/127.0.0.1 leaf with CA:FALSE and displays exact trust/removal commands without executing them. Key/certificate identity, validity, SAN, self-signature, public DER, bounded files and private paths are checked. The optional Tabinator `--tls` profile uses a loopback HTTPS proxy over unchanged native auth/database source; transport configuration binds the certificate digest and same-run browser receipts. HTTP profiles remain supported. Preparation failures clean their own generated directory. A trusted mechanism records header-profile checkpoints and failed authority/upgrade observations.

The user explicitly approved temporary leaf trust and removal. First Chromium execution reached three strict HTTPS/HSTS profiles, then failed because the localhost CSP resource-upgrade probe did not execute its expected script. That failed probe is retained; no positive upgrade label was issued. Repeat trust attempts failed inconsistently: an API-added leaf was rejected by Chromium (`ERR_CERT_AUTHORITY_INVALID`), Import-Certificate returned `0x80092004`, and certutil reported import success while Windows chain validation remained false. Initial provider cleanup needed exact API cleanup; fresh-process reads subsequently verified the exact leaf absent from CurrentUser Root, Disallowed and TrustedPeople. No issuing CA was installed. Further trust changes stopped. Aggregate executed outcomes are in ignored `test-results/project-transport/local-trust-attempts-2026-10-29.json`.

Validation: **25 tests/three files passed**, covering local leaf/CA/key/DER/path/quoting guards, transport uncertainty and seed-data integrity. Type checking and production builds passed. The actual existing native HTTP/readable-cookie run passed SQLite/session, cookie controls, privacy, reload/tampering and cleanup after adding the TLS option. No disposable native-run directories remain. An initial sandbox OpenSSL named-object denial was resolved by an approved file-generation run outside the sandbox; this is separate from the subsequent Windows certificate trust failures. Existing Zod/Rollup and Node 20 Ed25519 warnings remain. Frozen JS-002 kernels/evaluators have no diff; whitespace checks passed.

**Step 1 remains incomplete:** repeatable strict Windows/browser trust and successful native TLS collection are pending, as are other category-specific native contexts. The new native TLS branch is implemented/type-checked, not claimed as executed successfully. Steps 2–5 remain open: the 12-family development cohort, adequate independent class data, real fitting, fresh qualification and active runtime/report acceptance. No new training examples, model fitting, held-out evaluation or category promotion occurred in this increment. **ML-Q remains open; 1/8 categories qualified.** See `docs/ML_LOCAL_TLS_SETUP.md` and `RUN_COMMANDS.md`.

The trusted-mechanism report explicitly returns partial/exit 2 when TLS profiles pass but resource-upgrade execution is missing; that failed probe cannot produce a complete acceptance pass. Final type checking passed after this distinction.

**2026-10-29 NET-001 transfer correlation implemented:** original HTTP script references now match same-page HTTP/HTTPS request outcomes using transient exact identifiers and explicit loopback scope. Duplicate sanitized references, multiple matches and redirects remain ambiguous. Failed requests, HTTP errors, completed bodies and metadata timeouts have separate outcomes. Bounded response metadata distinguishes actual loopback wire evidence from synthetic fulfilment; supported TLS metadata is recorded only under strict validation. Changed scans, DOM or navigation cannot reuse a prior observation. Returned diagnostics exclude raw query strings, bodies and private values.

Validation: **31 tests/four files passed**, covering HTTP/HTTPS counterpart correlation, timeout uncertainty, copied-scan/changed-DOM/navigation refusal, query collisions, synthetic fulfilment, evidence/dataset safeguards and existing direct-HTTP causal controls. Actual Chromium resource acceptance passed. An initial browser failure exposed a 404 script response followed by a failed-request event; the observer now retains response status before failure, and both unit/browser tests verify HTTP-error classification without changing findings. Type checking, production builds and whitespace checks passed; existing Zod/Rollup and Node 20 Ed25519 warnings remain. Edge execution result is recorded below after completion. Frozen JS-002 kernels/evaluators have no diff.

The result deliberately records `upgradeVerified=false` and `functionVerified=false`. It does not feed a new contextual model decision or add a qualified/training-ready category. Explicit upgrade/initiator proof, strict trusted-TLS application runs and native compatibility controls remain necessary, followed by the independent corpus, fitting, fresh holdout and runtime acceptance. No training, holdout or model release occurred. **ML-Q remains open; 1/8 categories qualified.** See `docs/ML_RESOURCE_CORRELATION.md` and `RUN_COMMANDS.md`.

Final browser result: Edge also passed the complete resource dependency/correlation mechanism suite. The local fixtures retain bypassed certificate validation, so neither browser run supplies trusted positive TLS data or independent application families. Broader performance, hosted storage, full UI/PDF and full repository regressions were not run for this collector-only increment.

**2026-10-29 browser transport/HSTS producer implemented:** companion runs now use same-run browser TLS metadata and bounded redirect-chain checks instead of configuration-only positive assertions. Complete explicitly scoped HTTPS chains with supported TLS 1.2/1.3 metadata under strict validation can establish transport. DNS-host HSTS applicability requires that observed transport; IP hosts remain inapplicable. Missing metadata, plaintext hops, bypass, scope overflow and changed navigation remain uncertain. The producer retains only sanitized chain facts and hashes, with issued in-memory receipts rejecting copied/altered measurements. Preload and actual HSTS policy installation are not inferred.

Validation: **41 tests/five files passed**, including transport semantics/receipt tampering, navigation during a probe, companion API ownership, frozen project reports and dataset safeguards. Actual Chromium and Edge transport acceptance passed certificate-authority rejection specifically, bypass uncertainty, IP applicability and HTTP-to-HTTPS redirect handling. The existing Chromium collector-mechanism browser regression also passed CSP/privacy/request identity, cookie controls, loopback scope and cancellation. Its first run caught the former expectation that a query-changing probe retained complete coverage; the new assertion requires incomplete coverage and a dedicated unit test verifies positive DNS transport is revoked. IP inapplicability remains bound to the original report. Disposable servers/certificates were removed; no certificate trust store was changed. The positive TLS branch is unit-tested with mocked responses, not claimed as real trusted-certificate application collection. Type checking, final production builds and whitespace checks passed. Original frozen JS-002 kernels/evaluators have no diff. Existing Node 20 Ed25519 and Zod/Rollup annotation warnings remain. Full dashboard/extension UI, native positive TLS, hosted storage and broader performance acceptance were not rerun. No data qualification, model fitting or release occurred.

Remaining ML-Q work: real browser-trusted strict-TLS native positive/contextual scenarios, remaining framing/script/cookie/cross-site/resource context producers, the independent 8/4 development cohort and adequate class counts, real candidate fitting, fresh holdout gates and qualified runtime/export acceptance. This closes the transport-producer gap, not the HSTS dataset or milestone. **ML-Q remains open; 1/8 categories qualified.** See `docs/ML_TLS_EVIDENCE.md` and `RUN_COMMANDS.md`.

**2026-10-29 native category-seed acquisition implemented and executed:** same-run Tabinator SQLite/authentication controls and independently sampled cookie attributes now produce private authenticated numeric seed batches. `ml:projects:seeds` assembles seven category files, provenance receipts, an audit and an explicit blocked-training result. Unknown context remains needs-review; no contextual class or missing finding is invented. Default/readable profiles share an adapter implementation identity while configuration hashes retain separate response profiles. Old scans/receipts remain unchanged. This is actual native seed acquisition, not a completed twelve-family dataset or trained seven-category candidate.

Measured result in `.local/project-native-seeds-003/`: **three successful batches, one family, four repeated inputs discarded**. CK-001 has two full numeric variants but only **one independently checked native scenario**; CK-002 has one variant/scenario. HDR-002 and HDR-003 each retain two uncertain observations. HDR-001, CK-003 and NET-001 have no observations in this scope. **Zero contextual examples; zero of seven datasets ready for training.** Earlier `001` output counted full numeric variants; it remains immutable. `002`/`003` separate variants from native scenario counts so changing HttpOnly does not manufacture another Secure-cookie cause.

Validation: **28 TypeScript tests/three files passed** (seed labels/unknowns, seven file outputs, repeated-family/context counts, receipt/source/scan/cookie mismatch, metadata limits, blocked exit 2 and overwrite refusal); type checking and production builds passed. Actual Chromium default/readable and Edge readable collection passed same-run native controls, privacy, reload and tamper checks. Cancellation passed server/data cleanup. The actual candidate preflight on `003` returned **2**, reported all seven category deficits and performed no fitting or predictions. Candidate registration/fit explicitly refuse the seed format before optimizer execution. The trainer change requires a new future registration; original gates are unchanged. Python candidate regression results are recorded below after completion. Existing Zod/Rollup and Node 20 Ed25519 warnings remain.

Remaining: category-specific native contextual/unknown evidence (including validated TLS/HSTS and resource upgrades), a checked twelve-family source selection with frozen 8/4 split, 30/15 distinct class examples/category across at least three families, registered preparation/exposure auditing, real LSTM/logistic fitting, untouched holdout qualification and qualified runtime/export acceptance. Source screening checked BookWise native auth/category code, Hads editor code and additional metadata; these are not selected/eligible families. No holdout or real candidate was consumed/created. **ML-Q remains open, 1/8 categories qualified.** See `docs/ML_NATIVE_DATASETS.md` and `RUN_COMMANDS.md`.

Final validation for native acquisition: **six Python candidate tests passed**, including seed-format preflight/refusal for register/fit and the existing disposable synthetic optimizer/parity smoke. That smoke uses mocked readiness and deletes its candidate; it is not native model training or qualification. Final type checking passed. Whitespace checks passed and frozen JS-002 kernels/evaluators show no diff. Native run directories were removed; the cancellation runner verified its owned child stopped. A general process-inventory read was unavailable in the restricted shell; no claim about unrelated processes is made. No dashboard/API service was started for this work.

**2026-10-29 native holdout-contamination guard implemented and tested:** new holdout registration, preparation, preflight and evaluation now read the developer native-source exposure inventory. Known family/repository identities, repository IDs, commits and retained implementation hashes cannot be relabelled into a fresh holdout. The inventory is bound into the protocol digest, so changed/deleted exposure records invalidate a registration before predictions. Release staging inherits the same preflight. Jingo now retains its verified public repository ID and three exact upstream Git-blob implementation hashes. This closes a gap where prototype exclusions existed only in documentation; it does not create eligible data or qualify a category. Native cohorts, training, measured qualification and runtime activation remain open.

Validation: **27 tests/four files passed**, plus **one added actual-command registration-refusal test passed**. Tests cover renamed family/repository identities, repository IDs, commits, copied implementation hashes, licence-only non-overlap, missing/altered inventories before evaluation consumption, failed/repeated/interrupted evaluation and release staging. Type checking and production builds passed; existing Zod/Rollup annotation warnings remain. Frozen JS-002 kernels/evaluators have no diff. No real holdout was consumed, no model was fitted/promoted, and no browser/live hosted check was run in this increment. These source guards complement the historical numeric registry; they cannot certify unknown repositories as independent. Migration 006 remains user-reported applied, hosted acceptance pending. ML-Q remains open with **1/8 qualified categories**.

**2026-10-29 native development-data increment:** added pinned Tabinator, a second native Node/Express development prototype alongside Jingo. Independent SQLite reads establish a signed session-to-synthetic-user relationship, a successful native bookmark write and anonymous denial without mutation. Same-run removal/restoration and HttpOnly controls feed the existing experimental v4 producer; original native security modules remain unchanged. Source selection/licence screening was recorded before collection/prediction. Source/lock/licence hashes and bytes are retained. Disposable code/data, loopback-only listener, restricted child environment and discarded upstream body logs keep collection bounded.

Validation: **49 relevant tests/six files passed**, with type checking and production builds. Final canonical-source Chromium default/readable and Edge readable runs passed native controls, saved-observation reload after private-key/data removal, altered-scan/evidence refusal and source-byte guards. Cancellation stopped the owned server and removed its temporary data; a deliberate source edit was refused before startup and the original bytes restored. Private IPC proves the newly started child's loopback listener before readiness probes; child exit cancels active collection. Default runs produced one complete CK-001 input; readable runs produced one complete CK-001 and one CK-002 input with partial route scope. Node 24.22.1, Chromium 156.0.8078.4 and Edge 156.0.4314.50 plus hardware/timing are recorded separately from model inputs. Typical readable runs took about 9–11 seconds here; this is not near-limit or general performance qualification. Final inspection confirmed no native test supervisors/application processes or disposable run directories remain. Whitespace checks passed.

Private sanitized scan/seal/public-key/native-oracle snapshots retain no credentials, cookie values, user records, bodies or class labels. Completed runs have a separate acceptance marker. Two response profiles remain one family and repetition cannot inflate readiness. Early Windows-converted source snapshots remain unchanged and ineligible; current pins use exact upstream Git bytes and byte-preserving licence/lock attributes. Every copied runtime file is now cryptographically compared with the immutable HEAD tree, independent of cached Git stat results. Initial source-inventory completeness was conservatively restricted to partial native application scope; an IPC supervisor hang and a negative-test false-versus-undefined assertion were corrected. Existing Zod/Rollup and Node 20 Ed25519 warnings remain. Frozen rules/kernels/evaluators have no diff. Linux execution, the full repository suite and broader near-limit/UI/PDF acceptance were not rerun for this developer-only data increment.

No cohort, fitting, holdout prediction or new release has been created. Prototype records explicitly remain ineligible for training; source metadata marks this as development-exposed and excludes it from future fresh-holdout selection. The twelve-family development corpus, complete native contextual/unknown category coverage, actual candidate/holdout gates and qualified runtime/export acceptance remain open. JS-002 is still the only qualified category (1/8). See `docs/ML_NATIVE_COHORT_PLAN.md`, `docs/ML_NATIVE_TABINATOR.md` and new developer commands in `RUN_COMMANDS.md`.

**2026-10-29 seven-category release staging implemented:** `ml:projects:release` verifies completed once-only evaluations and creates private manifests for passing categories. It reuses the full frozen-source/candidate/parity preflight, authenticates registration/preparation/evaluation/consumption records, recomputes original count/quality/safety/comparator gates, preserves immutable model bytes and validation-selected calibration/thresholds, and disables failed categories in the derived policy. Outputs retain controlled scope, uncertainty and provenance hashes with runtimeEnabled=false/runtimeAcceptance=pending. No bundling, training, prediction repetition or active-model change occurs.

Validation: **28 tests/five files passed**, covering actual failed-evaluation refusal, hypothetical partial/all-category staging, changed/missing/interrupted receipts, exclusive output, unchanged consumed markers/artifacts, malformed count/metric/model/policy records, safety gates and existing candidate/evidence checks. Type checking, production builds and help passed. An initial sandbox temporary-file permission error was resolved with workspace-local temporary files and an approved test invocation. No quality gate or timeout was relaxed. Existing Zod/Rollup annotation warnings remain. These use isolated synthetic mechanics and a separate test key; no real candidate, qualification result or release was created. The full suite/browser flows were not rerun: active runtime, UI, bundled release and frozen JS-002 kernels/evaluators were unchanged.

Final metadata hardening: staged model JSON permits only known numeric-model fields and hash metadata; embedded examples or other unknown fields are rejected. Four focused tests and type checking passed after this guard. Whitespace checks passed; original holdout evaluator/runner and frozen JS-002 files have no diff.

Migration 006 is **user-reported applied** in Supabase; independently executed hosted verification remains pending. Remaining ML-Q work: complete native category evidence/adapters and an eligible independent development cohort, fit a real candidate, evaluate a genuinely fresh holdout, pass every category's original gates, then implement/accept qualified Worker/API/frozen-report activation and bundling plus broader performance/compatibility acceptance. Release verification/staging is complete; runtime activation is separate. **ML-Q remains open; JS-002 is still the only qualified category.** See `docs/ML_PROJECT_RELEASE.md`, qualification docs and `RUN_COMMANDS.md`.

**2026-10-29 frozen project-provenance component implemented:** authenticated project finalisation now freezes a `vylnt-frozen-insights-v2` snapshot containing the original scan/hash, existing analysis and signed same-run evidence. A signed pseudonymous owner tag prevents copied scans/seals or direct database writes from transferring another account's project authority. Trust comes from installation keys, never uploaded keys. Ordinary scans retain v1 and are not enriched by URL matching. Invalid known project provenance rejects finalisation rather than silently downgrading it. Existing sidecars are not rewritten; archived keys verify old snapshots after rotation.

Local and Supabase adapters enforce trusted derivation, owner binding, immutable versions and size limits. Migration **006_project_insight_reports.sql** adds a v2 RPC over the existing owner-scoped table; the v1 RPC/rows remain intact. Repeated finalisation reuses the same version. JSON and PDF share the frozen content; PDF adds provenance and current qualification limits. The dashboard verifier accepts both formats. Existing anchoring verifies v2 before queueing; standalone verification uses the installation archive or an explicitly supplied trusted public-key archive. No project facts are consumed by the current analysis: the envelope explicitly records `assessment: not-enabled`, while analysis retains its actual existing input schema. Owner tags do not enter numeric features. Raw PDFs, severity, shared rules, GitHub policy and the qualified JS-002 release remain intact.

Validation: **53 relevant tests/12 files passed**, including real local PostgreSQL execution of 005+006, ownership, malformed/tampered content, signed-owner authorization, direct-store cross-account injection, trusted-key handling/rotation, idempotency, local reload, source deletion, size rejection, stale provenance, legacy derivation and JSON/PDF snapshot consistency. Type checking and production builds passed. Chromium and Edge passed the real registered-project two-page exact-commit flow, signed v2 JSON/PDF, UI original/tampered uploads, cancellation, restart retention, keyboard registration and responsive/polling checks. The isolated blockchain suite passed **21 acceptance groups**, including a real v2 transaction/live verification, wrong-owner refusal, altered-export rejection, legacy UI/extension checks, outages, retry/recovery and chain reset. The three-page project PDF was rendered and inspected; provenance/limitations text is present. Initial sandbox localhost EACCES errors were resolved by an approved test run outside the sandbox. An early verifier change misclassified malformed exports as unavailable; the existing regression caught it and the corrected implementation passed unchanged assertions. No quality target or test timeout was relaxed. Existing Zod/Rollup annotation warnings remain. A final 20-test/three-file run passed owner-tag tampering/feature-exclusion, project evidence and unchanged gate-policy checks. Whitespace checks passed; protected detection and frozen JS-002 kernel/evaluator files have no diff. The full repository suite was not rerun for this increment.

Remaining: **verify migration 006 in hosted Supabase (user reports it applied)**; complete native evidence/adapters and eligible independent development families; actual candidate fitting, fresh held-out category gates, gated release manifest and qualified evidence-v4 Worker/API decisions; broader performance/compatibility/near-limit exports. The frozen provenance/persistence component is complete locally; all of Stage F and ML-Q are not closed. No new model was trained or qualification holdout consumed. **JS-002 remains the only qualified category.** See `docs/ML_PROJECT_FROZEN_REPORTS.md`, updated qualification/data documents and `RUN_COMMANDS.md`.

**2026-10-29 native authentication evidence component implemented:** issued scan/adapter-bound removal/restoration controls now exclude a solely non-sensitive preference role for positively established authentication cookies. Bounded exported Express initializers are recognized without upgrading their partial syntax coverage. Assessment policy **v3** accepts only complete matching positive CK-001/CK-002 inputs through this partial-inventory path; it cannot de-emphasize authentication findings. Authentication cookies requiring JavaScript remain review-only even with a complete inventory. V1/V2 retain their original parsing/decisions; tensor layout, detection rules and the qualified JS-002 release are unchanged.

The functional producer now rejects serialized/edited positive receipts, conflicting roles and mismatched adapters. GET/request/context budgets and response-stage redirects keep checks within the declared source loopback origin. Extra pages, workers, ambiguous cookies, incomplete controls and failed restoration remain unknown; cookie values never enter results or witness hashes. The inspector rejects shadowed/reassigned/conditional initializer bindings and source paths outside the registered root. Factory recognition always remains partial.

Validation: the full one-worker TypeScript run passed **322 of 323 tests/59 files**, with the existing unmodified model-verification negative test exceeding its five-second timeout. Its complete four-test file then passed unchanged in isolation; no timeout or quality gate was relaxed. Type checking and production builds passed. Native Jingo default Chromium produced two complete CK-001 positive inputs; the controlled readable-cookie profile produced two CK-001 and two CK-002 inputs in Chromium/Edge, retaining partial source inventory and temporary-data cleanup. Both browsers passed collector/privacy/cancellation checks plus the new issued-role and unapproved-redirect regression. The source-backed preference regression passed in Chromium and Edge. Final inspector binding hardening passed the full unit run, read-only pinned-source inventory and final Edge readable-cookie/native acceptance with two complete inputs per category and confirmed cleanup. Earlier aggregate factory tests exceeded a five-second fixture timeout and were split into independent cases. Native logical-not usage was initially mistaken for mutation; limiting mutation detection to increment/decrement operators fixed the false abstention. Existing Zod/Rollup annotation warnings remain.

Remaining: native contextual/unknown cookie scenarios, broader supported adapters/category evidence, an eligible independent twelve-family development cohort, actual fitting, a fresh holdout passing the original category gates, gated release/Worker/API/frozen-report integration, migration 006 and runtime/export/performance acceptance. These native profiles remain **one previously exposed family**, not an eligible dataset. No real candidate was fitted or qualification holdout consumed. **ML-Q stays open; JS-002 remains the only qualified category.** See `docs/ML_AUTHENTICATION_EVIDENCE.md`, qualification/data docs and `RUN_COMMANDS.md`.

**2026-10-29 executed HDR-002 framing-policy component implemented:** new same-run source capabilities, healthy-target checks and fresh permitted/forbidden/repeated/nested ancestor controls establish finite response-CSP enforcement facts. The pure shared parser intersects policies and respects first directives. Browser audits are linked to the protected origin, violating outer ancestor, exact matched target navigation and expected frame graph. Report-only/meta policies, redirects, header drift, failed callbacks, unsupported syntax and unlinked events cannot issue verified facts. Navigation/history changes invalidate the source even after URL restoration; an added epoch guard also prevents navigation during asynchronous hashing from restoring stale provenance.

Assessment policy **v2** retains unknown purpose and trust fields. Its future candidate safeguard only accepts the observed-policy shortcut for complete browser witnesses and self/no-parent scope within the supported HTTP ancestor domain. Other permitted origins remain Needs review without their purpose/trust relationship. High/critical and incomplete/contradictory evidence retain review safeguards. V1 seals still parse, verify and keep their original uncertainty/hash behavior. Tensor layout and the qualified JS-002 release are unchanged; no v4 classifier is enabled.

Validation: the full TypeScript suite passed **309 tests/59 files** with one worker; final source-hashing hardening has **12 focused passing tests**, including navigation-during-hash and valid uninterrupted binding. Type checking and production builds passed. Chromium and Edge passed the **12-scenario framing-policy matrix**: explicit own/other-origin allowlists, policy intersections/duplicates, CSP/XFO precedence, self/none, nested denial, missing/report-only/meta/broad policies, stale/forged bindings, legacy signatures/hashes, cookie/raw-report preservation and cancellation. The native Jingo Chromium regression passed standalone and confirmed temporary-data cleanup. Initial audit matching expected a full URL but Chromium reported protected-origin/ancestor details; the corrected binding passed. A parallel full run hit the existing holdout-command 60-second timeout and temporary-directory lock; unchanged isolated command tests and the full one-worker run passed. A concurrent native login/cookie attempt failed before its passing standalone rerun. No timeout or quality gate was relaxed. Existing Zod/Rollup annotation warnings remain. Whitespace checks passed; detection rules and frozen JS-002 collector/evaluator/kernel files have no diff.

Remaining: source-backed purpose/trust relationships, broader/native/HTTPS framing coverage and automatic companion adapters; other category evidence, eligible independent development families, actual fitting, fresh held-out gates, gated release/Worker/API/frozen-report integration, migration 006 and runtime/export/performance acceptance. These are mechanism fixtures, not independent training families. No real model was trained or qualification holdout consumed. **ML-Q stays open; JS-002 remains the only qualified category.** See `docs/ML_FRAME_POLICY.md`, qualification/data docs and the new developer command in `RUN_COMMANDS.md`.

**2026-10-29 NET-001 direct-resource dependency component implemented:** the experimental collector retains private same-run request receipts tied to the original scan and script/policy metadata. A developer-owned read-only interaction must work in the source document and fresh normal/restored contexts, and positively fail when the matched HTTP script is withheld. Completed direct successful responses require actual loopback server metadata. Supported targets receive observed HTTP-transfer/dependency facts; failed, absent, ambiguous, synthetic, redirected or unsupported resources cannot become verified assessments. Checks group matching observations and preserve affected finding links; raw identifiers, cookies, bodies, source and page text are not added to stored measurements.

Response-stage redirect checks now prevent the browser following destinations outside the source collector's explicit loopback allowlist; replay rejects redirects entirely. The first negative browser run exposed that ordinary Playwright request routing does not recheck every redirect URL. A cancellation-close race was fixed by awaiting the same close promise. An existing Edge collector run then exposed an unbounded response-metadata wait: irrelevant main-document/redirect metadata is now excluded, relevant metadata has a 1.5-second bound, and timed-out results cannot later issue facts. Only the identified stalled test runner was stopped before the passing rerun.

Validation: the final full TypeScript suite passed **305 tests/58 suites**, including the bounded-metadata regression; **12 focused tests**, final type checking and production builds passed. The final **10-case resource matrix passed in Chromium and Edge**: direct dependency, a misleading upgrade header, unnecessary scripts, blocked/failed/404 resources, redirects, query collisions, modules and synthetic fulfilment. Additional checks covered failed restoration, stale/forged receipts, metadata drift, original cookie/report preservation and cancellation cleanup. Existing collector regressions passed in both browsers, with the bounded implementation passing the formerly stalled Edge check. Native Jingo regressions passed in both browsers and recorded temporary-data cleanup; native source is still one family, not an HTTPS NET-001 cohort. Existing Zod/Rollup annotation warnings remain. Whitespace checks passed; shared detection rules and frozen JS-002 collector/evaluator/kernel files have no diff.

Scope/remaining: the HTTPS mechanism fixtures explicitly ignore local self-signed certificate errors and establish no TLS-validation or HSTS claim. A CSP upgrade header did not establish an actual upgrade in the tested loopback case; observed HTTP transfer is recorded instead. Verified pre-transfer TLS-upgrade/functionality evidence, broader resources and source-backed native adapters remain open. Generic Local projects collection keeps the request receipt in memory; automatic native functional adapters are separate work. Independent development families, real fitting, fresh held-out category gates, gated release/Worker/API/frozen-report integration, migration 006 and runtime/export/performance acceptance remain open. No real candidate was trained or qualification holdout consumed. **ML-Q remains open; JS-002 is still the only qualified category.** See `docs/ML_RESOURCE_COMPATIBILITY.md`, qualification docs and the new developer command in `RUN_COMMANDS.md`.

**2026-10-29 HDR-003 meta-policy evidence implemented:** the experimental project collector now observes the first supported application statement, captures bounded policy metadata and rejects late, moved, rewritten or ambiguous policy evidence. Normal/JavaScript-disabled/restored controls bind the original document to replay and independently check required functionality plus inline execution/CSP blocking. Supported early self/hash policies can contribute scoped HDR-003 facts; response/meta conjunction is preserved, and meta frame-ancestors supplies no framing protection. Nonce syntax/blocking does not establish unpredictable fresh generation: nonce-dependent profiles remain review-only. Only metadata counts/booleans/digests leave the timing producer; no script source, nonce or policy text is stored in its output.

Validation: the full TypeScript suite passed **300 tests/57 suites**. After final parser/control hardening, **30 focused tests/5 suites**, type checking and production builds passed. The **24-case script-function matrix passed in Chromium and Edge**, including early/self/SHA-256 policies, review-only nonces, late/dynamic/report-only cases, policy drift, removal/reinsertion, an earlier inline-event flow, privacy, forged receipts and conservative fallback. SHA-384/512 have parser-boundary checks, not browser-mechanism claims. Collector browser regressions and the pinned native Jingo login/session/editor/framing/cross-site checks passed in both browsers; native result files confirm cleanup. Initial pre-execution timing attempts failed closed and were replaced by the tested first-statement event; a strict-response fixture was corrected to respect the existing rule's absence of a finding. Builds retain the existing Zod/Rollup annotation warnings. Whitespace checks passed; frozen JS-002 collector/evaluator/kernel files have no diff.

Scope/remaining: this completes one bounded evidence component, not HDR-003 qualification. Generic Local projects collection retains timing in memory; automatic application-specific functional adapters remain separate. Mechanism fixtures cannot enter application datasets, and native Jingo remains one development-exposed family. Source-backed nonce generation, broader native/category evidence and signed companion adapters; eligible independent development families, actual fitting, a fresh holdout with passing category gates; gated release, qualified Worker/API/frozen-report integration, migration 006 and runtime/export/performance acceptance remain open. No candidate was trained or holdout consumed in this increment. **ML-Q remains open; JS-002 is still the only qualified category.** See `docs/ML_META_POLICY.md`, updated qualification docs and `RUN_COMMANDS.md`.

**2026-10-29 Stage E fresh-holdout tooling implemented:** added `ml:projects:holdout` with private source registration, signed application preparation, count/policy preflight and once-only frozen-candidate evaluation. A separate twelve-family source lock/holdout partition is required. Historical plus development families/inputs, repository identity, security implementations and source templates are checked for overlap. Registration binds candidate files, policy, development/source hashes, current producers and existing executed Node/Chromium/Edge parity records. Local authenticated receipts reject edited registrations/preparations. No training or threshold selection occurs on holdout data.

Evaluation infers once per numeric variant, deduplicates point-metric contexts and retains every family link for cluster uncertainty. Highest severity/conservative evidence safeguards prevent repeated contexts from hiding an issue. Original precision/recall/coverage/safety/comparator gates are evaluated category by category with Wilson and deterministic family-bootstrap intervals. Safeguards use observed evidence/severity, never oracle labels or test conflicts. Exclusive candidate consumption precedes inference and remains after failure/interruption; repeat registration/preparation/evaluation cannot replace a consumed candidate. Passing metrics still leave the artifact experimental pending release/runtime acceptance.

Validation: the full TypeScript suite passed **296 tests/56 suites**. Final focused preparation/holdout/command checks passed **20 tests**, and final type checking passed after command hardening. Five existing Python candidate mechanics tests passed, including deleted synthetic optimizer/export and actual Node parity. Production builds, the real wrapper help command and whitespace checks passed. Command fixtures verified signed empty-data preparation/exit 2 without predictions, stale candidate/policy/parity/source/exposure/MAC rejection, failed quality gates, post-consumption numeric failure, actual process interruption and repeat refusal. An initial type-narrowing issue and an interruption-test watcher that overwrote its first successful signal were corrected before the passing runs. Temporary command workspaces were removed. Frozen JS-002 collector/evaluator/kernel files have no diff.

Scope/limitations: command lifecycle fixtures use isolated synthetic data/parity records and count only as mechanics checks; no real application candidate or holdout was evaluated. Actual registrations require the retained parity workflow. Hashes/signatures authenticate local identities, not application independence or oracle truth; a malicious same-OS-user process remains outside the trust boundary. The producer-code identity changed, so prior project preparation registrations are retained rather than silently upgraded. See `docs/ML_PROJECT_HOLDOUT.md`, updated qualification/data docs and `RUN_COMMANDS.md`.

Remaining: complete category-specific evidence/native adapters and supported project integration; select/collect the eligible independent development corpus; fit the real seven-category candidate; select/collect a genuinely fresh holdout and pass its original gates; gated release packaging, qualified Worker/API/frozen-report integration, migration 006 and runtime/export/performance acceptance. **Stage E workflow engineering is implemented; actual Stage E qualification and ML-Q closure remain open. JS-002 is still the only qualified category.**

**2026-10-29 explicit mutating-GET evidence implemented:** added explicitly declared empty-field GET form operations alongside the existing POST/override probes. GET initiator checks use browser referrer plus matching Fetch Metadata or the exact owned source document when intercepted metadata is absent. Contradictory metadata cannot use that fallback; Origin is not fabricated. Fields, method mismatches and unsupported routes are rejected before the target operation. Diagnostic format v3 distinguishes initiator evidence from Origin and binds the actual method; frozen envelopes/model inputs are unchanged.

Validation: all **284 TypeScript tests/54 suites**, type checking and production builds passed. The full suite used `--maxWorkers=2`: initial sandbox loopback denials and a subsequent 5-second parity timeout under heavy parallel load were followed by the passing bounded-parallel run, without changing tests or thresholds. Chromium/Edge GET/POST mechanism checks and native default/controlled-cookie matrices passed. Native temporary wiki directories were removed; archived JS-002 collector/evaluator/kernel files have no diff, and whitespace checks passed. Final strengthened mechanism controls and their results are in `test-results/cross-site/`; native results are in `test-results/native-projects/`.

Observed limitation: native Lax cookies accompanied cross-site top-level GETs. The pinned revert route restored the disposable file and Git index but did not produce a new commit within bounded readback in any tested profile. That **partial operation remains unknown** for the committed-revert oracle; separate boolean readbacks retain the side effect. A redirect or partial restore is not labelled a completed revert. Native source is unchanged, and these profiles remain one application family. See `docs/ML_CROSS_SITE_EVIDENCE.md`, `docs/ML_NATIVE_PROJECT_CHECKS.md` and `RUN_COMMANDS.md`.

Remaining: source-backed route completeness/cross-site necessity, authentication/conditional routes and other vectors; missing category-specific evidence/adapters and signed integration; the eligible independent development corpus, actual seven-category fitting, fresh holdout quality gates, qualified Worker/API/report integration and migration 006. These observations emit no CSRF-completeness/necessity model fact or training label. **ML-Q remains open; JS-002 is still the only qualified category.**

**2026-10-29 document-operation coverage iteration implemented:** expanded the native distinct-site probe from creation to create/content-edit/delete, each with same-site/cross-site/anonymous/repeated controls. PUT/DELETE are explicitly declared form overrides on actual POST transport; mismatched/undeclared overrides are rejected before the target request. Diagnostic format v2 binds the operation identity. Independent file content, Git HEAD and filesystem-absence checks establish mutations; redirects alone cannot pass.

Validation: all **283 TypeScript tests/54 suites**, 17 focused regressions, type checking and production build passed. Chromium/Edge mechanism checks verified mismatched overrides caused no mutation. Native default-cookie and controlled SameSite=None/Secure profiles passed in both browsers: the controlled profile repeatedly created, edited and deleted committed disposable documents; omission/errors remained unknown. An initial bracket syntax typo and a slug/title rename fixture mismatch were corrected before the passing checks; unchanged data was not labelled successful. Native source/authentication code stayed pinned. See `docs/ML_CROSS_SITE_EVIDENCE.md` and `RUN_COMMANDS.md`.

Coverage remains partial: mutating GET revert, authentication, conditional/preview routes, direct non-form methods and other vectors are untested. Results remain diagnostic, not signed model facts or independent training examples. This is one native family with three operations, not three families. Remaining: source-backed route completeness/necessity, other category evidence/adapters, independent development/holdout cohorts, actual fitting/evaluation, qualified runtime/report integration and migration 006. **ML-Q remains open; no category was promoted.**

**2026-10-29 distinct-site POST observation component implemented:** actual browser forms across 127.0.0.1 / 127.0.0.2 now compare same-site, cross-site, anonymous and repeated operations. Cookie transmission/Origin are observed from browser requests, and a developer adapter independently checks disposable state changes. Errors, omission and incomplete checks stay unknown. Results remain diagnostic with partial route coverage; no cross-site necessity, route-wide CSRF protection, signed model fact or qualification is inferred.

Validation: all **282 TypeScript tests/54 suites**, type checking and production build passed. Chromium and Edge mechanism checks covered mutation, explicit Origin/token denial, Lax omission, HTTP errors, original-cookie preservation, output privacy and helper cancellation. Pinned Jingo native/default and controlled SameSite=None/Secure response profiles passed in both browsers: the control transmitted cookies and repeatedly created a committed page; native omission/HTTP 500 stayed unknown. An initial native binding used an unused middleware cookie and failed closed; the corrected adapter binds collected `JingoSession`. Temporary native processes/wiki data were removed. Frozen JS-002 collector/model/evaluator/kernel files have no diff, and whitespace checks passed. See `docs/ML_CROSS_SITE_EVIDENCE.md` and `RUN_COMMANDS.md`.

Remaining: source-backed route completeness, legitimate cross-site necessity, other native/header/resource evidence and signed companion integration; independent development/holdout cohorts, real fitting and original quality gates; qualified runtime/report integration and migration 006. These are the same native family under two response configurations, not new training families. **ML-Q stays open; no additional category is qualified.**

**2026-10-28 category-decision parity tooling implemented:** extended evidence-v4 candidate checks from raw LSTM probabilities to retained logits, complete-input logistic inference, calibrated scores and exact model-only category decisions. The isolated experimental runtime handles unsupported categories, disabled thresholds and malformed numeric/policy inputs conservatively. It is not wired into production Worker/API assessments. Archived kernels and the qualified JS-002 release remain unchanged.

Validation: four new runtime tests plus seven existing evidence tests passed; type checking passed. Five Python mechanics tests passed with Node/Chromium/Edge execution, exact candidate decisions and 28 separate synthetic policy-contract cases per environment (three states, threshold boundaries, saturation, disabled policies and unsupported categories). Numeric comparisons use 1e-6 tolerance. Temporary optimizer readiness is mocked only inside the test; all candidate files are deleted afterward. The execution summary is under `test-results/project-candidate/decision-parity.json`. New records bind candidate/model and runtime source hashes; legacy numeric-only fixtures remain explicitly numeric-only. No held-out predictions or quality claims are made.

Progress: the missing logistic/category-decision browser-parity component is implemented and mechanically tested. Real-data fitting, independent development/holdout cohorts, category gates, complete release provenance and qualified runtime/report integration/migration 006 remain open. This phase does not qualify another category or close ML-Q. See `docs/ML_PROJECT_CANDIDATE.md`.

**2026-10-28 evidence-v4 candidate-training tooling implemented:** added developer preflight, exclusive registration, eight-unit LSTM/logistic fitting, validation-only checkpoint/calibration/threshold selection, 74-step/128 KiB bounds, numeric parity fixtures and byte-bound experimental manifests. Readiness is recomputed; unknown/conflicting/cross-partition inputs and duplicates cannot inflate counts. Test partitions, changed data/registration/code and repeated fitting are rejected. Prepared data, actual TypeScript feature contract and frozen training code identities are bound. Global classification remains disabled; nothing is promoted to React/API.

Validation: five Python tests passed, including a deleted synthetic optimizer/export test with readiness mocked only inside the test and actual Python/shared-JavaScript numeric parity at 1e-6. The real Node wrapper passed empty-data preflight (28 concrete class/partition deficits, exit 2) and refusal to register/train insufficient data. An initial sandbox temporary-directory denial was resolved using workspace-local disposable test directories. No quality gate was relaxed. Details: `docs/ML_PROJECT_CANDIDATE.md`. Type checking/final compatibility checks are recorded below.

**ML-Q remains open:** no eligible 12-family/630-context-minimum development corpus, real seven-category candidate or fresh qualification holdout exists. Remaining evidence/adapters/oracles and data collection, real fitting, category-decision parity, fresh original quality gates and qualified runtime/report integration/migration 006 must still pass. These developer mechanics do not qualify a model; JS-002 remains the only qualified category. No historical model, dataset, evaluation, report or blockchain hash was rewritten.

Final compatibility checks: type checking and whitespace checks passed. The temporary optimizer test also verifies that fitting the v4 candidate leaves the historical v4 engine's feature contract unchanged. Trainer artifacts record Python, Torch, NumPy and scikit-learn versions. This increment changes developer Python/Node tooling only; it does not enable a new production classifier or rerun a real holdout.

**2026-10-28 completed scoped framing observation increment:** implemented bounded same-origin / cross-origin / repeated cross-origin embedding checks. Explicit enforced browser CSP-ancestor audit evidence plus matching response metadata is required before a policy-block result. Failed loads and unsupported X-Frame-Options-only blocks stay unknown. These are diagnostic observations, not public-embedding/sensitive-action labels or signed model facts. Native Jingo's authenticated form embedded under both tested origins in Chromium and Edge; this does not prove exploitability or application intent. Different ports test different origins, not distinct-site CSRF flows.

Validation: 11 focused framing/evidence/script unit regressions, type checking and production builds passed. Chromium/Edge mechanism checks covered enforced/report-only/meta/self CSP, unsupported XFO, missing application state, unchanged cookies, hash binding, output privacy and active cancellation. Native Chromium/Edge checks passed with disposable wiki/login data and retained the anonymous-write HTTP 500 as review-only. Final strict-audit/request-accounting fixture reruns are recorded in `test-results/framing/`. Frozen JS-002 scanner/evaluator files have no diff. No historical model, report, raw severity or GitHub policy was changed. See `docs/ML_FRAMING_EVIDENCE.md` and `RUN_COMMANDS.md`.

Remaining: source-backed embedding purpose/sensitivity, broader native adapters and signed integration; other missing category evidence (including real cross-site/CSRF), independent development/holdout cohorts, training and passing evaluations, qualified runtime/report release and migration 006. **ML-Q is still open; this increment does not qualify any of the remaining seven categories.**

**2026-10-28 completed evidence item — scoped script/CSP compatibility:** implemented normal / JavaScript-disabled / restored native interaction controls alongside the existing unapproved inline CSP probe. Replay binds response policies, live script metadata and the original scan; missing or conflicting controls remain unknown. A shared bounded loopback transport is reused by cookie/script producers. Process-local receipts reject uploaded/cloned/tampered facts and conflicting prior measurements. Cookie replay includes path-scoped sessions. No raw source, cookie value, body or page text is persisted.

Checks: all **274 unit tests/51 suites**, type checking and production builds passed. Chromium/Edge mechanism acceptance passed, including the final path-scoped replay extension. The pinned Jingo enhanced editor passed in both browsers: normal/restored interaction succeeded, JavaScript-disabled enhancement was absent, and missing CSP allowed the inline probe. This is an enhanced-editor scope, not proof that alternate textarea editing is impossible or that every route works. The anonymous-write HTTP 500 stays review-only. Existing Chromium cookie-access acceptance passed after transport extraction. Mechanism checks include thrown callbacks, failed restoration, metadata changes, report-only/Trusted Types, redirect isolation, privacy and active cancellation. The initial sandbox Vitest cache rename denial was resolved with workspace TEMP/TMP; no evidence gate was relaxed. Frozen JS-002 scanner/evaluator files have no diff. See `docs/ML_SCRIPT_COMPATIBILITY.md`.

Closed in this increment: the scoped required-script interaction mechanism and its native prototype. Still open: supported meta-policy timing and broader native compatibility profiles, generic companion adapter integration, the other header/resource/cookie/cross-site evidence, independent development data, candidate fitting, fresh holdout qualification and qualified Worker/API/frozen-report integration/migration 006. **ML-Q remains open; no new category, dataset or model was promoted.**

**2026-10-28 cookie-purpose increment:** implemented a source-reviewed, commit-bound preference/authentication producer. The closed-use Express reference exercises two preference states, default restoration, independent protected access and explicit unauthenticated denial; the authentication cookie also needs actual removal/restoration dependency controls. Source proofs and merge receipts cannot be supplied through JSON. Known cookie roles plus HttpOnly controls now produce distinct numeric contexts for an authentication change and a contextual preference, while high findings remain visible. Unknown source, incomplete operations and errors remain review-only. This is one controlled mechanism reference, not a new independent family or qualified model.

Implemented safeguards: source revalidation/cancellation, actual source-byte hashes with reviewed LF normalization, same-scan/commit/source binding, per-run readiness identity before synthetic login, and signed `collectionKind: mechanism-fixture`. Dataset preparation rejects those reference rows. All **272 unit tests across 50 suites**, type checking and production builds passed. Final Chromium and Edge source/behaviour acceptance passed, including source tampering, stale proofs, protected-operation errors, complementary cookie roles and conservative high-severity visibility. The existing Chromium cookie-access acceptance also passed after sharing its flow helper. Active-control cancellation passed, stopping the reference process and removing temporary data. One Edge attempt alongside the broad suite failed before role verification; its standalone rerun passed. Contention/performance qualification remains open; no test timeout or evidence requirement was relaxed. Frozen JS-002 scanner/evaluator files have no diff. Details: `docs/ML_COOKIE_PURPOSE.md`. No training, held-out prediction, migration deployment or category promotion is claimed.

Next work: apply reviewed purpose/necessity profiles to suitable native applications, add target-write and cross-site/CSRF controls and complete the remaining header/resource scenarios. Then register the independent development cohort, fit a new candidate, collect an untouched holdout and pass the original category gates before qualified runtime/report integration. This increment does not automatically enable its developer reference in the Local projects dashboard. **ML-Q remains open: JS-002 is qualified; the other seven categories are not.**

**2026-10-28 completed increment — scoped CK-002 JavaScript-access evidence:** implemented `project-cookie-access.ts` with original / target-only HttpOnly / restored controls, independent authentication/function outcomes, document-cookie and Cookie Store observation, strict scan/finding binding and privacy whitelisting. The bounded Node transport preserves the other cookies, maintains HttpOnly across server reissues, rejects redirects before they escape the origin and keeps unsupported/tampered/write/worker/frame/navigation cases unknown. Chromium/Edge mechanism checks passed. The pinned Jingo editor passed native-cookie controls in Chromium and the controlled readable-cookie profile in Chromium and Edge; that profile produced six raw findings and four linked cookie evidence targets. Both profiles are the same application family, with no training label or family-count inflation. The known cosmetic font fallback is explicitly bound to the probe scope. The anonymous-write HTTP 500 remains review-only.

Validation for this increment: 31 distinct targeted unit/regression tests passed (including the frozen-report API test rerun after a sandbox loopback denial), type checking and production build passed. Chromium and Edge covered required/incidental/absent reads, Cookie Store, privacy, cancellation and conservative fallback; final Edge checks also covered oversized response rejection and ignored extra callback output. Existing JS-002 collector/evaluator files have no diff, and whitespace checks passed. Final readable-proxy cancellation passed: its native server stopped and disposable data was removed. Final type checking passed. Details and commands: `docs/ML_COOKIE_ACCESS.md` and `RUN_COMMANDS.md`.

Remaining after this increment: native preference-purpose and target-write checks, supported cross-site/CSRF flows and other category evidence, eligible independent development/holdout cohorts, new fitting/evaluation, qualified Worker/API/report integration and migration 006. The generic Local projects UI does not yet execute this developer-owned native prototype automatically. **ML-Q remains open, with JS-002 the only qualified category.** No existing model, threshold, raw severity, report hash or blockchain flow was changed.

2026-10-28 ML-Q increment in progress: implementing scoped HttpOnly intervention checks for cookie JavaScript access. The developer-owned flow compares original state, target-only HttpOnly enforcement and restored state while checking authentication separately from functionality. It retains bounded read flags, same-scan bindings and conservative unknowns; no cookie values or scenario labels enter evidence. Validation and native integration are pending. No category qualification or model promotion is claimed.

HttpOnly increment checks so far: ten focused unit tests passed, and Chromium mechanism acceptance passed for required/incidental/absent reads, Cookie Store access, unknown/error/tamper/write/frame/navigation cases, cancellation and blocked redirect escape. Native Jingo editor controls passed in Chromium with the known cosmetic font CSS replaced locally in all three probe phases. The scoped result establishes that the tested editor works with HttpOnly; its anonymous-write error remains review-only. Adding a separate readable-cookie response scenario in that same family to verify CK-002 evidence against a real native flow. Edge/final regression checks are pending; no new eligible dataset, candidate or qualified category is claimed.

**Latest verified ML-Q status — 2026-10-27:** native Jingo login, protected-form access, cookie removal/restoration, authenticated write/readback, credential exclusion and same-scan signing passed in Chromium and Edge. Its anonymous write returned HTTP 500; this is retained as `needs-review`, not authorization/CSRF protection or a training label. Native cancellation acceptance verified the server stopped and disposable data was removed. All 265 TypeScript tests/48 suites passed; type checking, production build, Chromium/Edge collector mechanism checks and diff whitespace checks passed. Native fixture setup issues (required editor configuration, Windows Git line endings and title-prefixed storage) were corrected; failed assumptions did not become labels. No frozen JS-002 scanner/model/evaluator file changed. See `docs/ML_NATIVE_PROJECT_CHECKS.md` for the pinned source, lock, scope and commands.

**ML-Q is not closed.** One native application has been exercised as a developer-only prototype; zero eligible twelve-family development cohorts or new seven-category candidates/holdouts exist. The generic companion does not automatically enable this native adapter, and the factory-based source remains unsupported by its syntax inspector. Remaining: distinguishable functional scenarios for all seven categories, 8/4 independent development-family assignments with required class coverage, fitting and parity, genuinely fresh per-category qualification, qualified Worker/API/frozen-v2 integration and migration 006. Qualification remains **1/8 categories (JS-002 only)**. Existing raw scans, severity, GitHub decisions, archived reports and blockchain hashes remain unchanged.

2026-10-27 native ML-Q increment: pinned the MIT Jingo source at `10079c22d6cb66cfa0e7a91742c631fa0a153bd4`, installed its local dependencies and passed an initial real Chromium native login/protected-form/cookie-removal/restoration check. Added bounded developer-owned authentication probes, same-scan signed evidence and internal collector hooks; source/dependency provenance and reproducibility instructions are in `docs/ML_NATIVE_PROJECT_CHECKS.md`. This is one development-exposed prototype, not an eligible family cohort or qualification result. The flow remains developer-only; generic factory-source inspection, preference/JS-necessity/CSRF/other-category adapters, corpus, candidate/holdout and v4 release integration remain incomplete. Final cancellation/privacy/Edge/regression checks for this increment are pending; initial new unit checks found a test assertion incorrectly forbidding matching IDs and a fake-clock setup issue, both corrected before rerunning. ML-Q stays open: seven categories remain unqualified and no holdout has been consumed or model promoted.

Earlier ML-Q increment validation: all 258 TypeScript tests/47 suites passed; 14 evidence/dataset tests passed again after the final size guard. Type checking and production build passed. Chromium and Edge browser mechanism checks passed; the final navigation-during-probe regression also passed in Chromium. The actual companion pairing, committed two-page scan, signed save, existing PDF/frozen export, cancellation and restart flow passed. Developer registration/preparation commands passed exclusive-write, code-identity, tampering and empty-data exit-code checks. Final Edge checks and the production rebuild passed. No frozen JS-002 collector/model/evaluator files changed. Source metadata for three possible native Express applications was screened read-only; none is pinned, collected or counted as an eligible family. ML-Q remains open with 1/8 categories qualified in controlled scope; fixtures and infrastructure are not model qualification.

2026-10-27 ML-Q continuation: added a separate project browser collector without changing the frozen JS-002 scanner. It measures navigation-response continuity and actual inline CSP execution/blocking, preserves query-colliding request outcomes, blocks service workers/WebSockets, binds results to the captured scan digest and retains unknown application compatibility. Chromium and installed Edge mechanism acceptance passed, including report-only/meta/Trusted Types cases, privacy, cancellation and loopback isolation. Added developer-only signed-project dataset preparation, source/adapter/oracle binding, canonical family identities, template/implementation grouping, fixed partition checks, retained duplicate/overlap records and conservative conflict handling. Seven dataset tests passed. Registration/preparation commands and final integration regressions are being checked; no new application cohort, fitting, held-out prediction, qualification or v4 frozen-report release is claimed. Remaining: native functional adapters for all seven categories, eligible independent development sources, separate candidate/fresh holdout, runtime/export integration and migration 006.

Final companion checks for this increment: Chromium and installed Edge both passed keyboard registration, 390 px layout, navigation polling cancellation and disposable-test-environment checks in addition to the real scan/export/restart flow. Local test artifacts record their results; test services/temporary checkouts are cleaned up. The per-category missing functional facts are now explicitly listed in `docs/ML_PROJECT_QUALIFICATION.md`; no training or qualification is claimed from syntax inventories or unit fixtures.

2026-10-27 companion validation: the full regression suite passed 249 tests/46 files, followed by focused passing tests for deletion during saving, archived signing-key trust and seven-category conservative safeguards. Type checking/build passed. Real Chromium and Edge acceptance passed for UI/CLI pairing, exact committed two-page collection despite an uncommitted fix, signed provenance, raw PDF/current frozen report availability, cancellation and restart retention. Chromium additionally passed keyboard registration, narrow layout and polling cancellation. Test-only environment and temporary data-directory support are implemented; source inspection retains bounded hashes/counts and never supplies purpose labels. The companion is opt-in (`VYLNT_PROJECTS=local`), with commands in RUN_COMMANDS.md. ML-Q remains open: functional probes/oracles, the independent development corpus, new candidate/fresh holdout and qualified v4 frozen-report integration/migration 006 are not complete. No additional category was qualified; JS-002 and historical artifacts remain frozen. Project facts currently stay in the local signed sidecar, outside existing exports.

2026-10-27 project-companion increment: added evidence-v4 contracts with field provenance, unknown/incomplete states, bounded numeric inputs and Ed25519 scan/commit/config binding; local one-time repository pairing, serialized exact-commit jobs, progress/cancellation, durable provenance, owner isolation and deletion; a dashboard Local projects view and CLI registration. Added bounded Express syntax inventory (tracked files only, hashes/counts only) and narrow response-policy facts. These are development infrastructure: static syntax does not establish cookie purpose/CSRF/functionality, seven categories remain unqualified, and project facts are not yet included in frozen insight envelopes. Tests so far: 27 targeted evidence/service/API/gate tests plus three source-inspection tests passed; type checking and production build passed before the latest acceptance refinements. Real Chromium acceptance has demonstrated committed-code scanning despite an uncommitted fix, signed same-run evidence and unsupported-framework scope. Final export/cancellation/Edge checks remain in progress; initial browser fixture failures were browser-path/origin/endpoint setup issues, not qualification results. Remaining: functional category adapters/oracles, independent development corpus, separate candidate and fresh holdout, gated v4 Worker/API/report integration and migration 006. No new model training, holdout consumption or promotion occurred.

2026-10-27: implementing the approved project-backed qualification plan in `docs/ML_PROJECT_QUALIFICATION.md`: category contracts, evidence-v4 and a paired local exact-commit companion first, followed by independently sourced development data and fresh per-category qualification. Existing ML-Q2 changes are preserved. Seven categories stay unqualified; JS-002 and historical hashes/evaluators remain unchanged. No new test result or model promotion is claimed at this starting increment.

2026-10-27 ML-Q2 increment: implemented development-only evidence audit (`ml:audit:evidence`) and fixed extension request completion/failure correlation, including query collisions, redirects, stale documents, permission/pause checks, bounded session bookkeeping, SPA and worker restart. Aggregate evidence is in `ml/evaluations/evidence-audit-2026-10-27.{json,md}`; the six non-HttpOnly unqualified categories lack contextual development classes, while CK-002 has 17 opposed-label inputs and lacks change-required development coverage. Only JS-002 has both usable classes; no new candidate, holdout prediction or release promotion occurred. Seven categories remain open under `docs/ML_Q2_BUILD_PLAN.md`.

ML-Q2 checks: 59 Python tests; 234 TypeScript tests/43 suites in the complete single-worker run, followed by 13 passing background tests after adding service-worker restart coverage; type checking/build passed. Actual Chromium extension request outcomes, cache/restart and normal/6x CPU stress passed. Chromium and installed Edge Worker checks passed with 318 findings, cancellation/errors and a 523,855-byte report: typical inference 154/250 ms, boundary inference 112/125 ms, maximum main-thread timer gaps 11.3/12.2 ms. These are local headless measurements, not native accessibility or universal capacity claims. Full extension/CLI/dashboard regression passed, including permissions, private automatic sync, report/insights JSON/PDF downloads, saved versions, comparison, deletion, worker restart and no JavaScript errors. Sandbox filesystem/loopback denials and initial parallel subprocess timeouts were resolved for the passing runs; no model gates were weakened. Remaining: distinguishable development evidence, a separately registered candidate/fresh holdout, original per-category quality gates and release/export acceptance before further qualification. ML-Q remains open; JS-002's frozen qualified release is unchanged.

**ML-Q1 closed — 2026-10-26, JS-002 controlled scope only.** The fresh holdout, original numerical/safety/comparator gates, gated release, React/API agreement and runtime/export acceptance passed. Twelve selected source families completed 216 scenarios; eleven families remained eligible after prior-input rejection, with 80 change-required and 79 contextual distinct contexts. The frozen candidate achieved 100% observed precision, recall and coverage on that controlled suite; uncertainty intervals and limitations are published. Only script integrity is qualified. Other seven categories remain open under ML-Q; M1–M6 accepted demo closures are unchanged.

Final acceptance: all 54 Python tests; 230 TypeScript tests covered (229 passed in the full release run, then the corrected two-test historical-branding suite passed); type checking and production builds; complete extension/CLI/dashboard real-browser regression; 17-state UI/accessibility/keyboard audit; Worker stress/cancellation; staged authenticated save/reload/export/archive checks; desktop/narrow and three-page insights PDF inspection. Failed collection, prior repository alias and altered oracle were additionally rejected using copied private fixtures. The browser test's outdated no-qualified-category expectations were replaced with explicit JS-002/evidence-v3 assertions; final run passed with no JavaScript errors. Byte-bound evaluator/harness/source/evaluation line endings are pinned for checkout compatibility. No test data was used for fitting, no quality targets were lowered and the fresh holdout was evaluated only once. Public result and runtime records: `ml/evaluations/fresh-holdout-js002-2026-10-26.{md,json}` and `fresh-holdout-js002-runtime-2026-10-26.json`; developer commands are in `RUN_COMMANDS.md`. No new live Supabase, native Edge, blockchain or public deployment certification is claimed.

ML-Q1 release integration increment: the gated `ml:release:category` command verified the existing once-only evaluation, staged the actual React/Worker/API code and bundled JS-002 only after acceptance passed. The old experimental release is archived byte-for-byte; frozen JSON and original scan hashes remain separate and compatible. Evidence-v3 input, `vylnt-insights-v2` analysis and `vylnt-controlled-category-v1` decision identities are recorded. Automatic save, Worker/API equality, 71 observations -> one group/variant, local store reload, idempotency, archived/new versions, authenticated JSON/PDF downloads, raw PDF, missing/high-severity safeguards, altered-model fallback and unchanged gate decisions passed. Staged desktop/narrow screenshots and three rendered insights-PDF pages were inspected. Automated accessibility passed; production build, type check and all 54 Python tests passed. Worker stress: 318 findings in ~505 ms, maximum main-thread timer gap ~24 ms, 48 control ticks, cancellation/malformed-input checks passed. Sandbox localhost denials were retried with approval; test harness reload/auth/context assumptions were corrected. Full TypeScript run passed 229 tests with one outdated branding expectation; its corrected two-test suite passed against the archived release. Broader browser export regression is being completed after correcting a duplicated-label selector. No held-out prediction or qualification result was rerun. Seven other categories stay open; no new live Supabase, native Edge or blockchain certification is claimed.

ML-Q1 fresh evaluation passed on 2026-10-26: 216 collected scenarios from twelve pinned MIT sources yielded 175 retained family/context rows, 159 unique numeric contexts and eleven eligible fresh families. Seventeen prior-input rows were rejected and retained. The unchanged v4 candidate was registered and evaluated once; JS-002 model-only and safeguarded precision/recall/coverage were all 100%, with zero observed contextual mistakes. Wilson 95% intervals: precision/recall 95.42–100%, coverage 97.64–100%. These are controlled local script/CSP results, not universal or independently reviewed accuracy. Frozen logistic thresholds abstained throughout; rule-only precision was 50.31% with 100% recall. Aggregate evaluation is published under `ml/evaluations/fresh-holdout-js002-2026-10-26.json`. All 230 TypeScript tests/43 suites passed, and seven final evaluator lifecycle tests passed. Release packaging verifies the completion receipt and all frozen identities; staged React/API/export acceptance is running before bundling. ML-Q1 is not yet closed; seven other categories remain separately open.

2026-10-26 ML-Q1 implementation started under `docs/ML_FRESH_HOLDOUT_PLAN.md`: separate fresh application holdout for the frozen v4 JS-002 candidate, exposure registry, immutable external evaluation and gated controlled-category release. No fitting, consumed-test reuse or source-score selection is permitted. Other seven categories stay unqualified. Collection, gates and runtime acceptance are pending; no closure or release claimed.

ML-Q1 increment: historical dataset/family/numeric exposure inventory created privately; candidate remains unchanged. External evaluator registration, overlap/count preflight, exclusive consumption marker, failed-attempt retention and release-receipt checks implemented. Fifty-two Python tests passed. Twelve new MIT application families passed original baseline interactions; failed source candidates and the rejected current Awesomplete revision remain recorded, with its unchanged official v1.1.5 used instead. The full 216-case collection and freshness audit are next. Added conditional evidence-v3 controlled-category runtime shared by Worker/API, versioned insight schema and scoped UI wording; it is not bundled or qualified. Report/release regressions are being run; an initial test renderer signature mistake was corrected. No model predictions or quality claims on the external holdout yet.

ML-Q1 collection increment: all 216 scenarios passed across the twelve frozen independent source families in `ml/applications/fresh-holdout.sources.lock.json`. Each completed its original interaction and all 17 JS-002 configurations, including independent execution/CSP blocking. A prior sequential run stopped on a loopback TLS reset; its failure remains private, the oracle now avoids pooled sockets, and all twelve bounded application workers passed on their first attempts. Preparing the separate holdout now reproduces historical family identities, verifies source/oracle bindings and retains overlap rejections. Fifty-four Python tests and 42 focused release/report tests passed; full regressions are running. The evaluator smoke used previously exposed training rows only. Qualification remains pending, with no external predictions or active release change.

2026-10-26 ML-Q category/data development experiment completed. Preregistered `docs/ML_CATEGORY_CANDIDATE.md` before collection/fitting. All 140 real Chromium scenarios passed on the existing ten pinned applications, including original application interactions, CSP execution/blocking, script attributes, cookie lifetime/readability and independent server-authorization behavior. Twenty opposite-purpose cookie pairs have identical model inputs; both labels remain conflicts rather than teaching lifetime/name shortcuts. The new `ml:extend:corpus` command verifies completed oracle records, reproduces the original dataset with the original private family key and preserves all 190 old rows. Combined dataset: 300 distinct rows, 253 numeric variants, 11 actual families; 29 conflicts/25 development conflicts; train/validation/test 192/54/54 rows across 7/2/2 families. These are new contexts on existing applications, not new independent families.

Implemented category-policy v4 registration, balanced training/validation loss, same-input weighted logistic comparison, per-category validation calibration and explicit unsupported-category abstention. An eight-unit LSTM fitted once for 60 epochs/seed 42 on 96 JS-002 training examples; validation alone selected epoch 60 and thresholds from 32 examples. Seven unsupported categories always require review. The 55,101-byte artifact passed four Python/JavaScript numeric cases (maximum error 4.53e-8 against 1e-6) and 84 category/comparator decision cases. Hash-bound sidecars, disabled global fallback, immutable outputs, executed-parity gating and exclusive test consumption prevent accidental promotion/re-evaluation. Development validation is not held-out accuracy. The attempted qualification evaluation refused before any test predictions or consumption marker: only two previously seen holdout families, 30 previously seen numeric variants, and insufficient class/family counts. JS-002 has only 16 examples per test class across two families. All prior model/evaluation files and the active v2 display-only release remain unchanged.

Validation passed: 227 TypeScript tests/42 suites, 47 Python tests, type checking, production builds, real 140-case browser collection, exact old-dataset reproduction and candidate parity. Python mechanics tests cover unseen/seen inputs, changed test labels, frozen identity, missing/wrong parity and once-only evaluation; synthetic numeric test fixtures are never counted as application evidence. The initial unit run completed normally with delayed output; the unsandboxed repeat also passed. A scikit-learn constant-feature numerical warning occurred in unit fixtures; tests passed. Builds retain existing dependency comment-annotation warnings. No new UI/PDF/hosted/Supabase/blockchain/Edge certification is claimed. Results: `ml/evaluations/category-v4-2026-10-26.{md,json}`. Remaining: genuinely independent fresh application holdout (at least ten test families), sufficient category/class coverage, passing original quality/safety/comparator gates, then versioned runtime/release integration. ML-Q stays open; accepted experimental M6 closure is unchanged. No user dataset preparation, reviewers, Docker or deployment required for this controlled phase.

2026-10-26 ML-Q engineering validation completed; model qualification remains open. Added `ml:validate` with immutable outputs, dataset/category preflight, frozen candidate integrity, historical evaluation/count/gate/interval consistency checks, development-only diagnostics, Python/JavaScript parity and optional training reproduction in a separate directory. It never reruns held-out predictions, promotes a release or changes source-candidate parameters. Exit 1 explicitly means qualification blocked; exit 2 is an invalid input/execution failure. Corrected v3 collection briefs to honour controlled provenance rather than the waived human-review requirement; historical v2 policy remains unchanged. Published numeric/readable records: `ml/evaluations/validation-2026-10-26.{json,md}`; usage: `docs/ML_VALIDATION.md` and `RUN_COMMANDS.md`.

Measured checks passed: 223 TypeScript tests/41 suites, 40 Python tests (including artifact/approval/count/interval tampering, zero test inference and exact reproduction), type checking and production build. Frozen eight-unit LSTM and logistic comparator reproduced exactly with seed 42 / 60 epochs, including validation-selected checkpoint/calibration/thresholds; no reproduction test was consumed. Candidate size 54,469 bytes; 18 parity cases, max error 5.72e-8 against 1e-6. Chromium worker stress passed 318 findings/8 groups in about 417 ms, maximum main-thread timer gap about 21 ms, 40 control ticks, cancellation and malformed-input handling. Actual experimental-report acceptance passed 71 equivalent scripts -> one issue/one scored variant, worker/API identity, idempotent finalisation, saved JSON reload and both PDF generation paths. Temporary test servers closed. Initial sandbox temp/localhost denials were resolved by approved reruns; the first report-test invocation used an unsupported historical fixture and correctly had no score, then the documented reveal fixture passed with unchanged assertions. No new PDF visual inspection, native Edge, hosted Supabase, blockchain or GitHub certification is claimed.

Qualification still fails on the unchanged frozen cohort: only 2/10 held-out families; every category lacks 30 examples per class across three test families. Development audit additionally shows CK-002 has zero actionable training/validation examples after ambiguity filtering; six other categories have zero contextual development examples. JS-002 alone has both classes in both development partitions, but only 8/6 held-out class examples. Historical CK-002 recall remains zero. All original test files/model artifacts and the active v2 display-only release remain unchanged. Next: genuinely distinguishable controlled scenarios, broader real application-family coverage and a preregistered fresh holdout; never duplicate templates, relabel missing intent or retune against the published test to force closure. No new qualified category or real-world accuracy claim.

2026-10-26 product spelling correction completed at user request: maintained product branding uses VYLNT throughout dashboard/extension/ledger/PDFs, docs, commands, workflows, new export filenames and package metadata. Renamed contract source to `contracts/VylntReportAnchor.sol` and report-workflow template to `docs/examples/vylnt-report-check.yml`. New environment examples use VYLNT_* with legacy aliases retained and corrected names taking precedence; exact managed-hook-header compatibility and presentation-only conversion of frozen model names preserve existing installations and report hashes. Eighteen immutable model/report/evaluation fixture files remain byte-identical. Stable serialized schema/policy names and pinned `.vynlt/gate.json` are intentional compatibility identifiers, not display branding. No ignored credentials, saved reports, normal deployed chain or external copied repositories were rewritten. See docs/BRANDING.md.

Rename validation passed: type checking and production build; 223 unit tests / 41 suites; ten focused frozen-report/branding/PDF tests after the encoding correction; eight extracted workflow cases; 17-state UI/accessibility audit with zero violations and inspected corrected-brand screenshot; full extension/CLI/dashboard browser acceptance including export/import, sync, hash, ML cancellation and mobile layout; all 11 real Git/gate groups; renamed Solidity compilation and all 20 isolated real-chain/browser acceptance groups. Initial sandbox cache/network restrictions were resolved by approved reruns. A temporary UTF-8 conversion mistake in two presentation files was corrected and rebuilt. The first isolated EVM startup timed out; a subsequent run exposed an order-dependent test assumption, now checking sorted unique/consecutive nonces rather than enqueue-array order; all original nonce-safety assertions remain. Final chain acceptance passed, including live matching, tampering, restart/retry, deletion and reset rejection. Temporary test services closed; no hosted Supabase/GitHub configuration or native installed Edge re-certification claimed. Whitespace checks passed. Restart the application and reload the unpacked extension to load all new display text. ML qualification and report-demo limitations are unchanged.

2026-10-26 M4 closed in the user's explicitly accepted demonstration scope. User removed required-check/up-to-date protection, direct/force/deletion/bypass restrictions and maintainer/code-owner review as closure requirements, accepting the working scanner/Actions and uploaded-report fail/fix flow with dashboard workflow generation. Those administrative settings are waived, not newly verified, implemented or disabled. Earlier M4-open statements below are historical and superseded. Both fresh-build and uploaded-report modes remain available with their documented differences. Failed Actions checks do not necessarily prevent pushes/merges without separately configured enforcement. Uploaded reports still lack trusted source, current-code/freshness binding and live anchor verification; no stronger assurance is claimed. ML-Q remains separately open. This is a scope/documentation update only: no GitHub settings or application code changed; whitespace checks passed and application tests were not rerun.

2026-10-26 dashboard GitHub setup completed: added sidebar setup page with exact bundled report-check workflow copy/download, collapsed read-only source preview, announced clipboard-denial manual-selection fallback, per-step repository setup and branch-protection guidance. Previously selected saved scans download unchanged as the exact `vylnt-report.json` filename; without a selection the user is directed to History. Copy/download YAML contains no account credentials and requires no server endpoint; original report exports are unchanged. Theme is retained; unrelated refresh/import controls are hidden for this page. Docs: `docs/GITHUB_REPORT_SETUP.md`. Type checking, production build, eight extracted-workflow cases and whitespace checks passed. Expanded real Chromium UI audit passed 17 accessibility states with zero violations, exact YAML copy/download content and filename, controlled clipboard success/denial fallback, History navigation, unchanged selected report export, desktop/mobile light/dark, reduced-motion, 320px and enlarged-text checks; screenshots inspected. The screenshot harness restores scroll/focus before full-page capture. Evidence: `test-results/frontend-design/measurements.json`, `accessibility.json` and GitHub setup screenshots. Test-only servers closed; no full unit/chain/hosted/native clipboard regression rerun claimed. User has demonstrated actual hosted BLOCKED findings and confirmed a replacement report after the HTTPS fix passed; this supersedes the earlier unknown-error status below but is user-provided hosted evidence, not independent inspection. No remote writes, automatic repository edits, GitHub protection changes, SQL or ML policy changes. Uploaded-report trust/commit/freshness limitations remain visible and unresolved.

2026-10-26 uploaded-report diagnostics corrected after user's hosted run showed generic ERROR/exit 2. The supplied workflow now logs and records static error codes for missing file, malformed JSON, invalid format/hash, incompatible ruleset, each missing collection domain, invalid schema, inconsistent findings/score and metadata mismatch. It still fails closed and never prints uploaded evidence, cookies or raw validation values. Eight extracted-inline local cases passed again, including specific missing-file/JSON/cookies/findings/hash reason assertions; whitespace checks passed. The exact cause of the user's report error remains unknown until they rerun this updated file or provide the report for private inspection. GitHub connector access to the new repository returned 404; read-only Git HEAD succeeded, but diagnostic clone was declined by the user and was not performed. No remote changes or alternate repository download attempted. User will manually replace the workflow. Existing untrusted-report/commit/freshness limitations remain; hosted fix is not yet verified.

2026-10-26 manual uploaded-report demo workflow delivered: `docs/examples/vylnt-report-check.yml` is a single copyable workflow for the user's separate website repository. It reads committed `vylnt-report.json` (raw Export JSON or frozen Download insights JSON), uses pinned VYLNT shared validation/detection/gate policy, recomputes findings from observations and refuses inconsistent findings/score, incompatible rulesets or missing required coverage. Frozen exports additionally check self-contained content/source hashes; ML narratives never decide the gate. High/critical high-confidence findings block, other findings warn, invalid/missing reports error; sanitized decision-only artifacts and escaped job summaries expose fixes. Eight local checks passed: blocked, passed, edited findings, missing coverage, frozen blocked, broken hash, malformed JSON and missing file. The workflow's actual inline JavaScript blocks were extracted and executed locally. Root whitespace check passed; no hosted workflow, native extension or full regression rerun claimed. This is explicitly **demo report mode**, not completion of trusted dashboard-to-CI integration: uploaded observations are untrusted, hashes are not signatures, no live database/blockchain verification or repository/commit/freshness binding is performed, and modified evidence with recomputed hashes can pass. `commitBound: false` and this limitation appear in output. Existing fresh-build workflow remains unchanged; copying this file replaces that website's check with uploaded-report semantics. Trusted report provenance and commit binding remain unimplemented/open. No website files or GitHub settings changed automatically; user will copy the file manually. ML-Q and finer M4 policy verification remain open.

2026-10-25 separate website demo completed: created independent `signaldesk-demo/` Git repository (main, no remote/commit/push), excluded from the parent with a root ignore entry. Signaldesk has three minimal cybersecurity learning pages, local SQLite checklist, zero npm dependencies, loopback HTTPS, explicit insecure/remediated modes and its own pinned VYLNT Actions workflow/configuration. README contains local extension scanning, GitHub setup/protection and fail/fix demo instructions. Build passed. Private committed-copy acceptance verified all eight current rule categories and blocking on all three insecure routes; committed remediation passed all three routes. Cookie values were absent from raw exports. Real Chromium checked all pages at desktop/375px, zero serious/critical axe findings, no horizontal overflow, no page JavaScript errors, field-guide disclosures, checklist add/toggle/reload, text-safe rendering, rejected cross-origin mutations and SQLite contents after process shutdown. Desktop overview and mobile workspace screenshots were inspected. Evidence: ignored `.local/signaldesk-check-vOW3On/validation.json` and screenshots. Early sandbox/browser-path/audit-injection test failures were corrected in the private harness; application CSP remains restrictive in secure mode. All temporary test servers stopped; the actual demo is left stopped in insecure mode, ready for user startup. Hosted acceptance for this new repository remains for the user after push; no GitHub repository, credentials, automatic hook or public deployment created. Existing M4/ML-Q limitations below remain. Root whitespace checks passed; existing full VYLNT regressions were not rerun because its application code is unchanged. New independent source files remain uncommitted for the user to review and push.

2026-10-25 M4 functional GitHub acceptance verified: implementation PR #1 merged; main is protected and requires VYLNT security gate from GitHub Actions (app 15368), with status-check enforcement reported as everyone. User demonstrated GH006 direct-push rejection and confirmed the fail/fix merge demo works. Independently verified demo123 insecure revision f639390 failed at fresh scanning (run 40147536120), fixed revision 2f1bb24 passed (run 40147969307), and PR #3 merged as 396a1dc. Artifact upload succeeded on both runs; local working tree is clean with the demo in secure mode. These implementation, required-check and end-to-end demo items are complete. M4 remains open only for the original finer protection-policy acceptance: code-owner review, strict up-to-date, bypass and force/deletion settings cannot be inspected through the full protection API (403). Do not claim those fields verified from the public required-check metadata. Existing 221-test / 40-suite, 11 local gate-group and full Linux CI results remain historical; this update is documentation/read-only hosted verification, not a new application test run. ML-Q remains open; persistent chain history is not implemented and Docker/public deployment remain excluded.

The older M4 setup/pending entries below are historical and superseded by this current status.

2026-10-25 M4 implementation started: fresh exact-commit npm application scans, high/critical high-confidence rule gate, local pre-push hook and required GitHub check, no exceptions or ML-based suppression. Controlled HTTPS application first; CI/local reports stay independent of Supabase/blockchain. See docs/M4_BUILD_PLAN.md. GitHub repository read succeeds, but connector branch-protection read returns 403 (integration administration scope); hosted protection cannot yet be claimed. Implementation/acceptance pending; M4 remains open.

M4 increment 1: added strict versioned configuration, pure policy, clean commit checkout/build/start/scanning runner, bounded process cleanup, shared collector cancellation, coverage-budget refusal and separate raw/CI-insights/manifests/summaries. Added explicit managed hook commands, HTTPS demo, dedicated Actions check, CODEOWNERS, reusable workflow template and run instructions. Five policy/config tests and initial type/build checks passed. Real browser acceptance has demonstrated secure pass, insecure blocked despite an uncommitted fix, actual local push rejection and explicit local bypass followed by failing rescan; remaining cases are running. Initial fixture startup deadline was too short and now uses the normal allowance with safe diagnostic details. GitHub main reports protected=false and no rulesets. No hosted enforcement claimed.

M4 increment 2: all 11 expanded local Git/Chromium groups passed, including multi-ref rejection, preserved hooks, occupied-port safety, strict collection budgets, actual hanging-build timeout and cancellation after startup with port cleanup. Full suite passed 221 tests/40 suites; type/build passed. Published implementation branch c1d3ba3; actual Linux security run 40141350000 passed. A controlled insecure demo commit is being published next, followed by its fix, solely on that branch. Connector PR creation and protection administration return 403, so no PR or required-merge protection exists yet. Reusable workflow now pins the tested implementation SHA. M4 remains open.

M4 increment 3: actual insecure revision ca59117 failed Linux run 40141482946 at the fresh scan, with NET-001 high/high blockers and exit 1; artifacts still uploaded successfully. Restored the demo's committed source configuration to secure for the follow-up passing run. Prepared exact manual GitHub protection/PR instructions because connector write scopes deny those operations. No main-branch or protection changes made; closure remains pending hosted fix and protected-merge acceptance.

2026-10-24 insights layout follow-up completed: insights JSON is now a visible button directly beneath PDF, with shared alignment, independent format-specific progress text and no JSON disclosure. Prioritised issue titles, severity badges and expand controls use consistent grid columns; the heading has spacing below save status. Export payloads/handlers, raw downloads, analysis and anchoring policy remain unchanged. Type checking/build, whitespace checks and the 14-state UI/accessibility audit passed, including explicit stacked-button geometry/equal-width and aligned-badge assertions. Desktop screenshot inspected. Browser export selectors now target the visible JSON button. No full unit/chain/hosted/native rerun is claimed for this presentation change. Remaining scope stays M4 hosted acceptance and ML-Q qualification.

2026-10-24 uploaded report verification implemented: dashboard ledger navigation is now Verify report. Authenticated POST /api/reports/verify-upload compares uploaded canonical JSON against the owner's saved version. Insights verify trusted derivation/source linkage and the live anchor using the server journal; raw Export JSON checks only its separate database hash and is explicitly labelled database-only. Distinct mismatch, not-found, not-anchored and unavailable results prevent an offline node or deleted/other-owner report from being labelled tampered or blockchain-verified. No proof upload needed; files are transient and never imported/persisted/anchored. Maximum upload is 4 MiB including formatting; saved content limits are unchanged. Whitespace/key order and insights createdAt metadata remain outside content changes; PDFs are unsupported. Selection/navigation/sign-out cancel obsolete work. Standalone /ledger.html and raw/saved-report verification remain. Eight focused API tests, all 20 real-chain/browser acceptance groups, type checking, production build and whitespace checks passed. Original/edited/rehash/other-owner/oversized inputs, raw database-only and malformed-file UI, no-anchor/offline behavior and accessibility/narrow/200% layout were exercised; desktop screenshot inspected. The 14-state visual/accessibility audit also passed; no new hosted account or native verification claimed. Restarted only the API, preserving the local node. Docs: docs/REPORT_VERIFICATION.md. Remaining product scope stays M4 hosted acceptance and ML-Q qualification.

2026-10-24 standalone demo explorer completed: separate /ledger.html webpage with anonymous account rows and linked anchor cards, expandable transaction/actual parent-block details, refresh and bounded block-range navigation. Loopback-socket-only /demo-api/ledger joins live chain events to deployment-scoped local journal aliases without login; existing origin checks apply. It intentionally presents all known accounts' anchor metadata locally, never owner IDs, credentials, URLs or report contents. Unknown events remain visible in an Unassigned row. Grouping/arrows are off-chain presentation and account anchor order, not separate chains or assertions of adjacent blocks. Accounts without known jobs cannot be enumerated. Six focused API tests, all 20 real-chain/browser groups, type checking/build and the existing 14-state UI/accessibility audit passed; two test accounts have actual recent anchor cards, with accessibility/narrow/200% checks and inspected desktop/mobile screenshots. Offline/reset states stay unavailable. Restarted only the production API, preserving the node; live read returned one known account, three anchors and head block 4, and /ledger.html returned HTTP 200. No fake production accounts/anchors added, SQL migration, public deployment or new hosted/native account certification. Instructions: docs/BLOCKCHAIN_LEDGER.md. Remaining work stays M4 hosted acceptance and ML-Q qualification.

2026-10-24 ledger runtime correction: the API process had started at 00:20, before the ledger endpoint/build, while the browser served the new dashboard assets. Restarted only the identified VYLNT API process on :4318 using the existing environment; the :8545 blockchain node/PID remained unchanged. Read-only production deployment/service check returned live, head block 4 and three real anchor events. The restarted API reports Supabase storage and no startup error. No chain reset, redeployment, data mutation, credentials change or implementation change was needed. In-browser authenticated refresh remains for the user to confirm; no new hosted account/browser certification claimed.

2026-10-24 ledger viewer completed: separate authenticated Blockchain ledger dashboard page reads real contract events with bounded 200-block pagination, report SHA-256, block/parent hashes, transaction metadata, timestamps, deployment identity, ten-second refresh and current-range JSON export. Only public on-chain metadata is exposed across the configured local deployment, never journal owners or report evidence. Reads check deployment, receipts, canonical blocks and digest lookup; offline/reset/disabled states cannot appear live. Requests/timers cancel on exit/sign-out. The viewer does not recompute private report content; per-report Verify remains separate. No migration or public explorer is required. Type checking/build, five focused API tests, all 18 real-chain/browser groups and the existing 14-state UI/accessibility audit passed. Actual event/duplicate/range reads, JSON download, block links, offline/reset rejection, accessibility, narrow/200% layout and navigation were exercised; desktop/mobile screenshots inspected. Demo instructions: docs/BLOCKCHAIN_LEDGER.md. Limits: disposable local ledger, public digest metadata within this deployment, 200 blocks/500 events per response; dense ranges fail explicitly. No new hosted/native certification or full unit-suite rerun claimed. Remaining work stays M4 hosted acceptance and separate ML-Q qualification.

2026-10-24 download placement follow-up completed: restored visible Print / Save PDF and Export JSON actions at the top scan summary, plus a separate visible Download insights PDF button in Report insights. Removed the combined Downloads menu; insights JSON remains under its own disclosure. No hashing, anchoring, report content or Collection coverage changes. Type checking/build, all 16 real-chain/browser acceptance groups and the 14-state UI/accessibility audit passed; desktop/mobile screenshots were inspected. The audit now waits for React's filtered empty state before asserting it. No full unit-suite or hosted/native re-verification is claimed. Remaining product work is M4 hosted acceptance and the separate ML-Q qualification track.

2026-10-24 report follow-up completed: removed the redundant Original scan integrity panel while retaining original hashes/API and immutable exports. Blockchain now has an always-visible report section with status, Verify local anchor, proof download when available and failed-job retry; only detailed transaction metadata remains expandable. A visible preparation/save-error placeholder covers reports not yet finalised. Status distinguishes not configured, unavailable, queued, pending, recorded and needs-retry without claiming a live match from cached metadata. The user explicitly cancelled adding deletion to Collection coverage; that table is unchanged. Type checking/build, all 16 real-chain/browser groups, the 14-state UI/accessibility audit and whitespace checks passed; the report screenshot was inspected. No new hosted/native verification or full unit-suite rerun is claimed for this presentation-only change.

2026-10-24 dashboard cleanup completed in the existing theme: contextual Back (including imported reports), confirmed scan deletion from history/report details and website deletion from site cards, one Downloads menu, compact issue summaries, and expandable ML explanations, hashes, blockchain metadata, older reports, raw findings and original integrity. Automatic report generation/hash/anchoring and both PDF outputs are preserved. Emil design engineering guidance and Before/After decisions are recorded in `docs/DASHBOARD_CLEANUP.md`.

Final cleanup validation passed: 212 tests / 39 suites; all 16 real local-chain/browser acceptance groups (including compact defaults, Back heading focus, deletion Cancel/Escape/default focus, failure/retry and owner isolation); full extension/CLI/dashboard browser regression with imports, raw/insights downloads, comparisons, filtering/deletion, cancellation and no JS errors; 14 visual/accessibility states with light/dark, reduced-motion, narrow/320px and 200% text checks; type checking, production builds and whitespace checks. Light/dark report screenshots were inspected. No new hosted Supabase or native Edge certification is claimed. Restart the API and refresh the dashboard to load the new endpoint/build; no SQL migration is required.

Website deletion removes owner-scoped saved scan IDs across keyset pages in batches of 100, cascades notes/findings/frozen reports and cancels unsent anchors. Submitted chain records remain. Supabase's empty site bookkeeping row may remain under existing RLS, but its visible scan-derived website disappears; concurrent scans can recreate it. Partial failures are surfaced with refresh/retry. Other owners/sites are preserved in local/API and JWT-adapter tests. Remaining project work stays M4 hosted Actions and separate ML-Q qualification.

### Dashboard cleanup history (intermediate pending states superseded above)

Dashboard implementation increment: contextual Back, confirmed Delete scan/website actions, single Downloads disclosure, collapsed grouped ML issues/model details, latest-version compact blockchain status and expandable previous reports/raw findings/integrity are implemented in the existing theme. Website deletion uses exact-origin owner-scoped ID snapshots, keyset paging and 100-ID deletes with cascade/cancellation; no SQL migration or extra database privileges. Empty Supabase site bookkeeping rows can remain but have no visible scan group; concurrent new scans can recreate the website. Type checking and builds passed; ownership, pagination and browser/visual checks are pending.

Cleanup validation increment: six focused API/adapter tests passed, including 201-scan bulk deletion/cascade/cancellation, other-owner/site preservation, exact-origin validation and Supabase keyset traversal over 1,001 IDs. Existing browser tests now explicitly open the new disclosures before inspecting detailed evidence; their assertions are retained. Real-chain browser acceptance adds compact defaults, contextual Back and delete confirmation/cancel/failure/retry checks. Full UI/theme/accessibility and browser checks are in progress.

Cleanup acceptance progress: all 16 grouped real-chain/browser checks passed, including compact report defaults, contextual Back, individual/website deletion and cancellation/failure/retry with owner isolation. The full visual/accessibility audit passed light/dark, keyboard, reduced-motion, 320px reflow and 200% text checks with zero loading layout shift. Minimal report screenshot was inspected and the summary shortened further. The broad regression stopped on an obsolete expanded-model-detail expectation after feedback refresh; tests now reopen the deliberate disclosure. Final browser/unit/build checks remain in progress; no new hosted Supabase/native Edge checks are claimed.

2026-10-24 flow correction completed: generated React insights automatically finalise the immutable report, generate its combined SHA-256 and enqueue that digest for the existing local blockchain worker, without requiring a download click. Visible save/hash status, explicit save retry and scan/session cancellation are implemented. Raw PDFs, original hashes and honest pending/unavailable chain states are preserved.

Automatic-generation validation: completed React analysis posts hash-bound finalisation automatically, displays the server's canonical report SHA-256 and inserts/reuses the saved version. Downloads are optional. Scan changes/unmount abort the request and ignore stale results; save failures expose Retry report save. Initial history reads merge safely with new versions. Type checking/build passed; real-chain acceptance passed all 15 grouped checks, explicitly including report generation -> hash -> confirmed anchor without a download click. Full browser regression passed extension/CLI/dashboard, existing JSON/PDF/reload behavior, cancellation, narrow layout and no JS errors. Its request assertion explicitly allows automatic finalisation while continuing to prohibit prediction API calls. No confirmation is claimed when the node is unavailable; no raw PDF/hash or ML qualification changes.

M5 is complete in the user-approved **local blockchain development scope** (2026-10-23). A pinned Solidity contract on Hardhat, authorized writer and random deployment instance anchor only combined frozen JSON SHA-256 digests. Successful authenticated finalisation automatically enqueues a durable owner-scoped job; signed bytes precede broadcast, a single worker serializes nonces and recovers after restart/lost submission. Owner-scoped status/retry/live verification/separate-proof APIs and shared React/unpacked-extension controls are implemented. Raw scan verification, immutable report hashes/JSON and PDFs remain unchanged.

Final local acceptance passed 14 grouped checks, including actual contract authorization/duplicate immutability, concurrent same/different reports, signed-byte replay after simulated lost broadcast/API restart, exported/CLI tamper rejection, wrong block/event/deployment rejection, deletion, dashboard Retry recovery, real React and unpacked-extension controls, proof downloads, axe/narrow layouts, offline save/download, persisted five-attempt exhaustion and chain-reset rejection. Full browser regression passed extension/CLI/dashboard, raw/insights downloads/reload, cancellation and no JS errors. Type checking, builds and whitespace checks passed. Final unit-suite count is recorded in `docs/M5_BUILD_PLAN.md`; prior full run passed 209 tests / 38 suites. Private acceptance summary/screenshots are under `test-results/blockchain-acceptance.json` and `.local/blockchain-acceptance-*`.

The normal loopback :8545 node is running and a contract is deployed; existing ignored `.env` enables local anchoring without altering account credentials. Restart the API and reload the unpacked extension to use the new build. No SQL migration is needed. See `docs/M5_ACCEPTANCE.md` for setup, reset/redeploy and verification commands.

Limits: disposable local chain, one API process/journal, no independent public attestation or permanent chain history, no cross-machine anchor metadata sync and no erasure of submitted transactions. No new hosted Supabase/native Edge/public network/PDF certification is claimed. ML-Q remains open, Docker/public deployment remain excluded. Next milestone is remaining **M4 GitHub Actions hosted acceptance**.

### M5 implementation history (pending states below are superseded by completion above)

M5 implementation started: approved local-only Hardhat contract, automatic frozen-insights anchoring, durable journal, owner-scoped live verification/proof APIs and client controls. See `docs/M5_BUILD_PLAN.md`. Dependencies, implementation and real-chain/browser checks are pending; M5 remains open. No Docker/public deployment or ML qualification changes.

M5 increment 1: added pinned Hardhat/ethers/solc, Solidity immutable writer/instance registry, Node-24 launcher, compile/deploy/verify commands, server-owned signed-transaction journal, automatic enqueue, status/retry/proof/live verification endpoints and graceful optional configuration. Raw report bytes/endpoints remain unchanged. Type checking, real-chain acceptance, UI and recovery tests are pending; no on-chain success claim yet. npm reported dependency advisories; review before closing this milestone.

M5 increment 2: shared accessible saved-version proof controls now serve React and the extension; they distinguish recorded transactions from live verification, expose retry/proof download and abort polling on selection/session changes. Initial type checking caught a literal-type mismatch and was corrected. Compiler succeeded; first Hardhat launch exposed a skipped optional native binding, repaired using the bundled Node-24 npm runtime. The new solc/tmp advisory is patched through a scoped override; two pre-existing moderate Vitest advisories remain. API and real-chain acceptance checks are being added; M5 remains open.

M5 increment 3: real isolated EVM and browser acceptance passed 11 grouped checks, including signed-transaction recovery after simulated lost broadcast, API restart, tamper/wrong receipt/deployment rejection, duplicate immutability, deletion, React/unpacked-extension proof controls, axe/narrow layouts, offline downloads, persisted five-attempt exhaustion and reset rejection. 209 tests / 38 suites, type checking and builds passed. Screenshot inspection found CSS overriding the Retry button's hidden attribute; scoped hidden styling fixes it. Added actual CLI acceptance and final rechecks; M5 is still open pending those. Frozen JSON/PDF content remains unchanged; no hosted/native/public certification.

M5 setup/compatibility increment: normal-access local node started and contract deployed at :8545; ignored `.env` now enables local anchoring while preserving existing credentials. API restart and extension reload are required to use the new build. Added usage/API/pipeline documentation. Dedicated acceptance subsequently passed 12 grouped checks including the public CLI. Full browser regression detected its obsolete two-read assertion; it now explicitly allows exactly saved scan + version history + anchor status (still no prediction API). Final distinct-nonce, UI Retry, malformed-export and full-browser rechecks are running; M5 remains open until complete. Sandbox loopback deployment failed; normal-access deployment succeeded without modifying any real report.

## Experimental M6 closed — 2026-10-22

The user explicitly approved closing **M6 as experimental implementation**, with model qualification tracked separately as **ML-Q**. ML-1 through ML-7 engineering is complete in that scope. This does not approve a relevance model or waive any numerical/safety gate. No category is qualified and no model may hide findings or change rule severity.

The final corpus contains ten MIT-licensed applications and 90 pinned source files. All ten complete 17-scenario suites passed (170 cases), including original application interactions and independent controlled configuration/browser checks. Labels apply only to the exact controlled target; unrelated upstream findings remain unlabelled. An attempted eleven-application aggregate refused preparation after CSS Diner failed its level-advance check; that failed run is retained and excluded before fitting. Harmony, Blockrain, missing-build/licence and externally dependent candidates are also excluded. Source repositories with the same imposed harness do not prove independent security situations.

The frozen expanded cohort has 193 source annotations, 190 distinct family/context/label rows, 163 numeric variants and 11 actual families (ten upstream plus the earlier generated template). There are 19 audited conflicts, 17 in development. Fixed train/validation/test partitions contain 126/32/32 rows across 7/2/2 families; conflict/uncertainty filtering leaves 86/28 eligible binary training/validation examples. Family identities, component grouping and split seed were not changed to obtain favourable results.

An eight-unit LSTM and same-input logistic comparator fitted with seed 42 and 60 epochs; validation alone selected epoch 60, calibration and two thresholds. The 54,469-byte v3 candidate passed 18 executed Python/browser parity cases (maximum absolute error 5.72e-8; tolerance 1e-6). Its frozen test was evaluated once. All eight categories fail qualification: only two test families versus ten required, insufficient per-category 30/30 examples across three families, and CK-002 (HttpOnly) recall 0 with unsafe contextual predictions in offline evaluation. Exact counts, model-only/guarded metrics, comparator results, intervals and failed gates are published in `ml/evaluations/expanded-v3-2026-10-22*.json`. Do not retune against this consumed test.

The expanded v3 candidate remains developer-only and is not bundled. The existing v2 `vynlt-controlled-signal-v1` display-only release continues automatic React analysis, with zero approved categories and no relevance/severity changes. Raw Print/PDF and frozen insights JSON/PDF remain separate. Historical releases and evaluations are preserved. The controlled v3 policy records the user's human-review waiver honestly; legacy reviewed v2 policy is unchanged.

Validation: 206 TypeScript tests in 37 suites, 26 Python tests, type checking and production builds passed. Concurrent browser/training/test workloads initially caused timeouts; the clean serial suite passed with unchanged assertions and timeouts. The final corpus test file separately passed all seven tests. No new hosted Supabase, installed Edge/Narrator, accessibility or rendered-PDF certification is claimed for this increment.

Publication checks confirm that all four expanded numeric records match their original frozen bytes, the source lock contains ten MIT applications / 90 files, and all eight qualification flags are false. Git attributes preserve frozen JSON bytes across checkout; historical/private artifacts are unchanged.

See `docs/ML_QUALIFICATION_PLAN.md` for the separate open quality track and `docs/ML_CORPUS_EXPANSION.md` for provenance/exclusions. Next product milestone: M5 blockchain anchoring of the frozen report hash, then remaining M4 GitHub Actions acceptance. Docker and deployment remain excluded. Users need not prepare datasets, recruit reviewers or provide more credentials/SQL for this closure.

### Prior checkpoints (historical; experimental closure above supersedes parent status)

Latest M6 development increment (2026-10-22): implemented the preregistered 46-column evidence-v3 experiment with target-specific simple enforced CSP source constraints, private preparation, isolated PyTorch training and hash-bound numeric candidate verification. CLI/extension collection now records optional `cspEvidenceComplete` before truncation/privacy transforms; older, truncated, unsupported or contradictory policy evidence stays unknown. Stronger browser comparison caught and corrected an origin root-slash sanitisation mismatch; the failed run/initial diagnostic candidates were retained and never evaluated or released. The corrected run passed all 51 application scenarios, including enforced CSP violation events, fixture execution/non-execution, metadata agreement and original application interactions.

The frozen v3 cohort contains 78 rows / 59 tensors / four actual families; train/validation/test have 32/16/30 rows across 2/1/1 families, with 28/14 eligible development examples. Eight-unit LSTM and same-input logistic comparator fitted with seed 42 / 60 epochs; validation selected epoch 60, calibration and thresholds. The 53,472-byte candidate passed 18 Python/browser parity cases (maximum error ~5.77e-8, tolerance 1e-6). Public readiness/training/parity records are in `ml/evaluations/controlled-v3-2026-10-22-*.json`. The preflight still lacks ten test families and the per-category 30/30 examples across three families, so the v3 holdout was not consumed. Zero categories approved; active v2 display-only release, historical tensors/reports and quality/split policies are unchanged. V2 release policies explicitly reject v3 artifacts.

Final checks passed: TypeScript, 203 tests / 37 suites, 25 Python tests, production builds and full automated browser acceptance (extension/CLI CSP coverage, permissions/privacy, API sync, dashboard, existing report downloads/reload and no JavaScript errors). Reproducible v3 numeric fixtures cover all eight categories at 2/26/50/74 steps. Initial sandboxed Vitest could not rename its temporary files; the normal-access rerun passed. No new hosted Supabase, native Edge/Narrator, physical-device or rendered-PDF recertification is claimed. M6 is not fully closed: next work is genuinely broader independent scenario/family coverage, conflict-aware preparation, then one frozen category evaluation and qualified-release integration if the unchanged gates pass. This remains VYLNT developer work; no user training data or reviewer recruitment is required. See `docs/ML_EVIDENCE_V3.md`.

Active v2 release checkpoint (2026-10-22): an independently checked persistent readable-preference fixture made that controlled cohort fit-eligible without relabelling earlier ambiguous cases. Both 33-case suites passed (66 scenarios). Frozen dataset: 60 rows / 41 tensors / four families; train/validation/test rows 20/10/30, with 16/8 eligible binary development examples. An eight-unit LSTM and same-input logistic comparator were trained with seed 42 for 60 epochs; validation selected epoch/calibration/thresholds, then the frozen test was consumed once. The 52,581-byte model passed 16 Python/browser parity cases (maximum error about 6.9e-8). Public numeric evaluation/training records are in `ml/evaluations/`.

The separately identified `vynlt-controlled-signal-v1` release is now bundled and runs automatically in React. It displays bounded scores only for supported non-conflicting evidence contexts, retains every assessment/severity/finding, approves zero categories and never performs contextual de-emphasis. Frozen reports include model/candidate/evaluation identity and policy; previous null/reviewed reports and same-weight archived release metadata remain verifiable. Actual PDF fixture: 71 equivalent scripts -> one issue/one scored variant, two insights pages versus 72 full-data pages, with JSON reload verification and visual/text-bounds inspection. Initial validation passed 165 tests, 22 Python tests, TypeScript/build and large-worker stress (~302 ms, ~21.6 ms main-thread gap). Full browser acceptance and all 14 accessibility audit states passed after updating the obsolete pre-model assertion. The scored browser Worker/API hash, idempotent finalisation and JSON retrieval after reload also passed; the helper origin was explicitly allowlisted after its first test-only 403.

ML-3 controlled-data engineering and ML-4 train/evaluate/experimental-report implementation are built. **M6 full quality acceptance remains open**: no category passed the agreed precision/recall/count/family/comparator gates; the test cohort has only one generated family and CK-002 recall is zero. Display-only integration is not a qualified model or proof of useful real-world triage. Further developer-owned data/model work remains; independent human review is not a user requirement. Docker, deployment and blockchain are unchanged.

### Earlier implementation checkpoints (superseded by the current status above)

Scope override — 2026-10-22: the user explicitly removed independent human review from the current ML milestones. Developer-owned controlled specifications plus automated network/browser oracles are now the label source for this experimental phase; recruiting reviewers is not a remaining user task or a prerequisite for continuing ML-3/ML-4. Preserve controlled provenance and report measured performance only on that cohort. Do not fabricate review declarations or relabel controlled data as human-reviewed. Earlier review requirements below are historical for the original reviewed-release scope. Current remaining work is distinguishable contextual development coverage, frozen application-family evaluation and a separately identified experimental release path; the existing reviewed-release policy remains unchanged until that new path is implemented/tested. Data conflicts, abstention, parity and measured model gates still apply. ML-3/ML-4 are not marked complete merely by removing review.

Latest approved ML-3 collection increment (2026-10-22): pinned MIT-licensed 2048, TodoMVC and reveal.js sources with 23 source-file hashes; two complete runs passed all 33 controlled application/configuration scenarios. Prepared 30 new rows / 24 variants / three upstream families. The combined snapshot now has 59 rows / 37 variants / four families with 12 conflicts, frozen train/validation/test counts 20/10/29 and zero independent human reviews. Fitting remains ineligible: contextual development cases have conflicting observable inputs, and the only test family is the older generated template. Source licences/provenance, exact harness hash, private controlled review packets, fixture-value/text exclusion and narrow localhost scope are recorded. Full validation passed 159 tests in 33 suites, TypeScript/build and the focused browser scope check. See `docs/ML_APPLICATION_CORPUS.md`. Controlled ML-3 data coverage advanced; independent review, representative observable training coverage and ML-4 qualification remain open. No active model, Docker or deployment change.

2026-10-22 continuation: ML-3 now produces a private collection brief describing transitive shared-input components, reviewed-data class/family deficits and unobservable conflicts without changing partitions or labels. ML-4 now reports paired application-family bootstrap uncertainty for raw/guarded LSTM, logistic and rule-only results. Release staging executes hash-bound Python/browser parity rather than accepting hashes alone. A reproducible numeric fixture checks all eight categories at 2/26/50/74 steps. Final validation passed 154 tests in 32 suites, type checking and 22 Python tests; production builds passed during this increment. The initial sandboxed Python run failed on temporary-directory permissions; the normal-access rerun passed. No UI/PDF/hosted recertification was needed or claimed. The user confirms no application repositories or independent reviewers are available; genuine application review and candidate qualification still prevent completing ML-3/ML-4. Active evidence-v2 remains null.

M1-M3 remain complete in their documented development scope. ML-1, ML-2, ML-5, ML-6 and ML-7 reporting infrastructure are implemented and verified. ML-7 now passes live Supabase migration-005 acceptance: 14 checks with two owners, no skips/failure/cleanup failures. These cover frozen finalisation, stale-analysis rejection, idempotency, authenticated JSON/PDF, direct immutable storage/RLS, cross-owner isolation and cascade deletion. The private helper discarded sessions after the run and was stopped.

ML-3/ML-4 now include private hash-bound review packets, paired independent-review declarations, agreement/disagreement auditing, immutable feature-only preparation, readiness diagnostics and application-family consistency. Test-only labels cannot enter learned conflict safeguards. Candidate manifests bind model/calibration/thresholds/comparator/parity before evaluation; release/runtime share bounded qualification gates and require evaluation-policy revision 2. Disabled thresholds explicitly abstain under floating-point saturation. Legacy evaluations are not releasable.

Validation: TypeScript/build and 148 tests in 31 suites passed; 17 Python tests passed, including held-out-label invariance of weights/calibration/thresholds, candidate tampering and readiness. The corrected localhost suite passed all 32 scenarios. A private controlled review packet has two pending cases and no decisions. The final built-worker smoke passed: 318 findings, about 251 ms analysis, 25.6 ms maximum main-thread heartbeat gap, working controls, no obsolete messages and handled malformed input. Prior 14-state accessibility, browser and PDF acceptance remain documented; no new native Edge/Narrator certification is claimed for this increment.

The current controlled generator uses one shared application template. Earlier per-rule grouping overstated independence; the corrected cohort has one family, 29 distinct labelled rows, 13 tensors and nine audited conflicts. The fixed split places that family in test, with no train/validation families, so fitting is refused. There are zero independently reviewed application targets and no category is approved. The active evidence-v2 release stays null; users get evidence summaries and separate full-data/insights PDFs. Genuine application diversity, independent reviews and measured held-out qualification remain ML-3/ML-4 work. Ordinary users never prepare datasets. See `docs/ML_BUILD_PLAN.md`, `docs/ML_DEVELOPER_WORKFLOW.md` and `docs/ML_EVALUATION.md`.

Docker/deployment remain excluded. Blockchain and remaining GitHub Actions acceptance follow ML. Earlier intermittent local-store cleanup 503s, existing PDF font-descriptor parser warnings and harmless dependency annotation warnings retain their documented limitations; no production-load or physical-device certification is claimed.

## Milestones and remaining work

Execution order agreed on 2026-10-21: **ML (M6 plus combined-report prerequisites) → blockchain (M5 anchoring/verification) → GitHub Actions (remaining M4 acceptance)**. Milestone numbers stay unchanged for existing references. M1–M3 are complete in their documented scope; Docker and deployment remain excluded.

User-confirmed target pipeline: extension metadata → shared rules → authenticated API/Supabase → React ML → final report with ML insights → SHA-256 of the final report → blockchain anchor. See [docs/PIPELINE.md](docs/PIPELINE.md). The existing rule-report hash predates ML and does not yet represent this final combined report. Versioned combined-report finalization, local persistence and export are implemented. Hosted migration-005 acceptance is complete. Experimental M6 and local M5 are closed; model qualification is separate. Next is remaining GitHub Actions acceptance.

- [x] M1 — Browser scanner foundation (automated Chromium plus user-confirmed native Edge acceptance)
  - [x] Review supplied roadmap and establish project conventions.
  - [x] TypeScript project, shared observation/finding contracts, build and test scripts (checks pass).
  - [x] Header, cookie, mixed-resource, and script-integrity rules; deterministic scoring and deduplication.
  - [x] Manifest V3 collection, navigation association, pause/resume, rescan and SPA path snapshots.
  - [x] Side-panel scan controls, detailed evidence/remediation, cloud history and JSON export; retired popup/local disk history.
  - [x] Controlled localhost HTTP/HTTPS labs and automated rule/privacy tests.
  - [x] Real Chromium checks: TLS findings, refresh, two tabs, pause/resume, SPA, worker restart, panel document, automatic upload and toolbar side-panel configuration.
  - [x] Busy-page observer-budget regression and isolated collector baseline; full-extension IPC/background/session-store correctness and local paired stress baseline, including simulated 6x CPU slowdown. Physical low-end-device/battery measurements remain ongoing work.
  - [x] Native installed-Edge side-panel open/close/reopen, optional site permission grant/revoke/re-grant and browser restart/rescan: user confirmed all three checks passed on 2026-10-21. Not independently observed and not installed-Chrome certification.
  - [x] Automated Chromium HTTP 304 revalidation, cache-bypassed changed headers, back navigation and full browser restart/session/pause recovery; repeatable harness and acceptance record in `docs/M1_ACCEPTANCE.md`.
- [x] M2 — Express API and Supabase PostgreSQL (development scope; production rollout deferred by user)
  - [x] Authenticated local API, durable local store and owner-isolation tests.
  - [x] Supabase Auth adapter, PostgreSQL migration, RLS policies and atomic ingestion RPC source.
  - [x] Validated scan ingestion, list/detail APIs and domain summaries.
  - [x] Consistent request/generated-report size limits, PostgreSQL byte-boundary parity, structured 413 errors and terminal snapshot retry handling.
  - [x] Automatic extension upload with immutable snapshots, bounded retry/backoff, idempotent submissions and integration tests.
  - [x] Configure supplied Supabase project; user reports migration applied; verify Auth connectivity and anonymous table-access denial.
  - [x] Dedicated Supabase login, registration/confirmation guidance, memory-only token refresh and sign-out in dashboard; sign-in for extension uploads.
  - [x] Verify authenticated persistence/RPC behavior in the real project after user sign-in: private verifier passed eight single-account checks on 2026-10-21.
  - [x] Verify two-user RLS in the real project with distinct confirmed accounts: all nine live checks passed on 2026-10-21, including cross-owner API denial and direct table-read isolation; no skips/cleanup failures.
  - [x] Per-process API request/write limits with retry-aware extension sync and controlled browser recovery tests.
  - [x] Database pagination/aggregates beyond 1,000 scans, with local SQL/API tests.
  - [x] User reports the requested SQL script applied on 2026-10-20 (latest instructions were migration 003 after 002); deployment not independently inspected.
  - [x] Verify hosted pagination/comparison RPC availability, signed-in history, totals and comparisons with the user's real account (migrations 002/003).
  - [x] Reproducible local PostgreSQL query and FileStore read/write baselines with synthetic data and result/access checks.
  - [x] Migration 004: stored page-lookup key/index, exact-URL/RLS preservation, long-URL regression and before/after local measurements.
  - [x] User reports migration 004 deployed through the Supabase SQL editor on 2026-10-20.
  - [x] Verify migration-004 generated lookup-column availability and hosted exact-page comparison behavior with a 3,500-character path.
- [x] M3 — React dashboard and reports (desktop Edge, English/accented European scope)
  - [x] Connected overview, sites, scan/finding details, paginated history, settings and deletion.
  - [x] Review feedback, JSON import/export and responsive layout in the dashboard.
  - [x] Saved-finding decisions/notes directly in the extension, with failed-save draft recovery.
  - [x] Same-URL comparison selection across history pages in both clients, with shared evidence/coverage comparison logic.
  - [x] Browser print/PDF layout and print action in the optional dashboard.
  - [x] First Apple design increment across side panel/dashboard; responsive themes, larger controls, stable interaction feedback and controlled browser validation.
  - [x] Full frontend-design visual pass across existing extension/dashboard screens; shared local typography, coverage matrix, themes and evidence hierarchy.
  - [x] Desktop Edge keyboard/Narrator/200% zoom acceptance reported by user; automated axe/theme/contrast/reflow and simulated slow-font/loading baseline. Touch excluded by user; installed Chrome, other readers and physical slow devices remain ongoing compatibility work.
  - [x] Bounded same-page history trend charts in the extension, with coverage-aware interpretation and readable values.
  - [x] Dedicated saved-report PDF generator accessible from the extension, with multi-page and empty-report pagination QA.
  - [x] Separate full-data Print/PDF (all severities/evidence, no generated actions/ML) and saved insights JSON/PDF from React. Owner-scoped finalisation verifies trusted facts/templates; immutable versions survive reload. Migration 005 and frozen-report ownership/persistence passed hosted acceptance.
  - [x] Reproducible local PDF latency and sampled process-tree memory baseline for typical/medium/large synthetic reports.
  - [x] User-confirmed Edge/Narrator PDF reading/200% zoom; two fixtures pass automated PDF/UA-1 profile and ten pages pass visual/text QA, including accented European samples. Other languages/readers and arbitrary report shapes are not certified.
- [x] M4 — Automated scanner and GitHub Actions (user-accepted demonstration scope; closed 2026-10-26)
  - [x] Playwright CLI using shared rules, JSON artifacts, confidence/severity gate and documented exit codes.
  - [x] Real secure/insecure fixture regression: secure passes, insecure fails; CLI/extension rule IDs agree.
  - [x] GitHub Actions workflow with test artifacts, minimum permissions and Node setup.
  - [x] Fresh exact-commit npm-site runner and explicit pre-push hook; all 11 Windows/local Git/Chromium groups and full Linux CI passed.
  - [x] Actual hosted failing insecure revision followed by passing committed fix, with summaries/artifacts. No risk exceptions in this release.
  - [x] Implementation PR #1 reviewed/merged by the user; main reports protected with VYLNT security gate required from GitHub Actions, enforced for everyone.
  - [x] Protected direct push rejected (user screenshot GH006); user-confirmed failing/fixed merge demonstration, independently corroborated by demo123 failing run 40147536120, passing run 40147969307 and merged PR #3.
  - [x] Uploaded-report check, fail/fix demo confirmed by the user, and dashboard workflow copy/download plus exact report filename export. Eight workflow cases and 17-state UI/accessibility audit passed.
  - Waived by user on 2026-10-26: required-check/up-to-date protection, direct/force/deletion/bypass restrictions and maintainer/code-owner review as completion requirements. Unverified settings remain unverified; no remote protections were removed. Check failure alone does not guarantee merge rejection.
- [x] M5 — Tamper-evident reports (local blockchain scope; accepted 2026-10-23)
  - [x] Canonical JSON and SHA-256 consistency check with API/UI and tamper unit tests.
  - [x] Versioned final-report contract, frozen evidence/model/policy identity, authenticated local persistence and JSON/PDF export; local PostgreSQL/Supabase implementation and hosted migration-005 verification passed.
  - [x] Canonical SHA-256 of the combined frozen report, separate original scan hash, idempotency, tampering and archived-model verification tests. No blockchain anchoring claimed.
  - [x] Solidity contract, local Hardhat EVM deployment, authorized writer/random instance and separate transaction metadata; real-chain acceptance passed.
  - [x] Automatic durable submission, owner-scoped anchor/verify/proof/retry APIs and React/extension controls; unchanged/tampered, restart, retry and reset demonstrations passed on an isolated local chain.
- [x] M6 — ML report insights (experimental development scope; user-approved closure 2026-10-22)
  - [x] ML-1 contracts, documented schemas, complete example report and acceptance fixtures.
  - [x] ML-2 target-specific evidence, explicit unknowns, optional script attributes, bounded structural sequences, identity invariance and one inference per unique variant.
  - [x] ML-3 initial controlled-suite/preparation infrastructure: independent network oracle, private provenance, deduplication/conflict and reviewer-agreement audits, frozen family splits. Thirty-two scenarios from one shared template family; earlier per-rule family counts are superseded.
  - [x] ML-3 approved upstream controlled corpus: three pinned MIT-licensed applications, 23 hashed source files, 33 independently checked configuration/browser scenarios, private packets and combined 59-row/four-family dataset with frozen audits. No upstream install scripts or live-site scans.
  - [x] ML-3 controlled dataset/provenance/split workflow: persistent preference case has independent attribute/browser checks; 60 frozen rows / four actual families, audited conflicts and eligible development classes. Prior ambiguous cases retained; human review excluded by user.
  - [x] ML-4 experiment infrastructure: eight-unit PyTorch LSTM, same-input logistic comparator, validation-only checkpoint/calibration/two thresholds, frozen candidate hashes, development-only safeguards, exclusive test evaluation, per-category metrics/intervals/shared release gates and numeric browser parity.
  - [x] ML-4 eligible controlled candidate, same-input comparator, frozen once-only evaluation and explicit display-only experimental release; numeric browser parity and trusted JSON/PDF integration tested. Failed category gates are published, not bypassed.
  - [x] Expanded ML-3/ML-4 controlled experiment: ten applications / 170 passing scenarios, frozen 190-row cohort, once-only v3 evaluation and published failures/parity; developer candidate is not released.
  - [x] Evidence-v3 controlled experiment: explicit CSP collection coverage, six new browser-oracle profiles per app, 51 passing scenarios, 78-row/four-family frozen cohort, bounded LSTM/logistic fitting and 18 executed parity cases. Coverage preflight fails; no v3 test consumption, release promotion or quality claim. Source/metadata correction and initial diagnostics documented.
  - [x] ML-5 versioned evidence-based templates, conservative aggregation, high/critical visibility, affected counts and compact contextual section.
  - [x] ML-6 automatic scan-scoped React worker, cancellation, compatibility/qualification checks and evidence-summary fallback; browser regression passed. Separate built-worker stress also passed within the scan-size limit.
  - [x] ML-7 local immutable finalisation, original/combined hashes, ownership, idempotency, JSON/PDF retrieval after reload, tampering rejection, model archive lookup and cascade deletion; 1 MiB explicit limit.
  - [x] ML-7 Supabase 005 live verification with two owners: 14 checks passed, zero skips/failures/cleanup failures. Keep historical decision/catalog implementations when introducing future versions.
  - [x] Retain legacy logistic/LSTM parsers and synthetic parity fixtures for developer regression. Synthetic HTTP export retired; synthetic results cannot classify real findings as harmless.
- [ ] ML-Q — Separate model qualification track: seven categories still require the original family/count/precision/recall/coverage/comparator/safety gates. JS-002 passed its fresh controlled holdout and release acceptance; this does not establish universal accuracy. See `docs/ML_QUALIFICATION_PLAN.md`. This does not reopen experimental M6.
  - [x] ML-Q1 — Fresh JS-002 holdout, once-only external qualification and controlled-category release; eleven eligible fresh families, 159 distinct contexts, original gates and React/API/export/legacy acceptance passed (2026-10-26).
  - [x] Reproducible engineering validation, controlled-policy-aware class/family preflight, immutable audit records, development diagnostics and exact training reproduction (2026-10-26). Published audit remains qualification-blocked; no new model released.
- [ ] Ongoing — Browser performance measurements, extended privacy/regression coverage and literature/report alignment.

## Deferred deployment work — outside the current development milestones

The user explicitly does not want deployment now or Docker implementation. Do not introduce containers or require Redis for current localhost development. Revisit these items only when deployment/scaling is requested; they remain unverified, not completed:

- [ ] Verify optional shared Redis/gateway limits with a real service and the intended replica/proxy setup. Current local operation uses the existing in-memory limits.
- [ ] Inspect hosted migration-004 physical index/plans and measure comparison behavior under representative production load. Hosted column/RPC behavior is already verified.
- [ ] Establish deployment targets, workload/concurrency/budgets, then measure capacity and decide whether cursor pagination/cached aggregates are warranted.

## Decisions

- On 2026-10-22 the user explicitly approved closing experimental M6 and tracking model qualification separately. ML-Q retains all original numerical and safety gates. No category is qualified; active v2 scores remain display-only. Expanded v3 is an unbundled developer candidate. Blockchain M5 is next, then GitHub Actions M4.

- On 2026-10-21 the user clarified the intended ML behavior: extension-collected security information is analyzed by an LSTM in React to identify potential weaknesses and generate a report explaining recommended fixes. Implement this target rather than treating the logistic alert-triage baseline as the finished ML module. Sequence evidence, independent category labels, measured evaluation and reviewed remediation guidance are required; preserve minimal collection, original rule results and the distinction between predictions and verified evidence. See `docs/PIPELINE.md`.

- On 2026-10-21 the user prioritized ML, then blockchain, then GitHub Actions. Complete the ML workflow and versioned combined-report/hash prerequisites before implementing blockchain anchoring. Hosted Actions acceptance follows blockchain; existing local checks and CI source continue to be maintained throughout. Real-data model quality still requires independently reviewed labels and measured evaluation; the synthetic fallback is not a completed evaluated model.

- On 2026-10-21 the user explicitly excluded Docker and current deployment. M2 is complete for local development with live Supabase persistence/isolation; production-only Redis/load/index-plan work is tracked separately as deferred. Do not treat deferred work as tested or require a production environment to continue product development.

- Follow the roadmap's dependency order. Complete a runnable local scanner before introducing hosted services or experimental modules.
- At the user's request, start M6's offline foundation now while keeping deployment/blockchain and live/native acceptance items open. Docker remains deferred. No ML prediction may suppress a live finding or alter its immutable report/score in this increment.
- At the user's request, run automatic ML predictions in the React dashboard when saved-scan details opens. Training/evaluation and bundled releases belong to VYLNT developers, not end users. Browser inference needs no Python server, Docker, SQL migration, prediction API, manual model upload or Run action. Current model/results are experimental and excluded from existing report exports.
- User clarified that users must not prepare training data. Removed the earlier React annotation form; retain private developer annotation manifests, feature-only preparation, offline training and managed model bundling. VYLNT automatically extracts features during inference but does not train itself on user scans or replace missing ground truth with rule scores, saved verdicts or invented accuracy. No reviewed dataset is available yet.
- The user subsequently confirmed the full scan-to-blockchain pipeline: React ML insights must become part of a separately finalized report before its hash is anchored. The existing ephemeral preview is an intermediate implementation. Preserve original scans and create immutable final-report versions; do not relabel existing rule-report hashes as combined-report or blockchain verification. Details and current gaps are in `docs/PIPELINE.md`.
- The extension side panel is the primary workspace: scan controls, findings, account access, cloud history and downloads. The existing web dashboard is optional legacy functionality, not required for extension use.
- Use the user's newly requested Anthropic `frontend-design` skill for the full visual redesign. `docs/FRONTEND_DESIGN.md` records the design plan, critique and implementation checks. Earlier Apple/interaction audits remain historical evidence; preserve their tested interaction improvements.
- Sign-in validates authenticated workspace access, includes the active page's current scan, and enables automatic syncing for new scans while the panel remains open. Other pre-login history stays excluded. Credentials and bounded pending uploads remain in memory; no persistent local extension report archive. Saved reports remain immutable; rescan to capture later changes.
- Local file storage makes development usable without external accounts; Supabase is an alternate adapter requiring real-project validation.
- Reports are immutable once submitted; review decisions are stored separately and never rewrite historical findings or scores.
- Configuration score is a heuristic: 100 minus severity weights capped once per rule; it is not a compromise probability.
- Library advisory matching and DOM data-flow analysis need trustworthy evidence and remain deferred.

## Change log and validation

### 2026-10-21 — Separate data PDF and insights PDF
- User requests the original full scan/severity printout back, with no generated recommended actions or ML content, and a separate downloadable PDF for recommendations/ML. Restored a dedicated unfiltered full-data print layout and raw server PDF default; individual evidence/severities remain complete. Recommendations remain visible onscreen but are excluded from the data PDF.
- Added a separate insights download from the React ML panel. React sends its current model hash/results; an authenticated owner-scoped endpoint verifies those against the bundled model before rendering grouped recommendations, experimental per-group result counts and model identity. Changed/stale results return 409; no arbitrary client analysis is trusted. Server recomputation verifies the React output on export; ordinary inference still runs in React.
- This is an on-demand export, not persisted combined-report finalization or blockchain verification. The displayed existing hash still covers the immutable original scan only. Synthetic provenance remains explicit. No SQL/infrastructure or permissions changes.
- TypeScript, 121 tests in 23 suites and production builds passed. Targeted PDF API tests additionally passed altered-score/arbitrary-field rejection, model-hash mismatch, missing outputs, owner isolation and separate attachment naming. Server verifies finite scores with 1e-12 tolerance and matching labels/IDs/reasons, then renders its own trusted results rather than caller text.
- Browser regression passed raw extension PDF download, separate insights download/filename, simulated 503 and retry, preservation of all print severities despite an active high-only filter, and existing auth/history/review/hash/import/comparison/deletion paths. UI audit passed 14 states with zero accessibility violations/incomplete checks, themes/reflow/enlarged text and full-data print visibility.
- Actual PDF generation/overload/recovery passed. Full-data fixture: eight pages with full long evidence/review-tail markers and accented text, no generated recommendations/ML. Separate 74-finding insights fixture: four groups on three pages, including model identity/results/recommendations. Empty data fixture remains one page. All three server fixtures pass veraPDF 1.30.3's automated PDF/UA-1 profile; retained font-parser warnings remain, and native reading of revised layouts is not claimed.
- Rendered and visually inspected all eight data, three insights and one empty fixture pages, plus three dashboard print and four downloaded-insights pages; no clipping/overlap found. PDF/text-bound, script-syntax and diff-whitespace checks passed. Updated README/API/pipeline/ML/frontend/M3/performance docs to supersede the earlier concise-default experiment. Restart the rebuilt API and refresh the dashboard; no migration needed.

### 2026-10-21 — Repetition in the ML panel corrected
- User screenshot identifies a separate remaining problem: the React ML panel still rendered one identical explanation/fix/demo score per script, despite the earlier print grouping change. Replaced that per-item list with shared issue grouping, one explanation/fix, affected counts and collapsed evidence/model details. Synthetic per-item scores/classifications no longer dominate the default view.
- Grouping is deterministic presentation, not a learned relevance verdict. Preserve every original finding and per-observation result, including mixed classifications/abstentions; join by finding ID rather than array index. Current synthetic LSTM still cannot establish real issues or justify suppressing contextual alerts. Report hashes/storage remain unchanged.
- Diagnosed repeated scores as well as repeated rendering: same-rule targets in one scan currently use identical snapshot sequences and a rule-only target marker, so their scores are identical. Instance-specific evidence context and reviewed issue-level relevance/impact labels require a new model/input design and evaluation; this UI grouping does not solve model quality. Prioritize that work before any claim of noise removal by ML.
- TypeScript, 120 tests in 23 suites and production builds passed. New unit regression covers 71 scripts -> one issue, three bounded samples, missing/mixed predictions, ID joins and unchanged evidence. Browser reproduction passed: one ML card/one recommendation for 71 observations, all original findings retained, collapsed/expanded axe checks with zero violations, keyboard disclosure, mobile reflow and existing auth/export/hash/comparison/deletion regressions. Captured the grouped mobile state for visual review. Syntax/diff whitespace checks passed. No live user scan or native assistive-technology test was performed for this increment.
- First browser run reached and passed the 71-item/one-card assertions, then axe required an explicit browser context instead of Playwright's convenience `newPage`. Fixed the test harness context setup; rerun passed. This was a validation-harness failure, not a claimed product fix. Updated frontend and ML docs; refresh the dashboard to activate the rebuilt UI.
- Visual review confirmed one compact mobile issue card and exposed singular-count copy plus a mismatched description inherited by the mocked script fixture; corrected those text-only details. Final production rebuild/syntax checks passed. No model-weight changes or claims of evaluated relevance filtering.

### 2026-10-21 — Report purpose corrected; concise grouped output
- User reports a 71-page repetitive Print/PDF and clarified ML must produce useful issue prioritisation and recommendations, not another alert dump. The current synthetic triage model does not meet that quality goal. Keep evaluated issue adjudication open; never hide alerts based on synthetic scores.
- Added deterministic issue grouping shared by dashboard print and server PDF: identical rule/context/severity/fix groups, affected counts, one recommendation and three bounded evidence previews. Raw saved findings remain unchanged. Default PDF is now concise; full template retained for QA. This is presentation compression, not ML validation or proof of a real vulnerability.
- TypeScript, 119 tests in 22 suites and production builds passed. PDF rendering/overload/recovery passed; the synthetic 74-finding case (71 repeated script observations) becomes four groups on three pages. Nine-page full/one-page empty QA remains passing. Default summaries bound evidence to three previews of 240 characters and URL previews to 180 characters; omissions are disclosed. Full JSON/evidence/hashes remain unchanged.
- Three server fixtures passed veraPDF 1.30.3's automated PDF/UA-1 profile after fixing Chromium's invalid nested-list structure with evidence paragraphs. Text/page-marker checks passed; all six new concise server/dashboard pages plus the empty report were rendered and visually inspected. Dashboard UI audit passed updated print visibility, 14 accessibility states, focus/themes/200% text/reflow. Main browser regression passed extension PDF download, dashboard concise-print visibility, unchanged export/hash/review/comparison behavior and no JS errors. Script syntax and diff whitespace checks passed. No independent native reader acceptance for the changed layout; prior full-report acceptance is historical.
- Updated API/frontend/pipeline/ML/README/M3 records and the plan's ML goal. Actual user 71-page report is not available for measurement. Next ML priority is reviewed issue-level relevance/impact labels, evidence-linked explanations and reliable ranking/adjudication, followed by persisted combined reports; blockchain and Actions follow later. Compression alone does not satisfy the ML goal. No SQL, new collection, infrastructure or blockchain change.

### 2026-10-21 — First snapshot LSTM implementation
- Added a real PyTorch CPU LSTM trainer and numeric TypeScript browser runtime, bounded versioned metadata sequences, sequence preparation mode, family-separated comparison against the logistic baseline and all-alerts comparator, validation-selected checkpoint, supported-rule abstention and a synthetic LSTM release. React displays rule-linked remediation while preserving findings, scores and export/hash behavior.
- Sequence order is structural snapshot order (coverage, bounded resources/scripts/cookies, target), not runtime event chronology or source/sink evidence. No extension permissions, collection scope, database, API or blockchain changes. No reviewed real dataset exists; synthetic outputs are explicitly demo-only and do not establish useful security quality.
- Added independent PyTorch/browser parity fixtures (including 2/74-step inputs), learning/repeatability/padding/grouping and privacy/artifact validation tests. TypeScript, 118 JS tests in 21 suites, nine Python tests and production builds passed. First JS run found a mistaken assertion matching allowed annotation reason `insufficient-evidence` as raw evidence; corrected to check the raw field is absent. Python's existing temporary-fixture test required sandbox escalation; approved rerun passed.
- The synthetic demo trained on 480 examples/30 families (288 train, 96 validation, 96 test), covering eight rule IDs; validation selects the checkpoint and test does not tune it. Deliberately opposing labels for identical inputs establish no useful quality: this release's test LSTM F1=0/FNR=1 versus logistic/all-alerts F1=0.667/FPR=1. Do not present these as real-world metrics or deploy the model for security decisions. Record: ignored `test-results/ml-lstm-demo/model/`, with numeric parity fixture retained in `ml/fixtures/lstm-parity.json`; PyTorch 2.7.1+cpu/Python 3.12.6/NumPy 1.26.4.
- Main browser regression passed on rerun, including automatic LSTM identity, guidance, unsupported ruleset/error paths, stale-result protection, unchanged original scores/JSON/hash and print exclusion. The first run stopped before ML at a synthetic fixture deletion returning HTTP 503; root cause was not established and no storage fix is claimed. Final expanded UI audit passed: 14 states, zero violations/incomplete checks, themes, enlarged text and focus retention. Added a viewport assertion confirming the unfocused skip link is offscreen (bottom -25.6px); long component captures can still include its fixed-layer artifact. ML mobile captures were inspected; no product CSS change was made for that capture artifact.
- `ml:bundle --check`, script syntax/Python compilation and diff whitespace checks passed. Updated ML/README/API/pipeline/frontend design docs and preparation/training/demo/bundling commands. Inference requires no Python service, new SQL or extra extension permissions; existing exports still exclude ML. M6 remains open: independently reviewed category data/agreement audit, meaningful real evaluation/calibration, behavior/source-sink instrumentation, remediation review and immutable combined-report persistence/export.

### 2026-10-21 — LSTM and remediation target clarified
- Documented the intended LSTM analysis/report behavior, sequence-data requirements, reviewed remediation mapping and evaluation of weakness categories. Added explicit open checklist items so baseline triage cannot be mistaken for completion. Updated PIPELINE's stale M1/M2 acceptance summaries.
- Documentation-only alignment with user requirements; no model trained, LSTM runtime added, accuracy measured or blockchain deployed in this update. Existing implementation/check results are unchanged. Next ML work must establish the sequence/category contract and supported evidence before training and React integration.

### 2026-10-21 — Remaining milestone order agreed
- Reordered next work to ML, blockchain, then GitHub Actions at the user's request. Retained milestone IDs, open tasks, evidence limits and the exclusion of Docker/deployment. Combined-report finalization belongs to the ML-to-blockchain handoff so the anchored hash includes frozen model insights.
- Documentation-only change; checked against the existing milestone checklist. No runtime changes or tests run for this planning update; no additional implementation marked complete.

### 2026-10-21 — M3 dashboard/report acceptance
- User confirmed Edge dashboard/extension keyboard controls and Narrator labels, PDF heading/content order and 200% zoom all pass. These are user-reported native results, not independently observed. User excluded touch testing; removed touch emulation from the harness. Accepted report scope is English and sampled accented European text.
- Added 14-state axe audits, 320px reflow and keyboard assertions; fixed shared collected-state contrast, control-group semantics, History column naming and skip-to-content links. CI now includes the repeatable UI audit; remote CI execution remains M4 work.
- Fixed real PDF/UA-1 profile failures: role mapping, XMP language/title metadata, footer artifact tagging and untagged review borders. Embedded footer typography and original reading structure retained. Both controlled PDFs passed veraPDF 1.30.3's automated profile; the optional `test:pdf-ua` command requires a separately installed CLI and Java. No blanket certification of all generated reports.
- Expanded European diacritics/currency fixtures. Nine-page long report and one-page empty report passed actual generation, overload/recovery, extraction/end markers/page numbers/bounds; all ten pages rendered and visually inspected. Font-parser warnings remain in logs despite passing profile/extraction/visual checks.
- TypeScript, 114 tests in 20 suites, production builds and main browser regression passed. Initial sandboxed tests hit Windows temporary-file rename restrictions; approved rerun passed. Final UI rerun after removing touch assertions passed: 14 states, zero violations/incomplete checks, stable focus and 0px refresh displacement. JavaScript syntax and diff whitespace checks passed. Remote CI has not been run.
- Cold-cache simulated slow dashboard baseline: 128 KiB/s, 150ms latency, 6x CPU; initial/final runs first contentful paint 5,448/5,700ms, login/fonts 9,522/10,459ms, font transfer 537,544 bytes. Two local samples, not physical-device performance or an improvement claim. Existing PDF benchmarks predate finalizer overhead; not remeasured or relabeled current.
- Added `docs/M3_ACCEPTANCE.md`; updated frontend/API/performance/README records. Original report hashes, scores, ML preview exclusion and SQL contracts are unchanged. No Docker or deployment implementation. Next product work is the versioned combined report and post-ML hash; evaluated real-data ML and blockchain remain open.

### 2026-10-21 — Deployment excluded from current scope
- User clarified that Docker implementation is not wanted and VYLNT is not being deployed now. Confirmed no Docker/Compose files in the project file inventory. No container/runtime changes, installation or infrastructure setup performed.
- Marked M2's development scope complete based on the previously inspected nine-check live two-account result and prior 112-test/build validation. Moved real Redis, hosted physical index/plans, production load and possible scaling changes to a separate deferred deployment section; none is marked verified or complete.
- Updated README/API/M2 acceptance wording to keep normal localhost development independent of Docker/Redis. This is a documentation/scope update, so application tests were not rerun. Next product development remains combined ML report finalization and the remaining non-deployment milestones.

### 2026-10-21 — Hosted two-account isolation verified
- User reported all hosted checks passed after connecting a distinct second account. Inspected the new sanitized verifier artifact: nine successful checks, zero skips, zero cleanup failures. Auth validation and different-owner enforcement in the helper establish that A/B were distinct authenticated owners; no credentials were read or saved.
- Live B requests received 404 for A's scan detail, JSON/PDF export, hash verification, comparisons, feedback and deletion; A retained access. Direct authenticated reads of scans/findings/feedback/sites returned no A-owned fixture rows to B. Existing hosted persistence/paging/aggregate/comparison/feedback/hash/migration-004-column checks passed again; both synthetic scans were deleted and subsequent reads returned 404.
- Updated M2's checklist and acceptance/API/README status. This verifies the tested two-account paths, not every possible database permission scenario. Real Redis, physical index/plans and representative hosted load remain open; M2 is not marked complete. Documentation-only update; application tests were not rerun, and the prior 112-test/build result remains historical.

### 2026-10-21 — M2 live acceptance tooling
- User has one confirmed Supabase account and no Redis service. Rechecked the configured hosted project: Auth/public key reachable, email confirmation enabled, anonymous access denied by permissions on all four tables. Two-account isolation, shared real Redis and production hosted load remain unverified; M2 is not marked complete.
- Added `npm run verify:supabase`: loopback-only private acceptance page at port 4321, 30-minute lifetime, using the existing memory-only Auth client and normal authenticated API/store. Passwords go directly to Supabase and are cleared from the form; only Auth-validated access tokens reach helper memory and are discarded after a run. Host/Origin checks reject rebinding/cross-origin posts. No service-role key, credentials/logged tokens, accounts, emails, SQL deployment or user-API restart. Tests create at most two synthetic scans and attempt only their cleanup; existing schema/API may retain an empty synthetic site row.
- User signed in privately as A and reported available checks passed; inspected generated sanitized results confirming eight passes, no failure and no cleanup failures: authenticated paginated history; atomic sanitized ingestion/retrieval; idempotent retry/immutable conflict; history totals and same-page comparisons; site aggregates; migration-004 generated key/long-URL availability; feedback/export/original-hash consistency; and deletion/404 confirmation for both synthetic scans. Single-workflow timing groups ranged 190–2,439 ms and include multiple Auth/API/database requests; not production load or per-query benchmarks. Physical index installation/use is not independently inspected by a column/function behavior check.
- Two-account RLS was explicitly skipped because only one account was available. Prepared second-account API 404 checks for detail, JSON/PDF, verify, comparison, feedback and deletion, plus direct table-read isolation for all four tables. The helper rejects A/B sign-ins resolving to the same owner. User has been asked to create a distinct confirmed test user and rerun; results pending.
- Validation: `npm run check` passed TypeScript, 112 tests in nineteen suites and production builds. Three new tests cover helper Host/Origin/sign-in/different-owner/one-run-token lifecycle and normal API workflow, plus cleanup after a failed migration probe. Initial local integration test omitted its allowed origin and correctly received 403; test setup was corrected and passed. Live eight-check result above is separate from local mock/FileStore tests. Production app/scanner behavior was unchanged; broad browser/Auth/Python suites were not repeated. Upstream Zod build annotation warnings remain.
- Added a prepared `npm run verify:redis` real-service harness for independent app/backend counters, owner/bucket isolation, Retry-After/expiry and disconnected-backend fail-closed behavior. It uses an isolated temporary namespace, no FLUSH, no server stop and no production-key deletion; keys expire. Script syntax and missing-endpoint preflight checked: `verify:redis` refuses to run until `VYLNT_REDIS_URL` is supplied privately. No real-service run occurred, so distributed operation is still unverified. No Redis installation or Docker added.
- Added M2_ACCEPTANCE.md and developer commands. Remaining blockers: distinct confirmed test user, real Redis endpoint, database index inspection and a bounded agreed production performance target/workload. Existing PGlite/FileStore measurements and two synthetic hosted scans do not certify production capacity. M2 remains open.

### 2026-10-21 — M1 scanner acceptance completed
- User uses Microsoft Edge. Started loopback-only manual fixtures on 127.0.0.1/127.0.0.2:5175; user explicitly confirmed **All three pass** for native toolbar side-panel open/close/reopen, optional site grant/scan/revoke/block/re-grant, and Edge restart/rescan. Marked these complete as user-confirmed results, not independently observed screenshots. Native computer-use inspection previously stopped because it could not establish the active browser URL; the browser connector did not expose Edge. No independent installed-Chrome certification is claimed. Native permission actions were performed by the user under the computer-use skill's restriction.
- Added `npm run test:scanner`: disposable-profile localhost tests passed real HTTP 304 revalidation/effective-header preservation, fresh scan IDs, cache-bypassed changed headers, current-page back navigation, full browser close/relaunch, pause persistence, cleared session-only history, and resumed scanning. Broad BFCache/service-worker-cache coverage is not established by this fixture. Added a background unit regression for rejected DOM/navigation after revocation and registration/collection after re-grant; saved prior observations remain historical.
- Full-extension stress harness passed actual content-script IPC/background rules/session persistence, bounded sanitized snapshots and explicit collection with 2,000 inert scripts/120 timed mutations at normal and 6x simulated CPU slowdown. One pair per condition: normal disabled/enabled page task time 146.36/196.40 ms, elapsed 3,717/3,819 ms; 6x disabled/enabled page task time 910.46/2,851.17 ms, elapsed 8,756/17,819 ms. Control STATE round trips were 4.00/4.90 ms; explicit content collection to observed persistence 47.84/284.81 ms. Heap deltas are not peak memory and page CPU excludes background CPU. Slowdown is substantial on the throttled stress fixture; no low-overhead, physical-device or production-capacity guarantee. See PERFORMANCE.md and ignored raw results.
- Corrected two test assumptions before the final pass: history lookup could select an older scan during reload (now reads the current tab snapshot), and expecting mutation 120 automatically at all CPU speeds ignored the observer budget. The 6x final automatic snapshot captured mutation 110, then explicit collection captured 120. The 100-callback automatic budget remains intentional; continuous exhaustive monitoring is not claimed. No runtime change was needed or made.
- Validation: `npm run check` passed TypeScript, 109 tests in eighteen suites and production builds; the permission-focused suite also passed all eight tests. `npm run test:scanner` passed cache/restart plus all four enabled/disabled CPU-condition measurements. Script syntax and `git diff --check` passed. Build retains the upstream Zod annotation warnings. The existing broad browser/Auth/Python suites were not repeated because their production code was unchanged; earlier results remain historical. Added scanner regression to CI, but hosted CI execution remains unverified under M4.
- Added native fixture command `npm run lab:m1`, M1_ACCEPTANCE.md, performance methodology/results and README instructions. Marked M1 complete for the user-confirmed Edge environment plus automated Chromium evidence. Remaining physical-device/battery/accessibility and broader browser/cache cases stay ongoing acceptance work. M2 hosted account/RLS checks, M4 hosted workflow checks, M5 combined reports/blockchain and M6 evaluated ML remain open.

### 2026-10-21 — VYLNT-managed automatic React analysis
- Implemented the user's corrected product flow: VYLNT owns training/model releases; normal users only open scans and receive automatic browser analysis. Removed model upload, Run/Clear, dataset-key and annotation controls from scan details, including the obsolete component/styles. Offline developer preparation/training tooling and its existing tests remain available; no private datasets are shipped to users.
- Added a VYLNT-managed bundled numeric model, automatic validation/inference and canonical model SHA-256, report-scoped loading/error states and stale-result guards. Analysis begins when scan details mounts, independent of disclosures. No prediction API, database change, background training, new collection or extension permissions. The fallback was bundled from the existing synthetic demo artifact; its zero-weight 0.500 predictions demonstrate automation only and are explicitly labeled demo classifications. No real-world accuracy or security insight quality is established.
- Added `npm run ml:bundle -- --model <model.json> [--name <release-name>] [--check]` for developer-controlled releases. It enforces 64 KiB, supported numeric schema/features, experimental status and current ruleset before replacing the source release. Tested both validation-only and actual bundling with the synthetic demo; intentionally supplied a non-model fixture and confirmed rejection. Rebuilt after bundling. Release validation is compatibility checking, not production approval; document evaluation/release identity before rebuilding/deploying a replacement.
- Validation: `npm run check` passed TypeScript, all 108 tests in eighteen suites and production builds. Three added unit tests cover default automatic analysis, canonical model identity, original report preservation, invalid release/ruleset rejection, empty scans and unsupported-rule abstention. The final UI error wording gives VYLNT-owned compatibility guidance rather than asking users to load a model. Upstream Zod annotation warnings remain; production builds succeed. Python training code was unchanged and its earlier six-test result remains historical.
- Full `npm run test:browser` passed automatic results with no user inputs/controls, no training form, original score preservation, pending-hash navigation/unmount guards, automatic reanalysis, no additional inference network calls, mismatch/empty/recovery states, narrow layout/200% text and print exclusion, alongside extension/API/CLI/dashboard regressions. `node scripts/ui-audit.mjs` passed with the automatic section visible through mobile/theme/enlarged-text checks. Visually inspected its unobscured mobile screenshot. Script syntax and `git diff --check` passed. No live Supabase, installed-Chrome or production model-quality acceptance was performed.
- Updated README, ML developer workflow, API, frontend design and pipeline docs. Refresh the rebuilt dashboard and open a saved scan; no user model setup or training step remains. This is analysis of the viewed scan, not processing all remote scans while React is closed. Remaining: developer-curated reviewed examples, label/group audit, frozen evaluation/calibration and an accepted real-data model release, followed by combined immutable report persistence/export, post-ML hash and blockchain anchoring. Sequence/LSTM/retraining work remains open.

### 2026-10-21 — Reviewed-data training workflow
- User confirmed no independently reviewed training examples are available and requested the training workflow first. Added a React scan-level annotation/export panel with explicit labels, independent-review confirmation, private application-family grouping and a reusable dataset HMAC key. Labels default to unreviewed and are never inferred from rule scores, ML or saved review verdicts.
- Added Web Crypto preparation matching the offline feature-only export format, recomputing rule findings and rejecting stale rulesets/labels. Exports omit raw metadata, family names and keys; input state stays in page memory and is cleared on scan change/unmount. Stale asynchronous preparation cannot download after navigation. No annotation API, persistence or additional collection. The existing eight pure rules are unchanged.
- Trainer now accepts multiple feature-only exports through `npm run ml:train -- --dataset <files> --output <directory>`, validates global duplicates/family conflicts and mixed rulesets/provenance, excludes unreviewed rows, splits by family, and emits a model loadable in React plus evaluation/split artifacts. Scaling/classifier fitting remain training-only. Dataset hashes now cover merged sample-sorted compact Python JSON with sorted keys, explicitly identified by `datasetHashFormat`, so file order does not change the identity.
- Validation: `npm run check` passed TypeScript, 105 tests in seventeen suites and production builds; three new TS tests verify exact browser/offline export parity, privacy/nonmutation, stable grouping, recomputation, unreviewed defaults and rejection. `npm run test:ml` passed six Python tests, including a real subprocess multi-file training/artifact check and duplicate/conflicting-family rejection. Initial sandbox runs failed at temporary-file permissions before executing affected tests; elevated reruns passed. Production build retains upstream Zod annotation warnings.
- Expanded UI audit passed with the training disclosure open, including mobile widths, light/dark themes and enlarged text. Visually inspected the mobile annotation form. `npm run test:browser` passed explicit/default labels independent of saved feedback, download contents, zero preparation network requests, renewed confirmation after label changes, memory clearing on navigation, enlarged text and print exclusion, alongside existing extension/API/CLI/dashboard acceptance. Its first pass reached annotation export, then a test regex incorrectly rejected the allowed `insufficient-evidence` reason category; corrected the assertion to reject raw evidence fields and reran successfully. No runtime privacy failure was observed. Script syntax and `git diff --check` passed. No real Supabase/native acceptance, real reviewed dataset or model-quality claim.
- Updated ML usage, README, API and frontend-design docs. Remaining: collect independent labels/evidence across application families using one stable private key, audit label agreement/grouping, freeze evaluation data and train/evaluate a reviewed model. The UI confirmation does not independently verify an annotation, and HMAC IDs are pseudonymous; different keys or incorrectly grouped near-clones can invalidate evaluation. Existing minimum group/class requirements are mechanical, not statistical sufficiency. Combined reports, post-ML hashes, blockchain, LSTM and production-model approval remain open.

### 2026-10-20 — Confirmed scan-to-blockchain architecture
- Recorded the user's intended sequence in `docs/PIPELINE.md`, including the API/Supabase transport between extension and dashboard, React inference, combined-report finalization, canonical hashing and confirmed blockchain anchoring.
- Added the missing combined-report schema/persistence/export and post-ML hash tasks to M5. Next implementation is that final-report layer, preserving existing immutable scan reports and recording model identity/limitations; blockchain integration follows. Current ML is still an ephemeral experimental preview and existing hashes cover rule reports only.
- Documentation-only change: inspected ingestion/verification and dashboard integration references; no runtime code, database, wallet or chain changed. No application tests rerun; this does not establish combined reporting, blockchain operation or ML accuracy. Existing validation results remain historical.

### 2026-10-20 — ML predictions in React
- Implemented opt-in browser inference on saved dashboard scans using the offline logistic model's numeric JSON artifact. Strict schema/finite-vector validation, stable sigmoid, ruleset compatibility and unsupported-rule abstention. Original findings, severity, score, hashes and exports remain unchanged. The ML code loads only when scan details opens.
- Added a JSON model loader (64 KiB maximum), synthetic demo, explicit Run/Clear controls, SHA-256 model identity/provenance and per-finding triage preview. Model/results remain in React memory; leaving scan details, disconnecting or reloading clears them. Scan changes clear results and invalidate pending file reads. No prediction network request, new metadata collection, SQL migration or Python service. Training remains offline.
- Validation: `npm run check` passed TypeScript, 102 tests in sixteen suites and production builds. Four new tests cover independent scikit-learn probability parity with nonzero weights/scaling, malformed/unapproved artifact rejection, extreme-logit stability, invalid features, ruleset mismatch, abstention, empty reports and report nonmutation. The numerical fixture uses synthetic examples with scikit-learn 1.5.2; it establishes implementation parity, not model quality. TypeScript and production build passed again after adding lazy loading; initial dashboard JS is 471.93 kB and ML chunk 97.31 kB. Rollup still reports upstream Zod annotation warnings; build succeeds.
- Expanded `npm run test:browser` passed model demo/upload/run/clear, invalid files, ruleset mismatch, original findings/score preservation, zero model/inference network requests after the lazy chunk loads, narrow layout/200% text, print exclusion and delayed-file navigation guards, alongside existing extension/API/CLI/dashboard workflows. `node scripts/ui-audit.mjs` passed with the ML disclosure open through theme, layout, text-size and interaction checks. Visually inspected the unobscured mobile ML preview; controls and results fit. `git diff --check` passed. No live Supabase or installed-Chrome acceptance was performed; Python training code was unchanged and its tests were not rerun.
- Updated README, ML usage, API and frontend-design documentation. Refresh the dashboard, open a saved scan, expand ML analysis, choose Use demo model (or load a compatible model.json) and Run ML. The synthetic demo intentionally produces 0.500 scores for its ambiguous artificial labels; it has no demonstrated real-world accuracy. Uploaded provenance is unverified metadata, scores are uncalibrated triage signals, and no production model is approved. Remaining: independently reviewed labels/grouping audit, frozen evaluation/calibration, safe sequence instrumentation, LSTM comparison and accepted retraining; a Python inference service is optional if future models require it.

### 2026-10-20 — Experimental ML foundation
- Read the supplied roadmap's ML-1..ML-9 scope. Implemented ML-1's initial triage target, shared 24-feature metadata extraction, explicit independent annotation manifest/preparation CLI, HMAC application-family/sample/scan grouping and Python logistic-regression baseline. Preparation recalculates findings under the current ruleset, excludes raw URLs/text/cookie names/evidence/notes, rejects duplicate samples/conflicting scan families and never infers labels from scores or review verdicts. Private data/model directories are ignored.
- Trainer validates schemas/ranges/one-hot fields/provenance, excludes unreviewed examples and assigns entire application families to deterministic train/validation/test splits. Scaling/class-balanced training uses train only; fixed 0.5 threshold, confusion/precision/recall/F1/FPR/FNR metrics and all-alerts-actionable comparison are reported on validation/test. JSON artifacts record feature/ruleset/dependency versions, dataset hash, opaque split groups and `liveUseApproved: false`. Live rule findings/scores are unchanged; no inference API or suppression is enabled.
- Validation: `npm run check` passed TypeScript, 98 tests in fifteen suites and production builds; four new TS tests cover privacy/nonmutation, availability masks, stable family grouping, recomputation and annotation/ruleset rejection. `npm run test:ml` passed five Python tests covering deterministic separated groups, duplicate/cross-family/raw-field rejection, unreviewed/minimum-group checks, metric edge cases and train-only scaling. Tested Python 3.12.6 / scikit-learn 1.5.2 / NumPy 1.26.4. Browser suites were not rerun because live scanning/UI code is unchanged.
- `npm run ml:demo` completed with 60 synthetic examples / 30 artificial families (36 train, 12 validation, 12 test). Identical metadata deliberately has opposing demo labels; the model matched the all-alerts-actionable comparator (test precision 0.5, recall 1, F1 0.667, FPR 1). This validates mechanics and demonstrates missing context; it is not independently labeled ground truth, measured real-world accuracy or demonstrated false-positive reduction. Raw artifacts are under ignored `test-results/ml-demo/`. The preparation CLI also passed an end-to-end smoke check from an existing controlled scan plus an explicit unreviewed annotation. Node script syntax and git diff whitespace checks passed.
- Added Python requirements, preparation/demo/test commands and ML documentation with labeling/privacy/evaluation guidance. No Docker, GPU, SQL migration or new live collection. Remaining: real reviewed data and label-agreement audit, meaningful safe operation sequences, LSTM comparison/calibration, frozen evaluation, inference integration and accepted deployment/retraining protocol. Near-clone/family assignment requires human audit; HMAC IDs are pseudonymous and changing/expanding a dataset can change split boundaries.

### 2026-10-20 — Shared limits and deployment configuration
- Added optional Redis-backed client/owner/write counters with shared HMAC keys, isolated bucket namespaces, bounded command/startup waits and fail-closed API errors. Local memory defaults remain available; production startup requires Redis, Supabase and explicit HTTPS origins. Redis is not required for normal npm/local development.
- Added explicit IP/CIDR proxy trust configuration; forwarding headers are trusted only from configured peers/chains. Four added tests cover configuration rejection, trusted/untrusted forwarding chains, protection-store failure before Auth/writes and memory compatibility. `npm run check` passed TypeScript, all 94 tests in fourteen suites and builds. No real Redis or container integration test completed; do not treat distributed operation as independently verified. The existing browser suites were not rerun for this increment.
- The user explicitly deferred Docker on 2026-10-20. Removed only the new Dockerfile, Docker ignore file and compose/NGINX templates from this increment, including their unused TLS ignore entry. Container deployment remains deferred and should not be reintroduced without the user's request. No containers or hosted deployment were created. Docker Desktop was started for testing before the user deferred it; it was not uninstalled or force-stopped.
- Updated plan/API notes. No hosted configuration or SQL change. Next non-container work: GitHub CI verification and documented risk exceptions; live Supabase/native acceptance and later blockchain/ML remain open.

### 2026-10-20 — Generated-report size limits and terminal uploads
- Implemented consistent 512 KiB generated-report checks in the API and both storage adapters, matching PostgreSQL jsonb text spacing and UTF-8 byte counts. Structured HTTP 413 distinguishes `SUBMISSION_TOO_LARGE` from `REPORT_TOO_LARGE`, includes the limit and measured report size where available, and rejects before writes/ingestion. Upstream ingestion HTTP 413 is also terminal. No automatic truncation or report rewriting; review notes remain separate from report size/hash.
- Extension handles JSON/HTML 413 before generic response parsing, retains the failure and skips automatic/manual Retry sync for that frozen snapshot; new scans remain eligible. Other permanent errors still permit existing manual recovery, and network/429 backoff/cooldown behavior is retained. JSON export remains available while the scan is in memory; closing/signing out still clears the queue. Existing oversized local records are not deleted or rewritten.
- Validation: `npm run check` passed TypeScript, all 90 tests in thirteen suites and production builds. Five added tests cover PostgreSQL size parity with Unicode/escaping/optional fields, exactly 524,288-byte acceptance and one-byte-over rejection against the real migration 001 ingestion RPC, small requests whose generated reports exceed the limit, no partial writes, both direct storage adapters, upstream 413 and blocked retries with later scan progress. The API rejects before calling storage and still accepts a subsequent valid scan.
- Expanded `npm run test:auth-browser` passed structured/HTML 413 responses through the real panel fetch path, repeated manual/automatic retry suppression, later valid upload and existing Auth/session/429 regressions. The mocked transport does not contact hosted Supabase. The main browser workflow also passed extension/API/CLI/dashboard upload, history, reviews, comparisons, JSON/PDF export and deletion. Visually inspected the narrow-panel size-error screenshot; git diff --check passed. No performance benchmarks or broad UI audit were rerun for this logic change.
- Updated README, API and performance docs, including the oversized PDF stress-fixture distinction. No new dependencies, SQL or permissions. Existing running API/hosted database were not modified; restart the rebuilt API and reload the extension to activate. Next: shared gateway/deployment limits and real extension/hosted acceptance. Native accessibility, hosted performance, GitHub acceptance, blockchain and ML remain open.

### 2026-10-20 — Migration 004 deployment confirmation
- User explicitly confirmed deploying migration 004 through the Supabase SQL editor. Marked deployment user-reported complete; no need to rerun it.
- This documentation-only update does not establish authenticated comparison/RLS behavior or hosted performance. No live database inspection or application tests were performed.
- Next implementation remains consistent derived-report size-limit handling and upload error/retry behavior.

### 2026-10-20 — Dynamic-page observer budget
- Fixed a busy-page edge case: reaching the mutation budget disconnected the observer and canceled its pending snapshot. The observer now disconnects at 100 callbacks while retaining one final debounced collection; explicit rescans remain available.
- Added paired baseline/collector benchmarks with the built content script, 2,000 synthetic script elements and 120 mutation batches. All three final pairs passed: two automatic snapshots, 150-script/300-resource caps, sanitized URLs, disconnection and explicit rescan. Paired task-time deltas were 30.73, 28.42 and 38.42 ms over about 3.5 seconds; collector script time was 17.48–23.79 ms. Heap deltas were about 0.55 MB with the mocked transport and are not peak-memory measurements. This isolates the collector; real IPC/background/storage and native/slow-device overhead remain separate work. CI now runs one behavioral pair without timing gates.
- The initial benchmark used Playwright before setting its browser path; changed to dynamic import and reran successfully. Final measurements ran separately from other test jobs. No production telemetry or new metadata collection was introduced.
- Added migration 004's generated page-hash column and owner/hash/time/ID index, retaining exact URL equality in both count/page queries and owner RLS. Hashing keeps long URLs out of btree key-size limits; this is not cryptographic verification. An initial expression-only index was rejected after plans showed sequential scans and one-page performance regressed. The stored-key design uses the new index on both many-site query plans.
- Validation: final `npm run check` passed TypeScript, all 85 tests in twelve suites and builds. SQL tests apply/reapply 004 and exercise 3,500-character paths, nearby distinct URLs, owner isolation, anonymous denial, pagination and local-store parity. All 30 storage scenarios / 150 timed operations passed: many-site comparisons improved from 14.51 to 2.64 ms at 1,000 scans and 126.21 to 2.47 ms at 10,000 scans. Single-page histories were 18.55→17.24 ms and 129.06→129.52 ms, so no material improvement is claimed for that layout. Raw results/query plans and methodology are in the benchmark artifacts and performance docs.
- The first full browser run passed extension and CLI checks, then encountered HTTP 503 during dashboard fixture deletion. The API log only identified a generic Error; the cause is not established. The separate full rerun passed extension/API/CLI/dashboard workflows, including deletion, review, comparisons, trends and PDF download. The earlier failure remains recorded with unknown cause; it is not evidence of a diagnosed fix. Auth-specific and broad UI-audit suites were not rerun this increment. `git diff --check` passed. Hosted migration deployment and real-account acceptance remain unverified.
- Migration 004 does not change report JSON, hashes or API contracts, but generated-column backfill and index creation hold table locks. Apply after 003 in a suitable maintenance window; existing 003 functionality remains usable without it. Reload the rebuilt extension for the observer fix. README/API/performance docs updated. Native accessibility, slow-device/IPC overhead, hosted load, derived-report size handling, shared gateway limits, GitHub acceptance, blockchain and ML remain open.

### 2026-10-20 — Database and local-storage benchmarks
- Added opt-in synthetic benchmarks for the real PostgreSQL history/site/comparison functions at 1,000 and 10,000 scans in many-site and single-page layouts, plus actual FileStore reads/review writes at 100 and 1,000 scans. Uses in-memory PGlite and isolated temporary local files; no hosted Supabase or user storage access.
- Validation: `npm run benchmark:storage` passed all 26 scenarios / 130 measured operations plus warmups. Real migrations 001–003 and ingestion RPC seed coherent reports before timing; measured reads execute as authenticated owners. Checks verify counts/order, page summaries, site aggregates, exact-page comparisons, owner isolation and anonymous denial. File checks verify immutable report hash after review writes and enforcement of the 1,000-scan cap. Exact temporary files were removed successfully.
- At 10,000 scans, median PostgreSQL history reads were 6.06–13.18 ms, site aggregates 12.80–41.43 ms and comparisons 63.40–124.66 ms across the two layouts. At 1,000 local-file scans, reads were 14.70–19.04 ms and review writes 40.05 ms. Raw repeated results are under `test-results/storage-benchmark/`; environment/methodology/results are recorded in `docs/PERFORMANCE.md`.
- Node syntax checks and `git diff --check` passed. Production code/migrations were unchanged, so the prior 85 tests/browser suite were not rerun. PGlite is local in-memory WASM PostgreSQL with an Auth shim; timings exclude hosted network/Auth/PostgREST and are warm/sequential. File write timing does not establish fsync durability or multi-process safety. These measurements are not production capacity certification.
- Updated README/performance docs. Also clarified that the earlier large PDF profile is a renderer stress workload, not verified hosted ingestion: migration 001 separately caps derived reports at 512 KiB. Handling/reporting that boundary remains production-hardening work.
- Next: dynamic-page observer overhead. Comparison query scaling warrants an owner/page lookup-index experiment with before/after plans, exact-URL collision checks and long-URL handling; no migration or cache was introduced yet. Hosted load behavior, shared gateway limits and native/live acceptance remain open.

### 2026-10-20 — PDF performance measurements
- Following the next local item in plan step 2: added an opt-in reproducible PDF benchmark with typical, medium and large synthetic API-valid submissions, isolated workers, render timings, output sizes, Node peak RSS and sampled Node/Chromium process-tree working set. The benchmark collects no real report data, credentials or process command lines. Results are local ignored artifacts.
- Validation: all nine final renders passed (three runs each). Typical: 3 findings, 1.757–2.364 s, sampled tree peak 315.1–318.9 MiB. Medium: 28 findings, 1.782–3.319 s, 318.8–326.1 MiB. Large: 153 findings, 6.058–8.242 s, 461.4–473.2 MiB. The large API-valid submission is 369,256 bytes; its derived report/reviews are 1,703,776 bytes. Each run observed five renderer-tree processes with 4–14 samples. Detailed environment, output sizes and limits are in `docs/PERFORMANCE.md`; raw ignored results are in `test-results/pdf-benchmark/`.
- Improved the initial sampler after it missed short-lived Chromium processes: Windows now starts one persistent read-only sampler before rendering. Final results supersede the exploratory run. Sampled working sets can miss peaks and double-count shared memory; API/database/network latency is excluded. Linux/macOS sampling and maximum-input/concurrent-load behavior are not verified. No production limits or report behavior changed, and no runtime credentials or data were accessed.
- Node syntax checks and `git diff --check` passed. Application code was unchanged, so the prior 85 tests/browser suite were not rerun. These benchmarks validate rendering/instrumentation, not each stress PDF's visual layout. Added the benchmark command and performance documentation; corrected obsolete README text that still described server PDF generation as future work.
- Live Supabase requires signed-in test accounts; native PDF/Chrome accessibility still requires manual acceptance. GitHub action expansion was not implemented in this increment. Next buildable item: observer/storage overhead and database performance measurements (step 4), while keeping steps 1–3 acceptance work open.

### 2026-10-20 — Dedicated extension PDF export
- Implemented authenticated saved-report PDF endpoint and side-panel download button, without a new webpage. Server renders escaped report text and saved reviews in an isolated offline Chromium instance, includes coverage/heuristic/integrity caveats, and limits concurrent rendering to one job with a deadline. Reports and hashes remain unchanged; PDFs are generated in memory. Pending exports disable the control; failure permits retry. Session/report-selection guards discard stale responses (guard inspected, PDF-specific delayed-response browser case not added).
- Playwright moved from development to production dependencies; build copies the bundled font/license for PDF rendering. No SQL migration or new extension permission. Server needs the browser installed by `npm run setup:browser`.
- Validation: `npm run check` passed TypeScript, 85 tests in twelve suites and production builds. Three new unit/API tests cover authorization before rendering, missing/unowned targets, attachment/cache headers, 503 retry guidance, escaping hostile text, missing coverage, integrity mismatch and unchanged stored reports. `npm run test:pdf` passed real Chromium generation, simultaneous-job rejection, slot recovery and empty output. Added the PDF renderer regression to CI; hosted CI execution remains pending.
- `npm run test:browser` passed extension/API/CLI/dashboard workflows including a simulated PDF failure followed by a successful real PDF download, PDF signature/filename, no new page and subsequent JSON download. Auth-specific and broad UI-audit suites were not rerun in this increment; prior results remain historical. Native Chrome and live Supabase acceptance remain open.
- Rendered all nine pages of the synthetic long-evidence report plus the single-page empty report with Poppler and visually inspected the output. `scripts/check-pdf-layout.py` passed all evidence/review end markers, sample accented characters, per-page footers and text bounds. Initial ad hoc extraction failed on a typographic ligature and an overly strict footer boundary; the reusable check normalizes ligatures and checks body/footer regions separately. pdfplumber emits FontBBox warnings on Chromium fonts; extraction and visual checks passed. Full PDF/UA, broad multilingual font coverage and production maximum-size/load tests remain unverified.
- Updated README, API/design docs and CI instructions. Activate by restarting the rebuilt API and reloading the extension; run `npm run setup:browser` if Chromium is missing. No SQL action needed. The running user API and hosted database were not modified. Exports include saved review notes, not unsaved drafts; current unsaved scans/trends/comparisons remain excluded. One browser per export has startup/memory cost; distributed limits and operational load measurements remain open.

### 2026-10-20 — Extension history trends
- User reports completing the requested SQL script. This records user confirmation, not independent verification of hosted migrations or authenticated persistence.
- Added a lazy-loaded History trends disclosure to saved reports in the primary extension. Reuses migration 003's comparison endpoint; no additional migration, dependency, permission or persisted metadata. Shows selected scan plus at most 30 most recent other scans of the exact page, with explicit displayed/total counts.
- Pure shared trend preparation orders/deduplicates points, bounds history and preserves elapsed-time spacing. Discrete score/findings plots include incomplete-collection markers, selected-scan emphasis and readable observation values/coverage. No interpolated security trend or automatic fix claim. Ruleset versions are unavailable in summaries; the UI directs users to pairwise comparison.
- Validation: `npm run check` passed TypeScript, all 82 tests in eleven suites and production builds. Four trend tests cover bounded/deduplicated same-URL history, selected older observations, nonmutation, elapsed-time gaps/ties, single points and coverage distinctions. `npm run test:browser` passed the full extension/API/CLI/dashboard workflow, including two plots/14 observations, coverage warnings, readable values, HTTP 503 retry, single-scan empty state and delayed trend responses ignored after leaving Saved scans. Existing enlarged-text overflow assertions ran with trends open. `git diff --check` passed.
- Visually inspected `test-results/extension-trends.png`: readable coverage warnings and chronological values; the tall element capture includes the existing sticky toolbar over part of the plot, so this screenshot alone is not full visual acceptance. No new animation or dependency. The Auth browser and broad UI-audit suites were not rerun for this increment; their prior results remain historical. Native screen-reader/Chrome acceptance and hosted Supabase behavior remain unverified.
- Updated README, API usage/deployment status and frontend-design docs. Production extension rebuilt; reload it to activate. The existing API process and hosted database were not modified. History remains bounded (selected scan plus 30 recent peers), ruleset compatibility is unknown from summaries, equal-time markers may overlap, and same coverage flags do not guarantee equal observation completeness. Full-history exploration and native assistive-technology acceptance remain future work.
- Remaining after this increment: dedicated extension PDF generation/pagination QA; live Supabase acceptance; performance, CI deployment, blockchain and measured ML work.

### 2026-10-20 — Side-panel review and comparison
- Completed the work started on 2026-10-16. Saved findings now have review verdicts and bounded notes directly in the extension. Failed saves retain the draft on the open report, saved decisions reload correctly, and evidence/score/hash remain immutable. Unsaved drafts are discarded on report switch/sign-out; no persistent browser storage was added.
- Added same-URL comparison pickers in both clients with independent ten-row candidate pages, plus the owner-scoped comparison API and security-invoker RPC in migration 003. The selected scan is excluded, missing/unowned targets return 404, and candidate reads enforce owner RLS. Migration 003 depends on 002 and can be reapplied.
- Shared pure comparison code identifies newly observed, no-longer-observed and changed severity/confidence/evidence, ignoring observation time alone. Results show score delta and coverage/ruleset caveats; missing observations are never automatically marked fixed. Comparison results remain in memory and do not alter report exports.
- Validation: TypeScript, all 78 automated tests in ten suites and production builds passed on 2026-10-20. Local PostgreSQL tests apply/reapply migration 003 and check paging, exact URL matching, target exclusion, owner isolation and anonymous denial; API/adapter tests verify contracts and missing-migration guidance. Shared comparison tests cover ordering, changed evidence, coverage/rulesets and invalid pairings. Hosted Supabase is not exercised by these tests.
- Both browser suites passed: extension review save/reopen, draft recovery after simulated HTTP 503, preserved hash, second comparison page with 13 candidates, coverage warnings, clear action and delayed baseline ignored after switching to Current scan. Dashboard comparison selection on page two, mobile overflow and print hiding of picker controls passed. Auth/sync/retry/session/privacy regressions also passed. Expanded fixture writes use a test-only 200-write budget; production defaults are unchanged.
- The first dashboard comparison run failed on an exact accessible-label lookup. Added an explicit stable name to the picker and reran successfully. Visual review of mobile screenshots led to consistent padding around the dashboard picker; the final spacing rerun passed the complete extension/API/CLI/dashboard workflow. The extension review controls also use explicit accessible names.
- Existing UI audit passed: 0px refresh displacement, disclosure/focus retention, empty-filter recovery, Enter/click request counts, themes/preferences, minimum control heights and narrow/enlarged-text layouts. New extension review/comparison screens also passed 200% text overflow checks. Screenshots: test-results/extension-review-comparison.png, extension-review-large-text.png and dashboard-comparison-mobile.png. Browser print checks do not establish paginated PDF acceptance.
- Updated README and API usage/deployment docs. Remaining: apply 002 then 003 in hosted Supabase (skip already-applied migrations), restart the API, reload the extension and verify real-account saving/reviews/comparisons and two-user isolation. Production query/load tuning, collaborative review conflict handling and native Chrome/assistive-technology acceptance remain open. The existing API process and hosted database have not been modified.
- Next development: history trends in the primary side panel, followed by dedicated PDF generation and pagination QA. Later CI deployment, hardening, blockchain and ML milestones remain open.
- Final visual review aligned the result panel's padding with the picker. This CSS-only refinement is covered by a production rebuild; browser workflow results above precede that last spacing adjustment.

### 2026-10-16 — Database pagination
- Replaced the Supabase adapter’s 1,000-full-report read with security-invoker `list_scan_page` / `list_site_page` RPCs. Migration 002 adds ordering indexes, bounded summary projections, exact totals and all-history latest-site metrics, with explicit owner scoping and authenticated-only execution. Existing reports/feedback are not rewritten; repeated migration execution is supported. Missing RPCs produce actionable migration guidance.
- Added a shared typed summary/page contract and local-store parity. Both APIs validate page/limit; deterministic timestamp/UUID ordering handles ties. Website groups exclude origins with no remaining scans. No evidence or review notes are returned in list pages. Local storage retains its 1,000-scan cap.
- Added dashboard website pagination, global metrics and total-aware coverage labels, keeping the overview’s latest-five list separate from the website page. Refresh resets website pagination; disconnected workspaces discard pending list results. Extension history keeps its existing response contract, respects the API page ceiling and explains empty pages after deletion.
- Added PGlite as a development-only dependency. Local PostgreSQL tests apply both migrations (002 twice), seed 1,105 scans across 1,103 sites, and verify pages beyond 1,000, exact counts, latest-only nonzero high counts, deterministic ties, empty/out-of-range pages, direct RPC bounds, two-owner RLS, anonymous denial, deletion fallback and local/SQL projection parity. No real Supabase credentials or data are used.
- Validation: `npm run check` passes TypeScript, all 71 tests in nine suites and production builds, including the strengthened nonzero aggregate/deletion assertions. Initial npm download hit sandbox DNS and Vitest hit Windows temporary-file rename restrictions; approved reruns succeeded. Both `npm run test:browser` and `npm run test:auth-browser` passed against the final build.
- Browser coverage now checks 1,105-history totals and 31 paginated websites, global overview values, unchanged latest-five overview selection and 390px layout. These dashboard checks passed. The first full Auth run timed out in its pre-existing missing-DOM fixture; replaced a fixed sleep with explicit initial collection readiness and added failure diagnostics. The rerun passed the complete dashboard and extension suites, including adopted partial-scan saving, immutable retry/cooldown and exclusion of unrelated history.
- `node scripts/ui-audit.mjs` passed with adapted paged-site fixtures: 0px refresh displacement, disclosure/focus retention, filter recovery, Enter/click login counts, light/dark/preference handling, >=44px controls and no horizontal overflow including 200% root text. Visually reviewed the new mobile website-pagination screenshot. Test browsers/servers closed cleanly. Native installed-Chrome/assistive-technology acceptance remains open.
- Updated README and API docs with migration order, response contracts and limits. Migration 002 and live authenticated CRUD/two-user isolation remain unverified on the hosted project. Offset pages can shift during concurrent changes; each RPC has one snapshot but separate API requests do not share one. Exact aggregates still process owner data; load benchmarks/cursor pagination/caching remain open. No automatic Supabase retention was added.
- Activation: apply `supabase/migrations/002_pagination.sql` in the existing project’s SQL editor, restart the rebuilt API, reload the unpacked extension and sign in again. Do not rerun migration 001. The user’s existing API process and live data have not been modified.

### 2026-10-16 — API request limits and sync recovery
- Reviewed the plan, API deployment guide, server/auth/store and extension retry code. The next local M2 increment adds request/write limits before expensive processing and makes automatic sync honor server retry timing.
- Implemented per-socket, per-owner and per-owner write budgets using `express-rate-limit`, with strict environment configuration, expiring HMAC counter keys, HTTP 429/Retry-After and exposed CORS rate headers. Forwarded addresses are ignored; no raw addresses or credentials are persisted by the limiter.
- Added shared retry-header parsing and wait guidance in extension/dashboard, including HTML proxy responses. Automatic sync pauses the whole queue until the response deadline; manual Retry sync cannot shorten it, and the attempted report remains frozen. Added package/lockfile dependency, deployment/configuration documentation and browser regressions.
- Validation: `npm run check` passed TypeScript, all 62 tests in eight suites and production builds after the sandboxed Vitest run failed to rename temporary files and the approved rerun succeeded. Tests cover limits before authentication/body parsing, independent owners across refreshed tokens, forged forwarding headers, CORS retry headers, exact reset boundaries, configuration rejection, immutable retries, queue-wide cooldown and recovery. Initial dependency download failed sandbox DNS; the approved `express-rate-limit` install succeeded and updated the lockfile.
- Both `test:browser` and `test:auth-browser` passed. The expanded Auth browser fixture sends an HTML 429 with an eight-second Retry-After, checks that Retry sync and new scans do not bypass the wait, and confirms the frozen snapshot plus queued scan eventually save. Dashboard HTML 429 guidance is checked too. Existing scanning/permissions/privacy, history/export/import, feedback/comparison/deletion, authentication and session-clearing flows still pass. Temporary test browsers/servers closed; the user's existing API process was not restarted. A final wording-only correction avoids calling dashboard activity automatic sync; final production rebuild passed. Visually reviewed the dashboard throttling message in the synthetic browser fixture.
- Updated `.env.example`, README and `docs/API.md` with defaults (600 socket requests, 300 owner requests, 60 owner writes per minute), configuration, recovery and deployment boundaries. Counter keys are expiring in-memory hashes; they reset on restart and are not shared between replicas. Behind a proxy the socket budget is shared; trusted gateway/distributed enforcement and direct Supabase limits remain separate work. No database migration or new extension permission is required.
- Remaining/next: database pagination and site aggregates beyond 1,000 scans; live authenticated Supabase persistence/two-user RLS; installed-Chrome acceptance; shared gateway limits/load tests before public multi-instance deployment. Later comparison/PDF/ML/blockchain tasks remain open. To activate this increment, restart the API after the build and reload the unpacked extension; reconnect because panel credentials remain memory-only.

### 2026-10-16 — Frontend design workspace
- Read and applied the user's linked Anthropic frontend-design skill. Documented palette, typography, alternative layouts, selected coverage matrix and pre-implementation critique in `docs/FRONTEND_DESIGN.md`. This supersedes the Apple visual direction; earlier audits remain historical and their interaction fixes remain protected.
- Added shared theme tokens and locally bundled IBM Plex Sans (537 KB, SIL OFL). Extension and dashboard builds include the font and license; no runtime font requests to external services, new package dependencies or new permissions. Updated the browser theme color.
- Redesigned side-panel controls/account/history/report/evidence and all existing dashboard screens: authentication/registration, summary, websites, history, reports/filters/comparison/review, integrity, settings/delete and empty/error states. Introduced real coverage cells and an overview table for up to five sites' latest scans, with total/display counts and explicit collection-not-security wording. Scores remain labeled heuristics. Shared detection, backend storage and auth/sync semantics remain unchanged.
- Removed generic overview guidance, decorative all-caps metadata and repeated card shadows. Preserved system dark mode, 44px controls, focus/disclosure/reading-position retention and stable status space. Visual critique led to one onboarding explanation, responsive summary dividers, clearer per-screen descriptions and wrapping panel toolbar controls at enlarged text.
- Validation: `npm run check` passed TypeScript, all 50 unit tests and production builds after an approved rerun for Windows sandbox temp-file rename restrictions. Both `test:browser` and `test:auth-browser` passed with isolated fixtures/mocked Auth, covering scanning/privacy/permissions, automatic upload, saved scans, import/export, feedback/comparison/delete and session handling. Final copy/layout refinements also passed TypeScript and build.
- Extended `scripts/ui-audit.mjs` with bundled-font loading, all/partial coverage, empty states, print evidence visibility and expanded screenshots. The first run caught the extension's browser-default body font; fixed explicit inheritance and reran successfully. Existing regression results: refresh displacement 0px, same finding node/open/focus/reading position, filter recovery, Enter one request/click one additional request, light/dark, motion/contrast/transparency, >=44px controls and no horizontal overflow at 380px/390px including 200% root text. Final toolbar/grid/copy rerun passed, including the explicit enlarged-text toolbar overlap assertion. Test browsers and fixture servers closed cleanly.
- Updated README, the new design document and historical audit notices. Evidence is under `test-results/frontend-design/`; older evidence is retained. Native Chrome lifecycle, physical touch, assistive technology, exhaustive contrast/zoom, slow-device performance and paginated PDF acceptance remain open. Live Supabase persistence/two-user RLS remains unverified; these visual changes do not establish a fix for the user's cloud-saving issue.
- Next steps: reload `dist/extension` in Chrome and refresh the optional dashboard; perform installed-Chrome acceptance, then verify authenticated Supabase saving and owner isolation before production hardening and the roadmap's later comparison/PDF/ML/blockchain work.

### 2026-10-15 — Apple design implementation
- Rebuilt side-panel and dashboard styling around system typography and relative spacing, a neutral light/system-dark palette, blue accents, coherent shield/navigation icons, grouped surfaces and controls at least 44px high at the default text size. Added functional sticky translucent toolbars with opaque preference/unsupported-blur fallbacks, static reduced-motion feedback and increased-contrast tokens. No new dependencies or site permissions.
- Simplified the panel: account access stays expandable, technical API settings sit one level deeper, current/saved scans use a segmented control, and report actions remain within the extension. Updated dashboard onboarding/retention guidance to explain automatic side-panel saving; import is secondary.
- Preserved keyed finding nodes, expanded state, keyboard focus and visible reading position during same-scan updates. Different reports reset disclosure state. Added native Enter submission for both sign-in forms, field validation for account creation, per-current-scan save status, persistent failure feedback and bounded-queue counts. Retry recovery clears only the recovered job's error; no credentials or scan archive were added to persistent browser storage.
- Fixed dashboard refresh displacement (29px before, 0px after), added a filtered-empty explanation/Clear filter action, and added semantic current navigation plus heading focus on deliberate navigation. Existing reports, feedback, comparisons, export, deletion and print styling are retained.
- Validation: `npm run check` passed TypeScript, all 50 tests in six suites and builds. Five new sync tests cover mixed results, retry recovery, account stop, queue capacity and detached status snapshots. Windows sandbox blocked Vitest temporary-file renames; the approved rerun passed. Both `npm run test:browser` and `npm run test:auth-browser` passed with isolated data and mocked Supabase Auth.
- `node scripts/ui-audit.mjs` now asserts the audited behavior and writes fresh evidence to `test-results/apple-design/`, leaving baseline audit evidence in `test-results/ui-audit/`. Passed: same-node/open/focus retention, reading position when a finding is inserted, reset on a different scan, one request for Enter and one additional request for a click, filter recovery, stable refresh, system fonts, light/dark changes, reduced-motion static press, solid toolbar under contrast/transparency preferences, controls >=44px and no horizontal overflow at panel 380px/dashboard 390px including 200% root text. Desktop 1440px screenshots also reviewed.
- The first enlarged-text run exposed a 6px panel overflow; wrapped the score group and stacked finding metadata using a container query. Rebuilt and reran the affected UI suite successfully. Visually reviewed light/dark desktop/panel, mobile, account and enlarged-text screenshots. A selector matching both empty-state heading and explanation was corrected in the harness. Final build is in `dist/extension` and `dist/dashboard`; temporary test browsers/servers were closed.
- Updated README and both audits with implementation status, validation evidence and remaining work. Native installed-Chrome behavior, physical touch, screen-reader output, complete contrast/zoom coverage, print pagination and performance under load remain unverified. Actual hosted Supabase writes/RLS are still unverified; these UI changes do not establish the cause or resolution of the user's live saving issue.

### 2026-10-15 — Corrected skill selection to apple-design
- User clarified that `apple-design` from the same repository was intended. Installed it successfully at `C:/Users/yaqoo/.codex/skills/apple-design`; it is available automatically next turn. Read the installed skill and verified its file hash. The earlier skill remains installed.
- Added `docs/APPLE_DESIGN_AUDIT.md` as the preferred design audit, with eight findings covering relative/system typography, common-path hierarchy, pressed feedback, continuity/status, adaptive appearance, functional materials, consistent navigation/disclosure cues and touch hit areas. Marked the earlier audit as supporting evidence and retained its confirmed interaction bugs.
- Validation: read relevant application sources, re-inspected existing extension/desktop screenshots and reused prior browser measurements against unchanged application code. No application styling/behavior changed and no new browser/test run was needed for this documentation-only correction. Recommendations are not marked implemented.
- Remaining: prototype the primary side-panel design against the requested skill, implement prioritized UI/interaction changes, then validate keyboard, larger text/zoom, light/dark/contrast preferences and any introduced motion/transparency. Native Chrome, physical-touch/assistive-technology checks, motion performance and live authenticated Supabase acceptance remain open.

### 2026-10-15 — Emil design-engineering skill and UI audit
- Installed the repository's main `emil-design-eng` skill into `C:/Users/yaqoo/.codex/skills/emil-design-eng` using the skill-installer helper; it is available automatically on the next turn. Read and applied it to both the primary extension side panel and optional web dashboard.
- Added `docs/UI_AUDIT.md` with nine prioritized findings in the skill's Before/After/Why format, source references, evidence, existing strengths and acceptance criteria. No application behavior or styling changed; all proposed fixes remain open.
- Added and successfully ran `scripts/ui-audit.mjs` with isolated synthetic API/scan fixtures and mocked Auth. Confirmed live panel updates close an expanded finding and move focus to BODY; Enter sends zero login requests while clicking sends one; dashboard refresh shifts the metric grid 29px; a severity filter with no matches renders neither findings nor an empty-state message. A separate controlled queue simulation confirmed that a later successful scan can replace an earlier failure's status.
- Visually reviewed three screenshots and checked horizontal overflow at 1440px/390px dashboard widths and 380px panel width; none observed in those fixtures. Source review also found stale manual-import/retention guidance, missing panel disclosure indicators, missing custom pressed feedback and dashboard navigation semantics/focus improvements. Findings distinguish explicit skill guidance from applied UX recommendations.
- Evidence is generated under ignored `test-results/ui-audit/`; the script requires built assets and the controlled insecure-report fixture from `npm run test:browser`. Audit contexts/server were closed. Application regression suites were not rerun for the audit-only additions; earlier results remain recorded below.
- Remaining: implement the audit priorities, then repeat the affected interaction checks. Native installed-Chrome acceptance, screen-reader/physical-touch checks, full contrast/zoom review, performance measurements and authenticated live Supabase persistence/RLS remain unverified. Current UI has no animations; missing animation or reduced-motion overrides was not treated as a defect by itself.

### 2026-10-15 — Signed in but scans are not saved
- User reports sign-in succeeds but no scans appear. Read-only health check confirms the local API is running in Supabase mode; the user's authenticated database request has not been observed.
- Implemented current-page inclusion at sign-in with a fresh upload identity (other pre-login history is excluded), a ten-second maximum wait for DOM with explicit partial-coverage reporting, authenticated API/database-read preflight before claiming connection, and actionable network/HTTP errors. Permanent upload errors stop automatic retries; Retry sync still uses the frozen snapshot.
- Updated panel copy and README to explain current-scan upload, partial reports and optional web-dashboard Refresh. `npm run check` passes typecheck, all 45 tests, and builds. Both browser suites pass: local end-to-end upload/history/export, plus mocked Supabase database-preflight failure, retry, sign-out, and automatic saving of a pre-login current scan with missing DOM while excluding unrelated old history. Temporary test servers/profiles stopped; the user's existing API process remains running.
- Next user check: reload the rebuilt extension, return to the website, sign in and allow about 10 seconds plus network time, then inspect Saved scans. The optional web dashboard needs the same account and Refresh. If the real service rejects a request, the panel now identifies the failure category. These paths are not yet confirmed as the user's sole failure cause; live authenticated Supabase writes remain unverified.

### 2026-10-15 — Disabled scan controls on new sites
- Reproduced the bug in Chromium: an ungranted test site's address was unavailable to the open panel, so both controls were disabled. The new regression failed on the previous build at “ungranted tab address visible.”
- Replaced temporary activeTab access with the tabs metadata permission so the panel can identify the active website before site access is granted. Explicit host permissions still gate collection, cookies, injection and rescanning; only localhost is granted at installation. The panel does not persist ungranted URLs, tab titles or favicons.
- Added immediate navigation updates, specific explanations for unavailable/restricted pages, and permission-grant/denial feedback. README explains the new tab-information permission and required extension reload.
- Validation: `npm run check` passed typecheck, 42 unit tests and all builds. `npm run test:browser` passed the new permission regression (ungranted URLs visible, Enable enabled/Rescan disabled, no ungranted scan records, cross-origin updates, restricted-page explanation), plus existing extension sync, CLI and dashboard regressions. The same ungranted-URL test failed before the fix. Rebuilt `dist/extension`; temporary browser/server fixtures stopped. Native Chrome permission dialogs and the user's particular website remain untested.
- Next action: reload the unpacked extension at chrome://extensions, accept the updated tab-information permission if Chrome requests it, reopen the side panel, then Enable this site and Rescan page. Browser-internal pages remain unsupported by design.

### 2026-10-15 — Side-panel workspace
- Replaced the toolbar popup/report-tab workflow with Chrome's side panel. Added current-page controls, evidence/remediation, JSON downloads, account registration/sign-in, paginated saved history, integrity checks and deletion within the extension.
- Removed disk-backed extension history; upgrade removes the old local history key. Temporary, sanitized scans use trusted browser-session memory (30 maximum).
- Added automatic immutable snapshot uploads after DOM collection settles for two seconds (ten-second upper wait), bounded retries and a retry control. Only scans started after sign-in are eligible; sign-out/account changes abort pending API requests and discard the in-memory queue.
- Final validation: `npm run check` passes typecheck, all 42 tests in 6 suites, and extension/API/CLI/dashboard builds. `npm run test:browser` and `npm run test:auth-browser` both pass after the final changes. Verified automatic upload and identical retry payload, account registration/sign-in, saved details/download/hash/delete, sign-out stops sync, reload clears login, and no credentials or report archive in persistent browser storage. Final panel screenshots reviewed at 360–380px; no horizontal overflow. Test servers/profiles were stopped afterward.
- Pause blocks subsequent queued uploads while leaving controls responsive during network requests; account settings collapse after login. A browser-wide connection lease permits only one signed-in sync panel, preventing multiple windows from uploading shared scans into different accounts. Pause/resume queue and competing-panel regressions pass. Windows sandbox denied Vitest temporary-file renames; the checks passed when rerun with the approved escalation.
- Removed obsolete popup sources/build output and updated setup/privacy/API instructions. Tests load the actual panel document in Chromium and verify toolbar side-panel configuration; native installed-Chrome panel open/close still needs manual acceptance. Live authenticated Supabase persistence/RLS remains unverified.
- Limitations: panel must remain open and signed in, API must run, browser restart clears temporary scans, and closing the panel discards unsent uploads. Reopening requires sign-in and a new scan. No separate dashboard login or manual Send scan step is required.

### 2026-10-15 — Supabase connection and sign-in
- User supplied the Supabase project URL and publishable key and reported successful execution of `001_initial.sql` (no rows returned is expected for schema creation).
- Configured ignored `.env` for the supplied project with `VYLNT_STORAGE=supabase`; preserved unrelated local settings. The project accepts native names and the supplied NEXT_PUBLIC aliases.
- Added public runtime configuration with secret/service-role key rejection, a project-scoped connection policy, dashboard email/password sign-in and user-initiated registration, automatic memory-only session refresh, sign-out, and extension email/password sign-in.
- Live read-only checks passed: Auth accepts the supplied publishable key, email provider/sign-up are enabled, email confirmation is required, and anonymous access is denied on all four tables. No accounts or scan rows were created by these checks.
- Validation: TypeScript and all builds pass; 35 tests in 5 suites pass. Existing Chromium extension/CLI/dashboard suite passes. Mocked Supabase browser tests pass invalid credentials, confirmation-required registration, sign-in, automatic refresh, sign-out, reload session clearing, empty browser token storage and mobile layout. Screenshots visually reviewed. Extension-specific Auth regression also passes connection discovery, email/password sign-in, user-JWT upload, sign-out and no credentials in extension/browser storage.
- Fixed a test-clock setup issue: SDK timers must be created after the controlled browser clock is installed. No application change was needed for refresh.
- Added documentation for Auth Site URL/Redirect URLs, sign-in, extension connection discovery, and the remaining live two-account acceptance checklist.
- Final startup check: dashboard returned HTTP 200 in Supabase mode and its public runtime configuration matched the supplied project. Opened the local preview; the temporary preview server is stopped after verification (restart with `npm run dev`). Authenticated live CRUD/RLS remains explicitly unverified until the user creates/confirms an account and signs in.
- No user passwords, refresh tokens or access tokens will be written to project files. Real authenticated storage/RLS tests require the user to sign in; migration success is currently user-reported.

### 2026-10-15 — Connected application work started
- Re-read the existing implementation and plan. Continuing the original roadmap in this checkout.
- Planned this increment: real-browser fixture checks, authenticated Express API with local persistence and a Supabase adapter/migration, React dashboard, explicit extension upload, Playwright CLI and CI.
- Local mode will run without external account credentials. Supabase deployment will remain unverified until a project is configured.
- Implemented: strict ingestion contracts, server-side rules/scoring, immutable/idempotent reports, local atomic file storage, Supabase JWT adapter and SQL migration, scan/site APIs, finding feedback, JSON export and local SHA-256 verification.
- Added a connected React dashboard with overview, sites, history, finding details, feedback, comparisons, settings/deletion, JSON export and print/PDF layout. No demo findings are presented as real scans.
- Added explicit extension upload (in-memory credentials, one retry, no automatic uploads), SPA path scan boundaries, and CSP nonce/source URL redaction. Ruleset is now 0.2.0.
- Added Playwright CLI, local Chromium/TLS setup scripts, and a real-browser suite. GitHub execution remains pending.
- Validation: `npm run check` passed TypeScript, all 30 tests in 4 suites, and extension/API/CLI/dashboard builds. Real Chromium exposed and verified the fix for report-tab authorization: extension tabs also carry `sender.tab`, so controls now require the verified extension URL.
- `npm run test:browser` passed extension TLS rules, navigation, two tabs, privacy, explicit upload, pause/resume, SPA and worker restart; CLI secure/insecure gates and rule parity; dashboard authentication, details, feedback, hash check, JSON download/import, comparison, severity filter, deletion, mobile overflow and JavaScript-error checks.
- Visually inspected desktop overview and mobile report screenshots in `test-results/`; no clipping or horizontal overflow observed.
- Generated ignored `.env` with a random local token and ignored `.local/tls` fixture credentials, without printing secrets or modifying certificate trust. Startup check found Node 20.18 lacks `--env-file-if-exists`; changed the command to supported `--env-file=.env`.
- Verified the local dashboard startup command and HTTP 200 at `http://127.0.0.1:4318`; requested opening its preview in Codex. Test data was isolated and removed from the API store after the browser suite. Screenshot/CLI artifacts remain in ignored `test-results/`.
- Supabase adapter now handles empty successful PostgREST insert responses, with mocked adapter/Auth regression tests. Actual hosted database verification remains open.
- Added API/deployment documentation, CI workflow and updated setup instructions. Dependency audit after compatible Vite updates reports zero known vulnerabilities.

### 2026-10-14 — Project kickoff
- Read the user-provided roadmap; confirmed the workspace has no existing implementation.
- Added this living plan and persistent contributor instructions in `AGENTS.md`.
- Validation: inspected workspace and available Node/npm tools. Implementation checks pending.

### 2026-10-14 — Scanner implementation
- Added eight evidence-backed rules, shared types, per-rule score caps, deterministic reports and metadata projections.
- Added Manifest V3 background/content collection with document association, trusted-context storage, bounded observations, explicit optional host access, pause/resume and rescan.
- Added popup and local report history with evidence, confidence, remediation, JSON export and clear-history controls.
- Added HTTP lab pages and automated rule/privacy test cases. README documents setup and manual browser acceptance.
- Validation: dependency installation completed; `npm run check` passed TypeScript, 17 tests across 2 suites, and the extension bundle build. Tests cover rule positives/negatives, privacy projections, mocked Chrome navigation/tab isolation, stale messages, pause, redirects and retention limits. These mocked checks do not replace actual browser acceptance.
- Dependency review: upgraded Vitest to 4.1.11 after npm identified advisories in the initial version. The updated installation audit reported zero known vulnerabilities. `package-lock.json` records installed dependencies.
- Corrected Chrome callback types, merged redirect observations into one scan and deduplicated repeated resource observations by rule/resource type.
- Environment: validation ran on Node 20.18.0. npm registry access and Vitest temporary-file writes required sandbox escalation; checks then succeeded.
- Local lab smoke check passed: both pages return HTTP 200, the insecure page omits CSP, and the hardened page includes CSP. The loopback test also required sandbox escalation. The temporary test server was stopped afterward.
- Remaining M1 gaps: actual Chrome acceptance, TLS lab, performance measurements, SPA scan boundaries, comprehensive CSP semantics and advanced DOM/library detection.

## Next implementation steps

1. M1–M3 and local blockchain M5 are complete in their documented scope. Experimental M6 is closed by user approval; no category is qualified. Repeat only relevant regressions after changes.
2. M4 is closed in the user's accepted demonstration scope (2026-10-26): scanner, fresh-build/report checks, hosted fail/fix evidence and dashboard setup are complete. Remaining branch-protection/review requirements were explicitly waived, not verified. No further M4 implementation is required for this accepted scope; uploaded-report provenance and freshness remain limitations rather than implemented guarantees.
3. Continue the separate ML-Q track: new distinguishable controlled evidence/families, frozen development/evaluation partitions, measured category gates and safe release qualification. Do not optimise against consumed test sets or let experimental scores hide findings.
4. Separate website-repository integration is supported through the pinned workflow/configuration instructions but is not certified on arbitrary user applications. Configure and test any new website separately; the extension cannot infer its source repository/commit.
5. Persistent local blockchain history was discussed but not implemented or added as a completed milestone. The current Hardhat history is disposable. Docker, public deployment, Redis/production load and phone-node work remain outside the agreed implementation scope.

### 2026-10-22 — ML-3/ML-4 continuation
- User confirms no application repositories or independent reviewers are available. Genuine reviewed-application acceptance remains open; controlled/generated fixtures cannot be promoted or used to claim real-world accuracy.
- Added a private `collection-plan` diagnostic with transitive shared-input family components, per-category class/family deficits, unknown evidence counts and explicit unobservable conflicts. It preserves labels and the existing frozen partition policy.
- Added deterministic paired application-family bootstrap intervals for model-only and guarded LSTM/logistic/rule comparisons; undefined metrics and cohorts with fewer than two families have no interval. These descriptive intervals never select weights, calibration or thresholds.
- Release staging now executes the numeric browser LSTM against hash-bound Python parity cases, fixes tolerance at 1e-6, checks structural bounds and requires coverage of every approved category. Training exports class/category/length extremes from development data only.
- Validation completed: 154 tests / 32 suites, type checking, 22 Python tests and production builds passed. The synthetic boundary reference covers 32 category/length cases with absolute parity error <=1e-6; it adds no training examples or application reviews. Private collection-plan execution passed and reports one component, no eligible development data and all reviewed-application gates unmet. An initial sandboxed Python run failed on temporary-directory permissions; the normal-access rerun passed. No active model changed. Remaining work: independently checked application diversity, actual independent application reviews, eligible fitting and held-out category qualification.

### 2026-10-22 — Approved open-source ML-3 corpus
- User explicitly approved selecting publicly licensed open-source applications for local controlled assessment. Selected pinned 2048, TodoMVC JavaScript ES6 and reveal.js barebones; retained MIT notices, locked 23 canonical source blobs by commit/SHA-256. No upstream package/build scripts, Docker or deployment.
- Added explicit source-fetch and offline collection commands, hash verification, asset allowlists, narrow loopback origin scopes, controlled configuration profiles across eight checks and independent response/browser-interaction oracles. Source changes and synthetic cookies/scripts are attributed to the VYLNT harness, not upstream vulnerabilities. Packets and labels remain controlled provenance and cannot qualify real-application de-emphasis.
- Implementation validation and actual corpus collection are in progress. Independent human review and category qualification remain open; no model bundled.
- First complete open-source corpus run passed all 33 application/profile scenarios, including three zero-finding baselines, independent configuration checks, working gameplay/task creation/slide navigation and controlled review packets. A browser discovery failure was corrected by importing Playwright after selecting the project runtime. The final run adds exact harness identity and explicit privacy-marker checks; dataset grouping/readiness and full regression remain in progress.
- Final approved-corpus validation completed: all 33 scenarios passed with exact harness/source identities and fixture-value/text exclusion; 30 new rows / 24 variants / three upstream families, three audited conflicts and zero human reviews. Combined snapshot: 59 controlled rows / 37 variants / four families, 12 conflicts (three development conflicts), frozen train/validation/test rows 20/10/29. Fitting remains ineligible after conflicting contextual development targets are excluded; no model fitting or security test evaluation was attempted.
- Full checks passed 159 tests / 33 suites, TypeScript and production builds. Source-fetch verified all cached locked files; fresh raw-download cache replay was not separately exercised beyond original Git retrieval. A focused browser scope check passed (zero requests to an unapproved local service with scope enabled; one in the unscoped control). Source, workflow, evaluation, README and docs/ML_APPLICATION_CORPUS.md now describe reproduction, hashes, controlled-label limits and remaining independent review gates. No active release changed and no native browser/PDF recertification is claimed.

### 2026-10-22 — Human review removed from experimental ML scope
- User explicitly instructs ignoring independent review. Updated current ML-3/ML-4 scope and milestone tasks to use developer-owned controlled scenario specifications and automated oracles. No reviewer recruitment, user annotations or fabricated human provenance is required.
- Remaining work: distinguishable contextual development coverage, eligible training, frozen controlled-family evaluation and a separate experimental release policy. Earlier reviewed-release tooling remains historical/optional; it has not been bypassed or represented as supporting controlled-model releases.
- Documentation-only change in PLAN.md, ML_BUILD_PLAN.md, ML_DEVELOPER_WORKFLOW.md and ML_EVALUATION.md. No runtime/data/model change; no new accuracy or completion claim. Validation: documentation consistency review and git diff --check; runtime tests not rerun for prose changes.

### 2026-10-22 — ML-3/ML-4 experimental completion work
- Resolving fitting eligibility with a new explicitly persistent readable-preference scenario, independently checked by headers and browser behaviour. Original session-cookie ambiguous cases retain their labels; persistence is not evidence of authentication purpose outside the controlled fixture.
- Controlled suite outputs now use exclusive run directories so earlier source snapshots are not overwritten. Preparing a frozen candidate and a distinct no-de-emphasis experimental release path; human review remains excluded by user instruction.
- Validation in progress; no model accuracy, release or milestone completion claimed yet.
- Trained the first fit-eligible controlled candidate: 60 examples, four families, 41 input variants; 16 training/8 validation examples after conflict filtering, 30 held-out rows in one family. Fixed seed 42/60 epochs, validation-selected epoch 60, model 52,581 bytes. Evaluated once; all qualification gates remain failed. Actual metrics are published under ml/evaluations/ with no accuracy claim.
- Bundled a separate display-only experimental release; known eligible variants get rounded scores once per input, while unknown/conflicting/missing evidence gets no score. Assessments, severity and full findings remain unchanged. Added runtime/release tampering tests, same-weight historical metadata verification, React labels and frozen PDF/JSON signals. 165 unit tests, 22 Python tests and TypeScript/build passed; worker stress passed (~302 ms / 21.6 ms max heartbeat gap). Actual two-page insights PDF for 71 repeated scripts passes visual/text inspection; raw PDF retains all evidence over 72 pages. Browser/a11y acceptance is in progress after correcting an obsolete no-model assertion. Full M6 quality acceptance remains open, distinct from completed ML-3/ML-4 experimental engineering.
- Final acceptance passed: full extension/CLI/dashboard browser regression, 14 accessibility states with zero violations/incomplete results, 318-finding worker cancellation/interaction stress, and scored Worker/API hash equality plus immutable idempotent retrieval after reload. The scored helper's initial 403 was test configuration (ephemeral origin not allowlisted), corrected without changing production CORS. Experimental insights PDF text/layout/visual checks passed; raw PDF excludes ML/actions. Existing font-descriptor warnings persist. Native Edge/Narrator and hosted runtime were not re-certified in this increment; earlier acceptance remains historical.
- Documentation now records completed controlled ML-3 and experimental ML-4 engineering, actual failed qualification metrics, new commands/policy/contracts, and M6's remaining quality acceptance. Added LF attributes for byte-bound published evaluation/source-lock JSON. No human-review prerequisite, Docker, deployment or blockchain was added. Validation: 165 tests / 35 suites, 22 Python tests, TypeScript/build, 66 controlled scenarios, browser/a11y/worker/scored-report acceptance and final whitespace checks.

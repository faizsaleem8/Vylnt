# VYLNT ML-Q2: remaining-category evidence and validation

Started 2026-10-27. ML-Q remains open until the existing category gates pass. This increment does not change the qualified JS-002 model or consume another test set.

2026-10-28 continuation under the subsequently approved [project-backed scope](ML_PROJECT_QUALIFICATION.md): developer-owned, disposable local authentication/purpose checks are permitted for registered/source-verified project work. The earlier extension-only boundary below still excludes probing production accounts/sites. Source-backed cookie role checks and HttpOnly necessity now have a controlled reference; its evidence is explicitly excluded from application training data. This advances evidence implementation, not category qualification. See [cookie-purpose work](ML_COOKIE_PURPOSE.md) and PLAN.md for checks and remaining work.

## Ordered work

**7 November — HomeInventory HSTS training.** Four registered cases
complete both HSTS training classes. Dataset `056` credits **326/630,
304 outstanding**. The six remaining HSTS examples are all validation
cases. Etherpad's pinned Linux setup is staged, with browser readiness
and HSTS collection still open. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Native HSTS installation.** Ten families demonstrate
plaintext before the application's positive response and a TLS attempt
afterward. Dataset `055` credits **322/630**, with **308 outstanding**.
HSTS needs four more training and six more validation examples.
[The active source split](ML_REGISTERED_DATASETS.md) excludes the four
successful exploratory Anonymous Notepad runs. HomeInventory and Etherpad
are the remaining HSTS family targets.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Active HSTS removal.** The registered browser control
checks that reloading the application's strict TLS response with
`max-age=0` clears the policy the browser was observed enforcing.
The prior disabled-header scenario has no such wire receipt.
Seven training and three validation families each add one distinct
change-warranted case. Dataset `054` credits **312/630, 318 outstanding**.
HSTS still needs 20 examples across both classes and splits.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Wikiflow HSTS acquisition.** The adapter covers the signed
session endpoint and independently checks native term ownership, anonymous
denial and missing or invalid CSRF tokens. Six registered browser cases
raised dataset `053` to **302/630, 328 outstanding**. HSTS still needs 30
examples across both classes and splits. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Personal Knowledge Manager HSTS acquisition.** The
registered protected-notes adapter checks the pinned backend dependencies,
native write, independent SQLite readback and denial with missing or
invalid credentials. All six strict Chromium cases earned training credit.
Dataset `052` credits **296/630, 334 outstanding**. HSTS still needs 36
examples across both classes and splits. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Contextual HttpOnly validation.** Dataset
`051` credits **290/630, 340 outstanding**. Four Etherpad cases add
validation coverage. Together with the HomeInventory cases, contextual
HttpOnly now has eight examples per split from one contributing family
each. It still needs 22 training and seven validation examples and at
least two more families per split. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Contextual HttpOnly with Secure enabled.** Dataset
`050` credits **286/630, 344 outstanding**. Four verified
HomeInventory runs add contextual HttpOnly training cases. Contextual
HttpOnly still needs 22 training and 11 validation cases, with two more
contributing families in each split. Fitting and qualification remain
gated. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Standalone module transport.** Dataset `049` credits
**282/630, 348 outstanding**. The native 8star Links module adds one
change-warranted and one contextual mixed-resource training example.
Each training class has six cases and each validation class has five.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — String evaluation in the script response policy.** Dataset
`048` credits **280/630, 350 outstanding**. Three training and three
validation families each add a change case. The paired replay confirms
that removing `unsafe-eval` blocks the fixed probe and preserves the
tested native interaction. The script-policy category still needs 48
cases across its class and split quotas. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Hash-based script response policy.** Dataset `047` credits
**274/630, 356 outstanding**. Three training and three validation families
add contextual cases with measured response enforcement and no meta policy.
All four script-policy cells now have nine cases from three families.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Broad ancestor policy and authenticated writes.** Dataset
`046` credits **268/630, 362 outstanding**. The batch adds three framing
change cases per split, taking each change class to six. The provenance
schema now supports more than 16 signed historical adapters in an existing
family. Family assignments and eligibility criteria still apply.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Paired framing denial controls.** Dataset `045` credits
**262/630, 368 outstanding**. FieldPoint, Personal Knowledge Manager
and Wikiflow add contextual training examples. Jingo adds a contextual
validation example. Framing still needs 64 examples, including 39
change-warranted examples. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Duplicate framing denial.** Dataset `044` credits
**258/630, 372 outstanding**. Four training and two validation families
add contextual framing examples with verified duplicate XFO denial.
Contextual framing now has 11 training and five validation cases.
Change-warranted framing still has three examples in each split.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Jingo stylesheet transport.** Dataset `043` credits
**252/630, 378 outstanding**. The native help-dialog and transfer checks
add one change-warranted and one contextual mixed-resource validation
case. Each validation class now has five examples across three families.
SameSite contextual validation remains empty. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — FieldPoint origin configuration.** Dataset `042` credits
**250/630, 380 outstanding**. The four change-warranted SameSite profiles
exercise native site creation under a deliberately overbroad allowlist.
SameSite still needs 58 examples, including all 15 contextual validation
examples. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Portal HSTS coverage.** Dataset `041` credits **246/630,
384 outstanding**. Portal adds three examples to each HSTS training
class, raising both to 15 examples from five families. Both validation
classes have nine examples from three families. Existing profiles still
need more independent mechanisms to satisfy all four HSTS quotas.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Retained HSTS policy.** Dataset `040` credits
**240/630, 390 outstanding**. Chromium verified the malformed header
and the installed policy independently. The new cases raise contextual
HSTS to 12 training cases from four families and nine validation cases
from three. HSTS needs 48 more examples across its four class and split
cells. All seven categories still need additional development coverage
before fitting. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Malformed HSTS.** The exact invalid fixture directive
produced seven verified change-warranted cases across the existing
split. Dataset `039` credits **233/630, 397 outstanding**. HSTS
change cases now total 12 in training and nine in validation.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — HSTS reset isolation.** BookWise and Tabinator passed
the complete same-host controls after the reset request was made
credential-free. Dataset `038` credits **226/630, 404 outstanding**.
HSTS contextual cases now total eight in training and six in
validation. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Same-host HSTS.** Five headerless native responses
received contextual labels after the installed policy and reset were
verified on the wire. Dataset `037` credits **224/630, 406 outstanding**.
BookWise remains open for this profile after a reset failure.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Native HSTS expansion.** Six verified profiles across
8star Links and Jingo add four examples after deduplication. Dataset
`036` credits **219/630, 411 outstanding**. 8star Links adds a
fourth HSTS training family in both classes. Jingo adds one missing
header validation case. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — HomeInventory contextual cookie variants.** Two
verified transient preference configurations add four training
credits across Secure and HttpOnly. Dataset `035` credits
**215/630, 415 outstanding**. Both contextual training classes have
four of 30 cases from one family. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Etherpad contextual cookie variants.** Three new
browser cookie configurations supply six Secure and HttpOnly
validation credits from the existing family. Dataset `034` credits
**211/630, 419 outstanding**. Each of those contextual validation
classes now has four of 15 cases and one of three required families.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — HomeInventory SameSite batch.** Four verified native
house-creation cases advance the training change class. Dataset `033`
credits **205/630, 425 outstanding**. The SameSite change class now
has three families in both splits, with 12 cases in each split.
Contextual cases still need more families and observations.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Native logout SameSite batch.** Four Habit Tracker
training profiles verified cross-site session revocation by reading the
disposable SQLite store after each browser request. Dataset `032`
credits **201/630, 429 outstanding**. SameSite training change
has eight examples from two families. Contextual training and
validation still require more eligible application families.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Native JSON SameSite batch.** Four Tabinator cookie
profiles exercised the native bookmark write with actual credentialed
CORS preflight and SQLite ownership checks. Dataset `031` credits
**197/630, 433 outstanding**. SameSite validation change now meets
the three-family minimum and needs three more examples. Contextual
validation still needs 15 examples across three families.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Native SameSite batch.** FieldPoint supplies three
new protected-cookie contexts and Yoyo Collection supplies four
cross-site multipart write contexts. Dataset `030` credits
**193/630, 437 outstanding**. SameSite validation change now draws
from two families. Contextual validation still has zero cases.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Native framing batch.** Three new authenticated
framed writes and one enforced ancestor-policy case bring HDR-002
to three families or more for both classes in both splits. Dataset
`028` credits **186/630, 444 outstanding**. Numerical minima and
qualification remain open. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Script-policy batch.** FieldPoint and 8star Links
added eight cases, and the layered response/meta fixture added six
contextual cases across the fixed split. Dataset `026` credits
**182/630, 448 outstanding**. HDR-003 meets the family requirement
in both classes and both splits. The numerical, fitting and
qualification gates remain open.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — 8star Links training resources.** Two admitted
settings-menu stylesheet cases establish the third training family for
both NET-001 classes. Dataset `024` credits **168/630, 462 outstanding**.
NET-001 needs 25 more training examples and 11 more validation examples
per class. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Tabinator validation resources.** Tabinator adds one
direct HTTP and one working HTTPS upgrade case. Dataset `023`
credits **166/630, 464 outstanding**. NET-001 now meets its family
minimum for both validation classes. Its training family requirement
and both numerical requirements remain open.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — FieldPoint map-resource acquisition.** The native
map-control and tile-layout checks add four NET-001 training examples
from a second family. Dataset `022` credits **164/630, 466 outstanding**.
Each mixed resource class still needs another family in each split
and more contexts. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Stylesheet resource acquisition.** Four signed
BookWise and Yoyo Collection observations cover direct HTTP and working
HTTPS upgrades with a native control and independent write readback.
Dataset `020` credits **160/630, 470 outstanding**. Both mixed-resource
classes still need at least two more training families and one more
validation family, as well as the numerical minima.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Protected cross-site SameSite acquisition.** FieldPoint
supplied the first contextual training example under its native origin
allowlist, with cookie counterfactuals and browser probes across the pinned
API mutation inventory. Dataset `019` credits **156/630, 474
outstanding**, and all seven categories remain below the fitting
requirements. SameSite still needs contextual validation and additional
independent training families. [Evidence scope](ML_CROSS_SITE_EVIDENCE.md)

**7 November — Missing HSTS header acquisition.** Five families
supplied signed missing-header cases with same-browser plaintext and
positive TLS controls. The corpus is **155/630, 475 outstanding**.
HSTS change counts are 6/30 in training and 5/15 in validation.
Contextual diversity and the numerical minima remain open.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Authenticated HSTS acquisition.** FieldPoint, Habit
Tracker and Tabinator supplied six admitted cases after authenticated
strict TLS response checks, native write readback and anonymous
denial. Both HSTS classes now meet the family minima in both splits.
The corpus is **150/630, 480 outstanding**. More distinguishable
policy contexts are required for the HSTS numerical minima.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — BookWise and Yoyo transport cases admitted.** Eight signed
strict TLS cases add the first HDR-001 and NET-001 training observations
in both classes and a second validation family in each class. The
development corpus is **144/630**, with 486 examples and 24 class or
family requirements outstanding. No category is ready to fit.
[Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Signed native resource upgrade.** The pinned Jingo editor
passed strict TLS, pre-transfer script upgrade, withdrawal/restoration
and independent Git save readback. Its contextual validation observation
passed admission. The cohort is **136/630, 494 outstanding, 0/7 ready to
fit**. High-severity findings still require runtime review. Next, acquire
training families and broaden the independently verified resource types
and outcomes. [Measured datasets](ML_REGISTERED_DATASETS.md)

**7 November — Named-origin resource upgrade verified.** Strict Chromium
TLS, actual loopback HTTPS delivery with no plaintext request, and
baseline/withheld/restored execution passed. A localhost control remained
HTTP. This resolves the browser fixture limitation. NET-001 still needs a
registered native dependency and signed contextual examples. Development
remains **135/630**. [Mechanism evidence](ML_RESOURCE_COMPATIBILITY.md)

**7 November — Etherpad validation admission.** A prospectively registered
Chromium run links the actual preference cookie to persisted settings,
HttpOnly breakage, restored functionality and denied preference-only
access. It adds two contextual validation cases. Replacing StockBase
removes one framing case and preserves the 8/4 split. The current count is
**135/630, 495 remaining, 0/7 ready to fit**. Twenty-four class or family
requirements remain. [Dataset and scope](ML_REGISTERED_DATASETS.md)

**7 November — Etherpad contextual-cookie prototype.** Pinned source staging
and the frozen dependency install passed. Chromium verified the native
preference save, a fresh reload, the expected failure under HttpOnly,
restoration, and the inability of the preference cookie to authorize access.
The executed source is excluded from fresh holdouts. The fixed development
cohort remains **134/630, 496 outstanding** pending prospective registration,
signed collection and admission. [Acquisition details](ML_DATA_ACQUISITION_CAPACITY.md)

**7 November — Tabinator native bookmark editor.** Four script policy cases
and one authenticated framed write passed registered Chromium acquisition.
The 8/4 cohort now credits **134/630, 496 remaining, 0/7 ready to fit**. Both
script-policy validation classes meet the three-family requirement and remain
short of their numeric minima. Frozen preparation reproduced byte for byte.
Etherpad has a source-screening pin and remains outside the cohort pending
independent preference and protected-access controls. [Dataset details](ML_REGISTERED_DATASETS.md)

**7 November — Wikiflow, Jingo and BookWise acquisition.** Twenty signed
Chromium scenarios increased the development cohort to **129/630 credits**,
with **501 remaining and 0/7 categories ready to fit**. Wikiflow closes the
Secure and HttpOnly change-training requirements. Jingo and BookWise provide
seven more SameSite change contexts. Edge compatibility repeats, 49 focused
tests, type checking, production build and byte-identical preparation passed.
Contextual acquisition and broader header and resource scenarios remain open.
[Measured dataset](ML_REGISTERED_DATASETS.md)

**7 November — Jingo validation family acquired.** Four signed Chromium
profiles give each of Secure and HttpOnly 19 change contexts from three
validation families. These two cells pass. The development cohort remains at
**110/630 credits, 520 outstanding** because the affected cells were already
at their numerical cap. Preflight now has 26 deficits and zero training-ready
categories. Chromium and Edge passed the scoped native controls. The frozen
preparation reproduced byte for byte. Remaining development work includes
broader contextual-cookie families and the other evidence categories.
[Measured dataset](ML_REGISTERED_DATASETS.md)

**7 November — signed native session-cookie matrix.** Five existing families
completed all 60 scenarios after two retries. Two signed captures from the
earlier stalled launcher were also retained. The fixed twelve-family split now
credits **110/630 development examples, 520 still required, 0/7 ready to fit**.
The 63 new credits advance Secure and HttpOnly change coverage. Both validation
classes still lack a third family and contextual coverage. The other five
categories' credits are unchanged. All 14 preparation files reproduced byte
for byte. Chromium checked the native controls and signed report integrity.
Type checking, builds, 72 Python tests and all 75 focused TypeScript tests
passed across the initial run and the isolated rerun of one timeout. Stage C
remains open. Fitting and fresh holdout use remain gated. [Dataset details](ML_REGISTERED_DATASETS.md)

**7 November — Yoyo validation acquisition completed.** The native Yoyo editor
adds one authenticated framing change case, three script policy change cases,
and one restrictive early meta contextual case. Chromium supplied the five
frozen captures. Edge passed the separate framed write and restrictive policy
checks. Preparation preserves all twelve existing source roles and advances to
**47/630 eligible examples, 583 still needed, 0/7 ready for fitting**. Reload,
tamper rejection, byte-for-byte dataset reproduction, duplicate supplement
rejection, 70 TypeScript tests, 72 Python tests, type checking and production
builds passed. The next gates remain in the existing plan.
[Dataset details](ML_REGISTERED_DATASETS.md)

**7 November — native contextual cookie acquisition completed.** Registered
HomeInventory controls now produce signed contextual Secure/HttpOnly examples.
The app's native consent redirect and both pinned Lax/Strict writers are
supported; incomplete or unmatched controls retain review. The new development
snapshot `.local/ml-q-material-datasets-005` preserves eleven source roles and
replaces the unsupported Notepad training slot with the prospectively registered
preference source. It has **42/630 eligible cases, 588 still needed, 0/7 ready**.
Forty-five runs supply 133 observations, 80 retained rows and 53 discarded
material repeats. Chromium and Edge passed, followed by an additional Chromium
compatibility repeat outside the frozen manifest. High-severity visibility,
older evidence policies, raw findings and released models remain unchanged.
Real readiness/failure browser tests, the existing collection acceptance, 133
TypeScript tests/twelve files, 72 Python tests, type checking and builds passed.
Counts are development evidence;
no new model was fitted or qualified. [Dataset details](ML_REGISTERED_DATASETS.md)
and [scope/controls](ML_NATIVE_PREFERENCE_PLAN.md).

**Approved counting correction, implemented development stage.** The user
approved counting independently verified target-evidence variants across
separate source families. The new registered material preparation authenticates
all 45 source captures and credits 38/630 cases. It removes 51 material repeats
and retains 40 uncertain rows. The strict archived preparation still credits
18. All seven training datasets remain unready. Candidate fitting and validation
calibration now use family weights; source independence and every original
count/quality/safety gate stay mandatory. Seventy-two relevant TypeScript tests,
72 Python ML tests, type checking, builds and actual tampering/refusal checks
passed. Fresh-holdout family-clustered evaluation and qualified model/runtime
integration under this protocol remain open. [Protocol](ML_COUNTING_CORRECTION_PROPOSAL.md)
and [current counts](ML_REGISTERED_DATASETS.md).

**Native preference evidence.** The pinned HomeInventory application now has seven executed controls separating localization, cookie visibility, competing storage and authentication. Chromium and Edge passed the readable-cookie experiment. The controlled-name variant reproduced the actual shared-rule cookie warnings. Final repetitions also passed collector/overlay identity and unchanged authentication-attribute guards. The native source and React implementation are excluded from future holdouts. This advances evidence acquisition. Typed evidence/seed integration, prospective cohort registration and fitting minimums remain open. Preference prototypes supply no training credit; the approved recount above credits 38 existing cases. [Measured scope](ML_NATIVE_PREFERENCE_PLAN.md)

**Authenticated framing acquisition.** The native BookWise form now supplies three independent database readbacks from same-origin and foreign-origin frames. Each fresh context performs one bounded POST. A source-matching response, completed traffic checks after the action and an issued producer receipt are required before recording the action fact. A new v8 policy supports this specific observed failure. The registered run passed eligibility and brought the total to 18/630. All 45 runs completed across 12 families. The case passed in Edge as a separate compatibility check. The capacity audit shows why completing 630 requires additional native evidence mechanisms and suitable source applications. [Acquisition capacity](ML_DATA_ACQUISITION_CAPACITY.md)

**Permissive-policy acquisition.** Experiment `native-dev-registration-04` prospectively includes a permissive response header and an early permissive meta policy on the native BookWise category editor (training) and Jingo wiki editor (validation). Each requires the unapproved inline probe to execute twice, a working native interaction that fails with scripts disabled, and independent storage readback. The policy origin and observed browser facts distinguish these mechanisms. Four additional change-warranted cases earned credit, two per partition. The total is 17/630. Each script-policy class still has one contributing family per partition. An unknown or contradictory control remains ineligible. The raw rule, released model, underlying feature layout and existing candidate thresholds continue to use their recorded contracts.

**6 November, BookWise follow-up.** Stage C gained missing-policy and restricted early-meta scenarios for the native category editor. Forty prospectively registered runs across 12 families produced 13 eligible cases. HDR-003 gained one change and one contextual training case. Both also passed a separate Edge compatibility check. The other six category counts held steady and all seven remain below the fitting minimums. The scope covers opening the seeded category for editing. [Dataset results and next evidence gaps](ML_REGISTERED_DATASETS.md)

**6 November 2026.** Stage C now has a prospective eight/four split, 38 bound native runs and all seven populated development files. Candidate preflight credits 11 distinct material contexts across both partitions and all seven categories. Zero categories meet all class/family minimums. Strict native HSTS, direct mixed-script dependency and one repeatable cross-site write now have real application evidence. Fitting, fresh qualification and category activation remain gated. [Results by category](ML_REGISTERED_DATASETS.md)

Latest twelve-family increment (2026-11-05): the six new adapters completed native collection, bringing acquisition to **12 families/52 batches** with 67 repeated inputs removed in `project-native-seeds-009`. Public/header/document flows use actual access controls; Habit Tracker adds native session cases. Unknown Notepad framing stays unknown. 109 tests/seven files, type checking/builds, Chromium/Edge collection, six cancellations and six actual source-integrity rejections passed. Actual preflight still reports **0/7 training-ready**. Stage C's family-count acquisition target is reached, but category evidence/classes, eligible 8/4 registration and full overlap audit remain incomplete; D real fitting, E qualification and F qualified runtime/export acceptance stay open. See `ML_NATIVE_TWELVE_FAMILIES.md` and PLAN.md. Earlier entries are historical.

Latest 2026-11-05 acquisition: BookWise and Wikiflow bring collection to **six families, 33 accepted batches and 54 discarded repetitions** in `project-native-seeds-007`. Both new families passed Chromium's three profiles, Edge framing, cancellation, source-integrity rejection and private artifact checks. 87 focused tests/seven files, type checking and builds passed. Multi-cookie controls are matched individually; unknown purpose remains uncertain, and Wikiflow's native names cannot manufacture cookie-rule examples. Actual preflight still reports **0/7 datasets ready**. Five screened candidates remain unexecuted; missing native evidence, classes, an eligible 8/4 cohort, fitting, untouched evaluation and qualified activation remain open. No category was promoted. See `ML_NATIVE_BOOKWISE_WIKIFLOW.md` and PLAN.md. Earlier progress follows.

2026-11-05 expansion: native acquisition increased from two to four families through executed FieldPoint and Yoyo session/write/framing controls. The latest aggregate `project-native-seeds-006` contains 24 completed batches, removes 48 repeats, and still reports **0/7 training-ready datasets**. All seven slices were regenerated, but category class counts, native contextual cookie/cross-site and HTTPS/upgrade evidence, and the eligible 8/4 cohort remain incomplete. 84 relevant tests, type checking/builds and Chromium/Edge/cancellation runs passed; failed TLS attempts remain excluded and exact trust removal was verified. No Stage C/D/E closure or category promotion. See `ML_NATIVE_EXPANSION.md` and PLAN.md.

2026-11-05 native script-data increment: the second native seed family, Jingo, now has missing/early/late CSP profiles with native editor, script removal/restoration, enforced inline-probe and Git-file readback controls. Version 5 assessment is opt-in; earlier policies and default analysis stay unchanged. Signed seed receipts bind numeric inputs to native control witnesses. This advances Stage A and dataset acquisition; the eligible Stage C cohort, real Stage D fit, Stage E qualification and qualified Stage F release remain open. See `ML_NATIVE_JINGO_SCRIPTS.md`, `ML_NATIVE_DATASETS.md` and PLAN.md for actual checks and counts.

2026-11-05 native contextual increment: Tabinator now passes own-origin/permitted, forbidden, repeated and nested framing controls in Chromium/Edge while keeping its native SQL/session implementation. Opt-in assessment policy v4 preserves earlier decisions and keeps partial route scope explicit. Seed v2 stores one complete contextual HDR-002 scenario; old receipts remain valid and incomplete/conflicting duplicate inputs require review. Default/readable collection, cancellation and frozen-report compatibility passed. The assembled corpus still has one family and 0/7 training-ready categories. Reliable HTTPS and other native contexts, the independent cohort, real fitting, untouched holdout gates and qualified runtime activation remain open. See `ML_NATIVE_DATASETS.md` and PLAN.md.

2026-10-29 strict native TLS environment increment: short-lived localhost leaf preparation/review and an explicit native HTTPS profile are implemented. The user authorized temporary trust/removal. Windows/browser trust proved inconsistent on repeat attempts; the exact leaf was removed and fresh checks confirmed absence. Positive native TLS acceptance remains blocked, and failed CSP resource-upgrade probes are retained without positive labels. See `ML_LOCAL_TLS_SETUP.md` and PLAN.md. This advances Step 1 implementation; it does not complete its evidence gates or the later dataset/training/evaluation steps.

2026-10-29 NET-001 correlation increment: original HTTP script references can now be matched to same-page HTTP/HTTPS request outcomes, retaining query-collision/redirect ambiguity and unknown metadata failures. Diagnostics never assert an upgrade or native functional compatibility and cannot de-emphasise findings. This extends the transfer collector; explicit upgrade/initiator and functional controls, native datasets and qualification remain open. See `ML_RESOURCE_CORRELATION.md` and PLAN.md.

2026-10-29 transport increment: same-run browser TLS metadata, complete bounded redirect coverage and DNS-versus-IP applicability now feed HDR-001 evidence; positive API claims based only on configuration were removed. Copied/altered receipts fail. Actual negative certificate/bypass/redirect cases and mock positive protocol tests are separate from native training data. Real strict-TLS native cases and category qualification remain open. See `ML_TLS_EVIDENCE.md` and PLAN.md.

2026-10-29 native data acquisition: fresh same-run SQLite/authentication/cookie controls now emit authenticated numeric seed batches. The assembler creates all seven category slices, deduplicates repeated contexts, distinguishes numerical variants from independent native scenario groups, and writes concrete blocked-training deficits. This acquires positive CK-001/CK-002 seeds from one family; it does not supply the missing contextual classes, eight/four development families or a fitted candidate. See `ML_NATIVE_DATASETS.md` and PLAN.md for measured counts and validation.

2026-10-29 native exposure enforcement: holdout registration/preflight/evaluation and release staging now enforce the Jingo/Tabinator development exclusions using canonical identities, repository IDs, commits and implementation hashes. Inventory changes invalidate the registered protocol before prediction. This completes enforcement of the known prototype exclusions, not native corpus eligibility or category qualification. Remaining work is native evidence coverage for all categories, the eligible 8/4 development split, candidate fitting, fresh holdout qualification and qualified Worker/API/report acceptance. See `ML_PROJECT_QUALIFICATION.md` and PLAN.md for checks and limits.

2026-10-29 native corpus increment: pinned Tabinator SQLite/session and protected bookmark controls add independent database oracles and sanitized signed observations. Default/readable profiles are one development-exposed family, not an eligible cohort/holdout. Records remain unlabelled/ineligible for training. Actual Chromium/Edge, cancellation and reload checks are in PLAN.md. See `ML_NATIVE_COHORT_PLAN.md` and `ML_NATIVE_TABINATOR.md`. The seven category gates remain open.

2026-10-29 release-staging increment: `ml:projects:release` verifies completed consumed evaluations, immutable artifacts/parity/preparation and original per-category counts/quality gates. Its manifest maps passing categories only and disables failed categories. Runtime/bundling remains off pending separate acceptance. This implements the release-verification/staging component, not a real qualified release. Native evidence/cohorts, fitting/evaluation and runtime integration remain open. See `ML_PROJECT_RELEASE.md` and PLAN.md.

2026-10-29 frozen project-provenance increment: v2 snapshots bind signed same-run evidence, pseudonymous owner authorization and the original scan while retaining the existing analysis release. Local/Supabase persistence, migration 006, PDF provenance, dual-format upload checks and anchor verification are implemented; validation is recorded in PLAN.md. This completes the provenance/persistence component, not qualified evidence-v4 inference or all of Stage F. Hosted migration application and category qualification remain open. See `ML_PROJECT_FROZEN_REPORTS.md`.

2026-10-29 authentication-role increment: positive native authentication can supply CK-001/CK-002 role inputs with issued scan/adapter-bound receipts. Policy v3 accepts the bounded positive-only path for partial Express inventories and retains review for unknown/conflicting/JS-dependent authentication. The native developer harness checks the actual pinned initializer without claiming complete syntax/route coverage. No category is qualified; real independent cohorts, fitting, holdout gates and qualified integration remain open. See `ML_AUTHENTICATION_EVIDENCE.md` and PLAN.md for actual validation.

2026-10-29 framing-policy increment: explicit loopback ancestor allowlists and nested-chain denial now have independent browser controls and same-run receipts. Policy-v2 assessment leaves purpose unknown; archived v1 seals retain compatibility. Native intent/trust relationships, broader scope, independent data and category qualification remain open. See `ML_FRAME_POLICY.md` and PLAN.md.

2026-10-29 direct-resource increment: a same-run request observer and functional intervention support direct HTTP classic-script dependency facts. Completion alone cannot prove execution/dependency; successful original/normal/restored controls and a positively failed withheld interaction are required. Pre-transfer TLS upgrades and native NET-001 adapters remain open. No mechanism fixture counts toward application families or qualification. See `ML_RESOURCE_COMPATIBILITY.md` and PLAN.md.

2026-10-29 meta-policy evidence increment: HDR-003 can receive bounded early self/hash policy facts from executed timing/compatibility controls, with exact original/replay binding and conservative fallback. Nonce syntax and blocking remain distinct from generation/freshness; nonce relevance is not approved. No category is promoted or application cohort manufactured. See `ML_META_POLICY.md` and PLAN.md. Broader adapters/evidence, real cohorts/fitting/evaluation and qualified release acceptance remain open.

2026-10-29 Stage E workflow increment: evidence-v4 has distinct source registration/preparation/preflight/evaluation commands with immutable candidate/parity/source bindings and exclusive consumption before prediction. All original counts/quality gates remain; labels never repair model decisions. Failed/aborted evaluations are retained. Synthetic command/unit checks do not supply applications or qualify a category. See `ML_PROJECT_HOLDOUT.md` and PLAN.md. Stage A/B evidence, C real cohorts, D real fitting, E actual holdout results and F release acceptance remain open.

2026-10-29 mutating-GET increment: explicit empty-field GET probes now distinguish initiator evidence from Origin. Native revert readback separates restored working tree/index from a completed Git commit; partial results remain unknown. Top-level Lax GET behavior cannot inherit POST-omission conclusions. Browser matrices and regression results are recorded in PLAN.md; no completeness/necessity fact, training family or category qualification is added. See `ML_CROSS_SITE_EVIDENCE.md`.

2026-10-29 document-operation iteration: native distinct-site checks cover create/edit/delete with explicit form overrides and independent Git/filesystem readback. These are three operations, not complete route coverage or new independent families. No CSRF-completeness/necessity fact or qualified model decision is emitted. Results: `ML_CROSS_SITE_EVIDENCE.md` and PLAN.md.

2026-10-29 distinct-site collection: real POSTs and independent disposable-state checks cover same-site/cross-site/anonymous/repeat controls. Chromium/Edge mechanisms and both native Jingo cookie profiles passed; omission/errors remain unknown. Source-backed necessity/complete-route checks and independent cohorts remain open. See `ML_CROSS_SITE_EVIDENCE.md`; these are not new families or model qualification.

2026-10-28 parity component: Python/JavaScript LSTM logits, logistic outputs, calibrated scores and model-only decisions now have executed Node/Chromium/Edge checks. Separate synthetic boundary contracts prevent a permanently abstaining smoke model from being the only tested decision path. This advances Stage D tooling; it is not category qualification. Results and boundaries are in `ML_PROJECT_CANDIDATE.md` and PLAN.md.

2026-10-28 candidate tooling: evidence-v4 readiness/registration/fitting and shared-JavaScript numeric parity commands are now implemented separately from the frozen engines. Five mechanics tests and empty-data command refusal passed. There is still no eligible real dataset or qualified candidate. See `ML_PROJECT_CANDIDATE.md`; category-decision parity, external holdout and release acceptance remain open.

2026-10-28 framing observation component implemented: same-origin/cross-origin/repeat browser checks, explicit enforced-CSP audit evidence, unknown failed loads, local bounds/cancellation and native Jingo observation passed. Details and actual regression results are in `ML_FRAMING_EVIDENCE.md` and PLAN.md. Embedding purpose/sensitivity, signed model-fact integration, application cohorts and category qualification remain open.

2026-10-28 implemented evidence item: required-script interaction controls now compare normal/disabled/restored functionality and independently observe inline execution/enforced CSP blocking. The native Jingo enhanced editor and controlled mechanisms passed in Chromium and Edge; unknown callbacks, failed restoration, changed metadata and redirected resources cannot produce confident facts. See `ML_SCRIPT_COMPATIBILITY.md`. This completes one scoped evidence component; remaining native scenarios, cohorts, training, held-out gates and qualified release are still open.

1. Audit **development partitions only** for missing classes and identical numeric inputs with opposed ground truth. Publish aggregate counts, input-schema identity and concrete evidence gaps; keep private examples and family keys private. Historical test outcomes are not development data.
2. Correct the extension's missing resource completion/failure collection. Correlate browser events with the original request and committed document, preserve separate requests after URL sanitization, cap storage, and retain no response bodies/error strings. A completed transfer is not proof of execution; a failed transfer is not proof of CSP blocking or harmlessness.
3. Validate current inference, cancellation, saved reports and exports on automated Chromium and the installed desktop Edge runtime where available. Record runtime versions and scope; performance measurements are not universal capacity claims.
4. Only categories with distinguishable evidence and both development classes may proceed to a separately registered candidate. Preserve the existing eight-unit/74-step model bounds, validation-only calibration and LSTM/logistic input parity. Never rewrite the ML-Q1 evaluator, candidate, release or consumed test.
5. Select a new independent source cohort before predictions. Require ten eligible fresh families, 30 distinct examples per class/category across three families per class, original precision/recall/coverage and safety/comparator gates, once-only evaluation, and runtime/export acceptance before releasing any additional category.

## Boundaries and closure

Automatic bounded metadata collection is authorized; developer-owned data only. Edge and automated Chromium are the compatibility scope. No Docker, deployment, new credentials, production scanning, app-authentication probing, user labels or optional purpose declarations.

Cookie names/lifetime do not establish authentication purpose, JavaScript requirements or CSRF protection. A missing framing policy does not establish whether embedding is intentional; missing HSTS does not establish preload status. Do not force contextual/change labels when this context is unavailable. Repetition or nuisance attributes must not manufacture distinct qualification examples.

An evidence audit passing its tests is **not** a category qualification. Categories with failed preflight or quality gates stay open. JS-002's qualified scope and immutable archived reports remain intact. Raw findings, rule severity and GitHub policy remain unchanged.

## Validation record

- Completed the development audit and published [aggregate evidence](../ml/evaluations/evidence-audit-2026-10-27.md). HDR-001/002/003, CK-001/003 and NET-001 have no eligible contextual inputs in both development partitions. CK-002 has 17 opposed-label inputs; no eligible change-required inputs in either partition and no contextual validation inputs. Only JS-002 has both development classes. This is a current-corpus result, not proof that new observable contexts can never exist.
- Extension now records terminal network outcomes by request/document identity, including service-worker restart recovery and SPA preservation. Redirect outcomes remain unknown; sanitized URL collisions cannot overwrite another request. Request IDs stay in bounded browser-session bookkeeping and never enter reports/model inputs. Unit checks and actual browser request completion/failure checks passed; an HTTP 500 transfer correctly counts as completed without claiming successful execution.
- 59 Python tests passed. The full TypeScript run passed 234 tests/43 suites with one worker; the subsequent additional service-worker restart test passed in the 13-test background suite. Type checking and production builds passed. Initial sandbox temporary-file/localhost failures were resolved with workspace-local test temporary files and an approved test run outside the sandbox; parallel subprocess timeout failures passed under the single-worker run.
- Worker checks passed on Chromium 156.0.8078.4 and installed Edge 156.0.4314.42 using disposable headless sessions. Both handled 318 findings, cancellation, malformed input and a 523,855-byte report without dropping finding references. Typical inference was 154/250 ms respectively; boundary inference 112/125 ms; maximum main-thread timer gaps 11.3/12.2 ms. These are single local observations, not p95 estimates or universal budgets.
- Full-extension cache/restart/normal and simulated 6x CPU stress passed in Chromium. The observer retained its 150-script cap and explicit collection worked after the automatic budget. Headless Edge Worker acceptance does not certify Edge's native extension side panel, screen reader or browser permission prompts.
- Full end-to-end extension/CLI/dashboard regression passed: permissions, TLS rules, navigation/tabs, privacy, automatic API sync, side-panel history/detail/export/hash, pause/resume, SPA and worker restart; CLI secure/insecure gate and rule agreement; dashboard auth, feedback, frozen/raw downloads, import, comparisons, filtering, deletion, narrow layout and no JavaScript errors. No new holdout was consumed, no candidate trained, and no category/release promoted. ML-Q remains open for seven categories.

## Remaining work

Resolve the category-specific evidence gaps before selecting another training run. Add independently checked, genuinely distinguishable development contexts without cookie-name, family-identity or nuisance-feature shortcuts. Then register and evaluate a new candidate on untouched application families using the original gates. Current missing-context cases retain Needs review; passing engineering checks must not close their qualification.

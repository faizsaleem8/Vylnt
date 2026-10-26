# ML-Q project-backed qualification

Status: implementation started 2026-10-27. Seven categories remain unqualified. The JS-002 release, historical evaluators and consumed datasets are immutable.

Continuation: `apps/cli/project-scanner.ts` is a separate, same-run collector. It captures redirect continuity, identifies IP-literal HSTS inapplicability and runs an inline script probe with an explicit execution marker and enforced CSP event. Report-only violations do not count as blocking; Trusted Types rejection and missing evidence stay unknown. It does not infer required-script compatibility, cookie purpose, CSRF coverage or upgrade functionality. Service workers and WebSockets are blocked, so applications requiring them need a future supported adapter and cannot receive complete functional coverage from this collector. Raw evidence is captured before probing and its digest is checked when merging measurements. Real Chromium and Edge acceptance passed on controlled mechanism fixtures; these are not independent training families.

Developer data preparation is specified in `docs/ML_PROJECT_DATA.md`. Source selection and eight/four family assignments can be registered before collection; only same-run signed evidence plus bound oracle records can produce evidence-v4 tensors. Identifiers/labels stay outside feature inputs. Unknown/conflicting inputs require abstention; repeated and cross-partition equivalent contexts cannot inflate readiness. This infrastructure does not establish source independence, native application suitability or model quality. No eligible twelve-family source lock has been registered, and no new candidate or holdout exists yet.

## Execution stages

- A: versioned category contracts and independent positive/contextual/unknown scenarios.
- B: paired local repository registration, exact-commit Node/Express runner, bounded evidence-v4, signed provenance, owner-scoped progress/cancellation.
- C: 12 independent development families, eight training/four validation, 30/15 distinct examples of each class/category respectively across at least three families. No wrapper/template duplication or identifier shortcuts.
- D: separate eight-unit, 74-step, <=128 KiB LSTM and identical-input logistic comparator; train-only fitting, validation-only calibration/checkpoint selection.
- E: independently selected 12-source fresh holdout with at least ten eligible families/category; original 30+30/class-family/precision/recall/coverage/safety/comparator gates and once-only evaluation.
- F: gated category manifest, Worker/API parity, immutable v2 reports, migration 006, archived compatibility, existing anchoring and raw-export behavior.

The local companion creates a new scan from its run, not an enrichment of an unrelated extension scan. Only explicit repository registration permits execution. No production credentials/database, external AI, Docker or public deployment. Browser observations and developer-controlled local probes are different provenance classes. Source code may be inspected locally but must not enter evidence/training/export artifacts. Native application code remains trusted code executing as the local OS user, not an OS sandbox.

## Native-source screening (not a selected cohort)

Read-only package-metadata screening on 2026-10-27 identified the following follow-up candidates. Jingo has since been pinned, licence-checked and exercised as one native development prototype; see `ML_NATIVE_PROJECT_CHECKS.md`. The other candidates remain uninstalled and unverified. None counts toward an eligible category dataset. Selection cannot depend on model predictions, and no predictions occurred.

| Source | Observed package metadata | Remaining suitability work |
|---|---|---|
| [muety/mininote](https://github.com/muety/mininote/blob/master/package.json), blob `1c0dca20782e4075b910f746c5a81271a5c27791` | MIT; Express, basic-auth, LokiJS; Node >=22.12; Yarn declaration | Check actual native flows, npm lock compatibility and whether any cookie categories apply; basic-auth is not cookie-purpose evidence |
| [claudioc/jingo](https://github.com/claudioc/jingo/tree/10079c22d6cb66cfa0e7a91742c631fa0a153bd4) | MIT checked; pinned native login/protected-form/cookie-dependency prototype passed initial Chromium check | Complete contextual/unknown scenarios and supported companion integration; factory initialization remains unsupported by the generic inspector; no model label or qualification claimed |
| [sinedied/hads](https://github.com/sinedied/hads/blob/main/package.json), blob `b0fdac23328f2c591f1ba16f8d9e8d1824f2e747` | MIT; Express documentation browser/editor | Establish supported native actions and category coverage; package dependencies alone do not establish authentication, embedding intent or CSRF protection |

These are preliminary candidates, not exclusions or replacements from an evaluated holdout. A twelve-family native development cohort and separate post-candidate holdout remain unselected.

Native prototype outcome: Jingo login, protected-form access, cookie dependency, authenticated write/readback, privacy and signing passed in Chromium and Edge. Its anonymous POST returned 500; the write-policy check remains `needs-review`. No training label or complete-route protection was inferred. Cancellation removed the native process and disposable data. See `ML_NATIVE_PROJECT_CHECKS.md`; this developer harness is not automatically enabled in the dashboard companion.

## Assessment policy `vylnt-project-assessment-v1`

All facts need an allowed producer, complete declared coverage and a sanitized witness digest. Missing/incomplete facts are unknown. A signature authenticates a local producer, not the truth of arbitrary application claims. Adapters are VYLNT-maintained code; a repository cannot supply its own evidence producer or label.

| Category | Change-required scenario | Contextual scenario | Required abstention |
|---|---|---|---|
| HDR-001 | Compatible validated-TLS application lacks a positive effective HSTS policy | Independently parsed effective policy supplies the control despite a heuristic warning | Unvalidated TLS, unsupported syntax, unknown effective redirect/preload scope |
| HDR-002 | Verified sensitive interaction can be embedded without applicable protection | Verified public embedding requirement with no sensitive actions in the supported route scope, or an effective restricting policy | Unknown purpose, partial routes, meta-only frame-ancestors, contradictory policies |
| HDR-003 | Supported application permits a controlled unapproved script under ineffective policy | Effective supported response/meta policy blocks the unapproved script while required functionality works | Report-only, late meta policy, unsupported dynamic trust, incomplete execution probes |
| CK-001 | Functional evidence establishes an authentication cookie lacking Secure | Supported positive evidence establishes a non-sensitive preference cookie | Cookie names/lifetime alone, incomplete auth coverage, conflicting purposes |
| CK-002 | Verified server authentication cookie lacks HttpOnly without a verified required JS dependency | Verified non-sensitive preference requires JS access | Auth cookie needing JS (architecture review), observed reads without necessity, unknown/mixed purpose |
| CK-003 | Verified authentication flow unnecessarily enables cross-site cookies without tested protection | Necessary cross-site flow retains Secure and passes complete supported CSRF checks | Incomplete state-changing routes, unknown necessity, failed/unknown CSRF checks |
| NET-001 | Complete correlated evidence shows an unprotected HTTP dependency | A correlated TLS upgrade is verified, no original HTTP transfer occurs and required functionality works | Mere failure/blocking, unresolved redirect, missing transfer/function evidence |

These are controlled scenario definitions, not model features. Oracle labels are kept separately. Transfer completion is not execution, and a negative probe result does not prove absence of a dependency. Cross-site fixtures require distinct sites. Invalid-TLS/browser-bypass runs cannot assert TLS validity or HSTS enforcement. High/critical observations stay visible even where relevance is contextual. Unknown cases never count as contextual successes.

## First producer scope

The response-policy producer independently parses supported response HSTS/XFO/CSP syntax. It emits only facts justified by the collected response and actual runner TLS settings. It cannot establish embedding purpose, cookie purpose, CSRF protection, meta timing, execution, preload membership or resource upgrades; those fields stay absent until supported source/functional adapters exist. Syntactically valid contracts and mechanical examples alone do not satisfy Stage A's independent functional exit.

## Release and closure

Each approved category needs precision >=90%, recall >=95%, coverage >=50%, no high/critical actionable contextual result, no insufficient-evidence de-emphasis, improved rule-only precision with recall loss <=5 percentage points, 30 examples/class across three families/class and ten fresh eligible families. Preserve failed experiments. Release only after runtime/report acceptance. No user labeling or reviewer recruitment. ML-Q remains open until all seven pass.

## Functional evidence deficits before training

| Category | Still required from an executed, independent development scenario |
|---|---|
| HDR-001 | Complete response/redirect provenance, controlled TLS validation and actual HSTS applicability; preload membership where relied upon. A localhost header parser is insufficient. |
| HDR-002 | Native public-embedding versus sensitive-interaction relationships and real permitted/disallowed ancestor checks. Syntax counts do not establish intent. |
| HDR-003 | Executed script-blocking and required-function compatibility checks, including supported meta timing and report-only cases. |
| CK-001 | Positive native authentication dependency versus non-sensitive preference behavior, linked to the actual cookie. |
| CK-002 | Server-session dependency and necessity of JavaScript access, distinguished from merely observing a read. |
| CK-003 | Real distinct-site native flows, Secure attributes and complete declared-route CSRF enforcement checks. |
| NET-001 | Original/final request correlation, upgrade-before-transfer evidence and native functional dependency checks. |

These missing facts remain unknown in current companion scans. Mechanical unit fixtures are not application-family examples. No new development family split or qualification holdout has been frozen. The next implementation increment is the developer-owned functional adapter/oracle harness; only then can eligible source selection and data preparation proceed without manufacturing labels.

## Results

Initial implementation: evidence-v4 contracts, strict provenance, Ed25519 signing, paired repository registration, exact-commit run hooks, owner-scoped APIs, cancellation/restart handling and Local projects dashboard controls. The source inventory inspects at most 200 tracked JS/TS files, 64 KiB each and 4 MiB total, retaining hashes and bounded syntax counts. Nested/dynamic/unresolved patterns cannot establish application purpose. Its counts do not become model features. The response producer leaves unsupported facts unknown; HSTS applicability needs separate browser evidence and cannot be inferred from a positive header or ignored TLS errors.

Validation: the full suite passed 249 tests across 46 files, followed by focused passing tests for a deletion/save race, archived signing keys and all seven category safety guards. Type checking and production build passed. Chromium and Edge demonstrated dashboard pairing through the CLI, a real two-page committed-code scan despite an uncommitted fix, signed evidence, raw PDF/current frozen-report access, cancellation and restart retention. Additional Chromium checks passed for keyboard registration, 390 px layout and stopped polling on navigation. Screenshots and local-only results are under `test-results/projects/`.

Runs use a disposable data directory and test environment; no credential is persisted in the job registry. Public signing keys are retained for older evidence after key replacement. Source-scan deletion waits for an in-flight save before removing provenance. Oversized evidence fails explicitly rather than dropping targets. Runtime v4 policy guards require category-specific positive evidence and preserve high/critical visibility; they are tested mechanically but are not enabled as a qualified model classifier.

No new training, holdout consumption, migration deployment or category promotion occurred. Stage A remains open for independently executed positive/contextual/unknown functional scenarios. Stage B's registration/scan/signing infrastructure is implemented; native application-flow adapters, real cross-site/CSRF checks and complete bounded project coverage remain open. Stages C–F remain open: no eligible new development corpus, new frozen candidate, fresh seven-category holdout, qualified v4 Worker/API release or frozen v2/migration 006 has been completed. Project evidence currently stays in the local signed sidecar and is not added to exported insight envelopes. The existing JS-002 and archived report paths remain unchanged.

Protocol references: [response-only frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [HSTS and TLS requirements](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security), [mixed-content upgrading](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests). A redirect is not HSTS, and resource transfer is not proof of execution.

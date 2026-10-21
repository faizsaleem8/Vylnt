# VYNLT open-source application corpus

## Final expanded snapshot — 2026-10-22

Active catalog: **ten MIT applications / 90 pinned files**: 2048, TodoMVC, reveal.js, javascript-tetris, canvas-tetris, impress.js, classic-chess-js, Dropzone, WebGL Fluid Simulation and Flexbox Froggy. Exact revisions, licences and SHA-256s are in `ml/applications/sources.lock.json`. Original source/notices remain private; upstream install/build scripts are never executed. All ten complete 17-profile suites passed (170 cases), including actual application controls. External analytics/ads/fonts are blocked; optional original assets may be absent, and this does not certify upstream deployments.

The accepted complete runs plus the earlier generated regression snapshot produce 193 annotations / 190 distinct rows / 163 tensors / 11 actual families. Only exact controlled target findings receive scenario labels; unrelated upstream observations stay unlabelled. Frozen grouping, conflicts and split results are in [expansion results](ML_CORPUS_EXPANSION.md). CSS Diner failed repeated level advancement, Blockrain had an upstream runtime error and Harmony required eval/GPL handling; none enters this cohort. Missing-build/licence and external-runtime candidates are also excluded. The eleven-app aggregate failed safely and is retained; acceptance uses only the ten complete suites selected before fitting.

Experimental M6 is closed; the candidate remains unqualified and unbundled. See [ML-Q](ML_QUALIFICATION_PLAN.md). The smaller snapshots below are historical.

The user approved selecting publicly licensed applications for local ML-3 controlled assessment on 2026-10-22. No live upstream site is scanned. Sources remain private under ignored `.local/ml-applications/`; the shipped application receives no upstream source, cookie values, page text or training records.

## Latest fit-eligible snapshot

The persistent-preference scenario now sets Max-Age=3600 and independently verifies browser expiry and JavaScript readability. Existing session-cookie ambiguous cases retain their original labels; lifetime is only a fixture correlation, never evidence of real cookie purpose. The generated suite adds a matching persistent case and now writes exclusive run directories under `.local/ml-controlled/runs/`, preserving all earlier reports. Both fresh suites passed 33 scenarios each.

Current application run: `.local/ml-applications/runs/2026-10-21T19-46-37-646Z-f5cb4e6b`; generated run: `.local/ml-controlled/runs/2026-10-21T19-46-14-842Z-4e62effb`. Their combined snapshot has 60 rows / 41 variants / four actual families, with 12 conflicts (three development conflicts), train/validation/test rows 20/10/30 and 16/8 eligible binary development examples. The family split is unchanged; no family was renamed or seed searched for eligibility. The frozen candidate directory is `candidate-v1` inside the application run. Dataset hash: `57c76a73771a26191628868fc2d202ea08f65e1f79845869f0e58aba2dd69a13`.

The first LSTM/comparator experiment fitted successfully and consumed the test once. Exact failures are published in `ml/evaluations/README.md`; no category is qualified. A separately identified display-only model is bundled, adding known-context scores without changing findings, severity or evidence assessments. Human review is excluded from the current phase by user instruction; reviewed-release tooling remains optional. Earlier results below describe the previous, ineligible cohort rather than current fitting status.

## Pinned sources

| Family | Upstream revision | Selected application | Retained licence |
|---|---|---|---|
| [2048](https://github.com/gabrielecirulli/2048) | `478b6ec346e3787f589e4af751378d06ded4cbbc` | Original game scripts and page | `LICENSE.txt`, MIT |
| [TodoMVC](https://github.com/tastejs/todomvc) | `ff43b02e59dfa604386bb382034b2cd07c2bcd8a` | Checked-in JavaScript ES6 distribution | `license.md`, MIT |
| [reveal.js](https://github.com/hakimel/reveal.js) | `e240e175232fa2de660a02bc0d7bf5f655b159bb` | Barebones presentation and runtime | `LICENSE`, MIT |

`ml/applications/sources.lock.json` pins 23 files with canonical source-blob SHA-256 and byte lengths. These are three source families, not 33 independent applications. Every variant from one repository retains one family ID. Shared model inputs can join different families into the same frozen component; no split assignment is promised by the source count.

The cache includes only the locked browser assets and licence notices. Optional unselected images/fonts may return 404; these are functional configuration targets, not visual reproductions. The reveal.js barebones example avoids its bundled font theme. No `npm install`, upstream lifecycle script, build script, database, Docker or deployment is needed.

## Reproduce

```powershell
npm run ml:applications:fetch
npm run lab:tls
npm run setup:browser
npm run ml:applications
```

Fetching is an explicit network operation to raw.githubusercontent.com at the pinned commits. Every byte is checked against the lock before saving; valid cached files are reused, mismatched files fail instead of being silently overwritten. Collection itself is offline. Private cache files are checked again before execution, and only locked assets are served. Both servers bind 127.0.0.1 on ephemeral ports; TLS is an existing self-signed loopback fixture. Browser and scanner requests are restricted to the current scenario's origins; remote pages, other localhost services and external assets are blocked. Servers and browser contexts close after each scenario/run.

Each run has an exclusive directory in `.local/ml-applications/runs/`. Only a run with `summary.json` is complete. Failed runs are retained for diagnosis and must not be treated as datasets. A browser/TLS/setup failure can leave an incomplete directory. The harness never changes source files or the active model.

## Configuration and ground truth

2026-10-22 expansion: 17 profiles per app (51 scenarios) include permitted/excluded classic defer, async and module fixtures. The corrected run passed all 51, including enforced browser CSP events, execution/non-execution, metadata feature agreement and application interaction. These are six new scenarios per app, not new families. Earlier 11-profile results below remain historical. The new combined v3 preparation contains 78 rows / 59 tensors / four families and still fails held-out coverage. See `ML_EVIDENCE_V3.md`; no active release promotion.

Eleven profiles per application cover baseline, missing positive HSTS, missing framing controls, broad script policy, missing cookie Secure, missing cookie HttpOnly, SameSite=None, a mixed HTTP image, an unpinned external script, an intentionally readable preference fixture and an unspecified cookie purpose. Headers, synthetic cookies and optional script/image fixtures are VYNLT harness changes. They are not claims about upstream application defaults or vulnerabilities.

Change-warranted labels express the local scenario's stated deployment requirements: a positive HSTS lifetime, framing disabled, a restrictive script policy, a server-only fixture cookie, same-site-only fixture use, HTTPS resources and integrity for a known immutable fixture script. These requirements are controlled specifications; they do not prove exploitation or authentication purpose in an arbitrary application. The readable preference case deliberately uses the same observable cookie metadata but verifies JavaScript access is required by its local fixture. The unspecified-purpose case must remain needs-review. Conflicts are retained because names and uncollected application intent cannot become model identity features.

Node's HTTPS client checks actual response configuration independently of VYNLT rule output. A separate browser context verifies gameplay, adding one synthetic task or advancing a slide; cookie profiles additionally verify applicable browser behaviour. These checks return booleans/counts only. The scanner is then checked for the specified category. Baselines must produce zero findings. No majority vote or automatic human sign-off is used.

Each successful scenario saves sanitized scan metadata, a controlled review packet and a hash-bound oracle record identifying source revision, lock hash, harness-source hash, scenario requirement, profile and scan hash. Private manifests include only target findings with controlled provenance. Review packets contain no suggested labels; independent human review counts stay zero. Network response bodies and application interaction text are never written to the scan, oracle, packet or feature dataset. Raw upstream code stays solely in the source cache/checkouts; it never enters model features.

## Prepare and audit

Use the existing private stable `VYNLT_ML_DATASET_KEY`; do not put it in chat, source files or Git. Replace `<run>` with a completed run path:

```powershell
npm run ml:prepare:insights -- --manifest <run>/manifest.json --output <run>/dataset.json
npm run ml:insights -- audit --dataset <run>/dataset.json --output <run>/split.json
npm run ml:insights -- readiness --dataset <run>/dataset.json --output <run>/readiness.json
npm run ml:insights -- collection-plan --dataset <run>/dataset.json --output <run>/collection-plan.json
```

Repeated resources do not create independent training examples. Outputs use exclusive filenames. Do not rename families, alter labels or tune the split seed to force eligibility. If fitting is refused, publish that result. This corpus improves controlled application/context coverage only. Independent application review, broader category coverage and measured held-out qualification remain necessary for completing ML-3/ML-4 and releasing relevance predictions.

## Validation record

Completed on 2026-10-22 (Asia/Calcutta): source verification passed all 23 cached files and retained licences. Two complete 33-scenario runs passed, including independent network configuration assertions, application interaction, three zero-finding baselines, target category checks, controlled packets and final fixture-value/text privacy checks. The final run is `.local/ml-applications/runs/2026-10-21T19-31-24-177Z-3124ca2b` (directory timestamp is UTC). The initial browser-runtime discovery failure was corrected before successful runs; its incomplete directory is not training input.

Preparation retained 30 rows / 24 unique input variants across three upstream families, with three conflicting variants. The unchanged family policy places two families/20 rows in train, one family/10 rows in validation and none in test. Conflict exclusion removes the contextual development targets, so fitting remains ineligible. Zero independent human reviews were manufactured.

A separate combined snapshot includes the older 29-row generated cohort: 59 controlled rows / 37 variants / four actual families, 12 audited conflicts (three development conflicts), and frozen train/validation/test counts of 20/10/29. Only the old generated family is in test. No security candidate was fitted and no model test evaluation or quality claim was made. The combined manifest preserves the original private scan paths; its source snapshots must be retained together. Dataset hash: `caf72a58569cae44c2dc4583bf82067a2c6b9344a0f456f8dbf530a08b4d4f34`; split hash: `19ebef4290d0d8ee46c25fc8c767e303ea6d49888e617d9cf20764b904d0358a`.

Full validation passed 159 tests / 33 suites, TypeScript and production builds. A focused automated browser check proved that an unapproved localhost server received zero scoped requests while permitted scripts loaded; the unscoped control contacted that server once. Its private result is `.local/ml-applications/origin-scope-result.json`. Source-fetch cache verification passed; downloads into a fresh cache were not separately exercised beyond the Git source retrieval used to create it. Optional omitted assets, other browser engines and native-device behaviour are not certified by these functional checks. PLAN.md and ML_BUILD_PLAN.md retain the remaining independent review/data/model acceptance gates.

# VYLNT run commands

## Native Tabinator evidence (developer ML-Q checks)

This is separate from project startup. Requires Git, npm, Chromium and Node 24; the runner automatically uses the bundled Node 24 or `VYLNT_NODE`. Fetch the inspected pinned source once, without Docker or real credentials:

```powershell
git init .local/ml-native-tabinator
git -C .local/ml-native-tabinator config --local core.autocrlf false
git -C .local/ml-native-tabinator -c core.hooksPath= fetch --depth 1 --no-tags --recurse-submodules=no https://github.com/lennysh/tabinator.git 51e7cffa382da3d7c710cbfc0d136868c94eb119
git -C .local/ml-native-tabinator -c core.hooksPath= -c core.autocrlf=false checkout --detach FETCH_HEAD
npm --prefix .local/ml-native-tabinator ci --ignore-scripts --omit=dev --no-audit --no-fund
npm --prefix .local/ml-native-tabinator rebuild bcrypt sqlite3 --no-audit --no-fund
npm run test:projects:native:tabinator
npm run test:projects:native:tabinator:cookie-access
npm run test:projects:native:tabinator:cancel
```

For installed Edge, set `$env:VYLNT_TEST_BROWSER = 'msedge'`, run the native checks, then `Remove-Item Env:VYLNT_TEST_BROWSER`. The source must retain the exact pinned licence/lock/tracked bytes. Synthetic accounts, SQLite data and servers are disposable. Sanitized signed prototype observations are retained under ignored `.local/ml-native-observations/tabinator/`; aggregate checks are under `test-results/native-projects/`. No class labels, model fitting or qualification result is produced. See `docs/ML_NATIVE_TABINATOR.md` for scope and remaining work.

## Fresh-commit security gate (M4)

After building VYLNT and installing Chromium:

```powershell
npm.cmd run gate
npm.cmd run gate:install-hook
```

`gate` checks committed HEAD. After installing the hook, ordinary branch pushes automatically check every distinct outgoing tip. High/critical findings at high confidence block; other findings warn. Commit fixes before retrying. Remove this installation with `npm.cmd run gate:uninstall-hook`. Existing hooks are preserved. GitHub required checks are still needed because local hooks can be bypassed. Run `npm.cmd run test:gate` for an isolated failed/fixed push demo; it does not modify the real remote. See [M4 instructions](docs/M4_SECURITY_GATE.md) for configuration, artifact paths and limits. No dashboard/API/blockchain needs to be running for the gate.

Open two PowerShell terminals. These steps use the existing configured project; adjust the folder path for another checkout.

## Terminal 1 — start the blockchain

```powershell
cd C:\Users\yaqoo\Desktop\Vylnt
npm.cmd run chain:node
```

Wait for the node to listen on `127.0.0.1:8545`. Keep this terminal running.

## Terminal 2 — build, deploy and start the dashboard/API

```powershell
cd C:\Users\yaqoo\Desktop\Vylnt
npm.cmd run build
npm.cmd run chain:compile
npm.cmd run chain:deploy
npm.cmd run dev
```

Keep this terminal running too. The API serves the dashboard; no separate dashboard server is needed.

## Open the project

- [Dashboard](http://127.0.0.1:4318)
- [Separate blockchain demo ledger](http://127.0.0.1:4318/ledger.html)

Sign in with your configured Supabase account. ML analysis runs automatically in the dashboard; no separate Python service is needed. Use **Verify report** to upload JSON for integrity checks.

## Extension in Edge

Open `edge://extensions` and click **Reload** on VYLNT after a build.

If it is not installed, enable Developer mode, choose **Load unpacked**, and select:

```text
C:\Users\yaqoo\Desktop\Vylnt\dist\extension
```

Open the extension side panel, connect to the workspace and enable access for the sites you intend to scan.

## Configuration and first installation

The existing checkout is configured for Supabase and local blockchain anchoring. Preserve its private `.env`. The relevant non-secret settings are:

```dotenv
VYLNT_STORAGE=supabase
HOST=127.0.0.1
PORT=4318
VYLNT_BLOCKCHAIN=local
```

Dependencies are already installed on the existing machine. On a fresh checkout, use Node 24 and install the locked dependencies/browser before the startup steps:

```powershell
npm.cmd ci --include=optional
npm.cmd run setup:browser
```

The fresh checkout also needs its own private environment configuration; see [API setup](docs/API.md). The installed Chromium supports server-generated PDFs and automated scanning; it is separate from the Edge extension. Do not run installation commands on every startup.

Hardhat needs Node 24. On this machine, blockchain scripts automatically select the available bundled Node 24 runtime. On another machine, use Node 24 or set `VYLNT_NODE` to its executable.

## Restart and stop

- Press **Ctrl+C** in both running terminals to stop the project. Close or refresh any dashboard tab that still displays the previously loaded page.
- If only the API stops, keep the blockchain running and restart `npm.cmd run dev`. Rebuild first if project source changed. Reuse the existing contract deployment.
- If the blockchain node stops/restarts, its previous chain history is lost. Start it again, compile/deploy the contract and restart the API. Re-save desired insights reports to anchor them on the new instance; old proofs cannot verify against the new deployment.
- Keep the node running throughout the demo, from report generation through verification.

No Docker, browser wallet or public blockchain is needed. More details: [ledger demo](docs/BLOCKCHAIN_LEDGER.md) and [report verification](docs/REPORT_VERIFICATION.md).

## Developer-only ML validation

ML-Q1's fresh JS-002 holdout passed; [measured scope and results](ml/evaluations/fresh-holdout-js002-2026-10-26.md). The seven other categories remain unqualified. The historical validation commands below inspect older candidates and retain their original failures.

For the new category-balanced candidate, collection/extension, frozen registration, training and parity commands are in [ML category candidate](docs/ML_CATEGORY_CANDIDATE.md#developer-commands). They are developer experiments; they do not change the dashboard's active model. Qualification still requires a fresh adequate holdout.

The dashboard already runs inference automatically. These are offline validation commands, not application startup requirements:

```powershell
npm.cmd run test:ml
npm.cmd run ml:validate -- --dataset .local/ml-expansion/cohort-2026-10-22/dataset.json --candidate .local/ml-expansion/cohort-2026-10-22/candidate-v1 --reproduce --output .local/ml-validation-new-run
```

Use a new output directory each time. The dataset/candidate paths refer to this development machine's existing private corpus; they are not shipped to users. Exit `1` with `qualification-blocked` means the audit ran successfully but the model still fails quality gates. Exit `2` is an invalid-input/execution failure. No model is automatically promoted. See [ML validation](docs/ML_VALIDATION.md).

### Fresh holdout and controlled category release

These are developer commands, not dashboard startup steps. The 2026-10-26 holdout has already been consumed exactly once. **Do not rerun its evaluation, delete consumption markers, or use a new folder to obtain another score.** Future qualification requires a separately registered experiment and untouched data. The following shows the protocol; paths are private local examples, not shipped datasets.

```powershell
npm.cmd run setup:browser
npm.cmd run lab:tls
npm.cmd run ml:holdout -- registry --root .local --output .local/ml-q1/exposure-NEW.json
npm.cmd run ml:applications:fetch -- --source-lock ml/applications/fresh-holdout.sources.lock.json
npm.cmd run ml:holdout:collect -- --source-lock ml/applications/fresh-holdout.sources.lock.json --output .local/ml-q1/collection-NEW
```

Before collection, developers pin independent MIT sources and record repository IDs, fork/template checks, licences and exclusions in a private source audit. Preparation requires that audit and the original family key; missing/failed scenarios or changed source/oracle files cannot qualify.

```powershell
$holdoutRuns = (Get-Content .local/ml-q1/collection-NEW/collection.json | ConvertFrom-Json).runs -join ','
npm.cmd run ml:holdout:prepare -- --source-lock ml/applications/fresh-holdout.sources.lock.json --runs $holdoutRuns --exposure .local/ml-q1/exposure-NEW.json --history-manifest .local/ml-category/cohort-2026-10-26/manifest.json --history-dataset .local/ml-category/cohort-2026-10-26/dataset.json --source-audit .local/ml-q1/source-audit.json --output .local/ml-q1/frozen-NEW
npm.cmd run ml:holdout -- preflight --dataset .local/ml-q1/frozen-NEW/dataset.json --exposure .local/ml-q1/exposure-NEW.json --output .local/ml-q1/preflight-NEW.json
```

Preflight reports exact freshness/count/conflict deficits without prediction. Once eligible, registration and evaluation take the same bound inputs. Example argument array for a **new, unconsumed** experiment:

```powershell
$holdoutArgs = @('--dataset','.local/ml-q1/frozen-NEW/dataset.json','--exposure','.local/ml-q1/exposure-NEW.json','--candidate','<new-frozen-candidate-directory>','--source-lock','<new-pinned-source-lock>','--provenance','.local/ml-q1/frozen-NEW/provenance.json','--output','.local/ml-q1/evaluation-NEW')
npm.cmd run ml:holdout -- register @holdoutArgs
npm.cmd run ml:holdout -- evaluate @holdoutArgs
```

An eligible evaluation writes exclusive candidate and dataset consumption records **before** inference. Failures/interruption remain recorded. Exit 1 means blocked qualification, not permission to retest. No fitting or threshold search occurs here.

For the completed passing experiment, release packaging may be repeated into a new output file without repeating predictions. The command below verifies the frozen evaluation receipt, stages the real React Worker/API and exports, and bundles only after acceptance passes. It archives the old release unchanged. Keep all private qualification inputs available.

```powershell
npm.cmd run ml:release:category -- --dataset .local/ml-q1/frozen-01/dataset.json --exposure .local/ml-q1/exposure.json --candidate .local/ml-category/cohort-2026-10-26/candidate-v4 --source-lock ml/applications/fresh-holdout.sources.lock.json --provenance .local/ml-q1/frozen-01/provenance.json --evaluation .local/ml-q1/evaluation-01 --output .local/ml-q1/release-NEW.json --bundle
npm.cmd run typecheck
npm.cmd run test:ml
npm.cmd test -- --maxWorkers=1
npm.cmd run build
npm.cmd run test:ml-worker
npm.cmd run test:browser
```

Omit `--bundle` to run staged acceptance only. Changed model, policy, evaluator, dataset, source/provenance, parity or evaluation bindings cause rejection. An incomplete/failed evaluation cannot be promoted. No Supabase credentials, local blockchain, user training or public deployment is needed for these checks.

## Remaining ML evidence and browser validation

Developer-only evidence audit (no training or holdout evaluation):

```powershell
npm run ml:audit:evidence -- --dataset .local/ml-category/cohort-2026-10-26/dataset.json --output .local/ml-q2/evidence-next
```

The output directory must be new. Results identify missing development classes and identical inputs with conflicting labels; they do not approve a model. Dataset paths are developer artifacts and are not shipped to users.

After `npm run build`, run the Worker checks sequentially:

```powershell
npm run test:ml-worker
$env:VYLNT_BROWSER_CHANNEL = 'msedge'
npm run test:ml-worker
Remove-Item Env:VYLNT_BROWSER_CHANNEL
npm run test:scanner
```

Edge must be installed for `msedge`. These commands use disposable automated browser sessions, not your signed-in profile. Results include the browser version, the 318-finding workload, a report near the 512 KiB storage boundary, cancellation and errors. The scanner command checks actual extension network outcomes, cache/restart and bounded dynamic-page collection in Chromium. Timings are local measurements, not production capacity or a native accessibility certification.
## Local project companion (development)

The companion creates new scans from a registered Git repository's committed files. It does not add evidence to old extension scans. Seven project-backed ML categories are still unqualified; current reports retain the existing assessments. Project evidence is currently an API-local signed record, not part of exported frozen insights. Only register code you trust: build/start scripts run as your local OS user, not inside an OS sandbox.

From the VYLNT folder, build and start the local API with the companion enabled:

```powershell
npm run build
$env:VYLNT_PROJECTS = 'local'
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.local\browsers"
npm run dev
```

Chromium must already be installed at that browser path (`npx playwright install chromium` with the same environment variable if needed). Sign in to the dashboard, open **Local projects**, and select **Register a project**. In another terminal, run its command from the VYLNT folder, supplying the explicit website repository root:

```powershell
npm run project:register -- --repo "C:\path\to\website" --code <one-time-code>
```

Codes expire after five minutes and work once. The website needs a committed npm lockfile and the existing `.vynlt/gate.json` build/start/routes configuration described in `docs/M4_SECURITY_GATE.md`. Choose HEAD or a full commit SHA in Local projects, then **Scan project**. Uncommitted changes are excluded. Progress and cancellation remain on that page; completed scans open normally. Interrupted API jobs require a new signed-in run; tokens are never saved in the job journal.

Local state and the installation signing key are in ignored `.local/project-companion/`. Keep that key private and retain `trusted-public-keys.json` for archived evidence verification. Project metadata is local to this API installation even when scan storage uses Supabase. Do not start multiple API processes against this directory. Runs set `NODE_ENV=test`, `VYLNT_PROJECT_RUN=1` and `VYLNT_DATA_DIR` to disposable storage; applications must use test-only local storage rather than production services. This environment is not an OS sandbox. Companion evidence has a separate 128 KiB limit and is rejected explicitly when oversized.

Developer acceptance (uses disposable localhost fixtures):

```powershell
npm run test:projects
$env:VYLNT_BROWSER_CHANNEL = 'msedge'
npm run test:projects
Remove-Item Env:VYLNT_BROWSER_CHANNEL
```

Saved project report provenance and verification:

Saved project insights now retain signed provenance in a v2 frozen snapshot. With Supabase storage, first apply `supabase/migrations/006_project_insight_reports.sql` after 005. Local file storage requires no SQL. Keep the installation's archived public keys for later verification. Current project-backed analysis remains unqualified; this does not enable a new model. See `docs/ML_PROJECT_FROZEN_REPORTS.md`.

Standalone verification of a project export and its separate proof can use an explicitly trusted archive:

```powershell
npm run chain:verify -- report.json proof.json .local/project-companion/trusted-public-keys.json
```

The third file is optional and defaults to that installation archive. Do not use keys supplied by the report itself. The matching local blockchain/deployment must be available.

Project browser evidence checks (CSP execution/blocking, redirects, privacy, request matching, loopback isolation and cancellation):

```powershell
npm run test:projects:browser
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:browser
Remove-Item Env:VYLNT_TEST_BROWSER
npm run test:projects:data
```

Developer-only project dataset preparation, after native application adapters, source checks and independent functional oracles exist:

```powershell
npm run ml:projects:register -- --source .local/project-source-lock.json --exposure .local/historical-exposure.json --output .local/project-development-registration
npm run ml:projects:prepare -- --registration .local/project-development-registration --manifest .local/project-collection/manifest.json --keys .local/project-companion/trusted-public-keys.json --output .local/project-development-prepared
```

These example input files are not a supplied dataset. See `docs/ML_PROJECT_DATA.md` for schemas and prerequisites. Preparation requires the existing private family key, writes only new private output directories, and returns exit code 2 with concrete deficits when data is insufficient. It does not train or qualify a model; users do not prepare datasets.

Pinned native application evidence acceptance (developer-only, after the source/dependency setup in `docs/ML_NATIVE_PROJECT_CHECKS.md`):

```powershell
npm run test:projects:native
npm run test:projects:native:cancel
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:native
Remove-Item Env:VYLNT_TEST_BROWSER
```

This creates disposable local Jingo data and checks native login/cookie dependency. It also audits source-inventory coverage and policy-v3 positive authentication inputs; the exported initializer remains a partial inventory. It is one development prototype, not seven-category qualification or an automatically enabled dashboard adapter.

Cookie JavaScript necessity / HttpOnly controls (developer evidence checks):

```powershell
npm run test:projects:cookie-access
npm run test:projects:native:cookie-access
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cookie-access
npm run test:projects:native:cookie-access
Remove-Item Env:VYLNT_TEST_BROWSER
```

These compare original, target-only HttpOnly and restored cookie states. The native command uses the same pinned Jingo family with a controlled readable-cookie response profile and audits complete positive CK-001/CK-002 inputs from issued authentication-role evidence. It does not create another family or qualify CK-002. See `docs/ML_COOKIE_ACCESS.md` and `docs/ML_AUTHENTICATION_EVIDENCE.md` for scope and limits. Outputs remain aggregate developer acceptance results, not training labels.

Source-backed cookie-purpose controls (developer-only mechanism reference):

```powershell
npm run test:projects:cookie-preference
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cookie-preference
Remove-Item Env:VYLNT_TEST_BROWSER
npm run test:projects:cookie-preference:cancel
```

The commands create disposable committed source and synthetic credentials automatically, verify preference versus authentication behaviour and clean up. No user dataset or account preparation is required. Reference evidence is excluded from application training counts. See `docs/ML_COOKIE_PURPOSE.md`.

Scoped script/CSP compatibility controls (developer-only):

```powershell
npm run test:projects:scripts
npm run test:projects:native
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:scripts
npm run test:projects:native
Remove-Item Env:VYLNT_TEST_BROWSER
```

The first command checks controlled mechanisms. The native command also tests the pinned Jingo enhanced editor with JavaScript enabled, disabled and restored, using disposable data. It requires the native setup in `docs/ML_NATIVE_PROJECT_CHECKS.md`. No user credential or dataset is needed. These are evidence checks, not a qualified HDR-003 release. See `docs/ML_SCRIPT_COMPATIBILITY.md`.

The same commands now cover bounded meta-CSP timing, self/hash policies, response/meta conjunction, late/dynamic/report-only rejection and review-only nonce-generation context. The generic project runner does not gain arbitrary website-specific functional actions. See `docs/ML_META_POLICY.md`; no startup command changed.

Direct HTTP script-dependency evidence (developer checks):

```powershell
npm run lab:tls
npm run test:projects:resources
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:resources
Remove-Item Env:VYLNT_TEST_BROWSER
```

Disposable loopback fixtures check actual HTTP transfer and normal/withheld/restored functionality. Local certificate errors are explicitly ignored; no TLS-validation/upgrade claim or category qualification follows. No trust setting changes. See `docs/ML_RESOURCE_COMPATIBILITY.md`. Startup instructions are unchanged.

Executed framing-policy evidence (developer checks):

```powershell
npm run test:projects:frame-policy
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:frame-policy
Remove-Item Env:VYLNT_TEST_BROWSER
```

These disposable HTTP loopback controls test permitted, forbidden and nested ancestors against unchanged response policies, then check policy-v2 assessment and legacy-v1 seals. They establish no application-purpose label or model qualification. See `docs/ML_FRAME_POLICY.md`; no startup command changes.

Framing evidence (developer checks):

```powershell
npm run test:projects:framing
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:framing
Remove-Item Env:VYLNT_TEST_BROWSER
```

The native command above now also checks the authenticated Jingo form in same-origin and cross-origin parents. Framing observations do not label public-embedding intent or qualify HDR-002. See `docs/ML_FRAMING_EVIDENCE.md`.

Evidence-v4 candidate development (requires eligible prepared data):

```powershell
npm run ml:projects:candidate -- preflight --prepared .local/project-development-prepared
npm run ml:projects:candidate -- register --prepared .local/project-development-prepared --output .local/project-candidate-001
npm run ml:projects:candidate -- fit --prepared .local/project-development-prepared --output .local/project-candidate-001
npm run ml:projects:parity -- .local/project-candidate-001
npm run test:projects:candidate
python -B -m unittest discover -s ml/tests -p test_project_candidate.py -v
```

Current data is not ready, so real registration/fitting remains blocked. The test command only checks empty-data refusal; Python optimizer smoke artifacts are temporary synthetic mechanics, not a qualified model. No user dataset preparation is required. See `docs/ML_PROJECT_CANDIDATE.md`.

Category-decision parity (developer checks):

```powershell
npm run ml:projects:parity -- .local/project-candidate-001 --browser chromium
npm run ml:projects:parity -- .local/project-candidate-001 --browser msedge
$env:VYLNT_PROJECT_PARITY_BROWSERS = 'chromium,msedge'
python -B -m unittest discover -s ml/tests -p test_project_candidate.py -v
Remove-Item Env:VYLNT_PROJECT_PARITY_BROWSERS
```

The first commands require a fitted experimental candidate with version-2 parity fixtures. The Python command exercises temporary synthetic optimizer fixtures, full-input logistic inference and exact calibrated decisions in all three JavaScript environments. It does not qualify a category or require user data/accounts.

Distinct-site POST and explicit GET checks (developer-only disposable data):

```powershell
npm run test:projects:cross-site
npm run test:projects:native:cross-site
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cross-site
npm run test:projects:native:cross-site
Remove-Item Env:VYLNT_TEST_BROWSER
```

The native command requires the pinned Jingo setup. It labels its SameSite=None/Secure response-attribute scenario explicitly and removes the temporary wiki afterward. Ordinary `test:projects:native` also checks the native cookie profile. No user credential is required. See `docs/ML_CROSS_SITE_EVIDENCE.md`; these observations do not qualify CK-003.

These commands now cover document creation, editing, deletion and an explicit empty-field GET revert probe. PUT/DELETE are explicitly declared POST-form overrides. Readback distinguishes restored files/index from a completed Git commit; partial native reverts remain unknown. Lax POST omission does not establish top-level GET safety. Other routes and CSRF vectors remain outside the tested scope. No startup command changed.

Fresh evidence-v4 holdout (developer qualification workflow, after eligible data and candidate fitting):

Native development seeds (before the eligible cohort exists):

Mixed-resource correlation and dependency checks: `npm run test:projects:resources`; set `VYLNT_TEST_BROWSER=msedge` in PowerShell as shown for transport checks to run Edge. The suite also verifies query-collision ambiguity, failed/HTTP-error outcomes and synthetic-fulfilment uncertainty. See `docs/ML_RESOURCE_CORRELATION.md` for scope and pending upgrade verification.

Transport/HSTS evidence mechanism: `npm run test:projects:transport`. To use Edge, set `$env:VYLNT_TEST_BROWSER='msedge'` first, then clear it with `Remove-Item Env:VYLNT_TEST_BROWSER`. This checks strict certificate rejection and bypass/redirect uncertainty with disposable local certificates; no trust-store change or qualifying application data is created. See `docs/ML_TLS_EVIDENCE.md`.

```powershell
npm run ml:projects:seeds -- --collect --output .local/project-native-seeds-004
npm run ml:projects:candidate -- preflight --prepared .local/project-native-seeds-004
```

Runs the pinned Tabinator default/readable profiles and writes seven numeric category slices plus an audit to a new private directory. Omit `--collect` to assemble already completed seed runs. This returns **2** because the seeds are not yet eligible for fitting; inspect `training-status.json`. It does not train/promote a model or consume a holdout. Existing folders are never overwritten. See `docs/ML_NATIVE_DATASETS.md` for the actual class/evidence requirements.

The holdout runner also enforces `ml/applications/native/*.source.json` as the known development-exposure inventory. Keep Jingo and Tabinator records present. Missing/changed records fail closed; inventory changes require a new registration, never modifying old receipts or clearing consumed evaluations. This adds no training examples and does not qualify a model. Focused regression: `npx vitest run tests/project-source-exposure.test.ts tests/project-holdout-command.test.ts --maxWorkers=1 --no-file-parallelism`.

After completing that once-only evaluation, verify and privately stage passing categories:

```powershell
npm run ml:projects:release -- --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001 --evaluation .local/project-holdout-evaluation-001 --output .local/project-release-stage-001
```

Staging rejects failed/altered evaluations and existing output directories. It never repeats predictions, bundles a model or enables inference; runtime acceptance remains pending. These are example paths; no real seven-category candidate/passing holdout exists yet. See `docs/ML_PROJECT_RELEASE.md`.

Holdout commands:

```powershell
npm run ml:projects:holdout -- register --candidate .local/project-candidate-001 --development .local/project-development-prepared --development-sources .local/project-development-registration/sources.json --source .local/project-holdout-sources.json --exposure .local/historical-exposure.json --output .local/project-holdout-registration-001
npm run ml:projects:holdout -- prepare --registration .local/project-holdout-registration-001 --manifest .local/project-holdout-manifest.json --keys .local/project-trusted-public-keys.json --output .local/project-holdout-prepared-001
npm run ml:projects:holdout -- preflight --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001
npm run ml:projects:holdout -- evaluate --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001 --output .local/project-holdout-evaluation-001
```

These example paths require real developer-owned artifacts; no eligible cohort/candidate exists yet. Registration requires completed Node/Chromium/Edge candidate parity and twelve new sources. Preflight checks prerequisites for all seven categories without predicting; evaluation measures quality once. Failed or interrupted attempts remain consumed. Passing evaluation does not bundle a release. See `docs/ML_PROJECT_HOLDOUT.md` for source/oracle contracts, private-data limits and remaining release acceptance. No startup or deployment command changed.

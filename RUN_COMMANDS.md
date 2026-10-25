# VYLNT run commands

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

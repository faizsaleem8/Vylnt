# VYNLT run commands

## Fresh-commit security gate (M4)

After building VYNLT and installing Chromium:

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

Open `edge://extensions` and click **Reload** on VYNLT after a build.

If it is not installed, enable Developer mode, choose **Load unpacked**, and select:

```text
C:\Users\yaqoo\Desktop\Vylnt\dist\extension
```

Open the extension side panel, connect to the workspace and enable access for the sites you intend to scan.

## Configuration and first installation

The existing checkout is configured for Supabase and local blockchain anchoring. Preserve its private `.env`. The relevant non-secret settings are:

```dotenv
VYNLT_STORAGE=supabase
HOST=127.0.0.1
PORT=4318
VYNLT_BLOCKCHAIN=local
```

Dependencies are already installed on the existing machine. On a fresh checkout, use Node 24 and install the locked dependencies/browser before the startup steps:

```powershell
npm.cmd ci --include=optional
npm.cmd run setup:browser
```

The fresh checkout also needs its own private environment configuration; see [API setup](docs/API.md). The installed Chromium supports server-generated PDFs and automated scanning; it is separate from the Edge extension. Do not run installation commands on every startup.

Hardhat needs Node 24. On this machine, blockchain scripts automatically select the available bundled Node 24 runtime. On another machine, use Node 24 or set `VYNLT_NODE` to its executable.

## Restart and stop

- Press **Ctrl+C** in both running terminals to stop the project. Close or refresh any dashboard tab that still displays the previously loaded page.
- If only the API stops, keep the blockchain running and restart `npm.cmd run dev`. Rebuild first if project source changed. Reuse the existing contract deployment.
- If the blockchain node stops/restarts, its previous chain history is lost. Start it again, compile/deploy the contract and restart the API. Re-save desired insights reports to anchor them on the new instance; old proofs cannot verify against the new deployment.
- Keep the node running throughout the demo, from report generation through verification.

No Docker, browser wallet or public blockchain is needed. More details: [ledger demo](docs/BLOCKCHAIN_LEDGER.md) and [report verification](docs/REPORT_VERIFICATION.md).

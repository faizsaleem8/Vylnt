# VYNLT fresh-commit security gate

M4 adds an npm application check to the existing scanner. It builds a clean checkout of the exact proposed Git commit, starts that application, scans configured pages and prints blocking findings plus recommended configuration changes. **High/critical findings at high confidence block; all others warn.** No exceptions or dashboard verdicts can waive a block. Experimental ML never decides the gate. A passing sampled scan is not proof the application is secure.

## Run and install

Build VYNLT and install its Chromium browser once. Then:

```powershell
npm.cmd run build
npm.cmd run setup:browser
npm.cmd run gate
npm.cmd run gate:install-hook
```

The manual gate checks committed HEAD, not uncommitted edits. The installation command adds the hook to this Git repository's effective hooks directory without changing `core.hooksPath`. It refuses another existing hook. To remove only this installation: `npm.cmd run gate:uninstall-hook`. Installing a local hook executes application scripts on future pushes; use it only for repositories whose application code you trust. This is process isolation and credential-environment reduction, not an OS security sandbox.

For another repository, use the built tool's absolute path:

```powershell
node C:\Users\yaqoo\Desktop\Vylnt\dist\cli\gate.js --repo C:\path\to\website --install-hook
node C:\Users\yaqoo\Desktop\Vylnt\dist\cli\gate.js --repo C:\path\to\website --commit HEAD
```

If moving VYNLT, uninstall the hook before moving and reinstall afterward: it intentionally pins the local executable/tool path. Use the CLI's `--help` for options. `--output` chooses an artifact parent; every run gets a unique subdirectory so old files cannot appear as a current pass. Exit codes are 0 pass, 1 blocking findings and 2 execution/configuration/cancellation failure. Tags and branch deletions are outside this branch-update gate. Every distinct proposed branch tip is checked, not every historical intermediate commit.

## Application configuration

Commit `.vynlt/gate.json` and an npm lockfile in the configured application directory. A minimal example:

```json
{
  "version": 1,
  "directory": ".",
  "buildScript": "build",
  "startScript": "start",
  "protocol": "http",
  "port": 0,
  "routes": ["/", "/account"]
}
```

`buildScript` is optional; `startScript` must run a foreground process, bind to `127.0.0.1` and read the provided `PORT`. Port 0 selects a free port; an explicitly configured occupied port fails without killing the existing listener. Script names must be simple npm script identifiers, never shell expressions. Only explicit loopback origins are scanned. The application must serve pages without interactive login in this initial version. Authenticated journeys, external dependencies, remote targets, symlinks, submodules and private-registry credentials are unsupported.

The runner uses locked `npm ci --ignore-scripts`, then the explicitly configured build/start scripts. Applications requiring dependency lifecycle scripts must adapt their reviewed build step; the gate does not silently enable them. No Supabase, GitHub or VYNLT token environment is passed to application scripts. Child processes receive only selected system-path/home/temp values plus CI/HOST/PORT; application code still has the logged-in OS user's filesystem privileges. Application console output is deliberately not written to artifacts. Diagnose script failures by running those scripts yourself.

Optional bounds: `readyTimeoutMs` 1,000–60,000 (default 15,000); `commandTimeoutMs` 1,000–300,000 (default 180,000). A whole run is limited to ten minutes; at most ten paths may be scanned. No query strings/fragments are allowed in configured paths. Loopback HTTPS fixtures can use `"protocol":"https","ignoreHTTPSErrors":true`; production HTTPS/certificate assurance is not claimed. The bundled HTTPS demo requires OpenSSL, available with Git for Windows or on the Linux runner. No host trust store is modified.

## Results and warnings

Each run saves raw scan JSON, grouped insights JSON, a gate manifest and Markdown summary. The manifest binds the checked commit, normalized configuration hash, policy, ruleset and model identity. Evidence uses the existing minimal metadata contracts. CI insights use their own `vynlt-ci-insights-v1` envelope and are **not dashboard-saved/anchored insights exports**. They cannot be uploaded as such to Verify report. Raw scan exports can still be imported through the existing dashboard flow for automatic analysis.

Fix the reported configuration, commit it and retry. Missing collection, a build/start failure, unavailable routes or a cancelled scan never pass. Severity is unchanged: cookie-name heuristics currently have medium confidence and therefore warn even when severity is high. The demo blocker is NET-001: an HTTPS page references an HTTP script, whether or not the browser actually executes it.

## GitHub

`.github/workflows/security-gate.yml` supplies the stable **VYNLT security gate** job on pushes and pull requests. The ordinary CI workflow separately tests the gate itself. No Supabase credentials, API server, blockchain or `pull_request_target` are needed. Outputs are retained for seven days, including available failure artifacts. There are no path filters on the required job.

Protect main by requiring pull requests, the exact security check and an up-to-date branch; disallow force/deletion/direct pushes and ordinary administrator bypass where supported. Require code-owner review for `.github`, gate configuration/tooling and shared policy/model/build dependencies as listed in CODEOWNERS. Repository owners must ensure those ownership rules are actually enforced. CODEOWNERS and workflow files alone do not protect a branch. Git hooks can be bypassed; GitHub requirements are authoritative. Repository administrators ultimately control these policies.

The first demo protects this repository's controlled app, not arbitrary websites scanned in the extension. The extension cannot infer which repository/commit produced a deployed website. Each real website repository must configure its own fresh build and required check. See `M4_WORKFLOW_TEMPLATE.md` for an independently pinned VYNLT tool checkout.

## Demonstration and closure

1. Commit the demo's `examples/security-gate-demo/security.json` with `"mode":"insecure"` on a disposable branch. The real gate should reject its outgoing commit.
2. A local `git push --no-verify` can bypass the hook for that demo branch, but the hosted job must fail and main must remain blocked.
3. Commit `"mode":"secure"`; rerun/push and observe a passing check. Warnings-only pages pass with visible recommendations.
4. Do not use stale JSON or mark dashboard findings fixed as a substitute for a fresh check.

`npm.cmd run test:gate` creates isolated local repositories/remotes and real Chromium scans, so it never pushes fixture code to the production repository. Hosted failing/fixed runs and actual branch protection must be inspected separately before M4 closes. Current evidence is tracked in M4_BUILD_PLAN.md and PLAN.md.

# VYNLT

A browser-based web security configuration observer with a Chrome extension, shared TypeScript rule engine, authenticated Express API, React dashboard, and Playwright command-line scanner.

**Development status:** local connected application implemented; see [PLAN.md](PLAN.md) for verification results and remaining milestones. Supabase adapter/migrations are included; hosted database acceptance, blockchain and ML remain open. Every project change must update the plan.

## Run locally

Requires Node.js 20.18+ and Chrome 120+. Node.js 22+ is recommended.

```powershell
npm.cmd install
npm.cmd run setup:local
npm.cmd run check
npm.cmd run dev
```

Open `http://127.0.0.1:4318`. With `VYNLT_STORAGE=local`, use the generated `VYNLT_API_TOKEN` from the ignored `.env`; reports are stored in `.local/scans.json`. With `VYNLT_STORAGE=supabase`, use email/password sign-in (or create an account and confirm your email). Sessions remain in page memory only. `setup:local` leaves an existing `.env` unchanged.

For the extension's controlled lab, use a second terminal:

```powershell
npm.cmd run lab
```

1. Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this project's `dist/extension` directory.
2. Visit `http://127.0.0.1:5174/insecure`.
3. Open VYNLT's toolbar popup and select **Rescan page**. Rescanning reloads the page so response headers can be observed.
4. Open **report & history** to inspect evidence, remediation, and JSON export.
5. Compare `/secure`, then use `/dynamic` to exercise DOM updates.
6. In the extension report page, expand **Send selected scan to your workspace** and select **Load workspace connection**. For Supabase, sign in with the same email/password as the dashboard; for local mode, enter the API token. Select **Send scan**, then refresh the dashboard. Alternatively, import its exported JSON in the dashboard.

After source edits, run `npm.cmd run build`, reload the extension in Chrome, and reload the test page. Other domains require **Enable this site** in the popup. Chrome host permission patterns apply across ports on that host. Pause stops new collection; resume and rescan to capture a complete new navigation.

## Structure

- `packages/core`: shared contracts, eight pure configuration rules, scoring, and metadata sanitizers.
- `apps/extension`: background collector, bounded DOM observer, popup and report history.
- `apps/server`: Express API, local persistence, Supabase adapter and authentication.
- `apps/dashboard`: React + Vite dashboard and print stylesheet.
- `apps/cli`: Playwright scanner and severity/confidence gate.
- `labs`: loopback-only HTTP/HTTPS fixtures.
- `supabase/migrations`: PostgreSQL schema, RLS and atomic ingestion.
- `tests`: rule, lifecycle, privacy, API, storage and adapter tests.
- `scripts/browser-tests.mjs`: real Chromium extension/dashboard/CLI regression checks.
- `.github/workflows/ci.yml`: build/test workflow with report and screenshot artifacts.

## What is detected

| Rule | Observation |
| --- | --- |
| HDR-001 | Missing/disabled HSTS on observed HTTPS response |
| HDR-002 | Unrecognized or missing restrictive framing policy |
| HDR-003 | Missing or broad script CSP (heuristic) |
| CK-001 | Sensitive-name cookie lacks Secure |
| CK-002 | Sensitive-name cookie lacks HttpOnly |
| CK-003 | Sensitive-name cookie permits cross-site use |
| NET-001 | HTTP resource on an HTTPS page |
| JS-002 | Third-party script lacks an integrity attribute (informational) |

Score = max(0, 100 − sum of highest severity weight per rule). Weights: critical 20, high 10, medium 5, low 2, info 0. Repeated occurrences of a rule do not compound penalties. A score is a configuration heuristic, never a probability of compromise. Missing coverage is displayed separately; an incomplete report can score 100.

## Privacy and collection boundaries

Extension reports stay in the browser unless explicitly uploaded. The extension retains at most 30 scans; the local API supports up to 1,000. Tab state uses session storage and extension history uses trusted-context local storage. Cookie values are never stored; query strings, URL credentials and fragments are removed. CSP nonces and source URL secrets are redacted. URL paths, cookie names, and user-entered review notes can still be sensitive. Raw page text, script source, request bodies, and unrelated response headers are not collected. Backend ingestion rejects extra fields and recomputes findings rather than trusting supplied scores.

Only localhost hosts are granted at install. Other HTTP(S) hosts are optional and granted through the popup. Network visibility is bounded by Chrome's permissions, including cross-origin resources. DOM references do not prove whether a resource loaded, was blocked, or was upgraded. Browser preload lists, meta CSP, full CSP semantics, cached/back-forward navigation edge cases, service-worker-generated responses and JavaScript data flow are not comprehensively analyzed. Cookie purpose is inferred from its name and marked medium confidence.

The content observer collects at most 150 scripts and 300 DOM references per update and stops after 100 mutation callbacks. Network collection is bounded to 300 resources; combined evidence to 600. SPA path changes create new snapshots and reuse the same document's response policies. Query-only/fragment changes intentionally do not create separate snapshots. Browser performance baselines and broader SPA/back-forward-cache coverage remain future work.

## Automated browser checks and HTTPS lab

```powershell
npm.cmd run setup:browser
npm.cmd run lab:tls
npm.cmd run test:browser
npm.cmd run test:auth-browser
```

The TLS setup needs OpenSSL (included with Git for Windows) and generates a self-signed localhost certificate in `.local/tls`; it does not change the system trust store. The suite starts and stops isolated test servers and headless Chromium profiles. Close an existing lab on ports 5174/5443 before running it. Screenshots and CLI reports go in ignored `test-results/`.

For interactive HTTPS fixtures, run `npm run lab` after TLS setup and visit `https://127.0.0.1:5443/insecure`. The self-signed certificate requires a browser exception for this local fixture. The automated test context ignores certificate errors only for the controlled test run.

See [docs/API.md](docs/API.md) for API endpoints, Supabase setup, CLI commands, exit codes, authentication and deployment limitations. Use `npm run dev:dashboard` for frontend hot reload while the built API runs on port 4318.

Supabase email confirmations should return to your dashboard: configure **Authentication → URL Configuration → Site URL** and allowed **Redirect URLs** as `http://127.0.0.1:4318` for this local setup. `npm run check:supabase` performs read-only live checks; the auth browser tests use controlled mock responses and do not create accounts or send email.

## Manual acceptance checklist

- Install unpacked build; rescan the insecure page; verify HDR-002, HDR-003, CK-001 and CK-002.
- Rescan the hardened page; verify framing/CSP warnings disappear (browser cookie behavior on HTTP may vary).
- Refresh and confirm a new scan ID; navigate two tabs and confirm findings stay attached to the correct page.
- Pause, reload, and confirm no new scans; resume and rescan.
- Stop/restart the extension service worker and confirm saved history remains available.
- Grant a new site from the popup and rescan; revoke host access in Chrome and verify collection stops.
- Export JSON and inspect for cookie values and query/fragment secrets.
- Clear history and verify the report list is empty.

## Architecture references

- [Chrome passive webRequest observation](https://developer.chrome.com/docs/extensions/reference/api/webRequest)
- [Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

Blockchain anchoring and ML experiments are not implemented. Local SHA-256 verification in the dashboard is only a report-consistency check. Browser **Print / PDF** uses your browser's print dialog; a dedicated server PDF generator remains future work.


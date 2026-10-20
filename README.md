# VYNLT

A browser-based web security configuration observer with a Chrome extension, shared TypeScript rule engine, authenticated Express API, React dashboard, and Playwright command-line scanner.

**Development status:** local connected application, experimental React ML inference and reviewed-data training workflow implemented; see [PLAN.md](PLAN.md) for verification results and remaining milestones. Supabase adapter/migrations are included; hosted database acceptance, evaluated ML quality, combined ML reports and blockchain remain open. Every project change must update the plan.

M1's scanner foundation is complete with automated Chromium checks and user-confirmed native Edge acceptance. Repeatable cache/restart/stress checks: `npm run test:scanner`; native loopback fixtures: `npm run lab:m1`. See [M1 acceptance](docs/M1_ACCEPTANCE.md) for evidence and limits.

M2 is complete for current development: all nine live two-account checks passed, including owner isolation and scan cleanup. Docker and deployment are outside the current scope; Redis, hosted index/plan inspection and production-load verification are deferred and not required for localhost use. The private hosted check can be rerun with `npm run verify:supabase` at `http://127.0.0.1:4321`. Never share credentials in chat. See [M2 acceptance](docs/M2_ACCEPTANCE.md) for evidence and limits.

## Run locally

Requires Node.js 20.18+ and Chrome 120+. Node.js 22+ is recommended.

```powershell
npm.cmd install
npm.cmd run setup:local
npm.cmd run check
npm.cmd run dev
```

Keep the API running, then use the extension side panel below. No dashboard webpage is required. With `VYNLT_STORAGE=local`, use the generated `VYNLT_API_TOKEN` from the ignored `.env`; the development API stores reports in `.local/scans.json`. With `VYNLT_STORAGE=supabase` (the configured project), use email/password sign-in or create an account and confirm your email. Sessions remain in panel memory only. `setup:local` leaves an existing `.env` unchanged. The older web dashboard at `http://127.0.0.1:4318` remains optional.

For the extension's controlled lab, use a second terminal:

```powershell
npm.cmd run lab
```

1. Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this project's `dist/extension` directory.
2. Visit `http://127.0.0.1:5174/insecure`.
3. Click VYNLT's toolbar icon to open its side panel alongside the website.
4. Expand **Account & automatic sync**, select **Load workspace connection**, then **Sign in** (or **Create account**, confirm your email and return here). Pressing Enter also submits sign-in. Local development mode instead asks for its API token. The default API address is localhost; expand **Connection settings** only when you need to change it.
5. Select **Rescan page**. This reloads the current page to observe response headers. Inspect evidence and remediation under **Current scan**; select **Export JSON** to download it.
6. Sign-in checks authenticated API/database access, then automatically syncs the current page's existing scan and new scans while the panel stays open. **Saved scans** retrieves paginated history from the API/Supabase; select a scan to inspect, review findings, compare saved observations, export, verify its hash or delete it. No manual send button or separate dashboard login is needed.
7. Compare `/secure`, then use `/dynamic` to exercise DOM updates. Rescan to save later changes as a new immutable report.

After source edits, run `npm.cmd run build`, reload the extension in Chrome, and reload the test page. Other domains require **Enable this site** in the side panel. Chrome host permission patterns apply across ports on that host. Pause stops collection and new sync attempts; an already submitted request can finish. Resume and rescan to capture a complete new navigation.

The side panel and optional dashboard share an inspection-workspace design: violet navigation, locally bundled IBM Plex Sans, cool neutral evidence surfaces and a collection coverage matrix. Coverage says what was collected, not whether a site is secure. Both surfaces follow system light/dark appearance and provide scalable text, reduced-motion and increased-contrast treatments with opaque toolbars. Live scan updates preserve expanded findings and keyboard focus. The current-page status identifies that scan's save outcome; account feedback retains unresolved failures even when another scan saves. Counts describe the open panel's bounded sync queue, not the workspace's full history. The requested frontend-design skill, design plan, implementation and acceptance limits are recorded in [docs/FRONTEND_DESIGN.md](docs/FRONTEND_DESIGN.md). Earlier audits remain historical evidence.

## Review and compare inside the extension

Uploads have separate 512 KiB limits for the request and the generated report. If added findings make a report too large, the panel explains the rejection and retains the failure. **Retry sync** skips that frozen snapshot; export JSON while available or capture a new scan after page changes. Other scans can still save. Local and Supabase storage enforce the same report limit, without silently dropping evidence. This update requires an API restart and extension reload, but no SQL migration.

In **Saved scans**, open a report and expand a finding. Choose **Open**, **Fixed**, **Accepted risk**, or **False positive**, add optional notes, and select **Save decision**. Reviews persist separately from the immutable report. Failed saves retain your draft while the report remains open; switching reports or signing out discards unsaved edits.

Open **Compare saved scans** to select another saved observation of the same page URL. Use **Previous comparisons** / **Next comparisons** to reach baselines beyond the current history page. Results show newly observed, no longer observed and changed evidence, plus score differences and coverage/ruleset warnings. These differences do not prove remediation. The optional dashboard has the same comparison workflow.

Open **History trends** on a saved report in the extension to view configuration scores and finding counts over observation time. The view includes the selected scan and up to 30 most recent other scans of the exact same page. Expand **Observation values** for timestamps, counts, scan IDs and collection coverage. Hollow dots indicate incomplete collection; large dots mark the selected scan. Coverage differences and unknown historical ruleset versions limit interpretation. **Refresh trends** reloads the bounded history or retries a failed request. Trends remain in memory and are not included in JSON exports.

Supabase comparisons and trends require [003_comparison.sql](supabase/migrations/003_comparison.sql), applied after migration 002. Review storage uses the existing feedback table. Local mode requires no SQL setup. The user reported the requested SQL script applied on 2026-10-20; hosted availability and real-account verification remain unverified. This trend increment requires no new SQL.

## Download a PDF from the extension

Open **Saved scans**, select a report, then choose **Download PDF**. The authenticated API generates an A4 report and downloads it directly from the side panel. It includes collection coverage, the heuristic score, evidence, recommendations, the stored JSON hash and saved review decisions/notes. Save review drafts before exporting. Current unsaved scans, trends and comparisons are not included. The PDF does not modify the saved report and is not blockchain verification.

After updating, run `npm run build`, restart the API and reload the unpacked extension. The server needs Chromium: run `npm run setup:browser` once if it is not already installed. The default browser directory is `.local/browsers`; deployments can set `PLAYWRIGHT_BROWSERS_PATH`. Linux hosts also need Playwright's Chromium system dependencies (`npx playwright install-deps chromium`). Playwright is now a production dependency, and the build copies the bundled font/license into `dist/server`. Run the API from the project root.

One PDF renders per API process; simultaneous requests return a retry message. The renderer allows ten seconds for browser startup and twenty seconds for rendering. It uses escaped text, disables page JavaScript and network requests, and retains no PDF file on the server. Downloads are explicit user exports. A failure leaves the report intact; retry the button or export JSON.

`npm run test:pdf` generates stress/empty fixtures under `test-results/pdf`; `python scripts/check-pdf-layout.py` checks page numbers, text completeness and bounds with `pdfplumber`. Render those PDFs using Poppler for visual acceptance. The fixtures are synthetic; PDF tagging is enabled but full PDF/UA and multilingual font coverage are not certified.

For repeatable PDF latency and process-memory measurements, run `npm run benchmark:pdf` after building and installing Chromium. See [docs/PERFORMANCE.md](docs/PERFORMANCE.md) for profiles, results and measurement limits. This opt-in benchmark uses only synthetic data and does not contact Supabase.

Run `npm run benchmark:storage` to measure the real history/site/comparison SQL functions at 1,000/10,000 scans and local-file reads/review writes at 100/1,000 scans. It uses isolated synthetic data, checks returned results and access boundaries, and removes its temporary store files. Results are local baselines, not hosted Supabase capacity claims.

Run `npm run benchmark:observer` after a build to compare a controlled dynamic page with/without the actual content collector. It verifies the final snapshot at the 100-callback budget, sanitization and explicit rescans. Chrome messaging is mocked in this benchmark; full extension workflows remain covered separately by `test:browser`.

## Structure

**Two PDF outputs:** dashboard **Print / PDF** shows all findings with severity and full evidence, independent of the onscreen filter, without recommended actions or ML. The extension's **Download PDF** also returns this full-data report. The React ML panel has a separate **Download insights PDF** for grouped recommendations, affected counts, current experimental model outputs and model identity. The API verifies React's results before rendering; stale/modified results are rejected. The current synthetic LSTM is not validated security advice. Exports do not change saved evidence or the original scan hash; persisted combined reports/blockchain remain open. Restart the rebuilt API and refresh the dashboard to activate the split.

The React dashboard automatically runs experimental ML when a saved scan opens. VYNLT ships and manages the model; users do not prepare training data, upload models or click Run. No Python service, Docker or SQL migration is needed for browser predictions. Results stay in page memory; original findings, scores and exports remain unchanged. The current bundled model is a synthetic demo with no demonstrated real-world accuracy.

Developer-owned ML preparation, training/evaluation and bundling are documented in [ml/README.md](ml/README.md). The dashboard now runs the first **snapshot LSTM**, with rule-linked recommended changes. `npm run ml:demo:lstm` exercises PyTorch CPU training, family-separated comparison and numeric browser export; `ml:prepare -- --sequence` prepares private annotated reports and `ml:bundle` validates/releases the artifact. The logistic baseline remains available via `ml:demo`. Snapshot group order is not runtime execution or source/sink evidence. Independent reviewed data, useful measured quality/calibration, behavioral sequences and combined ML reports remain open. VYNLT does not automatically train on user scans or infer ground truth from rule scores.

- `packages/core`: shared contracts, eight pure configuration rules, scoring, and metadata sanitizers.
- `packages/ui`: shared theme and locally bundled IBM Plex Sans with its SIL Open Font License.
- `apps/extension`: background collector, bounded DOM observer, side-panel workspace and automatic sync.
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

Signing in enables automatic upload of the active page's current scan and new scans. Other pre-login history remains excluded. The extension keeps up to 30 temporary observations in trusted browser-session memory, not a disk-backed local history. Upgrading removes the old local-history key. Saved history comes from the authenticated API; configured Supabase mode persists it in your account. Cookie values are never stored; query strings, URL credentials and fragments are removed. CSP nonces and source URL secrets are redacted. URL paths, cookie names, and user-entered review notes can still be sensitive. Raw page text, script source, request bodies, and unrelated response headers are not collected. Backend ingestion rejects extra fields and recomputes findings rather than trusting supplied scores.

Automatic sync snapshots a navigation after DOM metadata settles for two seconds, or after ten seconds of continuous changes or missing DOM data. Missing DOM is explicitly labeled as partial coverage rather than blocking the upload indefinitely. Later mutations do not rewrite the saved report. The queue is capped at 30 scans and retries failures up to five times with backoff; **Retry sync** restarts recoverable failed attempts using the exact same snapshot/ID; size-rejected snapshots are skipped. Sign-out stops sync and discards the queue. Closing/reloading the panel clears the login and unsent queue; sign in and rescan after reopening. Browser restart clears all temporary observations. Only the active page's pre-login scan is included at sign-in, using a fresh upload ID to avoid conflicts with an older saved snapshot. Other old scans are not uploaded to the newly connected account. The API must remain running. Connection, rejected-session, validation, oversized-report and database failures are shown in the panel; permanent upload errors wait for user action instead of retrying silently. If using the optional web dashboard, sign in to the same account and click Refresh to retrieve newly saved scans. Live authenticated Supabase persistence and two-user isolation still need acceptance testing.

Only one panel can hold an active sync connection per browser profile. Sign out or close that panel before connecting another window, so the same observations cannot be automatically sent to two different accounts.

The API now limits requests per connection and verified owner, with a separate write allowance. If an upload receives HTTP 429, the panel waits for `Retry-After` before retrying any queued scan; **Retry sync** does not bypass that cooldown. Reports retain their original frozen snapshots. The dashboard shows how long to wait before repeating an action. Defaults and deployment boundaries are in [API request limits](docs/API.md#request-limits-and-recovery). The request limits themselves require no migration. For the pagination update below, apply migration 002 before restarting the updated API.

Only localhost hosts are granted at install. Other HTTP(S) hosts are optional and granted through the side panel. Network visibility is bounded by Chrome's permissions, including cross-origin resources. DOM references do not prove whether a resource loaded, was blocked, or was upgraded. Browser preload lists, meta CSP, full CSP semantics, cached/back-forward navigation edge cases, service-worker-generated responses and JavaScript data flow are not comprehensively analyzed. Cookie purpose is inferred from its name and marked medium confidence.

The extension uses Chrome's `tabs` permission to identify the active website when you switch tabs with the side panel open. Chrome may display a browsing-history permission warning for this capability. VYNLT only queries the active tab for these controls; it does not collect browsing history, tab titles or favicons. This permission does not authorize scanning: each additional website still requires **Enable this site**. Browser internal pages, local files and Chrome Web Store pages show an explanation with scanning disabled. After upgrading, reload the unpacked extension and reopen the side panel so the new permission takes effect.

The content observer collects at most 150 scripts and 300 DOM references per update and stops after 100 mutation callbacks. Network collection is bounded to 300 resources; combined evidence to 600. SPA path changes create new snapshots and reuse the same document's response policies. Query-only/fragment changes intentionally do not create separate snapshots. Browser performance baselines and broader SPA/back-forward-cache coverage remain future work.

## Automated browser checks and HTTPS lab

```powershell
npm.cmd run setup:browser
npm.cmd run lab:tls
npm.cmd run test:browser
npm.cmd run test:auth-browser
npm.cmd run test:ui
```

The TLS setup needs OpenSSL (included with Git for Windows) and generates a self-signed localhost certificate in `.local/tls`; it does not change the system trust store. The suite starts and stops isolated test servers and headless Chromium profiles. Close an existing lab on ports 5174/5443 before running it. Screenshots and CLI reports go in ignored `test-results/`.

Run the UI regression script after a build and `test:browser` (it uses that suite's controlled report fixture). It checks disclosure/focus retention, keyboard skip links, Enter-to-sign-in, filter recovery, stable refresh layout, minimum control heights, actual font loading, collection coverage, empty states, print evidence visibility, themes, preferences, 320px reflow and 200% root text. It also audits 14 states with axe and records simulated slow-loading measurements. It uses an isolated API and mocked Auth, with evidence in `test-results/frontend-design/`. M3's desktop Edge keyboard/Narrator/200% zoom and PDF reading checks were confirmed by the user; touch testing was excluded. See [M3 acceptance](docs/M3_ACCEPTANCE.md) for results, limits and PDF/UA reproduction.

For interactive HTTPS fixtures, run `npm run lab` after TLS setup and visit `https://127.0.0.1:5443/insecure`. The self-signed certificate requires a browser exception for this local fixture. The automated test context ignores certificate errors only for the controlled test run.

See [docs/API.md](docs/API.md) for API endpoints, Supabase setup, CLI commands, exit codes, authentication and deployment limitations. Use `npm run dev:dashboard` for frontend hot reload while the built API runs on port 4318.

Supabase email confirmations need a valid return URL; after confirming, return to the extension side panel and sign in. Configure the existing local return page under **Authentication → URL Configuration → Site URL** and allowed **Redirect URLs** as `http://127.0.0.1:4318` for this local setup. `npm run check:supabase` performs read-only live checks; the auth browser tests use controlled mock responses and do not create accounts or send email.

## Database pagination update

History now fetches bounded summaries from PostgreSQL, with totals and site counts covering scans beyond the previous 1,000-row read cap. The optional dashboard has website pagination and global overview metrics; saved history in the extension uses the same paginated API. Local file storage retains its 1,000-scan limit.

**Existing Supabase installation:** requires [002_pagination.sql](supabase/migrations/002_pagination.sql), followed by [003_comparison.sql](supabase/migrations/003_comparison.sql). Skip scripts already applied. The project's nine live two-account acceptance checks passed on 2026-10-21; see [M2 acceptance](docs/M2_ACCEPTANCE.md). Restart the API with `npm run dev` when updating its build and reload `dist/extension`. Do not rerun 001 on an existing schema. No new credentials or extension permissions are needed.

For faster comparisons across many pages, apply [004_comparison_index.sql](supabase/migrations/004_comparison_index.sql) after 003. It adds a derived lookup column/index without changing stored report content or API contracts. Backfill/index creation takes table locks, so use a maintenance window appropriate to your data size. This migration has been tested locally, and you reported deploying it on 2026-10-20. Hosted lookup-column and long-URL comparison behavior subsequently passed the M2 checks; physical index/plans and production load remain deferred. Do not rerun the script. Existing comparison functionality works on 003.

The test suite applies all four migrations in local PostgreSQL via PGlite, including more than 1,000 scans, complete site aggregates, long page URLs and owner isolation. See [pagination contracts and limits](docs/API.md#pagination-and-complete-totals) for offset behavior and deployment limitations.

## Manual acceptance checklist

- Install unpacked build; rescan the insecure page; verify HDR-002, HDR-003, CK-001 and CK-002.
- Rescan the hardened page; verify framing/CSP warnings disappear (browser cookie behavior on HTTP may vary).
- Refresh and confirm a new scan ID; navigate two tabs and confirm findings stay attached to the correct page.
- Pause, reload, and confirm no new scans; resume and rescan.
- Stop/restart the service worker and confirm temporary scans remain; restart the browser and confirm temporary scans clear while cloud history persists after sign-in.
- Grant a new site from the side panel and rescan; revoke host access in Chrome and verify collection stops.
- Export JSON and inspect for cookie values and query/fragment secrets.
- Delete a saved scan in the side panel and verify it disappears from cloud history.

## Architecture references

- [Chrome passive webRequest observation](https://developer.chrome.com/docs/extensions/reference/api/webRequest)
- [Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

Blockchain anchoring and combined ML-report finalization remain open. Automatic React ML triage runs with a synthetic experimental model; real-world accuracy has not been established. Existing SHA-256 verification only checks the original rule report's consistency. The optional dashboard has browser **Print / PDF**; the extension's **Download PDF** uses the server generator with tagged structure and accessibility finalization. Restart the API after rebuilding to activate server changes.





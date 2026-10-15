# VYNLT implementation plan

Last updated: 2026-10-16 (Asia/Calcutta)

## Current milestone

Extension-first inspection workspace redesigned using the user-requested Anthropic frontend-design skill: a shared violet/slate theme, locally bundled IBM Plex Sans, real collection coverage and consistent report/account/history/settings screens. Stable scan reading, keyboard sign-in and explicit sync outcomes remain. All 50 unit tests, both browser suites and the expanded UI regression suite pass. The final typography/layout refinements passed TypeScript, production build and the full UI rerun. Real authenticated Supabase persistence/RLS remains pending user sign-in.

## Milestones and remaining work

- [ ] M1 — Browser scanner foundation
  - [x] Review supplied roadmap and establish project conventions.
  - [x] TypeScript project, shared observation/finding contracts, build and test scripts (checks pass).
  - [x] Header, cookie, mixed-resource, and script-integrity rules; deterministic scoring and deduplication.
  - [x] Manifest V3 collection, navigation association, pause/resume, rescan and SPA path snapshots.
  - [x] Side-panel scan controls, detailed evidence/remediation, cloud history and JSON export; retired popup/local disk history.
  - [x] Controlled localhost HTTP/HTTPS labs and automated rule/privacy tests.
  - [x] Real Chromium checks: TLS findings, refresh, two tabs, pause/resume, SPA, worker restart, panel document, automatic upload and toolbar side-panel configuration.
  - [ ] Manual installed-Chrome checks: native side-panel open/close, optional permission grant/revocation, browser restart and cache edge cases.
- [ ] M2 — Express API and Supabase PostgreSQL
  - [x] Authenticated local API, durable local store and owner-isolation tests.
  - [x] Supabase Auth adapter, PostgreSQL migration, RLS policies and atomic ingestion RPC source.
  - [x] Validated scan ingestion, list/detail APIs and domain summaries.
  - [x] Automatic extension upload with immutable snapshots, bounded retry/backoff, idempotent submissions and integration tests.
  - [x] Configure supplied Supabase project; user reports migration applied; verify Auth connectivity and anonymous table-access denial.
  - [x] Dedicated Supabase login, registration/confirmation guidance, memory-only token refresh and sign-out in dashboard; sign-in for extension uploads.
  - [ ] Verify authenticated persistence/RPC behavior and two-user RLS in the real project after user sign-in.
  - [ ] Production rate limiting and database pagination/aggregates beyond 1,000 scans.
- [ ] M3 — React dashboard and reports
  - [x] Connected overview, sites, scan/finding details, paginated history, settings and deletion.
  - [x] Same-URL comparison within loaded history page, review feedback, JSON import/export and responsive layout.
  - [x] Browser print/PDF layout and print action (dedicated server PDF generation remains open).
  - [x] First Apple design increment across side panel/dashboard; responsive themes, larger controls, stable interaction feedback and controlled browser validation.
  - [x] Full frontend-design visual pass across existing extension/dashboard screens; shared local typography, coverage matrix, themes and evidence hierarchy.
  - [ ] Installed-Chrome, physical-touch, screen-reader and full contrast/zoom acceptance for the updated UI; measure font/loading performance on slow devices.
  - [ ] Cross-page comparison selection, history charts and dedicated PDF generator with pagination QA.
- [ ] M4 — Automated scanner and GitHub Actions
  - [x] Playwright CLI using shared rules, JSON artifacts, confidence/severity gate and documented exit codes.
  - [x] Real secure/insecure fixture regression: secure passes, insecure fails; CLI/extension rule IDs agree.
  - [x] GitHub Actions workflow with test artifacts, minimum permissions and Node setup.
  - [ ] Run workflow in a GitHub repository; configure required checks/branch protection and documented risk exceptions.
- [ ] M5 — Tamper-evident reports
  - [x] Canonical JSON and SHA-256 consistency check with API/UI and tamper unit tests.
  - [ ] Solidity contract, local EVM deployment and transaction metadata.
  - [ ] Blockchain anchor/verify APIs and UI; unchanged/tampered on-chain demonstration.
- [ ] M6 — Experimental ML
  - [ ] Labeled dataset, source/sink feature collection, site-separated splits.
  - [ ] Baseline classifier, LSTM comparison, held-out metrics, inference service.
- [ ] Ongoing — Browser performance measurements, extended privacy/regression coverage, production hardening and literature/report alignment.

## Decisions

- Follow the roadmap's dependency order. Complete a runnable local scanner before introducing hosted services or experimental modules.
- The extension side panel is the primary workspace: scan controls, findings, account access, cloud history and downloads. The existing web dashboard is optional legacy functionality, not required for extension use.
- Use the user's newly requested Anthropic `frontend-design` skill for the full visual redesign. `docs/FRONTEND_DESIGN.md` records the design plan, critique and implementation checks. Earlier Apple/interaction audits remain historical evidence; preserve their tested interaction improvements.
- Sign-in validates authenticated workspace access, includes the active page's current scan, and enables automatic syncing for new scans while the panel remains open. Other pre-login history stays excluded. Credentials and bounded pending uploads remain in memory; no persistent local extension report archive. Saved reports remain immutable; rescan to capture later changes.
- Local file storage makes development usable without external accounts; Supabase is an alternate adapter requiring real-project validation.
- Reports are immutable once submitted; review decisions are stored separately and never rewrite historical findings or scores.
- Configuration score is a heuristic: 100 minus severity weights capped once per rule; it is not a compromise probability.
- Library advisory matching and DOM data-flow analysis need trustworthy evidence and remain deferred.

## Change log and validation

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
- Configured ignored `.env` for the supplied project with `VYNLT_STORAGE=supabase`; preserved unrelated local settings. The project accepts native names and the supplied NEXT_PUBLIC aliases.
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

1. Accept the implemented Apple design in installed Chrome: reload `dist/extension`, inspect light/dark appearance, account setup, expanded evidence, keyboard controls and save status. Complete physical-touch/screen-reader, browser text/zoom and full contrast checks; measure toolbar blur under load. The controlled browser regressions for the original interaction findings now pass.
2. Run the API, reload the unpacked extension, open its side panel and sign in (or create/confirm an account there). Rescan and verify persistence in Saved scans; repeat with a second account to verify real RLS isolation. Keep a valid Supabase email confirmation return URL; never send passwords/tokens in chat. The audit does not establish the cause of the user's live saving issue.
3. Complete installed-Chrome side-panel open/close and permission acceptance, browser-restart checks and observer/storage overhead benchmarks on dynamic pages.
4. Create/connect the GitHub repository and run the added CI workflow; add explicit accepted-risk policies and branch protection configuration.
5. Build M5's Solidity/local-EVM anchor and verify flow on the existing immutable report/hash contract.
6. Extend the side panel with review feedback, cross-scan comparisons, trend charts and a dedicated PDF renderer; these advanced features are not all ported from the optional web dashboard.
7. Define/collect labeled examples before implementing or evaluating the baseline classifier and LSTM. Do not claim measured ML improvements without held-out data.

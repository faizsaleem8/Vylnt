# VYNLT implementation plan

Last updated: 2026-10-15 (Asia/Calcutta)

## Current milestone

Local connected application implemented and verified: Chromium extension, authenticated Express API, React dashboard, and Playwright scanner. The remaining milestones below distinguish working local behavior from hosted/deployment and research work.

## Milestones and remaining work

- [ ] M1 — Browser scanner foundation
  - [x] Review supplied roadmap and establish project conventions.
  - [x] TypeScript project, shared observation/finding contracts, build and test scripts (checks pass).
  - [x] Header, cookie, mixed-resource, and script-integrity rules; deterministic scoring and deduplication.
  - [x] Manifest V3 collection, navigation association, pause/resume, rescan and SPA path snapshots.
  - [x] Popup, local history, detailed evidence/remediation, JSON export.
  - [x] Controlled localhost HTTP/HTTPS labs and automated rule/privacy tests.
  - [x] Real Chromium checks: TLS findings, refresh, two tabs, pause/resume, SPA, worker restart, report tab and explicit upload.
  - [ ] Manual installed-Chrome checks: popup workflow, optional permission grant/revocation, browser restart and cache edge cases.
- [ ] M2 — Express API and Supabase PostgreSQL
  - [x] Authenticated local API, durable local store and owner-isolation tests.
  - [x] Supabase Auth adapter, PostgreSQL migration, RLS policies and atomic ingestion RPC source.
  - [x] Validated scan ingestion, list/detail APIs and domain summaries.
  - [x] Extension upload with explicit action, one retry, idempotent submissions and integration tests.
  - [x] Configure supplied Supabase project; user reports migration applied; verify Auth connectivity and anonymous table-access denial.
  - [x] Dedicated Supabase login, registration/confirmation guidance, memory-only token refresh and sign-out in dashboard; sign-in for extension uploads.
  - [ ] Verify authenticated persistence/RPC behavior and two-user RLS in the real project after user sign-in.
  - [ ] Production rate limiting and database pagination/aggregates beyond 1,000 scans.
- [ ] M3 — React dashboard and reports
  - [x] Connected overview, sites, scan/finding details, paginated history, settings and deletion.
  - [x] Same-URL comparison within loaded history page, review feedback, JSON import/export and responsive layout.
  - [x] Browser print/PDF layout and print action (dedicated server PDF generation remains open).
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
- Local extension reports and the connected React dashboard coexist. Uploads are explicit; credentials remain in page memory.
- Local file storage makes development usable without external accounts; Supabase is an alternate adapter requiring real-project validation.
- Reports are immutable once submitted; review decisions are stored separately and never rewrite historical findings or scores.
- Configuration score is a heuristic: 100 minus severity weights capped once per rule; it is not a compromise probability.
- Library advisory matching and DOM data-flow analysis need trustworthy evidence and remain deferred.

## Change log and validation

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

1. User sets Supabase Auth Site URL/Redirect URLs to the local dashboard, creates/confirms a test account, and signs in. Then verify real scan persistence/RPC and two-user isolation; no passwords/tokens should be sent in chat.
2. Complete installed-Chrome permission/popup acceptance and benchmark observer/storage overhead on dynamic pages.
3. Create/connect the GitHub repository and run the added CI workflow; add explicit accepted-risk policies and branch protection configuration.
4. Build M5's Solidity/local-EVM anchor and verify flow on the existing immutable report/hash contract.
5. Extend dashboard comparisons across all pages, add trend charts and a dedicated PDF renderer.
6. Define/collect labeled examples before implementing or evaluating the baseline classifier and LSTM. Do not claim measured ML improvements without held-out data.

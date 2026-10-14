# VYNLT implementation plan

Last updated: 2026-10-14 (Asia/Calcutta)

## Current milestone

M1: locally installable Chrome extension with reusable rules, private local history, report export, and controlled fixtures. Source implementation and automated checks complete; real-browser acceptance remains open.

## Milestones and remaining work

- [ ] M1 — Browser scanner foundation
  - [x] Review supplied roadmap and establish project conventions.
  - [x] TypeScript project, shared observation/finding contracts, build and test scripts (checks pass).
  - [x] Header, cookie, mixed-resource, and script-integrity rules; deterministic scoring and deduplication.
  - [x] Manifest V3 collection, navigation association, permission requests, pause/resume, rescan (browser acceptance pending).
  - [x] Popup, local history, detailed evidence/remediation, JSON export.
  - [x] Controlled localhost HTTP labs, setup guide, automated rule/privacy test source.
  - [ ] Manual Chrome acceptance checks including restart, navigation, permissions and pause.
- [ ] M2 — Express API and Supabase PostgreSQL
  - [ ] Authentication, schema migrations and owner-isolated storage.
  - [ ] Validated scan ingestion, list/detail APIs and domain summaries.
  - [ ] Extension upload with consent, retry handling and API integration tests.
- [ ] M3 — React dashboard and reports
  - [ ] Overview, sites, scan/finding details, history, settings.
  - [ ] Comparison, feedback (fixed/accepted risk/false positive), PDF export.
- [ ] M4 — Automated scanner and GitHub Actions
  - [ ] Playwright CLI using shared rules, JSON artifacts, confidence/severity gate.
  - [ ] Secure/insecure app regression checks and CI workflow.
- [ ] M5 — Tamper-evident reports
  - [ ] Canonical report serialization, SHA-256, Solidity contract and local EVM.
  - [ ] Anchor/verify APIs and UI; unchanged/tampered demonstration.
- [ ] M6 — Experimental ML
  - [ ] Labeled dataset, source/sink feature collection, site-separated splits.
  - [ ] Baseline classifier, LSTM comparison, held-out metrics, inference service.
- [ ] Ongoing — TLS browser fixtures, browser performance measurements, privacy regression tests, release hardening.

## Decisions

- Follow the roadmap's dependency order. Complete a runnable local scanner before introducing hosted services or experimental modules.
- Local reports are the first UI; the planned React dashboard remains a separate milestone.
- Configuration score is a heuristic: 100 minus severity weights capped once per rule; it is not a compromise probability.
- Library advisory matching and DOM data-flow analysis need trustworthy evidence and remain deferred.

## Change log and validation

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

1. Load `dist/extension` into Chrome and execute the README acceptance checklist; add a persistent-browser Playwright suite.
2. Add a TLS-enabled local fixture to validate HSTS and mixed-content observations in a real browser.
3. Improve SPA navigation handling and measure storage/observer overhead on dynamic pages.
4. Start M2 with database migrations, authentication and scan ingestion, then connect the first React dashboard.

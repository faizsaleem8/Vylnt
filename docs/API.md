# VYNLT API and deployment setup

## Local development

Run `npm run setup:local` once, then `npm run build` and `npm run dev`. Open the VYNLT extension side panel and load its workspace connection. The generated local-mode token is in the ignored `.env`; paste it into the panel's connection form. It is not printed to logs. Local mode binds to loopback and uses `.local/scans.json` with serialized atomic writes. Run only one API process against a local data file.

The dashboard and extension keep sessions in page memory only; closing/reloading the page requires reconnecting. Rotate the local token by changing `VYNLT_API_TOKEN` and restarting the server. Local mode has no account registration or password management.

## API contract

All endpoints except `GET /api/health` and `GET /api/config` require `Authorization: Bearer <token>`. The configuration endpoint exposes only the selected mode and Supabase public URL/publishable key. Requests are limited to 512 KB. Errors are JSON with an `error` string; validation failures include field paths without echoing submitted values. HTTP 429 responses include `code: "RATE_LIMITED"` and `Retry-After` seconds.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/scans` | Accept `{scanId, observation}` only; validate/sanitize, recalculate findings/score, finalize report |
| GET | `/api/scans?page=1&limit=30` | Paginated summaries, total, page and limit (max 100/page) |
| GET | `/api/scans/:id` | Full stored report, SHA-256, received time and feedback |
| GET | `/api/scans/:id/comparisons?page=1&limit=10` | Other owned scans of the exact same sanitized page URL; paginated summaries and total |
| GET | `/api/sites?page=1&limit=30` | Paginated origins, full per-site scan counts, latest summaries and global overview metrics |
| POST | `/api/scans/:id/findings/:findingId/feedback` | `{verdict, notes}`; URL-encode the finding ID |
| DELETE | `/api/scans/:id` | Delete owned report and feedback |
| GET | `/api/reports/:id` | JSON report attachment |
| GET | `/api/reports/:id/verify` | Check stored report against saved hash; `anchored: false` |

Scan IDs are UUIDs. Uploading the same normalized snapshot twice returns HTTP 200 on retry; first creation returns 201. A different snapshot with the same ID returns 409. Rescan to produce a new ID. Client-supplied owner IDs, derived findings, scores, and raw cookie values are rejected. Notes are bounded to 1,000 characters; do not put secrets in them.

Review verdicts are `open`, `fixed`, `accepted_risk`, and `false_positive`. A verdict records the user's assessment; it does not establish that remediation is complete and does not change the historical evidence, score or hash. Compare against a fresh scan to check changes.

The local SHA-256 check establishes consistency with a stored hash, not third-party attestation. Anyone who can rewrite both the report and stored hash can defeat it. Blockchain anchoring is not implemented.

### Pagination and complete totals

Both list endpoints accept integer `page` (1–10,000) and `limit` (1–100, default 50). Responses include `total`, `page`, `limit`, and `scans` or `sites`. An out-of-range page returns an empty array with the real total. Ordering is newest `scannedAt` first, then descending scan UUID to break ties. The site order uses each origin's latest scan. A site with no remaining scans is excluded.

`/api/sites` also returns `overview: { latestHigh, averageScore }`: the high/critical finding count and rounded average heuristic score across **each website's latest scan**, across all pages. An empty workspace returns zero high findings and a null average. `total` counts websites, while each `scanCount` counts all stored scans for that origin. The overview and coverage labels use these global totals; website navigation does not replace the overview's latest-five list. Refresh reloads page one of websites. History's URL filter applies to its loaded page; comparison candidates have their own pagination across all same-URL scans.

Supabase uses `list_scan_page` and `list_site_page` from migration 002. These security-invoker functions retain RLS and take the owner from `auth.uid()`; callers cannot supply another owner. They return one bounded JSON page with counts from the same statement snapshot, so PostgREST's 1,000-row cap no longer truncates history or aggregates. Lists contain summaries, without evidence or review notes; full reports are fetched only for detail/export operations. Local mode has the same response contract but retains its explicit 1,000-scan storage cap.

Pagination is offset based. Inserts/deletes between requests can shift page boundaries; Refresh reloads current data. There is no automatic Supabase retention policy. Exact counts and latest-site metrics still scan owner data; indexes support ordering, but production load/performance at large scale is unmeasured. The page bound limits navigation to `10,000 × limit` results (100,000 in the extension, 300,000 in the dashboard). Cursor pagination and cached aggregates remain future scalability work.

`npm test` includes an in-memory [PGlite PostgreSQL](https://pglite.dev/docs/) regression that applies all three migrations, retries migrations 002/003, seeds 1,105 scans across 1,103 sites, and checks pagination, counts, deterministic ties, deletion, local-store parity and two-owner/anonymous permissions. Comparison fixtures exercise multiple candidate pages, exact URL matching and exclusion of the selected scan. It shims Supabase's identity provider; it does not validate hosted Auth, PostgREST or the user's database.

### Saved reviews and comparisons

In the extension, open **Saved scans**, select a report and expand a finding to save a review verdict and up to 1,000 characters of notes. Failed saves retain the draft while that report stays open. Drafts are discarded when switching reports or closing/signing out of the panel. Saved decisions persist separately in the existing feedback table; original findings, score, exported report and hash are unchanged. Concurrent edits use the last saved decision; there is no collaborative merge/conflict UI.

Open **Compare saved scans** on a saved report in either client. The picker loads ten same-URL candidates per page and excludes the selected report; it is independent of the history page. Migration 003 adds `list_comparison_page`, with security-invoker RLS and owner selection from `auth.uid()`. Missing/unowned targets return HTTP 404. Page bounds and ordering match history. Candidate filtering/counting still processes owner data; production-scale query tuning remains open.

Comparison direction is selected report minus chosen baseline. Shared pure code matches stable finding IDs and reports newly observed, no longer observed and changed severity/confidence/evidence. Timestamps alone do not count as changes. It shows score delta and warns when core coverage or ruleset versions differ. Coverage indicators are coarse: equal indicators do not guarantee identical observation completeness. No-longer-observed findings are not automatically marked fixed. Review verdicts do not influence comparisons. Baselines may be older or newer; the chosen timestamp is displayed. Comparison results are temporary and not stored in the database or included in JSON report exports.

## Request limits and recovery

Each API process applies three fixed-window allowances. Requests consume every applicable allowance, including rejected payloads and retries; idempotent uploads still cost authentication/database work.

| Setting | Default | Scope |
| --- | --- | --- |
| `VYNLT_RATE_WINDOW_MS` | `60000` | Window duration in milliseconds; positive integer, at most 3,600,000 |
| `VYNLT_RATE_IP_MAX` | `600` | All `/api` requests from a socket address, before authentication; IPv6 grouped by /64 |
| `VYNLT_RATE_USER_MAX` | `300` | Requests from a verified owner, shared across refreshed tokens |
| `VYNLT_RATE_WRITE_MAX` | `60` | POST/PUT/PATCH/DELETE requests from that owner, before body parsing/storage |

Allowances must be positive integers at most 100,000; zero and malformed values stop startup. Defaults apply in local and Supabase modes. Health/config requests use the address allowance; CORS preflight and dashboard static assets do not. Reading saved scans remains possible after exhausting only the write allowance. Responses expose `Retry-After`, `RateLimit` and `RateLimit-Policy` to allowed browser origins; throttling responses use `Cache-Control: no-store`.

The implementation uses [express-rate-limit](https://express-rate-limit.mintlify.app/reference/configuration). Counter keys are HMAC hashes with a random per-process salt; raw addresses, tokens, bodies and query strings are not retained in the limiter. Counters expire in memory and reset when the process restarts. They are not shared across replicas and do not impose a global cap on the number of distinct clients.

Forwarded headers are deliberately ignored and Express proxy trust is disabled. Behind a reverse proxy, its socket address shares the address allowance among its users; owner allowances remain separate. Do not enable broad proxy trust to work around this. Before exposing production traffic, configure a trusted gateway to enforce client/distributed limits and restrict direct API access. Review [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/) when designing that deployment. These controls do not limit direct calls to Supabase Auth or its public RPC; those require Supabase/gateway policies of their own.

The side panel reads HTTP 429 before parsing the body, including HTML proxy responses. It accepts whole-second or HTTP-date `Retry-After` values, uses a 30-second wait for missing/malformed values, and pauses all queued uploads until the deadline. **Retry sync** cannot shorten that wait. The first attempted report stays frozen; successful retry does not include later page changes. Existing exponential backoff and five-attempt limits still apply. A wait exceeding one day pauses the connection's automatic sync until reconnecting later. Closing the panel or signing out still discards its in-memory queue/session.

The dashboard and connection screens show wait guidance on throttling; they do not automatically repeat imports, deletions or review writes. Wait, then repeat the action. No database migration is needed for this increment. Rebuild, restart the API, and reload the extension to activate it.

Validated on 2026-10-16: TypeScript, 62 automated tests, production builds and both Chromium browser suites passed, including a real panel fetch receiving an HTML 429, an eight-second queue cooldown, manual-retry suppression and immutable recovery. The dashboard wait message was also checked. Full results are recorded in `PLAN.md`; live hosted acceptance and multi-instance load testing remain separate.

## Supabase PostgreSQL

1. Create/configure a Supabase project under your account.
2. Apply `supabase/migrations/001_initial.sql` once, followed by `002_pagination.sql` and `003_comparison.sql` from the same folder. Existing installations with 001 already applied should run **002 then 003**; if 002 is already applied, run only 003. The later migrations add read functions/indexes without rewriting reports and can be reapplied safely. Apply them before restarting the updated API. Missing RPCs return actionable HTTP 503 migration guidance.
3. Set `VYNLT_STORAGE=supabase`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in `.env`. The `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` aliases and legacy `SUPABASE_ANON_KEY` are also accepted. Secret/service-role keys are rejected at startup.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to `http://127.0.0.1:4318` for local use and add that same URL to allowed Redirect URLs. Add the dev-dashboard origin too if using Vite separately. Keep email confirmation enabled.
5. Run `npm run build` and `npm run dev`. Open the extension side panel, select **Load workspace connection**, choose **Create account**, confirm your email, then return to the panel and **Sign in**. Existing users can sign in directly. Passwords go directly to Supabase Auth over HTTPS, not through the VYNLT API.
6. Grant the displayed API/Supabase host permissions. Select **Rescan page** in the panel; new scans upload automatically while signed in. Use **Saved scans** for history, evidence, JSON downloads, hash verification and deletion. The web dashboard is optional.
7. Sessions refresh automatically while the page is open. `persistSession` and URL-token detection are disabled; closing or reloading the dashboard/extension page discards the local session. Sign-out revokes the current session when Supabase is reachable. No credentials are written to project files or browser storage by the application.
8. Set `VYNLT_ALLOWED_ORIGINS` to exact dashboard origins. Serve production traffic over HTTPS and deploy a reverse proxy with rate limits before exposing the API publicly.

The API verifies each JWT with Supabase Auth. REST requests forward the same JWT; RLS filters reads/deletes/feedback. The ingestion function has a fixed empty search path and obtains the owner only from `auth.uid()`. Direct table writes for scans and findings are revoked; the RPC performs immutable insertion transactionally.

The ingestion RPC is callable by authenticated owners. It is a data-storage boundary, not proof that an observation came from an untampered scanner. The hash and rules do not attest to scan truthfulness. A signed ingestion model would be separate future work.

**Verification status:** The supplied project is configured and the user reported migration 001 succeeded. Migrations 002/003 have been tested locally; their application to the hosted project remains pending. `npm run check:supabase` verifies Auth/public-key connectivity and denial of anonymous table access without creating accounts or records. Actual authenticated CRUD and two-account RLS checks still require signed-in test users. Local PostgreSQL and mocked API/UI tests do not replace those live checks.

### Live acceptance after sign-in

- Sign in to account A in the side panel, rescan a local lab page, wait for automatic sync, reload/sign in again, and verify the report persists in Saved scans.
- Record feedback and verify the report hash still matches.
- Sign out and sign in as account B; A's reports must not appear. Using A's scan ID with B's session must return 404 for detail, export, feedback and deletion.
- Sign back in as A, rescan and verify automatic sync and saved-history refresh inside the panel.
- Do not share passwords or access/refresh tokens in chat or commit them. Record results in `PLAN.md` after verification.

## CI and automated scanning

```powershell
npm run setup:browser
npm run lab:tls
npm run lab
# In another terminal:
npm run scan:ci -- --url https://127.0.0.1:5443/insecure --ignore-https-errors --output reports/insecure.json --fail-on medium --min-confidence high
```

Exit 0 means policy passed, 1 means qualifying findings exceeded the policy, and 2 means execution/configuration failed. Reports are still written for exit 1. The default gate is high severity and high confidence, so cookie-name heuristics at medium confidence do not fail it by default. Set `--min-confidence medium` only after reviewing that tradeoff.

The runner defaults to loopback targets and blocks non-loopback network resources in that mode. `--allow-remote` is required for other authorized targets. TLS verification bypass is allowed only for localhost test fixtures. Normal remote scans verify TLS.

`.github/workflows/ci.yml` runs type checks, tests, builds, real Chromium regression checks and saves artifacts. It tests that the controlled insecure HTTPS fixture fails the configured gate while the hardened fixture passes. The workflow is present locally; it has not been run on GitHub. Require its check in branch protection if you want failed checks to block merges.


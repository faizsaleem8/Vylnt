# VYNLT API and deployment setup

## Local development

Run `npm run setup:local` once, then `npm run build` and `npm run dev`. Open `http://127.0.0.1:4318`. The generated token is in the ignored `.env`; paste it into the dashboard's connection form. It is not printed to logs. Local mode binds to loopback and uses `.local/scans.json` with serialized atomic writes. Run only one API process against a local data file.

The dashboard and extension keep sessions in page memory only; closing/reloading the page requires reconnecting. Rotate the local token by changing `VYNLT_API_TOKEN` and restarting the server. Local mode has no account registration or password management.

## API contract

All endpoints except `GET /api/health` and `GET /api/config` require `Authorization: Bearer <token>`. The configuration endpoint exposes only the selected mode and Supabase public URL/publishable key. Requests are limited to 512 KB. Errors are JSON with an `error` string; validation failures include field paths without echoing submitted values.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/scans` | Accept `{scanId, observation}` only; validate/sanitize, recalculate findings/score, finalize report |
| GET | `/api/scans?page=1&limit=30` | Paginated summaries, total, page and limit (max 100/page) |
| GET | `/api/scans/:id` | Full stored report, SHA-256, received time and feedback |
| GET | `/api/sites` | Origin groups with scan counts and latest report summaries |
| POST | `/api/scans/:id/findings/:findingId/feedback` | `{verdict, notes}`; URL-encode the finding ID |
| DELETE | `/api/scans/:id` | Delete owned report and feedback |
| GET | `/api/reports/:id` | JSON report attachment |
| GET | `/api/reports/:id/verify` | Check stored report against saved hash; `anchored: false` |

Scan IDs are UUIDs. Uploading the same normalized snapshot twice returns HTTP 200 on retry; first creation returns 201. A different snapshot with the same ID returns 409. Rescan to produce a new ID. Client-supplied owner IDs, derived findings, scores, and raw cookie values are rejected. Notes are bounded to 1,000 characters; do not put secrets in them.

Review verdicts are `open`, `fixed`, `accepted_risk`, and `false_positive`. A verdict records the user's assessment; it does not establish that remediation is complete and does not change the historical evidence, score or hash. Compare against a fresh scan to check changes.

The local SHA-256 check establishes consistency with a stored hash, not third-party attestation. Anyone who can rewrite both the report and stored hash can defeat it. Blockchain anchoring is not implemented.

## Supabase PostgreSQL

1. Create/configure a Supabase project under your account.
2. Apply `supabase/migrations/001_initial.sql` in its SQL editor once. It creates owner-scoped sites, scans, findings and feedback, RLS policies, and an atomic ingestion RPC.
3. Set `VYNLT_STORAGE=supabase`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in `.env`. The `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` aliases and legacy `SUPABASE_ANON_KEY` are also accepted. Secret/service-role keys are rejected at startup.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to `http://127.0.0.1:4318` for local use and add that same URL to allowed Redirect URLs. Add the dev-dashboard origin too if using Vite separately. Keep email confirmation enabled.
5. Run `npm run build` and `npm run dev`. Open the dashboard, choose **Create an account**, confirm your email, then return and **Sign in**. Existing users can sign in directly. Passwords go directly to Supabase Auth over HTTPS, not through the VYNLT API.
6. For extension upload, open its report page, expand the workspace section, select **Load workspace connection**, then sign in using that same account. Grant the displayed API/Supabase host permissions. Select **Send scan** to upload explicitly.
7. Sessions refresh automatically while the page is open. `persistSession` and URL-token detection are disabled; closing or reloading the dashboard/extension page discards the local session. Sign-out revokes the current session when Supabase is reachable. No credentials are written to project files or browser storage by the application.
8. Set `VYNLT_ALLOWED_ORIGINS` to exact dashboard origins. Serve production traffic over HTTPS and deploy a reverse proxy with rate limits before exposing the API publicly.

The API verifies each JWT with Supabase Auth. REST requests forward the same JWT; RLS filters reads/deletes/feedback. The ingestion function has a fixed empty search path and obtains the owner only from `auth.uid()`. Direct table writes for scans and findings are revoked; the RPC performs immutable insertion transactionally.

The ingestion RPC is callable by authenticated owners. It is a data-storage boundary, not proof that an observation came from an untampered scanner. The hash and rules do not attest to scan truthfulness. A signed ingestion model would be separate future work.

**Verification status:** The supplied project is configured and the user reported successful migration. `npm run check:supabase` verifies Auth/public-key connectivity and denial of anonymous table access without creating accounts or records. Actual authenticated CRUD and two-account RLS checks still require signed-in test users. Mocked API/UI tests do not replace those live checks. The adapter currently lists at most 1,000 recent scans; server-side aggregate/pagination work is needed for larger deployments.

### Live acceptance after sign-in

- Sign in to account A, import a local lab report, reload/sign in again, and verify it persists.
- Record feedback and verify the report hash still matches.
- Sign out and sign in as account B; A's reports must not appear. Using A's scan ID with B's session must return 404 for detail, export, feedback and deletion.
- Repeat upload through the extension using account A and check it in the dashboard.
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

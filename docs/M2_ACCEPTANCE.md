# VYLNT M2 acceptance

M2 is complete for the current development scope, including verified hosted two-account isolation. The user explicitly does not want Docker or deployment now. Real shared rate limiting, physical-index/plan inspection and production measurements are deferred deployment work, not current milestone blockers; they remain unverified. Local SQL/mocked API tests are not substitutes for future real-service/production checks.

## Verified on 2026-10-21

- The later two-account run passed all nine hosted checks with zero skips and zero cleanup failures. B received 404 for A's detail, JSON/PDF export, verification, comparisons, feedback and deletion; A retained access. Direct table reads of scans/findings/feedback/sites returned no A-owned fixture rows to B. The helper authenticated both sessions and rejected duplicate owners. These are live verifier results inspected from the sanitized artifact, in addition to the user's confirmation.

- Read-only hosted Auth/public-key connectivity and database permission denial for anonymous access to sites/scans/findings/feedback.
- Eight checks passed through the private helper with one real confirmed Supabase account: normal authenticated API persistence and sanitized retrieval; idempotent retry and immutable conflict; paginated history/totals; site aggregates; exact-page comparisons; feedback/export/original-hash consistency; migration-004 generated lookup key on a long URL; and synthetic scan cleanup.
- Both synthetic scans were deleted and subsequent reads returned 404. Supabase ingestion may retain the empty synthetic site entry because the normal API does not delete site rows. No existing scans are modified by the acceptance workflow.
- This establishes hosted column/RPC behavior, not inspection of the physical index or production performance. Per-check elapsed times are single-workflow measurements including multiple Auth/API/database requests; they are not per-query latency or load capacity.

## Private hosted verifier

Run `npm run verify:supabase`, then open `http://127.0.0.1:4321` in your browser. The helper binds only to loopback and expires after 30 minutes. It does not restart the normal API or change .env/migrations.

Sign in privately as Account A. Optionally connect a different confirmed account as B, then choose **Run live checks**. With A only, two-account isolation is explicitly skipped; a green single-account result does not complete RLS acceptance. After each run tokens are discarded, so reconnect both accounts for another run. Do not share passwords or access/refresh tokens in chat.

The browser uses VYLNT's existing memory-only Supabase client. Passwords go directly to Supabase Auth and are cleared from the form; the helper receives only access tokens, validates them with Auth and retains them in memory for one run. Host/Origin checks protect against DNS rebinding/cross-origin posts. No credentials/tokens are logged or written to disk. Only sanitized check names, durations, skipped/failure status and generated scan IDs needing cleanup are saved under ignored `test-results/supabase-acceptance/results.json`.

The verifier creates at most two synthetic scan records using normal API ingestion, checks the deployed functions, and attempts deletion of only its generated scan IDs even after a failure. If cleanup failures are reported, reconnect the owning account and delete those specific fixture scans; do not delete unrelated reports. It makes no accounts, sends no mail and does not load-test the hosted project.

With distinct A/B accounts, the verifier also checks that B receives 404 for A's detail, JSON/PDF export, verify, comparison, feedback and deletion, while A can still retrieve the fixture. Direct authenticated table reads for scans/findings/feedback/sites must return no A-owned rows to B. Keep the two-user result separate from the one-user result in PLAN.md.

## Redis verification without Docker

A real Redis endpoint is still required. Set `VYLNT_REDIS_URL` privately in the ignored .env, then run `npm run verify:redis`. This command installs nothing, uses a unique test namespace/secret, and leaves only automatically expiring keys. It never flushes Redis, deletes production keys or stops the service. No endpoint/credentials are printed.

The prepared harness checks counters shared between independent app/backend connections, per-owner separation, client/owner/write bucket behavior, Retry-After/expiry and a disconnected backend returning sanitized 503 while the other connection works. It uses in-memory synthetic API fixtures, not Supabase data. The harness has **not been run against a real service** while no endpoint is available; code/compile checks alone do not verify distributed operation. Redis failover/server outage and production topology/load remain separate checks.

## Deferred until deployment/scaling is requested

Two-account hosted verification is complete for the tested API/direct-read paths; repeat after relevant schema/Auth changes. The items below are not required for current localhost use:

1. Define the intended deployment environment before starting production-specific verification. Docker is excluded from current work.
2. Run the real Redis verifier against an available service and review deployment configuration.
3. Measure the intended hosted deployment with an agreed workload, data sizes, concurrency and performance budget. Do not bulk-write/load-test a live project without a bounded agreed target. Existing local storage baselines and a two-row live acceptance run do not establish production capacity.
4. Inspect migration 004's physical index where database access permits; the generated-column/long-URL behavior is verified, while hosted plans/index use remain unmeasured. Consider cursor pagination/cached aggregates only when measurements justify them.

For index existence, run this read-only query in the Supabase SQL editor (no migration deployment):

```sql
select indexname, indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
  and tablename = 'scans'
  and indexname = 'scans_owner_url_hash_page';
```

Expect one index over `owner_id, page_url_hash, scanned_at DESC, scan_id DESC`. Existence alone does not establish planner selection or load performance.

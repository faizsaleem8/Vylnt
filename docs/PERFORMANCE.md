# VYLNT performance measurements

## 2026-10-27 ML-Q2 runtime checks

The built Worker was exercised in disposable headless Chromium 156.0.8078.4 and installed Edge 156.0.4314.42 on this Windows machine. Both passed a 318-finding/196,705-byte report and a separate 523,855-byte accepted-report fixture (more than 99% of the 512 KiB storage bound), preserving all finding references. Cancellation and invalid-input handling passed.

| Runtime | Typical inference | Near-limit inference | Maximum main-thread timer gap |
|---|---:|---:|---:|
| Chromium | 154 ms | 112 ms | 11.3 ms |
| Edge | 250 ms | 125 ms | 12.2 ms |

One local measurement per workload/runtime; these are not percentiles, peak memory, native extension accessibility, production capacity or model-quality measurements. The boundary workload increases metadata bytes, not unique model contexts. Ignored evidence: `test-results/insights-worker-chromium.json`, `insights-worker-msedge.json` and `scanner-acceptance/results.json`. The full Chromium extension also passed cache/restart and normal/6x-simulated CPU stress with bounded metadata; actual request completion/failure and query-collision handling were tested. No new live Supabase measurement was performed.

Latest export split: the default PDF is full-data again (without generated recommendations or ML), while insights use a separate verified POST export. The benchmark currently calls the default full-data renderer; it does not measure insights verification or its combined API/ML/render cost. Historic concise-default and earlier full-template results below are retained as dated evidence, not current capacity guarantees.

The subsequent concise-report change groups repeated observations and bounds previews in the default PDF. Older per-finding PDF page/latency/memory baselines below use the previous template and are not comparable performance claims for the new summary. The new synthetic 74-finding case renders four issue groups on three pages; no production-capacity or user-specific page-count claim follows. Native dashboard browser-print output is a separate rendering path.

## M3 simulated slow loading: 2026-10-21

The UI audit measured a fresh mobile-width dashboard sign-in page with cache disabled, 128 KiB/s download, 64 KiB/s upload, 150 ms artificial latency and 6x CDP CPU slowdown. Initial/final local runs: first contentful paint 5,448/5,700 ms; login plus `document.fonts.ready` 9,522/10,459 ms; local Plex font transfer 537,544 bytes including response overhead (537,244-byte TTF). The font loaded successfully with a system fallback while pending. These two samples are a reproducible baseline, not a speed target, optimization claim or physical low-end-device measurement. `npm run test:ui` records subsequent runs in `test-results/frontend-design/measurements.json`; results vary with local load.

The PDF timings below predate M3's PDF-lib tagging/metadata/footer finalization. Functional PDF generation and overload/recovery passed with finalization, but its latency/memory overhead has not been rebenchmarked. Rerun the existing benchmark when setting performance budgets; production capacity remains deferred.

## Reproduce the PDF benchmark

From the project root, after `npm run build` and `npm run setup:browser`:

```powershell
npm run benchmark:pdf
```

The default is three sequential renders per profile. `VYLNT_BENCH_RUNS` accepts 1 through 10 for shorter or longer runs. Results overwrite `test-results/pdf-benchmark/results.json` and `summary.md` (ignored artifacts). Each render starts a fresh Node worker and Chromium instance using the actual server PDF generator. The benchmark does not start or restart the API, contact Supabase, scan a site or read real reports. It discards generated PDF bytes after checking the signature and measuring size.

| Profile | Input | Derived findings | Reviews |
|---|---|---:|---|
| Typical | HTTPS page with missing response policies | 3 | None |
| Medium | Same page plus 25 external scripts, short URL paths | 28 | Synthetic note on every finding |
| Large | Same page plus 150 external scripts, 2,400-character URL path suffixes | 153 | Synthetic note on every finding |

Inputs pass the production submission parser and remain below the 512 KiB request limit. Finding counts come from the shared detection rules, not fabricated report entries. The large profile stresses repeated long URLs and review notes; it is not the maximum possible input or every worst-case report shape.

## What is measured

- Elapsed render time includes browser launch, font loading, HTML/PDF generation and browser shutdown. It excludes API authentication, database retrieval, HTTP transfer and benchmark-worker/sampler startup.
- Node peak resident memory is the worker's process-lifetime high-water RSS; it excludes Chromium.
- Tree memory sums the sampled working set/RSS of that worker and its Chromium descendants. It can miss short peaks and count shared pages more than once. It is neither unique physical memory nor a production RAM requirement.
- Windows uses a persistent read-only PowerShell/CIM sampler started before rendering. Other platforms use `ps`. Samples are spaced by the query duration plus 250 ms. Output includes sample counts, maximum observed process counts and explicit sampling errors/warnings. No command lines or environment values are recorded.
- The report records OS, Node version, CPU model, logical CPU count and total installed memory for context. Sampling adds overhead; other local workload and filesystem cache state affect results. Fresh browser processes do not imply a cold operating-system cache.

## Local baseline: 2026-10-20 (Asia/Calcutta)

Windows 10.0.26300, Node 20.18.0, Intel Core i5-9300H (8 logical CPUs), approximately 15.8 GiB installed memory. Three runs per profile; all nine generated valid PDF signatures and exited successfully.

| Profile | Findings | Render time range | Sampled tree peak range | PDF size (approx.) |
|---|---:|---:|---:|---:|
| Typical | 3 | 1.757–2.364 s | 315.1–318.9 MiB | 155 KiB |
| Medium | 28 | 1.782–3.319 s | 318.8–326.1 MiB | 339 KiB |
| Large | 153 | 6.058–8.242 s | 461.4–473.2 MiB | 1.51 MiB |

Each final run observed five processes in the renderer tree, with 4–14 memory samples. Worker peak RSS ranged from 132.1 to 153.2 MiB. The large submission was 369,256 bytes, and its derived stored-report/review snapshot was 1,703,776 bytes. Derived reports can be larger than the submitted observations; the 512 KiB API limit bounds submission size, not generated report size.

The first exploratory sampler launched a new PowerShell process for every sample, which missed some short-lived Chromium processes. Those measurements were superseded by the persistent-sampler run above. The existing one-render-per-process cap was retained; measurements do not justify increasing concurrency. No production timeout or report-content behavior changed.

Node syntax checks and `git diff --check` passed. These benchmark runs verify generation and instrumentation, not the visual pagination of every stress PDF; prior PDF pagination QA remains separate. The existing 85-test/browser results were not rerun because application code was unchanged.

Native reader/accessibility acceptance, multilingual coverage, Linux/macOS sampler execution, concurrent production load, worker/container memory limits and maximum-input timeout/recovery tests remain separate work. This benchmark is opt-in rather than a timing gate in CI: machine-dependent durations should not become arbitrary pass/fail thresholds.

The large PDF profile is a renderer stress case, not an accepted upload workload. Its report/reviews snapshot exceeds 1.6 MiB. The API and both stores now enforce migration 001's 512 KiB derived-report limit before ingestion, using a PostgreSQL-compatible byte count. The benchmark calls the renderer directly to stress layout/rendering; it does not establish that such a report can be saved. Local SQL boundary tests cover exact-limit acceptance and one-byte-over rejection; hosted acceptance remains unverified.

## Database and local-file benchmark

Run `npm run benchmark:storage`. It uses the installed PGlite development dependency and writes ignored results to `test-results/storage-benchmark/results.json` and `summary.md`. `VYLNT_STORAGE_BENCH_RUNS` accepts 1–20 (default five measured repetitions plus one warmup per operation). It does not use Supabase credentials or connect to a hosted database.

The PostgreSQL benchmark applies migrations 001–003 in an in-memory database with a local Auth shim. It seeds through the real ingestion function before timing, then exercises the history, site and comparison functions as the authenticated owner. Profiles contain 1,000 or 10,000 reports, with either ten scans per website or all scans of one page. A second owner has an additional report. Measurements include query/result serialization; they exclude seeding, network, Auth and PostgREST. Statistics are analyzed before measurement. This WASM environment and warm sequential workload do not predict production latency or concurrency.

The FileStore benchmark uses the real file adapter with 100/1,000 scans and an additional foreign-owner record. Fixture files are seeded before timing, then actual reads and review writes include JSON parsing, sorting, cloning and atomic whole-file rewrite/rename. Temporary files are uniquely named under `.local` and removed after each profile; configured application storage is never used. Files were approximately 238 KiB and 2.31 MiB before review writes. These timings do not establish fsync durability or multi-process write safety.

### Local results: 2026-10-20 (Asia/Calcutta)

Same Windows/Node/CPU environment as above. All 26 scenarios and 130 measured operations passed their result checks, in addition to warmups. Median times in milliseconds:

| Engine / profile | First history page | Last history page | Site aggregates | Comparisons | Review write |
|---|---:|---:|---:|---:|---:|
| PostgreSQL / 1,000 scans, 100 sites | 4.07 | 6.40 | 14.74 | 24.41 | Not timed |
| PostgreSQL / 10,000 scans, 1,000 sites | 7.84 | 13.18 | 41.43 | 124.66 | Not timed |
| PostgreSQL / 10,000 scans, one page | 6.06 | 10.11 | 12.80 | 63.40 | Not timed |
| Local file / 100 scans | 2.58 | 2.73 | 2.45 | 2.51 | 8.30 |
| Local file / 1,000 scans | 16.90 | 14.70 | 19.04 | 17.28 | 40.05 |

Checks cover exact totals, first/last-page ordering, summary-only history responses, sanitized page URLs, site counts/latest-score/high-finding aggregates, exact-page comparisons, owner isolation and anonymous denial. Local review writes preserve the stored report hash, and the 1,000-scan local cap still rejects additional scans. All temporary data files were removed. Node syntax checks and `git diff --check` passed; production code is unchanged, so prior application/browser tests were not rerun.

Comparison queries show the largest increase in this workload. Next query-tuning work should evaluate an owner/page lookup index with query plans and before/after measurements, retaining exact URL matching and RLS. An index containing complete URLs needs to account for long URL/index-key limits. Offset pagination, exact totals and full-file rewrites still scale with history size. No new migration, cache, cursor or retention policy was introduced from these local timings alone.

Remaining: dynamic-page observer overhead, hosted database benchmarks and query plans, mixed-size/maximum-size reports, concurrent readers/writers, proxy/shared rate limits and deployment capacity testing.

## Comparison lookup optimization (migration 004)

The benchmark now measures comparisons before and after migration 004 against each unchanged dataset, with five timed repetitions and a warmup per operation. The final stored-key design produced these local medians:

| Dataset | Before | After |
|---|---:|---:|
| 1,000 scans / 100 sites | 14.51 ms | 2.64 ms |
| 10,000 scans / 1,000 sites | 126.21 ms | 2.47 ms |
| 1,000 scans / one page | 18.55 ms | 17.24 ms |
| 10,000 scans / one page | 129.06 ms | 129.52 ms |

All 30 scenarios / 150 timed operations passed their existing correctness/access checks. Saved EXPLAIN plans confirm the new index is selected for the many-site datasets. Single-page histories still require exact counting/filtering over many matching reports and did not materially improve. These warm local WASM measurements are not a prediction of hosted Supabase latency.

An initial expression-only hash index was rejected after plans showed sequential scans and the one-page workload became slower. The final migration stores a derived hash column so lookups can use a simple column equality under owner RLS. Exact URL equality remains in both the count and page queries, and 3,500-character URL paths are covered by SQL tests. The hash is solely a lookup key; report integrity still uses SHA-256. No report JSON is rewritten, but generated-column backfill and index construction need table locks/storage and should be staged before a hosted deployment.

## Dynamic-page collector benchmark

`npm run benchmark:observer` runs three paired baseline/collector trials with alternating order (`VYLNT_OBSERVER_BENCH_RUNS=1..10`). Each controlled page contains 2,000 inert script elements and receives 120 mutation batches about 20 ms apart. It loads the actual built content script with a test-only Chrome-message transport. All network requests are intercepted; no website or account is used.

The benchmark exposed and now guards against cancellation of the pending final snapshot at the automatic observer budget. At 100 callbacks the observer disconnects but retains its last debounced collection. The test checks two automatic snapshots, 150-script/300-resource caps, URL sanitization, no further automatic sends after the budget, and successful explicit collection afterward. CI runs one paired trial as a behavior regression, without timing thresholds.

CDP task/script time includes the page workload and test instrumentation; heap deltas are garbage-collection-sensitive rather than peak memory. This isolated benchmark does not measure real Chrome IPC, background rule evaluation/session storage, native browser overhead, battery use or slow-device performance. Final local results are recorded in PLAN.md and the ignored `test-results/observer-benchmark/results.json` artifact. A separate full-extension harness follows.

## M1 full-extension stress baseline — 2026-10-21

`npm run test:scanner` adds actual extension content-script IPC, background rules and Chrome session storage. It starts a loopback HTTP fixture, launches disposable bundled Chromium profiles with the built extension enabled or disabled, and exercises 2,000 inert script elements plus 120 timed DOM mutation batches. Paired order alternates across normal and 6x CDP CPU-throttled conditions. This is one exploratory pair per condition, not a statistical performance estimate or a production budget.

| CPU condition | Extension | Whole workload elapsed | Page task time | Page script time | Page heap delta | Control IPC round trip | Explicit collection to observed persistence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Normal | Disabled | 3,717 ms | 146.36 ms | 0.63 ms | 672,908 B | — | — |
| Normal | Enabled | 3,819 ms | 196.40 ms | 45.62 ms | 1,324,772 B | 4.00 ms | 47.84 ms |
| Simulated 6x slowdown | Disabled | 8,756 ms | 910.46 ms | 4.30 ms | 672,908 B | — | — |
| Simulated 6x slowdown | Enabled | 17,819 ms | 2,851.17 ms | 912.61 ms | 1,323,584 B | 4.90 ms | 284.81 ms |

Enabled runs verified 150-script and resource bounds, URL sanitization and background-persisted observations. At normal speed the automatic budget snapshot captured mutation 120; under throttling it captured mutation 110 because the remaining burst outlasted the final debounce. Explicit collection then captured mutation 120. Continuous exhaustive monitoring after the 100-callback budget is not promised.

Page CDP metrics exclude background-process CPU, while the enabled path actually executes background work. Control IPC measures a STATE round trip and excludes content collection; explicit collection includes test dispatch, real content/background processing and polling until storage is observed. Heap deltas are GC-sensitive and not peak memory. Elapsed time includes rendering, scripted delays, instrumentation and enabled-path checks, so the difference is not isolated extension CPU time. The 6x workload has substantial observed slowdown and warrants future optimization/physical-device measurements; these results certify neither low overhead nor production capacity.

Initial harness runs revealed two incorrect test assumptions, not established runtime defects: searching history could select an older scan while a reload was pending; the harness now reads the current tab snapshot. Requiring mutation 120 automatically under all timing conditions ignored the documented observer budget; the final harness checks the budget snapshot and explicit rescan separately. The final run passed cache/restart and all four measurement scenarios. Raw results are in ignored `test-results/scanner-acceptance/results.json`; native Edge acceptance and remaining limits are recorded in [M1_ACCEPTANCE.md](M1_ACCEPTANCE.md).

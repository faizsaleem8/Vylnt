# JS-002 fresh external holdout — 2026-10-26

The unchanged v4 candidate passed all registered JS-002 qualification gates. This qualifies only the measured controlled script/CSP configurations, not arbitrary application security or exploitability. Runtime promotion additionally requires staged integration acceptance.

Protocol: [ML-Q1](../../docs/ML_FRESH_HOLDOUT_PLAN.md). [Aggregate evaluation](fresh-holdout-js002-2026-10-26.json). [Pinned sources and licences](../applications/fresh-holdout.sources.lock.json).

Twelve new MIT source families completed 216 browser scenarios (baseline plus 17 existing JS-002 profiles each). Original application interactions and independent script-execution/CSP-blocking checks passed with external browser traffic blocked. Historical exposure inventory contained eleven datasets, nineteen family identities and 307 numeric variants; the original private family key was retained. Seventeen prior-input rows were rejected, leaving eleven eligible families, 175 family/context rows and **159 distinct numeric contexts: 80 change-required and 79 contextual**, both classes across all eleven families. No retained prior family/input overlap, conflicting labels or uncertain rows. Repeated contexts do not inflate primary metrics.

| Comparison | Precision | Recall | Non-abstention coverage | Contextual mistakes |
|---|---:|---:|---:|---:|
| LSTM model only | 100% | 100% | 100% | 0 |
| LSTM after safeguards | 100% | 100% | 100% | 0 |
| Frozen logistic, before/after safeguards | Undefined (no positive decisions) | 0% | 0% | 0 |
| Rule-only: every observed JS-002 warrants change | 50.31% | 100% | 100% | 0 |

Wilson 95% intervals for LSTM precision and recall: **95.42–100%**; coverage **97.64–100%**. Paired application-family bootstrap intervals and comparator differences are published in JSON. Perfect observed family outcomes yield degenerate bootstrap intervals; few families and shared imposed scenarios limit effective independence. These intervals do not prove universal accuracy. The logistic comparator's pre-frozen 0/1 thresholds deliberately abstain; this does not establish general LSTM superiority over logistic regression.

No high/critical actionable contextual decisions or insufficient-evidence contextual decisions were observed. JS-002 is ordinarily informational, and this holdout contains no uncertain rows; high-severity/missing-context safeguards are separately checked with engineering fixtures, not counted as model-quality evidence.

Candidate: `f2ea93f213b51b2e1066f4fe910ed55052268e2533c5ce51d3ff833d38e7012e`.
Model: `6fa227ae6f0e5c7259d3636066be05b0da5c661726c6acf77b3771178f105a1f`.
Holdout: `f46d72e1e9d8fe9e856bbc9dbca40e0696dcd4852cecbbff62ea78076734afd2`.
Registration: `41812cf424ec576867fb015e6fe3b0c632c9a17d862ea55ac78145da1785ae32`.
The aggregate record also binds category policy, exposure registry, source lock, provenance, executed JavaScript parity and evaluator code. Exclusive candidate/dataset consumption markers were written before prediction. No fitting, threshold changes, source substitutions or repeated evaluation followed these results.

Private reproducibility records: `.local/ml-q1/{exposure.json,source-audit.json,collection-01,frozen-01,evaluation-01}`. Do not publish private family keys or source/report records. Candidate weights, calibration and thresholds came entirely from the prior development experiment. Four Python/JavaScript numerical cases and 84 category/comparator decisions passed before evaluation, maximum numeric error 4.53e-8 against 1e-6.

All other seven categories remain unqualified. Scope includes independent interactive application/component demos with locally imposed profiles; it is neither independent human application review nor production-site testing.

## Release integration

The qualified category is bundled after staged acceptance passed. [Runtime acceptance record](fresh-holdout-js002-runtime-2026-10-26.json) binds the packaged release. Automatic React saving, actual built Worker/API equality, 71 repeated observations grouped once, idempotent finalisation, file-store reload, new-version generation, archived verification/PDF, JSON/PDF downloads, missing/high-severity safeguards, altered-model fallback, unchanged gate decisions and automated accessibility/narrow layout passed. Desktop/narrow screenshots and all three rendered insights-PDF pages were inspected. The earlier experimental model remains archived with its original identity; raw PDF and original scan hashing are unchanged.

Release policy: `vylnt-controlled-category-release-v1`; analysis schema: `vylnt-insights-v2`; actual input schema: `vynlt-evidence-v3`; decision policy: `vylnt-controlled-category-v1`. The frozen model artifact retains its original experimental field; approval belongs to the separate hash-bound category release policy, not a modified model file.

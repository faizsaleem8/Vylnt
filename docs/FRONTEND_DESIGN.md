# VYNLT frontend design

Design source: [Anthropic frontend-design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md), requested 2026-10-16. This direction supersedes the earlier Apple visual treatment; its interaction regression protections remain requirements.

## Design plan, before implementation

VYNLT is an inspection workspace. The extension is the primary place to collect and read observations; the optional dashboard helps review saved reports. Make collection coverage as legible as findings so a missing observation cannot look like a clean security result.

Palette: porcelain `#eef2f6` (canvas), white `#ffffff` (evidence), ink `#263142` (text), slate `#5f6b7c` (secondary text), violet `#5841c6` (navigation/actions), teal `#137b78` (observed coverage). Separate semantic warning/error colors communicate severity. A slate dark theme retains these roles.

Typography: locally bundled IBM Plex Sans variable for interface text, headings and tabular scores; platform monospace only for code, evidence and report hashes. Sentence-case labels, comfortable prose under 76 characters, no decorative tracked metadata. Controls retain at least 44px targets.

Two layouts considered:

```text
A: separate overview cards          B: inspection workspace (selected)
nav | card card card card           violet nav | summary strip
    | recent sites | next steps               | collection coverage matrix
    | repeated card grid                      | recent observations

Extension:                         Report:
brand                 pause        configuration score | site / time
current site / scan actions        collection coverage
account + saving status            findings / filters
current scan | saved scans         expandable evidence + recommendation
score / site                      review decision / export / integrity
Headers | DOM | Cookies
findings / evidence / export
```

Select B: a shared collection matrix provides a memorable, useful identity. Each dashboard row represents the latest saved scan for a site, with named columns for Headers, DOM and Cookies; the extension uses the same cells for the current report. Observed means collection happened, never that the check passed. No invented trends or security guarantees.

Principles: align information along a consistent reading edge; distinguish navigation, summaries, evidence and destructive controls structurally; keep motion limited to direct feedback; preserve focus and expanded findings on background updates; retain reduced-motion, contrast, dark appearance and enlarged-text support. Use explicit empty/error messages and verbs that name real actions.

## Critique and revision before coding

Layout A repeats the common metric-card/marketing-sidebar template and spends useful space explaining an already available workflow. Revised to one quiet summary strip, a real coverage table and recent observations. Violet navigation is a structural location cue, with teal reserved for collected evidence. The score remains subordinate to its heuristic label. No decorative charts, glow, repeated shadows, or entrance animation. Authentication and settings share the same material/type system without pretending to contain scan data.

## Implementation and validation

Latest user decision separates two tasks: **Print / PDF** restores every finding and severity in a dedicated unfiltered data layout, hiding recommended actions and ML. **Download insights PDF** is a separate control in the ML panel, disabled while analysis loads or the download is preparing; errors retain the analysis and allow retry. Its grouped recommendations/current experimental results never replace the raw report. The API verifies submitted model identity/results before rendering; no export navigates to another webpage.

The subsequent ML-panel correction applies issue grouping onscreen as well as in print. One card contains each matching explanation/fix and its affected count. A native disclosure holds model-result counts and up to three evidence samples. Synthetic per-item labels/scores are no longer repeated by default. Results join by immutable finding ID, preserving mixed predictions and abstentions rather than taking the first result as a group verdict. Rule severity determines order; the model has not learned deduplication or established relevance. Original observations remain available below.

The concise-report correction changes print media only in the dashboard: a separate grouped summary replaces raw finding/comparison panels, includes every issue group and clearly labels rule-severity ordering and unavailable validated ML prioritisation. Count/sample limits disclose compression; full evidence remains available onscreen/JSON. The server PDF uses the same pure grouping logic. No findings are discarded or relabeled. Native reading acceptance of the earlier full report is historical; current concise layout has automated/visual evidence only.

The 2026-10-21 snapshot LSTM increment retains this layout and automatic loading flow. The model card identifies the LSTM's structural snapshot input limits before predictions. Each supported result includes its original versioned rule recommendation, labeled as rule guidance rather than generated model text. Synthetic warnings precede the list; contextual predictions never hide findings or imply that a site is safe. No new controls, animations, collection or persistence. Current checks and remaining quality/report work are recorded in PLAN.md and `ml/README.md`.

Automatic React ML analysis is visible in scan details without requiring a disclosure, model file or Run action. It follows the shared palette/type system, with reserved live status text and no new animation. Synthetic provenance and uncalibrated score meaning precede results. Text results retain every original severity and never imply that a contextual prediction resolves a finding. Model details use a native disclosure with a wrapping hash. All ML content remains excluded from print. Inference is local after the static ML chunk loads; results are scoped to the current report and asynchronous work is invalidated on navigation/unmount. Validation is recorded in PLAN.md.

The previous training-data and model-upload controls were removed after the user clarified that training and model releases belong to VYNLT developers. Normal users receive the bundled analysis automatically; they are not asked for labels, private keys or model setup. Developer preparation/training remains offline. Mobile, theme and enlarged-text acceptance covers the automatic analysis panel.

The PDF export increment keeps **Download PDF** beside saved-report actions inside the extension. Pending requests disable the button; failures keep the report and allow retry, and successful responses trigger a file download without navigation. The PDF uses an opaque white A4 layout, local Plex typography, violet section labels and explicit coverage/heuristic warnings. The summary and each finding start separate pages, with long evidence flowing across pages and a numbered footer. Saved review notes are distinct from immutable evidence. Nine-page long-evidence and one-page empty-report fixtures were rendered with Poppler and visually inspected; text, Unicode samples, page numbers and boundary checks passed. Full PDF/UA and native screen-reader acceptance remain open.

The 2026-10-20 extension trend increment adds a lazy disclosure within saved reports. Separate score and findings plots use actual elapsed time and discrete points, without interpolation. Filled/hollow dots encode collection completeness; a readable chronological values list provides the same data without relying on color or pointer hover. The selected observation uses a larger marker. Explicit counts disclose the bounded recent window, including when the selected scan is older. Coverage and ruleset caveats precede plots. Browser validation is recorded in PLAN.md; native assistive-technology acceptance remains open.

Implemented across the extension and optional dashboard:

- One palette and locally bundled IBM Plex Sans in `packages/ui/theme.css`; both builds include the font license. The original variable font is 537 KB, served locally with a system fallback. No runtime font service or new package dependency.
- Violet navigation, opaque toolbars, a compact summary strip and explicit collection cells. The dashboard table shows the first five sites from the API response with the displayed/total count. It reflects each site's latest scan; it is not a trend or historical aggregate. Cells use text and border treatment as well as color.
- Side-panel current/saved tabs, account/connection disclosures, scan summary, severity-marked findings, evidence, remediation and report controls share the same design language. Existing session-only credentials, opt-in site permissions and automatic sync behavior are retained.
- Dashboard local/Supabase sign-in, registration, overview, websites, history, report/filter/comparison/feedback, integrity, settings/deletion and empty/error states use the new theme. Print continues to expose evidence while hiding interactive controls.
- Existing stable finding nodes, focus, reading position and reserved status space remain in place. Font loading is now asserted on both surfaces; explicit body inheritance fixes Chrome extension pages' browser-default font treatment.

### Visual critique after implementation

The coverage table adds a recognizable, task-specific visual structure without suggesting unavailable metrics. Dark mode retains clear hierarchy with slate surfaces. Screenshots exposed a cramped extension toolbar at 200% text; it now wraps its controls, with an overlap assertion. Summary strip dividers now follow the grid at narrow widths. Consolidated duplicate onboarding messages into one primary coverage empty state, and made History/Settings descriptions specific to their tasks. These refinements keep the interface focused on reading and interpreting evidence.

### Validation record

- `npm run check`: TypeScript, 50 tests in six suites, and production builds passed. The first sandboxed run could not rename Vitest temporary files; the approved rerun passed.
- `npm run test:browser`: extension scanning/permissions/privacy/automatic upload/history/detail/export/hash, CLI parity/gates, dashboard import/export/comparison/review/deletion and mobile checks passed with isolated local fixtures.
- `npm run test:auth-browser`: mocked Supabase sign-in, registration, confirmation, refresh/sign-out, failure/retry, pre-login current-scan saving and no persisted credentials passed. These tests do not contact the user's Supabase account.
- Expanded `scripts/ui-audit.mjs` checks real local font loading, all/partial collection coverage, no-data onboarding, print evidence visibility, stable refresh (0px displacement), finding node/open/focus/reading-position retention, filter recovery, single Enter/click sign-in requests, light/dark preferences, reduced-motion and opaque toolbars, >=44px controls and no horizontal overflow at 380px panel/390px dashboard, including 200% root text. The final visual refinement rerun passed, including the panel toolbar overlap assertion at enlarged text. Final TypeScript and production builds also passed. Test browsers and fixture servers closed cleanly.
- Screenshots generated under `test-results/frontend-design/`; historical evidence remains under `test-results/apple-design/` and `test-results/ui-audit/`. Reviewed desktop overview, report/evidence, websites, history, settings, mobile sign-in/overview/empty state, panel account/light/dark, enlarged text and print-media output. Evidence uses synthetic observations.

### Remaining acceptance

M3 is accepted for desktop Edge and English/accented European reports; the user excluded touch testing. The 2026-10-21 acceptance adds 14-state axe checks, keyboard skip links/control semantics, contrast fixes, 320px reflow, simulated slow-loading measurements, real PDF pagination and automated PDF/UA-1 checks. The user confirmed Edge/Narrator keyboard/reading order and 200% zoom. See [M3_ACCEPTANCE.md](M3_ACCEPTANCE.md) for before/after findings and evidence limits. Installed Chrome, other assistive technologies, physical slow devices and broader languages remain future compatibility work. M2's live two-account Supabase checks also subsequently passed; earlier validation entries above are historical.

### Preview evidence

- [Desktop overview](../test-results/frontend-design/dashboard-desktop-light.png) and [dark overview](../test-results/frontend-design/dashboard-desktop-dark.png).
- [Extension panel](../test-results/frontend-design/extension-panel-light.png) and [account view](../test-results/frontend-design/extension-account.png).
- [Report evidence](../test-results/frontend-design/dashboard-evidence.png), [mobile overview](../test-results/frontend-design/dashboard-overview-mobile-light.png) and [measurements](../test-results/frontend-design/measurements.json).

Rebuild with `npm run build`; reload the unpacked extension from `dist/extension` and refresh the optional dashboard to see changes. Closing/reloading the panel clears its in-memory sign-in as before.

## 2026-10-20 — Review and comparison extension

Added saved-finding review forms inside existing disclosures, explicit accessible control names, and a collapsible same-page comparison picker with independent pagination. Both clients use shared comparison semantics and coverage/ruleset caveats. Mobile visual review added consistent dashboard picker padding. The existing theme, local fonts and interaction protections remain the design basis. See PLAN.md for current test results, migration 003 activation and remaining manual acceptance.

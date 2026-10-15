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

Native installed-Chrome side-panel lifecycle, physical-touch/screen-reader checks, full contrast/zoom/browser coverage, font/loading performance on slow devices and print/PDF pagination remain manual/future work. CSS print-media checks do not verify paginated PDF output. Live authenticated Supabase persistence and two-user RLS remain separate, unverified acceptance items. No claim that this visual redesign fixes the user's live cloud-saving problem.

### Preview evidence

- [Desktop overview](../test-results/frontend-design/dashboard-desktop-light.png) and [dark overview](../test-results/frontend-design/dashboard-desktop-dark.png).
- [Extension panel](../test-results/frontend-design/extension-panel-light.png) and [account view](../test-results/frontend-design/extension-account.png).
- [Report evidence](../test-results/frontend-design/dashboard-evidence.png), [mobile overview](../test-results/frontend-design/dashboard-overview-mobile-light.png) and [measurements](../test-results/frontend-design/measurements.json).

Rebuild with `npm run build`; reload the unpacked extension from `dist/extension` and refresh the optional dashboard to see changes. Closing/reloading the panel clears its in-memory sign-in as before.

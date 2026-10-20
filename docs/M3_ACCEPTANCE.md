# M3 dashboard and report acceptance

## Latest: separate data and insights PDFs

The latest user request supersedes the concise-default experiment below. Print / PDF restores all findings/severities/evidence without generated actions or ML, independent of onscreen filters. The existing GET PDF export is likewise full-data. A separate React **Download insights PDF** includes grouped recommendations, current experimental outputs and model identity; its owner-authenticated POST verifies browser results against the bundled release before rendering. Changed models/results are rejected, not silently replaced. Exports remain on-demand and do not finalize/persist a combined immutable report. The printed scan hash does not cover the insights.

Controlled fixtures pass full-data evidence/page-marker/Unicode checks with recommendations/ML excluded, separate insights content/model checks, and automated PDF/UA-1 profiles. Native reader/zoom acceptance of earlier layouts is historical, not certification of these revisions. See PLAN.md for the latest check results.

## Subsequent concise-report change

After the user reported a repetitive 71-page output, default browser printing and server PDFs switched to grouped issue summaries. Full saved evidence is unchanged; repeat groups show affected counts, one recommendation and at most three bounded samples. Synthetic ML does not filter or rank them. A synthetic 74-finding/71-script case produces four groups on three pages; this is not a measurement of the user's unavailable report. The separate full-evidence QA fixture remains nine pages. Three server fixtures passed the automated PDF/UA-1 profile after fixing Chromium's invalid nested-list structure. Dashboard print was rendered separately; earlier native Narrator acceptance does not certify this changed layout. See PLAN.md for latest regression results and remaining issue-level model quality work.

Accepted scope, 2026-10-21: desktop Edge, the existing dashboard and extension side panel, and English reports with accented European text. The user explicitly excluded touch testing. Installed Chrome, other screen readers, physical low-end devices and languages outside this scope remain future compatibility work. This is not a universal accessibility certification.

## Changes and evidence

| Before | After | Evidence |
| --- | --- | --- |
| Collected-state teal text had approximately 4.43:1 contrast on its light background | Darker shared teal passes the audited contrast check | axe audit, both themes |
| Keyboard users repeatedly crossed navigation | Focus-visible skip links target focusable main content | Keyboard assertion and user Edge acceptance |
| Pagination/report action labels lacked group semantics; History had an unnamed column | Named control groups and Actions column heading | axe audit |
| Chromium PDF contained an unmapped Strong role, missing XMP, and untagged repeated footer/decorative borders | PDF finalization adds language/title/XMP and role mapping; footer is marked Artifact; decorative review borders removed | veraPDF 1.30.3 PDF/UA-1 profile, both fixtures pass |
| European font coverage had only a small sample | Expanded diacritics, currencies, long evidence and review-tail fixtures | Extracted text/bounds and all ten rendered pages inspected |

The PDF finalizer applies only to VYNLT's own tagged template. It preserves the reading structure and adds embedded-font page counters outside the reading order. No report findings, scores, JSON hashes, saved reviews, API payloads or SQL migrations change. The printed hash identifies the original JSON report, not PDF bytes or a combined ML report.

## Acceptance record

- TypeScript, 114 tests in 20 suites and production builds passed. The initial sandboxed test run failed on Windows temporary-file renames; the approved rerun passed.
- Main browser regression passed extension permissions/scanning/sync/history/downloads, CLI parity/gates and dashboard review/comparison/import/export/deletion. Final UI rerun after removing touch assertions passed with 0px refresh displacement and preserved disclosure/focus. Syntax and diff whitespace checks passed. Hosted CI execution remains unverified.
- Automated axe audit: 14 synthetic dashboard/side-panel states, zero violations and zero incomplete checks in the recorded run. Tags cover WCAG 2/2.1/2.2 A/AA checks and best practices. Automated results only cover the exercised states.
- UI regression covers keyboard disclosures/skip links, stable focus/reading position, theme/preference fallbacks, enlarged root text and 320 CSS-pixel reflow. The narrow viewport is a reflow approximation, not actual browser zoom.
- User confirmed Edge dashboard/extension Tab/Shift+Tab and Enter/Space operation, meaningful Narrator labels, and the nine-page test PDF's heading/content order without clipping at 200% zoom. User-reported acceptance, not independently observed.
- Actual Chromium PDF generation, concurrent-render rejection/recovery and empty report passed. Nine-page long report plus one-page empty report passed text, end-marker, page-number and bounds checks, and every page was visually inspected.
- veraPDF 1.30.3: both fixtures passed the automated PDF/UA-1 profile with no failed rules. Font parsing warnings remain in validator/extractor logs despite successful profile, extraction and visual checks. Automated conformance does not replace manual reading-order assessment or certify every possible user-generated report.
- Tested samples include café, naïve, résumé, Zażółć gęślą jaźń, Český, Français, Español, Português, Straße, smörgåsbord, Ångström, € and £. These examples do not establish coverage of all languages, scripts or symbol combinations.
- Slow-loading baseline is recorded in [PERFORMANCE.md](PERFORMANCE.md); no physical-device speed guarantee.

Touch assertions were removed after the user excluded touch testing. No touch acceptance is required or claimed for this milestone.

## Reproduce

```powershell
npm.cmd run check
npm.cmd run test:browser
npm.cmd run test:ui
npm.cmd run test:pdf
python scripts/check-pdf-layout.py
# Optional: separately installed official veraPDF CLI and Java
$env:VYNLT_VERAPDF_JAR = 'path/to/verapdf/bin/cli-1.30.3.jar'
npm.cmd run test:pdf-ua
```

The layout script requires pdfplumber. UI tests use the browser suite's synthetic `test-results/insecure.json`. PDF/UA validation fails with instructions if no validator is configured; it never silently skips. The CI workflow now includes the UI audit; remote execution remains M4 work. Raw evidence is ignored under `test-results/frontend-design/` and `test-results/pdf/`.

## Repeat the native check after meaningful UI/report changes

Refresh the dashboard and reload the rebuilt extension. Press Windows+Ctrl+Enter to start/stop Narrator. Use Tab/Shift+Tab to reach controls and Enter/Space to activate them; verify the skip link reaches main content and disclosures announce meaningful labels. Open the downloaded PDF in Edge, use Narrator's reading commands, and verify title, headings, evidence and review notes follow a useful order. At 200% zoom check that text remains readable without clipping. Report the page/control and what was announced if a check fails.

References: [Microsoft Narrator guide](https://support.microsoft.com/en-us/accessibility/windows/narrator/complete-guide-to-narrator), [Playwright accessibility testing limits](https://playwright.dev/docs/accessibility-testing), [veraPDF validation profiles](https://docs.verapdf.org/cli/validation/).

# Dashboard GitHub setup

Open **GitHub setup** in the VYLNT dashboard sidebar after connecting your workspace. Copy the workflow or download `vylnt.yml`, then save it to the website repository as `.github/workflows/vylnt.yml`. The dashboard bundles the existing `docs/examples/vylnt-report-check.yml` verbatim at build time, including its pinned tool revision and specific validation errors; there is no external generator, credential or account data in the YAML.

Choose/open a saved scan in History, then return to GitHub setup. **Download report for GitHub** exports that unchanged raw scan as `vylnt-report.json`, the exact filename expected at the website repository root. The original raw and frozen insights JSON exports remain available and are also accepted by the workflow when renamed correctly. Exported JSON includes paths, cookie names and configuration findings: review before committing to a public repository.

Commit both files, push a branch, and view Actions. Require **VYLNT security gate** through the target repository's branch protection to block merging on a failed check. Configuration warnings remain separate from proven vulnerabilities; only high/critical high-confidence findings block this policy. Fix the website incrementally, rescan and commit a replacement report. No GitHub settings or repository files are changed automatically by the dashboard.

The uploaded-report check is a demo mode. It recomputes findings from the included observations and checks internal consistency (plus included hashes for frozen reports). It does not establish a trusted source, commit/website binding, freshness or live blockchain verification. A contributor can alter observations and regenerate hashes. The existing fresh-build security gate remains the stronger separate option. Experimental ML cannot decide pass/fail. No Supabase secret, VYLNT token, blockchain node or running desktop server is needed in Actions.

## Design decisions

| Before | After | Why |
| --- | --- | --- |
| Workflow available only as a developer-supplied file | Dedicated compact GitHub setup page with copy/download and collapsed YAML preview | Users can obtain the tested workflow directly in the product |
| Users manually rename exported report files | Selected-scan download uses `vylnt-report.json` | Avoid the observed missing-filename error |
| Clipboard denial can make copying fail silently | Announced fallback opens and selects read-only source; download remains available | Supports keyboard use and browsers without clipboard access |

Existing theme, native controls and focus styles are retained. No new animations or frontend dependencies. Setup text explicitly distinguishes branch pushes from protected merges, warnings from blockers, and report consistency from current-code assurance.

## Validation — 2026-10-26

Type checking, production build and eight local extracted-workflow checks passed. The real Chromium UI audit passed 17 accessibility states with zero violations. Setup-specific checks verify exact YAML bytes/filename, controlled clipboard success and denied-access selection fallback, no-selection History navigation and unchanged selected raw report export named `vylnt-report.json`. Light/dark, narrow/320px, reduced-motion and enlarged-text checks passed; desktop/mobile screenshots were inspected. Browser clipboard permissions were simulated in the test, not newly certified in native Edge. Existing raw-print/insights controls and extension UI checks in the audit also passed. No full unit/chain suite or new hosted workflow execution was performed for this frontend addition. Private artifacts live under `test-results/frontend-design/`.

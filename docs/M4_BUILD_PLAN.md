# M4 — Fresh security scans before push and merge

Status: **Closed in user-accepted demonstration scope, 2026-10-26.** Scanner, Actions fail/fix flows and dashboard workflow/report export are complete. The user explicitly waived branch-protection/up-to-date, direct/force/deletion/bypass restrictions and maintainer/code-owner review as closure requirements. No remote settings were changed; unverified fields remain unverified. Failed Actions checks alone do not guarantee rejection of a push or merge. Earlier pending/open entries below are historical, superseded by this scope decision.

## Accepted scope update — 2026-10-26

The original fresh-build runner remains available. The additional uploaded-report workflow evaluates exported observations with shared rules, rejects invalid/inconsistent reports and distinguishes blockers from warnings. The user demonstrated hosted blocking and confirms a new report after remediation passed. Dashboard **GitHub setup** supplies the tested YAML and exports the selected scan as `vynlt-report.json`; type/build, eight extracted-workflow cases and 17-state accessibility/browser audit passed. See GITHUB_REPORT_SETUP.md.

Uploaded-report mode does not prove source authenticity, current-code/commit association, freshness or live blockchain verification. ML remains informational. Administrative protection/review was removed from acceptance by the user; this does not certify those settings or disable any existing protections. No new tests were run for this documentation-only closure; whitespace checks passed. ML-Q remains open separately.

## Agreed behavior

Build and scan the exact proposed commit; block high/critical rule findings at high confidence and warn for everything else. No exceptions. Experimental LSTM scores and saved review notes cannot waive failures. Use an optional bypassable pre-push hook plus required GitHub checks on main. Start with a controlled demo and provide reusable npm-site integration. No Docker, public deployment, CI Supabase credentials or blockchain changes.

## Increments

- [x] Pure policy/configuration and clean exact-commit runner, bounded execution/collection and cleanup verified in local and hosted regression runs.
- [x] Controlled HTTPS npm demo, raw/insights/manifest artifacts and clear summaries.
- [x] Hook install/uninstall, outgoing commit parsing, multi-ref and existing-hook handling implemented; actual push rejection/fixed success demonstrated locally.
- [x] Dedicated GitHub workflow and reusable pinned-tool example, policy/config ownership files (enforcement not yet configured).
- [x] Local failed/fixed/dirty-worktree/error/cleanup/privacy acceptance and regressions: 11 groups and 221 unit tests passed.
- [x] Publish hosted failing/fixed revisions and inspect actual Actions results and artifact upload steps.
- [x] Main protected and VYNLT security gate required for everyone, from GitHub Actions; implementation PR #1 merged.
- [x] User-confirmed direct-push rejection and failed/fixed merge demonstration; demo123 runs fail then pass and PR #3 is merged.
- Waived (2026-10-26): branch protection/up-to-date, push/deletion/bypass restrictions and maintainer/code-owner review verification. These are not blockers in the accepted demonstration scope and are not claimed verified.

## Initial findings

The existing CLI already exits 0/1/2 and shares pure rules. NET-001 provides a high/high-confidence blocked-resource warning for HTTPS pages; cookie-name heuristics remain medium confidence and must not be promoted for this gate. CI currently tests fixtures but is not a required application scan. GitHub connector can read the public repository; branch-protection access returns 403 Resource not accessible by integration. The local GitHub CLI is unavailable. Do not mark hosted enforcement verified from workflow source alone.

Validation and remaining limitations will be updated after each increment. Registered websites, dashboard review labels and old reports do not prove that a proposed commit is fixed.

## Implementation evidence

Five pure policy/config tests, type checking and production builds passed. The first full local gate run passed ten grouped checks including real Git push rejection, dirty-worktree fix exclusion, intentional hook bypass with failing independent rescan, fixed push success, multi-ref failure, custom hook path/conflict handling, unavailable pages and occupied-port refusal. Timeout/cancellation cases in that first run occurred earlier than intended, so stronger assertions now target a hanging build and a running application before cancellation. A complete-collection budget test was added; final acceptance/regressions are running. Source collector additions are opt-in for the gate and leave ordinary report projections unchanged.

GitHub branch metadata reports main unprotected and no rulesets. The connector cannot read/write administrative branch protection (403). No required-check or protected-merge claim is made. A local CLI Git remote read succeeds; hosted publication/checks will be attempted after preparing the implementation.

## Hosted acceptance in progress

Published `codex/m4-security-gate` at c1d3ba308a6a85d964b27e270d8382d0b1ffc527. Actual dedicated Linux security run [40141350000](https://github.com/faizsaleem8/Vylnt/actions/runs/40141350000) passed. The broad workflow is still running. Final local acceptance passed 11 groups, explicitly including an actual build timeout and cancellation after the HTTPS app starts with its port reusable afterward; opt-in budget refusal catches a 301-element fixture. The full suite passed 221 tests / 40 suites, type checking/build and whitespace checks. A failing demo revision followed by its committed fix is now being published on the isolated implementation branch; no production branch is modified.

Draft PR creation through the connector also returns 403 Resource not accessible by integration. Branch publication through existing Git authentication succeeds. No PR was created, no protection was changed, and M4 remains open pending verified branch protection/required checks and owner review setup.

The deliberately insecure revision ca591172b2c49c75e0367e184a59a2e878093271 failed actual Linux [run 40141482946](https://github.com/faizsaleem8/Vylnt/actions/runs/40141482946) specifically at Fresh security scan, with NET-001 high/high findings, gate status blocked and exit 1. The artifact step succeeded (artifact 12579386137). The controlled application's source is now fixed back to secure and its follow-up hosted run is pending. This is code remediation, not a threshold change or exception.

## Final implementation acceptance — 2026-10-25

Historical pending states above are superseded by this evidence:

| Revision / test | Actual result | Evidence |
|---|---|---|
| Initial implementation c1d3ba308a6a85d964b27e270d8382d0b1ffc527 | Security gate passed | [Run 40141350000](https://github.com/faizsaleem8/Vylnt/actions/runs/40141350000) |
| Insecure demo ca591172b2c49c75e0367e184a59a2e878093271 | Fresh scan blocked, NET-001 high/high, exit 1; artifacts uploaded | [Run 40141482946](https://github.com/faizsaleem8/Vylnt/actions/runs/40141482946), artifact 12579386137 |
| Committed fix 25a77cecb72eaaa1eb8f73107d0e0830edc46b2e | Fresh scan passed; artifacts uploaded | [Run 40141752705](https://github.com/faizsaleem8/Vylnt/actions/runs/40141752705), artifact 12578229465 |
| Full Linux CI on implementation c1d3ba3 | All steps passed: check/build, gate regression, PDF, observer, extension/CLI/dashboard, accessibility, scanner stress, mocked Supabase auth | [Run 40141349966](https://github.com/faizsaleem8/Vylnt/actions/runs/40141349966) |
| Local Windows unit suite | 221 tests / 40 suites passed | Vitest run, 2026-10-25 |
| Local real Git/Chromium acceptance | All 11 groups passed, including dirty-worktree exclusion, rejected/fixed pushes, multi-ref, hook preservation, occupied-port safety, collection limits, actual build timeout and post-start cancellation/port reuse | ignored test-results/gate-acceptance.json |

Type checking, production build and whitespace checks passed. CI runs on intermediate revisions are retained; only the implementation full CI and dedicated fail/fix runs above are claimed here. No new installed native Edge, live Supabase, blockchain or model-quality certification was performed.

## Owner-completed acceptance — 2026-10-25

The user completed the GitHub steps and confirms the fail/fix demo works. Verified independently:

- [Implementation PR #1](https://github.com/faizsaleem8/Vylnt/pull/1) merged into main.
- Public main metadata now reports protected=true, VYNLT security gate required from GitHub Actions (app ID 15368), enforcement everyone.
- User-provided terminal screenshot shows GH006 rejection of a direct push to main, requiring a PR and the security check.
- Demo123 revision f63939057e6f2a2bc1ae9f179899e42c509fe1c3 failed specifically at Fresh security scan in [run 40147536120](https://github.com/faizsaleem8/Vylnt/actions/runs/40147536120); artifact upload passed.
- Fixed revision 2f1bb24ddd43f193865fdc792e760ed721f602df passed Fresh security scan and artifact upload in [run 40147969307](https://github.com/faizsaleem8/Vylnt/actions/runs/40147969307).
- [Demo PR #3](https://github.com/faizsaleem8/Vylnt/pull/3) merged as 396a1dceabcbb327d31dade553a6cb3a75712ae4. The source is secure again and the local tree is clean. Earlier PR #2 was closed without merging.

This supersedes earlier statements that no PR/protection existed. The failed-merge interaction itself is user-confirmed, corroborated by required-check metadata and the real failed/fixed runs; no independent UI recording is claimed.

Remaining: full branch-protection GET still returns 403, so code-owner review, strict up-to-date, ordinary/admin bypass and force/deletion fields remain unverified. Keep that policy subtask open rather than guessing from the required-status summary. Existing instructions remain in M4_GITHUB_SETUP.md. No hook installation or administrative change was performed in this documentation update. No application tests were rerun for documentation-only changes; whitespace checks apply. ML-Q is unchanged and remains open.

# M4 — Fresh security scans before push and merge

Status: implementation in progress, 2026-10-25. M4 remains open until local gate, hosted failed/fixed runs and branch protection are demonstrated.

## Agreed behavior

Build and scan the exact proposed commit; block high/critical rule findings at high confidence and warn for everything else. No exceptions. Experimental LSTM scores and saved review notes cannot waive failures. Use an optional bypassable pre-push hook plus required GitHub checks on main. Start with a controlled demo and provide reusable npm-site integration. No Docker, public deployment, CI Supabase credentials or blockchain changes.

## Increments

- [x] Pure policy/configuration and clean exact-commit runner implemented, with bounded execution/collection and cleanup; expanded acceptance in progress.
- [x] Controlled HTTPS npm demo, raw/insights/manifest artifacts and clear summaries.
- [x] Hook install/uninstall, outgoing commit parsing, multi-ref and existing-hook handling implemented; actual push rejection/fixed success demonstrated locally.
- [x] Dedicated GitHub workflow and reusable pinned-tool example, policy/config ownership files (enforcement not yet configured).
- [x] Local failed/fixed/dirty-worktree/error/cleanup/privacy acceptance and regressions: 11 groups and 221 unit tests passed.
- [ ] Publish hosted failing/fixed revisions and inspect actual Actions results.
- [ ] Verify main protection, workflow ownership review and local-hook bypass resistance through GitHub.

## Initial findings

The existing CLI already exits 0/1/2 and shares pure rules. NET-001 provides a high/high-confidence blocked-resource warning for HTTPS pages; cookie-name heuristics remain medium confidence and must not be promoted for this gate. CI currently tests fixtures but is not a required application scan. GitHub connector can read the public repository; branch-protection access returns 403 Resource not accessible by integration. The local GitHub CLI is unavailable. Do not mark hosted enforcement verified from workflow source alone.

Validation and remaining limitations will be updated after each increment. Registered websites, dashboard review labels and old reports do not prove that a proposed commit is fixed.

## Implementation evidence

Five pure policy/config tests, type checking and production builds passed. The first full local gate run passed ten grouped checks including real Git push rejection, dirty-worktree fix exclusion, intentional hook bypass with failing independent rescan, fixed push success, multi-ref failure, custom hook path/conflict handling, unavailable pages and occupied-port refusal. Timeout/cancellation cases in that first run occurred earlier than intended, so stronger assertions now target a hanging build and a running application before cancellation. A complete-collection budget test was added; final acceptance/regressions are running. Source collector additions are opt-in for the gate and leave ordinary report projections unchanged.

GitHub branch metadata reports main unprotected and no rulesets. The connector cannot read/write administrative branch protection (403). No required-check or protected-merge claim is made. A local CLI Git remote read succeeds; hosted publication/checks will be attempted after preparing the implementation.

## Hosted acceptance in progress

Published `codex/m4-security-gate` at c1d3ba308a6a85d964b27e270d8382d0b1ffc527. Actual dedicated Linux security run [40141350000](https://github.com/faizsaleem8/Vylnt/actions/runs/40141350000) passed. The broad workflow is still running. Final local acceptance passed 11 groups, explicitly including an actual build timeout and cancellation after the HTTPS app starts with its port reusable afterward; opt-in budget refusal catches a 301-element fixture. The full suite passed 221 tests / 40 suites, type checking/build and whitespace checks. A failing demo revision followed by its committed fix is now being published on the isolated implementation branch; no production branch is modified.

Draft PR creation through the connector also returns 403 Resource not accessible by integration. Branch publication through existing Git authentication succeeds. No PR was created, no protection was changed, and M4 remains open pending verified branch protection/required checks and owner review setup.

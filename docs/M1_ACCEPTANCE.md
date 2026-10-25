# VYLNT M1 acceptance

M1's browser scanner foundation is complete as of 2026-10-21. Native browser checks were performed and reported by the user in Microsoft Edge. Automated checks use real bundled Chromium with disposable profiles; they do not replace native-browser inspection. Installed Google Chrome is not independently certified by the Edge result.

## Native Edge checks — user-confirmed pass

On 2026-10-21 the user confirmed **All three pass** for:

1. Open `http://127.0.0.1:5175/`; open, close and reopen the native VYLNT side panel from its toolbar icon.
2. Open `http://127.0.0.2:5175/`; grant only that optional site, confirm scanning, revoke access and confirm scanning is blocked, then re-enable it.
3. Restart Edge and confirm VYLNT can rescan.

These are user-reported results, not agent-observed screenshots or independently captured permission prompts. Computer-use inspection previously stopped because it could not establish the active browser URL; the connected browser inventory did not expose Edge. Permission prompts were handled by the user.

To repeat, build/reload the extension and run `npm run lab:m1`. This starts HTTP-only controlled fixtures on two loopback addresses, port 5175. There are no accounts, credentials, external resources or uploads. `.1` uses the existing required localhost access; `.2` exercises the single-host optional permission. The user performs permission changes in the installed browser. Stop the fixture server afterward.

## Automated acceptance

Run `npm run test:scanner` after building and installing the bundled Chromium runtime. It uses real content-script messaging, background rule evaluation and browser session storage; it does not mock Chrome transport or contact Supabase. The harness verifies:

- A real HTTP 304 revalidation keeps effective security headers and creates a fresh scan ID.
- Cache-bypassed reload picks up changed headers without retaining the prior value.
- Back navigation yields a collected observation for the current page. This does not independently establish every BFCache/service-worker-cache/browser-version behavior.
- Closing and relaunching Chromium with the same disposable profile preserves pause preference, clears session-only scans, blocks collection while paused, and resumes after explicit unpause.
- Large dynamic pages retain bounded sanitized snapshots with actual extension IPC/background/session storage, at normal speed and 6x CDP CPU slowdown. Explicit collection captures the latest DOM after the automatic observer budget.

The background unit regression additionally checks host revocation rejects incoming DOM/navigation data, unregisters content scripts, preserves already collected history and registers/collects after re-grant. This uses API mocks and is separate from the user's native permission test.

Reports and raw timing rows are written under ignored `test-results/scanner-acceptance/results.json`; disposable test profiles remain under ignored `.local/scanner-*` for inspection. Do not publish private profiles. CI runs the scanner harness as a behavior regression without performance thresholds; hosted CI execution remains an M4 acceptance item.

## Limits and ongoing work

The automatic observer disconnects after 100 mutation callbacks, retaining one debounced snapshot. A long/slow burst can continue beyond that snapshot: the 6x run captured mutation 110 of 120 automatically, then explicit collection captured mutation 120. Do not present automatic snapshots as continuous exhaustive monitoring. Rescan remains available.

Performance results and their limits are in [PERFORMANCE.md](PERFORMANCE.md). Simulated throttling is not a physical low-end-device, battery or production-load certification. Native accessibility, broader cache/browser matrices and future regressions remain ongoing acceptance work; hosted persistence, ML quality, combined reports and blockchain belong to later milestones.

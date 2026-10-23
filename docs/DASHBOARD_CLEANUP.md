# VYNLT dashboard cleanup — 2026-10-24

Insights layout follow-up: PDF and JSON exports are now visible together as a vertical button group, with JSON directly below PDF. Prioritised issues use consistent title, severity and expand-control columns, plus heading spacing below the save status. This supersedes the secondary JSON disclosure described in earlier notes. Export payloads, original scan actions and analysis/anchoring behavior are unchanged. Validation is recorded in PLAN.md.

Download placement follow-up completed: Print / Save PDF and Export JSON are visible in the top scan summary again. Report insights has a separate visible Download insights PDF button, with insights JSON in a secondary disclosure. This supersedes the combined-menu design below. Type checking/build, all 16 local-chain/browser acceptance groups and the 14-state UI/accessibility audit passed; desktop and mobile screenshots were inspected. Raw print content, automatic report saving and anchoring remain unchanged. No new hosted/native verification is claimed.

Latest follow-up: removed the separate Original scan integrity panel from the dashboard; its underlying hash, raw verification API and report exports are preserved. Blockchain status and verification actions are now visible directly in the report instead of inside a collapsed disclosure. Transaction metadata stays expandable, and pending/error/disabled states remain explicit. The user cancelled adding deletion to Collection coverage; that table remains unchanged. All 16 real-chain/browser groups, the 14-state UI/accessibility audit, type checking, builds and whitespace checks passed for this follow-up, with screenshot inspection. Earlier presentation notes below describe the initial cleanup.

Preserve the existing purple/light/dark theme and typography. Apply the local Emil design engineering skill: clear hierarchy, immediate native disclosures, visible focus, existing press feedback and reduced-motion behavior. No new animation library.

| Before | After | Why |
|---|---|---|
| Repeated expanded ML text, hashes and every report version | Compact generated-report summary; details and older versions expandable | Keep the main reading path short without losing evidence or limitations |
| Raw and insights downloads scattered across the page | One labelled Downloads disclosure | Explain the two PDF outputs in one place |
| No report Back action; deletion buried in Settings | Contextual Back, Delete scan in history/report and Delete website on site cards | Make navigation and management discoverable |
| Every raw finding competes with generated insights | Explicit All findings disclosure, unchanged complete raw PDF | Preserve full data while reducing initial clutter |

Deletion requires an in-app confirmation showing scope. Website deletion operates on a snapshot of owner-scoped scan IDs, including all pages, never another owner's data. Existing scans/FK cascades remove findings, notes and frozen reports. Cancellation covers unsent journal jobs; submitted blockchain transactions remain. No new SQL grant/migration: an empty Supabase `sites` bookkeeping row can remain, but the website list is derived from saved scans and disappears when the last scan is deleted. New scans can recreate a website. Bulk failures may be partial and must be surfaced/retryable.

## Completed and checked

- Contextual Back restores the originating overview/list with its existing filter/page state. Imported reports also record their origin view. Navigation returns focus to the page heading.
- History/report details expose Delete scan; site cards expose Delete website. The native dialog defaults focus to Cancel, supports Escape, explains scope and preserves submitted-chain warnings. Failed bulk deletion refreshes remaining data and keeps an explicit retryable error.
- One Downloads disclosure contains insights PDF/JSON and full-data Print/PDF/JSON. Initial report presentation keeps full hashes, model limitations, older reports, raw evidence and transaction metadata expandable, while the experimental label and compact status stay visible. Previous exports and automatic finalisation remain unchanged.
- All data/model/rule severities remain available. No detection or training policy changed; no new frontend dependency or animation library was added.

Validation passed 212 tests / 39 suites and six focused deletion/anchor API checks within that total, including 201 scans across deletion batches and Supabase keyset traversal over 1,001 IDs. All 16 local-chain/browser groups passed, explicitly covering compact defaults, automatic save/hash/anchor, Back focus, scan/website deletion, Cancel/Escape, modal axe/default focus, controlled failure/retry and other-owner preservation. The full extension/CLI/dashboard browser regression passed raw/insights downloads/reload, import, comparison, filtering, deletion, cancellation and no JS errors.

The 14-state visual/accessibility audit passed light/dark, keyboard, contrast/preferences, mobile/320px and 200% text; refresh layout shift remained zero. Desktop minimal/light and mobile/dark screenshots were inspected. Type checking, builds and whitespace checks passed. Existing browser checks now open intentional disclosures and use Import from History; initial failures were obsolete visibility/location expectations, not removed checks.

Artifacts: `test-results/frontend-design/accessibility.json`, `test-results/frontend-design/measurements.json`, `test-results/blockchain-acceptance.json`, and private `.local/blockchain-acceptance-*/dashboard-report-minimal.png`. These are synthetic/automated local checks, not new hosted Supabase or installed native Edge certification. No real user records were deleted during development. No migration is needed; restart the API and refresh the dashboard to use the rebuilt UI and website endpoint.

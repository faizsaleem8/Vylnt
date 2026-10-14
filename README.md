# VYNLT

A browser-based web security configuration observer. The first implementation is a local Chrome Manifest V3 extension backed by a shared TypeScript rule engine.

**Development status:** first milestone implemented; see [PLAN.md](PLAN.md) for completed work, validation, limitations, and all remaining modules. Every project change must update that file.

## Run locally

Requires Node.js 20.18+ and Chrome 120+. Node.js 22+ is recommended.

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run lab
```

1. Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this project's `dist/extension` directory.
2. Visit `http://127.0.0.1:5174/insecure`.
3. Open VYNLT's toolbar popup and select **Rescan page**. Rescanning reloads the page so response headers can be observed.
4. Open **report & history** to inspect evidence, remediation, and JSON export.
5. Compare `/secure`, then use `/dynamic` to exercise DOM updates.

After source edits, run `npm.cmd run build`, reload the extension in Chrome, and reload the test page. Other domains require **Enable this site** in the popup. Chrome host permission patterns apply across ports on that host. Pause stops new collection; resume and rescan to capture a complete new navigation.

## Structure

- `packages/core`: shared contracts, eight pure configuration rules, scoring, and metadata sanitizers.
- `apps/extension`: background collector, bounded DOM observer, popup and report history.
- `labs`: loopback-only controlled HTTP fixture server.
- `tests`: positive, negative, edge-case and privacy tests.
- `scripts/build.mjs`: bundles an unpacked Chrome extension.

## What is detected

| Rule | Observation |
| --- | --- |
| HDR-001 | Missing/disabled HSTS on observed HTTPS response |
| HDR-002 | Unrecognized or missing restrictive framing policy |
| HDR-003 | Missing or broad script CSP (heuristic) |
| CK-001 | Sensitive-name cookie lacks Secure |
| CK-002 | Sensitive-name cookie lacks HttpOnly |
| CK-003 | Sensitive-name cookie permits cross-site use |
| NET-001 | HTTP resource on an HTTPS page |
| JS-002 | Third-party script lacks an integrity attribute (informational) |

Score = max(0, 100 − sum of highest severity weight per rule). Weights: critical 20, high 10, medium 5, low 2, info 0. Repeated occurrences of a rule do not compound penalties. A score is a configuration heuristic, never a probability of compromise. Missing coverage is displayed separately; an incomplete report can score 100.

## Privacy and collection boundaries

Reports stay on the device; there is no backend upload. The extension retains at most 30 scans. Tab state uses session storage and history uses local storage, restricted to trusted extension contexts. The report page can clear both. Cookie values are never stored; query strings, URL credentials and fragments are removed. URL paths and cookie names can still be sensitive—review exports before sharing. CSP values are kept locally as security metadata and can contain source URLs or nonces. Raw page text, script source, request bodies, and unrelated response headers are not collected.

Only localhost hosts are granted at install. Other HTTP(S) hosts are optional and granted through the popup. Network visibility is bounded by Chrome's permissions, including cross-origin resources. DOM references do not prove whether a resource loaded, was blocked, or was upgraded. Browser preload lists, meta CSP, full CSP semantics, cached/back-forward navigation edge cases, service-worker-generated responses and JavaScript data flow are not comprehensively analyzed. Cookie purpose is inferred from its name and marked medium confidence.

The content observer collects at most 150 scripts and 300 DOM references per update and stops after 100 mutation callbacks. Network collection is bounded to 300 resources; combined evidence to 600. SPA route changes are not separate scans yet. Rescan gives a fresh snapshot. The HTTP lab cannot establish HTTPS-specific behavior; HSTS and mixed-content rules currently use synthetic test fixtures. A TLS browser lab and Chrome end-to-end acceptance are still required.

## Manual acceptance checklist

- Install unpacked build; rescan the insecure page; verify HDR-002, HDR-003, CK-001 and CK-002.
- Rescan the hardened page; verify framing/CSP warnings disappear (browser cookie behavior on HTTP may vary).
- Refresh and confirm a new scan ID; navigate two tabs and confirm findings stay attached to the correct page.
- Pause, reload, and confirm no new scans; resume and rescan.
- Stop/restart the extension service worker and confirm saved history remains available.
- Grant a new site from the popup and rescan; revoke host access in Chrome and verify collection stops.
- Export JSON and inspect for cookie values and query/fragment secrets.
- Clear history and verify the report list is empty.

## Architecture references

- [Chrome passive webRequest observation](https://developer.chrome.com/docs/extensions/reference/api/webRequest)
- [Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

The Express/Supabase backend, React dashboard, Playwright scanner, blockchain anchoring, and ML experiments are planned in `PLAN.md`; they are not implemented yet.


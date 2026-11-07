# VYLNT native dataset expansion

Historical FieldPoint/Yoyo increment below. The subsequent [BookWise/Wikiflow increment](ML_NATIVE_BOOKWISE_WIKIFLOW.md) brings retained collection to six families/33 batches in `project-native-seeds-007`, with 54 repeated inputs removed. Five screened candidates remain unexecuted, one source remains excluded, and all seven category datasets still fail training readiness. Earlier aggregates and results are preserved.

Executed 5 November 2026. This is developer-owned development acquisition, not model qualification.

## Sources and selection

`ml/applications/native/expansion.candidates.json` pins ten additional public repositories selected by Node/Express/local-storage suitability before execution or prediction. `expansion.audit.json` records actual MIT licence hashes, source revisions and exclusions. `scripts/native-expansion-inventory.py` reproduces these checks from pinned local Git mirrors. Metadata alone does not certify family independence or category coverage.

Executed sources:

| Application | Pinned revision | Independent controls |
|---|---|---|
| [FieldPoint](https://github.com/egeyigit/fieldpoint) | `1329edc008f284967517f6fb9af1f622900af7b2` | Verify native token HMAC, SQLite session-to-user link and expiry; register a synthetic first user; create a native site; read back SQLite; anonymous write denied without mutation |
| [Yoyo Collection](https://github.com/stammig/yoyo-collection) | `94347ba9e181ae5d69eab83554e3c5b0dad3a47b` | Verify native signed owner-token payload and expiry; synthetic owner login; create a native collection entry; read back SQLite; anonymous write denied without mutation |

Both sources are excluded from future fresh holdouts by their source manifests and the existing exposure inventory. They are not wrappers sharing a manufactured authentication implementation. The common collector orchestrates each application's own session and storage code. Legacy internal seed-control field `nativeBookmarkRowVerified` carries the checked protected-write boolean; the separate native-oracle artifact identifies the actual site/collection operation and session type.

Seven other candidates remain unexecuted: BookWise, portal, personal-knowledge-manager, HomeInventory, StockBase, Wikiflow and 8star-links. Their source/licence screening is not dataset evidence. In particular, StockBase's header-token authentication does not by itself supply cookie-purpose examples. `afnan-nex/inventory_management` is excluded because the pinned source is an Electron desktop application. No candidate was replaced using model scores; no predictions occurred.

## Execution and evidence

For a new developer installation, create the two mirrors at these exact paths (do not reset an existing working repository). The runner verifies the pinned commits listed above:

```powershell
git clone --no-checkout --no-recurse-submodules https://github.com/egeyigit/fieldpoint.git .local/ml-native-expansion/fieldpoint
git -C .local/ml-native-expansion/fieldpoint -c core.hooksPath= -c core.autocrlf=false checkout --detach 1329edc008f284967517f6fb9af1f622900af7b2
git clone --no-checkout --no-recurse-submodules https://github.com/stammig/yoyo-collection.git .local/ml-native-expansion/yoyo-collection
git -C .local/ml-native-expansion/yoyo-collection -c core.hooksPath= -c core.autocrlf=false checkout --detach 94347ba9e181ae5d69eab83554e3c5b0dad3a47b
npm --prefix .local/ml-native-expansion/fieldpoint ci --ignore-scripts --no-audit --no-fund
npm --prefix .local/ml-native-expansion/yoyo-collection ci --ignore-scripts --no-audit --no-fund
```

Use Node 24 for installation/execution. Neither app needs a native dependency build for the tested API scope; optional Yoyo thumbnail support is outside it. `RUN_COMMANDS.md` lists the individual acquisition and cancellation commands. The inventory script additionally expects all ten source-selection mirrors and is not required to run either already pinned collector.

The runner verifies every tracked file against its pinned Git blob before copying it, allowing newline conversion only when canonical bytes reproduce that blob. Application code/data are copied into a new ignored `.local/native-expansion-run-*` directory. Only locked dependencies are linked; that link is removed before bounded recursive cleanup. All native listeners are forced to port zero on `127.0.0.1`; a private child receipt identifies the actual listener. The child receives a small environment and disposable SQLite/storage paths. Logs are discarded because third-party logs may contain request bodies. Browser traffic is limited to explicit loopback origins.

Source execution requires trust in the pinned third-party application/dependencies. These controls are process isolation, not an operating-system sandbox. The user explicitly approved both local application runs after automatic review requested that approval.

Three response profiles run against each native application:

1. **Native:** original response headers/cookie attributes and application implementation.
2. **Readable:** remove only HttpOnly from the native session's Set-Cookie response, then execute authentication and original/HttpOnly/restored compatibility controls.
3. **Framing:** explicitly set an own-origin response `frame-ancestors` policy and remove conflicting X-Frame-Options, then execute healthy permitted, forbidden, repeated forbidden and nested ancestor controls.

Interventions are recorded in configuration identities. Profiles remain one family. Scoped API-response checks do not assert frontend compatibility, whole-application route coverage, cookie access necessity outside the tested operation or CSRF protection. No authentication, trust or purpose is inferred from a name, comment or model score.

Retained private artifacts include sanitized raw scans, signed evidence, verification public keys, source metadata, separate oracle outcomes, numeric seed receipts and completed acceptance markers. Ephemeral keys, synthetic users, database rows, cookie values, passwords and request bodies are removed. Failed/cancelled runs retain bounded failure metadata outside accepted observation directories. New failures have unique records under `test-results/native-projects/failures/`.

## Measured result

All six Chromium family/profile runs passed; both framing profiles also passed in Edge. Each application passed explicit startup cancellation/cleanup. Accepted artifacts reloaded after private-key/data removal, and altered evidence/scans failed verification. These outcomes are recorded under `test-results/native-projects/`.

An actual changed-source check also rejected modified FieldPoint session code before starting an application or creating a run directory; the exact original bytes were restored afterward.

Combined immutable aggregate: `.local/project-native-seeds-006/` contains **24 completed batches across four native families** and removes **48 repeated inputs**. Equivalent browser/profile runs do not create new examples.

| Category | Complete change scenarios | Complete contextual scenarios | Unique change/contextual numeric variants | Uncertain inputs |
|---|---:|---:|---:|---:|
| HDR-001 | 0 | 0 | 0 / 0 | 0 |
| HDR-002 | 0 | 3 | 0 / 2 | 5 |
| HDR-003 | 1 | 1 | 1 / 1 | 10 |
| CK-001 | 3 | 0 | 6 / 0 | 1 |
| CK-002 | 3 | 0 | 2 / 0 | 0 |
| CK-003 | 0 | 0 | 0 / 0 | 0 |
| NET-001 | 0 | 0 | 0 / 0 | 0 |

Scenario counts use family/reason groups; numeric variants are counted separately and cannot manufacture independent families. The 24 receipts include earlier Jingo/Tabinator runs. All seven category files exist, but **none meets training readiness**. Candidate preflight reports the missing registered eight-training/four-validation cohort, required 30/15 examples per class/category and family coverage. No fitting, calibration, evaluation or release follows these seeds.

## Validation and remaining work

84 focused tests/eight files passed across source inspection, native source binding, privacy, uncertainty/conflicts, archived policies, frozen reports, local TLS guards and holdout-command mechanics. Both new exposure records are mandatory: deletion fails closed, rather than making an already examined application fresh again. The nine holdout-command tests use disposable synthetic fixtures, not real candidate evaluation. Restricted-loopback/OpenSSL failures passed when the same two affected files were rerun outside those restrictions. Type checking and production builds passed. Native runners required specific third-party execution approval; no approval remains pending for the two executed applications.

Fresh approved localhost trust passed the three strict HSTS mechanism profiles once, but resource upgrade/execution remained unsupported and native Tabinator browser certificate validation failed. No positive native TLS/upgrade label was produced. Every trust window removed the exact leaf, and the final fresh store check found zero entries. See `ML_LOCAL_TLS_SETUP.md`.

Next: obtain native non-sensitive preference/JavaScript-necessity and cross-site protection evidence; establish reliable native HTTPS/HSTS and upgrade/dependency behavior; execute additional suitable independent families; reach the original distinct class counts and freeze eligible 8/4 assignments before fitting. Stage C, training, qualification and qualified runtime acceptance remain open. The existing JS-002 release is unchanged.

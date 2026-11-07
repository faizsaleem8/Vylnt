# VYLNT twelve-family native acquisition

Executed 5 November 2026. Collection expanded from six to **twelve source families**. These are developer-owned, pre-cohort seed observations. An eligible 8-training/4-validation corpus, sufficient distinct examples and a qualified seven-category model do not yet exist.

## New pinned sources

| Family | Pinned revision | Native operation and independent check |
|---|---|---|
| [Portal](https://github.com/larsmikki/portal) | `90755ce5884e97eb86c8aea33ed3642dce977b11` | Public group creation; independently reopen the SQLite file after native SQL.js flushing; public repeat operation |
| [Personal Knowledge Manager](https://github.com/fufu1209/personal-knowledge-manager) | `413d308c0b43b2a171dd945a29909a95b47904f0` | Native production API-key gate; note creation/content readback; missing/wrong-key denial without storage mutation |
| [StockBase](https://github.com/JoshuaEngine7/StockBase) | `859234c5928774fceb9dcb4f119df55356475616` | Native owner login/token; equipment creation and ID/content readback; missing/wrong-token denial |
| [8star Links](https://github.com/TimoM84/8star-links) | `b52d350eec54822d9d4039eaa4cbce833c0368dc` | Native public folder creation and SQLite readback; public repeat operation; no favicon/title fetch invoked |
| [Anonymous Notepad](https://github.com/ntkhang03/Anonymous-Notepad) | `135e18dde6ac1acae195bb74dfaee49a0fbf33f6` | Native browser editor input saves a document; independent SQLite content readback; native password setup and wrong/correct-password writes |
| [Habit Tracker](https://github.com/brixdorf/habit-tracker) | `c903c2788f8336bb195e7b2ce490a8b8d97e1a0d` | Native configured synthetic owner login; independent HMAC and SQLite session/expiry checks; protected note creation and anonymous non-mutation |

Earlier collected families: Jingo, Tabinator, FieldPoint, Yoyo Collection, BookWise and Wikiflow. Profiles and repeat browsers remain the same source family. The public source records retain repository IDs, licence text hashes, source hashes and dependency locks. All twelve known sources are mandatory in the development exposure registry. The two newly selected sources and screening exclusions are in `ml/applications/native/expansion-next.candidates.json`; the earlier selection lock is unchanged.

HomeInventory is excluded from this bounded collector because its 719 tracked files exceed the unchanged 600-file copy limit. The Electron application remains excluded; `sistema-estudos` was screened out as a template before download/execution. No source was chosen or substituted using predictions. Exact security-implementation hashes and repository identities are checked against the earlier source locks, but full historical numeric-input and family/split audits remain required for registered preparation.

## What changed

`native-operation-adapters.ts` and `native-operation-data.ts` support native public, header-authenticated and document-password flows separately from cookie-session controls. They do not invent cookies or attach authentication-purpose facts to unrelated findings. SQLite data are read independently through Node's SQLite implementation; SQL.js/Sequelize/better-sqlite3 remain native application choices. The two TypeScript backends are transpiled in disposable copies with their import layout/SQL files preserved, not bundled with replacement application logic.

The framing checker optionally accepts bounded `x-api-key` / `x-session-token` values in memory. They are copied, validated, sent only to the already-validated target origin and excluded from reports, witnesses and training data. Synthetic ancestor origins never receive them. Unknown/failed/redirected frame observations remain unknown.

Public operations need independently verified writes and native public access. Protected operations need successful native writes and missing/invalid-credential non-mutation. These controls support only the explicitly exercised response/operation. They do not prove application-wide authorization, CSRF coverage, embedding purpose or exploitability.

Anonymous Notepad's native page loads external assets and submits POSTs inside frames. External traffic remains blocked; the frame checker remains GET-only. Its framing result is **Needs review**, not contextual. The successful native document write/password controls do not override that limit.

All runs verify pinned source before copying and again before accepting artifacts; modified files and unsupported symlinks fail closed. Data/environment files are omitted from disposable copies. Only installed pinned dependencies are linked; those links are removed before bounded cleanup. Child environments contain synthetic values and local paths only. This is process isolation, not an OS sandbox. The user explicitly approved the six applications and their native dependencies.

## Runtime and reproducibility

Source caches live at `.local/ml-native-expansion/<lowercase repository name>`. Clone only into a new cache and detach at the exact revision in the table. Use `git -c core.hooksPath= -c core.autocrlf=false checkout --detach <revision>` within that cache. Never reset a user's existing project.

Install locked dependencies with lifecycle scripts disabled first. Portal/Habit Tracker use their root workspaces; Personal Knowledge Manager uses `src/backend`; the others use the root. The required rebuilds are:

| Application | Native rebuild | Application runtime |
|---|---|---|
| Portal | None for the tested group flow | Node 24 |
| Personal Knowledge Manager | `better-sqlite3` | Node 20 |
| StockBase | `better-sqlite3 bcrypt` | Node 24 |
| 8star Links | `better-sqlite3 sharp` | Node 24 |
| Anonymous Notepad | `sqlite3 bcrypt` | Node 24 (N-API modules) |
| Habit Tracker | `better-sqlite3` | Node 24 |

The collector always uses bundled Node 24 (or `VYLNT_NODE`). `VYLNT_NATIVE_NODE20` selects the Node 20 child used by Personal Knowledge Manager/Wikiflow; the wrapper checks its major version. Personal Knowledge Manager's pinned SQLite 11.10.0 has no available Node-24 Windows prebuild here; the attempted build required unavailable ClangCL. It ran successfully using its Node-20 binary. No dependency version was changed. Upstream engine/deprecation warnings remain; these are controlled development fixtures, not production compatibility claims.

To ensure npm rebuilds use the intended runtime, invoke npm's JavaScript entry point with that runtime **and** put its directory first in PATH for native install subprocesses. Changing PATH while invoking the system `npm.cmd` alone still starts that wrapper's adjacent Node 20. The reproducible PowerShell form is in `RUN_COMMANDS.md`.

```powershell
python -B scripts/native-expansion-inventory.py
foreach ($family in @('portal','personal-knowledge-manager','stockbase','8star-links','anonymous-notepad','habit-tracker')) {
  npm run ml:projects:native:expand -- --family $family --profile native
  if ($LASTEXITCODE -ne 0) { throw 'Native collection failed' }
  npm run ml:projects:native:expand -- --family $family --profile framing
  if ($LASTEXITCODE -ne 0) { throw 'Framing collection failed' }
}
npm run ml:projects:native:expand -- --family habit-tracker --profile readable
```

Set `$env:VYLNT_TEST_BROWSER='msedge'` for Edge; remove it after the run. Each family supports `--cancel`. Run `node scripts/native-cohort-source-check.mjs` only after all collectors stop: it changes one source file per new family, checks rejection before startup, and restores exact original bytes in `finally`. It does not run altered application code.

The umbrella `ml:projects:seeds -- --collect` now covers all twelve installations; individual profiles were executed, not the entire recollection as one invocation. The existing private family key must remain unchanged. Completed sanitized runs are retained under `.local/ml-native-observations/<family>/<run>/`; failed/cancelled records stay separate and cannot enter seed aggregation.

## Measured corpus and validation

Latest immutable aggregate: `.local/project-native-seeds-009/`, **52 completed batches, twelve families, 67 repeated inputs discarded**. The intermediate `008` aggregate and all earlier records remain unchanged.

| Category | Complete change/contextual scenario groups | Unique change/contextual numeric variants | Unknown inputs |
|---|---:|---:|---:|
| HDR-001 | 0 / 0 | 0 / 0 | 0 |
| HDR-002 | 0 / 10 | 0 / 5 | 14 |
| HDR-003 | 1 / 1 | 1 / 1 | 28 |
| CK-001 | 5 / 0 | 6 / 0 | 1 |
| CK-002 | 5 / 0 | 2 / 0 | 0 |
| CK-003 | 0 / 0 | 0 / 0 | 0 |
| NET-001 | 0 / 0 | 0 / 0 | 0 |

Scenario groups and distinct numeric inputs are different measures. More applications do not necessarily increase numeric input diversity. No repetition, renamed identifier, public endpoint or missing cookie manufactures another class/example.

Completed acceptance:

- Thirteen new Chromium collections: native/framing for all six, plus Habit Tracker readable cookies. Six Edge framing collections. Five new framing adapters verified protection controls in each browser; Notepad correctly retained review.
- All six active cancellations removed native processes/data; all six altered-source checks rejected before startup and restored source bytes. Accepted runs passed privacy, signature, reload and changed-scan/evidence rejection.
- 109 relevant tests across seven files: seed/source/holdout commands, transient-header rejection, frame evidence, source inspection and archived reports. Type checking and production builds passed. Existing Ed25519/Zod warnings remain.
- Actual candidate preflight rejected the aggregate: no eligible registered 8/4 dataset, insufficient distinct examples/classes/families. No fit, calibration, prediction, holdout consumption or release occurred.

Broad UI, PDF pagination, repeated performance and hosted migration-006 acceptance were not rerun. No certificate trust, Docker, deployment, GitHub policy or raw severity changes occurred. JS-002 and old frozen report bytes remain unchanged.

## Remaining stages

1. Fill native category gaps: validated HTTPS/HSTS, actual cross-site protection and verified resource upgrades; contextual cookie/JavaScript-purpose cases; adequate positive/contextual framing and script-policy cases. API-only families may not supply every category and must not be counted where evidence is absent.
2. Complete historical exposure/independence and split audits, register eligible eight-training/four-validation assignments, and meet 30/15 distinct examples per class/category across at least three families. Twelve collected sources alone do not establish this.
3. Train/calibrate a separate LSTM and logistic comparator on eligible development data, qualify on genuinely untouched families, then enable passing categories and accept Worker/API/frozen JSON/PDF behavior.

**0/7 remaining datasets are training-ready; 1/8 categories remains qualified. ML-Q is open.**

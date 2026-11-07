# VYLNT BookWise and Wikiflow development data

Executed 5 November 2026. Two additional native application collectors bring the retained corpus to six source families. This is development evidence, not an eligible training corpus or qualified release.

## Pinned sources and native controls

| Application | Revision | Native checks |
|---|---|---|
| [BookWise](https://github.com/joesalaz/BookWise) | `547203a025c28d809bc09c8bbd00992b81c032aa` | Native Sequelize model bootstrap of disposable user/schema; native login; session HMAC; independently read SQLite user ID matched to native profile; protected category creation and SQLite owner/content readback; anonymous denial without mutation |
| [Wikiflow](https://github.com/AIALRA-0/Wikiflow) | `c41f5ba323ff3bd931cc7396f13b801272253b77` | Native SQLite schema/user bootstrap; CSRF-assisted native login; independent SHA-1 HMAC validation of the native signed cookie pair and user-ID binding; protected term insertion with SQLite owner/content readback; valid anonymous CSRF token followed by authentication denial; missing/wrong-token denial without mutation |

Both actual MIT licences and source/lock hashes were verified. The public `.source.json` records and exposure checks exclude these sources from fresh qualification data. Their source selection preceded any prediction; there were no model predictions. Earlier source screening and aggregates remain historical records.

BookWise's email-verification state is explicitly seeded through its native model; no email or external account is used, and email-delivery/verification functionality is not assessed. The authentication check observes the native middleware's exact redirect with a same-context, fixed-loopback GET and redirects disabled. Authenticated cases additionally navigate the native JSON response in the browser. This avoids loading the unrelated public landing-page assets. It does not rewrite a denial into success or claim frontend compatibility.

Wikiflow's two cookies are both checked cryptographically, and its payload user ID must match the independent SQLite user. However, their names (`wf_sess` and `wf_sess.sig`) do **not** trigger the current cookie-name heuristic. Raw detection is preserved: no cookie findings are invented, and no names are changed to manufacture training examples. The application contributes a complete contextual framing scenario and uncertain script-policy observations. Missing/incorrect-token checks cover the single tested term route, not every route or genuine cross-site flows; they do not close CK-003 evidence requirements.

## Collector behavior

`scripts/native-expansion-data.mjs` reuses the bounded disposable runner; application-specific bootstrap and native oracles are in `tests/native-next-family-adapters.ts`. Every executed application source file is verified against its pinned Git blob. Upstream committed `node_modules` and `.npm` trees are excluded: dependencies come from the independently pinned `npm ci` installation. Nondependency symlinks, changed source bytes and traversal remain rejected. Temporary copies omit database and environment files, ensuring tests cannot import an upstream data store or environment configuration.

BookWise uses Node 24. Wikiflow's pinned native SQLite/password libraries were installed with Node 20 and run with that ABI; the VYLNT collector still uses Node 24 for its separate read-only SQLite oracle. `VYLNT_NATIVE_NODE20` can specify the Node 20 executable when the default `node` is different. Current Edge result metadata records application and collector runtime versions separately.

The native application/session/source code is unchanged. Default, readable-cookie and own-origin framing response profiles are explicit configuration interventions. Framing retains actual permitted/forbidden/repeated/nested browser controls; the readable profile changes only HttpOnly response attributes. These profiles do not create separate application families.

The seed mapper accepts a bounded, uniquely matched list of cookie controls. Attributes must agree with the sanitized scan; each cookie needs its own established authentication and JavaScript-access outcome. Unknown purpose cannot inherit another cookie's class. Matching names are consumed inside the application and excluded from model features/dataset text. Legacy single-cookie receipts remain readable.

Retained private records contain sanitized scans, signed same-run evidence, public verification keys, numeric seeds and bounded oracle booleans/hashes. Synthetic credentials, cookie/CSRF values, request bodies, user rows, page text and code are not retained in observations/training. Private keys and database contents are removed with the temporary run. Local signing establishes installation provenance, not independent attestation. Source execution is process isolation, not an OS sandbox; the user explicitly approved these applications and dependencies.

## Reproduce locally

In new source-cache folders only:

```powershell
git clone --no-checkout --no-recurse-submodules https://github.com/joesalaz/BookWise.git .local/ml-native-expansion/bookwise
git -C .local/ml-native-expansion/bookwise -c core.hooksPath= -c core.autocrlf=false checkout --detach 547203a025c28d809bc09c8bbd00992b81c032aa
git clone --no-checkout --no-recurse-submodules https://github.com/AIALRA-0/Wikiflow.git .local/ml-native-expansion/wikiflow
git -C .local/ml-native-expansion/wikiflow -c core.hooksPath= -c core.autocrlf=false checkout --detach c41f5ba323ff3bd931cc7396f13b801272253b77
npm --prefix .local/ml-native-expansion/bookwise ci --ignore-scripts --no-audit --no-fund
npm --prefix .local/ml-native-expansion/bookwise rebuild sqlite3 bcrypt --no-audit --no-fund
# Install/rebuild Wikiflow using Node 20, matching its native-module runtime.
npm --prefix .local/ml-native-expansion/wikiflow ci --ignore-scripts --no-audit --no-fund
npm --prefix .local/ml-native-expansion/wikiflow rebuild better-sqlite3 bcrypt --no-audit --no-fund
```

Do not reset an existing user repository. Dependency rebuilds execute third-party native installers; use only these inspected development fixtures. No Docker, external account, production database, certificate trust change or public deployment is required. The existing private family key must remain unchanged.

```powershell
npm run ml:projects:native:expand -- --family bookwise --profile native
npm run ml:projects:native:expand -- --family bookwise --profile readable
npm run ml:projects:native:expand -- --family bookwise --profile framing
npm run ml:projects:native:expand -- --family wikiflow --profile native
npm run ml:projects:native:expand -- --family wikiflow --profile readable
npm run ml:projects:native:expand -- --family wikiflow --profile framing
npm run ml:projects:native:expand -- --family bookwise --cancel
npm run ml:projects:native:expand -- --family wikiflow --cancel
```

For Edge set `$env:VYLNT_TEST_BROWSER='msedge'` and remove that variable afterward. Both Edge framing runs passed. Tests leave sanitized artifacts under ignored `.local/ml-native-observations/<family>/<run>/`; completed acceptance markers are required for aggregation. Failed/cancelled runs have separate metadata-only records and cannot become accepted data.

## Actual results and limits

All six Chromium profiles, both Edge framing profiles, both cancellation checks and both altered-source-before-startup checks passed. Original source bytes were restored after tampering checks. Signature/reload/privacy/altered-evidence rejection and cleanup passed. Existing FieldPoint acquisition also passed after the shared collector extension. No owned application process or temporary run remained in the final inspection.

87 focused tests/seven files, type checking, production builds and whitespace checks passed. Holdout-command tests use disposable synthetic fixtures; they are not real model training/evaluation. Existing Ed25519, Zod/Rollup and third-party native dependency warnings remain. Full UI, PDF pagination, broader performance and hosted migration-006 acceptance were not rerun.

New immutable aggregate `.local/project-native-seeds-007/`:

| Category | Complete change scenarios | Complete contextual scenarios | Unique change/contextual numeric variants | Uncertain inputs |
|---|---:|---:|---:|---:|
| HDR-001 | 0 | 0 | 0 / 0 | 0 |
| HDR-002 | 0 | 5 | 0 / 3 | 7 |
| HDR-003 | 1 | 1 | 1 / 1 | 16 |
| CK-001 | 4 | 0 | 6 / 0 | 1 |
| CK-002 | 4 | 0 | 2 / 0 | 0 |
| CK-003 | 0 | 0 | 0 / 0 | 0 |
| NET-001 | 0 | 0 | 0 / 0 | 0 |

There are **33 accepted batches, six source families and 54 removed repetitions**. Scenario groups and unique numeric variants are deliberately different counts. More native authentication implementations did not create additional unique cookie inputs in this aggregate. The registered eight-training/four-validation cohort and original 30/15 per-class/category distinct-example thresholds are still unmet. Candidate preflight returns blocked; **0/7 new datasets are training-ready and no seven-category model was fitted**.

Next work needs additional suitable families and materially different evidence: native preferences/JavaScript necessity, sufficient positive/contextual framing/script cases, validated native HTTPS/HSTS, real cross-site protection and verified resource upgrades/dependency behavior. Five screened applications remain unexecuted; the excluded Electron application cannot count toward the cohort. Then complete registered preparation, fitting, untouched holdout evaluation and qualified runtime/report acceptance. JS-002 remains the only qualified category within its recorded scope.

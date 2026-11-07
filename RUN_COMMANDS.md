# VYLNT run commands

## Approved ML-Q material counting · developer workflow

With `VYLNT_NATIVE_REGISTRATION` set from a fresh native registration,
run the hash-based response policy profiles with disposable local data:

```powershell
node scripts/native-expansion-data.mjs --family bookwise --profile script-hashed-response
node scripts/native-tabinator-acceptance.mjs --seeds --editor-profile=script-hashed-response
node scripts/native-jingo-script-data.mjs --profile hashed-response
```

Use `script-eval-response` in the first two commands or `eval-response`
in the Jingo command to run the paired `unsafe-eval` checks.

With `VYLNT_NATIVE_REGISTRATION` set from a fresh native registration, the
duplicate framing-denial profile can be run against the native APIs:

```powershell
node scripts/native-expansion-data.mjs --family portal --profile framing-duplicate-deny
node scripts/native-tabinator-acceptance.mjs --seeds --framing-duplicate-deny
node scripts/native-jingo-script-data.mjs --profile framing-duplicate-deny
```

The same native registration can be used for the broad ancestor
write profile. Each application uses its own disposable storage.

```powershell
node scripts/native-expansion-data.mjs --family bookwise --profile framed-write-broad
node scripts/native-tabinator-acceptance.mjs --seeds --editor-profile=framed-write-broad
node scripts/native-jingo-script-data.mjs --profile framed-write-broad
```

For the FieldPoint overbroad-origin cases, set `VYLNT_NATIVE_REGISTRATION`
from a fresh native registration and run the four cookie profiles:

```powershell
foreach ($life in @('transient', 'persistent')) {
  foreach ($access in @('httponly', 'readable')) {
    node scripts/native-expansion-data.mjs --family fieldpoint --profile "overbroad-session-none-$life-secure-$access"
    if ($LASTEXITCODE) { throw 'FieldPoint case failed' }
  }
}
```

The latest preparation is `.local/ml-q-material-datasets-056`. It credits
326/630 development cases. No remaining category is ready for fitting or
qualified. These commands are developer data tools; extension users do not
prepare datasets or run training commands.

Inspect the measured result:

```powershell
npm run ml:projects:candidate -- preflight --prepared .local/ml-q-material-datasets-056
```

Preflight exits 2 while the required class counts or contributing families are
missing. Registering or fitting a candidate cannot override that result.

Replay the current signed development cohort into a new output folder:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-59 --output .local/replayed-current-datasets
```

For registered native framing collection, set `VYLNT_NATIVE_REGISTRATION`
from a fresh registration before running the following. Habit Tracker
builds the native client in the disposable copy and requires the pinned
Windows Vite build dependency, including its matching Rolldown binding.

```powershell
node scripts/native-expansion-data.mjs --family fieldpoint --profile framed-write
node scripts/native-expansion-data.mjs --family habit-tracker --profile framed-write
node scripts/native-jingo-script-data.mjs --profile framed-write
node scripts/native-jingo-script-data.mjs --profile framing-policy
```

For a new registered script-policy collection, use
`script-missing`, `script-broad-response`, `script-broad-meta`,
`script-early-meta` or `script-layered-meta` with the supported
FieldPoint, 8star Links, BookWise and Yoyo Collection adapters. The
layered scenario is also available as shown below. Set
`VYLNT_NATIVE_REGISTRATION` from a fresh registration before collecting.

```powershell
node scripts/native-expansion-data.mjs --family fieldpoint --profile script-layered-meta
node scripts/native-tabinator-acceptance.mjs --seeds --editor-profile=script-layered-meta
node scripts/native-jingo-script-data.mjs --profile layered-meta
```

To reproduce the FieldPoint contextual SameSite supplement using the
existing local signed captures:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-21 --output .local/replayed-protected-samesite
```

To collect a new development observation, register a fresh output and
set its `registrationHash` as `VYLNT_NATIVE_REGISTRATION` for the current
terminal before running the pinned FieldPoint profile. It uses disposable
accounts, Chromium and loopback. A repeat of the same scenario earns no
additional credit.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-samesite-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-samesite-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
node scripts/native-expansion-data.mjs --family fieldpoint --profile cross-site-protected
Remove-Item Env:VYLNT_NATIVE_REGISTRATION
```

The registered FieldPoint matrix also accepts the four
`protected-session-none-<transient|persistent>-secure-<httponly|readable>`
profiles. The Yoyo Collection photo-upload matrix accepts
`session-none-<transient|persistent>-secure-<httponly|readable>` through
the same native expansion command with `--family yoyo-collection`.
Each run uses disposable data and records the browser's actual cookie attributes.

Tabinator's native JSON bookmark operation accepts the same four
`session-none-*` configurations. Its controlled development server reflects
request origins, and Chromium must complete the native preflight before
the bookmark write can count. Register before collecting each new supplement.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-tabinator-samesite-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-tabinator-samesite-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
foreach ($lifetime in @('transient', 'persistent')) {
    foreach ($access in @('httponly', 'readable')) {
        node scripts/native-tabinator-acceptance.mjs --seeds "--session-profile=session-none-$lifetime-secure-$access"
        if ($LASTEXITCODE) { throw 'Tabinator capture failed' }
    }
}
Remove-Item Env:VYLNT_NATIVE_REGISTRATION
```

Habit Tracker uses the same four variants to test native session revocation.
Use a separate registration for these signed training captures.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-habit-logout-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-habit-logout-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
foreach ($lifetime in @('transient', 'persistent')) {
    foreach ($access in @('httponly', 'readable')) {
        node scripts/native-expansion-data.mjs --family habit-tracker --profile "session-none-$lifetime-secure-$access"
        if ($LASTEXITCODE) { throw 'Habit Tracker capture failed' }
    }
}
Remove-Item Env:VYLNT_NATIVE_REGISTRATION
```

HomeInventory's native house creation uses the staged app and its pinned
Node runtime. Register against the current material cohort to keep the
existing HomeInventory training slot. Use a fresh output folder each time.

```powershell
node scripts/ml-native-development.mjs register --material-parent .local/native-material-registration-34 --output .local/my-homeinventory-samesite-registration
$preferenceNode = Join-Path (Get-Location) '.local/native-node-24.11.1/node-v24.11.1-win-x64/node.exe'
foreach ($lifetime in @('transient', 'persistent')) {
    foreach ($access in @('httponly', 'readable')) {
        & $preferenceNode scripts/native-preference-data.mjs --seeds --registration .local/my-homeinventory-samesite-registration --samesite-profile "session-none-$lifetime-secure-$access"
        if ($LASTEXITCODE) { throw 'HomeInventory capture failed' }
    }
}
```

For additional Etherpad preference evidence, reuse the verified staging
directory and pinned pnpm 12.4.2. This supplements the existing validation
family and keeps all split assignments.

```powershell
node scripts/ml-native-development.mjs register --family etherpad --material-parent .local/native-material-registration-35 --output .local/my-etherpad-cookie-registration
$node24 = Join-Path (Get-Location) '.local/native-node-24.11.1/node-v24.11.1-win-x64/node.exe'
$etherpadPnpm = Join-Path (Get-Location) '.local/etherpad-pnpm-12.4.2/package/pnpm.exe'
foreach ($profile in @('lax-transient', 'strict-transient', 'strict-persistent')) {
    & $node24 scripts/native-etherpad-data.mjs .local/etherpad-development-01 $etherpadPnpm --registered .local/my-etherpad-cookie-registration "--cookie-profile=$profile"
    if ($LASTEXITCODE) { throw 'Etherpad capture failed' }
}
```

For contextual Secure and HttpOnly evidence from HomeInventory's
language preference, use the staged language-alias build and register
the existing training family against its signed parent cohort.

```powershell
node scripts/ml-native-development.mjs register --family homeinventory --material-parent .local/native-material-registration-37 --output .local/my-homeinventory-language-registration
$preferenceNode = Join-Path (Get-Location) '.local/native-node-24.11.1/node-v24.11.1-win-x64/node.exe'
foreach ($profile in @('lax-transient', 'strict-transient')) {
    & $preferenceNode scripts/native-preference-data.mjs --readable-cookie --misleading-name --seeds --registration .local/my-homeinventory-language-registration --preference-profile $profile
    if ($LASTEXITCODE) { throw 'HomeInventory language capture failed' }
}
```

For the contextual HttpOnly supplement, use the same staged builds and
the same family assignments. The Secure attribute is verified in Chromium
on loopback. Both collectors check that the native preference needs
JavaScript access, and the shared rules must emit only the targeted
HttpOnly finding for the preference cookie.

```powershell
$parent = '.local/native-material-registration-52'
node scripts/ml-native-development.mjs register --family homeinventory --material-parent $parent --output .local/my-secure-language-registration
node scripts/ml-native-development.mjs register --family etherpad --material-parent $parent --output .local/my-secure-editor-registration
$node24 = (Resolve-Path '.local/native-node-24.11.1/node-v24.11.1-win-x64/node.exe').Path
$etherpadPnpm = (Resolve-Path '.local/etherpad-pnpm-12.4.2/package/pnpm.exe').Path
foreach ($profile in @('lax-transient-secure', 'strict-transient-secure', 'lax-persistent-secure', 'strict-persistent-secure')) {
    & $node24 scripts/native-preference-data.mjs --readable-cookie --misleading-name --seeds --registration .local/my-secure-language-registration --preference-profile $profile
    if ($LASTEXITCODE) { throw 'HomeInventory capture failed' }
    & $node24 scripts/native-etherpad-data.mjs .local/etherpad-development-01 $etherpadPnpm --registered .local/my-secure-editor-registration "--cookie-profile=$profile"
    if ($LASTEXITCODE) { throw 'Etherpad capture failed' }
}
node scripts/ml-material-development.mjs extend --registration $parent --supplementRegistration .local/my-secure-language-registration --output .local/my-language-cohort
node scripts/ml-material-development.mjs extend --registration .local/my-language-cohort --supplementRegistration .local/my-secure-editor-registration --output .local/my-editor-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-editor-cohort --output .local/my-cookie-datasets
```

To reproduce the approved recount, retain the original installation family key,
strict dataset, source registration and all 45 authenticated native captures.
Use new output folders. Registration fixes the counting policy, projection code,
capture hashes and original source roles before preparation. It does not rerun
applications, change labels or evaluate a model.

```powershell
node scripts/ml-material-development.mjs register --archive .local/ml-q-seven-datasets-004 --sourceRegistration .local/native-dev-registration-05 --output .local/my-material-registration
node scripts/ml-material-development.mjs prepare --registration .local/my-material-registration --output .local/my-material-datasets
npm run ml:projects:candidate -- preflight --prepared .local/my-material-datasets
```

Preparation also exits 2 when it writes an incomplete corpus. Existing outputs
are never overwritten. The historical strict preflight remains available:

```powershell
npm run ml:projects:candidate -- preflight --prepared .local/ml-q-seven-datasets-004
```

The historical strict protocol credits 18. The initial material recount
credits 38, the preference cohort credits 42, the Yoyo supplement credits 47,
and the native session matrix credits 110. The Jingo supplement fills two
validation family requirements at the same 110-credit total. Wikiflow, Jingo
and BookWise bring the total to 129. The Tabinator editor supplement credits 134.
Etherpad's two contextual validation cases and StockBase's retired framing
case bring that cohort to 135. Jingo's native HTTPS upgrade adds one
contextual NET-001 validation case. BookWise and Yoyo add eight further
transport cases to reach 144. Six authenticated API HSTS cases and five
wire-verified missing-header cases bring the current total to 155.
The material protocol still needs fresh-holdout and qualified-release integration.
Do not pass its preparation to the legacy strict evaluator. See
[measured datasets](docs/ML_REGISTERED_DATASETS.md) and
[the approved correction](docs/ML_COUNTING_CORRECTION_PROPOSAL.md).

## Native session-cookie matrix · developer workflow

Use the existing pinned caches and locked dependencies for BookWise, FieldPoint,
Habit Tracker, Yoyo Collection and Tabinator. Register before collecting. The
runner uses Chromium and fresh disposable app data. Use new private output
directories. A checkpoint is written for each attempt and a summary is written
on completion. A failed attempt can be rerun with `--family` and `--profile`
using the same registration if the producer and sources are unchanged.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-cookie-registration
node scripts/native-cookie-matrix.mjs --registration .local/my-cookie-registration --output .local/my-cookie-matrix
node scripts/ml-material-development.mjs extend --registration .local/native-material-registration-07 --supplementRegistration .local/my-cookie-registration --output .local/my-cookie-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-cookie-cohort --output .local/my-cookie-datasets
npm run ml:projects:candidate -- preflight --prepared .local/my-cookie-datasets
```

Adoption considers signed captures that actually passed. Preparation applies the
existing material deduplication and candidate checks, so the number of credits
can differ from the number of passing runs. These profiles exercise change
cases for CK-001 and CK-002. They do not establish contextual cookie purpose,
cross-site compatibility or HTTPS validity.

The latest frozen cohort preserves two signed captures from native registration
`08` and all 60 from native registration `09`. To reproduce the frozen result:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-09 --output .local/reproduced-cookie-datasets
```

## Jingo cookie validation · developer workflow

Use the verified Jingo source and installed lock from the existing native
collection. These four profiles exercise the signed login session and a
protected update in a disposable Git-backed wiki. Register before collecting.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-jingo-cookie-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-jingo-cookie-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
try {
  node scripts/native-jingo-script-data.mjs --session session-lax-transient-insecure-readable --session session-lax-persistent-insecure-httponly --session session-strict-persistent-secure-readable --session session-strict-transient-insecure-readable
  if ($LASTEXITCODE -ne 0) { throw 'Jingo cookie collection failed' }
} finally {
  Remove-Item Env:VYLNT_NATIVE_REGISTRATION
}
node scripts/ml-material-development.mjs extend --registration .local/native-material-registration-09 --supplementRegistration .local/my-jingo-cookie-registration --output .local/my-jingo-cookie-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-jingo-cookie-cohort --output .local/my-jingo-cookie-datasets
```

Jingo stays in the validation partition. These cases exercise missing Secure
and HttpOnly attributes. They do not establish a preference-cookie flow or
complete route coverage.

To reproduce the earlier frozen Jingo cohort in a new directory:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-10 --output .local/reproduced-jingo-cookie-datasets
```

For the Wikiflow training and Jingo SameSite acquisition, register a new
producer first. Wikiflow uses the installed Node 20 dependencies with the
existing Node 24 collection launcher. Both apps use their pinned native
storage and disposable loopback accounts.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-native-cookie-expansion
node scripts/native-cookie-matrix.mjs --registration .local/my-native-cookie-expansion --output .local/my-wikiflow-matrix --family wikiflow
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-native-cookie-expansion/registration.json -Raw | ConvertFrom-Json).registrationHash
try {
  node scripts/native-jingo-script-data.mjs --session session-none-transient-secure-httponly --session session-none-transient-secure-readable --session session-none-persistent-secure-httponly --session session-none-persistent-secure-readable
  if ($LASTEXITCODE -ne 0) { throw 'Jingo SameSite acquisition failed' }
} finally {
  Remove-Item Env:VYLNT_NATIVE_REGISTRATION
}
node scripts/ml-material-development.mjs extend --registration .local/native-material-registration-10 --supplementRegistration .local/my-native-cookie-expansion --output .local/my-expanded-cookie-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-expanded-cookie-cohort --output .local/my-expanded-cookie-datasets
```

The Wikiflow profile binds a controlled cookie name to a copied initializer
while keeping its native signature, account binding, CSRF middleware and
protected SQLite write. Cookie names do not become model inputs. The Jingo
SameSite profile requires repeated cross-site success with Git readback and
an unchanged anonymous control. Its evidence applies to the exercised form.

The same four SameSite variants are supported for BookWise category creation.
Use a fresh registration for the BookWise producer and the material cohort
from the previous block as the parent. The BookWise collector verifies
owner-specific SQLite rows and unchanged anonymous state.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-bookwise-site-registration
node scripts/native-cookie-matrix.mjs --registration .local/my-bookwise-site-registration --output .local/my-bookwise-site-matrix --family bookwise --profile session-none-transient-secure-httponly --profile session-none-transient-secure-readable --profile session-none-persistent-secure-httponly --profile session-none-persistent-secure-readable
node scripts/ml-material-development.mjs extend --registration .local/my-expanded-cookie-cohort --supplementRegistration .local/my-bookwise-site-registration --output .local/my-bookwise-site-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-bookwise-site-cohort --output .local/my-bookwise-site-datasets
```

Reproduce the earlier cookie expansion using its original capture manifest:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-12 --output .local/reproduced-native-cookie-expansion
```

## Etherpad preference source · developer preparation

Use the screened no-checkout mirror at `.local/ml-native-screening-etherpad-v3.3.15`.
Stage a new directory from its exact Git objects. Use Node 24 and pnpm 12.4.2
for the native application. Set `$etherpadPnpm` to the absolute path of the
verified pnpm executable inside `.local` and `$node24` to the Node 24 executable.

```powershell
node scripts/native-etherpad-stage.mjs --output .local/etherpad-development-01
Push-Location .local/etherpad-development-01
try {
  & $etherpadPnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile --store-dir ../etherpad-pnpm-store --config.manage-package-manager-versions=false
  if ($LASTEXITCODE -ne 0) { throw 'Etherpad dependency preparation failed' }
} finally {
  Pop-Location
}
node scripts/native-etherpad-stage.mjs --verify --output .local/etherpad-development-01
& $node24 scripts/native-etherpad-smoke.mjs .local/etherpad-development-01 $etherpadPnpm
& $node24 scripts/native-etherpad-smoke.mjs .local/etherpad-development-01 $etherpadPnpm --preference
```

The startup check is a developer authorization control. It uses a disposable
database and an ephemeral loopback listener. The optional Chromium probe
requires the real pad editor to initialize and checks the saved line-number
preference across independent browser contexts. Cohort admission uses separate
registered collection and provenance checks. The successful probe writes
`test-results/native-projects/etherpad-preference-prototype.json` after cleanup.

For Etherpad HSTS, prepare the same pinned source and frozen pnpm lock on
Ubuntu. The Linux helper expects the pinned pnpm executable under
`.local/etherpad-linux-pnpm-12.4.2/package/pnpm`. Register against the
active material cohort before running the browser profiles.

```powershell
node scripts/ml-native-development.mjs register --family etherpad --hsts --material-parent .local/native-material-registration-59 --output .local/my-etherpad-hsts-registration
```

```sh
runtime=$(mktemp -d /tmp/vylnt-etherpad-runtime.XXXXXXXX)
cp -a -- .local/etherpad-development-linux-01 "$runtime/application"
sh scripts/ml-resource-upgrade-linux.sh --native-etherpad "$runtime/application" .local/my-etherpad-hsts-registration
```

The runner rechecks pinned source bytes in the Linux-local copy. It uses
disposable API credentials and pad data, verifies the native write with
an independent database read, then collects the protected pad response
under strict browser TLS.

To reproduce signed acquisition, register the validation replacement before
launching Etherpad. These example output names must be new:

```powershell
node scripts/ml-material-development.mjs register-etherpad --registration .local/native-material-registration-13 --output .local/my-etherpad-registration
& $node24 scripts/native-etherpad-data.mjs .local/etherpad-development-01 $etherpadPnpm --registered .local/my-etherpad-registration
node scripts/ml-material-development.mjs extend --registration .local/native-material-registration-13 --supplementRegistration .local/my-etherpad-registration --output .local/my-etherpad-material-registration
node scripts/ml-material-development.mjs prepare --registration .local/my-etherpad-material-registration --output .local/my-etherpad-datasets
npm run ml:projects:candidate -- preflight --prepared .local/my-etherpad-datasets
```

Signed acquisition writes a private capture after cleanup and checks its
signature again after reload. The eight training and four validation roles
are preserved. StockBase's captures stay in the earlier archive. Repeating
the same editor controls does not produce additional material credits.

## Tabinator bookmark editor · developer workflow

Use the previously prepared pinned Tabinator source and locked dependencies.
The disposable editor uses local cosmetic assets. The controlled run checks
the native bookmark interaction and storage without contacting the upstream app.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-tabinator-editor-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-tabinator-editor-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
try {
  foreach ($editorProfile in 'script-missing','script-early-meta','script-broad-response','script-broad-meta','framed-write') {
    node scripts/native-tabinator-acceptance.mjs --seeds "--editor-profile=$editorProfile"
    if ($LASTEXITCODE -ne 0) { throw "Tabinator editor profile failed $editorProfile" }
  }
} finally {
  Remove-Item Env:VYLNT_NATIVE_REGISTRATION
}
node scripts/ml-material-development.mjs extend --registration .local/native-material-registration-12 --supplementRegistration .local/my-tabinator-editor-registration --output .local/my-tabinator-editor-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-tabinator-editor-cohort --output .local/my-tabinator-editor-datasets
```

Reproduce the current frozen cohort in a new directory:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-13 --output .local/reproduced-tabinator-editor-datasets
```

## Supplemental Yoyo validation collection · developer workflow

Register a new native acquisition before running the pinned local editor.
Use the existing verified source caches and locked dependencies. Each run
uses an isolated disposable database. The profile loop requires Chromium.

```powershell
node scripts/ml-native-development.mjs register --output .local/my-yoyo-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-yoyo-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
try {
  foreach ($yoyoProfile in @('framed-write','script-missing','script-early-meta','script-broad-response','script-broad-meta')) {
    node scripts/native-expansion-data.mjs --family yoyo-collection --profile $yoyoProfile
    if ($LASTEXITCODE -ne 0) { throw "Yoyo profile failed: $yoyoProfile" }
  }
} finally {
  Remove-Item Env:VYLNT_NATIVE_REGISTRATION
}
node scripts/ml-material-development.mjs extend --registration .local/native-material-registration-06 --supplementRegistration .local/my-yoyo-registration --output .local/my-yoyo-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-yoyo-cohort --output .local/my-yoyo-datasets
```

`extend` authenticates the prospective source registration and keeps the base
cohort's family identities and split roles. It rejects duplicate adoption.
The measured dataset uses native registration `07` and material registration
`07`. To reproduce the exact frozen capture manifest into a new directory:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-07 --output .local/reproduced-yoyo-datasets
```

## Native preference experiment · developer workflow

This developer experiment tests a pinned HomeInventory application. It now has
registered signed contextual cookie cases. Ordinary extension scanning requires no
preference setup. The source revision and controlled interventions are described
in [the preference protocol](docs/ML_NATIVE_PREFERENCE_PLAN.md).

With the pinned source at `.local/ml-native-expansion/homeinventory`, stage it
once. The staging command verifies all Git blobs and refuses an existing output.

```powershell
node scripts/native-preference-stage.mjs
```

Install the root and client locks in `.local/native-preference-homeinventory`
with installation scripts disabled. The native application requires Node 24 and
its locked SQLite, bcrypt and sharp dependencies. For the tested Windows setup,
the checksum-verified runtime is in
`.local/native-node-24.11.1/node-v24.11.1-win-x64`. SQLite was built with the
installed Microsoft compiler using `node-gyp rebuild --release --clang=0`.
The initial ClangCL builds failed. This procedure requires a suitable existing
compiler toolchain.

After preparing the locked dependencies, build the original client using that
runtime from the staging client's directory. Run the controlled build and tests
from the VYLNT repository root.

```powershell
$preferenceNode = Join-Path (Get-Location) '.local/native-node-24.11.1/node-v24.11.1-win-x64/node.exe'
& $preferenceNode scripts/native-preference-build.mjs
& $preferenceNode scripts/native-preference-data.mjs --readable-cookie
& $preferenceNode scripts/native-preference-data.mjs --readable-cookie --misleading-name
$env:VYLNT_TEST_BROWSER = 'msedge'
try {
  & $preferenceNode scripts/native-preference-data.mjs --readable-cookie --misleading-name
} finally {
  Remove-Item Env:VYLNT_TEST_BROWSER -ErrorAction SilentlyContinue
}
```

The commands above run prototype controls. They start a fresh synthetic account
and disposable database and remove
its temporary app copy afterward. Reports and bounded control outcomes are saved
under `test-results/native-preference/`. The controlled-name scan must reproduce
CK-001 and CK-002. Prototype outputs do not enter training automatically.

To register the current source/harness before new **signed** collection, use a
new folder and keep the original private family key. The registration supports
only the declared matching-name/readable-cookie profile and its native routes.

```powershell
& $preferenceNode scripts/native-preference-registration.mjs --output .local/my-preference-registration
& $preferenceNode scripts/native-preference-data.mjs --readable-cookie --misleading-name --seeds --registration .local/my-preference-registration
```

Use `VYLNT_TEST_BROWSER=msedge` as shown above for an Edge compatibility run.
Signed records are under `.local/ml-native-observations/homeinventory/` with
reload/tampering acceptance. Repeats remain one family. The source writes both
Lax and Strict preferences; only those observed states and the native root/
consent-page scope are supported. High-severity findings remain visible.

The retained current dataset uses preference registration `07` and material
registration `06`. Its manifest was frozen before an additional compatibility
repeat. To reproduce that same manifest into a new output directory:

```powershell
node scripts/ml-material-development.mjs prepare --registration .local/native-material-registration-06 --output .local/reproduced-preference-datasets
```

To freeze a **new development snapshot** using newly registered native runs and
the authenticated earlier development corpus:

```powershell
node scripts/ml-material-development.mjs register --archive .local/ml-q-seven-datasets-004 --sourceRegistration .local/native-dev-registration-05 --preferenceRegistration .local/my-preference-registration --output .local/my-preference-cohort
node scripts/ml-material-development.mjs prepare --registration .local/my-preference-cohort --output .local/my-preference-datasets
npm run ml:projects:candidate -- preflight --prepared .local/my-preference-datasets
```

This explicit cohort replaces Anonymous Notepad's unsupported training slot with
HomeInventory, records exclusions, and preserves the other eleven roles. It
adopts original authenticated numeric inputs without reinterpreting old evidence.
Changing a source, producer or registered extractor fails closed and requires a
new registration. All seven count/family requirements still apply. No model is
trained or qualified by these preparation commands.

## Registered ML-Q datasets · developer workflow

The historical strict-protocol files are under `.local/ml-q-seven-datasets-004`.
For the approved material recount use the section above. Open
`candidate-readiness.json` for measured class counts. These commands are only
for VYLNT development. Scanning a website from the extension requires no
collection commands.

To review the current result from the repository root:

```powershell
npm run ml:projects:candidate -- preflight --prepared .local/ml-q-seven-datasets-004
```

To reproduce the collection, use the twelve pinned source caches and locked dependencies described in [the family setup](docs/ML_NATIVE_TWELVE_FAMILIES.md). Registration also needs the original private family key and retained JS-002 exposure/provenance files. Use new output directories:

```powershell
node scripts/ml-native-development.mjs register --output .local/my-native-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-native-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
try {
  foreach ($family in @('fieldpoint','bookwise','habit-tracker','yoyo-collection','wikiflow')) {
    $profiles = @('native','readable','framing')
    if ($family -ne 'wikiflow') { $profiles += 'cross-site-cookie' }
    if ($family -eq 'bookwise') { $profiles += @('script-missing','script-early-meta','script-broad-response','script-broad-meta','framed-write') }
    foreach ($profile in $profiles) {
      node scripts/native-expansion-data.mjs --family $family --profile $profile
      if ($LASTEXITCODE -ne 0) { throw "Collection failed for $family / $profile" }
    }
  }
  foreach ($family in @('portal','personal-knowledge-manager','stockbase','8star-links','anonymous-notepad')) {
    foreach ($profile in @('native','framing')) {
      node scripts/native-expansion-data.mjs --family $family --profile $profile
      if ($LASTEXITCODE -ne 0) { throw "Collection failed for $family / $profile" }
    }
  }
  node scripts/native-tabinator-acceptance.mjs --seeds
  if ($LASTEXITCODE -ne 0) { throw 'Tabinator baseline failed' }
  node scripts/native-tabinator-acceptance.mjs --readable-cookies --seeds
  if ($LASTEXITCODE -ne 0) { throw 'Tabinator readable cookie failed' }
  node scripts/native-tabinator-acceptance.mjs --framing-policy --seeds
  if ($LASTEXITCODE -ne 0) { throw 'Tabinator framing failed' }
  node scripts/native-jingo-script-data.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Jingo script collection failed' }
} finally { Remove-Item Env:VYLNT_NATIVE_REGISTRATION -ErrorAction SilentlyContinue }
```

For the three HTTPS runs, use a Linux checkout with Node, the locked Jingo dependencies, Playwright Chromium, Mozilla NSS `certutil`, a valid registered localhost leaf and the same private registration. Use a native Linux filesystem for the application and its dependencies. The helper creates and removes its own trust database. Set `PLAYWRIGHT_BROWSERS_PATH` to the Linux Chromium installation if needed. When using a separate working directory, make the completed, authenticated Jingo observation directories available under the same private corpus before preparation.

```sh
export VYLNT_NATIVE_REGISTRATION=$(node -p "require('./.local/my-native-registration/registration.json').registrationHash")
for profile in hsts-disabled hsts-positive http-editor; do
  sh scripts/native-linux-transport.sh "$profile" || exit 1
done
unset VYLNT_NATIVE_REGISTRATION
```

Then build the seven category files and record the candidate check:

```powershell
node scripts/ml-native-development.mjs prepare --registration .local/my-native-registration --output .local/my-seven-datasets
npm run ml:projects:candidate -- preflight --prepared .local/my-seven-datasets --output .local/my-seven-datasets/candidate-readiness.json
```

Preparation and preflight return a nonzero status when the data fall short. Inspect the written audit for the deficits. The seven category files, preparation and readiness receipts use exclusive writes. [Actual counts and remaining evidence](docs/ML_REGISTERED_DATASETS.md)

## Additional native datasets (developer ML-Q work)

The latest expansion reaches **12 collected families**. Exact pins, native controls and limitations are in [ML_NATIVE_TWELVE_FAMILIES.md](docs/ML_NATIVE_TWELVE_FAMILIES.md). With those source caches and locked dependencies installed:

```powershell
foreach ($family in @('portal','personal-knowledge-manager','stockbase','8star-links','anonymous-notepad','habit-tracker')) {
  npm run ml:projects:native:expand -- --family $family --profile native
  if ($LASTEXITCODE -ne 0) { throw 'Native collection failed' }
  npm run ml:projects:native:expand -- --family $family --profile framing
  if ($LASTEXITCODE -ne 0) { throw 'Framing collection failed' }
}
npm run ml:projects:native:expand -- --family habit-tracker --profile readable
# Each of the six families also supports --cancel.
# Run this only after all native collectors have stopped:
node scripts/native-cohort-source-check.mjs
```

Install each fixture with `npm ci --ignore-scripts --no-audit --no-fund` from its cache (Personal Knowledge Manager uses `src/backend`). Use the pinned source only. Native rebuilds execute approved third-party installers; to select Node 24 reliably, invoke npm's JS entry point with that runtime and prepend its directory for child installers:

```powershell
$vylntNode24 = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$vylntNpmCli = Join-Path (Split-Path (Get-Command npm.cmd).Source) 'node_modules/npm/bin/npm-cli.js'
$vylntOriginalPath = $env:Path
try {
  $env:Path = (Split-Path $vylntNode24) + ';' + $env:Path
  & $vylntNode24 $vylntNpmCli --prefix .local/ml-native-expansion/stockbase rebuild better-sqlite3 bcrypt --no-audit --no-fund
  & $vylntNode24 $vylntNpmCli --prefix .local/ml-native-expansion/8star-links rebuild better-sqlite3 sharp --no-audit --no-fund
  & $vylntNode24 $vylntNpmCli --prefix .local/ml-native-expansion/anonymous-notepad rebuild sqlite3 bcrypt --no-audit --no-fund
  & $vylntNode24 $vylntNpmCli --prefix .local/ml-native-expansion/habit-tracker rebuild better-sqlite3 --no-audit --no-fund
} finally { $env:Path = $vylntOriginalPath }
# Personal Knowledge Manager's pinned SQLite binary uses the default Node 20 here:
npm --prefix .local/ml-native-expansion/personal-knowledge-manager/src/backend rebuild better-sqlite3 --no-audit --no-fund
```

Portal needs no native rebuild for the exercised group flow. Upstream engine/deprecation warnings remain. Personal Knowledge Manager and Wikiflow use a Node 20 child (`VYLNT_NATIVE_NODE20` if needed); other new applications and all collectors use Node 24. Notepad's framing result intentionally remains Needs review. Twelve source families do not establish an eligible training corpus.

These are development collectors, separate from starting the dashboard or using the extension. FieldPoint, Yoyo Collection, BookWise and Wikiflow use disposable SQLite data and synthetic logins. Third-party source/dependencies execute as your OS user; this is not an OS sandbox. Run only the exact inspected revisions, with the existing private family key. Initial source setup is described in `docs/ML_NATIVE_EXPANSION.md` and `docs/ML_NATIVE_BOOKWISE_WIKIFLOW.md`; pinned caches belong under `.local/ml-native-expansion/<family>`, with their own locked dependencies installed. BookWise needs the SQLite3/bcrypt rebuild; Wikiflow needs better-sqlite3/bcrypt installed and rebuilt using Node 20, matching its native runtime. Exact commands and revisions are in the latter document.

```powershell
python -B scripts/native-expansion-inventory.py
npm run ml:projects:native:expand -- --family fieldpoint --profile native
npm run ml:projects:native:expand -- --family fieldpoint --profile readable
npm run ml:projects:native:expand -- --family fieldpoint --profile framing
npm run ml:projects:native:expand -- --family yoyo-collection --profile native
npm run ml:projects:native:expand -- --family yoyo-collection --profile readable
npm run ml:projects:native:expand -- --family yoyo-collection --profile framing
npm run ml:projects:native:expand -- --family bookwise --profile native
npm run ml:projects:native:expand -- --family bookwise --profile readable
npm run ml:projects:native:expand -- --family bookwise --profile framing
npm run ml:projects:native:expand -- --family wikiflow --profile native
npm run ml:projects:native:expand -- --family wikiflow --profile readable
npm run ml:projects:native:expand -- --family wikiflow --profile framing
npm run ml:projects:native:expand -- --family fieldpoint --cancel
npm run ml:projects:native:expand -- --family yoyo-collection --cancel
npm run ml:projects:native:expand -- --family bookwise --cancel
npm run ml:projects:native:expand -- --family wikiflow --cancel
```

The inventory command verifies both selection locks (twelve source mirrors, including two exclusions) and checks exact native implementation overlaps; the individual collector only needs its own mirror. Jingo/Tabinator are separate earlier sources. The collector selects bundled Node 24, or `VYLNT_NODE`. Wikiflow and Personal Knowledge Manager use Node 20; set `VYLNT_NATIVE_NODE20` to that executable if the default `node` differs. To use Edge, set `$env:VYLNT_TEST_BROWSER='msedge'`, run a collector, then `Remove-Item Env:VYLNT_TEST_BROWSER`. Default profiles keep native attributes; readable/framing are explicit response interventions, never extra application families. No command changes certificate trust.

Latest immutable aggregate: `.local/project-native-seeds-009` (twelve families, 52 completed batches, 67 repeated inputs discarded). Assemble subsequent completed runs into a **new** directory:

```powershell
npm run ml:projects:seeds -- --output .local/project-native-seeds-010
npm run ml:projects:candidate -- preflight --prepared .local/project-native-seeds-010
```

Both commands deliberately report blocked training (exit 2) while corpus requirements remain unmet. Existing aggregates are not overwritten. **0/7 datasets are training-ready**; the files are development evidence, not a fitted model. `--collect` now orchestrates all twelve supported native families; all their source/dependency installations are required. Individual new family/profile commands were executed; the combined recollection command was not rerun as one invocation.

## Native Tabinator evidence (developer ML-Q checks)

This is separate from project startup. Requires Git, npm, Chromium and Node 24; the runner automatically uses the bundled Node 24 or `VYLNT_NODE`. Fetch the inspected pinned source once, without Docker or real credentials:

```powershell
git init .local/ml-native-tabinator
git -C .local/ml-native-tabinator config --local core.autocrlf false
git -C .local/ml-native-tabinator -c core.hooksPath= fetch --depth 1 --no-tags --recurse-submodules=no https://github.com/lennysh/tabinator.git 51e7cffa382da3d7c710cbfc0d136868c94eb119
git -C .local/ml-native-tabinator -c core.hooksPath= -c core.autocrlf=false checkout --detach FETCH_HEAD
npm --prefix .local/ml-native-tabinator ci --ignore-scripts --omit=dev --no-audit --no-fund
npm --prefix .local/ml-native-tabinator rebuild bcrypt sqlite3 --no-audit --no-fund
npm run test:projects:native:tabinator
npm run test:projects:native:tabinator:cookie-access
npm run test:projects:native:tabinator:framing
npm run test:projects:native:tabinator:cancel
```

For installed Edge, set `$env:VYLNT_TEST_BROWSER = 'msedge'`, run the native checks, then `Remove-Item Env:VYLNT_TEST_BROWSER`. The source must retain the exact pinned licence/lock/tracked bytes. Synthetic accounts, SQLite data and servers are disposable. Sanitized signed prototype observations are retained under ignored `.local/ml-native-observations/tabinator/`; aggregate checks are under `test-results/native-projects/`. The framing command includes `--seeds` and writes separate development labels; default/readable commands need that flag explicitly. No model fitting or qualification result is produced. See `docs/ML_NATIVE_TABINATOR.md` for scope and remaining work.

## Fresh-commit security gate (M4)

After building VYLNT and installing Chromium:

```powershell
npm.cmd run gate
npm.cmd run gate:install-hook
```

`gate` checks committed HEAD. After installing the hook, ordinary branch pushes automatically check every distinct outgoing tip. High/critical findings at high confidence block; other findings warn. Commit fixes before retrying. Remove this installation with `npm.cmd run gate:uninstall-hook`. Existing hooks are preserved. GitHub required checks are still needed because local hooks can be bypassed. Run `npm.cmd run test:gate` for an isolated failed/fixed push demo; it does not modify the real remote. See [M4 instructions](docs/M4_SECURITY_GATE.md) for configuration, artifact paths and limits. No dashboard/API/blockchain needs to be running for the gate.

Open two PowerShell terminals. These steps use the existing configured project; adjust the folder path for another checkout.

## Terminal 1 — start the blockchain

```powershell
cd C:\Users\yaqoo\Desktop\Vylnt
npm.cmd run chain:node
```

Wait for the node to listen on `127.0.0.1:8545`. Keep this terminal running.

## Terminal 2 — build, deploy and start the dashboard/API

```powershell
cd C:\Users\yaqoo\Desktop\Vylnt
npm.cmd run build
npm.cmd run chain:compile
npm.cmd run chain:deploy
npm.cmd run dev
```

Keep this terminal running too. The API serves the dashboard; no separate dashboard server is needed.

## Open the project

- [Dashboard](http://127.0.0.1:4318)
- [Separate blockchain demo ledger](http://127.0.0.1:4318/ledger.html)

Sign in with your configured Supabase account. ML analysis runs automatically in the dashboard; no separate Python service is needed. Use **Verify report** to upload JSON for integrity checks.

## Extension in Edge

Open `edge://extensions` and click **Reload** on VYLNT after a build.

If it is not installed, enable Developer mode, choose **Load unpacked**, and select:

```text
C:\Users\yaqoo\Desktop\Vylnt\dist\extension
```

Open the extension side panel, connect to the workspace and enable access for the sites you intend to scan.

## Configuration and first installation

The existing checkout is configured for Supabase and local blockchain anchoring. Preserve its private `.env`. The relevant non-secret settings are:

```dotenv
VYLNT_STORAGE=supabase
HOST=127.0.0.1
PORT=4318
VYLNT_BLOCKCHAIN=local
```

Dependencies are already installed on the existing machine. On a fresh checkout, use Node 24 and install the locked dependencies/browser before the startup steps:

```powershell
npm.cmd ci --include=optional
npm.cmd run setup:browser
```

The fresh checkout also needs its own private environment configuration; see [API setup](docs/API.md). The installed Chromium supports server-generated PDFs and automated scanning; it is separate from the Edge extension. Do not run installation commands on every startup.

Hardhat needs Node 24. On this machine, blockchain scripts automatically select the available bundled Node 24 runtime. On another machine, use Node 24 or set `VYLNT_NODE` to its executable.

## Restart and stop

- Press **Ctrl+C** in both running terminals to stop the project. Close or refresh any dashboard tab that still displays the previously loaded page.
- If only the API stops, keep the blockchain running and restart `npm.cmd run dev`. Rebuild first if project source changed. Reuse the existing contract deployment.
- If the blockchain node stops/restarts, its previous chain history is lost. Start it again, compile/deploy the contract and restart the API. Re-save desired insights reports to anchor them on the new instance; old proofs cannot verify against the new deployment.
- Keep the node running throughout the demo, from report generation through verification.

No Docker, browser wallet or public blockchain is needed. More details: [ledger demo](docs/BLOCKCHAIN_LEDGER.md) and [report verification](docs/REPORT_VERIFICATION.md).

## Developer-only ML validation

ML-Q1's fresh JS-002 holdout passed; [measured scope and results](ml/evaluations/fresh-holdout-js002-2026-10-26.md). The seven other categories remain unqualified. The historical validation commands below inspect older candidates and retain their original failures.

For the new category-balanced candidate, collection/extension, frozen registration, training and parity commands are in [ML category candidate](docs/ML_CATEGORY_CANDIDATE.md#developer-commands). They are developer experiments; they do not change the dashboard's active model. Qualification still requires a fresh adequate holdout.

The dashboard already runs inference automatically. These are offline validation commands, not application startup requirements:

```powershell
npm.cmd run test:ml
npm.cmd run ml:validate -- --dataset .local/ml-expansion/cohort-2026-10-22/dataset.json --candidate .local/ml-expansion/cohort-2026-10-22/candidate-v1 --reproduce --output .local/ml-validation-new-run
```

Use a new output directory each time. The dataset/candidate paths refer to this development machine's existing private corpus; they are not shipped to users. Exit `1` with `qualification-blocked` means the audit ran successfully but the model still fails quality gates. Exit `2` is an invalid-input/execution failure. No model is automatically promoted. See [ML validation](docs/ML_VALIDATION.md).

### Fresh holdout and controlled category release

These are developer commands, not dashboard startup steps. The 2026-10-26 holdout has already been consumed exactly once. **Do not rerun its evaluation, delete consumption markers, or use a new folder to obtain another score.** Future qualification requires a separately registered experiment and untouched data. The following shows the protocol; paths are private local examples, not shipped datasets.

```powershell
npm.cmd run setup:browser
npm.cmd run lab:tls
npm.cmd run ml:holdout -- registry --root .local --output .local/ml-q1/exposure-NEW.json
npm.cmd run ml:applications:fetch -- --source-lock ml/applications/fresh-holdout.sources.lock.json
npm.cmd run ml:holdout:collect -- --source-lock ml/applications/fresh-holdout.sources.lock.json --output .local/ml-q1/collection-NEW
```

Before collection, developers pin independent MIT sources and record repository IDs, fork/template checks, licences and exclusions in a private source audit. Preparation requires that audit and the original family key; missing/failed scenarios or changed source/oracle files cannot qualify.

```powershell
$holdoutRuns = (Get-Content .local/ml-q1/collection-NEW/collection.json | ConvertFrom-Json).runs -join ','
npm.cmd run ml:holdout:prepare -- --source-lock ml/applications/fresh-holdout.sources.lock.json --runs $holdoutRuns --exposure .local/ml-q1/exposure-NEW.json --history-manifest .local/ml-category/cohort-2026-10-26/manifest.json --history-dataset .local/ml-category/cohort-2026-10-26/dataset.json --source-audit .local/ml-q1/source-audit.json --output .local/ml-q1/frozen-NEW
npm.cmd run ml:holdout -- preflight --dataset .local/ml-q1/frozen-NEW/dataset.json --exposure .local/ml-q1/exposure-NEW.json --output .local/ml-q1/preflight-NEW.json
```

Preflight reports exact freshness/count/conflict deficits without prediction. Once eligible, registration and evaluation take the same bound inputs. Example argument array for a **new, unconsumed** experiment:

```powershell
$holdoutArgs = @('--dataset','.local/ml-q1/frozen-NEW/dataset.json','--exposure','.local/ml-q1/exposure-NEW.json','--candidate','<new-frozen-candidate-directory>','--source-lock','<new-pinned-source-lock>','--provenance','.local/ml-q1/frozen-NEW/provenance.json','--output','.local/ml-q1/evaluation-NEW')
npm.cmd run ml:holdout -- register @holdoutArgs
npm.cmd run ml:holdout -- evaluate @holdoutArgs
```

An eligible evaluation writes exclusive candidate and dataset consumption records **before** inference. Failures/interruption remain recorded. Exit 1 means blocked qualification, not permission to retest. No fitting or threshold search occurs here.

For the completed passing experiment, release packaging may be repeated into a new output file without repeating predictions. The command below verifies the frozen evaluation receipt, stages the real React Worker/API and exports, and bundles only after acceptance passes. It archives the old release unchanged. Keep all private qualification inputs available.

```powershell
npm.cmd run ml:release:category -- --dataset .local/ml-q1/frozen-01/dataset.json --exposure .local/ml-q1/exposure.json --candidate .local/ml-category/cohort-2026-10-26/candidate-v4 --source-lock ml/applications/fresh-holdout.sources.lock.json --provenance .local/ml-q1/frozen-01/provenance.json --evaluation .local/ml-q1/evaluation-01 --output .local/ml-q1/release-NEW.json --bundle
npm.cmd run typecheck
npm.cmd run test:ml
npm.cmd test -- --maxWorkers=1
npm.cmd run build
npm.cmd run test:ml-worker
npm.cmd run test:browser
```

Omit `--bundle` to run staged acceptance only. Changed model, policy, evaluator, dataset, source/provenance, parity or evaluation bindings cause rejection. An incomplete/failed evaluation cannot be promoted. No Supabase credentials, local blockchain, user training or public deployment is needed for these checks.

## Remaining ML evidence and browser validation

Developer-only evidence audit (no training or holdout evaluation):

```powershell
npm run ml:audit:evidence -- --dataset .local/ml-category/cohort-2026-10-26/dataset.json --output .local/ml-q2/evidence-next
```

The output directory must be new. Results identify missing development classes and identical inputs with conflicting labels; they do not approve a model. Dataset paths are developer artifacts and are not shipped to users.

After `npm run build`, run the Worker checks sequentially:

```powershell
npm run test:ml-worker
$env:VYLNT_BROWSER_CHANNEL = 'msedge'
npm run test:ml-worker
Remove-Item Env:VYLNT_BROWSER_CHANNEL
npm run test:scanner
```

Edge must be installed for `msedge`. These commands use disposable automated browser sessions, not your signed-in profile. Results include the browser version, the 318-finding workload, a report near the 512 KiB storage boundary, cancellation and errors. The scanner command checks actual extension network outcomes, cache/restart and bounded dynamic-page collection in Chromium. Timings are local measurements, not production capacity or a native accessibility certification.
## Local project companion (development)

The companion creates new scans from a registered Git repository's committed files. It does not add evidence to old extension scans. Seven project-backed ML categories are still unqualified; current reports retain the existing assessments. Signed project provenance can be retained in version-2 frozen insights; project relevance remains disabled pending qualification. Only register code you trust: build/start scripts run as your local OS user, not inside an OS sandbox.

From the VYLNT folder, build and start the local API with the companion enabled:

```powershell
npm run build
$env:VYLNT_PROJECTS = 'local'
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.local\browsers"
npm run dev
```

Chromium must already be installed at that browser path (`npx playwright install chromium` with the same environment variable if needed). Sign in to the dashboard, open **Local projects**, and select **Register a project**. In another terminal, run its command from the VYLNT folder, supplying the explicit website repository root:

```powershell
npm run project:register -- --repo "C:\path\to\website" --code <one-time-code>
```

Codes expire after five minutes and work once. The website needs a committed npm lockfile and the existing `.vynlt/gate.json` build/start/routes configuration described in `docs/M4_SECURITY_GATE.md`. Choose HEAD or a full commit SHA in Local projects, then **Scan project**. Uncommitted changes are excluded. Progress and cancellation remain on that page; completed scans open normally. Interrupted API jobs require a new signed-in run; tokens are never saved in the job journal.

Local state and the installation signing key are in ignored `.local/project-companion/`. Keep that key private and retain `trusted-public-keys.json` for archived evidence verification. Project metadata is local to this API installation even when scan storage uses Supabase. Do not start multiple API processes against this directory. Runs set `NODE_ENV=test`, `VYLNT_PROJECT_RUN=1` and `VYLNT_DATA_DIR` to disposable storage; applications must use test-only local storage rather than production services. This environment is not an OS sandbox. Companion evidence has a separate 128 KiB limit and is rejected explicitly when oversized.

Developer acceptance (uses disposable localhost fixtures):

```powershell
npm run test:projects
$env:VYLNT_BROWSER_CHANNEL = 'msedge'
npm run test:projects
Remove-Item Env:VYLNT_BROWSER_CHANNEL
```

Saved project report provenance and verification:

Saved project insights now retain signed provenance in a v2 frozen snapshot. With Supabase storage, first apply `supabase/migrations/006_project_insight_reports.sql` after 005. Local file storage requires no SQL. Keep the installation's archived public keys for later verification. Current project-backed analysis remains unqualified; this does not enable a new model. See `docs/ML_PROJECT_FROZEN_REPORTS.md`.

Standalone verification of a project export and its separate proof can use an explicitly trusted archive:

```powershell
npm run chain:verify -- report.json proof.json .local/project-companion/trusted-public-keys.json
```

The third file is optional and defaults to that installation archive. Do not use keys supplied by the report itself. The matching local blockchain/deployment must be available.

Project browser evidence checks (CSP execution/blocking, redirects, privacy, request matching, loopback isolation and cancellation):

```powershell
npm run test:projects:browser
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:browser
Remove-Item Env:VYLNT_TEST_BROWSER
npm run test:projects:data
```

Developer-only project dataset preparation, after native application adapters, source checks and independent functional oracles exist:

```powershell
npm run ml:projects:register -- --source .local/project-source-lock.json --exposure .local/historical-exposure.json --output .local/project-development-registration
npm run ml:projects:prepare -- --registration .local/project-development-registration --manifest .local/project-collection/manifest.json --keys .local/project-companion/trusted-public-keys.json --output .local/project-development-prepared
```

These example input files are not a supplied dataset. See `docs/ML_PROJECT_DATA.md` for schemas and prerequisites. Preparation requires the existing private family key, writes only new private output directories, and returns exit code 2 with concrete deficits when data is insufficient. It does not train or qualify a model; users do not prepare datasets.

Pinned native application evidence acceptance (developer-only, after the source/dependency setup in `docs/ML_NATIVE_PROJECT_CHECKS.md`):

```powershell
npm run test:projects:native
npm run test:projects:native:cancel
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:native
Remove-Item Env:VYLNT_TEST_BROWSER
```

This creates disposable local Jingo data and checks native login/cookie dependency. It also audits source-inventory coverage and policy-v3 positive authentication inputs; the exported initializer remains a partial inventory. It is one development prototype, not seven-category qualification or an automatically enabled dashboard adapter.

Cookie JavaScript necessity / HttpOnly controls (developer evidence checks):

```powershell
npm run test:projects:cookie-access
npm run test:projects:native:cookie-access
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cookie-access
npm run test:projects:native:cookie-access
Remove-Item Env:VYLNT_TEST_BROWSER
```

These compare original, target-only HttpOnly and restored cookie states. The native command uses the same pinned Jingo family with a controlled readable-cookie response profile and audits complete positive CK-001/CK-002 inputs from issued authentication-role evidence. It does not create another family or qualify CK-002. See `docs/ML_COOKIE_ACCESS.md` and `docs/ML_AUTHENTICATION_EVIDENCE.md` for scope and limits. Outputs remain aggregate developer acceptance results, not training labels.

Source-backed cookie-purpose controls (developer-only mechanism reference):

```powershell
npm run test:projects:cookie-preference
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cookie-preference
Remove-Item Env:VYLNT_TEST_BROWSER
npm run test:projects:cookie-preference:cancel
```

The commands create disposable committed source and synthetic credentials automatically, verify preference versus authentication behaviour and clean up. No user dataset or account preparation is required. Reference evidence is excluded from application training counts. See `docs/ML_COOKIE_PURPOSE.md`.

Scoped script/CSP compatibility controls (developer-only):

```powershell
npm run test:projects:scripts
npm run test:projects:native
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:scripts
npm run test:projects:native
Remove-Item Env:VYLNT_TEST_BROWSER
```

The first command checks controlled mechanisms. The native command also tests the pinned Jingo enhanced editor with JavaScript enabled, disabled and restored, using disposable data. It requires the native setup in `docs/ML_NATIVE_PROJECT_CHECKS.md`. No user credential or dataset is needed. These are evidence checks, not a qualified HDR-003 release. See `docs/ML_SCRIPT_COMPATIBILITY.md`.

The same commands now cover bounded meta-CSP timing, self/hash policies, response/meta conjunction, late/dynamic/report-only rejection and review-only nonce-generation context. The generic project runner does not gain arbitrary website-specific functional actions. See `docs/ML_META_POLICY.md`; no startup command changed.

Direct HTTP script-dependency evidence (developer checks):

```powershell
npm run lab:tls
npm run test:projects:resources
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:resources
Remove-Item Env:VYLNT_TEST_BROWSER
```

Disposable loopback fixtures check actual HTTP transfer and normal/withheld/restored functionality. Local certificate errors are explicitly ignored; no TLS-validation/upgrade claim or category qualification follows. No trust setting changes. See `docs/ML_RESOURCE_COMPATIBILITY.md`. Startup instructions are unchanged.

Executed framing-policy evidence (developer checks):

```powershell
npm run test:projects:frame-policy
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:frame-policy
Remove-Item Env:VYLNT_TEST_BROWSER
```

These disposable HTTP loopback controls test permitted, forbidden and nested ancestors against unchanged response policies, then check policy-v2 assessment and legacy-v1 seals. They establish no application-purpose label or model qualification. See `docs/ML_FRAME_POLICY.md`; no startup command changes.

Framing evidence (developer checks):

```powershell
npm run test:projects:framing
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:framing
Remove-Item Env:VYLNT_TEST_BROWSER
```

The native command above now also checks the authenticated Jingo form in same-origin and cross-origin parents. Framing observations do not label public-embedding intent or qualify HDR-002. See `docs/ML_FRAMING_EVIDENCE.md`.

Evidence-v4 candidate development (requires eligible prepared data):

```powershell
npm run ml:projects:candidate -- preflight --prepared .local/project-development-prepared
npm run ml:projects:candidate -- register --prepared .local/project-development-prepared --output .local/project-candidate-001
npm run ml:projects:candidate -- fit --prepared .local/project-development-prepared --output .local/project-candidate-001
npm run ml:projects:parity -- .local/project-candidate-001
npm run test:projects:candidate
python -B -m unittest discover -s ml/tests -p test_project_candidate.py -v
```

Current data is not ready, so real registration/fitting remains blocked. The test command only checks empty-data refusal; Python optimizer smoke artifacts are temporary synthetic mechanics, not a qualified model. No user dataset preparation is required. See `docs/ML_PROJECT_CANDIDATE.md`.

Category-decision parity (developer checks):

```powershell
npm run ml:projects:parity -- .local/project-candidate-001 --browser chromium
npm run ml:projects:parity -- .local/project-candidate-001 --browser msedge
$env:VYLNT_PROJECT_PARITY_BROWSERS = 'chromium,msedge'
python -B -m unittest discover -s ml/tests -p test_project_candidate.py -v
Remove-Item Env:VYLNT_PROJECT_PARITY_BROWSERS
```

The first commands require a fitted experimental candidate with version-2 parity fixtures. The Python command exercises temporary synthetic optimizer fixtures, full-input logistic inference and exact calibrated decisions in all three JavaScript environments. It does not qualify a category or require user data/accounts.

Distinct-site POST and explicit GET checks (developer-only disposable data):

```powershell
npm run test:projects:cross-site
npm run test:projects:native:cross-site
$env:VYLNT_TEST_BROWSER = 'msedge'
npm run test:projects:cross-site
npm run test:projects:native:cross-site
Remove-Item Env:VYLNT_TEST_BROWSER
```

The native command requires the pinned Jingo setup. It labels its SameSite=None/Secure response-attribute scenario explicitly and removes the temporary wiki afterward. Ordinary `test:projects:native` also checks the native cookie profile. No user credential is required. See `docs/ML_CROSS_SITE_EVIDENCE.md`; these observations do not qualify CK-003.

These commands now cover document creation, editing, deletion and an explicit empty-field GET revert probe. PUT/DELETE are explicitly declared POST-form overrides. Readback distinguishes restored files/index from a completed Git commit; partial native reverts remain unknown. Lax POST omission does not establish top-level GET safety. Other routes and CSRF vectors remain outside the tested scope. No startup command changed.

Fresh evidence-v4 holdout (developer qualification workflow, after eligible data and candidate fitting):

Native development seeds (before the eligible cohort exists):

Strict local TLS preparation/review: `npm run ml:projects:tls -- prepare` then `npm run ml:projects:tls -- review`. These commands never change trust. Positive checks (`npm run test:projects:tls:trusted`) and native TLS collection (`npm run test:projects:native:tabinator -- --tls --seeds`) require an explicitly authorized, working local certificate-trust environment. A fresh approved leaf passed the strict HSTS mechanism profiles once, but native browser validation and resource-upgrade acceptance remain unsuccessful. Do not bypass certificate errors. See `docs/ML_LOCAL_TLS_SETUP.md` for failures and exact trust removal.

Mixed-resource correlation and dependency checks: `npm run test:projects:resources`; set `VYLNT_TEST_BROWSER=msedge` in PowerShell as shown for transport checks to run Edge. The suite also verifies query-collision ambiguity, failed/HTTP-error outcomes and synthetic-fulfilment uncertainty. See `docs/ML_RESOURCE_CORRELATION.md` for scope.

Strict named-origin upgrade fixture in Ubuntu or WSL, run from the project
root in the Linux shell:

```sh
sh scripts/ml-resource-upgrade-linux.sh
```

This uses the prepared `.local/native-linux-tools` Node, NSS tools and
Chromium, with Playwright installed in the workspace. It creates and removes
a temporary browser trust profile. The resulting JSON describes the
mechanism fixture and supplies no native training examples.

For the pinned Jingo editor's signed native upgrade run, first create a
fresh registration from the workspace. In PowerShell, with the existing
Ubuntu tools, pinned Jingo dependencies and private family key available:

```powershell
node scripts/ml-native-development.mjs register --output .local/my-jingo-upgrade-registration
$env:VYLNT_NATIVE_REGISTRATION = (Get-Content .local/my-jingo-upgrade-registration/registration.json -Raw | ConvertFrom-Json).registrationHash
$previousWslEnvironment = $env:WSLENV
try {
  $env:WSLENV = (@($previousWslEnvironment,'VYLNT_NATIVE_REGISTRATION/u') | Where-Object { $_ }) -join ':'
  wsl -d Ubuntu --exec sh scripts/ml-resource-upgrade-linux.sh --native-jingo
  if ($LASTEXITCODE -ne 0) { throw 'Native upgrade collection failed' }
} finally {
  $env:WSLENV = $previousWslEnvironment
  Remove-Item Env:VYLNT_NATIVE_REGISTRATION
}
node scripts/ml-material-development.mjs extend --registration .local/native-material-registration-14 --supplementRegistration .local/my-jingo-upgrade-registration --output .local/my-upgrade-material-registration
node scripts/ml-material-development.mjs prepare --registration .local/my-upgrade-material-registration --output .local/my-upgrade-material-datasets
npm run ml:projects:candidate -- preflight --prepared .local/my-upgrade-material-datasets
```

The Jingo run uses a disposable wiki and a test-only response policy. Its
write is verified through native Git storage before evidence signing.

BookWise and Yoyo Collection also accept `--native-bookwise` and
`--native-yoyo-collection`. Append one or more of `resource-http`,
`resource-upgrade`, `style-http`, `style-upgrade`, `hsts-disabled`,
`hsts-positive` and `hsts-missing` to select scenarios. The two
stylesheet cases verify a native control before and after withholding
the stylesheet. For a stylesheet-only collection, run these in Ubuntu
after exporting a prospective registration:

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-bookwise style-http style-upgrade
sh scripts/ml-resource-upgrade-linux.sh --native-yoyo-collection style-http style-upgrade
sh scripts/ml-resource-upgrade-linux.sh --native-fieldpoint resource-http resource-upgrade style-http style-upgrade
sh scripts/ml-resource-upgrade-linux.sh --native-tabinator resource-http resource-upgrade
sh scripts/ml-resource-upgrade-linux.sh --native-8star-links style-http style-upgrade
```

The same isolated TLS helper can collect HSTS profiles from 8star Links'
native API and Jingo's authenticated editor. Set
`VYLNT_NATIVE_REGISTRATION` from a new prospective registration first.

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-8star-links hsts-disabled hsts-positive hsts-missing
sh scripts/ml-resource-upgrade-linux.sh --native-jingo hsts-disabled hsts-positive hsts-missing
```

Use `hsts-host` to test a headerless native response while a policy from
another HTTPS response on the same host is active. The helper supports
this profile for 8star Links, BookWise, FieldPoint, Habit Tracker, Jingo,
Tabinator and Yoyo Collection. Each run proves plaintext before installation,
upgrading after installation and plaintext after reset.

Use `hsts-invalid` with the same seven applications to verify that the
malformed directive leaves the plaintext listener reachable while a
valid policy on the same host changes the wire behavior.

Use `hsts-invalid-host` with those applications to reload the same native
response after installing a valid policy. The browser must still receive
the malformed header, upgrade the plaintext request, and return to
plaintext after the credential-free reset.

Use `hsts-disable-active` with a fresh registration to test the native
`max-age=0` response against a policy Chromium was already enforcing.
For example, in Ubuntu:

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-personal-knowledge-manager hsts-disable-active
sh scripts/ml-resource-upgrade-linux.sh --native-yoyo-collection hsts-disable-active
```

Use `hsts-activate-native` with the same registration workflow to verify
that the application's positive HSTS response turns a plaintext request
into a TLS attempt. The collector establishes the plaintext baseline
after a credential-free reset.

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-personal-knowledge-manager hsts-activate-native
sh scripts/ml-resource-upgrade-linux.sh --native-yoyo-collection hsts-activate-native
```

For HomeInventory, use the current signed material registration so that
the app keeps its active training slot. The runner requires the staged
client build and the pinned Ubuntu production dependencies in
`.local/native-linux-deps-homeinventory`.

```powershell
node scripts/ml-native-development.mjs register --family homeinventory --hsts --material-parent .local/native-material-registration-58 --output .local/my-homeinventory-hsts-registration
```

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-homeinventory .local/my-homeinventory-hsts-registration
```

Use the same prospective registration and Ubuntu helper for the Jingo
stylesheet pair. The probe exercises the editor's native help dialog.

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-jingo http-style https-upgrade-style
```

The 8star Links standalone-module pair uses the same named TLS fixture
and registered cohort:

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-8star-links module-http module-upgrade
```

The FieldPoint map profiles use the pinned Leaflet assets and an offline
basemap tile. Tabinator serves its original editor script as a fixture
asset. The 8star Links profile uses the pinned Linux dependency folder,
including its matching Linux SQLite addon. Its native settings-menu
styles are served by the app's original loopback listener or upgraded
through the TLS fixture.

Use the same prospective registration and preparation steps. Each family
requires an Ubuntu dependency install from its pinned source in
`.local/native-linux-deps-<family>`. In Ubuntu, from the workspace root:

```sh
export PATH="$PWD/.local/native-linux-tools/node-v24.11.1-linux-x64/bin:$PATH"
for family in bookwise yoyo-collection; do
  source="$PWD/.local/ml-native-expansion/$family"
  dependencies="$PWD/.local/native-linux-deps-$family"
  mkdir "$dependencies" || exit 1
  git -C "$source" show HEAD:package.json > "$dependencies/package.json" || exit 1
  git -C "$source" show HEAD:package-lock.json > "$dependencies/package-lock.json" || exit 1
  pin=$(node -p "require('./ml/applications/native/$family.source.json').dependencyLockSha256")
  printf '%s  %s\n' "$pin" "$dependencies/package-lock.json" | sha256sum -c - || exit 1
  npm --prefix "$dependencies" ci --omit=dev --no-audit --no-fund || exit 1
done
```

The runner checks the package manifest against the verified Git bytes
and the lock against the registered digest before starting either app.

Portal's lock covers two npm workspaces. To prepare its Linux cache, copy
`package.json`, `package-lock.json`, `server/package.json` and
`client/package.json` from the pinned Git revision into the corresponding
paths under `.local/native-linux-deps-portal`. Verify the root lock digest
against `ml/applications/native/portal.source.json` and use the same
`npm ci --omit=dev` command. The runner checks all three manifests before
starting the application. With a fresh registration, run:

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-portal hsts-disabled hsts-positive hsts-missing hsts-host hsts-invalid hsts-invalid-host
```

For Personal Knowledge Manager, stage `src/backend/package.json` and
`src/backend/package-lock.json` from the pinned revision as `package.json`
and `package-lock.json` in `.local/native-linux-deps-personal-knowledge-manager`.
Verify the backend lock digest from the source record and install the
locked production dependencies with the Ubuntu Node 24 runtime. Confirm
the pinned `better-sqlite3` opens an in-memory database under that runtime
before starting a capture. If a prebuild is unavailable, compiling the
locked addon requires GNU Make, a C++ compiler and matching Node headers.
The strict TLS helper uses a disposable browser trust profile.

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-personal-knowledge-manager hsts-disabled hsts-positive hsts-missing hsts-host hsts-invalid hsts-invalid-host
```

Wikiflow uses Node 20 for its native SQLite and password dependencies.
Stage the pinned root `package.json` and `package-lock.json` under
`.local/native-linux-deps-wikiflow` and verify the lock digest from the
source record before installing. Use a checksum-verified Linux Node 20
runtime to install and verify both addons. The helper uses
`.local/native-linux-tools/node-v20.18.0-linux-x64/bin/node` by default,
or the runtime supplied through `VYLNT_NATIVE_NODE20`.

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-wikiflow hsts-disabled hsts-positive hsts-missing hsts-host hsts-invalid hsts-invalid-host
```

Anonymous Notepad's command reproduces the exploratory browser runs.
It belongs to the original source registration and is excluded from the
active cohort, which has HomeInventory in its training slot. Stage the
pinned root npm manifest and lock under
`.local/native-linux-deps-anonymous-notepad` and verify the lock digest
from the source record. The locked Linux SQLite and password addons were
prepared with Node 20 and exercised by the Node 24 collector. The native
editor writes over HTTPS, with the password checks kept on loopback.

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-anonymous-notepad hsts-disabled hsts-positive hsts-disable-active hsts-activate-native
```

FieldPoint, Habit Tracker and Tabinator also accept the three HSTS cases.
Use the same prospective registration and Ubuntu trust helper:

```sh
sh scripts/ml-resource-upgrade-linux.sh --native-fieldpoint
sh scripts/ml-resource-upgrade-linux.sh --native-habit-tracker
sh scripts/ml-resource-upgrade-linux.sh --native-tabinator
```

Their dependency folders follow the same naming convention. FieldPoint
and Habit Tracker use the corresponding `.local/ml-native-expansion`
source. Tabinator uses `.local/ml-native-tabinator`. Habit Tracker also
requires the pinned `client/package.json` and `server/package.json`
workspace manifests in its dependency folder. For Habit Tracker, pass
`--ignore-scripts` to the locked install and verify that the bundled
Linux SQLite binary loads before acquisition. The API profiles verify
one scoped authenticated response and one independent native write.
The missing-header profile additionally requires a real plaintext transfer
and a positive TLS control in the same browser. Select `hsts-missing`
explicitly to rerun only that case.

Transport/HSTS evidence mechanism: `npm run test:projects:transport`. To use Edge, set `$env:VYLNT_TEST_BROWSER='msedge'` first, then clear it with `Remove-Item Env:VYLNT_TEST_BROWSER`. This checks strict certificate rejection and bypass/redirect uncertainty with disposable local certificates; no trust-store change or qualifying application data is created. See `docs/ML_TLS_EVIDENCE.md`.

```powershell
npm run ml:projects:seeds -- --collect --output .local/project-native-seeds-010
npm run ml:projects:candidate -- preflight --prepared .local/project-native-seeds-010
```

Runs all twelve native families: Tabinator default/readable/own-origin framing, Jingo script-policy profiles, the five expansion session families' native/readable/framing profiles and five operation families' native/framing profiles. It writes seven numeric category slices plus an audit to a new private directory. All pinned installations and the existing family key are required; Wikiflow/Personal Knowledge Manager use Node 20 native modules. Use a new suffix each time. Omit `--collect` to assemble already completed seed runs. The underlying command returns **2** because the seeds are not yet eligible for fitting; npm/PowerShell may surface this as a generic failure. Inspect `training-status.json`. It does not train/promote a model or consume a holdout. Existing folders are never overwritten. See `docs/ML_NATIVE_DATASETS.md` for actual counts and requirements.

The latest completed twelve-family aggregate is `.local/project-native-seeds-009`; run `npm run ml:projects:candidate -- preflight --prepared .local/project-native-seeds-009` to inspect its current deficits without recollection. The example above uses the next new directory; do not run both examples with the same output name.

The framing command writes a separate contextual seed after actual permitted/forbidden/repeated/nested browser checks and native SQL/session controls. It does not require TLS trust or enable a model. For Edge, set `$env:VYLNT_TEST_BROWSER='msedge'` before running it, then `Remove-Item Env:VYLNT_TEST_BROWSER`. Cancellation check: `npm run test:projects:native:tabinator -- --framing-policy --cancel`. The original default/readable commands produce optional seed labels only with `--seeds`.

Native Jingo script-policy data (developer collection, no training):

```powershell
npm run test:projects:native:scripts
npm run test:projects:native:scripts -- --profile early-meta
npm run test:projects:native:scripts:cancel
```

The first command runs missing, restrictive early-meta and late-meta profiles. Each uses disposable accounts, a temporary Git wiki and real native editor/write controls. Completed metadata-only records are retained under ignored `.local/ml-native-observations/jingo/`. Unknown timing remains Needs review. The same Edge environment setting above applies. See `docs/ML_NATIVE_JINGO_SCRIPTS.md` for pinned sources, privacy, cleanup and scope.

The holdout runner also enforces `ml/applications/native/*.source.json` as the known development-exposure inventory. Keep Jingo and Tabinator records present. Missing/changed records fail closed; inventory changes require a new registration, never modifying old receipts or clearing consumed evaluations. This adds no training examples and does not qualify a model. Focused regression: `npx vitest run tests/project-source-exposure.test.ts tests/project-holdout-command.test.ts --maxWorkers=1 --no-file-parallelism`.

After completing that once-only evaluation, verify and privately stage passing categories:

```powershell
npm run ml:projects:release -- --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001 --evaluation .local/project-holdout-evaluation-001 --output .local/project-release-stage-001
```

Staging rejects failed/altered evaluations and existing output directories. It never repeats predictions, bundles a model or enables inference; runtime acceptance remains pending. These are example paths; no real seven-category candidate/passing holdout exists yet. See `docs/ML_PROJECT_RELEASE.md`.

Holdout commands:

```powershell
npm run ml:projects:holdout -- register --candidate .local/project-candidate-001 --development .local/project-development-prepared --development-sources .local/project-development-registration/sources.json --source .local/project-holdout-sources.json --exposure .local/historical-exposure.json --output .local/project-holdout-registration-001
npm run ml:projects:holdout -- prepare --registration .local/project-holdout-registration-001 --manifest .local/project-holdout-manifest.json --keys .local/project-trusted-public-keys.json --output .local/project-holdout-prepared-001
npm run ml:projects:holdout -- preflight --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001
npm run ml:projects:holdout -- evaluate --registration .local/project-holdout-registration-001 --prepared .local/project-holdout-prepared-001 --output .local/project-holdout-evaluation-001
```

These example paths require real developer-owned artifacts; no eligible cohort/candidate exists yet. Registration requires completed Node/Chromium/Edge candidate parity and twelve new sources. Preflight checks prerequisites for all seven categories without predicting; evaluation measures quality once. Failed or interrupted attempts remain consumed. Passing evaluation does not bundle a release. See `docs/ML_PROJECT_HOLDOUT.md` for source/oracle contracts, private-data limits and remaining release acceptance. No startup or deployment command changed.

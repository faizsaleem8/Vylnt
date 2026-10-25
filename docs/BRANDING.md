# VYLNT spelling and compatibility

The product name is **VYLNT** (`Vylnt` in class names, `vylnt` in filenames/package names). The prior transposed spelling has been corrected throughout maintained branding: dashboard, extension, ledger, PDFs, acceptance pages, CLI messages, workflow/check names, export names, package metadata, developer scripts and documentation. The current contract source is `contracts/VylntReportAnchor.sol`. The dashboard's workflow source is `docs/examples/vylnt-report-check.yml` and new downloads use `vylnt.yml` / `vylnt-report.json`.

## Existing installations and reports

- New configuration examples use `VYLNT_*`. Existing `VYNLT_*` settings remain accepted as aliases, with corrected names taking precedence. Ignored `.env` credentials are not rewritten.
- `.vynlt/gate.json` remains a compatibility path for the already published, pinned scanner revision. This directory name is a machine interface, not display branding.
- Existing serialized model/schema/catalog/policy version strings retain their exact bytes. Published numeric model artifacts, measured parity/evaluation fixtures, immutable example reports, and existing local/Supabase reports are not relabelled or rehashed. Changing those would invalidate saved identities or historical derivation. Legacy model display names are corrected only at the UI/PDF presentation boundary.
- Existing managed pre-push hook headers are recognized by exact content so they can still be upgraded or uninstalled safely. Other hooks are not adopted.
- GitHub protection is repository-side configuration: a required check named with the former spelling is not automatically renamed. If used, update that setting to **VYLNT security gate** when adopting the new workflow. Existing website repositories keep their copied workflows until manually updated.
- No deployed contract or journal is rewritten and no chain reset is needed. The ABI is unchanged; renaming contract source affects future compilation metadata, not already deployed code.

These legacy identifiers are intentional compatibility entries. They do not justify using the former spelling for new product text. Private credentials, frozen reports and external copied repositories are outside a source branding replacement.

## Validation — 2026-10-26

Type checking/build, 223 tests in 41 suites, ten focused post-correction branding/frozen/PDF tests, eight workflow cases, 17-state UI/accessibility audit, full extension/CLI/dashboard browser acceptance, 11 real Git/gate groups and 20 isolated local-chain acceptance groups passed. The renamed Solidity source compiled and real transactions verified. Eighteen immutable fixture/model/report files were checked byte-for-byte unchanged. Corrected branding was inspected in the dashboard screenshot. Temporary test services stopped; existing normal chain and stored reports were not migrated. See PLAN.md for initial test failures/corrections and exact scope. No new cloud or installed native Edge certification is claimed.

Restart the application and reload the unpacked extension to see all renamed headings, PDF labels and extension metadata. Existing copied workflows in other repositories keep working with their old filenames until updated manually; adopt the new filename instructions together when replacing one.

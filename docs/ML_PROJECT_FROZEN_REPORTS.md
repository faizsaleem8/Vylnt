# VYLNT frozen project reports

This component preserves signed project provenance inside saved insights. It does not qualify the seven remaining categories or enable evidence-v4 inference.

## Saving and verification

When the authenticated API finalises a scan from its registered project runner, it obtains the exact same-run seal by owner, scan ID and original digest. It verifies the seal, adds a signed pseudonymous owner tag and freezes a `vylnt-frozen-insights-v2` snapshot. The tag binds the signing-key identity and account without exporting the account identifier. It is authorization metadata, never a model feature. Existing signed sidecars are not rewritten.

The snapshot includes the original scan, its separate hash, the existing analysis and `project: {seal, assessment: "not-enabled"}`. Project evidence records its actual evidence-v4 schema and assessment policy. Analysis retains its actual existing input schema because the seven project-backed categories are not yet enabled. Missing or invalid known project provenance fails saving rather than silently issuing a project-verified report. An ordinary extension scan is not enriched by a matching URL.

Trust comes from the installation's public-key archive, never from keys supplied in uploaded JSON. Finalisation, retrieval, upload verification and anchoring verify the signed evidence, source linkage, owner tag and trusted analysis/templates. Copying a signed scan into another account through a direct database write cannot create accepted project provenance. Local signatures establish installation provenance, not independent attestation or protection from a malicious local OS user.

Identical content reuses its version. Changed evidence, authorization, policy or model produces a different digest. Reload and exports retain the original snapshot. Private signing keys can rotate while archived public keys continue verifying old snapshots. Keep `.local/project-companion/trusted-public-keys.json`; a different API installation without those trusted keys cannot verify these local provenance claims.

## Persistence and exports

Apply `supabase/migrations/006_project_insight_reports.sql` after 005 for Supabase-backed project reports. It adds `finalize_project_insight_report` using the existing immutable table and ownership policies. The v1 RPC and existing rows remain intact. SQL checks ownership, envelope identity, source linkage and bounds. The API additionally verifies Ed25519 trust, signed owner binding and analysis derivation; a direct database write is not server attestation.

The local adapter needs no database migration. Both adapters retain the 512 KiB source-scan and 1 MiB combined-report limits; oversize content fails explicitly. Source deletion removes its saved versions through the existing flow. Mutable review notes remain outside frozen content.

Insights JSON and PDF use the frozen snapshot. The PDF displays commit/run/schema/policy provenance and the unqualified-project-analysis limitation; it adds no changing blockchain status. The canonical JSON digest includes project evidence and goes through the existing anchor journal/worker. Original scan hashes and raw PDFs retain their original meaning.

`Verify report` accepts both frozen formats. Upload comparisons are owner-scoped and transient. Whitespace/formatting is canonicalized; modified content fails verification.

## Commands

```powershell
npm run build
npm run test:projects
$env:VYLNT_BROWSER_CHANNEL = 'msedge'
npm run test:projects
Remove-Item Env:VYLNT_BROWSER_CHANNEL
npm run test:chain
```

Standalone chain verification defaults to this installation's public-key archive. An explicitly trusted archived key file can be supplied as the third file argument:

```powershell
npm run chain:verify -- report.json proof.json .local/project-companion/trusted-public-keys.json
```

Never obtain that trust file from the uploaded report. The local chain must be running with its matching deployment. This command validates content/provenance and the live anchor; it does not validate model accuracy.

## Validation and remaining work

Actual results are recorded in PLAN.md. Local PostgreSQL execution is separate from applying/verifying migration 006 in hosted Supabase. No hosted deployment is performed by this component.

On 2026-10-29, 53 relevant tests across twelve files, type checking and production builds passed. The local PostgreSQL tests executed both migrations and checked owner isolation, immutability, idempotency, source linkage/deletion and limits. Chromium and Edge passed real exact-commit project scans, v2 JSON/PDF downloads, original/tampered UI uploads, cancellation and restart retention. Twenty-one isolated blockchain acceptance groups passed, including a real v2 transaction/live verification, owner refusal, altered export, offline availability and reset/recovery. The three-page PDF was rendered for visual review and checked for provenance/qualification text. Existing Zod/Rollup annotation warnings remain. This is targeted regression/acceptance evidence, not a new full-suite result or model-quality claim.

Still required for ML-Q: complete native category evidence/adapters, eligible independent development applications, actual fitting, a fresh held-out evaluation passing each category's original gates, a gated release manifest, qualified evidence-v4 Worker/API decisions and broader runtime/performance/export acceptance. JS-002 remains the only qualified category.

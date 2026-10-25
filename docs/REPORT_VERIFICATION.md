# VYLNT uploaded report verification

Choose **Verify report** in the dashboard sidebar. Select a downloaded VYLNT JSON and click **Verify report**. No command line or anchor proof upload is needed. The page replaces the old embedded ledger navigation; the separate [demo ledger](BLOCKCHAIN_LEDGER.md) remains at `/ledger.html`.

- **Insights JSON:** canonical content is compared to the signed-in owner's immutable saved report. The API validates the saved derivation and original scan linkage, then checks the live blockchain using its trusted journal proof. Only a successful live anchor check produces “Report matches the blockchain anchor.”
- **Raw Export JSON:** the original scan content is compared with its owner-scoped database SHA-256. A match is explicitly labelled database-only, since that hash is not blockchain-anchored.
- **Altered or corrupted:** the calculated uploaded hash disagrees with the saved content or insights envelope identity. This detects changed evidence, severity, insights and other hashed fields; it does not determine malicious intent.
- **Not found:** no corresponding report is available in the signed-in account. The file might belong to another account, have been deleted or have an edited identifier. No tampering conclusion is possible.
- **Unavailable / not anchored:** saved content may match, but live verification cannot pass when the node is offline, configuration changed or no anchor has been submitted. A database match is not reported as a blockchain match.

Uploads are transient, not imported or persisted. Authenticated `POST /api/reports/verify-upload` accepts at most 4 MiB including formatting, allowing whitespace expansion of existing bounded exports. It reuses existing owner-scoped storage access and live verification. It never anchors an arbitrary uploaded digest. The reference must still exist, so this interface cannot verify deleted reports solely from the chain; the developer CLI with a separate proof remains available.

Whitespace/key ordering do not change canonical hashes. Insights envelope `createdAt` is outside the hashed content. PDF-byte verification is not supported. A match establishes consistency, not correctness of findings or ML accuracy. The UI cancels obsolete requests when changing files or navigating away/signing out; errors do not reuse previous success state. Existing per-report Verify local anchor and immutable hashes/exports remain unchanged.

## Demo

Download insights JSON. Verify it successfully with the node running. Edit a copy's finding severity or analysis summary while retaining its original ID/hash, upload that copy and observe the mismatch and hash comparison. Uploading a raw JSON instead demonstrates database consistency, not blockchain verification.

| Before | After | Why |
|---|---|---|
| Dashboard navigation opens ledger metadata | Verify report opens a file checker | Inspect the actual downloaded file the user selects |
| Terminal command and proof file required | Single JSON upload | Retrieve trusted proof from the API |
| Possible ambiguity about raw scan anchors | Explicit database-only and live blockchain results | Preserve the two hash meanings |

Validation results and remaining limitations are tracked in `PLAN.md`.

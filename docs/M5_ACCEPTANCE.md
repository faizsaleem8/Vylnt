# VYNLT local blockchain usage and acceptance

## Run locally

For the project demonstration, open **Blockchain ledger** in the dashboard sidebar to show live report-digest transactions, block numbers and block/parent hashes. Export the current range as JSON if needed. See [demo instructions](BLOCKCHAIN_LEDGER.md).

Install dependencies with Node 24, including optional native dependencies (`npm install --include=optional`). `chain:*` commands automatically use the bundled Node 24 runtime when launched from older Node; set `VYNLT_NODE` to a Node-24 executable on another machine. Hardhat 3.21.0, ethers 6.17.0 and solc 0.8.38 are pinned. A scoped override pins the compiler's tmp dependency to patched 0.2.7. The contract compiles locally with solc-js, without downloading another compiler.

1. Keep `npm run chain:node` running. RPC is bound to 127.0.0.1:8545, chain ID 31337.
2. Run `npm run chain:compile`, then `npm run chain:deploy` once for this running chain.
3. Set `VYNLT_BLOCKCHAIN=local` in the ignored `.env`, build and restart `npm run dev`. The API defaults to disabled when this setting is absent/off. Reload the unpacked extension after rebuilding.
4. Open a saved scan in React. When its insights finish generating, VYNLT automatically finalises the report, displays its SHA-256 and queues the digest, without a download click. Saved versions expose status, live verification and a separate downloadable anchor proof; the extension also exposes these for saved scans. A failed job offers Retry. A report-save error offers Retry report save. Reopening/re-exporting the same content reuses the immutable version; it does not create another report or anchor.
5. To verify files: `npm run chain:verify -- path/to/insights.json path/to/anchor-proof.json`. Matching exits 0; tampering/unavailability exits nonzero. `VYNLT_CHAIN_DEPLOYMENT` may select another local deployment manifest for isolated tests.

Default deployment/signer/journal files are ignored under `.local/blockchain/`. The signer is a publicly known Hardhat development account; never fund it with real assets. No user wallet, credentials or Supabase service-role key is needed. RPC is HTTP loopback only; paths, URL credentials, query strings and public hosts are rejected. For a different local port, `VYNLT_CHAIN_RPC` selects the deploy target and is persisted in the deployment manifest; the standard node command always uses 8545.

## Meaning and limits

The SHA-256 covers VYNLT's canonical combined JSON content, not its envelope timestamp or PDF bytes. Original scans retain their separate hashes and existing raw verification endpoint. Proof/transaction metadata never rewrites a frozen report or PDF.

Live verification checks report derivation and original-scan linkage, chain identity, configured contract bytecode, writer/instance, deployment receipt, successful anchor receipt, matching event, canonical block and registry lookup. One local confirmation is sufficient for this demo. Cached confirmed status means a transaction was recorded, not that a new live verification passed. Offline, reset or mismatched deployments return verification-unavailable.

The journal is single-process/single-writer and local to the API installation, including with Supabase report storage. It persists owner/scan identifiers, digests and transaction metadata/signed bytes, not user tokens, report evidence or cookie values. Do not share one journal across API replicas. Five transient failures stop automatic attempts; explicit Retry resets the count. A still-pending transaction remains submitted and is reconciled before another nonce is allocated. The journal has a 10,000-job bound; a full or unwritable journal gives a separate save warning rather than discarding the report. Save again after repairing local storage.

This Hardhat chain is disposable. Restarting it loses history; redeploy and restart the API to establish a new random instance, then explicitly re-save desired reports. Historical proofs are retained but cannot verify against another instance. No automatic old-version backfill occurs. API scan deletion cancels queued/unsent jobs; already submitted transactions and on-chain digests cannot be removed. Deleting directly in Supabase cannot recall a previously authorized job. A local operator controls both chain and API: this is not independent public attestation, permanent timestamping or evidence of security/ML accuracy. ML-Q remains open.

## Reproducible checks

Run `npm run build`, `npm run chain:compile`, then `npm run test:chain` with the installed project browser. Acceptance creates its own disposable chain at 127.0.0.1:18545 and API at :18546; it refuses an occupied chain port and never resets the normal :8545 chain. Private manifests, reports, proofs and screenshots remain under `.local/blockchain-acceptance-*`; summary is `test-results/blockchain-acceptance.json`.

The suite exercises actual contract authorization/duplicate behavior, automatic and concurrent saves, ownership, persisted signed-byte rebroadcast after simulated lost submission, API/service restart, trusted verification and tamper/receipt/block/event mismatch, public verification CLI exits, deletion, real React and unpacked-extension controls, proof download, axe and narrow layout, offline save/download, persisted five-failure exhaustion/retry, and chain-reset rejection. Native installed Edge, new hosted Supabase checks, public networks and permanent chain storage are not certified by these automated local checks.

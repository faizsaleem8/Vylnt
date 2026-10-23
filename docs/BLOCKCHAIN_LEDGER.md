# VYNLT demo ledger

The dashboard's former Blockchain ledger navigation is now **Verify report** for uploaded file checks. The standalone demo remains available directly at `/ledger.html` and from that page's Open demo ledger link. Older embedded-view instructions below are historical.

## Separate presentation webpage

Open **http://127.0.0.1:4318/ledger.html** for the standalone demo, or use **Open separate demo explorer** inside the dashboard's Blockchain ledger view. No dashboard login is required on this local presentation page. Its data endpoint `/demo-api/ledger` is restricted to loopback socket clients, rejects foreign browser origins and returns no account IDs, names, tokens, URLs or report evidence. Restart the API after rebuilding so this endpoint is available.

Each anonymous account row shows horizontally connected cards for real anchored reports. Expand a card to reveal the transaction, block hash and actual parent hash. The row arrows indicate the order of that account's report anchors; they do not claim those blocks are adjacent or that each account has a separate blockchain. All rows share the same contract/chain.

Grouping uses owner-to-digest associations in this installation's local journal and deployment-scoped pseudonyms. These relationships are not on-chain facts. Only accounts with known jobs can be shown; accounts registered in Supabase with no anchor jobs are not enumerated. Unknown contract events remain in an Unassigned row. Empty rows explicitly mean no anchors in the currently selected range. Account labels do not expose owner IDs, but cross-report grouping is intentionally visible in this local demo.

Keep the node running during the demonstration. The page checks live data every ten seconds and provides Refresh, Latest blocks and Older blocks controls. Disabled/offline/reset states remain explicit. This local presentation is not a public multi-account API or a separate blockchain deployment.

| Before | After | Why |
|---|---|---|
| Ledger embedded in dashboard | Independent presentation page | Show judges the chain without dashboard controls or sign-in |
| Flat event list | Anonymous account lanes and connected report cards | Match the requested sketch while retaining real metadata |
| Possible impression of separate per-account chains | Shared-chain caption and actual parent hashes | Distinguish visual grouping from blockchain structure |

Open **Blockchain ledger** in the dashboard sidebar after signing in. This separate page reads the configured contract's actual `Anchored` events from the local node. It shows report SHA-256, transaction hash, block number, timestamp and expandable block/parent hashes. It exposes no report evidence or private journal ownership. Contract events are visible across this local deployment to authenticated workspace users, rather than an owner-scoped list of private reports.

## Demo sequence

1. Keep `npm run chain:node` running. Compile/deploy once for that running node with `npm run chain:compile` and `npm run chain:deploy` if needed. Use `VYNLT_BLOCKCHAIN=local` and restart the API after deployment. See [local setup](M5_ACCEPTANCE.md).
2. Open a saved scan. Wait for its insights to save and Blockchain status to become Recorded.
3. Open **Blockchain ledger**. Find the report hash, transaction and block. Expand **Block links** to show its block hash and parent hash. Intervening blocks can contain unrelated transactions; displayed anchor events need not be in adjacent blocks.
4. Generate a different frozen report and return to the ledger. It refreshes every ten seconds; **Refresh ledger** checks immediately. Re-exporting unchanged content does not create another anchor event.
5. Use **Export ledger JSON** to download the displayed block range and checked deployment metadata. This is a snapshot of an observation, not live verification while offline.
6. Return to a report and click **Verify local anchor** for report-content verification. To demonstrate tampering, use exported insights JSON and anchor proof with `npm run chain:verify -- report.json proof.json`; altering the report should fail verification.

The viewer pages through 200 blocks per request. **Older blocks** reads the preceding range; **Latest blocks** returns to the head. Empty ranges do not mean no anchors exist elsewhere. More than 500 events in a range causes an explicit unavailable response rather than silent truncation. Requests and timers are cancelled on exit/sign-out.

## Meaning and boundaries

Authenticated `GET /api/blockchain/ledger?before=<inclusive block>` checks deployment bytecode, writer, instance and deployment receipt, then validates event receipts, block identities and digest lookups. It returns live metadata or explicit disabled/unavailable status. It does not establish that a private report still exists or recompute its content; per-report verification does that.

Local Hardhat history is disposable. After a reset, redeploy and restart the API. Exported ledger JSON is not permanent chain storage or public attestation. Records do not validate findings or experimental ML conclusions. No Docker, external explorer, public RPC, wallet or SQL migration is needed.

## Design decisions

| Before | After | Why |
|---|---|---|
| Only per-report anchor status | Separate Blockchain ledger navigation | Demonstrate the ledger without cluttering reports |
| Metadata spread across reports | Chronological event view and block links | Explain hashes, transactions and linked blocks together |
| Cached status could confuse viewers | Live reads, checked time and explicit unavailable state | Show the current node state and scope |

Validation results are recorded in `PLAN.md`; no hosted/native Edge certification is claimed.

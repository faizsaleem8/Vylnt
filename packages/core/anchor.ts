export type AnchorStatus = 'queued' | 'submitted' | 'confirmed' | 'failed';
export interface AnchorProof {
  version: 1; reportHash: string; chainId: number; contractAddress: string; instanceId: string;
  status: AnchorStatus; transactionHash?: string; blockNumber?: number; blockHash?: string;
  attempts: number; error?: string;
}
export interface AnchorView { enabled: boolean; proof?: AnchorProof; warning?: string }
export interface LedgerEntry {
  reportHash: string; transactionHash: string; blockNumber: number; blockHash: string;
  parentHash: string; timestamp: number;
}
export interface DemoLedgerView extends LedgerView {
  accounts: { label: string; entries: LedgerEntry[] }[];
}
export interface LedgerView {
  result: 'live' | 'unavailable' | 'disabled'; message: string;
  chainId?: number; contractAddress?: string; instanceId?: string; latestBlock?: number;
  fromBlock?: number; toBlock?: number; nextBefore?: number; checkedAt?: string;
  entries: LedgerEntry[];
}
export interface AnchorVerification {
  result: 'matching' | 'content-mismatch' | 'not-anchored' | 'verification-unavailable';
  message: string; proof?: AnchorProof;
}
export interface ReportFileVerification {
  result: AnchorVerification['result'] | 'not-found' | 'database-matching';
  message: string; contentMatches?: boolean; uploadedHash?: string; savedHash?: string; proof?: AnchorProof;
}

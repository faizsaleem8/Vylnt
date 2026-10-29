import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { Contract, Interface, JsonRpcProvider, Wallet, keccak256, FetchRequest } from 'ethers';
import { z } from 'zod';
import { replaceFile } from './replace-file';
import type { StoredInsightReport } from '../../packages/core/insight-contracts';
import type { AnchorProof, AnchorView, AnchorVerification, LedgerView, LedgerEntry, DemoLedgerView } from '../../packages/core/anchor';
import { verifyFrozenInsights } from '../../packages/ml/frozen-insights';
import {contentHash} from '../../packages/core/integrity';
import type { ProjectPublicKey } from '../../packages/core/project-evidence';
import { readArchivedProjectKeys } from './project-signing';

export const anchorAbi = ['function writer() view returns(address)', 'function instanceId() view returns(bytes32)', 'function anchoredAt(bytes32) view returns(uint256)', 'function anchor(bytes32)', 'event Anchored(bytes32 indexed digest,uint256 blockNumber)'];
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const bytes32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const deploymentSchema = z.object({ version: z.literal(1), rpcUrl: z.string(), chainId: z.literal(31337), address, instanceId: bytes32, writer: address, runtimeHash: bytes32, deploymentTx: bytes32, deploymentBlockHash: bytes32, sourceHash: digest }).strict();
type Deployment = z.infer<typeof deploymentSchema>;
const proofSchema = z.object({ version: z.literal(1), reportHash: digest, chainId: z.literal(31337), contractAddress: address, instanceId: bytes32, status: z.enum(['queued', 'submitted', 'confirmed', 'failed']), transactionHash: bytes32.optional(), blockNumber: z.number().int().positive().optional(), blockHash: bytes32.optional(), attempts: z.number().int().min(0), error: z.string().optional() }).strict();
const jobSchema = z.object({ owner: z.string(), scanId: z.string(), proof: proofSchema, raw: z.string().regex(/^0x[0-9a-fA-F]+$/).optional(), nextAt: z.number().optional() }).strict();
type Job = z.infer<typeof jobSchema>;

export function localRpc(value: string) {
  const u = new URL(value);
  if (u.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new Error('Only credential-free loopback RPC origins are supported');
  return u.origin;
}
function rpc(url: string) {
  const request = new FetchRequest(localRpc(url)); request.timeout = 3000;
  return new JsonRpcProvider(request, undefined, { cacheTimeout: -1, pollingInterval: 500, batchMaxCount: 1 });
}
async function deployment(path: string) { const d = deploymentSchema.parse(JSON.parse(await readFile(path, 'utf8'))); localRpc(d.rpcUrl); return d; }
function unavailable(message = 'The configured local blockchain cannot currently be verified.'): AnchorVerification { return { result: 'verification-unavailable', message }; }
async function checkDeployment(provider: JsonRpcProvider, d: Deployment) {
  if ((await provider.getNetwork()).chainId !== BigInt(d.chainId)) throw new Error('Wrong chain');
  const code = await provider.getCode(d.address);
  if (code === '0x' || keccak256(code) !== d.runtimeHash) throw new Error('Wrong contract bytecode');
  const c = new Contract(d.address, anchorAbi, provider);
  if ((await c.instanceId()) !== d.instanceId || (await c.writer()).toLowerCase() !== d.writer.toLowerCase()) throw new Error('Wrong deployment instance');
  const receipt = await provider.getTransactionReceipt(d.deploymentTx);
  if (!receipt || receipt.status !== 1 || receipt.blockHash !== d.deploymentBlockHash || receipt.contractAddress?.toLowerCase() !== d.address.toLowerCase() || (await provider.getBlock(receipt.blockNumber))?.hash !== receipt.blockHash) throw new Error('Deployment is no longer canonical');
  return c;
}
export async function verifyAnchor(provider: JsonRpcProvider, d: Deployment, proof: AnchorProof): Promise<AnchorVerification> {
  if (proof.chainId !== d.chainId || proof.instanceId !== d.instanceId || proof.contractAddress.toLowerCase() !== d.address.toLowerCase()) return unavailable('This proof belongs to another local deployment.');
  try {
    const c = await checkDeployment(provider, d);
    if (!proof.transactionHash) return { result: 'not-anchored', message: 'No confirmed anchor transaction is recorded.', proof };
    const receipt = await provider.getTransactionReceipt(proof.transactionHash);
    if (!receipt) return unavailable('The transaction is pending or absent from this local chain.');
    const block = await provider.getBlock(receipt.blockNumber);
    const recordedBlock = Number(await c.anchoredAt('0x' + proof.reportHash));
    const event = receipt.logs.filter(l => l.address.toLowerCase() === d.address.toLowerCase()).some(log => {
      try { const e = new Interface(anchorAbi).parseLog(log); return e?.name === 'Anchored' && e.args.digest.toLowerCase() === '0x' + proof.reportHash && Number(e.args.blockNumber) === receipt.blockNumber; } catch { return false; }
    });
    if (receipt.status !== 1 || receipt.to?.toLowerCase() !== d.address.toLowerCase() || receipt.from.toLowerCase() !== d.writer.toLowerCase() || block?.hash !== receipt.blockHash || !event || recordedBlock !== receipt.blockNumber || (proof.blockHash && proof.blockHash !== receipt.blockHash) || (proof.blockNumber && proof.blockNumber !== receipt.blockNumber)) return unavailable('Receipt, event, block or contract lookup does not match the proof.');
    return { result: 'matching', message: 'Frozen JSON matches an anchor on this local blockchain. This does not establish scan truth or ML accuracy.', proof: { ...proof, status: 'confirmed', blockNumber: receipt.blockNumber, blockHash: receipt.blockHash } };
  } catch { return unavailable(); }
}
export async function verifyExport(report: StoredInsightReport, supplied: unknown, manifest: string,projectKeysFile?:string): Promise<AnchorVerification> {
  try {
    const proof = proofSchema.parse(supplied);
    try{
      if(report.id!==report.hash||await contentHash(report.content)!==report.hash||proof.reportHash!==report.hash)return {result:'content-mismatch',message:'Exported report content or identity has changed.'};
    }catch{return {result:'content-mismatch',message:'Exported report content is malformed or unsupported.'};}
    let keys:readonly ProjectPublicKey[]=[];
    if(report.content?.version==='vylnt-frozen-insights-v2'){
      try{keys=await readArchivedProjectKeys(projectKeysFile);}catch{return unavailable('Trusted project public-key archive is unavailable.');}
      const keyId=report.content.project?.seal.keyId;
      if(!keys.some(k=>k.keyId===keyId))return unavailable('The project signing key is not in the trusted installation archive.');
    }
    try {
      if (!await verifyFrozenInsights(report,keys) || proof.reportHash !== report.hash) return { result: 'content-mismatch', message: 'Exported report content or identity has changed.' };
    } catch { return { result: 'content-mismatch', message: 'Exported report content is malformed or unsupported.' }; }
    const d = await deployment(manifest), provider = rpc(d.rpcUrl);
    try { return await verifyAnchor(provider, d, proof); } finally { provider.destroy(); }
  } catch { return unavailable('Invalid proof, unavailable deployment or unsupported report.'); }
}

/** Single-process, single-writer local journal. No user tokens or scan content are persisted. */
export class AnchorService {
  private jobs: Job[] = [];
  private tail: Promise<unknown> = Promise.resolve();
  private timer?: ReturnType<typeof setInterval>;
  private stopped = false;
  private constructor(private path: string, private d: Deployment, private provider: JsonRpcProvider, private wallet: Wallet) {}
  static async open(options: { journal?: string; manifest?: string; signer?: string; autoStart?: boolean } = {}) {
    const d = await deployment(options.manifest ?? '.local/blockchain/deployment.json');
    const provider = rpc(d.rpcUrl);
    try {
      const key = z.object({ privateKey: bytes32 }).strict().parse(JSON.parse(await readFile(options.signer ?? '.local/blockchain/signer.json', 'utf8')));
      const wallet = new Wallet(key.privateKey, provider);
      if (wallet.address.toLowerCase() !== d.writer.toLowerCase()) throw new Error('Local signer mismatch');
      const s = new AnchorService(options.journal ?? '.local/blockchain/anchors.json', d, provider, wallet);
      try { s.jobs = z.object({ version: z.literal(1), jobs: z.array(jobSchema).max(10000) }).strict().parse(JSON.parse(await readFile(s.path, 'utf8'))).jobs; }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      if (options.autoStart !== false) { s.timer = setInterval(() => { void s.tick().catch(() => {}); }, 2000); s.timer.unref(); }
      return s;
    } catch (e) { provider.destroy(); throw e; }
  }
  private serial<T>(work: () => Promise<T>): Promise<T> { const next = this.tail.then(work); this.tail = next.catch(() => {}); return next; }
  private async save() {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path + '.tmp', JSON.stringify({ version: 1, jobs: this.jobs }), { mode: 0o600 });
    await replaceFile(this.path + '.tmp', this.path);
  }
  private find(owner: string, id: string) { return this.jobs.find(j => j.owner === owner && j.proof.reportHash === id && j.proof.instanceId === this.d.instanceId); }
  async enqueue(owner: string, report: StoredInsightReport,keys:readonly ProjectPublicKey[]=[]): Promise<AnchorView> {
    if (!await verifyFrozenInsights(report,keys,owner)) throw new Error('Untrusted report');
    return this.serial(async () => {
      let job = this.find(owner, report.hash);
      if (!job) {
        if (this.jobs.length >= 10000) throw new Error('Local anchor journal is full');
        job = { owner, scanId: report.content.originalScan.scanId, proof: { version: 1, reportHash: report.hash, chainId: this.d.chainId, contractAddress: this.d.address, instanceId: this.d.instanceId, status: 'queued', attempts: 0 } };
        this.jobs.push(job);
        try { await this.save(); } catch (e) { this.jobs.pop(); throw e; }
      }
      return { enabled: true, proof: structuredClone(job.proof) };
    });
  }
  async status(owner: string, id: string): Promise<AnchorView> {
    return this.serial(async () => ({ enabled: true, proof: structuredClone(this.find(owner, id)?.proof ?? [...this.jobs].reverse().find(j => j.owner === owner && j.proof.reportHash === id)?.proof) }));
  }
  /** Contract-wide public digest events, not private journal rows or report verification. */
  async ledger(before?: number): Promise<LedgerView> {
    try {
      const contract = await checkDeployment(this.provider, this.d);
      const latestBlock = await this.provider.getBlockNumber();
      const toBlock = Math.min(before ?? latestBlock, latestBlock);
      const fromBlock = Math.max(0, toBlock - 199);
      const logs = await this.provider.getLogs({ address: this.d.address, topics: [new Interface(anchorAbi).getEvent('Anchored')!.topicHash], fromBlock, toBlock });
      if (logs.length > 500) throw new Error('Ledger range too dense');
      const entries: LedgerEntry[] = [];
      for (const log of logs) {
        const event = new Interface(anchorAbi).parseLog(log);
        if (!event || Number(event.args.blockNumber) !== log.blockNumber) throw new Error('Invalid event');
        const block = await this.provider.getBlock(log.blockNumber);
        const receipt = await this.provider.getTransactionReceipt(log.transactionHash);
        if (!block || block.hash !== log.blockHash || !receipt || receipt.status !== 1 || receipt.blockHash !== block.hash || receipt.to?.toLowerCase() !== this.d.address.toLowerCase() || receipt.from.toLowerCase() !== this.d.writer.toLowerCase() || Number(await contract.anchoredAt(event.args.digest)) !== log.blockNumber) throw new Error('Ledger changed');
        entries.push({ reportHash: String(event.args.digest).slice(2).toLowerCase(), transactionHash: log.transactionHash, blockNumber: log.blockNumber, blockHash: block.hash, parentHash: block.parentHash, timestamp: block.timestamp });
      }
      // Recheck the environment and final event block to reject a reset/reorg during the read.
      await checkDeployment(this.provider, this.d);
      if (logs.length && (await this.provider.getBlock(entries[entries.length - 1].blockNumber))?.hash !== entries[entries.length - 1].blockHash) throw new Error('Ledger changed');
      return { result: 'live', message: 'Live contract events checked against receipts, blocks and digest lookups. This is not report-content verification.', chainId: this.d.chainId, contractAddress: this.d.address, instanceId: this.d.instanceId, latestBlock, fromBlock, toBlock, ...(fromBlock > 0 ? { nextBefore: fromBlock - 1 } : {}), checkedAt: new Date().toISOString(), entries: entries.reverse() };
    } catch {
      return { result: 'unavailable', message: 'The local node or configured deployment is unavailable or changed. Start the node; after a reset, redeploy and restart the API.', entries: [] };
    }
  }
  async retry(owner: string, report: StoredInsightReport,keys:readonly ProjectPublicKey[]=[]) {
    await this.enqueue(owner, report,keys);
    return this.serial(async () => {
      const j = this.find(owner, report.hash)!;
      if (j.proof.status === 'failed') { j.proof.status = j.raw ? 'submitted' : 'queued'; j.proof.attempts = 0; delete j.proof.error; delete j.nextAt; await this.save(); }
      return { enabled: true, proof: structuredClone(j.proof) };
    });
  }
  async demoLedger(before?: number): Promise<DemoLedgerView> {
    const live = await this.ledger(before);
    if (live.result !== 'live') return { ...live, accounts: [] };
    const jobs = await this.serial(async () => this.jobs.filter(job => job.proof.instanceId === this.d.instanceId).map(job => ({ owner: job.owner, hash: job.proof.reportHash })));
    const groups = new Map<string, LedgerEntry[]>();
    for (const job of jobs) {
      const label = 'Account ' + createHash('sha256').update(this.d.instanceId + ':' + job.owner).digest('hex').slice(0, 8).toUpperCase();
      if (!groups.has(label)) groups.set(label, []);
      const entry = live.entries.find(entry => entry.reportHash === job.hash);
      if (entry && !groups.get(label)!.some(row => row.reportHash === entry.reportHash)) groups.get(label)!.push(entry);
    }
    const known = new Set(jobs.map(job => job.hash));
    const unknown = live.entries.filter(entry => !known.has(entry.reportHash));
    if (unknown.length) groups.set('Unassigned on-chain anchors', unknown);
    return { ...live, accounts: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, entries]) => ({ label, entries: entries.sort((a, b) => a.blockNumber - b.blockNumber) })) };
  }
  async cancel(owner: string, scanId: string) {
    return this.cancelScans(owner, [scanId]);
  }
  async cancelScans(owner: string, ids: string[]) {
    const selected = new Set(ids);
    return this.serial(async () => { this.jobs = this.jobs.filter(j => !(j.owner === owner && selected.has(j.scanId) && (j.proof.status === 'queued' || (j.proof.status === 'failed' && !j.raw)))); await this.save(); });
  }
  async verify(owner: string, report: StoredInsightReport,keys:readonly ProjectPublicKey[]=[]): Promise<AnchorVerification> {
    if (!await verifyFrozenInsights(report,keys,owner)) return { result: 'content-mismatch', message: 'Frozen report content no longer matches trusted derivation.' };
    const view = await this.status(owner, report.hash);
    if (!view.proof) return { result: 'not-anchored', message: 'This saved version has not been queued for anchoring.' };
    return verifyAnchor(this.provider, this.d, view.proof);
  }
  async tick() {
    return this.serial(async () => {
      if (this.stopped) return;
      const j = this.jobs.find(j => j.proof.instanceId === this.d.instanceId && ['queued', 'submitted'].includes(j.proof.status) && (j.nextAt ?? 0) <= Date.now());
      if (!j) return;
      try {
        const contract = await checkDeployment(this.provider, this.d);
        const previous = this.jobs.find(p => p !== j && p.proof.reportHash === j.proof.reportHash && p.proof.instanceId === this.d.instanceId && p.proof.status === 'confirmed');
        if (previous) {
          const checked = await verifyAnchor(this.provider, this.d, previous.proof);
          if (checked.result !== 'matching') throw new Error('Prior anchor unavailable');
          j.proof = proofSchema.parse({ ...checked.proof!, attempts: j.proof.attempts }); await this.save(); return;
        }
        // Reconcile a broadcast transaction before any attempt to allocate a new nonce.
        if (j.proof.transactionHash) {
          const receipt = await this.provider.getTransactionReceipt(j.proof.transactionHash);
          if (receipt) {
            const checked = await verifyAnchor(this.provider, this.d, j.proof);
            if (checked.result !== 'matching') throw new Error('Anchor receipt failed verification');
            j.proof = proofSchema.parse(checked.proof); delete j.raw; delete j.nextAt; delete j.proof.error; await this.save(); return;
          }
        }
        if (!j.raw) {
          // A pre-existing mapping without this journal's event/receipt is not adopted as proof.
          if (Number(await contract.anchoredAt('0x' + j.proof.reportHash)) !== 0) throw new Error('Anchor exists but its receipt is absent from the local journal');
          const tx = await this.wallet.populateTransaction({ to: this.d.address, data: new Interface(anchorAbi).encodeFunctionData('anchor', ['0x' + j.proof.reportHash]), nonce: await this.provider.getTransactionCount(this.wallet.address, 'pending') });
          j.raw = await this.wallet.signTransaction(tx); j.proof.transactionHash = keccak256(j.raw);
          await this.save(); // Persist signed bytes before any broadcast.
        }
        j.proof.status = 'submitted'; await this.save();
        try { await this.provider.broadcastTransaction(j.raw); }
        catch (e) { if (!await this.provider.getTransaction(j.proof.transactionHash!)) throw e; }
        j.nextAt = Date.now() + 2000; await this.save();
      } catch {
        j.proof.attempts++;
        j.proof.error = 'Local blockchain operation unavailable. Check the node and deployment; retry after recovery.';
        if (j.proof.attempts >= 5) j.proof.status = 'failed';
        j.nextAt = Date.now() + Math.min(30000, 1000 * 2 ** j.proof.attempts);
        await this.save();
      }
    });
  }
  async close() { this.stopped = true; clearInterval(this.timer); await this.tail; this.provider.destroy(); }
}

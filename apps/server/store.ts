import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { Report } from '../../packages/core';
import { canonicalJson } from '../../packages/core/integrity';
import type { Feedback, FeedbackInput } from '../../packages/core/validation';

export interface Identity { ownerId: string; token: string }
export interface StoredScan { report: Report; hash: string; receivedAt: string; feedback: Feedback[] }
export interface Store {
  list(identity: Identity): Promise<StoredScan[]>;
  get(identity: Identity, id: string): Promise<StoredScan | undefined>;
  put(identity: Identity, report: Report): Promise<{ scan: StoredScan; created: boolean }>;
  feedback(identity: Identity, id: string, findingId: string, input: FeedbackInput): Promise<Feedback | undefined>;
  remove(identity: Identity, id: string): Promise<boolean>;
}
export class ConflictError extends Error {}
export const reportHash = (report: Report) => createHash('sha256').update(canonicalJson(report)).digest('hex');

interface FileData { version: 1; owners: Record<string, StoredScan[]> }
export class FileStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private path?: string) {}
  private memory: FileData = { version: 1, owners: {} };
  private async read(): Promise<FileData> {
    if (!this.path) return structuredClone(this.memory);
    try {
      const data = JSON.parse(await readFile(this.path, 'utf8')) as FileData;
      if (data.version !== 1 || !data.owners) throw new Error('Unsupported local store format');
      return data;
    } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, owners: {} }; throw e; }
  }
  private async write(data: FileData) {
    if (!this.path) { this.memory = structuredClone(data); return; }
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(`${this.path}.tmp`, JSON.stringify(data), { mode: 0o600 });
    await rename(`${this.path}.tmp`, this.path);
  }
  private transaction<T>(work: (data: FileData) => Promise<T> | T, write = false): Promise<T> {
    const next = this.queue.then(async () => { const data = await this.read(); const result = await work(data); if (write) await this.write(data); return structuredClone(result); });
    this.queue = next.catch(() => {}); return next;
  }
  list(identity: Identity) { return this.transaction(data => [...(data.owners[identity.ownerId] ?? [])].sort((a, b) => b.report.observation.scannedAt.localeCompare(a.report.observation.scannedAt))); }
  get(identity: Identity, id: string) { return this.transaction(data => data.owners[identity.ownerId]?.find(s => s.report.scanId === id)); }
  put(identity: Identity, report: Report) {
    return this.transaction(data => {
      const rows = data.owners[identity.ownerId] ??= [];
      const existing = rows.find(s => s.report.scanId === report.scanId);
      const hash = reportHash(report);
      if (existing) { if (existing.hash !== hash) throw new ConflictError('This scan ID is finalized. Rescan to submit a new snapshot.'); return { scan: existing, created: false }; }
      if (rows.length >= 1000) throw new ConflictError('Local storage limit reached (1000 scans). Delete older scans before uploading.');
      const scan: StoredScan = { report, hash, receivedAt: new Date().toISOString(), feedback: [] };
      rows.push(scan); return { scan, created: true };
    }, true);
  }
  feedback(identity: Identity, id: string, findingId: string, input: FeedbackInput) {
    return this.transaction(data => {
      const scan = data.owners[identity.ownerId]?.find(s => s.report.scanId === id);
      if (!scan?.report.findings.some(f => f.id === findingId)) return;
      const feedback = { ...input, findingId, updatedAt: new Date().toISOString() };
      scan.feedback = [...scan.feedback.filter(f => f.findingId !== findingId), feedback]; return feedback;
    }, true);
  }
  remove(identity: Identity, id: string) {
    return this.transaction(data => {
      const rows = data.owners[identity.ownerId] ?? [];
      data.owners[identity.ownerId] = rows.filter(s => s.report.scanId !== id);
      return rows.length !== data.owners[identity.ownerId].length;
    }, true);
  }
}

// Forward the verified user's JWT so PostgreSQL RLS is enforced; never use a service-role key.
export class SupabaseStore implements Store {
  constructor(private url: string, private anonKey: string) {}
  private async request(identity: Identity, path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.url}/rest/v1/${path}`, { ...init, signal: AbortSignal.timeout(10000),
      headers: { apikey: this.anonKey, Authorization: `Bearer ${identity.token}`, 'Content-Type': 'application/json', ...init.headers } });
    if (!response.ok) {
      if (response.status === 409) throw new ConflictError('This scan ID is finalized. Rescan to submit a new snapshot.');
      throw new Error(`Database request failed (${response.status})`);
    }
    const body = await response.text();
    return body ? JSON.parse(body) : undefined;
  }
  private map(row: any): StoredScan { return { report: row.report, hash: row.report_hash, receivedAt: row.received_at, feedback: (row.feedback ?? []).map((f: any) => ({ findingId: f.finding_id, verdict: f.verdict, notes: f.notes, updatedAt: f.updated_at })) }; }
  async list(identity: Identity): Promise<StoredScan[]> {
    const rows = await this.request(identity, 'scans?select=report,report_hash,received_at,feedback(*)&order=scanned_at.desc&limit=1000'); return rows.map((r: any) => this.map(r));
  }
  async get(identity: Identity, id: string) {
    const rows = await this.request(identity, `scans?scan_id=eq.${encodeURIComponent(id)}&select=report,report_hash,received_at,feedback(*)`);
    return rows[0] ? this.map(rows[0]) : undefined;
  }
  async put(identity: Identity, report: Report) {
    const created = await this.request(identity, 'rpc/ingest_scan', { method: 'POST', body: JSON.stringify({ p_report: report, p_hash: reportHash(report) }) });
    const scan = await this.get(identity, report.scanId); if (!scan) throw new Error('Database did not return saved scan');
    return { scan, created: Boolean(created) };
  }
  async feedback(identity: Identity, id: string, findingId: string, input: FeedbackInput) {
    const scan = await this.get(identity, id); if (!scan?.report.findings.some(f => f.id === findingId)) return;
    const updatedAt = new Date().toISOString();
    await this.request(identity, 'feedback?on_conflict=owner_id,scan_id,finding_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ owner_id: identity.ownerId, scan_id: id, finding_id: findingId, ...input, updated_at: updatedAt }) });
    return { ...input, findingId, updatedAt };
  }
  async remove(identity: Identity, id: string) {
    const rows = await this.request(identity, `scans?scan_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } }); return rows.length > 0;
  }
}

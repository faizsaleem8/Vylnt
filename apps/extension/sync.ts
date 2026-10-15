import type { Report } from '../../packages/core';

export type SyncState = 'preparing' | 'saving' | 'retrying' | 'failed' | 'saved';
export interface ScanSyncStatus { readonly state: SyncState; readonly text: string; readonly attempts: number }
export interface SyncSnapshot {
  readonly pending: number;
  readonly failed: number;
  readonly saved: number;
  readonly queueFull: boolean;
  readonly scans: readonly (ScanSyncStatus & { readonly scanId: string })[];
}
interface Job {
  report: Report; fingerprint: string; first: number; changed: number; attempts: number; next: number;
  frozen: boolean; done: boolean; adopted?: boolean; state: SyncState; text: string; error?: string;
}
const preparing = 'Preparing scan for sync. Waiting up to 10 seconds for page metadata.';
export class SyncFailure extends Error {
  constructor(message: string, readonly retryable = true) { super(message); }
}
/** One immutable snapshot per navigation. Queue and credentials never persist to disk. */
export class ScanSync {
  private jobs = new Map<string, Job>();
  private running = false;
  private stopped = false;
  private paused = false;
  private queueFull = false;
  private activeJob: Job | undefined;
  private lastStatus = '';
  constructor(private since: number, private upload: (report: Report) => Promise<void>, private status: (text: string) => void) {}
  stop() { this.stopped = true; this.jobs.clear(); this.queueFull = false; this.lastStatus = ''; }
  setPaused(value: boolean) { this.paused = value; }
  /** A detached status for the browser's original scan ID, including an adopted pre-login scan. */
  statusFor(scanId: string): ScanSyncStatus | undefined {
    const job = this.jobs.get(scanId);
    return job ? { state: job.state, text: job.text, attempts: job.attempts } : undefined;
  }
  /** Counts cover this panel's bounded queue, not the workspace's complete saved history. */
  snapshot(): SyncSnapshot {
    const scans = [...this.jobs].map(([scanId, job]) => ({ scanId, state: job.state, text: job.text, attempts: job.attempts }));
    return {
      pending: scans.filter(scan => scan.state === 'preparing' || scan.state === 'saving').length,
      failed: scans.filter(scan => scan.state === 'failed' || scan.state === 'retrying').length,
      saved: scans.filter(scan => scan.state === 'saved').length,
      queueFull: this.queueFull,
      scans,
    };
  }
  private publish() {
    if (this.stopped) return;
    const snapshot = this.snapshot();
    // An unresolved failure takes precedence even while another scan prepares or saves.
    const relevant = snapshot.scans.find(scan => scan.state === 'failed' || scan.state === 'retrying')
      ?? snapshot.scans.find(scan => scan.state === 'saving')
      ?? snapshot.scans.find(scan => scan.state === 'preparing')
      ?? snapshot.scans.at(-1);
    let text = relevant?.text ?? '';
    if (snapshot.scans.length > 1) text += ` ${snapshot.saved} saved · ${snapshot.pending} pending · ${snapshot.failed} failed in this panel.`;
    if (snapshot.queueFull) text += (text ? ' ' : '') + 'Sync queue full. Retry failed scans before continuing.';
    if (text && text !== this.lastStatus) { this.lastStatus = text; this.status(text); }
  }
  includeCurrent(report: Report, now = Date.now()) {
    if (this.stopped) return;
    if (this.jobs.has(report.scanId)) return;
    if (this.jobs.size >= 30) { this.queueFull = true; this.publish(); return; }
    // A pre-login current scan gets a fresh upload identity; other old history stays excluded.
    const snapshot = structuredClone(report);
    snapshot.scanId = crypto.randomUUID();
    this.jobs.set(report.scanId, { report: snapshot, fingerprint: JSON.stringify(report.observation), first: now, changed: now, attempts: 0, next: 0, frozen: false, done: false, adopted: true, state: 'preparing', text: preparing });
    this.publish();
  }
  retry() {
    for (const job of this.jobs.values()) if (!job.done && job !== this.activeJob) {
      job.attempts = 0; job.next = 0;
      if (job.error) { job.state = 'retrying'; job.text = 'Retry requested. Previous attempt failed: ' + job.error; }
    }
    this.publish();
  }
  async tick(reports: Report[], now = Date.now()) {
    if (this.stopped || this.paused || this.running) return;
    this.running = true;
    try {
      const present = new Set(reports.map(r => r.scanId));
      for (const [id, job] of this.jobs) if (job.done && !present.has(id)) this.jobs.delete(id);
      this.queueFull = false;
      for (const report of reports) {
        const old = this.jobs.get(report.scanId);
        if (Date.parse(report.observation.scannedAt) < this.since && !old?.adopted) continue;
        if (old?.frozen || old?.done) continue;
        const fingerprint = JSON.stringify(report.observation);
        if (!old && this.jobs.size >= 30) { this.queueFull = true; continue; }
        if (!old || old.fingerprint !== fingerprint) {
          const snapshot = structuredClone(report);
          if (old?.adopted) snapshot.scanId = old.report.scanId;
          this.jobs.set(report.scanId, { report: snapshot, fingerprint, first: old?.first ?? now, changed: now, attempts: 0, next: 0, frozen: false, done: false, adopted: old?.adopted, state: 'preparing', text: preparing });
        }
      }
      this.publish();
      for (const job of this.jobs.values()) {
        if (this.stopped || this.paused) break;
        if (job.done || job.attempts >= 5 || now < job.next || (!job.frozen && now - job.first < 10000 && (!job.report.observation.domCollected || now - job.changed < 2000))) continue;
        job.frozen = true; job.attempts++; this.activeJob = job;
        job.state = job.error ? 'retrying' : 'saving';
        job.text = job.error ? 'Retrying scan. Previous attempt failed: ' + job.error : 'Saving scan to your workspace…';
        this.publish();
        try {
          await this.upload(structuredClone(job.report));
          if (this.stopped) break;
          job.done = true; job.state = 'saved'; job.error = undefined;
          job.text = 'Scan saved automatically. Available in Saved scans.' + (!job.report.observation.domCollected ? ' Partial coverage: page DOM was not observed.' : '');
          this.publish();
        } catch (error) {
          if (this.stopped) break;
          const reason = error instanceof Error && error.message ? error.message : 'Workspace request failed.';
          job.error = reason;
          if (error instanceof SyncFailure && !error.retryable) {
            job.next = Infinity; job.state = 'failed'; job.text = 'Scan not saved. ' + reason; this.publish(); continue;
          }
          job.next = now + Math.min(60000, 5000 * 2 ** (job.attempts - 1));
          job.state = job.attempts >= 5 ? 'failed' : 'retrying';
          job.text = (job.attempts >= 5 ? 'Sync stopped after five attempts. Select Retry sync. ' : 'Sync failed. Retrying automatically; keep this panel open. ') + reason;
          this.publish();
        } finally { this.activeJob = undefined; }
      }
    } finally { this.running = false; }
  }
}

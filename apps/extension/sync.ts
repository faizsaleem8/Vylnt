import type { Report } from '../../packages/core';

interface Job { report: Report; fingerprint: string; first: number; changed: number; attempts: number; next: number; frozen: boolean; done: boolean; adopted?: boolean }
export class SyncFailure extends Error {
  constructor(message: string, readonly retryable = true) { super(message); }
}
/** One immutable snapshot per navigation. Queue and credentials never persist to disk. */
export class ScanSync {
  private jobs = new Map<string, Job>();
  private running = false;
  private stopped = false;
  private paused = false;
  constructor(private since: number, private upload: (report: Report) => Promise<void>, private status: (text: string) => void) {}
  stop() { this.stopped = true; this.jobs.clear(); }
  setPaused(value: boolean) { this.paused = value; }
  includeCurrent(report: Report, now = Date.now()) {
    if (this.stopped) return;
    // A pre-login current scan gets a fresh upload identity; other old history stays excluded.
    const snapshot = structuredClone(report);
    snapshot.scanId = crypto.randomUUID();
    this.jobs.set(report.scanId, { report: snapshot, fingerprint: JSON.stringify(report.observation), first: now, changed: now, attempts: 0, next: 0, frozen: false, done: false, adopted: true });
  }
  retry() { for (const job of this.jobs.values()) if (!job.done) { job.attempts = 0; job.next = 0; } }
  async tick(reports: Report[], now = Date.now()) {
    if (this.stopped || this.paused || this.running) return;
    this.running = true;
    try {
      const present = new Set(reports.map(r => r.scanId));
      for (const [id, job] of this.jobs) if (job.done && !present.has(id)) this.jobs.delete(id);
      for (const report of reports) {
        const old = this.jobs.get(report.scanId);
        if (Date.parse(report.observation.scannedAt) < this.since && !old?.adopted) continue;
        if (old?.frozen || old?.done) continue;
        const fingerprint = JSON.stringify(report.observation);
        if (!old && this.jobs.size >= 30) { this.status('Sync queue full. Retry failed scans before continuing.'); continue; }
        if (!old || old.fingerprint !== fingerprint) {
          const snapshot = structuredClone(report);
          if (old?.adopted) snapshot.scanId = old.report.scanId;
          this.jobs.set(report.scanId, { report: snapshot, fingerprint, first: old?.first ?? now, changed: now, attempts: 0, next: 0, frozen: false, done: false, adopted: old?.adopted });
          if (!old) this.status('Preparing scan for sync. Waiting up to 10 seconds for page metadata.');
        }
      }
      for (const job of this.jobs.values()) {
        if (this.stopped || this.paused) break;
        if (job.done || job.attempts >= 5 || now < job.next || (!job.frozen && now - job.first < 10000 && (!job.report.observation.domCollected || now - job.changed < 2000))) continue;
        job.frozen = true; job.attempts++;
        this.status('Saving scan to your workspace…');
        try {
          await this.upload(structuredClone(job.report));
          if (this.stopped) break;
          job.done = true; this.status('Scan saved automatically. Available in Saved scans.' + (!job.report.observation.domCollected ? ' Partial coverage: page DOM was not observed.' : ''));
        } catch (error) {
          if (this.stopped) break;
          const reason = error instanceof Error ? error.message : 'Workspace request failed.';
          if (error instanceof SyncFailure && !error.retryable) {
            job.attempts = 5; this.status('Scan not saved. ' + reason); continue;
          }
          job.next = now + Math.min(60000, 5000 * 2 ** (job.attempts - 1));
          this.status((job.attempts >= 5 ? 'Sync stopped after five attempts. Select Retry sync. ' : 'Sync failed. Retrying automatically; keep this panel open. ') + reason);
        }
      }
    } finally { this.running = false; }
  }
}

import { describe, expect, it, vi } from 'vitest';
import { createReport } from '../packages/core';
import { ScanSync, SyncFailure } from '../apps/extension/sync';

const report = (time = 1000, id = 'one') => createReport(id, { url: 'https://example.test/', scannedAt: new Date(time).toISOString(), domCollected: true, scripts: [], resources: [] });
describe('automatic immutable scan syncing', () => {
  it('never retries a terminal oversized snapshot, while new scans and recoverable failures still progress', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new SyncFailure('Report exceeds storage limit. Export JSON.', false, undefined, false)).mockResolvedValue(undefined);
    const sync = new ScanSync(0, upload, vi.fn());
    const first = report(), next = report(4000, 'next');
    await sync.tick([first], 1000); await sync.tick([first], 3000);
    sync.retry(); await sync.tick([first], 100000); sync.retry(); await sync.tick([first], 200000);
    expect(upload).toHaveBeenCalledOnce(); expect(sync.statusFor('one')).toMatchObject({ state: 'failed', attempts: 1 });
    await sync.tick([first, next], 200001); await sync.tick([first, next], 202001);
    expect(upload).toHaveBeenCalledTimes(2); expect(sync.statusFor('next')?.state).toBe('saved');
    expect(sync.snapshot()).toMatchObject({ failed: 1, saved: 1 });
  });
  it('honors a server cooldown across the entire queue, even after Retry sync, and recovers with the frozen snapshot', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new SyncFailure('Wait 30 seconds.', true, 33000)).mockResolvedValue(undefined);
    const sync = new ScanSync(0, upload, vi.fn()); const first = report(), second = report(1000, 'two');
    await sync.tick([first, second], 1000); await sync.tick([first, second], 3000);
    expect(upload).toHaveBeenCalledTimes(1); expect(sync.statusFor('two')?.attempts).toBe(0);
    first.observation.resources.push({ url: 'https://example.test/later.js', type: 'script', outcome: 'referenced' });
    sync.retry(); await sync.tick([first, second], 8000); await sync.tick([first, second], 32999);
    expect(upload).toHaveBeenCalledTimes(1);
    await sync.tick([first, second], 33000);
    expect(upload).toHaveBeenCalledTimes(3); expect(upload.mock.calls[0][0]).toEqual(upload.mock.calls[1][0]);
    expect(sync.snapshot()).toMatchObject({ saved: 2, failed: 0 });
  });
  it('uses the response deadline even if the server responds long after a tick begins', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new SyncFailure('Wait after response.', true, 45000)).mockResolvedValue(undefined);
    const sync = new ScanSync(0, upload, vi.fn());
    await sync.tick([report()], 1000); await sync.tick([report()], 3000);
    await sync.tick([report()], 33000); expect(upload).toHaveBeenCalledTimes(1);
    await sync.tick([report()], 45000); expect(upload).toHaveBeenCalledTimes(2);
  });
  it('requires reconnecting after an excessive wait and clears the old account cooldown on stop', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new SyncFailure('Reconnect later.', false, Infinity)).mockResolvedValue(undefined);
    const sync = new ScanSync(0, upload, vi.fn());
    await sync.tick([report()], 1000); await sync.tick([report()], 3000); sync.retry();
    await sync.tick([report(), report(4000, 'two')], 99999999); expect(upload).toHaveBeenCalledTimes(1);
    sync.stop();
    const next = new ScanSync(0, upload, vi.fn()); await next.tick([report()], 100000000); await next.tick([report()], 100002000);
    expect(upload).toHaveBeenCalledTimes(2);
  });
  it('includes only the current pre-login scan with a new immutable upload identity', async () => {
    const upload = vi.fn().mockResolvedValue(undefined); const sync = new ScanSync(5000, upload, vi.fn());
    const current = report(1000, 'current'); const other = report(1000, 'other-account-history');
    sync.includeCurrent(current, 5000);
    await sync.tick([current, other], 5000); await sync.tick([current, other], 7000);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0].scanId).not.toBe(current.scanId);
    expect(upload.mock.calls[0][0].observation).toEqual(current.observation);
    await sync.tick([current, other], 20000); expect(upload).toHaveBeenCalledTimes(1);
  });
  it('saves a partial scan after a bounded wait instead of requiring DOM forever', async () => {
    const upload = vi.fn().mockResolvedValue(undefined); const status = vi.fn();
    const sync = new ScanSync(0, upload, status); const partial = report(); partial.observation.domCollected = false;
    await sync.tick([partial], 1000); await sync.tick([partial], 10999); expect(upload).not.toHaveBeenCalled();
    await sync.tick([partial], 11000);
    expect(upload).toHaveBeenCalledTimes(1); expect(upload.mock.calls[0][0].observation.domCollected).toBe(false);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('Partial coverage'));
  });
  it('shows actionable permanent errors and stops automatic retry until requested', async () => {
    const upload = vi.fn().mockRejectedValue(new SyncFailure('Sign in again.', false)); const status = vi.fn();
    const sync = new ScanSync(0, upload, status);
    await sync.tick([report()], 1000); await sync.tick([report()], 3000); await sync.tick([report()], 90000);
    expect(upload).toHaveBeenCalledTimes(1); expect(status).toHaveBeenLastCalledWith('Scan not saved. Sign in again.');
    sync.retry(); await sync.tick([report()], 90001); expect(upload).toHaveBeenCalledTimes(2);
  });
  it('pauses between uploads without dropping queued snapshots', async () => {
    let finish!: () => void;
    const upload = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
    const sync = new ScanSync(0, upload, vi.fn()); const reports = [report(1000, 'one'), report(1000, 'two')];
    await sync.tick(reports, 1000);
    const pending = sync.tick(reports, 3000); sync.setPaused(true); finish(); await pending;
    await sync.tick(reports, 5000); expect(upload).toHaveBeenCalledTimes(1);
    sync.setPaused(false); await sync.tick(reports, 6000); expect(upload).toHaveBeenCalledTimes(2);
  });
  it('excludes scans before login and waits for DOM and settling', async () => {
    const upload = vi.fn().mockResolvedValue(undefined); const sync = new ScanSync(1000, upload, vi.fn());
    const current = report(); current.observation.domCollected = false;
    await sync.tick([report(999), current], 1000); await sync.tick([report(999), current], 5000);
    expect(upload).not.toHaveBeenCalled();
    current.observation.domCollected = true;
    await sync.tick([current], 6000); await sync.tick([current], 7999); expect(upload).not.toHaveBeenCalled();
    await sync.tick([current], 8000); await sync.tick([current], 10000);
    expect(upload).toHaveBeenCalledTimes(1);
  });
  it('retries the exact frozen snapshot and does not reupload late DOM changes', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const sync = new ScanSync(0, upload, vi.fn()); const current = report();
    await sync.tick([current], 1000); await sync.tick([current], 3000);
    current.observation.scripts.push({ url: 'https://example.test/late.js', integrity: false });
    await sync.tick([current], 7999); expect(upload).toHaveBeenCalledTimes(1);
    await sync.tick([current], 8000); await sync.tick([current], 15000);
    expect(upload).toHaveBeenCalledTimes(2); expect(upload.mock.calls[0][0]).toEqual(upload.mock.calls[1][0]);
    expect(upload.mock.calls[0][0].observation.scripts).toEqual([]);
  });
  it('caps retries and lets the user restart failed work', async () => {
    const upload = vi.fn().mockRejectedValue(new Error('offline')); const sync = new ScanSync(0, upload, vi.fn());
    await sync.tick([report()], 0);
    for (const now of [2000, 7000, 17000, 37000, 77000, 200000]) await sync.tick([report()], now);
    expect(upload).toHaveBeenCalledTimes(5);
    sync.retry(); await sync.tick([report()], 200001); expect(upload).toHaveBeenCalledTimes(6);
  });
  it('stops old account jobs and excludes previous scans from a new account', async () => {
    const upload = vi.fn().mockResolvedValue(undefined); const sync = new ScanSync(0, upload, vi.fn());
    await sync.tick([report()], 1000); sync.stop(); await sync.tick([report()], 5000);
    const next = new ScanSync(6000, upload, vi.fn());
    await next.tick([report()], 6000); await next.tick([report()], 10000);
    expect(upload).not.toHaveBeenCalled();
  });
  it('snapshots continuously changing pages after ten seconds and serializes ticks', async () => {
    let finish!: () => void;
    const upload = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const sync = new ScanSync(0, upload, vi.fn()); const current = report();
    for (let now = 0; now < 10000; now += 1000) {
      current.observation.resources.push({ url: 'https://example.test/' + now, type: 'script', outcome: 'requested' });
      await sync.tick([current], now);
    }
    const pending = sync.tick([current], 10000);
    await sync.tick([current], 11000); expect(upload).toHaveBeenCalledTimes(1);
    finish(); await pending;
  });
  it('keeps a permanent failure visible after another scan saves and clears it only after recovery', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new SyncFailure('Scan metadata rejected.', false)).mockResolvedValue(undefined);
    const status = vi.fn(); const sync = new ScanSync(0, upload, status);
    const reports = [report(1000, 'failed-scan'), report(1000, 'saved-scan')];
    await sync.tick(reports, 1000); await sync.tick(reports, 3000);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('Scan not saved. Scan metadata rejected.'));
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('1 saved · 0 pending · 1 failed'));
    expect(sync.snapshot()).toMatchObject({ saved: 1, pending: 0, failed: 1 });
    expect(sync.statusFor('failed-scan')).toMatchObject({ state: 'failed', text: 'Scan not saved. Scan metadata rejected.', attempts: 1 });
    expect(sync.statusFor('saved-scan')).toMatchObject({ state: 'saved', text: 'Scan saved automatically. Available in Saved scans.' });

    sync.retry();
    expect(sync.snapshot()).toMatchObject({ failed: 1 });
    await sync.tick(reports, 3001);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload.mock.calls[0][0]).toEqual(upload.mock.calls[2][0]);
    expect(sync.snapshot()).toMatchObject({ saved: 2, pending: 0, failed: 0 });
    expect(status.mock.lastCall?.[0]).not.toContain('rejected');
  });
  it('retains an automatic-retry failure while other jobs prepare and save, then removes it on success', async () => {
    const upload = vi.fn().mockRejectedValueOnce(new Error('Network unavailable.')).mockResolvedValue(undefined);
    const status = vi.fn(); const sync = new ScanSync(0, upload, status);
    const first = report(); const second = report(4000, 'two');
    await sync.tick([first], 1000); await sync.tick([first], 3000);
    await sync.tick([first, second], 4000);
    expect(sync.snapshot()).toMatchObject({ saved: 0, pending: 1, failed: 1 });
    expect(status.mock.lastCall?.[0]).toContain('Network unavailable.');
    await sync.tick([first, second], 6000);
    expect(sync.snapshot()).toMatchObject({ saved: 1, pending: 0, failed: 1 });
    expect(status.mock.lastCall?.[0]).toContain('Network unavailable.');
    expect(sync.statusFor('two')?.text).not.toContain('Network');
    await sync.tick([first, second], 7999);
    expect(upload).toHaveBeenCalledTimes(2);
    await sync.tick([first, second], 8000);
    expect(sync.snapshot()).toMatchObject({ saved: 2, pending: 0, failed: 0 });
    expect(sync.statusFor('one')).toMatchObject({ state: 'saved', attempts: 2 });
    expect(status.mock.lastCall?.[0]).not.toContain('Network');
  });
  it('keeps errors separate by scan and clears all status on an account stop, including late responses', async () => {
    let rejectPending!: (error: Error) => void;
    const upload = vi.fn()
      .mockRejectedValueOnce(new SyncFailure('First scan rejected.', false))
      .mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectPending = reject; }));
    const status = vi.fn(); const sync = new ScanSync(0, upload, status);
    const reports = [report(), report(1000, 'two')];
    await sync.tick(reports, 1000);
    const pending = sync.tick(reports, 3000);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    expect(sync.statusFor('two')).toMatchObject({ state: 'saving', text: 'Saving scan to your workspace…' });
    sync.stop(); const callbacksAtStop = status.mock.calls.length;
    expect(sync.snapshot()).toMatchObject({ scans: [], saved: 0, pending: 0, failed: 0 });
    expect(sync.statusFor('one')).toBeUndefined();
    rejectPending(new Error('Old account late error.')); await pending;
    expect(status).toHaveBeenCalledTimes(callbacksAtStop);
    const newStatus = vi.fn(); const next = new ScanSync(6000, vi.fn().mockResolvedValue(undefined), newStatus);
    await next.tick(reports, 6000);
    expect(newStatus).not.toHaveBeenCalled();
    await next.tick([report(7000, 'new-account')], 7000); await next.tick([report(7000, 'new-account')], 9000);
    expect(next.snapshot()).toMatchObject({ saved: 1, failed: 0 });
    expect(newStatus.mock.lastCall?.[0]).not.toMatch(/rejected|Old account/);
  });
  it('keeps the queue bounded and its overflow warning visible after successful uploads', async () => {
    const upload = vi.fn().mockResolvedValue(undefined); const status = vi.fn(); const sync = new ScanSync(0, upload, status);
    const reports = Array.from({ length: 31 }, (_, index) => report(1000, String(index)));
    await sync.tick(reports, 1000); await sync.tick(reports, 3000);
    expect(upload).toHaveBeenCalledTimes(30);
    expect(sync.snapshot()).toMatchObject({ saved: 30, queueFull: true });
    expect(sync.snapshot().scans).toHaveLength(30);
    expect(status.mock.lastCall?.[0]).toContain('Sync queue full.');
    sync.includeCurrent(report(1000, 'another'), 3001);
    expect(sync.snapshot().scans).toHaveLength(30);
    await sync.tick([reports[30]], 4000);
    expect(sync.snapshot()).toMatchObject({ saved: 0, pending: 1, failed: 0, queueFull: false });
    expect(status.mock.lastCall?.[0]).not.toContain('queue full');
  });
  it('returns detached status metadata keyed by the original scan without exposing reports', async () => {
    const sync = new ScanSync(5000, vi.fn().mockResolvedValue(undefined), vi.fn()); const current = report();
    sync.includeCurrent(current, 5000);
    await sync.tick([current], 7000);
    expect(sync.statusFor(current.scanId)).toMatchObject({ state: 'saved' });
    const snapshot = sync.snapshot();
    expect(snapshot.scans[0]).toEqual({ scanId: current.scanId, state: 'saved', text: 'Scan saved automatically. Available in Saved scans.', attempts: 1 });
    Object.assign(snapshot.scans[0], { state: 'failed', text: 'modified by consumer' });
    expect(sync.statusFor(current.scanId)?.state).toBe('saved');
  });
});

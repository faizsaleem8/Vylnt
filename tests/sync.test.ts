import { describe, expect, it, vi } from 'vitest';
import { createReport } from '../packages/core';
import { ScanSync, SyncFailure } from '../apps/extension/sync';

const report = (time = 1000, id = 'one') => createReport(id, { url: 'https://example.test/', scannedAt: new Date(time).toISOString(), domCollected: true, scripts: [], resources: [] });
describe('automatic immutable scan syncing', () => {
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
});

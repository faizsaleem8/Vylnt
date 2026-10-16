import React, { useEffect, useRef, useState } from 'react';
import type { Report } from '../../../packages/core';
import type { ScanPage } from '../../../packages/core/summary';
import { compareReports } from '../../../packages/core/comparison';

export function ComparisonPicker({ report, api, onChoose }: { report: Report; api: <T>(path: string) => Promise<T>; onChoose: (baseline?: Report) => void }) {
  const [data, setData] = useState<ScanPage>(); const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [choice, setChoice] = useState('');
  const generation = useRef(0); const apiRef = useRef(api); apiRef.current = api;
  async function load(page: number) {
    const seq = ++generation.current; setBusy(true); setError('');
    try {
      const result = await apiRef.current<ScanPage>(`/scans/${report.scanId}/comparisons?page=${page}&limit=10`);
      if (seq === generation.current) { setData(result); setChoice(''); }
    } catch (e) { if (seq === generation.current) setError(e instanceof Error ? e.message : 'Could not load comparison scans.'); }
    finally { if (seq === generation.current) setBusy(false); }
  }
  useEffect(() => { if (open) void load(1); return () => { ++generation.current; }; }, [open, report.scanId]);
  async function choose(id: string) {
    setChoice(id); onChoose(undefined); if (!id) return;
    const seq = ++generation.current; setBusy(true); setError('');
    try {
      const result = await apiRef.current<{ report: Report }>(`/scans/${id}`);
      if (seq !== generation.current) return;
      compareReports(report, result.report); // Enforce same-URL comparison even if a candidate was replaced.
      onChoose(result.report);
    } catch (e) { if (seq === generation.current) setError(e instanceof Error ? e.message : 'Could not load baseline.'); }
    finally { if (seq === generation.current) setBusy(false); }
  }
  return <details className="panel comparison-picker" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Compare saved scans</summary>
    <p className="muted">Choose another saved scan of this exact page URL, across all history pages. Changes are relative to the baseline you choose.</p>
    <label>Compare with<select disabled={busy || !data?.scans.length} value={choice} onChange={event => void choose(event.target.value)}><option value="">Select a baseline scan</option>{data?.scans.map(scan => <option key={scan.scanId} value={scan.scanId}>{new Date(scan.scannedAt).toLocaleString()} / {scan.score}/100 / {scan.scanId.slice(-8)}</option>)}</select></label>
    <div className="pagination"><button disabled={busy || !data || data.page <= 1} onClick={() => void load(data!.page - 1)}>Previous comparisons</button><span>Page {data?.page ?? 1} / {data?.total ?? 0} other scans</span><button disabled={busy || !data || data.page * 10 >= data.total || data.page >= 10000} onClick={() => void load(data!.page + 1)}>Next comparisons</button></div>
    <button disabled={busy} onClick={() => { setChoice(''); onChoose(undefined); }}>Clear comparison</button>
    {busy && <p role="status">Loading comparison…</p>}
    {error && <p role="alert">{error} <button disabled={busy} onClick={() => void load(data?.page ?? 1)}>Retry loading scans</button></p>}
    {data && !data.scans.length && !busy && <p className="muted">{data.total ? 'No candidates on this page. Go back or refresh the report.' : 'No other saved scans of this page yet. Rescan and save another observation to compare.'}</p>}
  </details>;
}

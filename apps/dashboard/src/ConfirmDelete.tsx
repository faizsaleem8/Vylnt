import React, { useEffect, useRef } from 'react';
export type DeleteTarget = { kind: 'scan'; id: string; label: string } | { kind: 'site'; origin: string; label: string; count: number };
export function ConfirmDelete({ target, busy, error, onCancel, onConfirm }: { target: DeleteTarget; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className="delete-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <p className="eyebrow">Saved data</p><h2 id="delete-title">{target.kind === 'site' ? 'Delete website?' : 'Delete this scan?'}</h2><p className="url delete-target">{target.label}</p>
    <p id="delete-description">{target.kind === 'site' ? `Remove all saved scans for this website (${target.count} currently listed), including their reports and review notes.` : 'Remove this saved scan, its insights reports and review notes.'} This cannot be undone. Submitted blockchain transactions remain.</p>
    {error && <p role="alert" className="error">{error}</p>}<div className="dialog-actions"><button autoFocus disabled={busy} onClick={onCancel}>Cancel</button><button className="danger" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : target.kind === 'site' ? 'Delete website' : 'Delete scan'}</button></div>
  </dialog>;
}

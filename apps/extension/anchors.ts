import { anchorPanel } from '../../packages/ui/anchor-panel';
export function savedAnchors(scanId: string, api: <T>(path: string, init?: RequestInit) => Promise<T>, current: () => boolean) {
  const node = document.createElement('section'); node.className = 'panel'; node.setAttribute('aria-label', 'Saved insights anchors');
  const heading = document.createElement('h3'); heading.textContent = 'Saved insights / local blockchain';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = 'Loading saved versions…'; node.append(heading, status);
  void api<{ id: string; createdAt: string }[]>(`/scans/${scanId}/insight-reports`).then(rows => {
    if (!current()) return;
    status.textContent = rows.length ? 'Proofs identify frozen insights JSON; raw scan hashes remain separate.' : 'No frozen insights versions saved for this scan.';
    for (const row of rows) {
      const version = document.createElement('details'), title = document.createElement('summary');
      title.textContent = new Date(row.createdAt).toLocaleString() + ' / ' + row.id.slice(0, 12); version.append(title);
      let attached = false;
      version.addEventListener('toggle', () => { if (version.open && !attached) { attached = true; version.append(anchorPanel(row.id, api, current).node); } });
      node.append(version);
    }
  }).catch(() => { if (current()) status.textContent = 'Saved insights status unavailable. Scan findings remain accessible.'; });
  return node;
}

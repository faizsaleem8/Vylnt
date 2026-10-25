import React, { useEffect, useRef, useState } from 'react';
import workflow from '../../../docs/examples/vylnt-report-check.yml?raw';
import type { Report } from '../../../packages/core';

function downloadFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function GitHubSetup({ report, onChooseReport }: { report?: Report; onChooseReport: () => void }) {
  const [status, setStatus] = useState('');
  const [copying, setCopying] = useState(false);
  const preview = useRef<HTMLDetailsElement>(null);
  const source = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function copy() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(workflow);
      if (mounted.current) setStatus('Workflow copied. Save it as .github/workflows/vylnt.yml in your website repository.');
    } catch {
      if (mounted.current) {
        if (preview.current) preview.current.open = true;
        source.current?.focus(); source.current?.select();
        setStatus('Clipboard is unavailable. The workflow is selected below; press Ctrl+C or use Download vylnt.yml.');
      }
    } finally { if (mounted.current) setCopying(false); }
  }
  return <div className="github-setup">
    <section className="panel" aria-labelledby="github-workflow-title">
      <p className="eyebrow">One-time repository setup</p>
      <h2 id="github-workflow-title">Check your report in GitHub</h2>
      <p className="muted">Copy this workflow into your website repository. GitHub will read your exported report and list blocking findings, warnings and recommended fixes.</p>
      <div className="report-actions">
        <button className="primary" onClick={() => void copy()} disabled={copying}>{copying ? 'Copying…' : 'Copy workflow'}</button>
        <button onClick={() => { downloadFile('vylnt.yml', workflow, 'text/yaml;charset=utf-8'); setStatus('Workflow downloaded. Place it in .github/workflows/ inside your website repository.'); }}>Download vylnt.yml</button>
      </div>
      <p className="small muted github-status" role="status" aria-live="polite">{status}</p>
      <ol className="github-steps">
        <li><strong>Add the workflow</strong><p>Save the file as <code>.github/workflows/vylnt.yml</code>. Review any existing workflow before replacing it.</p></li>
        <li><strong>Add a report</strong><p>Place your exported JSON beside <code>package.json</code> at the repository root, named exactly <code>vylnt-report.json</code>. Raw Export JSON and Download insights JSON are supported.</p>
          {report ? <><p className="small muted url">Selected scan: {report.observation.url} · {new Date(report.observation.scannedAt).toLocaleString()}</p><button onClick={() => { downloadFile('vylnt-report.json', JSON.stringify(report, null, 2), 'application/json'); setStatus('Selected scan downloaded as vylnt-report.json. Commit it at your website repository root.'); }}>Download report for GitHub</button></> : <button onClick={onChooseReport}>Choose a saved scan</button>}
        </li>
        <li><strong>Commit and push both files</strong><p>Open your repository’s Actions tab to see <strong>VYLNT security gate</strong>. High/critical findings at high confidence block; other findings warn. Missing or invalid reports fail the check.</p></li>
        <li><strong>Require the check before merging</strong><p>In GitHub’s branch protection settings, require pull requests and <strong>VYLNT security gate</strong> for <code>main</code>. Work on a branch: a failed check does not stop branch pushes. After fixing the website, rescan and commit a new report.</p></li>
      </ol>
      <details className="github-preview" ref={preview}><summary>View workflow YAML</summary><label htmlFor="github-workflow-source">Workflow source</label><textarea id="github-workflow-source" ref={source} value={workflow} readOnly spellCheck={false} rows={16} /></details>
    </section>
    <section className="panel github-boundaries" aria-labelledby="github-scope-title"><h2 id="github-scope-title">What this check verifies</h2><p className="muted">This is an uploaded-report demo. It checks the report’s evidence and internal consistency; it does not prove the report describes your latest code or verify a live blockchain anchor. Replacing an old report is a manual step. ML scores do not decide pass or fail.</p><p className="small muted">The workflow uses pinned public VYLNT tooling. No VYLNT token, Supabase credentials, browser wallet or running local server is required by GitHub. Review your report before adding it to a public repository: it includes website paths, cookie names and security observations.</p></section>
  </div>;
}

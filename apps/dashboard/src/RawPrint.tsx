import React from 'react';
import type { Report } from '../../../packages/core';

export function RawPrint({ report }: { report: Report }) {
  return <section className="raw-print" aria-label="Full scan data"><h2>Full scan findings</h2><p>{report.findings.length} findings. All severities are included, regardless of the onscreen filter. Severity is assigned by rules; observations do not prove exploitation.</p>
    {report.findings.map((finding, index) => <section className="raw-print-finding" key={finding.id}><h3>{index + 1}. {finding.title}</h3><p><strong>{finding.severity} severity</strong> / {finding.confidence} confidence / {finding.ruleId}</p><p>{finding.description}</p><p>URL: {finding.url}<br />Observed: {finding.detectedAt}<br />Finding ID: {finding.id}</p><h4>Observed evidence</h4><pre>{JSON.stringify(finding.evidence, null, 2)}</pre></section>)}
    {!report.findings.length && <p>No findings observed. Review collection coverage before interpreting this result.</p>}
  </section>;
}

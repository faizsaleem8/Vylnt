import type { Report } from './index';
import { mlRules } from './ml-features';

export const sequenceVersion = 'vynlt-snapshot-sequence-v1';
export const sequenceLimit = 74;
export const sequenceFeatureNames = [
  'kind_coverage', 'kind_resource', 'kind_script', 'kind_cookie', 'kind_target',
  'headers_collected', 'dom_collected', 'cookies_collected', 'https', 'external',
  'secure', 'http_only', 'integrity', 'same_site_restricted', 'failed', 'truncated',
  ...mlRules.map(rule => `target_${rule}`),
] as const;

/** Snapshot group order, NOT timestamps, execution order or source/sink flow.
 * At most 24 entries per group; target is always retained. No identifiers/text. */
export function extractMlSequence(report: Report, findingId: string): number[][] {
  const finding = report.findings.find(item => item.id === findingId);
  if (!finding || !mlRules.includes(finding.ruleId as typeof mlRules[number])) throw new Error('Unsupported sequence target');
  const o = report.observation, page = new URL(o.url);
  const token = (values: Record<string, number>) => sequenceFeatureNames.map(name => values[name] ?? 0);
  const urlFlags = (raw: string) => { const url = new URL(raw); return { https: Number(url.protocol === 'https:'), external: Number(url.origin !== page.origin) }; };
  const rows = [token({ kind_coverage: 1, headers_collected: Number(o.headers !== undefined), dom_collected: Number(o.domCollected), cookies_collected: Number(o.cookies !== undefined), https: Number(page.protocol === 'https:'), truncated: Number(o.resources.length > 24 || o.scripts.length > 24 || (o.cookies?.length ?? 0) > 24) })];
  for (const resource of o.resources.slice(0, 24)) rows.push(token({ kind_resource: 1, ...urlFlags(resource.url), failed: Number(resource.outcome === 'failed') }));
  if (o.domCollected) for (const script of o.scripts.slice(0, 24)) rows.push(token({ kind_script: 1, ...urlFlags(script.url), integrity: Number(script.integrity) }));
  for (const cookie of (o.cookies ?? []).slice(0, 24)) rows.push(token({ kind_cookie: 1, secure: Number(cookie.secure), http_only: Number(cookie.httpOnly), same_site_restricted: Number(cookie.sameSite === 'lax' || cookie.sameSite === 'strict') }));
  rows.push(token({ kind_target: 1, [`target_${finding.ruleId}`]: 1 }));
  return rows;
}

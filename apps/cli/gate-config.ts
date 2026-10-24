import { z } from 'zod';

const script = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,99}$/);
export const gateConfigSchema = z.object({
  version: z.literal(1),
  directory: z.string().min(1).max(200).refine(value => value === '.' || /^(?![\/])(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_./-]+$/.test(value), 'Use a relative directory without parent traversal'),
  buildScript: script.optional(), startScript: script,
  protocol: z.enum(['http', 'https']).default('http'),
  port: z.number().int().min(0).max(65535).refine(n => n === 0 || n >= 1024).default(0),
  routes: z.array(z.string().max(1000).refine(value => {
    try { const u = new URL(value, 'http://127.0.0.1'); return value.startsWith('/') && u.origin === 'http://127.0.0.1' && !u.search && !u.hash && !value.includes('\\'); } catch { return false; }
  }, 'Use explicit same-origin paths without queries or fragments')).min(1).max(10),
  ignoreHTTPSErrors: z.boolean().default(false),
  readyTimeoutMs: z.number().int().min(1000).max(60000).default(15000),
  commandTimeoutMs: z.number().int().min(1000).max(300000).default(180000)
}).strict().refine(value => !value.ignoreHTTPSErrors || value.protocol === 'https', 'TLS override requires a local HTTPS application');
export type GateConfig = z.infer<typeof gateConfigSchema>;

export function outgoingCommits(input: string) {
  const commits = new Set<string>();
  for (const line of input.trim().split(/\r?\n/).filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4 || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(fields[1]) || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(fields[3])) throw new Error('Invalid pre-push update');
    if (fields[2].startsWith('refs/heads/') && !/^0+$/.test(fields[1])) commits.add(fields[1]);
  }
  return [...commits];
}

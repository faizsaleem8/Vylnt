// Developer-only controlled application corpus. Never bundled into product UI.
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep, posix } from 'node:path';
import { z } from 'zod';
import type { Report } from '../core';

const relativePath = z.string().min(1).max(240).refine(p => !p.includes('\\') && !p.startsWith('/') && p.split('/').every(s => s !== '..' && s !== '.' && s.length > 0 && !s.startsWith('.')) && !p.includes(':') && !p.includes('%'), 'Expected a plain relative source path');
const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), familyId: z.string().min(1).max(200), repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  revision: z.string().regex(/^[0-9a-f]{40}$/), license: z.literal('MIT'), licenseFile: relativePath,
  root: z.union([z.literal('.'), relativePath]), entry: relativePath,
  smoke: z.enum(['jake-tetris', 'canvas-tetris', 'impress', 'chess', 'dropzone', 'fluid', 'froggy']).optional(),
  files: z.array(z.object({ path: relativePath, sha256: z.string().regex(/^[0-9a-f]{64}$/), bytes: z.number().int().min(1).max(2 * 1024 * 1024) }).strict()).min(2).max(100),
}).strict();
export type ApplicationSource = z.infer<typeof sourceSchema>;
export const sourceDigest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export function parseApplicationLock(input: unknown): ApplicationSource[] {
  const parsed = z.object({ version: z.literal(1), applications: z.array(sourceSchema).min(1).max(30) }).strict().parse(input).applications;
  if (new Set(parsed.map(a => a.id)).size !== parsed.length || new Set(parsed.map(a => a.familyId)).size !== parsed.length) throw new Error('Application IDs and actual family identities must be unique');
  for (const app of parsed) {
    if (app.familyId !== `upstream:${app.repository.toLowerCase()}`) throw new Error('Family must identify the upstream repository; variants are not new families');
    if (new Set(app.files.map(f => f.path)).size !== app.files.length) throw new Error('Duplicate source paths');
    if (![app.licenseFile, app.root === '.' ? app.entry : `${app.root}/${app.entry}`].every(p => app.files.some(f => f.path === p))) throw new Error('Source must lock its entry point and licence');
  }
  return parsed;
}
export async function loadVerifiedApplication(app: ApplicationSource, cache: string) {
  const root = await realpath(resolve(cache, app.id));
  const files = new Map<string, Buffer>();
  for (const spec of app.files) {
    const path = await realpath(resolve(root, spec.path));
    if (!path.startsWith(root + sep)) throw new Error('Source path escapes application cache');
    const bytes = await readFile(path);
    if (bytes.length !== spec.bytes || sourceDigest(bytes) !== spec.sha256) throw new Error(`Pinned source mismatch: ${app.id}/${spec.path}`);
    files.set(spec.path, bytes);
  }
  // Preserve licence attribution; a checksum match is not a legal review.
  if (!files.get(app.licenseFile)!.toString().includes('Permission is hereby granted')) throw new Error('Expected retained MIT licence notice');
  return files;
}
/** Only locked browser assets can be served. No checkout, .git or arbitrary disk reads. */
export function applicationAsset(app: ApplicationSource, requestPath: string) {
  let decoded: string;
  try { decoded = decodeURIComponent(requestPath); } catch { return undefined; }
  if (!decoded.startsWith('/') || decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(p => p === '..' || p.startsWith('.'))) return undefined;
  const relative = decoded === '/' ? app.entry : decoded.slice(1);
  const path = app.root === '.' ? relative : posix.join(app.root, relative);
  if (!app.files.some(f => f.path === path)) return undefined;
  return path;
}

export const applicationProfiles = [
  { id: 'baseline', rule: null, label: null },
  { id: 'missing-hsts', rule: 'HDR-001', label: 'change-warranted' },
  { id: 'missing-frame-protection', rule: 'HDR-002', label: 'change-warranted' },
  { id: 'broad-script-policy', rule: 'HDR-003', label: 'change-warranted' },
  { id: 'cookie-no-secure', rule: 'CK-001', label: 'change-warranted' },
  { id: 'cookie-no-httponly', rule: 'CK-002', label: 'change-warranted' },
  { id: 'cookie-cross-site', rule: 'CK-003', label: 'change-warranted' },
  { id: 'mixed-image', rule: 'NET-001', label: 'change-warranted' },
  { id: 'unpinned-script', rule: 'JS-002', label: 'change-warranted' },
  { id: 'readable-preference', rule: 'CK-002', label: 'contextual' },
  { id: 'unspecified-cookie-purpose', rule: 'CK-002', label: 'needs-review' },
  { id: 'script-permitted-defer', rule: 'JS-002', label: 'change-warranted' },
  { id: 'script-excluded-defer', rule: 'JS-002', label: 'contextual' },
  { id: 'script-permitted-async', rule: 'JS-002', label: 'change-warranted' },
  { id: 'script-excluded-async', rule: 'JS-002', label: 'contextual' },
  { id: 'script-permitted-module', rule: 'JS-002', label: 'change-warranted' },
  { id: 'script-excluded-module', rule: 'JS-002', label: 'contextual' },
] as const;
export type ApplicationProfile = typeof applicationProfiles[number];

/** Labels belong to the controlled fixture, never unrelated upstream findings. */
export function controlledTargetIndexes(report: Report, profile: ApplicationProfile): number[] {
  return report.findings.flatMap((finding, index) => {
    if (!profile.rule || finding.ruleId !== profile.rule) return [];
    if (profile.rule.startsWith('CK-') && finding.evidence.cookieName !== 'session_fixture') return [];
    if (profile.rule === 'JS-002') {
      const fixture = new URL(report.observation.url); fixture.hostname = '127.0.0.1'; fixture.pathname = '/vynlt-fixture.js';
      if (finding.url !== fixture.href) return [];
    }
    if (profile.rule === 'NET-001' && new URL(finding.url).pathname !== '/vynlt-fixture.gif') return [];
    return [index];
  });
}

export function applicationRequirement(profile: ApplicationProfile): string {
  if (profile.id.startsWith('script-excluded-')) return 'The fixture is deliberately excluded by an enforced source policy; browser non-execution is required. Retain the inventory observation in contextual reporting, not a claim of harmlessness.';
  const requirements: Record<string, string> = {
    'HDR-001': 'This controlled deployment requires a positive HSTS lifetime.',
    'HDR-002': 'This controlled deployment forbids framing and requires an explicit framing policy.',
    'HDR-003': 'This controlled deployment requires a restricted script policy compatible with the application.',
    'CK-001': 'The inert server-only fixture cookie must be restricted to HTTPS under this controlled specification.',
    'CK-002': 'The inert server-only fixture cookie must be unavailable to JavaScript under this controlled specification.',
    'CK-003': 'This controlled deployment has no cross-site cookie requirement and specifies same-site-only fixture use.',
    'NET-001': 'This controlled deployment requires every resource reference to use HTTPS.',
    'JS-002': 'This controlled deployment requires integrity for its known immutable VYNLT fixture script.',
  };
  if (profile.id === 'readable-preference') return 'The inert preference fixture intentionally requires JavaScript access; the browser must verify readability. It is not an authentication cookie.';
  if (profile.id === 'unspecified-cookie-purpose') return 'The fixture cookie purpose is deliberately unspecified; do not infer authentication or a safe configuration from its name.';
  return profile.rule ? requirements[profile.rule] : 'Compatible restricted policies, no fixture cookies or injected resources; zero baseline findings expected.';
}

export function controlledResponse(originalHtml: string, profile: ApplicationProfile, origin: string, insecureOrigin: string) {
  const secure = new URL(origin), insecure = new URL(insecureOrigin);
  if (secure.protocol !== 'https:' || insecure.protocol !== 'http:' || ![secure.hostname, insecure.hostname].every(h => h === '127.0.0.1' || h === 'localhost')) throw new Error('Corpus responses require loopback origins');
  let html = originalHtml;
  if (profile.id === 'mixed-image') html += `<img alt="" src="${insecureOrigin}/vynlt-fixture.gif">`;
  if (profile.id === 'unpinned-script') html += `<script src="${origin.replace('localhost', '127.0.0.1')}/vynlt-fixture.js"></script>`;
  if (profile.id.startsWith('script-')) html += `<script ${profile.id.endsWith('-module') ? 'type="module"' : profile.id.endsWith('-async') ? 'async' : 'defer'} src="${origin.replace('localhost', '127.0.0.1')}/vynlt-fixture.js"></script>`;
  if (profile.id === 'readable-preference') html += '<script>document.documentElement.dataset.vynltPreferenceReadable=String(document.cookie.split(";").some(c=>c.trim().startsWith("session_fixture=")));</script>';
  const hashes = [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  const handlerHashes = [...html.matchAll(/\son[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m => `'sha256-${createHash('sha256').update(m[1] ?? m[2]).digest('base64')}'`);
  const scriptSources = profile.id === 'broad-script-policy' ? "https: 'unsafe-inline'" : `'self' ${profile.id.startsWith('script-excluded-') ? '' : `https://127.0.0.1:${secure.port}`} ${hashes.join(' ')}`;
  const headers: Record<string, string> = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': `script-src ${scriptSources}; ${handlerHashes.length ? `script-src-attr 'unsafe-hashes' ${[...new Set(handlerHashes)].join(' ')}; ` : ''}${profile.id === 'missing-frame-protection' ? '' : "frame-ancestors 'none';"}` };
  if (profile.id !== 'missing-hsts') headers['Strict-Transport-Security'] = 'max-age=300';
  if (profile.id !== 'missing-frame-protection') headers['X-Frame-Options'] = 'DENY';
  if (profile.rule?.startsWith('CK-')) headers['Set-Cookie'] = `session_fixture=controlled-placeholder; Path=/; ${profile.id === 'cookie-no-secure' ? '' : 'Secure; '}${['cookie-no-httponly', 'readable-preference', 'unspecified-cookie-purpose'].includes(profile.id) ? '' : 'HttpOnly; '}SameSite=${profile.id === 'cookie-cross-site' ? 'None' : 'Lax'}${profile.id === 'readable-preference' ? '; Max-Age=3600' : ''}`;
  return { html, headers };
}

/** Independent network oracle: examines configuration, never VYNLT findings. */
export function assertControlledResponse(profile: ApplicationProfile, headers: Record<string, string | string[] | undefined>, html: string) {
  const header = (name: string) => { const value = headers[name.toLowerCase()] ?? headers[name]; return Array.isArray(value) ? value[0] : value; };
  const require = (condition: boolean) => { if (!condition) throw new Error(`Independent configuration oracle failed: ${profile.id}`); };
  require((header('Strict-Transport-Security') === 'max-age=300') === (profile.id !== 'missing-hsts'));
  require((header('X-Frame-Options') === 'DENY') === (profile.id !== 'missing-frame-protection'));
  const csp = header('Content-Security-Policy') ?? '';
  require(csp.includes("frame-ancestors 'none'") === (profile.id !== 'missing-frame-protection'));
  require(csp.includes("'unsafe-inline'") === (profile.id === 'broad-script-policy'));
  if (profile.rule?.startsWith('CK-')) {
    const cookie = header('Set-Cookie') ?? '';
    require(/;\s*Secure(?:;|$)/i.test(cookie) === (profile.id !== 'cookie-no-secure'));
    require(/;\s*HttpOnly(?:;|$)/i.test(cookie) === !['cookie-no-httponly', 'readable-preference', 'unspecified-cookie-purpose'].includes(profile.id));
    require(cookie.includes('SameSite=None') === (profile.id === 'cookie-cross-site'));
    require(cookie.includes('Max-Age=3600') === (profile.id === 'readable-preference'));
  }
  if (profile.id === 'mixed-image') require(/src="http:\/\/(?:localhost|127\.0\.0\.1):\d+\/vynlt-fixture.gif"/.test(html));
  if (profile.id === 'unpinned-script') require(/src="https:\/\/127\.0\.0\.1:\d+\/vynlt-fixture.js"/.test(html));
  if (profile.id.startsWith('script-')) {
    require(/src="https:\/\/127\.0\.0\.1:\d+\/vynlt-fixture.js"/.test(html));
    require(csp.includes('https://127.0.0.1:') === profile.id.startsWith('script-permitted-'));
    require(html.includes(profile.id.endsWith('-module') ? 'type="module"' : profile.id.endsWith('-async') ? '<script async src=' : '<script defer src='));
  }
  return { version: 'upstream-local-oracle-v1', configurationPassed: true, labelScope: 'Controlled local deployment requirements only; no upstream vulnerability or independently reviewed application safety claim.' };
}

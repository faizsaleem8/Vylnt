import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {Frame, Page} from 'playwright';
import {permissiveInlineDirective} from '../packages/core/project-evidence';

export const tabinatorEditorProfiles = ['script-missing', 'script-early-meta', 'script-broad-response', 'script-broad-meta', 'script-layered-meta', 'script-hashed-response', 'script-eval-response', 'framed-write', 'framed-write-broad'] as const;
export type TabinatorEditorProfile = typeof tabinatorEditorProfiles[number];
export const tabinatorCosmeticIcon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP2sAAAAASUVORK5CYII=', 'base64');
export const tabinatorEditorAsset = '/vylnt-native-editor.js';

/** Omit the pinned editor's two CDN assets and its cosmetic favicon lookup.
 * Authentication, bookmark interactions and native application scripts remain. */
export function tabinatorEditorLayout(html: string, profile: TabinatorEditorProfile) {
  const cosmetics = [
    '<script src="https://cdn.tailwindcss.com"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>',
    'https://www.google.com/s2/favicons?domain=${getHostname(link.url)}&sz=32',
  ];
  if (Buffer.byteLength(html) > 512 * 1024 || html.split('<head>').length !== 2 ||
    /http-equiv\s*=\s*["']?content-security-policy/i.test(html) || cosmetics.some(asset => html.split(asset).length !== 2)) {
    throw Error('Unsupported native Tabinator editor layout');
  }
  const offline = html.replace(cosmetics[0], '').replace(cosmetics[1], '').replace(cosmetics[2], '/images/tabinator.png');
  const inline = [...offline.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (inline.length !== 1 || !inline[0][1].includes("document.getElementById('show-add-modal-btn').addEventListener")) {
    throw Error('Unsupported native Tabinator inline script');
  }
  if (profile !== 'script-early-meta' && profile !== 'script-broad-meta' && profile !== 'script-layered-meta' && profile !== 'script-hashed-response' && profile !== 'script-eval-response') return offline;
  const hash = createHash('sha256').update(inline[0][1].replace(/\r\n?/g, '\n')).digest('base64');
  const directive = profile === 'script-broad-meta' ? permissiveInlineDirective : `script-src 'self' 'sha256-${hash}'`;
  return offline.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${directive}">`);
}

export async function checkTabinatorEditor(view: Frame | Page): Promise<'passed' | 'failed' | 'unknown'> {
  const modal = view.locator('#link-modal');
  const add = view.locator('#show-add-modal-btn');
  if (await modal.count() !== 1 || await add.count() !== 1 || !/\bmodal-hidden\b/.test(await modal.getAttribute('class') ?? '')) return 'unknown';
  await add.dispatchEvent('click');
  const state = await modal.getAttribute('class') ?? '';
  if (/\bmodal-visible\b/.test(state) && await modal.locator('#link-form #link-name').count() === 1) return 'passed';
  return /\bmodal-hidden\b/.test(state) ? 'failed' : 'unknown';
}

/** Exercise the pinned editor as an external asset without rewriting its code. */
export function tabinatorExternalEditor(html:string,assetOrigin:string){
  const url=new URL(assetOrigin);
  if(url.protocol!=='http:'||!['127.0.0.1','vylnt-resource.test'].includes(url.hostname)||!url.port||url.origin!==assetOrigin)throw Error('Unsupported Tabinator asset origin');
  const offline=tabinatorEditorLayout(html,'script-missing');
  const inline=/<script>([\s\S]*?)<\/script>/;
  const match=offline.match(inline);
  if(!match)throw Error('Expected the verified native editor script');
  return {html:offline.replace(inline,`<script src="${assetOrigin}${tabinatorEditorAsset}"></script>`),script:match[1]};
}

export async function writeTabinatorBookmark(view: Frame, origin: string, database: DatabaseSync, userId: number, index: number) {
  const name = `Disposable framed bookmark ${index}`;
  const url = `https://example.invalid/vylnt-frame-${index}`;
  const count = () => database.prepare('SELECT COUNT(*) AS n FROM links WHERE user_id = ? AND name = ? AND url = ?').get(userId, name, url)?.n;
  if (count() !== 0 || await checkTabinatorEditor(view) !== 'passed') return false;
  await view.locator('#link-name').fill(name);
  await view.locator('#link-url').fill(url);
  const [response] = await Promise.all([
    view.page().waitForResponse(r => r.url() === origin + '/api/links' && r.request().method() === 'POST', {timeout: 5000}),
    view.locator('#modal-save-btn').dispatchEvent('click'),
  ]);
  return response.status() === 201 && count() === 1;
}

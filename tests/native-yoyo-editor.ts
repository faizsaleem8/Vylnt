import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {Frame, Page} from 'playwright';
import {permissiveInlineDirective} from '../packages/core/project-evidence';

/** The pinned native shell has one reviewed inline theme initializer. */
export function applyYoyoScriptProfile(html: string, restricted: boolean) {
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (Buffer.byteLength(html) > 512 * 1024 || html.split('<head>').length !== 2 || inline.length !== 1
      || !inline[0][1].includes("localStorage.getItem('yoyoDesign')")
      || !inline[0][1].includes('document.documentElement.dataset.design = design;')
      || /http-equiv\s*=\s*["']?content-security-policy/i.test(html)) {
    throw Error('Unsupported native Yoyo policy layout');
  }
  const hash = createHash('sha256').update(inline[0][1]).digest('base64');
  const directive = restricted ? `script-src 'self' 'sha256-${hash}'` : permissiveInlineDirective;
  return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${directive}">`);
}

export async function checkYoyoEditor(page: Page): Promise<'passed' | 'failed' | 'unknown'> {
  const modal = page.locator('#modal');
  const add = page.locator('#addBtn');
  if (await modal.count() !== 1 || await add.count() !== 1 || await modal.isVisible()) return 'unknown';
  await add.click();
  if (await modal.isVisible() && await modal.locator('#yoyoForm input[name="model"]').isVisible()) return 'passed';
  return await modal.isHidden() ? 'failed' : 'unknown';
}

export async function writeFramedYoyo(view: Frame | Page, origin: string, db: DatabaseSync, model: string) {
  const brand = 'VYLNT fixture';
  const count = () => db.prepare('SELECT COUNT(*) AS n FROM yoyos WHERE brand = ? AND model = ?').get(brand, model)?.n;
  if (count() !== 0) return false;
  const page = 'page' in view ? view.page() : view;
  await view.locator('#addBtn').click();
  await view.locator('#yoyoForm input[name="brand"]').fill(brand);
  await view.locator('#yoyoForm input[name="model"]').fill(model);
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url() === origin + '/api/yoyos' && r.request().method() === 'POST', {timeout: 5000}),
    view.locator('#saveBtn').click(),
  ]);
  return response.status() === 201 && count() === 1;
}

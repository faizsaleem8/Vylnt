import { createHash } from 'node:crypto';
import type { Page } from 'playwright';

// Both templates are read from the verified native revision. Only the disposable
// copy is changed. Never grant an inline hash to arbitrary rendered user data.
export function bookwiseScriptLayout(layout: string, header: string, restricted: boolean | 'permissive-meta') {
  const font = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"<>\r\n]+" rel="stylesheet">/g;
  const flag = /<script>(\s*window\.showLoginModal = )\{\{#if showLoginModal\}\}true\{\{else\}\}false\{\{\/if\}\}(;\s*)<\/script>/g;
  const flags = [...layout.matchAll(flag)];
  const notifications = [...header.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (layout.match(font)?.length !== 1 || flags.length !== 1 || notifications.length !== 1 ||
      !notifications[0][1].trim().startsWith('async function updateNotifications()') ||
      notifications[0][1].includes('{{') || layout.split('<head>').length !== 2 ||
      /http-equiv\s*=\s*["']?content-security-policy/i.test(layout)) {
    throw Error('Unsupported BookWise template');
  }
  const offline = layout.replace(font, '');
  if (restricted === 'permissive-meta') return offline.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">`);
  if (!restricted) return offline;
  const hashes = [notifications[0][1], flags[0][1] + 'false' + flags[0][2]].map(script =>
    "'sha256-" + createHash('sha256').update(script.replaceAll('\r\n', '\n')).digest('base64') + "'");
  return offline.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="script-src \'self\' ' + hashes.join(' ') + '">');
}

// The row exists before the initial scan. Check the native edit control on
// fresh enabled, disabled and restored pages, without writing from the probe.
export async function checkBookwiseEditor(page: Page): Promise<'passed' | 'failed' | 'unknown'> {
  const item = page.locator('#categoriesContainer .category-item');
  const modal = page.locator('#editCategoryModal');
  if (await item.count() !== 1 || await modal.count() !== 1 || await modal.isVisible()) return 'unknown';
  const rowId = await item.getAttribute('data-id');
  const name = await item.locator('.category-name').innerText();
  if (!rowId || !name) return 'unknown';
  await item.locator('.edit-btn').click();
  const input = modal.locator('#editCategoryName');
  if (await modal.isVisible() && await modal.getAttribute('data-category-id') === rowId &&
      await input.inputValue() === name) return 'passed';
  if (await modal.isHidden() && await modal.getAttribute('data-category-id') === null &&
      await input.inputValue() === '') return 'failed';
  return 'unknown';
}

export async function checkBookwiseProfileMenu(page: Page): Promise<'passed' | 'failed' | 'unknown'> {
  const button=page.locator('#profileDropdownBtn'),menu=page.locator('#profileDropdownMenu');
  if(await button.count()!==1||await menu.count()!==1||await menu.isVisible())return 'unknown';
  await button.click();
  const opened=await menu.waitFor({state:'visible',timeout:800}).then(()=>true,()=>false);
  if(!opened)return await menu.isHidden()?'failed':'unknown';
  await button.press('Escape');
  return await menu.waitFor({state:'hidden',timeout:800}).then(()=> 'passed',()=> 'unknown');
}

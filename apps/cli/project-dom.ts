import type { Page } from 'playwright';

/** Collect bounded structural references without transferring page text or code. */
export function collectProjectDom(page: Page) {
  return page.evaluate(() => {
      const clean = (raw: string) => { try { const u = new URL(raw, location.href); return ['http:', 'https:'].includes(u.protocol) ? `${u.origin}${u.pathname}` : ''; } catch { return ''; } };
      return {
        truncated: document.querySelectorAll('script[src]').length > 150 || document.querySelectorAll('script[src],img[src],iframe[src],link[rel="stylesheet"][href],audio[src],video[src]').length > 300,
        scripts: [...document.scripts].filter(s => s.src).slice(0, 150).map(s => ({ url: clean(s.src), integrity: Boolean(s.integrity.trim()), scriptType: s.type === 'module' ? 'module' as const : !s.type || /^(?:text|application)\/javascript$/i.test(s.type) ? 'classic' as const : 'other' as const, async: s.hasAttribute('async'), defer: s.hasAttribute('defer') })).filter(s => s.url),
        resources: [...document.querySelectorAll('script[src],img[src],iframe[src],link[rel="stylesheet"][href],audio[src],video[src]')].slice(0, 300)
          .map(el => ({ url: clean(el.getAttribute('src') ?? el.getAttribute('href') ?? ''), type: el.tagName === 'IMG' ? 'image' : el.tagName.toLowerCase(), outcome: 'referenced' as const })).filter(r => r.url)
      };
    });
}

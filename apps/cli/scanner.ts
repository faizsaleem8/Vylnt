import { randomUUID } from 'node:crypto';
import { cookieMetadata, createReport, safeUrl, securityHeaders, type Observation, type Resource } from '../../packages/core';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
export const isLoopback = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
export async function scanPage(target: string, options: { allowRemote?: boolean; ignoreHTTPSErrors?: boolean; waitMs?: number } = {}) {
  const url = new URL(target);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Provide an HTTP(S) URL without embedded credentials.');
  if (!isLoopback(url.hostname) && !options.allowRemote) throw new Error('Remote scans require --allow-remote. Scan only sites you own or are authorized to assess.');
  if (options.ignoreHTTPSErrors && !isLoopback(url.hostname)) throw new Error('--ignore-https-errors is limited to localhost fixtures.');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('.local/browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.local/browsers');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? false });
    const page = await context.newPage();
    const resources = new Map<string, Resource>();
    if (!options.allowRemote) await context.route('**/*', route => {
      try { if (!isLoopback(new URL(route.request().url()).hostname)) { void route.abort(); return; } } catch { /* invalid URLs will be handled by browser */ }
      void route.continue();
    });
    page.on('request', request => {
      if (resources.size >= 300 || request.isNavigationRequest()) return;
      const raw = request.url(); if (!/^https?:/.test(raw)) return;
      resources.set(`${safeUrl(raw)}:${request.resourceType()}`, { url: safeUrl(raw), type: request.resourceType(), outcome: 'requested' });
    });
    page.on('requestfinished', request => {
      const resource = resources.get(`${safeUrl(request.url())}:${request.resourceType()}`); if (resource) resource.outcome = 'completed';
    });
    page.on('requestfailed', request => {
      const resource = resources.get(`${safeUrl(request.url())}:${request.resourceType()}`); if (resource) resource.outcome = 'failed';
    });
    const response = await page.goto(target, { waitUntil: 'load', timeout: 30000 });
    if (!response || response.status() >= 400) throw new Error(`Target navigation failed (${response?.status() ?? 'no response'})`);
    await page.waitForTimeout(options.waitMs ?? 300);
    const dom = await page.evaluate(() => {
      const clean = (raw: string) => { try { const u = new URL(raw, location.href); return ['http:', 'https:'].includes(u.protocol) ? `${u.origin}${u.pathname}` : ''; } catch { return ''; } };
      return {
        scripts: [...document.scripts].filter(s => s.src).slice(0, 150).map(s => ({ url: clean(s.src), integrity: Boolean(s.integrity.trim()) })).filter(s => s.url),
        resources: [...document.querySelectorAll('script[src],img[src],iframe[src],link[rel="stylesheet"][href],audio[src],video[src]')].slice(0, 300)
          .map(el => ({ url: clean(el.getAttribute('src') ?? el.getAttribute('href') ?? ''), type: el.tagName === 'IMG' ? 'image' : el.tagName.toLowerCase(), outcome: 'referenced' as const })).filter(r => r.url)
      };
    });
    const cookies = (await context.cookies(page.url())).slice(0, 100).map(c => cookieMetadata({ ...c, session: c.expires === -1,
      sameSite: c.sameSite === 'None' ? 'no_restriction' : c.sameSite === 'Strict' ? 'strict' : 'lax' }));
    const observation: Observation = { url: safeUrl(page.url()), scannedAt: new Date().toISOString(),
      headers: securityHeaders(await response.headersArray()), cookies, resources: [...resources.values(), ...dom.resources].slice(0, 600), scripts: dom.scripts, domCollected: true };
    return createReport(randomUUID(), observation);
  } finally { await browser.close(); }
}

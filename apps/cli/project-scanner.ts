import { collectProjectDom } from './project-dom';
import { measureProjectBrowser } from './project-probes';
import { observeMetaPolicy } from './project-meta-policy';
import { observeResourceRequests } from './project-resource-function';
import { guardProjectRedirects } from './project-redirect-guard';
import { recordFramePolicySource } from './project-frame-policy';
import type { Request, Page, BrowserContext } from 'playwright';
import { randomUUID } from 'node:crypto';
import { cookieMetadata, createReport, safeUrl, securityHeaders, cspEvidenceComplete, type Observation, type Resource } from '../../packages/core';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {upgradeFixtureHost} from './project-resource-function';
export const isLoopback = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
export interface TrustedProjectHooks {
  prepare?(page:Page,context:BrowserContext):Promise<void>;
  /** Optional bounded native readiness after navigation, before the snapshot. */
  ready?(page:Page,context:BrowserContext):Promise<void>;
  collected?(page:Page,context:BrowserContext,report:ReturnType<typeof createReport>):Promise<void>;
}
async function trustedHook(task:()=>Promise<void>,timeoutMs:number,close:()=>Promise<void>,signal?:AbortSignal){
  let rejectBound:(error:Error)=>void=()=>{};
  const bound=new Promise<never>((_resolve,reject)=>{rejectBound=reject;});
  const stop=(message:string)=>{rejectBound(Error(message));void close().catch(()=>{});};
  const abort=()=>stop('Project adapter cancelled'),timer=setTimeout(()=>stop('Project adapter timed out'),timeoutMs);
  signal?.addEventListener('abort',abort);
  try{await Promise.race([bound,Promise.resolve().then(()=>{signal?.throwIfAborted();return task();})]);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function scanProjectPage(target: string, options: { allowRemote?: boolean; ignoreHTTPSErrors?: boolean; waitMs?: number; allowedLocalOrigins?: string[]; signal?: AbortSignal; requireComplete?: boolean; channel?: 'chromium' | 'msedge'; hooks?:TrustedProjectHooks; namedUpgradeFixture?: boolean } = {}) {
  options.signal?.throwIfAborted();
  if (options.allowRemote || !options.allowedLocalOrigins?.length) throw Error('Project collection requires explicit loopback origins');
  const url = new URL(target);
  const named=options.namedUpgradeFixture===true;
  const namedOrigins=new Set([url.origin,'http://'+url.host]);
  if(named&&(url.hostname!==upgradeFixtureHost||url.protocol!=='https:'||!url.port||options.ignoreHTTPSErrors||
    options.allowedLocalOrigins.length<2||options.allowedLocalOrigins.length>3||!options.allowedLocalOrigins.includes('http://'+url.host)||
    options.allowedLocalOrigins.some(origin=>!namedOrigins.has(origin)&&!/^http:\/\/127\.0\.0\.1:[0-9]{1,5}$/.test(origin))))
    throw Error('Named fixture collection requires paired strict TLS origins and at most one literal HTTP dependency origin');
  const localHost=(host:string)=>isLoopback(host)||(named&&host===upgradeFixtureHost);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Provide an HTTP(S) URL without embedded credentials.');
  if (!localHost(url.hostname) && !options.allowRemote) throw new Error('Remote scans require --allow-remote. Scan only sites you own or are authorized to assess.');
  if (options.ignoreHTTPSErrors && !isLoopback(url.hostname)) throw new Error('--ignore-https-errors is limited to localhost fixtures.');
  const localOrigins = options.allowedLocalOrigins ? new Set(options.allowedLocalOrigins) : undefined;
  if (localOrigins && (options.allowRemote || localOrigins.size > 10 || !localOrigins.has(url.origin) || [...localOrigins].some(origin => {
    try { const parsed = new URL(origin); return !localHost(parsed.hostname) || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin; } catch { return true; }
  }))) throw new Error('Local origin scope must contain the target and at most ten plain loopback HTTP(S) origins');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync('.local/browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('.local/browsers');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: options.channel ?? 'chromium', headless: true,
    ...(named?{args:['--no-proxy-server','--host-resolver-rules=MAP '+upgradeFixtureHost+' 127.0.0.1, EXCLUDE 127.0.0.1, MAP * ~NOTFOUND']}: {}) });
  const abort = () => { void browser.close().catch(() => {}); };
  options.signal?.addEventListener('abort', abort);
  let redirectGuard:Awaited<ReturnType<typeof guardProjectRedirects>>|undefined;
  try {
    options.signal?.throwIfAborted();
    const context = await browser.newContext({ ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? false, serviceWorkers: 'block' });
    await context.routeWebSocket('**/*', socket => socket.close());
    const page = await context.newPage();
    redirectGuard=await guardProjectRedirects(page,localOrigins!,{namedUpgradeFixture:named});
    // Request identity is retained in memory only: sanitized URL collisions must
    // not let one resource's completion overwrite another resource's failure.
    const resources = new Map<Request, Resource>();
    let networkTruncated = false;
    if (!options.allowRemote) await context.route('**/*', route => {
      try { const requestUrl = new URL(route.request().url()); if (!localHost(requestUrl.hostname) || (localOrigins && !localOrigins.has(requestUrl.origin))) { void route.abort(); return; } } catch { /* invalid URLs will be handled by browser */ }
      void route.continue();
    });
    page.on('request', request => {
      if (request.isNavigationRequest()) return;
      if (resources.size >= 300) { networkTruncated = true; return; }
      const raw = request.url(); if (!/^https?:/.test(raw)) return;
      resources.set(request, { url: safeUrl(raw), type: request.resourceType(), outcome: 'requested' });
    });
    page.on('requestfinished', request => {
      const resource = resources.get(request); if (resource) resource.outcome = 'completed';
    });
    page.on('requestfailed', request => {
      const resource = resources.get(request); if (resource) resource.outcome = 'failed';
    });
    if(options.hooks?.prepare){await trustedHook(()=>options.hooks!.prepare!(page,context),30000,()=>browser.close(),options.signal);resources.clear();networkTruncated=false;}
    options.signal?.throwIfAborted();
    const metaObservation=await observeMetaPolicy(page,target);
    const resourceObservation=observeResourceRequests(page,target,localOrigins!,options.ignoreHTTPSErrors??false,named);
    const response = await page.goto(target, { waitUntil: 'load', timeout: 30000 });
    if (!response || response.status() >= 400) throw new Error(`Target navigation failed (${response?.status() ?? 'no response'})`);
    if(options.hooks?.ready)await trustedHook(()=>options.hooks!.ready!(page,context),30000,()=>browser.close(),options.signal);
    await page.waitForTimeout(options.waitMs ?? 300);
    const dom = await collectProjectDom(page);
    const collectedCookies = await context.cookies(page.url());
    const cookies = collectedCookies.slice(0, 100).map(c => cookieMetadata({ ...c, session: c.expires === -1,
      sameSite: c.sameSite === 'None' ? 'no_restriction' : c.sameSite === 'Strict' ? 'strict' : 'lax' }));
    const responseHeaders = await response.headersArray();
    if (options.requireComplete && (networkTruncated || dom.truncated || collectedCookies.length > 100 || responseHeaders.some(h => ['strict-transport-security', 'content-security-policy', 'x-frame-options'].includes(h.name.toLowerCase()) && h.value.length >= 8192))) throw new Error('Gate collection budget exceeded');
    const observation: Observation = { url: safeUrl(page.url()), scannedAt: new Date().toISOString(),
      headers: securityHeaders(responseHeaders), cspEvidenceComplete: cspEvidenceComplete(responseHeaders), cookies, resources: [...resources.values(), ...dom.resources].slice(0, 600), scripts: dom.scripts, domCollected: true };
    const report = structuredClone(createReport(randomUUID(), observation));
    await recordFramePolicySource(page,report);
    await metaObservation.finish();
    await resourceObservation.finish(report);
    const measurement = await measureProjectBrowser(page, response, report, localOrigins!,{strictTls:!options.ignoreHTTPSErrors});
    if(options.hooks?.collected)await trustedHook(()=>options.hooks!.collected!(page,context,structuredClone(report)),240000,()=>browser.close(),options.signal);
    options.signal?.throwIfAborted();
    return {report, measurement};
  } finally { options.signal?.removeEventListener('abort', abort); await redirectGuard?.close(); await browser.close(); }
}


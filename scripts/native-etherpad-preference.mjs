import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {guardProjectRedirects} from '../apps/cli/project-redirect-guard.ts';

export async function checkEtherpadPreference(url, username, password, signal, snapshot,profile) {
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.local/browsers');
  const {chromium} = await import('playwright');
  const browser = await chromium.launch({channel: 'chromium', headless: true});
  const origin = new URL(url).origin;
  const socketOrigin = origin.replace(/^http:/, 'ws:');
  const stop = () => { void browser.close().catch(() => {}); };
  signal.addEventListener('abort', stop, {once: true});
  const targetCookie = 'session-prefsHttp';
  const preference = context => context.cookies(url).then(cookies => cookies.find(cookie => cookie.name === targetCookie));
  async function waitForRestoredView(_context, checkbox) {
    const deadline = Date.now() + 7000;
    while (Date.now() < deadline) {
      if (!await checkbox.isChecked()) return true;
      await delay(100, undefined, {signal});
    }
    return false;
  }
  async function waitForSavedPreference(context) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const cookie = await preference(context);
      if (cookie && JSON.parse(decodeURIComponent(cookie.value)).showLineNumbers === false) return cookie;
      await delay(100, undefined, {signal});
    }
    throw Error('Native preference writer did not persist the change');
  }
  async function useEditor(cookies, interaction, expectRestricted = false) {
    signal.throwIfAborted();
    const context = await browser.newContext({serviceWorkers: 'block', acceptDownloads: false,
      httpCredentials: {username, password, origin}});
    let redirects;
    let preferenceReadBlocked = false;
    const failures = new Set();
    const record = (address, status) => {
      const target = new URL(address);
      if (failures.size < 12 && target.origin === origin && /^\/[a-zA-Z0-9_./-]{1,160}$/.test(target.pathname)) {
        failures.add(`${status} ${target.pathname}`);
      }
    };
    try {
      if (cookies.length) await context.addCookies(cookies);
      if(profile)await context.addInitScript(({targetCookie,profile})=>{
        const native=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
        if(!native?.get||!native.set)throw Error('Native cookie accessor missing');
        Object.defineProperty(Document.prototype,'cookie',{
          ...native,
          set(raw){
            if(typeof raw==='string'&&raw.startsWith(targetCookie+'=')){
              const [pair,...attributes]=raw.split(';');
              const transient=profile.includes('-transient'),secure=profile.endsWith('-secure');
              const removes=attributes.some(attribute=>{
                const [name,value]=attribute.trim().split('=');
                return /^max-age$/i.test(name)&&Number(value)<=0||/^expires$/i.test(name)&&Date.parse(value)<=Date.now();
              });
              if(!removes){
                const retained=attributes.filter(attribute=>!/^\s*samesite\s*=/i.test(attribute)&&
                  !((transient||secure)&&/^\s*(?:max-age|expires)\s*=/i.test(attribute))&&!/^\s*secure\s*$/i.test(attribute));
                raw=[pair,...retained,'SameSite='+(profile.startsWith('strict-')?'Strict':'Lax'),
                  ...(secure?['Secure',...(transient?[]:['Max-Age=900'])]:[])].join(';');
              }
            }
            native.set.call(this,raw);
          }
        });
      },{targetCookie,profile});
      await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await context.routeWebSocket('**/*', socket => {
        const target = new URL(socket.url());
        if (target.origin === socketOrigin && target.pathname === '/socket.io/') socket.connectToServer();
        else void socket.close();
      });
      const page = await context.newPage();
      redirects = await guardProjectRedirects(page, new Set([origin]));
      page.on('response', response => { if (response.status() >= 400) record(response.url(), response.status()); });
      page.on('requestfailed', request => record(request.url(), 'failed'));
      page.on('pageerror', error => {
        if (error.name === 'TypeError' && /^Cannot read properties of null \(reading '(?:showChat|chatAlwaysVisible|showLineNumbers)'\)$/.test(error.message)) {
          preferenceReadBlocked = true;
        }
        if (failures.size < 12) failures.add(/ReferenceError|TypeError|SyntaxError/.exec(error.name)?.[0] ?? 'Browser script error');
      });
      const response = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 25000});
      assert.ok(response?.status() === 200 && page.url() === url, 'Protected editor navigation failed');
      const initialized = await page.locator('iframe[name="ace_outer"]').waitFor({state: 'attached', timeout: 25000}).then(() => true, () => false);
      if (expectRestricted) {
        assert.ok(!initialized && preferenceReadBlocked && (await preference(context))?.httpOnly === true,
          'HttpOnly did not produce the expected native preference-read failure');
        return true;
      }
      if (!initialized) {
        throw Error(`Native editor did not initialize (${[...failures].join(', ') || 'no failed resources observed'})`);
      }
      const checkbox = page.locator('#options-linenoscheck');
      return await interaction(context, checkbox, page, response);
    } finally {
      await redirects?.close();
      await context.close();
    }
  }
  try {
    const saved = await useEditor([], async (context, checkbox, page, response) => {
      assert.ok(await checkbox.isChecked(), 'The fresh editor must default to showing line numbers');
      await checkbox.evaluate(element => element.click());
      assert.equal(await checkbox.isChecked(), false);
      const cookie = await waitForSavedPreference(context);
      assert.ok(cookie && cookie.secure === (profile?.endsWith('-secure') ?? false) && !cookie.httpOnly,
        'Expected a readable preference cookie with the requested Secure attribute');
      if(!profile)await snapshot?.(page, response, context);
      return cookie;
    });
    const persisted = await useEditor([saved], async (context,checkbox,page,response)=>{
      if(!await waitForRestoredView(context,checkbox))return false;
      if(profile){
        const actual=await preference(context);
        assert.ok(actual?.value===saved.value,'The editor changed the native preference during replay');
        await snapshot?.(page,response,context);
      }
      return true;
    });
    const restricted = await useEditor([{...saved, httpOnly: true}], undefined, true);
    const restored = await useEditor([saved], waitForRestoredView);
    const denied = await fetch(url, {redirect: 'manual', signal, headers: {Cookie: `${targetCookie}=${saved.value}`}});
    const preferenceAloneDenied = denied.status === 401;
    await denied.body?.cancel();
    const outcomes = {persisted, restricted, restored, preferenceAloneDenied};
    assert.ok(Object.values(outcomes).every(Boolean), `Native preference control failed ${JSON.stringify(outcomes)}`);
    return outcomes;
  } finally {
    signal.removeEventListener('abort', stop);
    await browser.close();
  }
}

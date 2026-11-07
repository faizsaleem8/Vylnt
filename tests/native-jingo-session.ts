import assert from 'node:assert/strict';
import {createHmac, timingSafeEqual} from 'node:crypto';
import type {BrowserContext, Page} from 'playwright';
import {measureAuthenticationCookies} from '../apps/cli/project-functional';
import {measureCookieJavaScriptAccess} from '../apps/cli/project-cookie-access';
import type {Report} from '../packages/core';
import type {NativeSessionControls} from '../packages/ml/project-seed-corpus';
import {matchesSessionProfile, type SessionProfile} from '../scripts/native-session-profile.mjs';

export const jingoSessionCookies = ['JingoSession', 'JingoSession.sig'] as const;

export async function verifyJingoPrincipal(context:BrowserContext,origin:string,username:string,email:string){
  const cookies=await context.cookies(origin);
  const session=cookies.find(cookie=>cookie.name===jingoSessionCookies[0]);
  const signature=cookies.find(cookie=>cookie.name===jingoSessionCookies[1]);
  assert.ok(session&&signature,'Native signed session pair missing');
  const digest=createHmac('sha1','jingo').update(`${session.name}=${session.value}`).digest('base64url');
  assert.ok(signature.value.length===digest.length&&timingSafeEqual(Buffer.from(signature.value),Buffer.from(digest)),'Native session signature differs');
  const payload:unknown=JSON.parse(Buffer.from(session.value,'base64').toString('utf8'));
  const principal=(payload as {passport?:{user?:{displayName?:string;email?:string}}})?.passport?.user;
  assert.ok(principal?.displayName===username&&principal.email===email,'Native session principal differs');
}

export async function checkJingoSession(options: {
  context: BrowserContext; report: Report; origin: string; identity: string; profile: SessionProfile;
  username: string; email: string; fontFallback: (page: Page) => Promise<void>; signal: AbortSignal;
  readWiki: () => Promise<{head: string; content: string; email: string}>;
}) {
  const {context, report, origin, identity, profile, username, email, fontFallback, signal, readWiki} = options;
  const observed = report.observation.cookies ?? [];
  for (const name of jingoSessionCookies) {
    const matching = observed.filter(cookie => cookie.name === name);
    assert.ok(matching.length === 1 && matchesSessionProfile(matching[0], profile), 'Native signed session attributes must match');
  }
  await verifyJingoPrincipal(context,origin,username,email);

  const editor = origin + '/pages/new';
  const hasEditor = (page: Page) => page.locator('form[action="/pages"] input[name="pageTitle"]').count();
  const authentication = await measureAuthenticationCookies(context, report, {identityHash: identity, prepare: fontFallback, check: async page => {
    const response = await page.goto(editor);
    if (response?.status() !== 200) return 'unknown';
    if (new URL(page.url()).pathname === '/login' && await page.locator('form[action="/login"]').count() === 1) return 'anonymous';
    return page.url() === editor && await hasEditor(page) === 1 ? 'authenticated' : 'unknown';
  }}, signal);
  const access = await measureCookieJavaScriptAccess(context, report, {identityHash: identity, check: async page => {
    await fontFallback(page);
    await page.goto(editor);
    if (new URL(page.url()).pathname === '/login') return {authentication: 'anonymous', functionality: 'unknown'};
    if (page.url() !== editor || await hasEditor(page) !== 1) return {authentication: 'unknown', functionality: 'unknown'};
    const sample = 'Disposable editor interaction';
    await page.locator('.CodeMirror').click();
    await page.keyboard.insertText(sample);
    const worked = (await page.locator('.CodeMirror-code').innerText()).includes(sample);
    return {authentication: 'authenticated', functionality: worked ? 'passed' : 'failed'};
  }}, signal);

  const target = origin + '/pages/Home';
  const content = 'Disposable session policy check.';
  const request = {form: {pageTitle: 'Home', content, message: 'Disposable session policy check'}, maxRedirects: 0, timeout: 10000};
  const baseline = await readWiki();
  const denied = await context.browser()!.newContext({serviceWorkers: 'block', acceptDownloads: false});
  try {
    const rejection = await denied.request.put(target, request);
    assert.equal(rejection.status(), 302, 'Anonymous update status');
    assert.equal(rejection.headers().location, '/login', 'Anonymous update must redirect to login');
    const after = await readWiki();
    assert.ok(after.head === baseline.head && after.content === baseline.content, 'Anonymous update must leave the committed page unchanged');
  } finally { await denied.close(); }
  const response = await context.request.put(target, request);
  assert.equal(response.status(), 302, 'Authenticated update status');
  assert.match(response.headers().location ?? '', /^\/wiki\/home(?:$|[?#])/i, 'Authenticated update must return to the wiki page');
  const saved = await readWiki();
  assert.ok(saved.head !== baseline.head && saved.email === email && saved.content.trim() === '# Home\n' + content,
    'Independent Git readback must show the authenticated update and principal');

  const controls: NativeSessionControls = {
    signedSessionMapsToSyntheticUser: true, nativeBookmarkRowVerified: true, anonymousDeniedWithoutMutation: true,
    cookies: observed.map(cookie => {
      assert.ok(typeof cookie.secure === 'boolean' && typeof cookie.httpOnly === 'boolean');
      const findings = report.findings.filter(finding => finding.evidence.cookieName === cookie.name);
      const selected = jingoSessionCookies.some(name => name === cookie.name);
      return {name: cookie.name, secure: cookie.secure, httpOnly: cookie.httpOnly,
        authenticationRequired: selected && findings.some(finding => authentication.targets.some(target => target.findingId === finding.id)),
        javaScriptAccessUnnecessary: selected && findings.some(finding => access.targets.some(target => target.findingId === finding.id && target.facts.cookieJsAccessRequired.value === false))};
    }),
  };
  return {authentication, access, controls};
}

import { afterEach,describe,it,expect,vi } from 'vitest';
import type { BrowserContext,Page } from 'playwright';
import { createReport } from '../packages/core';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { measureAuthenticationCookies,mergeCookieDependency,type AuthenticationState } from '../apps/cli/project-functional';

const cookie={name:'session',value:'transient-private-value',domain:'127.0.0.1',path:'/',expires:-1,httpOnly:false,secure:false,sameSite:'Lax' as const};
const report=()=>createReport('11111111-1111-4111-8111-111111111111',{url:'http://127.0.0.1/',scannedAt:'2026-10-27T00:00:00.000Z',headers:{},domCollected:true,resources:[],scripts:[],cookies:[{name:cookie.name,secure:false,httpOnly:false,session:true,sameSite:'lax'}]});
function fixture(cookies:Awaited<ReturnType<BrowserContext['cookies']>>=[cookie]){
  const closed=vi.fn();
  const source={cookies:async()=>cookies,browser:()=>({newContext:async()=>{
    let state:typeof cookies=[];
    return {routeWebSocket:async()=>{},route:async()=>{},addCookies:async(value:typeof cookies)=>{state=value;},
      newPage:async()=>({state,setDefaultTimeout:()=>{},setDefaultNavigationTimeout:()=>{}}),close:async()=>{closed();}};
  }})} as unknown as BrowserContext;
  const check=async(page:Page):Promise<AuthenticationState>=>((page as unknown as {state:typeof cookies}).state.some(c=>c.name==='session')?'authenticated':'anonymous');
  return {source,check,closed};
}
afterEach(()=>vi.useRealTimers());
describe('native functional evidence mechanism (not training data)',()=>{
  it('requires baseline, anonymous, removal and restoration controls without retaining values',async()=>{
    const {source,check,closed}=fixture(),r=report();
    const result=await measureAuthenticationCookies(source,r,{check,identityHash:'a'.repeat(64)});
    expect(result.targets.length).toBeGreaterThan(0);expect(closed).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(result)).not.toContain(cookie.value);expect(JSON.stringify(result.targets.map(t=>t.facts))).not.toContain(cookie.name);
    const evidence=await collectResponseFacts(r,{runId:'22222222-2222-4222-8222-222222222222',commit:'b'.repeat(40),configHash:'c'.repeat(64),adapterHash:'a'.repeat(64)},false);
    expect(mergeCookieDependency(evidence,result).targets.some(t=>t.facts.cookieAuthDependency?.value===true)).toBe(true);
    expect(()=>mergeCookieDependency(evidence,{...result,originalScanHash:'d'.repeat(64)})).toThrow(/does not match/);
    expect(()=>mergeCookieDependency(evidence,{...result,targets:[result.targets[0],result.targets[0]]})).toThrow(/Duplicate/);
    expect(()=>mergeCookieDependency(evidence,{...result,targets:[{...result.targets[0],facts:{cookieAuthDependency:{...result.targets[0].facts.cookieAuthDependency,value:false}}}]})).toThrow(/Invalid/);
  });
  it('does not infer preference or harmlessness when removal makes no difference',async()=>{
    const {source}=fixture([cookie,{...cookie,name:'other-auth'}]);
    const check=async(page:Page):Promise<AuthenticationState>=>((page as unknown as {state:typeof cookie[]}).state.length?'authenticated':'anonymous');
    expect((await measureAuthenticationCookies(source,report(),{check,identityHash:'a'.repeat(64)})).targets).toEqual([]);
  });
  it('rejects a flow without a working anonymous negative control',async()=>{
    const {source}=fixture();expect((await measureAuthenticationCookies(source,report(),{check:async()=>'authenticated',identityHash:'a'.repeat(64)})).targets).toEqual([]);
  });
  it('does not resolve path collisions or changed cookie attributes by name',async()=>{
    for(const cookies of [[cookie,{...cookie,path:'/other'}],[{...cookie,httpOnly:true}],[{...cookie,sameSite:'Strict' as const}],[{...cookie,expires:123456789}]]){
      const {source,check}=fixture(cookies);expect((await measureAuthenticationCookies(source,report(),{check,identityHash:'a'.repeat(64)})).targets).toEqual([]);
    }
  });
  it('abstains when restoration no longer authenticates',async()=>{
    const {source}=fixture();let calls=0;
    const states:AuthenticationState[]=['authenticated','anonymous','anonymous','unknown'];
    expect((await measureAuthenticationCookies(source,report(),{check:async()=>states[calls++],identityHash:'a'.repeat(64)})).targets).toEqual([]);
  });
  it('bounds a callback that never resolves',async()=>{
    vi.useFakeTimers();const {source,closed}=fixture();
    let entered:()=>void=()=>{};const started=new Promise<void>(resolve=>{entered=resolve;});
    const pending=measureAuthenticationCookies(source,report(),{check:async()=>{entered();return new Promise<AuthenticationState>(()=>{});},identityHash:'a'.repeat(64)});
    await started;
    await vi.advanceTimersByTimeAsync(10001);expect((await pending).targets).toEqual([]);expect(closed).toHaveBeenCalled();
  });
  it('cancels a callback that never resolves',async()=>{
    const {source,closed}=fixture(),controller=new AbortController();
    const pending=measureAuthenticationCookies(source,report(),{check:async()=>{controller.abort();return new Promise<AuthenticationState>(()=>{});},identityHash:'a'.repeat(64)},controller.signal);
    await expect(pending).rejects.toThrow(/cancelled/);expect(closed).toHaveBeenCalled();
  });
});

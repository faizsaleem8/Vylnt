import { expect,it } from 'vitest';
import { crossSiteOutcome,measureCrossSite,validateCrossSiteFields,verifyNavigationInitiator } from '../apps/cli/project-cross-site';
import { createReport } from '../packages/core';
it('requires empty GET fields and matching browser referrer with fetch-site or exact source-frame evidence',()=>{
  expect(validateCrossSiteFields({},'GET','GET')).toHaveLength(0);
  expect(()=>validateCrossSiteFields({token:'private'},'GET','GET')).toThrow(/GET/);
  expect(()=>validateCrossSiteFields({},'POST','GET')).toThrow(/GET/);
  expect(verifyNavigationInitiator({referer:'http://127.0.0.2:123/','sec-fetch-site':'cross-site'},'http://127.0.0.2:123',true)).toBe(true);
  expect(verifyNavigationInitiator({referer:'http://127.0.0.2:123/'},'http://127.0.0.2:123',true,true)).toBe(true);
  expect(verifyNavigationInitiator({referer:'http://127.0.0.2:123/'},'http://127.0.0.2:123',true,false)).toBe(false);
  expect(verifyNavigationInitiator({referer:'http://127.0.0.2:123/','sec-fetch-site':'same-site'},'http://127.0.0.2:123',true,true)).toBe(false);
  for(const headers of [{referer:'http://127.0.0.1:123/','sec-fetch-site':'cross-site'},{referer:'http://127.0.0.2:123/','sec-fetch-site':'same-site'},{'sec-fetch-site':'cross-site'}])expect(verifyNavigationInitiator(headers,'http://127.0.0.2:123',true)).toBe(false);
  expect(crossSiteOutcome({complete:true,originVerified:false,initiatorVerified:true,cookieSent:true,status:302,state:'changed'})).toBe('changed-with-cookie');
  expect(crossSiteOutcome({complete:true,originVerified:true,initiatorVerified:false,cookieSent:true,status:302,state:'changed'})).toBe('unknown');
});
it('requires explicitly declared PUT/DELETE form overrides and preserves field bounds',()=>{
  expect(validateCrossSiteFields({_method:'PUT',content:'synthetic'},'PUT')).toHaveLength(2);
  expect(validateCrossSiteFields({_method:'DELETE'},'DELETE')).toHaveLength(1);
  expect(()=>validateCrossSiteFields({_method:'DELETE'})).toThrow(/override/);
  expect(()=>validateCrossSiteFields({_method:'DELETE'},'PUT')).toThrow(/override/);
  expect(()=>validateCrossSiteFields({content:'x'.repeat(8193)})).toThrow(/bounds/);
  expect(()=>validateCrossSiteFields({_method:'PATCH'},'PATCH' as never)).toThrow(/bounds/);
});
it('requires real mutation or explicit denial, complete origin and transmitted cookie evidence',()=>{
  const valid={complete:true,originVerified:true,cookieSent:true,status:302,state:'changed' as const};
  expect(crossSiteOutcome(valid)).toBe('changed-with-cookie');
  expect(crossSiteOutcome({...valid,status:403,state:'unchanged'})).toBe('explicit-denial');
  for(const changes of [{cookieSent:false},{complete:false},{originVerified:false},{status:500},{state:'unknown' as const}])expect(crossSiteOutcome({...valid,...changes})).toBe('unknown');
  expect(crossSiteOutcome({...valid,status:200,state:'unchanged'})).toBe('unknown');
});
it('rejects unsupported endpoints and pre-cancellation before any browser access',async()=>{
  const report=createReport(crypto.randomUUID(),{url:'http://127.0.0.1/',scannedAt:'2026-10-29T00:00:00Z',headers:{},cookies:[],scripts:[],resources:[],domCollected:true});
  const check={identityHash:'a'.repeat(64),cookieName:'session',path:'https://example.invalid/',prepare:async()=>({}),observe:async()=>'unknown' as const};
  await expect(measureCrossSite({} as never,report,check)).rejects.toThrow(/route/);
  const abort=new AbortController();abort.abort();await expect(measureCrossSite({} as never,report,{...check,path:'/update'},abort.signal)).rejects.toThrow();
});

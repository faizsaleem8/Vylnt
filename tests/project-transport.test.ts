import {it,expect} from 'vitest';
import type {Page,Response} from 'playwright';
import {createReport} from '../packages/core';
import {measureProjectBrowser,mergeBrowserMeasurement} from '../apps/cli/project-probes';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';

async function fixture(url='https://localhost/profile',protocol:string|null='TLS 1.3',previous?:string){
  let current=url;
  const make=(address:string,prior:unknown=null):Response=>{
    const request={url:()=>address,redirectedFrom:()=>prior,response:async()=>response};
    const response={url:()=>address,status:()=>200,request:()=>request,securityDetails:async()=>protocol?{protocol}:null} as unknown as Response;
    return response;
  };
  const prior=previous?make(previous).request():null,response=make(url,prior);
  const page={url:()=>current,evaluate:async()=> 'unknown'} as unknown as Page;
  const report=createReport(crypto.randomUUID(),{url:url.split('?')[0],scannedAt:'2026-10-29T00:00:00Z',headers:{},domCollected:true,cookies:[],scripts:[],resources:[]});
  const origins=new Set([new URL(url).origin,...previous?[new URL(previous).origin]:[]]);
  const binding={runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)};
  const evidence=await collectResponseFacts(report,binding,false);
  return{page,response,report,origins,evidence,navigate:(next:string)=>{current=next;}};
}
it('records strict observed DNS TLS and merges its same-run receipt (mock transport mechanism)',async()=>{
  const f=await fixture(),measurement=await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true});
  expect(measurement.tlsValidated?.value).toBe(true);expect(measurement.hstsApplicable?.value).toBe(true);
  const target=mergeBrowserMeasurement(f.evidence,measurement).targets.find(t=>t.category==='HDR-001')!;
  expect(target.facts.tlsValidated?.value).toBe(true);expect(target.facts.responseChainComplete?.value).toBe(true);
});
it.each([false,undefined])('never infers validation with bypassed/unspecified transport %s',async strictTls=>{
  const f=await fixture(),measurement=await measureProjectBrowser(f.page,f.response,f.report,f.origins,strictTls===undefined?undefined:{strictTls});
  expect(measurement.tlsValidated?.value).toBe(false);expect(measurement.hstsApplicable).toBeUndefined();
});
it.each([null,'TLS 1.0','unknown'])('keeps unavailable/unsupported browser protocol %s uncertain',async protocol=>{
  const f=await fixture(undefined,protocol),measurement=await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true});
  expect(measurement.tlsValidated?.coverage).toBe('partial');expect(measurement.hstsApplicable).toBeUndefined();
});
it('keeps an IP host inapplicable even when transport details are present',async()=>{
  const f=await fixture('https://127.0.0.1/'),measurement=await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true});
  expect(measurement.tlsValidated?.value).toBe(true);expect(measurement.hstsApplicable?.value).toBe(false);
});
it('does not certify a redirect chain with an HTTP hop or missing scope',async()=>{
  const f=await fixture(undefined,'TLS 1.3','http://localhost/start');
  expect((await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true})).tlsValidated?.value).toBe(false);
  f.origins.delete('http://localhost');
  const limited=await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true});
  expect(limited.responseChainComplete.coverage).toBe('partial');expect(limited.hstsApplicable).toBeUndefined();
});
it('does not confuse query-only navigation with the original final response',async()=>{
  const f=await fixture('https://localhost/profile?first');f.navigate('https://localhost/profile?second');
  const measurement=await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true});
  expect(measurement.responseChainComplete.value).toBe(false);expect(measurement.tlsValidated?.value).toBe(false);
});
it('revokes positive DNS transport if the inline probe navigates after chain capture',async()=>{
  const f=await fixture();f.page.evaluate=(async()=>{f.navigate('https://localhost/profile?changed');return 'unknown';}) as Page['evaluate'];
  const measurement=await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true});
  expect(measurement.responseChainComplete.value).toBe(false);expect(measurement.tlsValidated?.coverage).toBe('partial');expect(measurement.hstsApplicable).toBeUndefined();
});
it('rejects copied/altered receipts and stale scan linkage',async()=>{
  const f=await fixture(),measurement=await measureProjectBrowser(f.page,f.response,f.report,f.origins,{strictTls:true});
  expect(()=>mergeBrowserMeasurement(f.evidence,structuredClone(measurement))).toThrow('receipt');
  measurement.tlsValidated!.value=false;expect(()=>mergeBrowserMeasurement(f.evidence,measurement)).toThrow('receipt');
  expect(()=>mergeBrowserMeasurement({...f.evidence,scanId:crypto.randomUUID()},measurement)).toThrow('does not match');
});

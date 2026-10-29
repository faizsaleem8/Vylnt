import {it,expect} from 'vitest';
import {EventEmitter} from 'node:events';
import type {Page,Request} from 'playwright';
import {createReport} from '../packages/core';
import {observeResourceRequests,correlateResourceTransfers} from '../apps/cli/project-resource-function';

async function fixture({counterpart=false,status=200,failed=false,duplicate=false,strict=false,synthetic=false,redirect=false}={}){
  const target='https://127.0.0.1/profile',raw='http://127.0.0.1/app.js?private=value',frame={};
  const scripts=[raw,...duplicate?[raw.replace('value','other-secret')]:[]];
  let current=target;
  const input={scripts:scripts.map(raw=>({raw,attrs:[raw,'','','',''],async:false,defer:false,noModule:false})),policies:[]};
  const events=Object.assign(new EventEmitter(),{url:()=>current,mainFrame:()=>frame,locator:()=>({evaluate:async()=>input})}),page=events as unknown as Page;
  const request={url:()=>counterpart?raw.replace('http:','https:'):raw,resourceType:()=>'script',frame:()=>frame,redirectedFrom:()=>null,redirectedTo:()=>redirect?{}:null,
    response:async()=>({status:()=>status,fromServiceWorker:()=>false,securityDetails:async()=>({protocol:'TLS 1.3'}),serverAddr:async()=>synthetic?null:{ipAddress:'127.0.0.1',port:443}}),
    sizes:async()=>({responseBodySize:20,responseHeadersSize:20})} as unknown as Request;
  const report=createReport(crypto.randomUUID(),{url:target,scannedAt:'2026-10-29T00:00:00Z',headers:{},cookies:[],domCollected:true,
    resources:[{url:raw,type:'script',outcome:'referenced'}],scripts:scripts.map(url=>({url,integrity:false,scriptType:'classic',async:false,defer:false}))});
  const observer=observeResourceRequests(page,target,new Set(['https://127.0.0.1','http://127.0.0.1']),!strict);
  events.emit('request',request);if(status!==200)events.emit('response',{request:()=>request,status:()=>status});
  events.emit(failed?'requestfailed':'requestfinished',request);await observer.finish(report);
  return{page,report,input,navigate:()=>{current=target+'?changed';}};
}
it('correlates a completed HTTP wire request without asserting functionality or upgrade',async()=>{
  const f=await fixture(),result=await correlateResourceTransfers(f.page,f.report);
  expect(result.status).toBe('observed');expect(result.targets[0]).toMatchObject({correlation:'http-request',outcome:'completed',wireObserved:true,tlsMetadataObserved:false});
  expect(result.upgradeVerified).toBe(false);expect(result.functionVerified).toBe(false);
  for(const value of ['private=value','other-secret','http://127.0.0.1/app.js?'])expect(JSON.stringify(result)).not.toContain(value);
});
it('records an HTTPS counterpart as correlation only, even with strict mock TLS metadata',async()=>{
  const f=await fixture({counterpart:true,strict:true}),result=await correlateResourceTransfers(f.page,f.report);
  expect(result.targets[0]).toMatchObject({correlation:'https-counterpart',outcome:'completed',tlsMetadataObserved:true});
  expect(result.upgradeVerified).toBe(false);
});
it('does not treat bypassed TLS or synthetic fulfilment as verified transport',async()=>{
  const f=await fixture({counterpart:true,synthetic:true}),result=await correlateResourceTransfers(f.page,f.report);
  expect(result.targets[0]).toMatchObject({wireObserved:false,tlsMetadataObserved:false});
});
it.each([{status:404,outcome:'http-error'},{failed:true,outcome:'failed'}])('retains unsuccessful outcome $outcome without inferring harmlessness',async options=>{
  const f=await fixture(options),result=await correlateResourceTransfers(f.page,f.report);
  expect(result.targets[0].outcome).toBe(options.outcome);expect(result.upgradeVerified).toBe(false);
});
it('preserves a known 404 even when Chromium also reports the script request failed',async()=>{
  const f=await fixture({status:404,failed:true});expect((await correlateResourceTransfers(f.page,f.report)).targets[0].outcome).toBe('http-error');
});
it.each([{duplicate:true},{redirect:true}])('keeps query collisions and redirect relationships ambiguous: %j',async options=>{
  const f=await fixture(options);expect((await correlateResourceTransfers(f.page,f.report)).targets[0].correlation).toBe('ambiguous');
});
it('refuses a stale scan, changed DOM or changed navigation',async()=>{
  const f=await fixture();expect((await correlateResourceTransfers(f.page,{...f.report,scanId:crypto.randomUUID()})).targets).toEqual([]);
  f.input.policies.push(['content-security-policy','script-src none'] as never);expect((await correlateResourceTransfers(f.page,f.report)).targets).toEqual([]);
  f.input.policies.pop();f.navigate();expect((await correlateResourceTransfers(f.page,f.report)).targets).toEqual([]);
});

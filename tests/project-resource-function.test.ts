import {describe,it,expect,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import type {Page,Request} from 'playwright';
import {createReport} from '../packages/core';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {contentHash} from '../packages/core/integrity';
import {resourceFunctionVersion,resourceControlsPass,mergeResourceFunction,measureResourceFunction,observeResourceRequests,correlateResourceTransfers,type ResourceControls,type ResourceMeasurement} from '../apps/cli/project-resource-function';
import {redirectAllowed} from '../apps/cli/project-redirect-guard';
const good:ResourceControls={baseline:{complete:true,functionality:'passed',transfer:'http',metadataHash:'a'.repeat(64)},withheld:{complete:true,functionality:'failed',transfer:'withheld',metadataHash:'a'.repeat(64)},restored:{complete:true,functionality:'passed',transfer:'http',metadataHash:'a'.repeat(64)}};
describe('direct HTTP resource causal controls',()=>{
  it('bounds missing browser response metadata and cannot turn a timed-out transfer into a fact',async()=>{
    vi.useFakeTimers();
    try{
      const target='https://127.0.0.1/',raw='http://127.0.0.1/app.js',frame={};
      const input={scripts:[{raw,attrs:[raw,'','', '', ''],async:false,defer:false,noModule:false}],policies:[]};
      const events=Object.assign(new EventEmitter(),{url:()=>target,mainFrame:()=>frame,locator:()=>({evaluate:async()=>input})}),page=events as unknown as Page;
      const req={url:()=>raw,resourceType:()=>'script',frame:()=>frame,redirectedFrom:()=>null,redirectedTo:()=>null,response:async()=>({status:()=>200,fromServiceWorker:()=>false,serverAddr:async()=>({ipAddress:'127.0.0.1',port:80})}),sizes:async()=>new Promise<never>(()=>{})} as unknown as Request;
      const report=createReport(crypto.randomUUID(),{url:target,scannedAt:'2026-10-29T00:00:00Z',headers:{},cookies:[],domCollected:true,resources:[{url:raw,type:'script',outcome:'completed'}],scripts:[{url:raw,integrity:false,scriptType:'classic',async:false,defer:false}]});
      const observation=observeResourceRequests(page,target,new Set([target.replace(/\/$/,''),'http://127.0.0.1']));
      events.emit('request',req);events.emit('requestfinished',req);
      const done=observation.finish(report);await vi.advanceTimersByTimeAsync(1501);await done;
      expect(events.listenerCount('requestfinished')).toBe(0);
      expect((await correlateResourceTransfers(page,report)).targets[0].outcome).toBe('unknown');
      const measurement=await measureResourceFunction({pages:()=>[page]} as never,report,{identityHash:'a'.repeat(64),check:async()=>'passed'});
      expect(measurement.status).toBe('needs-review');expect(measurement.targets).toEqual([]);
    }finally{vi.useRealTimers();}
  });
  it('checks response redirects before a second URL can escape the loopback allowlist',()=>{
    const origin='https://127.0.0.1:4000',allowed=new Set([origin]);
    expect(redirectAllowed(origin+'/first',302,[{name:'Location',value:'/next?private=value'}],allowed)).toBe(true);
    expect(redirectAllowed(origin,304,[],allowed)).toBe(true);
    for(const value of ['https://example.invalid/','http://127.0.0.1:4000/','https://user:password@127.0.0.1:4000/','https://127.0.0.2:4000/','data:text/html,ignored','x'.repeat(8193)])expect(redirectAllowed(origin,307,[{name:'location',value}],allowed)).toBe(false);
    expect(redirectAllowed(origin,302,[],allowed)).toBe(false);
    expect(redirectAllowed(origin,302,[{name:'Location',value:'/one'},{name:'location',value:'/two'}],allowed)).toBe(false);
  });
  it('requires positive dependency, actual HTTP completion, matching metadata and restoration',()=>{
    expect(resourceControlsPass(good)).toBe(true);
    for(const name of ['baseline','withheld','restored'] as const)for(const patch of [{complete:false},{functionality:'unknown' as const},{transfer:'unknown' as const},{metadataHash:undefined},{metadataHash:'b'.repeat(64)}]){
      const controls=structuredClone(good);Object.assign(controls[name],patch);expect(resourceControlsPass(controls)).toBe(false);
    }
    expect(resourceControlsPass({...good,withheld:{...good.withheld,functionality:'passed'}})).toBe(false);
    expect(resourceControlsPass({...good,restored:{...good.restored,functionality:'failed'}})).toBe(false);
    expect(resourceControlsPass({...good,baseline:{...good.baseline,transfer:'withheld'}})).toBe(false);
  });
  it('refuses uploaded receipts, stale bindings and uncertain facts',async()=>{
    const report=createReport(crypto.randomUUID(),{url:'https://127.0.0.1/',scannedAt:'2026-10-29T00:00:00Z',headers:{},cookies:[],scripts:[],domCollected:true,resources:[{url:'http://127.0.0.1/app.js',type:'script',outcome:'completed'}]});
    const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
    const result:ResourceMeasurement={version:resourceFunctionVersion,scanId:report.scanId,originalScanHash:await contentHash(report),checkIdentity:evidence.adapterHash,status:'verified',sourceFunctionality:'passed',checks:[],targets:[]};
    expect(()=>mergeResourceFunction(evidence,result)).toThrow(/receipt/);
    for(const patch of [{scanId:crypto.randomUUID()},{originalScanHash:'d'.repeat(64)},{checkIdentity:'e'.repeat(64)},{version:'unknown'}])expect(()=>mergeResourceFunction(evidence,{...result,...patch} as ResourceMeasurement)).toThrow(/binding/);
    expect(mergeResourceFunction(evidence,{...result,status:'needs-review'})).toEqual(evidence);
    const fact={value:true,source:'functional' as const,coverage:'complete' as const,witnessHash:'f'.repeat(64)};
    expect(()=>mergeResourceFunction(evidence,{...result,status:'needs-review',targets:[{findingId:report.findings.find(f=>f.ruleId==='NET-001')!.id,facts:{resourceTlsUpgradeObserved:fact,resourceHttpTransferObserved:fact,resourceFunctionVerified:fact,requestChainComplete:fact}}]})).toThrow(/Unverified/);
  });
  it('refuses remote, dirty or non-HTTPS documents and cancelled runs before touching the browser',async()=>{
    const report=createReport(crypto.randomUUID(),{url:'https://127.0.0.1/',scannedAt:'2026-10-29T00:00:00Z',headers:{},cookies:[],scripts:[],resources:[],domCollected:true});
    const check={identityHash:'c'.repeat(64),check:async()=>'passed' as const};
    for(const url of ['https://example.invalid/','http://localhost/','https://user:password@localhost/','https://localhost/?private=value','https://localhost/#private'])await expect(measureResourceFunction({} as never,{...report,observation:{...report.observation,url}},check)).rejects.toThrow(/loopback/);
    await expect(measureResourceFunction({} as never,report,{...check,identityHash:'invalid'})).rejects.toThrow(/identity/);
    const cancelled=new AbortController();cancelled.abort();await expect(measureResourceFunction({} as never,report,check,cancelled.signal)).rejects.toThrow();
  });
});

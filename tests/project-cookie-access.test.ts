import { describe,it,expect } from 'vitest';
import { createReport } from '../packages/core';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { assessCookieAccess,mergeCookieAccess,cookieAccessVersion,type CookieAccessPhase,type CookieAccessMeasurement } from '../apps/cli/project-cookie-access';
import { contentHash } from '../packages/core/integrity';
const good:CookieAccessPhase={authentication:'authenticated',functionality:'passed',complete:true,read:true};
describe('cookie JavaScript necessity controls',()=>{
  it('distinguishes actual necessity, incidental reads and no reads',()=>{
    expect(assessCookieAccess(good,{...good,functionality:'failed',read:false},good)).toBe(true);
    expect(assessCookieAccess(good,{...good,read:false},good)).toBe(false);
    expect(assessCookieAccess({...good,read:false},{...good,read:false},{...good,read:false})).toBe(false);
  });
  it('abstains for missing/contradictory controls or lost authentication',()=>{
    for(const changes of [{complete:false},{authentication:'anonymous' as const},{authentication:'unknown' as const},{functionality:'unknown' as const},{read:true}]){
      expect(assessCookieAccess(good,{...good,read:false,...changes},good)).toBeUndefined();
    }
    expect(assessCookieAccess({...good,functionality:'failed'},{...good,read:false},good)).toBeUndefined();
    expect(assessCookieAccess(good,{...good,read:false},{...good,functionality:'failed'})).toBeUndefined();
    expect(assessCookieAccess(good,{...good,read:false},{...good,read:false})).toBeUndefined();
    expect(assessCookieAccess({...good,read:false},{...good,read:false,functionality:'failed'},{...good,read:false})).toBeUndefined();
  });
  it('binds facts to the original cookie finding and rejects tampering',async()=>{
    const report=createReport('11111111-1111-4111-8111-111111111111',{url:'http://127.0.0.1/',scannedAt:'2026-10-28T00:00:00.000Z',headers:{},scripts:[],resources:[],domCollected:true,cookies:[{name:'session',secure:false,httpOnly:false,sameSite:'lax',session:true}]});
    const evidence=await collectResponseFacts(report,{runId:'22222222-2222-4222-8222-222222222222',commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
    const fact=(value:boolean)=>({value,source:'functional' as const,coverage:'complete' as const,witnessHash:'d'.repeat(64)});
    const measurement:CookieAccessMeasurement={version:cookieAccessVersion,scanId:report.scanId,originalScanHash:await contentHash(report),checks:[],targets:[{findingId:report.findings.find(f=>f.ruleId==='CK-002')!.id,facts:{cookieJsAccessObserved:fact(true),cookieJsAccessRequired:fact(false)}}]};
    const result=mergeCookieAccess(evidence,measurement);expect(result.targets.some(t=>t.facts.cookieJsAccessRequired?.value===false)).toBe(true);
    expect(()=>mergeCookieAccess(evidence,{...measurement,scanId:'different'})).toThrow(/does not match/);
    expect(()=>mergeCookieAccess(evidence,{...measurement,originalScanHash:'e'.repeat(64)})).toThrow(/does not match/);
    expect(()=>mergeCookieAccess(evidence,{...measurement,targets:[measurement.targets[0],measurement.targets[0]]})).toThrow(/Duplicate/);
    const impossible=structuredClone(measurement);impossible.targets[0].facts.cookieJsAccessObserved.value=false;impossible.targets[0].facts.cookieJsAccessRequired.value=true;
    expect(()=>mergeCookieAccess(evidence,impossible)).toThrow(/must have been observed/);
    const mismatch=structuredClone(measurement);mismatch.targets[0].facts.cookieJsAccessRequired.witnessHash='e'.repeat(64);
    expect(()=>mergeCookieAccess(evidence,mismatch)).toThrow(/witnesses differ/);
    const conflict=structuredClone(evidence);conflict.targets.find(t=>t.findingId===measurement.targets[0].findingId)!.facts.cookieJsAccessRequired=fact(true);
    expect(()=>mergeCookieAccess(conflict,measurement)).toThrow(/Conflicting/);
  });
});

import { describe,it,expect } from 'vitest';
import { createReport } from '../packages/core';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { contentHash } from '../packages/core/integrity';
import { preferenceControlsPass,measureCookiePreference,mergeCookiePreference,preferencePurposeVersion,type PreferenceControls,type VerifiedPreferenceProfile,type PreferenceMeasurement } from '../apps/cli/project-cookie-preference';
import type { BrowserContext } from 'playwright';

const allowed={authentication:'authenticated' as const,functionality:'passed' as const,complete:true,read:true,preference:'first' as const,protectedStatus:200 as const};
const valid=():PreferenceControls=>({first:{...allowed},second:{...allowed,preference:'second'},without:{...allowed,read:false},preferenceOnly:{...allowed,authentication:'anonymous',protectedStatus:401},restored:{...allowed}});
describe('source-backed cookie preference controls',()=>{
  it('requires positive presentation changes, preserved protected access, absence and restoration controls',()=>{
    expect(preferenceControlsPass(valid(),'first')).toBe(true);
    const unchanged=valid();unchanged.second.preference='first';expect(preferenceControlsPass(unchanged,'first')).toBe(false);
    const noFallback=valid();noFallback.without.preference='second';expect(preferenceControlsPass(noFallback,'first')).toBe(false);
    const noRestore=valid();noRestore.restored.functionality='failed';expect(preferenceControlsPass(noRestore,'first')).toBe(false);
  });
  it('rejects mixed authentication use, missing coverage and error responses',()=>{
    const mixed=valid();mixed.second.authentication='anonymous';mixed.second.protectedStatus=401;expect(preferenceControlsPass(mixed,'first')).toBe(false);
    const grants=valid();grants.preferenceOnly.authentication='authenticated';grants.preferenceOnly.protectedStatus=200;expect(preferenceControlsPass(grants,'first')).toBe(false);
    for(const state of ['unknown',200] as const){const error=valid();error.preferenceOnly.protectedStatus=state;expect(preferenceControlsPass(error,'first')).toBe(false);}
    for(const key of Object.keys(valid()) as (keyof PreferenceControls)[]){const partial=valid();partial[key].complete=false;expect(preferenceControlsPass(partial,'first')).toBe(false);}
  });
  it('keeps missing and JSON-forged source declarations uncertain without running callbacks',async()=>{
    const report=createReport('11111111-1111-4111-8111-111111111111',{url:'http://127.0.0.1/',scannedAt:'2026-10-28T00:00:00.000Z',headers:{},resources:[],scripts:[],domCollected:true,cookies:[]});
    const source={} as BrowserContext,check={identityHash:'a'.repeat(64),check:async()=>{throw Error('Unverified producer must not execute');}};
    for(const profile of [undefined,JSON.parse('{"id":"vylnt-reference-layout-v1","proofHash":"claimed"}') as VerifiedPreferenceProfile]){
      const result=await measureCookiePreference(source,report,check,profile);expect(result.status).toBe('needs-review');expect(result.targets).toEqual([]);
    }
    const evidence=await collectResponseFacts(report,{runId:'22222222-2222-4222-8222-222222222222',commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
    const forged:PreferenceMeasurement={version:preferencePurposeVersion,scanId:report.scanId,originalScanHash:await contentHash(report),status:'verified',targets:[],controls:valid()};
    expect(()=>mergeCookiePreference(evidence,forged)).toThrow(/receipt/);
  });
});

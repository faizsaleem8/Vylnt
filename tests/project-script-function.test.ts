import { describe,it,expect } from 'vitest';
import { createReport } from '../packages/core';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { contentHash } from '../packages/core/integrity';
import { scriptControlsPass,mergeScriptFunction,measureScriptFunction,scriptFunctionVersion,type ScriptPhase,type ScriptMeasurement } from '../apps/cli/project-script-function';
import {metaPolicyVersion,type MetaPolicySummary} from '../apps/cli/project-meta-policy';
const good:ScriptPhase={complete:true,functionality:'passed',inline:'blocked'};
const disabled:ScriptPhase={complete:true,functionality:'failed',inline:'unknown'};
describe('required script interaction controls',()=>{
  it('requires compatible, early, unchanged meta timing in both enabled controls',()=>{
    const meta:MetaPolicySummary={version:metaPolicyVersion,status:'early-supported',policyCount:1,identityHash:'a'.repeat(64),mutated:false,beforeScripts:true,restricted:true};
    const baseline={...good,metaPolicy:meta},restored={...good,metaPolicy:{...meta}};
    expect(scriptControlsPass({baseline,disabled,restored})).toBe(true);
    expect(scriptControlsPass({baseline,disabled,restored:good})).toBe(false);
    expect(scriptControlsPass({baseline,disabled,restored:{...restored,metaPolicy:{...meta,status:'needs-review'}}})).toBe(false);
    expect(scriptControlsPass({baseline,disabled,restored:{...restored,metaPolicy:{...meta,identityHash:'b'.repeat(64)}}})).toBe(false);
    for(const patch of [{mutated:true},{identityHash:undefined},{beforeScripts:false},{policyCount:17}])expect(scriptControlsPass({baseline:{...baseline,metaPolicy:{...meta,...patch}},disabled,restored})).toBe(false);
  });
  it('requires positive functionality, JS-disabled failure and restoration with matching CSP enforcement',()=>{
    expect(scriptControlsPass({baseline:good,disabled,restored:good})).toBe(true);
    expect(scriptControlsPass({baseline:{...good,inline:'executed'},disabled,restored:{...good,inline:'executed'}})).toBe(true);
    for(const phase of ['baseline','disabled','restored'] as const)for(const patch of [{complete:false},{functionality:'unknown' as const}]){
      const controls={baseline:good,disabled,restored:good};controls[phase]={...controls[phase],...patch};expect(scriptControlsPass(controls)).toBe(false);
    }
    expect(scriptControlsPass({baseline:good,disabled:{...disabled,functionality:'passed'},restored:good})).toBe(false);
    expect(scriptControlsPass({baseline:good,disabled,restored:{...good,inline:'executed'}})).toBe(false);
    expect(scriptControlsPass({baseline:good,disabled,restored:{...good,functionality:'failed'}})).toBe(false);
  });
  it('rejects uploaded/forged receipts, stale scan/adapter bindings and facts in an uncertain result',async()=>{
    const report=createReport(crypto.randomUUID(),{url:'http://127.0.0.1/',scannedAt:'2026-10-28T00:00:00Z',headers:{},cookies:[],resources:[],scripts:[],domCollected:true});
    const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
    const measurement:ScriptMeasurement={version:scriptFunctionVersion,scanId:report.scanId,originalScanHash:await contentHash(report),checkIdentity:evidence.adapterHash,status:'verified',controls:{baseline:good,disabled,restored:good},targets:[]};
    expect(()=>mergeScriptFunction(evidence,measurement)).toThrow(/receipt/);
    expect(()=>mergeScriptFunction(evidence,{...measurement,checkIdentity:'d'.repeat(64)})).toThrow(/binding/);
    expect(()=>mergeScriptFunction(evidence,{...measurement,originalScanHash:'d'.repeat(64)})).toThrow(/binding/);
    expect(mergeScriptFunction(evidence,{...measurement,status:'needs-review'})).toEqual(evidence);
    const fact={value:true,source:'functional' as const,coverage:'complete' as const,witnessHash:'e'.repeat(64)};
    expect(()=>mergeScriptFunction(evidence,{...measurement,status:'needs-review',targets:[{findingId:'forged',facts:{cspProbeAllowed:fact,cspProbeBlocked:fact}}]})).toThrow(/Unverified/);
    await expect(measureScriptFunction({} as never,{...report,observation:{...report.observation,url:'https://example.invalid/'}},{identityHash:'c'.repeat(64),check:async()=>'passed'})).rejects.toThrow(/loopback/);
    const cancelled=new AbortController();cancelled.abort();await expect(measureScriptFunction({} as never,report,{identityHash:'c'.repeat(64),check:async()=>'passed'},cancelled.signal)).rejects.toThrow();
  });
});

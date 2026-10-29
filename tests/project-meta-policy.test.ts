import {expect,it} from 'vitest';
import {summarizeMetaPolicy} from '../apps/cli/project-meta-policy';
import {parseScriptPolicySources,scriptPolicyUsesNonce,collectResponseFacts} from '../packages/ml/project-policy-facts';
import {createReport} from '../packages/core';
const meta=(content="script-src 'self'")=>({kind:'enforce',content,inHead:true,beforeFirst:true});
const snapshot=(metas:unknown[]=[])=>({url:'http://127.0.0.1/',firstScript:true,metas});
it('accepts stable early enforced policies and never treats late/report-only/mutated metadata as early proof',async()=>{
  const a=snapshot([meta()]);expect(await summarizeMetaPolicy(a,a,false)).toMatchObject({status:'early-supported',beforeScripts:true,restricted:true});
  expect(await summarizeMetaPolicy(snapshot(),snapshot(),false)).toMatchObject({status:'absent'});
  for(const m of [{...meta(),beforeFirst:false},{...meta(),inHead:false},{...meta(),kind:'report-only'},meta("script-src 'strict-dynamic'")]){
    const s=snapshot([m]);expect((await summarizeMetaPolicy(s,s,false)).status).toBe('needs-review');
  }
  expect((await summarizeMetaPolicy(a,a,true)).status).toBe('needs-review');
  expect((await summarizeMetaPolicy(snapshot(),a,false)).status).toBe('needs-review');
  expect((await summarizeMetaPolicy({...a,firstScript:false},a,false)).status).toBe('needs-review');
});
it('preserves CSP intersections, first-directive semantics and script-only nonce/hash parsing',async()=>{
  const combined=snapshot([meta("script-src 'self' 'unsafe-inline'"),meta()]);expect((await summarizeMetaPolicy(combined,combined,false)).restricted).toBe(true);
  expect(parseScriptPolicySources("script-src 'self'; script-src *")).toBe(true);
  expect(parseScriptPolicySources("script-src *; script-src 'self'")).toBe(false);
  expect(parseScriptPolicySources("script-src 'nonce-QUFBQUFBQUFBQUFBQUFBQQ=='")).toBe(true);
  expect(scriptPolicyUsesNonce("script-src 'self'; style-src 'nonce-QUFBQUFBQUFBQUFBQUFBQQ=='")).toBe(false);
  expect(scriptPolicyUsesNonce("script-src 'self'; script-src 'nonce-QUFBQUFBQUFBQUFBQUFBQQ=='")).toBe(false);
  expect(scriptPolicyUsesNonce("default-src 'nonce-QUFBQUFBQUFBQUFBQUFBQQ=='")).toBe(true);
  expect(parseScriptPolicySources("script-src 'sha256-QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE='")).toBe(true);
  for(const bits of [256,384,512]){
    expect(parseScriptPolicySources(`script-src 'sha${bits}-${btoa('A'.repeat(bits/8))}'`)).toBe(true);
    expect(parseScriptPolicySources(`script-src 'sha${bits}-${btoa('A'.repeat(bits/8-1))}'`)).toBeUndefined();
  }
  for(const size of [16,128])expect(parseScriptPolicySources(`script-src 'nonce-${btoa('A'.repeat(size))}'`)).toBe(true);
  for(const size of [15,129])expect(parseScriptPolicySources(`script-src 'nonce-${btoa('A'.repeat(size))}'`)).toBeUndefined();
  for(const policy of ["script-src 'sha256-a'","script-src 'nonce-a'","script-src 'self' 'strict-dynamic'","script-src https://user:secret@fixture.invalid/"])expect(parseScriptPolicySources(policy)).toBeUndefined();
  const report=createReport(crypto.randomUUID(),{url:'https://127.0.0.1/',scannedAt:'2026-10-29T00:00:00Z',headers:{'content-security-policy':"frame-ancestors 'nonce-QUFBQUFBQUFBQUFBQUFBQQ=='"},cspEvidenceComplete:true,domCollected:true,scripts:[],resources:[],cookies:[]});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false);
  expect(evidence.targets.find(t=>t.category==='HDR-002')?.facts.frameAncestorsRestricted).toBeUndefined();
});
it('rejects overflow and emits no raw policy, nonce or document URL',async()=>{
  for(const a of [snapshot(Array(17).fill(meta())),snapshot([meta('x'.repeat(8192))])])expect((await summarizeMetaPolicy(a,a,false)).status).toBe('needs-review');
  const a=snapshot([meta("script-src 'nonce-QUFBQUFBQUFBQUFBQUFBQQ=='")]);const result=JSON.stringify(await summarizeMetaPolicy(a,a,false));
  expect(result).not.toContain('QUFB');expect(result).not.toContain('script-src');expect(result).not.toContain('127.0.0.1');
});

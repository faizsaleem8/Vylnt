import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createReport } from '../packages/core';
import { ProjectSigner } from '../apps/server/project-signing';
import { collectResponseFacts, parseHsts } from '../packages/ml/project-policy-facts';
import { projectEvidenceSchema, prepareProjectContexts, verifyProjectEvidence, guardProjectAssessment, projectRules, type ProjectFact, type ProjectFactName } from '../packages/core/project-evidence';

const dirs:string[]=[];
afterEach(async()=>{for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true});});
const scan=(headers:Record<string,string>={})=>createReport(crypto.randomUUID(),{url:'https://127.0.0.1/',scannedAt:'2026-10-27T00:00:00Z',headers,domCollected:true,cookies:[],scripts:[],resources:[],cspEvidenceComplete:true});
const binding=()=>({runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)});
const fact=(value:boolean,source:ProjectFact['source']='browser'):ProjectFact=>({value,source,coverage:'complete',witnessHash:'d'.repeat(64)});
describe('project evidence v4 trust and uncertainty',()=>{
  it('preserves unknown application purpose, redirect coverage and invalid TLS as review',async()=>{
    const report=scan(),evidence=await collectResponseFacts(report,binding(),false),context=prepareProjectContexts(report,evidence);
    expect(report.findings.every(f=>context(f).requiresReview)).toBe(true);
    expect(evidence.targets.find(t=>t.category==='HDR-001')!.facts.responseChainComplete).toBeUndefined();
    expect(evidence.targets.find(t=>t.category==='HDR-002')!.facts.embeddingPublicVerified).toBeUndefined();
  });
  it('allows only declared provenance and rejects raw source or unknown facts',async()=>{
    const evidence=await collectResponseFacts(scan(),binding(),false);
    const target=evidence.targets[0];target.facts.cookieAuthDependency=fact(true,'response');
    expect(projectEvidenceSchema.safeParse(evidence).success).toBe(false);
    delete target.facts.cookieAuthDependency;
    expect(projectEvidenceSchema.safeParse({...evidence,rawSource:'private'}).success).toBe(false);
  });
  it('distinguishes relevant evidence and ignores run identifiers',async()=>{
    const report=scan(),evidence=await collectResponseFacts(report,binding(),true),finding=report.findings.find(f=>f.ruleId==='HDR-001')!;
    const first=prepareProjectContexts(report,evidence)(finding);
    const other=structuredClone(evidence);other.runId=crypto.randomUUID();other.commit='f'.repeat(40);other.adapterHash='e'.repeat(64);
    other.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'complete',sourceHashes:['a'.repeat(64)],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:0};
    expect(prepareProjectContexts(report,other)(finding).sequence).toEqual(first.sequence);
    other.targets.find(t=>t.category==='HDR-001')!.facts.responseChainComplete=fact(true);
    other.targets.find(t=>t.category==='HDR-001')!.facts.hstsApplicable=fact(true);
    const next=prepareProjectContexts(report,other)(finding);expect(next.sequence).not.toEqual(first.sequence);expect(next.requiresReview).toBe(false);
    other.targets.find(t=>t.category==='HDR-001')!.facts.responseChainComplete!.coverage='partial';
    expect(prepareProjectContexts(report,other)(finding).requiresReview).toBe(true);
  });
  it('checks trusted key, original content, scan identity and signed facts; key survives restart',async()=>{
    const root=await mkdtemp(join(tmpdir(),'vylnt-project-key-'));dirs.push(root);
    const signer=await ProjectSigner.open(root),report=scan(),evidence=await collectResponseFacts(report,binding(),true),sealed=signer.seal(evidence);
    expect(await verifyProjectEvidence(sealed,report,[signer.publicKey])).toEqual(sealed);
    expect(await verifyProjectEvidence(sealed,report,[])).toBeUndefined();
    expect(await verifyProjectEvidence({...sealed,evidence:{...evidence,commit:'e'.repeat(40)}},report,[signer.publicKey])).toBeUndefined();
    expect(await verifyProjectEvidence(sealed,{...report,scanId:crypto.randomUUID()},[signer.publicKey])).toBeUndefined();
    const changed=structuredClone(report);changed.observation.headers!['x-frame-options']='DENY';
    expect(await verifyProjectEvidence(sealed,changed,[signer.publicKey])).toBeUndefined();
    expect((await ProjectSigner.open(root)).publicKey).toEqual(signer.publicKey);
    expect(JSON.stringify(sealed)).not.toContain('PRIVATE KEY');
    await unlink(join(root,'signing-key.json'));const replacement=await ProjectSigner.open(root);
    expect(replacement.publicKey).not.toEqual(signer.publicKey);expect(replacement.trustedKeys).toHaveLength(2);
    expect(await verifyProjectEvidence(sealed,report,replacement.trustedKeys)).toEqual(sealed);
  });
  it('keeps 71 equivalent resources as one input variant with distinct links',async()=>{
    const report=createReport(crypto.randomUUID(),{...scan().observation,resources:Array.from({length:71},(_,i)=>({url:`http://127.0.0.1/r${i}.js`,type:'script',outcome:'failed' as const}))});
    const evidence=await collectResponseFacts(report,binding(),true),context=prepareProjectContexts(report,evidence),findings=report.findings.filter(f=>f.ruleId==='NET-001');
    expect(findings).toHaveLength(71);expect(new Set(findings.map(f=>context(f).variant)).size).toBe(1);
    expect(evidence.targets.filter(t=>t.category==='NET-001')).toHaveLength(71);expect(findings.every(f=>context(f).requiresReview)).toBe(true);
  });
  it('parses HSTS independently without converting preload tokens into membership',()=>{
    expect(parseHsts('max-age=00010; includeSubDomains; preload')).toEqual({supported:true,positive:true});
    expect(parseHsts('max-age=0')).toEqual({supported:true,positive:false});
    for(const value of ['max-age=10; max-age=0','preload','max-age=-1','max-age=5, max-age=6','max-age=5; mystery=1'])expect(parseHsts(value).supported).toBe(false);
  });
  it('requires category-specific positive evidence before contextual assessment in every category',async()=>{
    const report=createReport(crypto.randomUUID(),{...scan().observation,cookies:[{name:'session',secure:false,httpOnly:false,sameSite:'no_restriction',session:true}],resources:[{url:'http://127.0.0.1/script.js',type:'script',outcome:'completed'}]});
    const evidence=await collectResponseFacts(report,binding(),true);
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'complete',sourceHashes:['a'.repeat(64)],headerOperations:1,cookieOperations:1,sessionMiddlewareRegistrations:1};
    const values:Record<typeof projectRules[number],Partial<Record<ProjectFactName,boolean>>>={
      'HDR-001':{tlsValidated:true,responseChainComplete:true,hstsSyntaxSupported:true,hstsPositive:true,hstsApplicable:true},
      'HDR-002':{framePolicyEnforced:false,frameAncestorsRestricted:false,embeddingPublicVerified:true,sensitiveActionVerified:false},
      'HDR-003':{scriptPolicyEnforced:true,scriptSourcesRestricted:true,cspProbeBlocked:true,cspProbeAllowed:true,metaPolicyBeforeScripts:true},
      'CK-001':{cookieAuthDependency:false,cookiePreferenceVerified:true},
      'CK-002':{cookieAuthDependency:false,cookiePreferenceVerified:true,cookieJsAccessObserved:true,cookieJsAccessRequired:true},
      'CK-003':{cookieAuthDependency:true,cookieCrossSiteRequired:true,csrfChecksPassed:true,stateChangingRoutesCovered:true},
      'NET-001':{resourceTlsUpgradeObserved:true,resourceHttpTransferObserved:false,resourceFunctionVerified:true,requestChainComplete:true},
    };
    for(const target of evidence.targets)for(const [key,value]of Object.entries(values[target.category])){
      const source=['hstsSyntaxSupported','hstsPositive'].includes(key)?'response':['tlsValidated','responseChainComplete','hstsApplicable','framePolicyEnforced','frameAncestorsRestricted','scriptPolicyEnforced','scriptSourcesRestricted','metaPolicyBeforeScripts'].includes(key)?'browser':'functional';
      target.facts[key as ProjectFactName]=fact(value!,source);
    }
    projectEvidenceSchema.parse(evidence);
    // Mechanical safety-policy fixtures, not signed production evidence or training/oracle examples.
    for(const category of projectRules){
      const finding=report.findings.find(f=>f.ruleId===category)!;expect(finding).toBeTruthy();
      const context=prepareProjectContexts(report,evidence)(finding);expect(context.requiresReview).toBe(false);
      // SameSite=None without Secure cannot become contextual despite successful CSRF checks.
      const expected=['CK-001','NET-001','CK-003'].includes(category)?'needs-review':'contextual';
      expect(guardProjectAssessment(context,finding,'contextual')).toBe(expected);
      expect(guardProjectAssessment({...context,requiresReview:true},finding,'change-warranted')).toBe('needs-review');
      expect(guardProjectAssessment(context,{...finding,severity:'critical'},'contextual')).toBe('needs-review');
    }
  });
});

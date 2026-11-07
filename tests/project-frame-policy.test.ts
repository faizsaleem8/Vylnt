import {describe,it,expect,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import type {Page} from 'playwright';
import {createReport} from '../packages/core';
import {contentHash} from '../packages/core/integrity';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {broadFrameAncestors,duplicateFrameDeny,framePolicyScope} from '../packages/core/frame-policy-scope';
import {projectBroadFrameWritePolicy,projectDuplicateXfoPolicy,projectEvidenceSchema,projectPolicy,projectFramePolicy,projectFrameWritePolicy,prepareProjectContexts,guardProjectAssessment} from '../packages/core/project-evidence';
import {framePolicyVersion,framePolicyControlsPass,measureFramePolicy,mergeFramePolicy,recordFramePolicySource,type FramePolicyMeasurement} from '../apps/cli/project-frame-policy';
const target='http://127.0.0.1:4100/page',parent='http://127.0.0.1:4200';
const report=()=>createReport(crypto.randomUUID(),{url:target,scannedAt:'2026-10-29T00:00:00Z',headers:{},cspEvidenceComplete:true,domCollected:true,cookies:[],resources:[],scripts:[]});
const binding=()=>({runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)});
describe('executed framing-policy evidence',()=>{
  it('retains an exercised foreign write under the broad response policy without allowing contextual de-emphasis',async()=>{
    const scan=createReport(crypto.randomUUID(),{...report().observation,headers:{'content-security-policy':broadFrameAncestors}});
    const evidence=await collectResponseFacts(scan,binding(),false),finding=scan.findings.find(f=>f.ruleId==='HDR-002')!;
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['a'.repeat(64)],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:0};
    const frame=evidence.targets.find(t=>t.category==='HDR-002')!;
    frame.facts.sensitiveActionVerified={value:true,source:'functional',coverage:'complete',witnessHash:'d'.repeat(64)};
    evidence.policy=projectFrameWritePolicy;
    expect(prepareProjectContexts(scan,evidence)(finding).requiresReview).toBe(true);
    evidence.policy=projectBroadFrameWritePolicy;
    const context=prepareProjectContexts(scan,evidence)(finding);
    expect(guardProjectAssessment(context,finding,'change-warranted')).toBe('change-warranted');
    expect(guardProjectAssessment(context,finding,'contextual')).toBe('needs-review');
    expect(prepareProjectContexts({...scan,observation:{...scan.observation,cspEvidenceComplete:false}},evidence)(finding).requiresReview).toBe(true);
    delete frame.facts.sensitiveActionVerified;
    expect(prepareProjectContexts(scan,evidence)(finding).requiresReview).toBe(true);
  });
  it('requires both matched header-removal controls for the paired framing receipt',()=>{
    const measurement:FramePolicyMeasurement={version:framePolicyVersion,scanId:crypto.randomUUID(),originalScanHash:'a'.repeat(64),checkIdentity:'b'.repeat(64),
      status:'verified',sourceHealthy:true,mechanism:'duplicate-xfo-deny-paired',targets:[],controls:{permitted:'embedded',forbidden:'xfo-blocked',repeatedForbidden:'xfo-blocked',nestedForbidden:'xfo-blocked'}};
    expect(framePolicyControlsPass(measurement)).toBe(false);
    measurement.controls.foreignWithoutHeader='embedded';
    expect(framePolicyControlsPass(measurement)).toBe(false);
    measurement.controls.nestedWithoutHeader='embedded';
    expect(framePolicyControlsPass(measurement)).toBe(true);
  });
  it('requires complete matching browser facts for scoped duplicate XFO denial',async()=>{
    const scan=createReport(crypto.randomUUID(),{...report().observation,headers:{'x-frame-options':duplicateFrameDeny},cspEvidenceComplete:false});
    const evidence=await collectResponseFacts(scan,binding(),false),finding=scan.findings.find(f=>f.ruleId==='HDR-002')!;
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['a'.repeat(64)],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:0};
    const target=evidence.targets.find(t=>t.category==='HDR-002')!,fact={value:true,source:'browser' as const,coverage:'complete' as const,witnessHash:'d'.repeat(64)};
    target.facts.framePolicyEnforced={...fact};target.facts.frameAncestorsRestricted={...fact};
    expect(prepareProjectContexts(scan,evidence)(finding).requiresReview).toBe(true);
    evidence.policy=projectDuplicateXfoPolicy;
    expect(guardProjectAssessment(prepareProjectContexts(scan,evidence)(finding),finding,'contextual')).toBe('contextual');
    target.facts.frameAncestorsRestricted.witnessHash='e'.repeat(64);
    expect(guardProjectAssessment(prepareProjectContexts(scan,evidence)(finding),finding,'contextual')).toBe('needs-review');
  });
  it.each([{'authorization':'secret'},{'x-api-key':'secret\r\ninjected: value'},{'x-api-key':'x'.repeat(513)}])('rejects unsupported or unbounded transient header input',async headers=>{
    await expect(measureFramePolicy({} as never,report(),{identityHash:'a'.repeat(64),check:async()=>true,requestHeaders:headers as never})).rejects.toThrow('transient frame authentication');
  });
  it('cannot restore stale provenance when navigation occurs during asynchronous source hashing',async()=>{
    const scan=createReport(crypto.randomUUID(),{...report().observation,headers:{'content-security-policy':`frame-ancestors 'self'`}}),frame={};
    const events=Object.assign(new EventEmitter(),{url:()=>target,isClosed:()=>false,mainFrame:()=>frame}),page=events as unknown as Page;
    const digest=crypto.subtle.digest.bind(crypto.subtle);let resume:()=>void=()=>{};
    const spy=vi.spyOn(crypto.subtle,'digest').mockImplementationOnce((algorithm,data)=>new Promise((resolve,reject)=>{resume=()=>{void digest(algorithm,data).then(resolve,reject);};}));
    try{const recording=recordFramePolicySource(page,scan);events.emit('framenavigated',frame);resume();await recording;}finally{spy.mockRestore();}
    const check=vi.fn(async()=>false);
    expect((await measureFramePolicy({pages:()=>[page]} as never,scan,{identityHash:'a'.repeat(64),check})).status).toBe('needs-review');
    expect(check).not.toHaveBeenCalled();
    await recordFramePolicySource(page,scan);
    await measureFramePolicy({pages:()=>[page]} as never,scan,{identityHash:'a'.repeat(64),check});
    expect(check).toHaveBeenCalledTimes(1); // A fresh uninterrupted binding reaches the health control.
  });
  it('intersects finite response policies and obeys first directives without treating meta/default-src as ancestors',()=>{
    expect(framePolicyScope(`frame-ancestors 'self' ${parent}`,target)).toEqual({supported:true,origins:['http://127.0.0.1:4100',parent],policies:1});
    expect(framePolicyScope(`frame-ancestors 'self' ${parent}, frame-ancestors ${parent}`,target).origins).toEqual([parent]);
    expect(framePolicyScope(`frame-ancestors 'self'; frame-ancestors *`,target).supported).toBe(true);
    expect(framePolicyScope(`frame-ancestors 'none'`,target)).toEqual({supported:true,origins:[],policies:1});
    expect(framePolicyScope(`default-src 'none'`,target).supported).toBe(false);
    for(const csp of [undefined,'',`frame-ancestors *`,`frame-ancestors http:`,`frame-ancestors https://example.invalid`,`frame-ancestors ${parent}/path`,`frame-ancestors http://user:password@127.0.0.1:4200`,`frame-ancestors 'none' 'self'`,`frame-ancestors`,`frame-ancestors ${parent}?private=value`,"frame-ancestors 'self',".repeat(17),'a'.repeat(8192)])expect(framePolicyScope(csp,target).supported).toBe(false);
    expect(framePolicyScope(`frame-ancestors 'self'`,'http://example.invalid/').supported).toBe(false);
  });
  it('requires healthy target, actual permitted embedding and repeated/nested enforced denial',()=>{
    const result={sourceHealthy:true,controls:{permitted:'embedded',forbidden:'csp-blocked',repeatedForbidden:'csp-blocked',nestedForbidden:'csp-blocked'}} as FramePolicyMeasurement;
    expect(framePolicyControlsPass(result)).toBe(true);
    expect(framePolicyControlsPass({...result,sourceHealthy:false})).toBe(false);
    for(const name of Object.keys(result.controls))for(const value of ['unknown','embedded']){
      if(name==='permitted'&&value==='embedded')continue;
      expect(framePolicyControlsPass({...result,controls:{...result.controls,[name]:value}})).toBe(false);
    }
    expect(framePolicyControlsPass({...result,controls:{forbidden:'csp-blocked',repeatedForbidden:'csp-blocked'}})).toBe(true);
  });
  it('refuses forged receipts, stale bindings, uncertain facts and unscoped runs',async()=>{
    const scan=report(),evidence=await collectResponseFacts(scan,binding(),false);
    const result:FramePolicyMeasurement={version:framePolicyVersion,scanId:scan.scanId,originalScanHash:await contentHash(scan),checkIdentity:evidence.adapterHash,status:'verified',sourceHealthy:true,controls:{forbidden:'csp-blocked',repeatedForbidden:'csp-blocked'},targets:[]};
    expect(()=>mergeFramePolicy(evidence,result)).toThrow(/receipt/);
    expect(()=>mergeFramePolicy(evidence,{...result,scanId:crypto.randomUUID()})).toThrow(/binding/);
    expect(()=>mergeFramePolicy(evidence,{...result,checkIdentity:'e'.repeat(64)})).toThrow(/binding/);
    expect(mergeFramePolicy(evidence,{...result,status:'needs-review'})).toEqual(evidence);
    const fact={value:true,source:'browser' as const,coverage:'complete' as const,witnessHash:'d'.repeat(64)};
    expect(()=>mergeFramePolicy(evidence,{...result,status:'needs-review',targets:[{findingId:scan.findings[0].id,facts:{framePolicyEnforced:fact,frameAncestorsRestricted:fact}}]})).toThrow(/Unverified/);
    for(const url of ['http://example.invalid/','https://localhost/','http://user:password@localhost/','http://localhost/?private=value','http://localhost/#private'])await expect(measureFramePolicy({} as never,{...scan,observation:{...scan.observation,url}},{identityHash:'a'.repeat(64),check:async()=>true})).rejects.toThrow(/loopback/);
    await expect(measureFramePolicy({} as never,scan,{identityHash:'bad',check:async()=>true})).rejects.toThrow(/identity/);
    const cancelled=new AbortController();cancelled.abort();await expect(measureFramePolicy({} as never,scan,{identityHash:'a'.repeat(64),check:async()=>true},cancelled.signal)).rejects.toThrow();
  });
  it('versions observed-policy assessment without inventing purpose or changing v1 uncertainty',async()=>{
    const scan=createReport(crypto.randomUUID(),{...report().observation,headers:{'content-security-policy':'frame-ancestors http://127.0.0.1:4100'}}),evidence=await collectResponseFacts(scan,binding(),false),finding=scan.findings.find(f=>f.ruleId==='HDR-002')!;
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'complete',sourceHashes:[],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:0};
    const target=evidence.targets.find(t=>t.category==='HDR-002')!,fact={value:true,source:'browser' as const,coverage:'complete' as const,witnessHash:'d'.repeat(64)};
    target.facts.framePolicyEnforced={...fact};target.facts.frameAncestorsRestricted={...fact};
    expect(evidence.policy).toBe(projectPolicy);expect(projectPolicy).toBe('vylnt-project-assessment-v3');
    const context=prepareProjectContexts(scan,evidence)(finding);expect(context.requiresReview).toBe(false);
    expect(context.projectFacts.embeddingPublicVerified).toBe('unknown');expect(context.projectFacts.sensitiveActionVerified).toBe('unknown');
    expect(guardProjectAssessment(context,finding,'contextual')).toBe('contextual');
    expect(guardProjectAssessment(context,{...finding,severity:'high'},'contextual')).toBe('needs-review');
    const legacy=projectEvidenceSchema.parse({...evidence,policy:'vylnt-project-assessment-v1'});expect(prepareProjectContexts(scan,legacy)(finding).requiresReview).toBe(true);
    const v2=projectEvidenceSchema.parse({...evidence,policy:'vylnt-project-assessment-v2'});expect(prepareProjectContexts(scan,v2)(finding).requiresReview).toBe(false);
    const foreign={...scan,observation:{...scan.observation,headers:{'content-security-policy':`frame-ancestors ${parent}`}}};
    expect(prepareProjectContexts(foreign,evidence)(finding).requiresReview).toBe(true);
    for(const patch of [{coverage:'partial' as const},{source:'response' as const},{witnessHash:'e'.repeat(64)}]){
      const changed=structuredClone(evidence);Object.assign(changed.targets.find(t=>t.category==='HDR-002')!.facts.frameAncestorsRestricted!,patch);
      expect(prepareProjectContexts(scan,changed)(finding).requiresReview).toBe(true);
    }
    target.facts.embeddingPublicVerified={...fact,source:'functional'};target.facts.sensitiveActionVerified={...fact,source:'functional'};
    expect(prepareProjectContexts(scan,evidence)(finding).requiresReview).toBe(true);
  });
  it('opts in scoped framing protection without changing v1-v3 partial-inventory decisions',async()=>{
    const scan=createReport(crypto.randomUUID(),{...report().observation,headers:{'content-security-policy':'frame-ancestors http://127.0.0.1:4100'}});
    const evidence=await collectResponseFacts(scan,binding(),false),finding=scan.findings.find(f=>f.ruleId==='HDR-002')!;
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['a'.repeat(64)],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:0};
    const fact={value:true,source:'browser' as const,coverage:'complete' as const,witnessHash:'d'.repeat(64)};
    Object.assign(evidence.targets.find(t=>t.category==='HDR-002')!.facts,{framePolicyEnforced:{...fact},frameAncestorsRestricted:{...fact}});
    for(const policy of ['vylnt-project-assessment-v1','vylnt-project-assessment-v2','vylnt-project-assessment-v3'] as const)
      expect(prepareProjectContexts(scan,{...evidence,policy})(finding).requiresReview).toBe(true);
    evidence.policy=projectFramePolicy;
    const context=prepareProjectContexts(scan,evidence)(finding);
    expect(context.requiresReview).toBe(false);expect(context.projectFacts.embeddingPublicVerified).toBe('unknown');
    expect(guardProjectAssessment(context,finding,'contextual')).toBe('contextual');
    for(const severity of ['high','critical'] as const)expect(guardProjectAssessment(context,{...finding,severity},'contextual')).toBe('needs-review');
    for(const inspection of [{...evidence.inspection,sourceHashes:[]},{...evidence.inspection,framework:'unsupported' as const},undefined])
      expect(prepareProjectContexts(scan,{...evidence,inspection})(finding).requiresReview).toBe(true);
    for(const patch of [{value:false},{coverage:'partial' as const},{source:'response' as const},{witnessHash:'f'.repeat(64)}]){
      const changed=structuredClone(evidence);Object.assign(changed.targets.find(t=>t.category==='HDR-002')!.facts.frameAncestorsRestricted!,patch);
      expect(prepareProjectContexts(scan,changed)(finding).requiresReview).toBe(true);
    }
    for(const csp of [`frame-ancestors ${parent}`,'frame-ancestors *','',undefined]){
      const headers:Record<string,string>=csp?{'content-security-policy':csp}:{};
      const changed={...scan,observation:{...scan.observation,headers}};
      expect(prepareProjectContexts(changed,evidence)(finding).requiresReview).toBe(true);
    }
    expect(prepareProjectContexts({...scan,observation:{...scan.observation,cspEvidenceComplete:false}},evidence)(finding).requiresReview).toBe(true);
  });
});

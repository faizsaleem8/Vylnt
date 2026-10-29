import { afterEach,describe,it,expect } from 'vitest';
import { mkdtemp,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHmac } from 'node:crypto';
import { ProjectSigner } from '../apps/server/project-signing';
import { createReport } from '../packages/core';
import { contentHash } from '../packages/core/integrity';
import { collectResponseFacts } from '../packages/ml/project-policy-facts';
import { prepareProjectData,prepareProjectHoldout } from '../packages/ml/project-dataset';

const secret='private-test-family-key-'.repeat(3),empty={families:[],variants:[]},dirs:string[]=[];
afterEach(async()=>{for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true});});
async function fixture(){
  const dir=await mkdtemp(join(tmpdir(),'vylnt-project-data-'));dirs.push(dir);const signer=await ProjectSigner.open(dir);
  const report=createReport(crypto.randomUUID(),{url:'https://fixture.example/private-path',scannedAt:'2026-10-27T00:00:00Z',headers:{},cookies:[],scripts:[],resources:[],domCollected:true,cspEvidenceComplete:true});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},true);
  evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'complete',sourceHashes:['d'.repeat(64)],headerOperations:0,cookieOperations:0,sessionMiddlewareRegistrations:0};
  const target=evidence.targets.find(t=>t.category==='HDR-002')!;
  for(const [name,value] of Object.entries({embeddingPublicVerified:false,sensitiveActionVerified:true}))Object.assign(target.facts,{[name]:{value,source:'functional',coverage:'complete',witnessHash:'e'.repeat(64)}});
  const family={familyId:'upstream:fixture/native-app',repositoryId:123,repository:'https://github.com/fixture/native-app',partition:'train' as const,license:'MIT' as const,licenseHash:'f'.repeat(64),securityImplementationHashes:['1'.repeat(64)],revisions:[{commit:evidence.commit,sourceHashes:evidence.inspection.sourceHashes}],adapterHash:evidence.adapterHash,oracleHash:'2'.repeat(64)};
  const lock={version:'vylnt-project-development-v1' as const,experiment:crypto.randomUUID(),assessmentPolicyHash:'3'.repeat(64),harnessHash:'4'.repeat(64),families:[family]};
  const oracle={version:'vylnt-project-oracle-v1' as const,familyId:family.familyId,scanHash:await contentHash(report),evidenceHash:await contentHash(evidence),commit:evidence.commit,configHash:evidence.configHash,adapterHash:evidence.adapterHash,harnessHash:lock.harnessHash,sourceLockHash:await contentHash(lock),oracleHash:family.oracleHash,scenarioHash:'5'.repeat(64),category:'HDR-002' as const,findingId:target.findingId,label:'change-warranted' as 'change-warranted'|'contextual',passed:true as const};
  return{signer,report,evidence,lock,input:{report,seal:signer.seal(evidence),oracle}};
}

describe('project development data cannot substitute fixtures for qualification',()=>{
  it('prepares signed holdout rows separately and derives safeguards from evidence only',async()=>{
    const f=await fixture(),lock={...f.lock,version:'vylnt-project-holdout-sources-v1',families:f.lock.families.map(family=>({...family,partition:'holdout'}))};
    f.input.oracle.sourceLockHash=await contentHash(lock);
    const result=await prepareProjectHoldout([f.input],lock,empty,secret,f.signer.trustedKeys);
    expect(result.split.version).toBe('vylnt-project-holdout-split-v1');expect(result.dataset.examples[0].evidenceRequiresReview).toBe(false);
    expect(result.dataset.examples[0].contextualAllowed).toBe(false);expect(Object.values(result.split.families)).toEqual(['holdout']);
    await expect(prepareProjectData([f.input],lock,empty,secret,f.signer.trustedKeys)).rejects.toThrow();
    await expect(prepareProjectHoldout([f.input],f.lock,empty,secret,f.signer.trustedKeys)).rejects.toThrow();
  });
  it('rejects signed mechanism-reference evidence even with an application source declaration',async()=>{
    const f=await fixture();f.evidence.collectionKind='mechanism-fixture';f.input.seal=f.signer.seal(f.evidence);f.input.oracle.evidenceHash=await contentHash(f.evidence);
    await expect(prepareProjectData([f.input],f.lock,empty,secret,f.signer.trustedKeys)).rejects.toThrow(/Mechanism fixtures/);
  });
  it('retains numeric metadata only, deduplicates repeated findings and reports deficits',async()=>{
    const f=await fixture(),result=await prepareProjectData([f.input,f.input],f.lock,empty,secret,f.signer.trustedKeys);
    expect(result.dataset.examples).toHaveLength(1);expect(result.rejected[0].reason).toBe('repeated-context');
    expect(result.audit.ready).toBe(false);expect(result.audit.qualification).toBe(false);expect(result.audit.testPredictions).toBe(0);
    expect(result.audit.categories['HDR-002'].partitions.train.classes['change-warranted'].contexts).toBe(1);
    for(const value of ['private-path','fixture/native-app',f.report.scanId,f.evidence.runId])expect(JSON.stringify(result)).not.toContain(value);
  });
  it('retains opposing labels and forces uncertainty instead of choosing the majority',async()=>{
    const f=await fixture(),opposed=structuredClone(f.input);opposed.oracle.label='contextual';
    const result=await prepareProjectData([f.input,f.input,f.input,opposed],f.lock,empty,secret,f.signer.trustedKeys);
    expect(result.dataset.examples).toHaveLength(2);expect(result.dataset.examples.every(r=>r.uncertain)).toBe(true);
    expect(result.audit.conflictingOrUnknownVariants).toBe(1);expect(result.audit.categories['HDR-002'].partitions.train.classes['change-warranted'].contexts).toBe(0);
  });
  it('keeps unsupported or partial evidence uncertain despite a confident oracle label',async()=>{
    const f=await fixture();f.evidence.inspection!.coverage='partial';f.input.seal=f.signer.seal(f.evidence);f.input.oracle.evidenceHash=await contentHash(f.evidence);
    const result=await prepareProjectData([f.input],f.lock,empty,secret,f.signer.trustedKeys);
    expect(result.dataset.examples[0].uncertain).toBe(true);expect(result.audit.ready).toBe(false);
  });
  it('rejects changed reports, untrusted keys and oracle/source/commit binding tampering',async()=>{
    const f=await fixture();await expect(prepareProjectData([f.input],f.lock,empty,secret,[])).rejects.toThrow(/provenance/);
    for(const key of ['scanHash','evidenceHash','commit','configHash','adapterHash','harnessHash','sourceLockHash','oracleHash'] as const){
      const changed=structuredClone(f.input);changed.oracle[key]='9'.repeat(key==='commit'?40:64);
      await expect(prepareProjectData([changed],f.lock,empty,secret,f.signer.trustedKeys)).rejects.toThrow(/binding|identity/i);
    }
    const changed=structuredClone(f.input);changed.report.observation.url='https://fixture.example/changed';
    await expect(prepareProjectData([changed],f.lock,empty,secret,f.signer.trustedKeys)).rejects.toThrow();
    const lock=structuredClone(f.lock);lock.families[0].revisions[0].sourceHashes=['9'.repeat(64)];
    await expect(prepareProjectData([f.input],lock,empty,secret,f.signer.trustedKeys)).rejects.toThrow(/inspection mismatch/);
  });
  it('rejects previous families and retains rejected numeric overlaps',async()=>{
    const f=await fixture(),family=createHmac('sha256',secret).update('family:'+f.lock.families[0].familyId).digest('hex');
    await expect(prepareProjectData([f.input],f.lock,{families:[family],variants:[]},secret,f.signer.trustedKeys)).rejects.toThrow(/Previously exposed/);
    const first=await prepareProjectData([f.input],f.lock,empty,secret,f.signer.trustedKeys);
    const next=await prepareProjectData([f.input],f.lock,{families:[],variants:[first.dataset.examples[0].variant]},secret,f.signer.trustedKeys);
    expect(next.dataset.examples).toHaveLength(0);expect(next.rejected[0].reason).toBe('previous-numeric-input');
  });
  it('rejects family renaming, repeated repository IDs and shared source/security implementations',async()=>{
    const f=await fixture(),alias=structuredClone(f.lock);alias.families[0].familyId='friendly-new-name';
    await expect(prepareProjectData([],alias,empty,secret,[])).rejects.toThrow(/canonical upstream/);
    for(const collision of ['repository','implementation','template']){
      const lock=structuredClone(f.lock),second=structuredClone(lock.families[0]);
      second.familyId='upstream:fixture/other';second.repository='https://github.com/fixture/other';
      if(collision!=='repository')second.repositoryId=456;
      if(collision==='template')second.securityImplementationHashes=['6'.repeat(64)];
      lock.families.push(second);
      await expect(prepareProjectData([],lock,empty,secret,[])).rejects.toThrow(/family|implementation|template/i);
    }
  });
  it('excludes cross-partition duplicate inputs without discarding their records',async()=>{
    const f=await fixture(),family=structuredClone(f.lock.families[0]);
    const lock:unknown={...f.lock,families:[f.lock.families[0],{...family,familyId:'upstream:fixture/other',repository:'https://github.com/fixture/other',repositoryId:456,partition:'validation',securityImplementationHashes:['6'.repeat(64)],revisions:[{commit:f.evidence.commit,sourceHashes:['7'.repeat(64)]}]}]};
    f.input.oracle.sourceLockHash=await contentHash(lock);
    const report=structuredClone(f.report);report.scanId=crypto.randomUUID();
    const evidence=structuredClone(f.evidence);evidence.inspection!.sourceHashes=['7'.repeat(64)];evidence.scanId=report.scanId;evidence.originalScanHash=await contentHash(report);
    const second={report,seal:f.signer.seal(evidence),oracle:{...f.input.oracle,familyId:'upstream:fixture/other',scanHash:await contentHash(report),evidenceHash:await contentHash(evidence)}};
    const result=await prepareProjectData([f.input,second],lock,empty,secret,f.signer.trustedKeys);
    expect(result.dataset.examples).toHaveLength(2);expect(result.audit.crossPartitionVariants).toBe(1);
    expect(result.audit.categories['HDR-002'].partitions.train.classes['change-warranted'].contexts).toBe(0);
  });
});

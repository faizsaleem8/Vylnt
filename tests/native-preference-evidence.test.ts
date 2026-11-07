/** Mechanics fixtures only. These are not application data or qualification cases. */
import {afterEach,it,expect} from 'vitest';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {parseSubmission} from '../packages/core/validation';
import {contentHash} from '../packages/core/integrity';
import {ProjectSigner} from '../apps/server/project-signing';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {prepareProjectContexts,guardProjectAssessment} from '../packages/core/project-evidence';
import {etherpadPreferenceSource,nativePreferenceSource,measureNativePreference,mergeNativePreference,type NativePreferenceControls,type PreferenceControls} from '../packages/ml/native-preference-evidence';
import {createNativePreferenceSeedBatch,authenticateNativeBatch} from '../packages/ml/project-seed-corpus';
const roots:string[]=[],secret='mechanics-key-not-application-data'.repeat(2);
afterEach(async()=>{for(const root of roots.splice(0)){if(!root.startsWith(resolve('.local/test-tmp')+'/')&&!root.startsWith(resolve('.local/test-tmp')+'\\'))throw Error('Unexpected test cleanup');await rm(root,{recursive:true,force:true});}});
async function fixture(path='/',secure=false){
  const parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'native-preference-'));roots.push(root);
  const signer=await ProjectSigner.open(root);
  const report=parseSubmission({scanId:crypto.randomUUID(),observation:{url:'http://127.0.0.1:12345'+path,scannedAt:'2026-11-06T10:00:00Z',headers:{},
    domCollected:true,cspEvidenceComplete:true,scripts:[],resources:[],cookies:[{name:nativePreferenceSource.cookieName,secure,httpOnly:false,sameSite:'strict',session:false}]}});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:nativePreferenceSource.commit,configHash:'1'.repeat(64),adapterHash:'2'.repeat(64)},false);
  evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['3'.repeat(64)],headerOperations:0,cookieOperations:1,sessionMiddlewareRegistrations:0};
  const controls:NativePreferenceControls={version:'vylnt-native-preference-oracle-v1',scanHash:await contentHash(report),adapterHash:evidence.adapterHash,
    sourceGraphHash:nativePreferenceSource.graphHash,collectorHash:'4'.repeat(64),buildHash:'5'.repeat(64),overlayHash:'6'.repeat(64),nativeSessionSignature:true,
    independentOwnerReadback:true,authenticationAttributesPreserved:true,sourceReverified:true,
    phases:(['first','second','absent','restricted','restored','competing-storage','no-auth'] as const).map(mode=>({mode,
      language:mode==='second'||mode==='competing-storage'?'fr':mode==='absent'?'tr':mode==='restricted'?'en':'de',
      authentication:mode==='no-auth'?'anonymous':'authenticated',...(mode==='first'?{nativeInteraction:true}:{}),
      access:{valid:true,wrote:true,read:mode!=='restricted'},complete:true}))};
  return {report,evidence,controls,signer};
}
it('produces contextual native cookie seeds without changing severity or high-severity visibility',async()=>{
  const f=await fixture('/legal-consent'),original=structuredClone(f.report);
  const measured=await measureNativePreference(f.report,f.evidence,f.controls),evidence=await mergeNativePreference(f.evidence,measured);
  expect(measured.status).toBe('verified');expect(evidence.policy).toBe('vylnt-project-assessment-v9');
  const seeds=await createNativePreferenceSeedBatch(f.report,f.signer.seal(evidence),f.signer.trustedKeys,f.controls,secret);
  expect(seeds.rows.filter(row=>!row.uncertain).map(row=>[row.category,row.label])).toEqual([['CK-001','contextual'],['CK-002','contextual']]);
  const context=prepareProjectContexts(f.report,evidence);
  for(const finding of f.report.findings.filter(row=>row.ruleId.startsWith('CK-'))){
    expect(context(finding).requiresReview).toBe(false);
    expect(guardProjectAssessment(context(finding),finding,'contextual')).toBe(finding.severity==='high'?'needs-review':'contextual');
  }
  expect(f.report).toEqual(original);expect(seeds.eligibleForTraining).toBe(false);expect(seeds.qualification).toBe(false);
  expect(authenticateNativeBatch(seeds,secret)).toEqual(seeds);
});
it('requires Secure profile receipts to match the browser and labels only HttpOnly',async()=>{
  const f=await fixture('/legal-consent',true);
  expect((await measureNativePreference(f.report,f.evidence,f.controls)).status).toBe('needs-review');
  f.controls.securePreference=true;
  const measured=await measureNativePreference(f.report,f.evidence,f.controls);
  expect(measured.status).toBe('verified');
  const evidence=await mergeNativePreference(f.evidence,measured);
  const seeds=await createNativePreferenceSeedBatch(f.report,f.signer.seal(evidence),f.signer.trustedKeys,f.controls,secret);
  expect(seeds.rows.filter(row=>!row.uncertain).map(row=>[row.category,row.label])).toEqual([['CK-002','contextual']]);
  const insecure=await fixture('/legal-consent');
  expect((await measureNativePreference(insecure.report,insecure.evidence,{...insecure.controls,securePreference:true})).status).toBe('needs-review');
});
it('rejects unregistered page scopes while accepting the native consent redirect',async()=>{
  const f=await fixture('/unexpected-page');
  await expect(measureNativePreference(f.report,f.evidence,f.controls)).rejects.toThrow('origin');
});
it('accepts both pinned native writers while retaining review for unsupported cookie states',async()=>{
  for(const sameSite of ['lax','strict','no_restriction'] as const){
    const f=await fixture('/legal-consent');f.report.observation.cookies![0].sameSite=sameSite;
    f.controls.scanHash=await contentHash(f.report);f.evidence.originalScanHash=f.controls.scanHash;
    const measured=await measureNativePreference(f.report,f.evidence,f.controls);
    expect(measured.status).toBe(sameSite==='no_restriction'?'needs-review':'verified');
  }
});
it('retains review for a missing phase, contradictory storage outcome or unverified native source',async()=>{
  for(const mutation of ['missing','storage','source','attributes','owner'] as const){
    const f=await fixture();
    if(mutation==='missing')f.controls.phases.pop();
    if(mutation==='storage')f.controls.phases.find(p=>p.mode==='competing-storage')!.language='de';
    if(mutation==='source')f.controls.sourceReverified=false;
    if(mutation==='attributes')f.controls.authenticationAttributesPreserved=false;
    if(mutation==='owner')f.controls.independentOwnerReadback=false;
    const measured=await measureNativePreference(f.report,f.evidence,f.controls);
    expect(measured.status).toBe('needs-review');expect(measured.targets).toEqual([]);
    const evidence=await mergeNativePreference(f.evidence,measured);
    const seeds=await createNativePreferenceSeedBatch(f.report,f.signer.seal(evidence),f.signer.trustedKeys,f.controls,secret);
    expect(seeds.rows.every(row=>row.uncertain)).toBe(true);
  }
});
it('rejects copied/edited producer receipts and mismatched same-run identities',async()=>{
  const f=await fixture(),measured=await measureNativePreference(f.report,f.evidence,f.controls);
  await expect(mergeNativePreference(f.evidence,structuredClone(measured))).rejects.toThrow('receipt');
  const other=structuredClone(f.evidence);other.adapterHash='7'.repeat(64);
  await expect(mergeNativePreference(other,measured)).rejects.toThrow('binding');
  if(measured.controls.version!=='vylnt-native-preference-oracle-v1')throw Error('Unexpected test receipt type');
  measured.controls.phases[0].complete=false;
  await expect(mergeNativePreference(f.evidence,measured)).rejects.toThrow('receipt');
  f.controls.scanHash='8'.repeat(64);
  await expect(measureNativePreference(f.report,f.evidence,f.controls)).rejects.toThrow('binding');
});
it('requires the Etherpad counterfactual, authentication boundary and exact scan binding',async()=>{
  const f=await fixture();
  const report=parseSubmission({scanId:f.report.scanId,observation:{...f.report.observation,
    url:'http://127.0.0.1:12345/p/vylnt-disposable',cookies:[{...f.report.observation.cookies![0],name:etherpadPreferenceSource.cookieName}]}});
  const evidence=await collectResponseFacts(report,{...f.evidence,commit:etherpadPreferenceSource.commit},false);
  evidence.inspection=f.evidence.inspection;
  const controls:PreferenceControls={version:'vylnt-etherpad-preference-oracle-v1',scanHash:evidence.originalScanHash,adapterHash:evidence.adapterHash,
    sourceGraphHash:etherpadPreferenceSource.graphHash,sourceReverified:true,anonymousDenied:true,padServed:true,
    persisted:true,restricted:true,restored:true,preferenceAloneDenied:true};
  const measured=await measureNativePreference(report,evidence,controls),merged=await mergeNativePreference(evidence,measured);
  const seeds=await createNativePreferenceSeedBatch(report,f.signer.seal(merged),f.signer.trustedKeys,controls,secret);
  expect(seeds.rows.filter(row=>!row.uncertain).map(row=>row.category)).toEqual(['CK-001','CK-002']);
  for(const missing of ['restricted','restored','anonymousDenied','preferenceAloneDenied','sourceReverified'] as const){
    const failed={...controls,[missing]:false};
    expect((await measureNativePreference(report,evidence,failed)).status).toBe('needs-review');
    const rows=await createNativePreferenceSeedBatch(report,f.signer.seal(merged),f.signer.trustedKeys,failed,secret);
    expect(rows.rows.every(row=>row.uncertain)).toBe(true);
  }
  await expect(measureNativePreference(report,evidence,{...controls,scanHash:'0'.repeat(64)})).rejects.toThrow('binding');
});
it('keeps earlier partial-inspection policies in review and rejects changed fact witnesses',async()=>{
  const f=await fixture(),measured=await measureNativePreference(f.report,f.evidence,f.controls),evidence=await mergeNativePreference(f.evidence,measured);
  const legacy={...evidence,policy:'vylnt-project-assessment-v8' as const};
  for(const finding of f.report.findings.filter(row=>row.ruleId.startsWith('CK-')))expect(prepareProjectContexts(f.report,legacy)(finding).requiresReview).toBe(true);
  evidence.targets.find(target=>target.category==='CK-002')!.facts.cookieJsAccessRequired!.witnessHash='9'.repeat(64);
  const seeds=await createNativePreferenceSeedBatch(f.report,f.signer.seal(evidence),f.signer.trustedKeys,f.controls,secret);
  expect(seeds.rows.find(row=>row.category==='CK-002')!.uncertain).toBe(true);
});
it('rejects source commits, cookie ambiguity, arbitrary metadata and forged signed evidence',async()=>{
  const f=await fixture();
  const wrong=structuredClone(f.evidence);wrong.commit='f'.repeat(40);
  await expect(measureNativePreference(f.report,wrong,f.controls)).rejects.toThrow('binding');
  Object.assign(f.controls,{credential:'unsupported-private-metadata'});
  await expect(measureNativePreference(f.report,f.evidence,f.controls)).rejects.toThrow();
  delete (f.controls as unknown as Record<string,unknown>).credential;
  const measured=await measureNativePreference(f.report,f.evidence,f.controls),evidence=await mergeNativePreference(f.evidence,measured),seal=f.signer.seal(evidence);
  seal.evidence.configHash='0'.repeat(64);
  await expect(createNativePreferenceSeedBatch(f.report,seal,f.signer.trustedKeys,f.controls,secret)).rejects.toThrow('provenance');
  const ambiguous=structuredClone(f.report);ambiguous.observation.cookies!.push({...ambiguous.observation.cookies![0]});
  f.controls.scanHash=await contentHash(ambiguous);f.evidence.originalScanHash=f.controls.scanHash;
  expect((await measureNativePreference(ambiguous,f.evidence,f.controls)).status).toBe('needs-review');
});

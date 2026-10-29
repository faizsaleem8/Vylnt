import {afterEach,it,expect} from 'vitest';
import {mkdir,mkdtemp,rm,cp,writeFile,readFile,readdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createReport} from '../packages/core';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {ProjectSigner} from '../apps/server/project-signing';
import {projectRules} from '../packages/core/project-evidence';
import {createTabinatorSeedBatch,assembleNativeSeedCorpus} from '../packages/ml/project-seed-corpus';

const roots:string[]=[],secret='unit-test-family-identity-not-training-data'.repeat(2);
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
async function fixture(httpOnly=false){
  const parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'seed-unit-'));roots.push(root);
  const report=createReport(crypto.randomUUID(),{url:'http://127.0.0.1/private-profile',scannedAt:'2026-10-29T00:00:00.000Z',headers:{},domCollected:true,scripts:[],resources:[],
    cookies:[{name:'private-session-cookie',secure:false,httpOnly,sameSite:'lax',session:true}]});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'51e7cffa382da3d7c710cbfc0d136868c94eb119',configHash:(httpOnly?'1':'2').repeat(64),adapterHash:'3'.repeat(64)},false);
  evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['4'.repeat(64)],headerOperations:0,cookieOperations:1,sessionMiddlewareRegistrations:1};
  const fact=(value:boolean)=>({value,source:'functional' as const,coverage:'complete' as const,witnessHash:'5'.repeat(64)});
  for(const target of evidence.targets)if(target.category.startsWith('CK-'))Object.assign(target.facts,{cookieAuthDependency:fact(true),cookiePreferenceVerified:fact(false),cookieJsAccessObserved:fact(false),cookieJsAccessRequired:fact(false)});
  const controls={signedSessionMapsToSyntheticUser:true,nativeBookmarkRowVerified:true,anonymousDeniedWithoutMutation:true,cookie:{secure:false,httpOnly},javaScriptAccessUnnecessary:true};
  const signer=await ProjectSigner.open(root);
  const make=()=>createTabinatorSeedBatch(report,signer.seal(evidence),signer.trustedKeys,controls,secret);
  return{root,report,evidence,controls,signer,make};
}
it('creates measured cookie seeds, leaves unsupported categories uncertain and excludes identifiers',async()=>{
  const f=await fixture(),batch=await f.make();
  expect(batch.rows.filter(row=>row.label==='change-warranted').map(row=>row.category).sort()).toEqual(['CK-001','CK-002']);
  expect(batch.rows.filter(row=>row.category.startsWith('HDR-')).every(row=>row.label==='needs-review'&&row.uncertain)).toBe(true);
  for(const value of ['127.0.0.1','private-profile','private-session-cookie',f.report.scanId,f.evidence.runId,secret])expect(JSON.stringify(batch)).not.toContain(value);
  expect(batch.eligibleForTraining).toBe(false);
});
it('deduplicates repeated contexts, writes seven category slices and refuses to call seeds training-ready',async()=>{
  const f=await fixture(),batch=await f.make(),result=await assembleNativeSeedCorpus([batch,batch],secret);
  expect(Object.keys(result.categories)).toEqual([...projectRules]);expect(result.audit.repeatedContexts).toBe(batch.rows.length);
  expect(result.audit.families).toBe(1);expect(result.audit.trainingReady).toBe(false);expect(result.audit.modelFitted).toBe(false);
  expect(result.categories['NET-001'].examples).toEqual([]);expect(result.audit.categories['CK-001'].completeChangeContexts).toBe(1);
  expect(result.audit.categories['CK-002'].contextualContexts).toBe(0);
});
it('keeps default and readable response profiles as the same family and adapter',async()=>{
  const a=await(await fixture(true)).make(),b=await(await fixture(false)).make();
  expect(a.family).toBe(b.family);expect(a.adapterHash).toBe(b.adapterHash);expect(a.configHash).not.toBe(b.configHash);
  const result=await assembleNativeSeedCorpus([a,b],secret);expect(result.audit.families).toBe(1);
  expect(result.audit.categories['CK-001'].completeChangeContexts).toBe(1);
  expect(result.audit.categories['CK-001'].numericChangeVariants).toBe(2);
});
it('does not assign change labels when independent native authentication controls fail',async()=>{
  const f=await fixture();f.controls.nativeBookmarkRowVerified=false;
  expect((await f.make()).rows.every(row=>row.label==='needs-review')).toBe(true);
});
it('does not label HttpOnly as a change without positive compatibility controls',async()=>{
  const f=await fixture();f.controls.javaScriptAccessUnnecessary=false;
  expect((await f.make()).rows.find(row=>row.category==='CK-002')?.label).toBe('needs-review');
});
it('keeps a measured label uncertain when extraction has missing context',async()=>{
  const f=await fixture();for(const target of f.evidence.targets)delete target.facts.cookieAuthDependency;
  const result=await assembleNativeSeedCorpus([await f.make()],secret);
  expect(result.audit.categories['CK-001'].completeChangeContexts).toBe(0);
});
it('rejects mismatched native cookie attributes, altered scans, unsupported commits and mechanism fixtures',async()=>{
  const f=await fixture();f.controls.cookie.secure=true;await expect(f.make()).rejects.toThrow('cookie measurement');f.controls.cookie.secure=false;
  const seal=f.signer.seal(f.evidence);const changed=structuredClone(f.report);changed.observation.cookies![0].secure=true;
  await expect(createTabinatorSeedBatch(changed,seal,f.signer.trustedKeys,f.controls,secret)).rejects.toThrow();
  f.evidence.commit='f'.repeat(40);await expect(f.make()).rejects.toThrow('provenance');
  f.evidence.commit='51e7cffa382da3d7c710cbfc0d136868c94eb119';f.evidence.collectionKind='mechanism-fixture';await expect(f.make()).rejects.toThrow('provenance');
});
it('rejects edited class labels and receipts from another private family key',async()=>{
  const batch=await(await fixture()).make();const changed=structuredClone(batch);changed.rows[0].label='needs-review';changed.rows[0].uncertain=!changed.rows[0].uncertain;
  await expect(assembleNativeSeedCorpus([changed],secret)).rejects.toThrow('receipt changed');
  await expect(assembleNativeSeedCorpus([batch],'different-private-family-key'.repeat(2))).rejects.toThrow('another installation');
});
it('does not import unexpected metadata through oracle controls',async()=>{
  const f=await fixture();Object.assign(f.controls,{credential:'must-not-be-retained'});await expect(f.make()).rejects.toThrow();
});
it('runs the actual seed command, records blocked training, refuses overwrites and rejects edited receipts',async()=>{
  const f=await fixture(),batch=await f.make(),local=join(f.root,'.local'),observation=join(local,'ml-native-observations/tabinator/run');
  await cp('packages',join(f.root,'packages'),{recursive:true});await mkdir(join(f.root,'scripts'));
  await cp('scripts/ml-project-seeds.mjs',join(f.root,'scripts/ml-project-seeds.mjs'));
  await mkdir(observation,{recursive:true});await writeFile(join(local,'insights-dataset-key'),secret);
  await writeFile(join(observation,'development-seeds.json'),JSON.stringify(batch));
  await writeFile(join(observation,'acceptance.json'),JSON.stringify({completed:true,sourceRunCleanup:true,reloadVerified:true}));
  const run=async(output:string)=>{try{return{code:0,...await promisify(execFile)(process.execPath,['scripts/ml-project-seeds.mjs','--output',output],{cwd:f.root,windowsHide:true,timeout:30000})};}catch(error){return error as {code:number;stdout:string;stderr:string};}};
  const result=await run('.local/corpus');expect(result.code,result.stderr).toBe(2);
  const files=await readdir(join(local,'corpus'));for(const category of projectRules)expect(files).toContain(category+'.json');
  expect(JSON.parse(await readFile(join(local,'corpus/training-status.json'),'utf8')).modelFitted).toBe(false);
  expect((await run('.local/corpus')).stderr).toContain('already exists');
  await writeFile(join(observation,'acceptance.json'),JSON.stringify({completed:'true',sourceRunCleanup:true,reloadVerified:true}));
  expect((await run('.local/incomplete')).stderr).toContain('did not finish');await expect(access(join(local,'incomplete'))).rejects.toThrow();
  await writeFile(join(observation,'acceptance.json'),JSON.stringify({completed:true,sourceRunCleanup:true,reloadVerified:true}));
  const changed=structuredClone(batch);changed.rows[0].uncertain=!changed.rows[0].uncertain;await writeFile(join(observation,'development-seeds.json'),JSON.stringify(changed));
  expect((await run('.local/edited')).stderr).toContain('receipt changed');await expect(access(join(local,'edited'))).rejects.toThrow();
},60000);

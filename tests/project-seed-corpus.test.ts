import {projectFrameWritePolicy,projectTransportPolicy,projectHstsPlaintextPolicy,prepareProjectContexts,guardProjectAssessment} from '../packages/core/project-evidence';
import {afterEach,it,expect,vi} from 'vitest';
import {authenticateNativeBatch,createNativeApiHstsSeedBatch} from '../packages/ml/project-seed-corpus';
import {mkdir,mkdtemp,rm,cp,writeFile,readFile,readdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHmac} from 'node:crypto';
import {contentHash,canonicalJson} from '../packages/core/integrity';
import {parseSubmission} from '../packages/core/validation';
import {etherpadPreferenceSource} from '../packages/ml/native-preference-evidence';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {ProjectSigner} from '../apps/server/project-signing';
import {projectRules,projectFramePolicy} from '../packages/core/project-evidence';
import {createTabinatorSeedBatch,createNativeSessionSeedBatch,nativeSessionSources,createNativeOperationSeedBatch,nativeOperationSources,assembleNativeSeedCorpus,type TabinatorSeedControls,type NativeSeedBatch,type NativeOperationControls} from '../packages/ml/project-seed-corpus';

const roots:string[]=[],secret='unit-test-family-identity-not-training-data'.repeat(2);
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
it.each([
  ['fieldpoint','/api/auth/me',nativeSessionSources.fieldpoint.commit],
  ['portal','/api/groups',nativeOperationSources.portal.commit],
  ['personal-knowledge-manager','/api/notes',nativeOperationSources['personal-knowledge-manager'].commit],
  ['wikiflow','/api/session',nativeSessionSources.wikiflow.commit],
  ['anonymous-notepad','/vylnt-document',nativeOperationSources['anonymous-notepad'].commit],
  ['homeinventory','/api/auth/me',nativeSessionSources.homeinventory.commit],
  ['etherpad','/p/vylnt-disposable',etherpadPreferenceSource.commit],
] as const)('requires a matching %s API response and complete TLS evidence for native HSTS seeds',async(source,path,commit)=>{
  const parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'hsts-seed-unit-'));roots.push(root);
  const signer=await ProjectSigner.open(root),adapterHash='a'.repeat(64),leaf='b'.repeat(64);
  for(const [wireHsts,expected] of [['max-age=0','change-warranted'],['max-age=086400','contextual']] as const){
    const report=parseSubmission({scanId:crypto.randomUUID(),observation:{url:'https://vylnt-resource.test:8443'+path,
      scannedAt:'2026-11-07T00:00:00.000Z',headers:{'strict-transport-security':wireHsts},domCollected:true,cookies:[],resources:[],scripts:[]}});
    const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit,
      configHash:'c'.repeat(64),adapterHash},true);
    evidence.policy=projectTransportPolicy;
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['d'.repeat(64)],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:1};
    const target=evidence.targets.find(value=>value.category==='HDR-001')!;
    const browser={value:true,source:'browser',coverage:'complete',witnessHash:'e'.repeat(64)} as const;
    Object.assign(target.facts,{tlsValidated:browser,hstsApplicable:browser,responseChainComplete:browser});
    const input={nativeWriteReadback:true,checkIdentity:adapterHash,leaf,wireHsts};
    const issue=(control=input)=>createNativeApiHstsSeedBatch(source,report,signer.seal(evidence),signer.trustedKeys,control,secret);
    expect((await issue()).rows.filter(row=>!row.uncertain).map(row=>[row.category,row.label])).toEqual([['HDR-001',expected]]);
    expect((await issue({...input,nativeWriteReadback:false})).rows.every(row=>row.uncertain)).toBe(true);
    await expect(issue({...input,wireHsts:wireHsts==='max-age=0'?'max-age=086400':'max-age=0'})).rejects.toThrow(/scope/);
    await expect(createNativeApiHstsSeedBatch(source==='portal'?'fieldpoint':'portal',report,signer.seal(evidence),signer.trustedKeys,input,secret)).rejects.toThrow(/scope/);
    target.facts.tlsValidated={...browser,coverage:'partial'};
    expect((await issue()).rows.every(row=>row.uncertain)).toBe(true);
  }
});
it('labels an absent header only under the scoped, signed plaintext policy',async()=>{
  const parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'hsts-missing-unit-'));roots.push(root);
  const signer=await ProjectSigner.open(root),checkIdentity='a'.repeat(64),plaintextWitness='b'.repeat(64);
  const report=parseSubmission({scanId:crypto.randomUUID(),observation:{url:'https://vylnt-resource.test:8443/api/auth/me',
    scannedAt:'2026-11-07T00:00:00.000Z',headers:{},domCollected:true,cookies:[],resources:[],scripts:[]}});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:nativeSessionSources.fieldpoint.commit,
    configHash:'c'.repeat(64),adapterHash:checkIdentity},true);
  evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['d'.repeat(64)],headerOperations:1,cookieOperations:0,sessionMiddlewareRegistrations:1};
  const target=evidence.targets.find(value=>value.category==='HDR-001')!;
  const browser={value:true,source:'browser',coverage:'complete',witnessHash:'e'.repeat(64)} as const;
  Object.assign(target.facts,{tlsValidated:browser,hstsApplicable:browser,responseChainComplete:browser,
    hstsPreloadConfirmed:{...browser,value:false,witnessHash:plaintextWitness}});
  const input={nativeWriteReadback:true,checkIdentity,leaf:'f'.repeat(64),wireHsts:'absent' as const,plaintextWitness};
  const issue=(control=input)=>createNativeApiHstsSeedBatch('fieldpoint',report,signer.seal(evidence),signer.trustedKeys,control,secret);
  evidence.policy=projectTransportPolicy;
  expect((await issue()).rows.every(row=>row.uncertain)).toBe(true);
  evidence.policy=projectHstsPlaintextPolicy;
  const rows=(await issue()).rows.filter(row=>!row.uncertain);
  expect(rows.map(row=>[row.category,row.label])).toEqual([['HDR-001','change-warranted']]);
  expect((await issue({...input,plaintextWitness:'0'.repeat(64)})).rows.every(row=>row.uncertain)).toBe(true);
  const finding=report.findings.find(finding=>finding.ruleId==='HDR-001')!;
  expect(guardProjectAssessment(prepareProjectContexts(report,evidence)(finding),finding,'contextual')).toBe('needs-review');
  target.facts.hstsPreloadConfirmed!.coverage='partial';
  expect((await issue()).rows.every(row=>row.uncertain)).toBe(true);
});
async function fixture(httpOnly=false,framing=false){
  const parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'seed-unit-'));roots.push(root);
  const report=parseSubmission({scanId:crypto.randomUUID(),observation:{url:'http://127.0.0.1/private-profile',scannedAt:'2026-10-29T00:00:00.000Z',headers:framing?{'content-security-policy':'frame-ancestors http://127.0.0.1'}:{},cspEvidenceComplete:true,domCollected:true,scripts:[],resources:[],
    cookies:[{name:'private-session-cookie',secure:false,httpOnly,sameSite:'lax',session:true}]}});
  const evidence=await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'51e7cffa382da3d7c710cbfc0d136868c94eb119',configHash:(httpOnly?'1':'2').repeat(64),adapterHash:'3'.repeat(64)},false);
  evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',sourceHashes:['4'.repeat(64)],headerOperations:0,cookieOperations:1,sessionMiddlewareRegistrations:1};
  const fact=(value:boolean)=>({value,source:'functional' as const,coverage:'complete' as const,witnessHash:'5'.repeat(64)});
  for(const target of evidence.targets)if(target.category.startsWith('CK-'))Object.assign(target.facts,{cookieAuthDependency:fact(true),cookiePreferenceVerified:fact(false),cookieJsAccessObserved:fact(false),cookieJsAccessRequired:fact(false)});
  const controls:TabinatorSeedControls={signedSessionMapsToSyntheticUser:true,nativeBookmarkRowVerified:true,anonymousDeniedWithoutMutation:true,cookie:{secure:false,httpOnly},javaScriptAccessUnnecessary:true};
  if(framing){
    evidence.policy=projectFramePolicy;
    controls.framePolicy={version:'vylnt-frame-policy-v1',scanHash:await contentHash(report),checkIdentity:evidence.adapterHash,sourceHealthy:true,
      controls:{permitted:'embedded',forbidden:'csp-blocked',repeatedForbidden:'csp-blocked',nestedForbidden:'csp-blocked'}};
    const witnessHash=await contentHash({version:controls.framePolicy.version,originalScanHash:await contentHash(report),check:evidence.adapterHash,
      policyHash:await contentHash(report.observation.headers!['content-security-policy']),controls:controls.framePolicy.controls,scope:'finite-response-policy/http-loopback-ancestors'});
    Object.assign(evidence.targets.find(t=>t.category==='HDR-002')!.facts,{framePolicyEnforced:{value:true,source:'browser',coverage:'complete',witnessHash},frameAncestorsRestricted:{value:true,source:'browser',coverage:'complete',witnessHash}});
  }
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
it('authenticates a prospective registration and rejects retagging a historical batch',async()=>{
  const f=await fixture(),older=await f.make(),registered='a'.repeat(64);
  try{
    vi.stubEnv('VYLNT_NATIVE_REGISTRATION',registered);
    const batch=await f.make();
    expect(authenticateNativeBatch(batch,secret).registrationHash).toBe(registered);
    expect(batch.rows).toEqual(older.rows);
    expect(()=>authenticateNativeBatch({...older,registrationHash:registered},secret)).toThrow();
    expect(()=>authenticateNativeBatch({...batch,registrationHash:'b'.repeat(64)},secret)).toThrow();
  }finally{vi.unstubAllEnvs();}
});
it.each(['fieldpoint','yoyo-collection','bookwise','wikiflow','habit-tracker'] as const)('binds %s native seeds to its fixed source identity and preserves unknowns',async source=>{
  const f=await fixture();
  await expect(createNativeSessionSeedBatch(source,f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,f.controls,secret)).rejects.toThrow('provenance');
  const old=await f.make();f.evidence.commit=nativeSessionSources[source].commit;
  const batch=await createNativeSessionSeedBatch(source,f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,f.controls,secret);
  expect(batch.family).not.toBe(old.family);expect(batch.rows[0].variant).toBe(old.rows[0].variant);
  expect(batch.rows.filter(r=>r.category.startsWith('HDR-')).every(r=>r.uncertain)).toBe(true);
  expect((await assembleNativeSeedCorpus([old,batch,batch],secret)).audit).toMatchObject({families:2,trainingReady:false});
  f.controls.anonymousDeniedWithoutMutation=false;
  expect((await createNativeSessionSeedBatch(source,f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,f.controls,secret)).rows.every(r=>r.label==='needs-review')).toBe(true);
});
it.each(Object.keys(nativeOperationSources) as (keyof typeof nativeOperationSources)[])('binds %s operation evidence without manufacturing cookie purposes or families',async source=>{
  const f=await fixture(false,true),controls:NativeOperationControls={sourceHealthy:true,nativeWriteReadback:true,access:'public',accessControl:'allowed',framePolicy:f.controls.framePolicy};
  const make=()=>createNativeOperationSeedBatch(source,f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,controls,secret);
  await expect(make()).rejects.toThrow('provenance');f.evidence.commit=nativeOperationSources[source].commit;
  const batch=await make();expect(batch.rows.find(r=>r.category==='HDR-002')).toMatchObject({label:'contextual',uncertain:false});
  expect(batch.rows.filter(r=>r.category!=='HDR-002').every(r=>r.label==='needs-review'&&r.uncertain)).toBe(true);
  expect(JSON.stringify(batch)).not.toContain('private-session-cookie');expect(JSON.stringify(batch)).not.toContain('127.0.0.1');
  expect((await assembleNativeSeedCorpus([batch,batch],secret)).audit).toMatchObject({families:1,trainingReady:false});
  controls.nativeWriteReadback=false;expect((await make()).rows.every(r=>r.label==='needs-review')).toBe(true);controls.nativeWriteReadback=true;
  controls.access='header-authentication';expect((await make()).rows.every(r=>r.label==='needs-review')).toBe(true);controls.accessControl='denied';
  expect((await make()).rows.find(r=>r.category==='HDR-002')?.label).toBe('contextual');
  controls.framePolicy!.scanHash='f'.repeat(64);await expect(make()).rejects.toThrow('binding');
});
it('retains unknown operation evidence for missing health, partial framing or a mismatched witness',async()=>{
  const f=await fixture(false,true);f.evidence.commit=nativeOperationSources.portal.commit;
  const controls:NativeOperationControls={sourceHealthy:false,nativeWriteReadback:true,access:'public',accessControl:'allowed',framePolicy:f.controls.framePolicy};
  const make=()=>createNativeOperationSeedBatch('portal',f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,controls,secret);
  expect((await make()).rows.every(r=>r.uncertain)).toBe(true);controls.sourceHealthy=true;
  controls.framePolicy!.controls.repeatedForbidden='unknown';expect((await make()).rows.every(r=>r.uncertain)).toBe(true);controls.framePolicy!.controls.repeatedForbidden='csp-blocked';
  f.evidence.targets.find(t=>t.category==='HDR-002')!.facts.framePolicyEnforced!.witnessHash='f'.repeat(64);expect((await make()).rows.every(r=>r.uncertain)).toBe(true);
});
it('matches each cookie control separately, preserves unknown purpose and excludes matching identifiers from inputs',async()=>{
  const f=await fixture(),report=parseSubmission({scanId:f.report.scanId,observation:{...f.report.observation,cookies:[...f.report.observation.cookies!,{...f.report.observation.cookies![0],name:'auth_secondary'}]}});
  const evidence=await collectResponseFacts(report,{runId:f.evidence.runId,commit:nativeSessionSources.wikiflow.commit,configHash:f.evidence.configHash,adapterHash:f.evidence.adapterHash},false);
  evidence.inspection=f.evidence.inspection;
  for(const target of evidence.targets){const match=f.evidence.targets.find(t=>t.category===target.category);if(match&&target.category.startsWith('CK-'))Object.assign(target.facts,match.facts);}
  const {cookie,javaScriptAccessUnnecessary,...base}=f.controls;
  const controls={...base,cookies:report.observation.cookies!.map((c,i)=>({name:c.name,secure:c.secure,httpOnly:c.httpOnly,authenticationRequired:i===0,javaScriptAccessUnnecessary}))};
  const make=()=>createNativeSessionSeedBatch('wikiflow',report,f.signer.seal(evidence),f.signer.trustedKeys,controls,secret);
  const batch=await make();expect(batch.rows.filter(r=>r.category==='CK-001').map(r=>r.label).sort()).toEqual(['change-warranted','needs-review']);
  for(const name of report.observation.cookies!.map(c=>c.name))expect(JSON.stringify(batch)).not.toContain(name);
  controls.cookies[1].name=controls.cookies[0].name;await expect(make()).rejects.toThrow('cookie measurement');controls.cookies[1].name='auth_secondary';
  controls.cookies[1].secure=true;await expect(make()).rejects.toThrow('cookie measurement');controls.cookies[1].secure=false;
  controls.cookies[0].javaScriptAccessUnnecessary=false;expect((await make()).rows.filter(r=>r.category==='CK-002').every(r=>r.label==='needs-review')).toBe(true);
});
it('retains contextual native framing without inflating families/scenarios or declaring readiness',async()=>{
  const f=await fixture(false,true),batch=await f.make(),row=batch.rows.find(r=>r.category==='HDR-002')!;
  expect(row.label).toBe('contextual');expect(row.uncertain).toBe(false);expect(batch.version).toBe('vylnt-native-seed-batch-v2');
  const result=await assembleNativeSeedCorpus([batch,batch,await(await fixture()).make()],secret);
  expect(result.audit.categories['HDR-002'].contextualContexts).toBe(1);expect(result.audit.families).toBe(1);
  expect(result.audit.categories['HDR-002'].trainingReady).toBe(false);
  expect(result.audit.categories['HDR-002'].deficits).not.toContain('No independently established contextual examples.');
  for(const value of [f.report.scanId,f.evidence.runId,'127.0.0.1','private-profile','private-session-cookie'])expect(JSON.stringify(batch)).not.toContain(value);
});
it('requires all independent native framing controls and bound browser facts for contextual labels',async()=>{
  const f=await fixture(false,true),frame=f.controls.framePolicy!;
  for(const name of ['permitted','forbidden','repeatedForbidden','nestedForbidden'] as const){
    const saved=frame.controls[name];frame.controls[name]='unknown';expect((await f.make()).rows.find(r=>r.category==='HDR-002')!.label).toBe('needs-review');frame.controls[name]=saved;
  }
  frame.sourceHealthy=false;expect((await f.make()).rows.find(r=>r.category==='HDR-002')!.label).toBe('needs-review');frame.sourceHealthy=true;
  f.controls.nativeBookmarkRowVerified=false;expect((await f.make()).rows.find(r=>r.category==='HDR-002')!.label).toBe('needs-review');f.controls.nativeBookmarkRowVerified=true;
  frame.scanHash='f'.repeat(64);await expect(f.make()).rejects.toThrow('oracle binding');frame.scanHash=await contentHash(f.report);
  frame.checkIdentity='f'.repeat(64);await expect(f.make()).rejects.toThrow('oracle binding');frame.checkIdentity=f.evidence.adapterHash;
  f.evidence.targets.find(t=>t.category==='HDR-002')!.facts.frameAncestorsRestricted!.witnessHash='f'.repeat(64);
  expect((await f.make()).rows.find(r=>r.category==='HDR-002')!.label).toBe('needs-review');
});
function resign(batch:NativeSeedBatch){const {auth:_,...body}=batch;return {...body,auth:createHmac('sha256',secret).update(body.version+':'+canonicalJson(body)).digest('hex')};}
it('preserves v1 receipts and makes conflicting or incomplete duplicate variants uncertain in either order',async()=>{
  const old=await(await fixture()).make();old.version='vylnt-native-seed-batch-v1';delete old.assessmentPolicy;
  expect((await assembleNativeSeedCorpus([resign(old)],secret)).audit.categories['CK-001'].completeChangeContexts).toBe(1);
  const f=await fixture(false,true),complete=await f.make();f.evidence.inspection!.framework='unsupported';const incomplete=await f.make();
  for(const batches of [[complete,incomplete],[incomplete,complete]])expect((await assembleNativeSeedCorpus(batches,secret)).audit.categories['HDR-002'].contextualContexts).toBe(0);
  const conflict=structuredClone(complete);conflict.rows.find(r=>r.category==='HDR-002')!.label='change-warranted';
  expect((await assembleNativeSeedCorpus([complete,resign(conflict)],secret)).audit.categories['HDR-002'].contextualContexts).toBe(0);
  const forged=structuredClone(complete);forged.rows.find(r=>r.category==='HDR-002')!.label='needs-review';
  await expect(assembleNativeSeedCorpus([forged],secret)).rejects.toThrow('receipt changed');
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

it('binds an actionable framed-write seed to independently checked native ownership and its precise witness',async()=>{
  const f=await fixture();
  f.evidence.policy=projectFrameWritePolicy;
  const target=f.evidence.targets.find(t=>t.category==='HDR-002')!;
  const witness='f'.repeat(64);
  target.facts.sensitiveActionVerified={value:true,source:'functional',coverage:'complete',witnessHash:witness};
  const controls={...f.controls,framedWriteWitness:witness};
  const make=()=>createNativeSessionSeedBatch('tabinator',f.report,f.signer.seal(f.evidence),f.signer.trustedKeys,controls,secret);
  expect((await make()).rows.find(r=>r.category==='HDR-002')).toMatchObject({label:'change-warranted',uncertain:false});
  const finding=f.report.findings.find(r=>r.ruleId==='HDR-002')!;
  const context=prepareProjectContexts(f.report,f.evidence)(finding);
  expect(guardProjectAssessment(context,finding,'contextual')).toBe('needs-review');
  target.facts.sensitiveActionVerified.coverage='partial';
  expect((await make()).rows.find(r=>r.category==='HDR-002')?.uncertain).toBe(true);
  target.facts.sensitiveActionVerified.coverage='complete';
  controls.framedWriteWitness='e'.repeat(64);
  expect((await make()).rows.find(r=>r.category==='HDR-002')?.label).toBe('needs-review');
  controls.framedWriteWitness=witness;controls.anonymousDeniedWithoutMutation=false;
  expect((await make()).rows.find(r=>r.category==='HDR-002')?.label).toBe('needs-review');
});

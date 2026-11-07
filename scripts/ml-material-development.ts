import assert from 'node:assert/strict';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {readFile,writeFile,readdir,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve,join,dirname,relative,sep} from 'node:path';
import {parseArgs} from 'node:util';
import {canonicalJson} from '../packages/core/integrity';
import {projectRules,prepareProjectContexts,verifyProjectEvidence,type ProjectPublicKey} from '../packages/core/project-evidence';
import {projectMaterialCaptureLimit,projectSourceLockSchema,prepareProjectMaterialData,type projectOracleSchema} from '../packages/ml/project-dataset';
import {authenticateNativeBatch} from '../packages/ml/project-seed-corpus';
import {materialPolicySchema} from '../packages/ml/project-material-context';
import type {Report} from '../packages/core';
import type {z} from 'zod';
import {readArchivedNativePreferenceRegistration,readNativePreferenceRegistration} from '../packages/ml/native-preference-registration';
import {etherpadPreferenceSource,nativePreferenceSource} from '../packages/ml/native-preference-evidence';
import {etherpadReplaces,etherpadSourceIdentity,readEtherpadRegistration,signEtherpadRegistration} from '../packages/ml/native-etherpad-registration';

const {positionals,values}=parseArgs({allowPositionals:true,options:{
  archive:{type:'string'},sourceRegistration:{type:'string'},registration:{type:'string'},output:{type:'string'},preferenceRegistration:{type:'string'},supplementRegistration:{type:'string'},
}});
assert.ok(positionals.length===1&&['register','register-etherpad','extend','prepare'].includes(positionals[0])&&values.output,
  'Use register with the strict archive and source registration, register-etherpad or prepare with --registration, or extend with --registration and --supplementRegistration. Every command requires --output.');
const root=await realpath('.local'),destination=resolve(values.output!);
assert.equal(await realpath(dirname(destination)),root,'Output must be directly under .local');
const sha=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const bytesHash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
const key=(await readFile(join(root,'insights-dataset-key'),'utf8')).trim();
assert.ok(key.length>=32);
const sign=(scope:string,value:unknown)=>createHmac('sha256',key).update(scope+':'+canonicalJson(value)).digest('hex');
async function folder(path:string){
  const checked=await realpath(resolve(path));
  assert.ok(checked.startsWith(root+sep),'Expected a private workspace folder');
  return checked;
}
async function bytes(path:string,limit=2*1024*1024){
  const info=await lstat(path),actual=await realpath(path);
  assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.size<=limit&&actual.startsWith(root+sep),'Expected a bounded private regular file');
  return readFile(path);
}
const json=async(path:string,limit?:number)=>JSON.parse((await bytes(path,limit)).toString('utf8'));
const save=(name:string,value:unknown)=>writeFile(join(destination,name+'.json'),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
const codeFiles=['packages/ml/project-material-context.ts','ml/project_material.py'];
const projectionCodeHash=sha(Object.fromEntries(await Promise.all(codeFiles.map(async file=>[file,bytesHash(await readFile(file))]))));
const prepHash=bytesHash(await readFile('packages/ml/project-dataset.ts'));
const extractorHash=bytesHash(await readFile('packages/core/project-evidence.ts'));
const protocolHash=bytesHash(await readFile('scripts/ml-material-development.ts'));
const archivedProtocolHash='ffcc252277e23c8d74a73cfccfef71355d10d5d1d1d17305cc1157716c6b9e0b';
const etherpadProtocolHash='caa30d0caae270b10ee98c2638dce7286d8e0eeb0d4ad4509187c4c669831515';
const preUpgradeExtractor='dbf79545bf8953fcba2734db5cd758961b5798176dd30a5c3ef97ed7bc43aa6b';
const prePlaintextProtocol='4b0d56ce9e51fabc404943d8cb303893b3686c7daf885b1229e57d56aec4923e';
const prePlaintextExtractor='924860892b75486916df945535925ed07d982da032464b18b005236e429fe756';
const preProtectedCrossSiteProtocol='769ecc0b4d781c61e94c8e7dba2b170adca654dd31e1d4952ad378f442b5604a';
const preProtectedCrossSiteExtractor='03775a244d41b2650368e6443f011f785c215162f0f30e3b161cccd09b3e707e';
const preEtherpadSupplementProtocol='bae662c62299905f342e933f9e8e86069cb1cfdf80191c43066cf0c6a00e8486';
const preHostHstsExtractor='1297068813f4fe7bb898749d7a52266cd153b90fc15315e3349fd056d59ffc71';
const preHostHstsProtocol='aaa10a600683b0d23f06d2fe5402f1ac880343addb9e00aa052af10937ed294a';
const preInvalidHstsExtractor='f2b566283a857bf00f137a552674477ad9f952ed361c0845a667dec3cf55ed79';
const preInvalidHstsProtocol='a5a6118f47e7237470892bdbcbf64b1f2cbc86d0e3b92637996f9b741a505975';
const preRetainedHstsExtractor='3b073ddb7b3d589d4b654228bf96e6a625c8fac2e9bb8dd3b779e2a726a360a0';
const preRetainedHstsProtocol='5b8cb9dae22d0f699999c10362cd0d7a7d90fe3744a4ee330a6bda6373221f2f';
const preDuplicateXfoExtractor='5b63b3c43fbeb0d5d00543ffcedd2093043b3b63a37aae78d7da522e39fd3d36';
const preDuplicateXfoProtocol='f7b6fb6732ec06f3300465a62ee555a00db437ea39848b0b5a63762052593590';
const preBroadFramingExtractor='76e9f94855287ca7e528ab82b31501af07b55635a23d6fc4e128d0c9b2edff0c';
const preBroadFramingProtocol='a2b0f633b20737b99e7838fb5a11454900d3d49219284ad4e3e96f42cc2eca56';
const preAdapterCapacityPrep='a031f8bc7b46e84097608be8d785928a4643a637d4cdb3b8952b469440240bf8';
const preHashedScriptExtractor='622120c0288f4571c0da16ad0c0ee149951e5b599a07b8a05fc60c9bc986e359';
const preHashedScriptProtocol='6370a9489396766de63fb3f19c2b9ed98aa694657fc617ecb2a84f263d498028';
const preEvalScriptExtractor='9cc69ce7576dc1c67e6721f5e367e718cb73547396128f4de75397f68b91a64f';
const preEvalScriptProtocol='3da3d470ee70d855e0164c3bec5d661a1b88f7f0da66f05a1a8c94291df229b5';
const preEtherpadHstsProtocol='27de8286521d0d0fbffee98ee99f6eacf577cf7ec567c0068ae5a34e16481294';
const materialPolicy=materialPolicySchema.parse(JSON.parse(await readFile('ml/project_material_policy.json','utf8')));
type Capture={path:string;hashes:Record<string,string>;registrationHash:string};
type SourceLock=z.infer<typeof projectSourceLockSchema>;
type Supplement={folder:string;hash:string};
const relativeFolder=(path:string)=>relative(root,path).split(sep).join('/');
const stableFamily=({adapterHash:_,additionalAdapterHashes:__,oracleHash:___,...source}:SourceLock['families'][number])=>source;

async function nativeRegistration(directory:string){
  const registration=await json(join(directory,'registration.json'));
  const {registrationHash,...body}=registration;
  assert.equal(body.version,'vylnt-native-development-registration-v1');
  assert.equal(sign('native-development',body),registrationHash);
  const lock=projectSourceLockSchema.parse(await json(join(directory,'sources.json')));
  assert.equal(sha(lock),body.sourceHash);
  return {registration,lock};
}

async function materialRegistration(directory:string){
  const registration=await json(join(directory,'registration.json'));
  const {registrationHash,...body}=registration;
  assert.equal(body.version,'vylnt-native-material-registration-v1');
  assert.ok(['adopt-existing-development','adopt-development-and-native-preference'].includes(body.scope));
  assert.equal(sign('native-material-development',body),registrationHash);
  return {registration,body};
}

async function original(archive:string,registrationFolder:string){
  const preparation=await json(join(archive,'registration.json'));
  assert.equal(preparation.version,'vylnt-native-prepared-v1','Only authenticated historical development preparation can be adopted');
  const sourceRegistration=await json(join(registrationFolder,'registration.json'));
  assert.equal(canonicalJson(sourceRegistration),canonicalJson(preparation.registration));
  const {registrationHash,...body}=sourceRegistration;
  assert.equal(sign('native-development',body),registrationHash);
  const names=['dataset','split','audit','collection'];
  const fileHashes=Object.fromEntries(await Promise.all(names.map(async name=>[name,bytesHash(await bytes(join(archive,name+'.json'),64*1024*1024))])));
  assert.equal(canonicalJson(fileHashes),canonicalJson(preparation.fileHashes));
  assert.equal(sign('prepared-native-datasets',[registrationHash,...names.map(name=>fileHashes[name])]),preparation.auth);
  const lock=projectSourceLockSchema.parse(await json(join(registrationFolder,'sources.json')));
  const exposure=await json(join(registrationFolder,'exposure.json'),16*1024*1024);
  assert.equal(sha(lock),body.sourceHash);assert.equal(sha(exposure),body.exposureHash);
  // Later opt-in policies may coexist with these archived captures. Adoption
  // below must reproduce every authenticated original tensor, not reinterpret
  // an older scan using a newer evidence policy or inferred metadata.
  const collection=await json(join(archive,'collection.json'));
  assert.equal(collection.registrationHash,registrationHash);
  return {preparation,sourceRegistration,lock,exposure,collection};
}

async function captured(registrationHash:string,onlyFamily?:string){
  const captures:Capture[]=[];
  const base=await folder(join(root,'ml-native-observations'));
  for(const family of (await readdir(base,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    if(!family.isDirectory()||family.isSymbolicLink()||(onlyFamily&&family.name!==onlyFamily))continue;
    const familyPath=await folder(join(base,family.name));
    const entries=await readdir(familyPath,{withFileTypes:true});assert.ok(entries.length<=1000);
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      if(!entry.isDirectory()||entry.isSymbolicLink())continue;
      const location=await folder(join(familyPath,entry.name));
      let seed;
      try{seed=await json(join(location,'development-seeds.json'));}
      catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}
      if(seed.registrationHash!==registrationHash)continue;
      const names=(await readdir(location)).filter(name=>name.endsWith('.json')).sort();
      assert.ok(names.length<=32);
      for(const name of ['report.json','evidence.json','development-seeds.json','trusted-public-keys.json','source.json','acceptance.json'])assert.ok(names.includes(name));
      const hashes=Object.fromEntries(await Promise.all(names.map(async name=>[name,bytesHash(await bytes(join(location,name)))])));
      captures.push({path:relative(root,location).split(sep).join('/'),hashes,registrationHash});
    }
  }
  captures.sort((a,b)=>a.path.localeCompare(b.path));
  return captures;
}

if(positionals[0]==='register'){
  assert.ok(values.archive&&values.sourceRegistration);
  const archive=await folder(values.archive),sourceRegistrationFolder=await folder(values.sourceRegistration);
  const previous=await original(archive,sourceRegistrationFolder);
  let captures=await captured(previous.sourceRegistration.registrationHash);
  assert.equal(captures.length,previous.collection.batches,'Every accepted source capture must be retained');
  const excluded: {capture:Capture;reason:string}[]=[];
  let preferenceFolder:string|undefined,preference:Awaited<ReturnType<typeof readNativePreferenceRegistration>>|undefined;
  let lock:z.infer<typeof projectSourceLockSchema>={...previous.lock,experiment:randomUUID()};
  if(values.preferenceRegistration){
    preferenceFolder=await folder(values.preferenceRegistration);
    const meta=await json(join(preferenceFolder,'source.json'));
    preference=await readNativePreferenceRegistration(preferenceFolder,meta);
    const added=await captured(preference.registrationHash,'homeinventory');
    assert.ok(added.length,'No completed prospectively registered preference captures');
    const first=await folder(join(root,added[0].path));
    const report=await json(join(first,'report.json')),seal=await json(join(first,'evidence.json'));
    const batch=authenticateNativeBatch(await json(join(first,'development-seeds.json')),key);
    assert.equal(batch.evidenceHash,sha(seal));assert.equal(batch.scanHash,sha(report));
    assert.ok(await verifyProjectEvidence(seal,report,await json(join(first,'trusted-public-keys.json'))));
    assert.equal(seal.evidence.commit,preference.commit);
    const replacement=previous.lock.families.find(f=>f.familyId==='upstream:florianvazelle/anonymous-notepad')
      ??previous.lock.families.find(f=>f.repository.toLowerCase().endsWith('/anonymous-notepad'));
    assert.ok(replacement&&replacement.partition==='train','Only the declared unsupported training source may be replaced');
    for(const capture of captures.filter(c=>c.path.startsWith('ml-native-observations/anonymous-notepad/')))
      excluded.push({capture,reason:'unsupported-native-context-source-replaced-before-model-fitting'});
    captures=[...captures.filter(c=>!excluded.some(e=>e.capture.path===c.path)),...added].sort((a,b)=>a.path.localeCompare(b.path));
    const native={familyId:meta.familyId,repository:meta.repository,repositoryId:meta.repositoryId,partition:'train' as const,
      license:meta.license,licenseHash:meta.sourceSha256.LICENSE,
      securityImplementationHashes:Object.entries(meta.sourceSha256 as Record<string,string>).filter(([name])=>/\.(?:[cm]?[jt]sx?|sql)$/.test(name)).map(([,hash])=>hash),
      revisions:[{commit:meta.revision,sourceHashes:seal.evidence.inspection.sourceHashes}],adapterHash:seal.evidence.adapterHash,
      oracleHash:sha({version:'native-preference-control-oracle-v1',source:preference.sourceGraphHash,registration:preference.registrationHash})};
    lock=projectSourceLockSchema.parse({...lock,assessmentPolicyHash:extractorHash,harnessHash:sha([previous.lock.harnessHash,preference.harnessHash]),
      families:[...previous.lock.families.filter(f=>f!==replacement),native]});
    // Existing source roles are preserved. The preference source was registered
    // as training before collection. No holdout examples or predictions enter.
    await prepareProjectMaterialData([],lock,previous.exposure,key,[],materialPolicy);
  }
  assert.ok(captures.length>0&&captures.length<=projectMaterialCaptureLimit);
  const body={version:'vylnt-native-material-registration-v1',scope:preference?'adopt-development-and-native-preference':'adopt-existing-development',
    registeredAt:new Date().toISOString(),sourceHash:sha(lock),exposureHash:sha(previous.exposure),
    captureHarness:previous.lock.harnessHash,captureManifestHash:sha(captures),
    archive:relative(root,archive).split(sep).join('/'),
    sourceRegistration:relative(root,sourceRegistrationFolder).split(sep).join('/'),
    archivePreparationHash:sha(previous.preparation),originRegistrationHash:previous.sourceRegistration.registrationHash,
    materialPolicyHash:sha(materialPolicy),projectionCodeHash,prepHash,extractorHash,protocolHash,excludedManifestHash:sha(excluded),
    ...(preference?{preferenceFolder:relative(root,preferenceFolder!).split(sep).join('/'),preferenceHash:sha(preference)}:{})};
  const registration={...body,registrationHash:sign('native-material-development',body)};
  await mkdir(destination);
  await save('registration',registration);await save('sources',lock);await save('exposure',previous.exposure);
  await save('material-policy',materialPolicy);await save('captures',captures);
  await save('excluded-captures',excluded);
  console.log('Registered material-counting adoption of '+captures.length+' authenticated development captures. No predictions or fitting.');
}else if(positionals[0]==='register-etherpad'){
  assert.ok(values.registration);
  const parent=await folder(values.registration),{registration,body}=await materialRegistration(parent);
  const lock=projectSourceLockSchema.parse(await json(join(parent,'sources.json')));
  const exposure=await json(join(parent,'exposure.json'),16*1024*1024);
  assert.equal(sha(lock),body.sourceHash);assert.equal(sha(exposure),body.exposureHash);
  assert.ok(!body.etherpadRotation&&body.scope==='adopt-development-and-native-preference');
  const {source,harness,pinHash}=await etherpadSourceIdentity();
  const retired=lock.families.find(family=>family.familyId===etherpadReplaces);
  assert.ok(retired&&retired.partition==='validation','Expected the declared validation slot');
  assert.ok(!lock.families.some(family=>family.familyId===source.familyId));
  const updated=projectSourceLockSchema.parse({...lock,experiment:randomUUID(),harnessHash:harness,
    families:lock.families.map(family=>family===retired?source:family)});
  const {audit}=await prepareProjectMaterialData([],updated,exposure,key,[],materialPolicy);
  assert.equal(audit.trainFamilies,8);assert.equal(audit.validationFamilies,4);
  const prospective=signEtherpadRegistration({version:'vylnt-native-development-registration-v1',scope:'prospective-etherpad-preference',
    registeredAt:new Date().toISOString(),parentHash:registration.registrationHash,retiredFamily:etherpadReplaces,
    sourceHash:sha(updated),exposureHash:sha(exposure),harness,pinHash},key);
  await mkdir(destination);await save('sources',updated);await save('registration',prospective);
  console.log('Registered Etherpad prospectively for the StockBase validation slot. Existing captures and partitions were preserved.');
}else if(positionals[0]==='extend'){
  assert.ok(values.registration&&values.supplementRegistration);
  const parent=await folder(values.registration),supplement=await folder(values.supplementRegistration);
  const {registration:parentRegistration,body}=await materialRegistration(parent);
  const lock=projectSourceLockSchema.parse(await json(join(parent,'sources.json')));
  const exposure=await json(join(parent,'exposure.json'),16*1024*1024);
  let captures:Capture[]=await json(join(parent,'captures.json'));
  const excluded:{capture:Capture;reason:string}[]=await json(join(parent,'excluded-captures.json'));
  assert.equal(sha(lock),body.sourceHash);assert.equal(sha(exposure),body.exposureHash);
  assert.equal(sha(captures),body.captureManifestHash);assert.equal(sha(excluded),body.excludedManifestHash);
  assert.equal(sha(materialPolicy),body.materialPolicyHash);
  const {registration,lock:nextLock}=await nativeRegistration(supplement);
  let etherpadRotation=body.etherpadRotation;
  if(registration.scope==='prospective-etherpad-preference'){
    assert.ok(!etherpadRotation);
    const rotation=await readEtherpadRegistration(supplement,key,false);
    assert.equal(rotation.registration.parentHash,parentRegistration.registrationHash);
    assert.equal(rotation.registration.exposureHash,body.exposureHash);
    const retired=lock.families.findIndex(family=>family.familyId===etherpadReplaces&&family.partition==='validation');
    assert.ok(retired>=0&&nextLock.families.length===lock.families.length);
    assert.deepEqual(nextLock.families,lock.families.map((family,index)=>index===retired?rotation.source:family));
    lock.families[retired]=rotation.source;
    const retiredCaptures=captures.filter(capture=>capture.path.startsWith('ml-native-observations/stockbase/'));
    excluded.push(...retiredCaptures.map(capture=>({capture,reason:'validation-source-rotated-before-model-fitting'})));
    captures=captures.filter(capture=>!retiredCaptures.includes(capture));
    etherpadRotation={folder:relativeFolder(supplement),hash:registration.registrationHash};
  }
  const added=await captured(registration.registrationHash);
  assert.ok(added.length&&captures.length+added.length<=projectMaterialCaptureLimit,'No eligible supplemental captures or capture budget exceeded');
  const supplements:Supplement[]=body.supplements??[];
  assert.ok(!supplements.some(entry=>entry.hash===registration.registrationHash),'Supplement already adopted');
  for(const capture of added){
    const location=await folder(join(root,capture.path));
    const batch=authenticateNativeBatch(await json(join(location,'development-seeds.json')),key);
    assert.equal(batch.registrationHash,registration.registrationHash);
    const source=nextLock.families.find(f=>f.adapterHash===batch.adapterHash&&f.revisions.some(r=>r.commit===batch.commit));
    const family=lock.families.find(f=>f.familyId===source?.familyId);
    assert.ok(source&&family&&sha(stableFamily(source))===sha(stableFamily(family)),'Supplement changes a source or split role');
    assert.equal(batch.family,createHmac('sha256',key).update('family:'+family.familyId).digest('hex'));
    if(family.adapterHash!==batch.adapterHash)family.additionalAdapterHashes=[...new Set([...(family.additionalAdapterHashes??[]),batch.adapterHash])].sort();
  }
  const updated=projectSourceLockSchema.parse({...lock,experiment:randomUUID(),assessmentPolicyHash:extractorHash,
    harnessHash:sha([lock.harnessHash,nextLock.harnessHash]),families:lock.families});
  const allCaptures=[...captures,...added].sort((a,b)=>a.path.localeCompare(b.path));
  const updatedBody={...body,registeredAt:new Date().toISOString(),sourceHash:sha(updated),captureManifestHash:sha(allCaptures),
    projectionCodeHash,prepHash,extractorHash,protocolHash,parentHash:parentRegistration.registrationHash,
    excludedManifestHash:sha(excluded),...(etherpadRotation?{etherpadRotation}:{}),
    supplements:[...supplements,{folder:relativeFolder(supplement),hash:registration.registrationHash}]};
  await mkdir(destination);
  await save('registration',{...updatedBody,registrationHash:sign('native-material-development',updatedBody)});
  await save('sources',updated);await save('exposure',exposure);await save('material-policy',materialPolicy);
  await save('captures',allCaptures);await save('excluded-captures',excluded);
  console.log(`Registered ${added.length} supplemental captures with the fixed 8/4 split.`);
}else{
  assert.ok(values.registration);
  const registered=await folder(values.registration);
  const {registration,body}=await materialRegistration(registered);
  const {registrationHash}=registration;
  assert.equal(body.projectionCodeHash,projectionCodeHash);
  const archived=body.protocolHash===etherpadProtocolHash||(!body.etherpadRotation&&body.protocolHash===archivedProtocolHash);
  const previousExtractor=(body.protocolHash===prePlaintextProtocol&&body.extractorHash===prePlaintextExtractor)||
    (body.protocolHash===preProtectedCrossSiteProtocol&&body.extractorHash===preProtectedCrossSiteExtractor)||
    ([preHostHstsProtocol,preEtherpadSupplementProtocol].includes(body.protocolHash)&&body.extractorHash===preHostHstsExtractor)||
    (body.protocolHash===preInvalidHstsProtocol&&body.extractorHash===preInvalidHstsExtractor)||
    (body.protocolHash===preRetainedHstsProtocol&&body.extractorHash===preRetainedHstsExtractor)||
    (body.protocolHash===preDuplicateXfoProtocol&&body.extractorHash===preDuplicateXfoExtractor)||
    (body.protocolHash===preBroadFramingProtocol&&body.extractorHash===preBroadFramingExtractor)||
    (body.protocolHash===preHashedScriptProtocol&&body.extractorHash===preHashedScriptExtractor)||
    (body.protocolHash===preEvalScriptProtocol&&body.extractorHash===preEvalScriptExtractor)||
    (archived&&body.extractorHash===preUpgradeExtractor);
  assert.ok([protocolHash,prePlaintextProtocol,preProtectedCrossSiteProtocol,preEtherpadSupplementProtocol,preHostHstsProtocol,preInvalidHstsProtocol,preRetainedHstsProtocol,preDuplicateXfoProtocol,preBroadFramingProtocol,preHashedScriptProtocol,preEvalScriptProtocol,preEtherpadHstsProtocol].includes(body.protocolHash)||archived,'Unknown material protocol');
  assert.ok(body.prepHash===prepHash||(body.protocolHash!==protocolHash&&body.prepHash===preAdapterCapacityPrep),'Unknown material preparation');
  assert.ok(body.extractorHash===extractorHash||previousExtractor,'Registered evidence extractor changed');
  const policy=materialPolicySchema.parse(await json(join(registered,'material-policy.json')));
  assert.equal(sha(policy),body.materialPolicyHash);assert.equal(sha(policy),sha(materialPolicy));
  const lock=projectSourceLockSchema.parse(await json(join(registered,'sources.json')));
  const exposure=await json(join(registered,'exposure.json'),16*1024*1024);
  assert.equal(sha(lock),body.sourceHash);assert.equal(sha(exposure),body.exposureHash);
  const previous=await original(await folder(join(root,body.archive)),await folder(join(root,body.sourceRegistration)));
  assert.equal(sha(previous.preparation),body.archivePreparationHash);
  assert.equal(previous.sourceRegistration.registrationHash,body.originRegistrationHash);
  let preference:Awaited<ReturnType<typeof readNativePreferenceRegistration>>|undefined;
  if(body.etherpadRotation){
    assert.equal(body.scope,'adopt-development-and-native-preference');
    const entry=body.etherpadRotation;
    const rotation=await readEtherpadRegistration(await folder(join(root,entry.folder)),key,false);
    assert.equal(rotation.registration.registrationHash,entry.hash);
    assert.equal(rotation.registration.exposureHash,body.exposureHash);
    assert.ok((body.supplements as Supplement[]).some(s=>s.folder===entry.folder&&s.hash===entry.hash));
    assert.ok(!lock.families.some(family=>family.familyId===etherpadReplaces));
    const current=lock.families.find(family=>family.familyId===etherpadPreferenceSource.family);
    assert.ok(current&&current.adapterHash===rotation.source.adapterHash&&current.oracleHash===rotation.source.oracleHash,
      'Original Etherpad rotation adapter changed');
    assert.deepEqual(stableFamily(current),stableFamily(rotation.source));
  }
  if(body.scope==='adopt-development-and-native-preference'){
    const location=await folder(join(root,body.preferenceFolder));
    preference=await readArchivedNativePreferenceRegistration(location,await json(join(location,'source.json')));
    assert.equal(sha(preference),body.preferenceHash);
    const originals=previous.lock.families.filter(f=>!f.repository.toLowerCase().endsWith('/anonymous-notepad')
      &&(!body.etherpadRotation||f.familyId!==etherpadReplaces));
    assert.equal(lock.families.length,12);
    for(const original of originals){
      const family=lock.families.find(f=>f.familyId===original.familyId);
      assert.ok(family&&sha(stableFamily(family))===sha(stableFamily(original))&&family.adapterHash===original.adapterHash&&family.oracleHash===original.oracleHash,'Existing family identity or role changed');
    }
    const native=lock.families.find(f=>f.familyId===nativePreferenceSource.family);
    assert.ok(native&&native.partition==='train'&&native.revisions.length===1&&native.revisions[0].commit===preference.commit);
  }else{
    assert.equal(lock.families.length,previous.lock.families.length);
    for(const original of previous.lock.families){
      const family=lock.families.find(f=>f.familyId===original.familyId);
      assert.ok(family&&sha(stableFamily(family))===sha(stableFamily(original))&&family.adapterHash===original.adapterHash&&family.oracleHash===original.oracleHash,'Existing family identity or role changed');
    }
  }
  const supplements=new Map<string,Awaited<ReturnType<typeof nativeRegistration>>>();
  for(const entry of (body.supplements??[]) as Supplement[]){
    const registered=await nativeRegistration(await folder(join(root,entry.folder)));
    assert.equal(registered.registration.registrationHash,entry.hash);
    assert.ok(!supplements.has(entry.hash),'Duplicate supplemental registration');
    supplements.set(entry.hash,registered);
  }
  const etherpad=lock.families.find(family=>family.familyId===etherpadPreferenceSource.family);
  if(etherpad)for(const adapterHash of etherpad.additionalAdapterHashes??[]){
    assert.ok([...supplements.values()].some(({registration,lock:sourceLock})=>
      ['prospective-etherpad-cookie-variants','prospective-etherpad-hsts'].includes(registration.scope)&&sourceLock.families.some(family=>
        family.familyId===etherpad.familyId&&family.adapterHash===adapterHash&&sha(stableFamily(family))===sha(stableFamily(etherpad)))),
      'Etherpad supplemental adapter is missing a matching registration');
  }
  assert.equal(sha(await json(join(registered,'excluded-captures.json'))),body.excludedManifestHash);
  const captures:Capture[]=await json(join(registered,'captures.json'));
  assert.equal(sha(captures),body.captureManifestHash);
  const keys=new Map<string,ProjectPublicKey>(),inputs:{report:Report;seal:unknown;oracle:z.infer<typeof projectOracleSchema>}[]=[];
  for(const capture of captures){
    const location=await folder(join(root,capture.path));
    assert.ok(location.startsWith(join(root,'ml-native-observations')+sep));
    for(const [name,digest] of Object.entries(capture.hashes)){
      assert.equal(name,dirname(name)==='.'?name:'','Invalid capture filename');
      assert.equal(bytesHash(await bytes(join(location,name))),digest,'Frozen capture changed');
    }
    const batch=authenticateNativeBatch(await json(join(location,'development-seeds.json')),key);
    const isPreference=Boolean(preference&&capture.registrationHash===preference.registrationHash);
    const supplement=supplements.get(capture.registrationHash);
    const origin=isPreference?preference!:supplement?.registration??previous.sourceRegistration;
    assert.equal(batch.registrationHash,origin.registrationHash);
    const accepted=await json(join(location,'acceptance.json'));
    assert.ok(accepted.completed===true&&accepted.sourceRunCleanup===true&&accepted.reloadVerified===true);
    const report:Report=await json(join(location,'report.json'),512*1024);
    const seal=await json(join(location,'evidence.json'),132*1024);
    assert.ok(Date.parse(report.observation.scannedAt)>=Date.parse(origin.registeredAt),'Capture predates its original registration');
    assert.equal(batch.scanHash,sha(report));assert.equal(batch.evidenceHash,sha(seal));
    const family=lock.families.find(f=>[f.adapterHash,...f.additionalAdapterHashes??[]].includes(batch.adapterHash)&&f.revisions.some(r=>r.commit===batch.commit));
    assert.ok(family);
    if(supplement){
      const source=supplement.lock.families.find(f=>f.familyId===family.familyId&&f.adapterHash===batch.adapterHash);
      assert.ok(source&&sha(stableFamily(source))===sha(stableFamily(family)),'Supplement changes a source or split role');
    }else assert.equal(family.adapterHash,batch.adapterHash,'Archived capture used an unregistered adapter');
    if(isPreference){assert.equal(family.familyId,nativePreferenceSource.family);assert.equal(sha(await json(join(location,'registration.json'))),body.preferenceHash);}
    assert.equal(batch.family,createHmac('sha256',key).update('family:'+family.familyId).digest('hex'));
    for(const publicKey of await json(join(location,'trusted-public-keys.json'),16384) as ProjectPublicKey[]){
      if(keys.has(publicKey.keyId))assert.equal(canonicalJson(keys.get(publicKey.keyId)),canonicalJson(publicKey));
      keys.set(publicKey.keyId,publicKey);
    }
    const findings=new Map(report.findings.map(f=>[sha({scan:batch.scanHash,evidence:batch.evidenceHash,oracleHash:batch.oracleHash,findingId:f.id}),f]));
    for(const row of batch.rows){
      const finding=findings.get(row.evidenceRecord);assert.ok(finding&&finding.ruleId===row.category);
      const reproduced=prepareProjectContexts(report,seal.evidence)(finding);
      assert.equal(sha(reproduced.sequence),row.variant,'Archived authenticated input no longer reproduces');
      inputs.push({report,seal,oracle:{version:'vylnt-project-oracle-v1',familyId:family.familyId,
        scanHash:batch.scanHash,evidenceHash:sha(seal.evidence),commit:batch.commit,configHash:batch.configHash,
        adapterHash:batch.adapterHash,harnessHash:lock.harnessHash,sourceLockHash:body.sourceHash,oracleHash:family.oracleHash,
        scenarioHash:sha([family.familyId,row.category,row.reason]),category:row.category,findingId:finding.id,
        label:row.uncertain?'needs-review':row.label,passed:true}});
    }
  }
  const result=await prepareProjectMaterialData(inputs,lock,exposure,key,[...keys.values()],policy);
  await mkdir(destination);
  for(const [name,value] of Object.entries(result))await save(name,value);
  await save('collection',{version:'vylnt-native-material-collection-v1',batches:captures.length,findings:inputs.length,
    registeredFamilies:lock.families.length,sourceRegistration:body.originRegistrationHash,registrationHash,
    trainingReady:result.audit.ready,qualification:false,testPredictions:0});
  await save('material-policy',policy);
  for(const category of projectRules){
    const examples=result.dataset.examples.filter(row=>row.category===category);
    await save(category,{category,schemaVersion:result.dataset.schemaVersion,countingPolicy:result.dataset.countingPolicy,
      train:examples.filter(row=>result.split.families[row.family]==='train'),
      validation:examples.filter(row=>result.split.families[row.family]==='validation'),readiness:result.audit.categories[category]});
  }
  const names=['dataset','split','audit','collection','material-policy'];
  const fileHashes=Object.fromEntries(await Promise.all(names.map(async name=>[name,bytesHash(await bytes(join(destination,name+'.json'),64*1024*1024))])));
  await save('registration',{version:'vylnt-native-prepared-v2',registration,fileHashes,
    auth:sign('prepared-native-material-datasets',[registrationHash,...names.map(name=>fileHashes[name])])});
  console.log(JSON.stringify({batches:captures.length,findings:inputs.length,ready:result.audit.ready,qualification:false,testPredictions:0}));
  if(!result.audit.ready)process.exitCode=2;
}

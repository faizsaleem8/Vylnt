import assert from 'node:assert/strict';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,readdir,mkdir,lstat,realpath} from 'node:fs/promises';
import {join,resolve,dirname,sep} from 'node:path';
import {parseArgs} from 'node:util';
import {canonicalJson} from '../packages/core/integrity';
import {prepareProjectData,projectSourceLockSchema,type projectOracleSchema} from '../packages/ml/project-dataset';
import {projectRules,type ProjectPublicKey} from '../packages/core/project-evidence';
import {authenticateNativeBatch} from '../packages/ml/project-seed-corpus';
import {nativeHarnessHash,nativeAdapterIdentity} from '../packages/ml/native-producer-identity';
import {etherpadSourceIdentity,signEtherpadRegistration} from '../packages/ml/native-etherpad-registration';
import {inspectProject} from '../apps/server/project-inspection';
import {gateConfigSchema} from '../apps/cli/gate-config';
import type {z} from 'zod';
import type {Report} from '../packages/core';

const {positionals,values}=parseArgs({allowPositionals:true,options:{output:{type:'string'},registration:{type:'string'},'material-parent':{type:'string'},family:{type:'string'},hsts:{type:'boolean'}}});
const action=positionals[0];
if(positionals.length!==1||!['register','prepare'].includes(action)||!values.output)throw Error('Choose register --output <new .local folder> or prepare --registration <folder> --output <new .local folder>');
assert.ok(!values.family||action==='register'&&values['material-parent']&&['etherpad','homeinventory'].includes(values.family),'Unsupported supplemental family');
assert.ok(!values.hsts||values.family==='homeinventory'||values.family==='etherpad','The HSTS registration requires an active supplemental family');
const privateRoot=await realpath('.local'),destination=resolve(values.output);
assert.equal(await realpath(dirname(destination)),privateRoot,'Output must be directly under .local');
const sha=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const bytesHash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
async function readJson(file:string,limit=2*1024*1024){
  const info=await lstat(file);
  assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.size<=limit,'Expected a bounded regular JSON file');
  return JSON.parse(await readFile(file,'utf8'));
}
const key=(await readFile(join(privateRoot,'insights-dataset-key'),'utf8')).trim();
assert.ok(key.length>=32,'Original installation family key required');
const sign=(scope:string,value:unknown)=>createHmac('sha256',key).update(scope+':'+canonicalJson(value)).digest('hex');
const save=(name:string,value:unknown)=>writeFile(join(destination,name+'.json'),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
const families=['8star-links','anonymous-notepad','bookwise','fieldpoint','habit-tracker','jingo','personal-knowledge-manager','portal','stockbase','tabinator','wikiflow','yoyo-collection'];
const harness=await nativeHarnessHash(),protocolHash=bytesHash(await readFile('scripts/ml-native-development.ts'));
const prepHash=bytesHash(await readFile('packages/ml/project-dataset.ts'));
if(action==='register'&&values['material-parent']){
  const parent=await realpath(values['material-parent']);
  assert.ok(parent.startsWith(privateRoot+sep));
  const {registrationHash:parentHash,...parentBody}=await readJson(join(parent,'registration.json'));
  assert.equal(parentBody.version,'vylnt-native-material-registration-v1');
  assert.equal(sign('native-material-development',parentBody),parentHash);
  const lock=projectSourceLockSchema.parse(await readJson(join(parent,'sources.json')));
  const exposure=await readJson(join(parent,'exposure.json'),16*1024*1024);
  assert.equal(sha(lock),parentBody.sourceHash);
  assert.equal(sha(exposure),parentBody.exposureHash);
  const assessmentPolicyHash=bytesHash(await readFile('packages/core/project-evidence.ts'));
  const base={version:'vylnt-native-development-registration-v1',registeredAt:new Date().toISOString(),exposureHash:sha(exposure),parentHash};
  if(values.family==='etherpad'){
    const expected=await etherpadSourceIdentity();
    const index=lock.families.findIndex(entry=>entry.familyId===expected.source.familyId);
    assert.ok(index>=0&&lock.families[index].partition==='validation','Etherpad must already be assigned to validation');
    const {adapterHash:_,oracleHash:__,additionalAdapterHashes:___,...previous}=lock.families[index];
    const {adapterHash:____,oracleHash:_____,...current}=expected.source;
    assert.deepEqual(previous,current,'Etherpad source or role changed');
    lock.families[index]=expected.source;
    const supplement=projectSourceLockSchema.parse({...lock,experiment:randomUUID(),harnessHash:expected.harness,assessmentPolicyHash});
    const registration=signEtherpadRegistration({...base,scope:values.hsts?'prospective-etherpad-hsts':'prospective-etherpad-cookie-variants',
      sourceHash:sha(supplement),harness:expected.harness,pinHash:expected.pinHash},key);
    await mkdir(destination);await save('sources',supplement);await save('exposure',exposure);await save('registration',registration);
    console.log('Registered Etherpad '+(values.hsts?'HSTS profiles':'cookie variants')+' with the existing validation assignment.');
  }else{
    const meta=await readJson('ml/applications/native/homeinventory.source.json');
    const family=lock.families.find(entry=>entry.familyId===meta.familyId);
    assert.ok(family?.partition==='train'&&family.revisions.length===1&&family.revisions[0].commit===meta.revision);
    assert.equal(family.licenseHash,meta.sourceSha256.LICENSE);
    family.adapterHash=await nativeAdapterIdentity(meta);
    const preference=values.family==='homeinventory';
    const scope=values.hsts?'prospective-homeinventory-hsts':preference?'prospective-homeinventory-language-variants':'prospective-homeinventory-house-create';
    family.oracleHash=sha({harness,method:values.hsts?'native-homeinventory-hsts-v1':preference?'native-homeinventory-language-variants-v1':'native-homeinventory-house-create-v1'});
    delete family.additionalAdapterHashes;
    const supplement=projectSourceLockSchema.parse({...lock,experiment:randomUUID(),harnessHash:harness,assessmentPolicyHash});
    const registration={...base,sourceHash:sha(supplement),harness,protocolHash,prepHash,scope};
    const registrationHash=sign('native-development',registration);
    await mkdir(destination);await save('sources',supplement);await save('exposure',exposure);await save('registration',{...registration,registrationHash});
    console.log('Registered HomeInventory acquisition with the existing application split.');
  }
}else if(action==='register'){
  const q1=join(privateRoot,'ml-q1'),base=await readJson(join(q1,'exposure.json'),16*1024*1024);
  const published=await readJson('ml/evaluations/fresh-holdout-js002-2026-10-26.json');
  const prov=await readJson(join(q1,'frozen-01','provenance.json')),unfiltered=await readJson(join(q1,'frozen-01','unfiltered-dataset.json'),16*1024*1024);
  assert.equal(sha(base),published.exposureHash);assert.equal(sha(prov),published.provenanceHash);
  assert.equal(sha(unfiltered),prov.unfilteredDatasetHash);assert.equal(prov.datasetHash,published.datasetHash);
  assert.equal(base.invalidUnboundDatasets.length,0);assert.ok(base.families.length&&base.variants.length&&prov.families.length);
  const priorVariants:string[]=unfiltered.examples.map((row:{sequence:number[][];variant:string})=>{assert.equal(sha(row.sequence),row.variant);return row.variant;});
  const exposure={...base,families:[...new Set([...base.families,...prov.families])].sort(),variants:[...new Set([...base.variants,...priorVariants])].sort(),consumedQ1:published.provenanceHash};
  const sources=[];
  for(const slug of families){
    const meta=await readJson('ml/applications/native/'+slug+'.source.json');
    const source=join(privateRoot,['tabinator','jingo'].includes(slug)?'ml-native-'+slug:'ml-native-expansion/'+slug);
    const git=(args:string[])=>execFileSync('git',args,{cwd:source,windowsHide:true,timeout:10000,maxBuffer:8*1024*1024});
    assert.equal(git(['rev-parse','HEAD']).toString().trim(),meta.revision);
    assert.equal(git(['rev-parse','HEAD:LICENSE']).toString().trim(),meta.licenseGitBlob);
    const licence=git(['show','HEAD:LICENSE']);assert.ok(licence.toString().includes('Permission is hereby granted'));
    const implementations=Object.entries(meta.sourceSha256).filter(([f])=>/\.(?:[cm]?[jt]s|sql)$/.test(f));
    for(const [file,hash] of implementations)assert.equal(bytesHash(git(['show','HEAD:'+file])),hash);
    const inspection=await inspectProject({app:source,checkout:source,commit:meta.revision,configHash:harness,config:gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/']}),signal:AbortSignal.timeout(60000)});
    assert.equal(inspection.framework,'express');
    sources.push({familyId:meta.familyId,repositoryId:meta.repositoryId,repository:meta.repository,partition:'train',license:meta.license,
      licenseHash:bytesHash(licence),securityImplementationHashes:implementations.map(([,h])=>h),revisions:[{commit:meta.revision,sourceHashes:inspection.sourceHashes}],
      adapterHash:await nativeAdapterIdentity(meta),oracleHash:sha({harness,family:meta.familyId,method:'native-independent-controls-v1'})});
  }
  // Fixed ordering uses upstream identity only. It does not inspect labels.
  sources.sort((a,b)=>sha(['native-cohort-partition-v1',a.familyId]).localeCompare(sha(['native-cohort-partition-v1',b.familyId])));
  sources.slice(0,4).forEach(f=>{f.partition='validation';});
  const lock=projectSourceLockSchema.parse({version:'vylnt-project-development-v1',experiment:randomUUID(),assessmentPolicyHash:bytesHash(await readFile('packages/core/project-evidence.ts')),harnessHash:harness,families:sources});
  const sanity=await prepareProjectData([],lock,exposure,key,[]);
  assert.equal(sanity.audit.trainFamilies,8);assert.equal(sanity.audit.validationFamilies,4);
  const registration={version:'vylnt-native-development-registration-v1',registeredAt:new Date().toISOString(),sourceHash:sha(lock),exposureHash:sha(exposure),harness,protocolHash,prepHash};
  const registrationHash=sign('native-development',registration);
  await mkdir(destination);await save('sources',lock);await save('exposure',exposure);await save('registration',{...registration,registrationHash});
  console.log('Registered 8 training and 4 validation families. Set VYLNT_NATIVE_REGISTRATION to '+registrationHash+' before new collection.');
}else{
  if(!values.registration||!((await realpath(values.registration)).startsWith(privateRoot+sep)))throw Error('Expected private registration');
  const {registrationHash,...registration}=await readJson(join(values.registration,'registration.json'));
  const lock=projectSourceLockSchema.parse(await readJson(join(values.registration,'sources.json'))),exposure=await readJson(join(values.registration,'exposure.json'),16*1024*1024);
  assert.equal(sign('native-development',registration),registrationHash);assert.equal(sha(lock),registration.sourceHash);assert.equal(sha(exposure),registration.exposureHash);
  assert.equal(harness,registration.harness);assert.equal(protocolHash,registration.protocolHash);assert.equal(prepHash,registration.prepHash);
  const inputs:{report:Report;seal:unknown;oracle:z.infer<typeof projectOracleSchema>}[]=[],trusted=new Map<string,ProjectPublicKey>();
  const collected=new Set<string>();let batches=0,reviewed=0;
  for(const slug of families){
    const root=join(privateRoot,'ml-native-observations',slug);
    assert.ok((await realpath(root)).startsWith(privateRoot+sep));
    const dirs=await readdir(root,{withFileTypes:true});assert.ok(dirs.length<=1000);
    for(const dir of dirs.sort((a,b)=>a.name.localeCompare(b.name))){
      if(!dir.isDirectory()||dir.isSymbolicLink())continue;
      const folder=join(root,dir.name);
      let raw;try{raw=await readJson(join(folder,'development-seeds.json'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}
      if(raw.registrationHash!==registrationHash)continue;
      const batch=authenticateNativeBatch(raw,key),acceptance=await readJson(join(folder,'acceptance.json'),8192);
      assert.ok(acceptance.completed&&acceptance.sourceRunCleanup&&acceptance.reloadVerified);
      const report:Report=await readJson(join(folder,'report.json'),512*1024),seal=await readJson(join(folder,'evidence.json'),132*1024);
      assert.equal(batch.scanHash,sha(report));assert.equal(batch.evidenceHash,sha(seal));
      assert.ok(Date.parse(report.observation.scannedAt)>=Date.parse(registration.registeredAt),'Capture predates its registration');
      const family=lock.families.find(f=>f.adapterHash===batch.adapterHash&&f.revisions.some(r=>r.commit===batch.commit));
      assert.ok(family);assert.equal(batch.family,createHmac('sha256',key).update('family:'+family.familyId).digest('hex'));
      const keys:ProjectPublicKey[]=await readJson(join(folder,'trusted-public-keys.json'),16384);
      const signer=keys.find(k=>k.keyId===seal.keyId);assert.ok(signer);trusted.set(signer.keyId,signer);
      const byRecord=new Map(report.findings.map(f=>[sha({scan:batch.scanHash,evidence:batch.evidenceHash,oracleHash:batch.oracleHash,findingId:f.id}),f]));
      for(const row of batch.rows){
        const finding=byRecord.get(row.evidenceRecord);assert.ok(finding&&finding.ruleId===row.category);
        const oracle={version:'vylnt-project-oracle-v1',familyId:family.familyId,scanHash:batch.scanHash,evidenceHash:sha(seal.evidence),commit:batch.commit,configHash:batch.configHash,adapterHash:batch.adapterHash,
          harnessHash:harness,sourceLockHash:registration.sourceHash,oracleHash:family.oracleHash,scenarioHash:sha([family.familyId,row.category,row.reason]),category:row.category,findingId:finding.id,label:row.uncertain?'needs-review':row.label,passed:true} as const;
        inputs.push({report,seal,oracle});
      }
      collected.add(family.familyId);batches++;reviewed+=batch.rows.length;
    }
  }
  assert.ok(batches,'No prospectively registered captures');
  const result=await prepareProjectData(inputs,lock,exposure,key,[...trusted.values()]);
  const partitions:Record<string,string>=result.split.families,locations=new Map<string,Set<string>>();
  for(const row of result.dataset.examples){const parts=locations.get(row.variant)??new Set<string>();parts.add(partitions[row.family]);locations.set(row.variant,parts);}
  await mkdir(destination);
  for(const category of projectRules){
    const examples=result.dataset.examples.filter(r=>r.category===category);
    const selected=examples.map(r=>({...r,partition:partitions[r.family],overlapsPartitions:locations.get(r.variant)!.size>1}));
    await save(category,{category,schemaVersion:result.dataset.schemaVersion,featureNames:result.dataset.featureNames,sourceLockHash:registration.sourceHash,registrationHash,
      train:selected.filter(r=>r.partition==='train'),validation:selected.filter(r=>r.partition==='validation'),readiness:result.audit.categories[category]});
  }
  for(const [name,value] of Object.entries(result))await save(name,value);
  await save('collection',{batches,findings:reviewed,capturedFamilies:[...collected].sort(),registeredFamilies:lock.families.length,registrationHash,trainingReady:result.audit.ready});
  console.log(JSON.stringify({batches,findings:reviewed,capturedFamilies:collected.size,readyCategories:Object.values(result.audit.categories).filter(c=>c.ready).length}));
  if(!result.audit.ready)process.exitCode=2;
}

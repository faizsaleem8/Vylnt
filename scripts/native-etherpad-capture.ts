import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,realpath,writeFile} from 'node:fs/promises';
import {join,sep} from 'node:path';
import type {BrowserContext,Page,Response} from 'playwright';
import {collectProjectDom} from '../apps/cli/project-dom';
import {scanProjectPage} from '../apps/cli/project-scanner';
import {mergeBrowserMeasurement} from '../apps/cli/project-probes';
import {measureHstsActivation,measureHstsDisable,measureHstsHostPolicy,measureHstsPlaintext,
  mergeHstsActivation,mergeHstsDisable,mergeHstsHostPolicy,mergeHstsPlaintext} from '../apps/cli/project-hsts-plaintext';
import {ProjectSigner} from '../apps/server/project-signing';
import {cookieMetadata,cspEvidenceComplete,securityHeaders,type Report} from '../packages/core';
import {contentHash} from '../packages/core/integrity';
import {projectTransportPolicy,verifyProjectEvidence,type ProjectEvidence} from '../packages/core/project-evidence';
import {parseSubmission} from '../packages/core/validation';
import {etherpadCookieProfiles,etherpadHstsProfiles,etherpadSourceIdentity,readEtherpadRegistration,type EtherpadCookieProfile} from '../packages/ml/native-etherpad-registration';
import {etherpadPreferenceSource,measureNativePreference,mergeNativePreference} from '../packages/ml/native-preference-evidence';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {authenticateNativeBatch,createNativeApiHstsSeedBatch,createNativePreferenceSeedBatch} from '../packages/ml/project-seed-corpus';
import {readNamedFixtureTls} from '../packages/ml/local-tls';

export async function openEtherpadCapture(registrationPath:string,requestedProfile?:string){
  const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
  const {registration,source}=await readEtherpadRegistration(registrationPath,key,true);
  const profile=etherpadCookieProfiles.find(candidate=>candidate===requestedProfile);
  const securePreference=profile?.endsWith('-secure')??false;
  assert.ok(requestedProfile===undefined?registration.scope==='prospective-etherpad-preference':
    profile&&registration.scope==='prospective-etherpad-cookie-variants','Etherpad profile does not match its registration');
  const {pin}=await etherpadSourceIdentity();
  let report:Report|undefined;
  async function snapshot(page:Page,response:Response,context:BrowserContext){
    assert.ok(!report&&response.status()===200&&response.url()===page.url());
    const dom=await collectProjectDom(page),cookies=await context.cookies(page.url()),headers=await response.headersArray();
    assert.ok(!dom.truncated&&cookies.length<100,'Native snapshot exceeded its collection budget');
    if(profile){
      const matching=cookies.filter(cookie=>cookie.name===etherpadPreferenceSource.cookieName);
      assert.ok(matching.length===1&&matchesPreferenceProfile(matching[0],profile),'Etherpad preference attributes changed before capture');
    }
    report=parseSubmission({scanId:randomUUID(),observation:{url:page.url(),scannedAt:new Date().toISOString(),
      headers:securityHeaders(headers),cspEvidenceComplete:cspEvidenceComplete(headers),domCollected:true,resources:dom.resources,scripts:dom.scripts,
      cookies:cookies.map(cookie=>cookieMetadata({name:cookie.name,secure:cookie.secure,httpOnly:cookie.httpOnly,session:cookie.expires===-1,
        sameSite:cookie.sameSite==='Strict'?'strict':cookie.sameSite==='Lax'?'lax':'no_restriction'}))}});
    assert.ok(Date.parse(report.observation.scannedAt)>=Date.parse(registration.registeredAt));
  }
  async function save(outcomes:{anonymousDenied:boolean;padServed:boolean;preference:{
    persisted:boolean;restricted:boolean;restored:boolean;preferenceAloneDenied:boolean}},privateValues:string[]){
    assert.ok(report,'Missing same-run browser snapshot');
    const current=await readEtherpadRegistration(registrationPath,key,true);
    assert.equal(current.registration.registrationHash,registration.registrationHash);
    const binding={runId:randomUUID(),commit:etherpadPreferenceSource.commit,adapterHash:source.adapterHash,
      configHash:await contentHash({profile:profile??'native-http-editor-preferences-v1',registration:registration.registrationHash,
        source:registration.pinHash,collection:'document-structure-and-cookie-attributes'})};
    let evidence=await collectResponseFacts(report,binding,false);
    evidence.collectionKind='application';
    // The pinned server uses Express inside an async restart hook, outside the
    // generic static adapter. These are reviewed file identities, with partial
    // route coverage. Functional controls establish the target's purpose.
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',
      sourceHashes:source.revisions[0].sourceHashes,headerOperations:0,cookieOperations:0,sessionMiddlewareRegistrations:1};
    const controls={version:'vylnt-etherpad-preference-oracle-v1' as const,scanHash:await contentHash(report),
      adapterHash:source.adapterHash,sourceGraphHash:etherpadPreferenceSource.graphHash,sourceReverified:true,
      anonymousDenied:outcomes.anonymousDenied,padServed:outcomes.padServed,...outcomes.preference,
      ...(securePreference?{securePreference:true as const}:{})};
    const measurement=await measureNativePreference(report,evidence,controls);
    assert.equal(measurement.status,'verified','Native preference evidence did not satisfy the scoped policy');
    evidence=await mergeNativePreference(evidence,measurement);
    const root=await realpath('.local'),signer=await ProjectSigner.open(join(root,'etherpad-capture-signer')),seal=signer.seal(evidence);
    assert.ok(await verifyProjectEvidence(seal,report,signer.trustedKeys));
    const previousRegistration=process.env.VYLNT_NATIVE_REGISTRATION;
    process.env.VYLNT_NATIVE_REGISTRATION=registration.registrationHash;
    let seeds;
    try{seeds=await createNativePreferenceSeedBatch(report,seal,signer.trustedKeys,controls,key);}
    finally{
      if(previousRegistration===undefined)delete process.env.VYLNT_NATIVE_REGISTRATION;
      else process.env.VYLNT_NATIVE_REGISTRATION=previousRegistration;
    }
    const labelled=seeds.rows.filter(row=>!row.uncertain);
    assert.deepEqual(labelled.map(row=>row.category).sort(),securePreference?['CK-002']:['CK-001','CK-002']);
    assert.ok(labelled.every(row=>row.label==='contextual'));
    const artifacts={'report.json':report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,
      'development-seeds.json':seeds,'source.json':pin,'native-oracles.json':controls,'registration.json':registration};
    const folder=await saveCapture(artifacts,privateValues,binding.runId,key,registration.registrationHash);
    return {folder,signedContextualRows:labelled.length};
  }
  return {snapshot,save};
}

export async function openEtherpadHstsCapture(registrationPath:string,requestedProfile:string){
  const profile=etherpadHstsProfiles.find(candidate=>candidate===requestedProfile);
  assert.ok(profile,'Unsupported Etherpad HSTS profile');
  const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
  const {registration,source}=await readEtherpadRegistration(registrationPath,key,true);
  assert.equal(registration.scope,'prospective-etherpad-hsts');
  const {pin}=await etherpadSourceIdentity(),tls=await readNamedFixtureTls();
  const wireHsts=profile==='hsts-disabled'||profile==='hsts-disable-active'?'max-age=0':
    profile==='hsts-positive'||profile==='hsts-activate-native'?'max-age=086400':'absent';
  let report:Report|undefined,evidence:ProjectEvidence|undefined;
  let activation:Awaited<ReturnType<typeof measureHstsActivation>>|undefined;
  let disable:Awaited<ReturnType<typeof measureHstsDisable>>|undefined;
  let host:Awaited<ReturnType<typeof measureHstsHostPolicy>>|undefined;
  let plaintext:Awaited<ReturnType<typeof measureHstsPlaintext>>|undefined;
  async function collect(origin:string,username:string,password:string,signal:AbortSignal){
    assert.ok(!report);
    const target=origin+'/p/vylnt-disposable';
    const authorization='Basic '+Buffer.from(username+':'+password).toString('base64');
    const observed=await scanProjectPage(target,{allowedLocalOrigins:[origin,origin.replace('https:','http:')],
      namedUpgradeFixture:true,requireComplete:true,channel:'chromium',signal,hooks:{
        prepare:async(_page,context)=>{
          await context.route(origin+'/**',route=>route.continue({headers:{...route.request().headers(),authorization}}));
        },
        collected:async(page,context,current)=>{
          assert.equal(page.url(),target);
          assert.equal(await page.locator('#editorcontainer').count(),1,'Expected protected native pad document');
          if(profile==='hsts-activate-native')activation=await measureHstsActivation(page,current,source.adapterHash,tls,signal);
          if(profile==='hsts-disable-active')disable=await measureHstsDisable(page,current,source.adapterHash,tls,signal);
          if(profile==='hsts-host')host=await measureHstsHostPolicy(page,current,source.adapterHash,tls,signal);
          if(profile==='hsts-missing')plaintext=await measureHstsPlaintext(context,current,source.adapterHash,tls,signal);
        }
      }});
    report=observed.report;
    assert.ok(observed.measurement.tlsValidated?.value===true&&observed.measurement.hstsApplicable?.value===true&&
      Date.parse(report.observation.scannedAt)>=Date.parse(registration.registeredAt));
    evidence=mergeBrowserMeasurement(await collectResponseFacts(report,{runId:randomUUID(),commit:etherpadPreferenceSource.commit,
      adapterHash:source.adapterHash,configHash:await contentHash({profile,registration:registration.registrationHash,leaf:tls.manifest.sha256})},false),observed.measurement);
    evidence.collectionKind='application';evidence.policy=projectTransportPolicy;
    if(activation)evidence=await mergeHstsActivation(evidence,activation);
    if(disable)evidence=await mergeHstsDisable(evidence,disable);
    if(host)evidence=await mergeHstsHostPolicy(evidence,host);
    if(plaintext)evidence=await mergeHstsPlaintext(evidence,plaintext);
    evidence.inspection={version:'vylnt-express-inspection-v1',framework:'express',coverage:'partial',
      sourceHashes:source.revisions[0].sourceHashes,headerOperations:0,cookieOperations:0,sessionMiddlewareRegistrations:1};
  }
  async function save(controls:{anonymousDenied:boolean;padServed:boolean;nativePadWriteReadback:boolean;anonymousPadWriteDenied:boolean},privateValues:string[]){
    assert.ok(report&&evidence&&controls.anonymousDenied&&controls.padServed&&controls.nativePadWriteReadback&&controls.anonymousPadWriteDenied);
    assert.equal((await readEtherpadRegistration(registrationPath,key,true)).registration.registrationHash,registration.registrationHash);
    const signer=await ProjectSigner.open(join('.local','etherpad-capture-signer')),seal=signer.seal(evidence);
    assert.ok(await verifyProjectEvidence(seal,report,signer.trustedKeys));
    const previous=process.env.VYLNT_NATIVE_REGISTRATION;
    process.env.VYLNT_NATIVE_REGISTRATION=registration.registrationHash;
    let seeds;
    try{
      seeds=await createNativeApiHstsSeedBatch('etherpad',report,seal,signer.trustedKeys,{
        nativeWriteReadback:true,checkIdentity:source.adapterHash,leaf:tls.manifest.sha256,wireHsts,
        plaintextWitness:plaintext?await contentHash(plaintext):undefined,hostPolicyWitness:host?await contentHash(host):undefined},key);
    }finally{
      if(previous===undefined)delete process.env.VYLNT_NATIVE_REGISTRATION;
      else process.env.VYLNT_NATIVE_REGISTRATION=previous;
    }
    assert.deepEqual(seeds.rows.filter(row=>!row.uncertain).map(row=>[row.category,row.label]),
      [['HDR-001',wireHsts==='max-age=086400'||host?'contextual':'change-warranted']]);
    const artifacts={'report.json':report,'evidence.json':seal,'trusted-public-keys.json':signer.trustedKeys,
      'development-seeds.json':seeds,'source.json':pin,'registration.json':registration,'native-oracles.json':{...controls,profile},
      ...(activation?{'hsts-activation-oracle.json':activation}:{}),...(disable?{'hsts-disable-oracle.json':disable}:{}),
      ...(host?{'hsts-host-oracle.json':host}:{}),...(plaintext?{'hsts-oracle.json':plaintext}:{})};
    const folder=await saveCapture(artifacts,privateValues,evidence.runId,key,registration.registrationHash);
    return {folder,profile};
  }
  return {collect,save,tls,wireHsts};
}

async function saveCapture(artifacts:Record<string,unknown>,privateValues:string[],runId:string,key:string,registrationHash:string){
    const serialized=JSON.stringify(artifacts);
    for(const value of privateValues)assert.ok(value&&!serialized.includes(value),'Unexpected private data in Etherpad capture');
    const root=await realpath('.local'),parent=join(root,'ml-native-observations','etherpad');
    await mkdir(parent,{recursive:true});
    const actual=await realpath(parent);
    assert.ok(actual===parent&&actual.startsWith(root+sep));
    const folder=join(actual,runId);
    await mkdir(folder);
    for(const [name,value] of Object.entries(artifacts))await writeFile(join(folder,name),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
    const reload=async (name:string)=>JSON.parse(await readFile(join(folder,name),'utf8'));
    const savedReport=await reload('report.json'),savedSeal=await reload('evidence.json'),keys=await reload('trusted-public-keys.json');
    const savedSeeds=authenticateNativeBatch(await reload('development-seeds.json'),key);
    assert.ok(await verifyProjectEvidence(savedSeal,savedReport,keys));
    assert.equal(savedSeeds.registrationHash,registrationHash);
    assert.equal(savedSeeds.evidenceHash,await contentHash(savedSeal));
    const changed=structuredClone(savedReport);changed.observation.url+='-changed';
    assert.ok(!await verifyProjectEvidence(savedSeal,changed,keys));
    const forged=structuredClone(savedSeal);forged.evidence.configHash='0'.repeat(64);
    assert.ok(!await verifyProjectEvidence(forged,savedReport,keys));
    await writeFile(join(folder,'acceptance.json'),JSON.stringify({completed:true,sourceRunCleanup:true,reloadVerified:true,
      alteredScanRejected:true,alteredEvidenceRejected:true,eligibleForTraining:false,qualification:false},null,2),{flag:'wx',mode:0o600});
    return folder;
}

function matchesPreferenceProfile(cookie:{sameSite:string;expires:number;secure:boolean;httpOnly:boolean},profile:EtherpadCookieProfile){
  return cookie.sameSite===(profile.startsWith('strict-')?'Strict':'Lax')&&
    (cookie.expires===-1)===profile.includes('-transient')&&cookie.secure===profile.endsWith('-secure')&&!cookie.httpOnly;
}

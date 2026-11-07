import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {lstat,readFile,realpath} from 'node:fs/promises';
import {join,sep} from 'node:path';
import {z} from 'zod';
import {canonicalJson} from '../core/integrity';
import {projectSourceLockSchema} from './project-dataset';
import {etherpadPreferenceSource} from './native-preference-evidence';

export const etherpadReplaces='upstream:joshuaengine7/stockbase';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const registrationBase=z.object({version:z.literal('vylnt-native-development-registration-v1'),
  registeredAt:z.iso.datetime(),parentHash:digest,sourceHash:digest,exposureHash:digest,harness:digest,pinHash:digest});
const registrationBody=z.discriminatedUnion('scope',[
  registrationBase.extend({scope:z.literal('prospective-etherpad-preference'),retiredFamily:z.literal(etherpadReplaces)}).strict(),
  registrationBase.extend({scope:z.literal('prospective-etherpad-cookie-variants')}).strict(),
  registrationBase.extend({scope:z.literal('prospective-etherpad-hsts')}).strict(),
]);
export const etherpadHstsProfiles=['hsts-disabled','hsts-positive','hsts-disable-active','hsts-activate-native','hsts-missing','hsts-host'] as const;
export type EtherpadHstsProfile=typeof etherpadHstsProfiles[number];
export const etherpadCookieProfiles=['lax-transient','strict-transient','strict-persistent',
  'lax-transient-secure','strict-transient-secure','lax-persistent-secure','strict-persistent-secure'] as const;
export type EtherpadCookieProfile=typeof etherpadCookieProfiles[number];
type SourceLock=z.infer<typeof projectSourceLockSchema>;
export const privateDigest=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');

export async function etherpadSourceIdentity(){
  const pin=JSON.parse(await readFile('ml/applications/native/etherpad.source.json','utf8'));
  assert.equal(pin.familyId,etherpadPreferenceSource.family);
  assert.equal(pin.revision,etherpadPreferenceSource.commit);
  assert.equal(privateDigest(pin.sourceSha256),etherpadPreferenceSource.graphHash);
  const files=['scripts/native-etherpad-stage.mjs','scripts/native-etherpad-smoke.mjs','scripts/native-etherpad-preference.mjs',
    'scripts/native-etherpad-capture.ts','packages/ml/native-etherpad-registration.ts','packages/ml/native-preference-evidence.ts',
    'packages/ml/project-seed-corpus.ts','packages/core/project-evidence.ts','apps/cli/project-dom.ts',
    'apps/cli/project-scanner.ts','apps/cli/project-hsts-plaintext.ts','packages/ml/local-tls.ts','scripts/ml-resource-upgrade-linux.sh'];
  const harness=privateDigest(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
  const source:z.infer<typeof projectSourceLockSchema.shape.families.element>={
    familyId:pin.familyId,repository:pin.repository,repositoryId:pin.repositoryId,partition:'validation',
    license:pin.license,licenseHash:pin.licenseSha256,
    securityImplementationHashes:Object.entries(pin.sourceSha256 as Record<string,string>)
      .filter(([file])=>/\.[cm]?[jt]sx?$/.test(file)&&!file.startsWith('doc/')).map(([,hash])=>hash),
    revisions:[{commit:pin.revision,sourceHashes:Object.values(pin.sourceSha256 as Record<string,string>)}],
    adapterHash:privateDigest(['vylnt-etherpad-preference-adapter-v1',harness,etherpadPreferenceSource.graphHash]),
    oracleHash:privateDigest(['vylnt-etherpad-preference-oracle-v1',harness,etherpadPreferenceSource.graphHash]),
  };
  return {pin,source,harness,pinHash:privateDigest(pin)};
}

export function signEtherpadRegistration(input:unknown,key:string){
  const body=registrationBody.parse(input);
  assert.ok(key.length>=32,'Original installation family key required');
  return {...body,registrationHash:createHmac('sha256',key).update('native-development:'+canonicalJson(body)).digest('hex')};
}

export async function readEtherpadRegistration(directory:string,key:string,requireCurrent:boolean){
  const root=await realpath('.local'),actual=await realpath(directory);
  assert.ok(actual.startsWith(root+sep),'Expected a private registration');
  async function json(name:string){
    const path=join(actual,name),entry=await lstat(path);
    assert.ok(entry.isFile()&&!entry.isSymbolicLink()&&entry.size<256*1024);
    return JSON.parse(await readFile(path,'utf8'));
  }
  const {registrationHash,...body}=await json('registration.json');
  const registration=signEtherpadRegistration(body,key);
  assert.equal(registrationHash,registration.registrationHash);
  assert.ok(Date.parse(registration.registeredAt)<=Date.now(),'Registration is dated in the future');
  const lock=projectSourceLockSchema.parse(await json('sources.json'));
  assert.equal(privateDigest(lock),registration.sourceHash);
  const sources=lock.families.filter(source=>source.familyId===etherpadPreferenceSource.family);
  assert.ok(sources.length===1&&sources[0].partition==='validation'&&sources[0].revisions.length===1
    &&sources[0].revisions[0].commit===etherpadPreferenceSource.commit);
  assert.equal(lock.harnessHash,registration.harness);
  if(requireCurrent){
    const expected=await etherpadSourceIdentity();
    assert.equal(expected.harness,registration.harness,'Etherpad collection code changed after registration');
    assert.equal(expected.pinHash,registration.pinHash,'Etherpad pin changed after registration');
    assert.deepEqual(sources[0],expected.source);
  }
  return {registration,lock,source:sources[0]};
}

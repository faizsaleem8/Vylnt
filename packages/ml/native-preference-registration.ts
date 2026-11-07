import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve,dirname,join,sep} from 'node:path';
import {z} from 'zod';
import {canonicalJson,contentHash} from '../core/integrity';
import {nativeHarnessHash} from './native-producer-identity';
import {nativePreferenceSource} from './native-preference-evidence';

const digest=z.string().regex(/^[a-f0-9]{64}$/);
const bodySchema=z.object({version:z.literal('vylnt-native-preference-registration-v1'),scope:z.literal('prospective-native-preference-seeds'),
  registeredAt:z.iso.datetime(),family:z.literal(nativePreferenceSource.family),commit:z.literal(nativePreferenceSource.commit),
  sourceHash:digest,sourceGraphHash:z.literal(nativePreferenceSource.graphHash),harnessHash:digest,assessmentHash:digest,
  profile:z.literal('misleading-native-language-cookie'),partition:z.literal('train'),
  qualification:z.literal(false),completeDevelopmentCohort:z.literal(false)}).strict();
const schema=bodySchema.extend({registrationHash:digest}).strict();
type Source={familyId:string;revision:string;sourceSha256:Record<string,string>};
const sha=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
async function current(meta:Source){
  if(meta.familyId!==nativePreferenceSource.family||meta.revision!==nativePreferenceSource.commit
    ||await contentHash(meta.sourceSha256)!==nativePreferenceSource.graphHash)throw Error('Unsupported native preference source graph');
  return {sourceHash:await contentHash(meta),harnessHash:await nativeHarnessHash(),assessmentHash:sha(await readFile('packages/core/project-evidence.ts'))};
}
async function secret(){
  const key=(await readFile('.local/insights-dataset-key','utf8')).trim();
  if(key.length<32)throw Error('Original installation family key required');return key;
}
const sign=(key:string,body:unknown)=>createHmac('sha256',key).update('native-preference-collection:'+canonicalJson(body)).digest('hex');
export async function registerNativePreference(output:string,meta:Source){
  const root=await realpath('.local'),destination=resolve(output);
  if(await realpath(dirname(destination))!==root||dirname(destination)!==resolve('.local'))throw Error('Registration must be directly under .local');
  const body=bodySchema.parse({version:'vylnt-native-preference-registration-v1',scope:'prospective-native-preference-seeds',
    registeredAt:new Date().toISOString(),family:meta.familyId,commit:meta.revision,sourceGraphHash:nativePreferenceSource.graphHash,
    ...await current(meta),profile:'misleading-native-language-cookie',partition:'train',qualification:false,completeDevelopmentCohort:false});
  const registration={...body,registrationHash:sign(await secret(),body)};
  await mkdir(destination);
  await writeFile(join(destination,'registration.json'),JSON.stringify(registration,null,2),{flag:'wx',mode:0o600});
  await writeFile(join(destination,'source.json'),JSON.stringify(meta,null,2),{flag:'wx',mode:0o600});
  return registration;
}
export async function readArchivedNativePreferenceRegistration(folder:string,meta:Source){
  const root=await realpath('.local'),actual=await realpath(folder);
  if(!actual.startsWith(root+sep))throw Error('Expected private preference registration');
  const file=join(actual,'registration.json'),info=await lstat(file);
  if(!info.isFile()||info.isSymbolicLink()||info.size>8192)throw Error('Invalid preference registration file');
  const {registrationHash,...body}=schema.parse(JSON.parse(await readFile(file,'utf8')));
  if(!timingSafeEqual(Buffer.from(sign(await secret(),body),'hex'),Buffer.from(registrationHash,'hex')))throw Error('Preference registration receipt changed');
  if(body.family!==meta.familyId||body.commit!==meta.revision||body.sourceHash!==await contentHash(meta)
    ||body.sourceGraphHash!==await contentHash(meta.sourceSha256))throw Error('Preference source changed after registration');
  if(Date.parse(body.registeredAt)>Date.now())throw Error('Preference registration date is in the future');
  return {...body,registrationHash};
}

export async function readNativePreferenceRegistration(folder:string,meta:Source){
  const registration=await readArchivedNativePreferenceRegistration(folder,meta);
  const expected=await current(meta);
  if(Object.entries(expected).some(([name,value])=>registration[name as keyof typeof expected]!==value))throw Error('Preference source or producer changed after registration');
  return registration;
}

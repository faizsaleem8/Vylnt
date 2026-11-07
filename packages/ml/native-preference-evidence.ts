/** Developer-only native oracle adapter. No HTTP/upload route exposes issuance. */
import {z} from 'zod';
import {canonicalJson,contentHash} from '../core/integrity';
import {projectPreferencePolicy,projectEvidenceSchema,type ProjectEvidence,type ProjectFact} from '../core/project-evidence';
import type {Report} from '../core';

export const nativePreferenceSource={family:'upstream:asdteke/homeinventory',commit:'ffbdb191ac9eeb0d6e19a91db0c9fea4b476e49b',
  graphHash:'0d57b151db2fec07201079bbd1df801abf9ef4b964afe59b39805f0498d1a265',cookieName:'session-language-preference'} as const;
export const etherpadPreferenceSource={family:'upstream:ether/etherpad',commit:'3ecf54ef7c8a0341bc5fe436725f3843f7c3ce80',
  graphHash:'bd22e0b829c621ed067b3aa661b7dfbdbe81abf2a51150f391f8418ab680f684',cookieName:'session-prefsHttp'} as const;
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const phaseSchema=z.object({mode:z.enum(['first','second','absent','restricted','restored','competing-storage','no-auth']),
  language:z.enum(['de','fr','en','tr']),authentication:z.enum(['authenticated','anonymous']),nativeInteraction:z.boolean().optional(),
  access:z.object({read:z.boolean(),wrote:z.boolean(),valid:z.boolean()}).strict(),complete:z.boolean()}).strict();
export const nativePreferenceControlsSchema=z.object({version:z.literal('vylnt-native-preference-oracle-v1'),
  scanHash:digest,adapterHash:digest,sourceGraphHash:digest,collectorHash:digest,buildHash:digest,overlayHash:digest,
  nativeSessionSignature:z.boolean(),independentOwnerReadback:z.boolean(),authenticationAttributesPreserved:z.boolean(),
  sourceReverified:z.boolean(),securePreference:z.literal(true).optional(),phases:z.array(phaseSchema).max(7)}).strict();
export type NativePreferenceControls=z.infer<typeof nativePreferenceControlsSchema>;
const etherpadControlsSchema=z.object({version:z.literal('vylnt-etherpad-preference-oracle-v1'),
  scanHash:digest,adapterHash:digest,sourceGraphHash:digest,sourceReverified:z.boolean(),securePreference:z.literal(true).optional(),
  anonymousDenied:z.boolean(),padServed:z.boolean(),persisted:z.boolean(),restricted:z.boolean(),
  restored:z.boolean(),preferenceAloneDenied:z.boolean()}).strict();
export const preferenceControlsSchema=z.discriminatedUnion('version',[nativePreferenceControlsSchema,etherpadControlsSchema]);
export type PreferenceControls=z.infer<typeof preferenceControlsSchema>;

export function preferenceSource(controls:PreferenceControls){
  return controls.version==='vylnt-etherpad-preference-oracle-v1'?etherpadPreferenceSource:nativePreferenceSource;
}

export function preferenceControlsPass(controls:PreferenceControls){
  if(controls.version==='vylnt-native-preference-oracle-v1')return nativePreferenceControlsPass(controls);
  return controls.sourceGraphHash===etherpadPreferenceSource.graphHash&&controls.sourceReverified
    &&controls.anonymousDenied&&controls.padServed&&controls.persisted&&controls.restricted&&controls.restored&&controls.preferenceAloneDenied;
}

export function nativePreferenceControlsPass(input:NativePreferenceControls){
  if(!input.nativeSessionSignature||!input.independentOwnerReadback||!input.authenticationAttributesPreserved||!input.sourceReverified
    ||input.sourceGraphHash!==nativePreferenceSource.graphHash||input.phases.length!==7)return false;
  const phases=new Map(input.phases.map(phase=>[phase.mode,phase]));
  if(phases.size!==7)return false;
  const expected={first:'de',second:'fr',absent:'tr',restricted:'en',restored:'de','competing-storage':'fr','no-auth':'de'} as const;
  for(const [mode,language] of Object.entries(expected)){
    const phase=phases.get(mode as keyof typeof expected);
    if(!phase?.complete||!phase.access.valid||!phase.access.wrote||phase.language!==language
      ||phase.authentication!==(mode==='no-auth'?'anonymous':'authenticated'))return false;
    if(['first','second','restored'].includes(mode)&&!phase.access.read)return false;
    if(mode==='restricted'&&phase.access.read)return false;
  }
  return phases.get('first')?.nativeInteraction===true;
}

export interface NativePreferenceMeasurement {
  version:'vylnt-native-preference-measurement-v1';scanHash:string;adapterHash:string;
  commit:string;inspectionHash:string;controls:PreferenceControls;status:'verified'|'needs-review';
  targets:{findingId:string;facts:Partial<Record<'cookieAuthDependency'|'cookiePreferenceVerified'|'cookieJsAccessObserved'|'cookieJsAccessRequired',ProjectFact>>}[];
}
const issued=new WeakMap<NativePreferenceMeasurement,string>();
/** Trusted collector calls this only after original source/blob and native
 * counterfactual checks. A cookie read alone cannot pass these controls. */
export async function measureNativePreference(report:Report,evidence:ProjectEvidence,input:PreferenceControls):Promise<NativePreferenceMeasurement>{
  const controls=preferenceControlsSchema.parse(input),scanHash=await contentHash(report),source=preferenceSource(controls);
  if(controls.scanHash!==scanHash||evidence.originalScanHash!==scanHash||evidence.scanId!==report.scanId
    ||controls.adapterHash!==evidence.adapterHash||evidence.commit!==source.commit)throw Error('Native preference scan/source binding differs');
  const origin=new URL(report.observation.url);
  const paths=controls.version==='vylnt-etherpad-preference-oracle-v1'?['/p/vylnt-disposable']:['/','/legal-consent'];
  if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!paths.includes(origin.pathname)||origin.search||origin.hash||origin.username||origin.password)throw Error('Unsupported native preference origin');
  const metadata=report.observation.cookies?.filter(cookie=>cookie.name===source.cookieName);
  const complete=preferenceControlsPass(controls)&&evidence.inspection?.framework==='express'&&!!evidence.inspection.sourceHashes.length
    // The pinned client's own writer uses Lax; its pinned language detector
    // can write Strict. Both are observed native states, not invented defaults.
    &&metadata?.length===1&&metadata[0].secure===(controls.securePreference??false)
    &&metadata[0].httpOnly===false&&['lax','strict'].includes(metadata[0].sameSite??'');
  const measurement:NativePreferenceMeasurement={version:'vylnt-native-preference-measurement-v1',scanHash,adapterHash:evidence.adapterHash,
    commit:evidence.commit,inspectionHash:await contentHash(evidence.inspection??null),controls,status:complete?'verified':'needs-review',targets:[]};
  if(complete){
    const witnessHash=await contentHash({version:measurement.version,controls,inspectionHash:measurement.inspectionHash,commit:evidence.commit});
    const fact=(value:boolean):ProjectFact=>({value,source:'functional',coverage:'complete',witnessHash});
    for(const finding of report.findings.filter(f=>['CK-001','CK-002'].includes(f.ruleId)&&f.evidence.cookieName===source.cookieName)){
      measurement.targets.push({findingId:finding.id,facts:{cookieAuthDependency:fact(false),cookiePreferenceVerified:fact(true),cookieJsAccessObserved:fact(true),cookieJsAccessRequired:fact(true)}});
    }
  }
  issued.set(measurement,canonicalJson(measurement));return measurement;
}

export async function mergeNativePreference(evidence:ProjectEvidence,measurement:NativePreferenceMeasurement){
  if(issued.get(measurement)!==canonicalJson(measurement))throw Error('Native preference producer receipt missing or altered');
  if(evidence.originalScanHash!==measurement.scanHash||evidence.adapterHash!==measurement.adapterHash||evidence.commit!==measurement.commit
    ||await contentHash(evidence.inspection??null)!==measurement.inspectionHash)throw Error('Native preference evidence binding differs');
  const merged=structuredClone(evidence);
  if(measurement.status!=='verified')return projectEvidenceSchema.parse(merged);
  merged.policy=projectPreferencePolicy;
  for(const entry of measurement.targets){
    const target=merged.targets.find(value=>value.findingId===entry.findingId&&['CK-001','CK-002'].includes(value.category));
    if(!target)throw Error('Native preference finding missing');
    for(const [name,fact] of Object.entries(entry.facts)){
      const existing=target.facts[name as keyof typeof target.facts];
      if(existing&&canonicalJson(existing)!==canonicalJson(fact))throw Error('Native preference fact conflict');
    }
    Object.assign(target.facts,entry.facts);
  }
  return projectEvidenceSchema.parse(merged);
}

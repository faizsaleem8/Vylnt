/** Native development observations, not a substitute for a registered corpus. */
import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {canonicalJson,contentHash} from '../core/integrity';
import {parseSubmission} from '../core/validation';
import {projectRules,evidenceFeatureNames4,prepareProjectContexts,verifyProjectEvidence,type ProjectPublicKey} from '../core/project-evidence';
import type {Report} from '../core';

const digest=z.string().regex(/^[a-f0-9]{64}$/);
const rowSchema=z.object({family:digest,category:z.enum(projectRules),variant:digest,
  sequence:z.array(z.array(z.union([z.literal(-1),z.literal(0),z.literal(1)]))).min(2).max(74),
  label:z.enum(['change-warranted','needs-review']),uncertain:z.boolean(),
  reason:z.enum(['native-authentication-without-secure','native-authentication-without-httponly','independent-context-missing']),
  evidenceRecord:digest}).strict();
const bodySchema=z.object({version:z.literal('vylnt-native-seed-batch-v1'),schemaVersion:z.literal('vylnt-evidence-v4'),
  featureNames:z.array(z.string()),family:digest,commit:z.string().regex(/^[a-f0-9]{40}$/),adapterHash:digest,configHash:digest,
  scanHash:digest,evidenceHash:digest,oracleHash:digest,
  eligibleForTraining:z.literal(false),qualification:z.literal(false),rows:z.array(rowSchema).max(1500)}).strict();
export const seedBatchSchema=bodySchema.extend({auth:digest}).strict();
export type NativeSeedBatch=z.infer<typeof seedBatchSchema>;
const secretCheck=(secret:string)=>{if(secret.length<32)throw Error('Existing private family key is required');};
const mac=(value:unknown,secret:string)=>createHmac('sha256',secret).update('vylnt-native-seed-batch-v1:'+canonicalJson(value)).digest('hex');

/** The native harness supplies independently executed database and cookie
 * controls. Inference and rule verdicts never supply the oracle label. */
const controlsSchema=z.object({signedSessionMapsToSyntheticUser:z.boolean(),nativeBookmarkRowVerified:z.boolean(),anonymousDeniedWithoutMutation:z.boolean(),
  cookie:z.object({secure:z.boolean(),httpOnly:z.boolean()}).strict(),javaScriptAccessUnnecessary:z.boolean()}).strict();
export type TabinatorSeedControls=z.infer<typeof controlsSchema>;
export async function createTabinatorSeedBatch(report:Report,seal:unknown,keys:readonly ProjectPublicKey[],controls:TabinatorSeedControls,secret:string){
  secretCheck(secret);
  controls=controlsSchema.parse(controls);
  const sanitized=parseSubmission({scanId:report.scanId,observation:report.observation});
  if(canonicalJson(sanitized)!==canonicalJson(report))throw Error('Seed report is not a sanitized consistent scan');
  const verified=await verifyProjectEvidence(seal,report,keys);
  if(!verified||verified.evidence.commit!=='51e7cffa382da3d7c710cbfc0d136868c94eb119'||verified.evidence.collectionKind==='mechanism-fixture')throw Error('Native seed provenance is incompatible');
  const evidence=verified.evidence,cookies=report.observation.cookies;
  if(cookies?.length!==1||cookies[0].secure!==controls.cookie.secure||cookies[0].httpOnly!==controls.cookie.httpOnly)throw Error('Independent cookie measurement does not match the scan');
  const family=createHmac('sha256',secret).update('family:upstream:lennysh/tabinator').digest('hex');
  const context=prepareProjectContexts(report,evidence),oracleHash=await contentHash({version:1,scope:'native-profile-and-bookmark-operation',controls});
  const rows:z.infer<typeof rowSchema>[]=[];
  const authenticated=controls.signedSessionMapsToSyntheticUser&&controls.nativeBookmarkRowVerified&&controls.anonymousDeniedWithoutMutation;
  for(const finding of report.findings){
    if(!projectRules.includes(finding.ruleId as typeof projectRules[number]))continue;
    let label:'change-warranted'|'needs-review'='needs-review',reason:z.infer<typeof rowSchema>['reason']='independent-context-missing';
    if(authenticated&&finding.ruleId==='CK-001'&&!controls.cookie.secure){label='change-warranted';reason='native-authentication-without-secure';}
    if(authenticated&&finding.ruleId==='CK-002'&&!controls.cookie.httpOnly&&controls.javaScriptAccessUnnecessary){label='change-warranted';reason='native-authentication-without-httponly';}
    const input=context(finding);
    rows.push(rowSchema.parse({family,category:finding.ruleId as typeof projectRules[number],variant:await contentHash(input.sequence),sequence:input.sequence,label,
      uncertain:label==='needs-review'||input.requiresReview,reason,evidenceRecord:await contentHash({scan:await contentHash(report),evidence:await contentHash(seal),oracleHash,findingId:finding.id})}));
  }
  const body=bodySchema.parse({version:'vylnt-native-seed-batch-v1',schemaVersion:'vylnt-evidence-v4',featureNames:[...evidenceFeatureNames4],
    family,commit:evidence.commit,adapterHash:evidence.adapterHash,configHash:evidence.configHash,scanHash:await contentHash(report),evidenceHash:await contentHash(seal),oracleHash,
    eligibleForTraining:false,qualification:false,rows});
  return {...body,auth:mac(body,secret)};
}

export async function assembleNativeSeedCorpus(inputs:unknown[],secret:string){
  secretCheck(secret);if(!inputs.length||inputs.length>200)throw Error('Expected 1..200 native seed batches');
  const rows:z.infer<typeof rowSchema>[]=[],seen=new Set<string>(),proofs:Omit<NativeSeedBatch,'rows'|'featureNames'>[]=[];
  let repeatedContexts=0;
  for(const input of inputs){
    const batch=seedBatchSchema.parse(input),{auth,...body}=batch;
    if(!timingSafeEqual(Buffer.from(auth,'hex'),Buffer.from(mac(body,secret),'hex')))throw Error('Native seed receipt changed or belongs to another installation');
    if(canonicalJson(batch.featureNames)!==canonicalJson(evidenceFeatureNames4))throw Error('Native seed feature contract changed');
    for(const row of batch.rows){
      if(row.family!==batch.family||row.sequence.some(step=>step.length!==evidenceFeatureNames4.length)||row.variant!==await contentHash(row.sequence))throw Error('Native seed input binding changed');
      const key=canonicalJson([row.family,row.category,row.variant,row.label]);
      if(seen.has(key)){repeatedContexts++;continue;}seen.add(key);rows.push({...row});
    }
    const {rows:_,featureNames:__,...proof}=batch;proofs.push(proof);
  }
  const groups=new Map<string,typeof rows>();for(const row of rows){const members=groups.get(row.variant)??[];members.push(row);groups.set(row.variant,members);}
  for(const members of groups.values())if(new Set(members.map(row=>row.label)).size>1||members.some(row=>row.uncertain))for(const row of members)row.uncertain=true;
  const categories=Object.fromEntries(projectRules.map(category=>{
    const examples=rows.filter(row=>row.category===category);
    return[category,{version:'vylnt-project-seed-dataset-v1',category,schemaVersion:'vylnt-evidence-v4',featureNames:[...evidenceFeatureNames4],eligibleForTraining:false,examples}];
  }));
  const counts=Object.fromEntries(projectRules.map(category=>{
    const examples=rows.filter(row=>row.category===category),usable=examples.filter(row=>!row.uncertain&&row.label==='change-warranted');
    // The seed protocol has one independently checked native operation. The
    // readable response changes CK-001's full tensor, but not its Secure cause.
    // Retain both inputs without advertising nuisance variation as new cases.
    return[category,{observations:examples.length,completeChangeContexts:new Set(usable.map(row=>canonicalJson([row.family,row.reason]))).size,
      numericChangeVariants:new Set(usable.map(row=>row.variant)).size,contextualContexts:0,
      needsReview:examples.filter(row=>row.uncertain).length,families:new Set(examples.map(row=>row.family)).size,
      trainingReady:false,deficits:['No eligible registered 8-training/4-validation family cohort.','No independently established contextual examples.','Need 30 distinct examples/class in training and 15/class in validation, each across at least 3 families.']}];
  }));
  return {categories,proofs,audit:{version:'vylnt-native-seed-audit-v1',batches:inputs.length,families:new Set(rows.map(row=>row.family)).size,repeatedContexts,
    categories:counts,trainingReady:false,qualification:false,modelFitted:false,testPredictions:0,
    limitations:['These are native seed observations, not a registered or eligible development corpus.','Unknown cases are never contextual labels.','Historical exposure and split checks remain required during registered preparation.']}};
}

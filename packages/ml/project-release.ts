/** Developer-only staging. This module does not fit, predict or enable models. */
import {z} from 'zod';
import {createHash} from 'node:crypto';
import {RULESET_VERSION} from '../core';
import {canonicalJson} from '../core/integrity';
export {canonicalJson};
import {projectRules,evidenceFeatureNames4} from '../core/project-evidence';
import {categoryQualifies} from './release-gates';
import {checkProjectModels,holdoutHash,holdoutVersion} from './project-holdout';
import {projectCategoryPolicySchema} from './project-candidate-runtime';
const digest=z.string().regex(/^[a-f0-9]{64}$/),count=z.number().int().min(0).max(50000),rate=z.number().finite().min(0).max(1);
const interval=z.tuple([rate,rate]).refine(v=>v[0]<=v[1]).nullable();
const metrics=z.object({precision:rate.nullable(),recall:rate.nullable(),coverage:rate,abstentions:count,contextualMisclassification:count,
  insufficientEvidenceContextual:count,highCriticalContextual:count,precision95:interval,recall95:interval,coverage95:interval,labelledExamples:count,totalExamples:count}).strict();
const gates=z.object({precision:z.boolean(),recall:z.boolean(),coverage:z.boolean(),noHighCriticalContextual:z.boolean(),noInsufficientEvidenceContextual:z.boolean(),ruleComparator:z.boolean()}).strict();
const cluster=z.object({method:z.literal('family-cluster-percentile-bootstrap'),seed:z.literal(42),repetitions:z.literal(1000),intervals:z.object({precision:interval,recall:interval,coverage:interval}).strict()}).strict();
const resultCategory=z.object({modelOnly:metrics,afterSafeguards:metrics,logistic:z.object({modelOnly:metrics,afterSafeguards:metrics}).strict(),ruleOnly:metrics,gates,passed:z.boolean(),
  applicationContextLinks:count,metricContexts:count,uncertainty:z.object({modelOnly:cluster,afterSafeguards:cluster,logisticModelOnly:cluster,logisticAfterSafeguards:cluster,ruleOnly:cluster}).strict()}).strict();
const counts=z.object({families:count,classes:z.object({'change-warranted':z.object({contexts:count,families:count}).strict(),contextual:z.object({contexts:count,families:count}).strict()}).strict()}).strict();
const hashBytes=(value:string)=>createHash('sha256').update(value).digest('hex');
export const stagedProjectReleaseVersion='vylnt-staged-project-release-v1';
export const stagedProjectScope='Controlled local Node.js/Express applications and registered adapters only. Untested frameworks, routes and missing evidence require review.';
const identitySchema=z.object({candidateHash:digest,modelHash:digest,categoryPolicyHash:digest,evaluationHash:digest,registrationHash:digest,holdoutHash:digest,
  sourceLockHash:digest,exposureHash:digest,assessmentPolicyHash:digest,harnessHash:digest,parityHashes:z.object({node:digest,chromium:digest,msedge:digest}).strict()}).strict();
export type ProjectReleaseIdentity=z.infer<typeof identitySchema>;

/** Inputs must already have passed private-record authentication and artifact binding. */
export function stageProjectRelease(input:{identity:ProjectReleaseIdentity;preflight:unknown;result:unknown;modelJson:string;logistic:unknown;categoryPolicy:unknown}){
  const identity=identitySchema.parse(input.identity);
  const preflight=z.object({version:z.literal(holdoutVersion),ready:z.literal(true),deficits:z.array(z.string()).max(0),categories:z.record(z.enum(projectRules),counts),
    datasetHash:digest,testPredictions:z.literal(0),qualification:z.literal(false)}).strict().parse(input.preflight);
  const result=z.object({version:z.literal(holdoutVersion),categories:z.record(z.enum(projectRules),resultCategory),passingCategories:z.array(z.enum(projectRules)),passed:z.boolean(),
    uniqueInputs:count,releaseStatus:z.literal('experimental'),qualificationScope:z.literal('Controlled project applications only; release/runtime acceptance is still required.')}).strict().parse(input.result);
  if(preflight.datasetHash!==identity.holdoutHash)throw Error('Release holdout binding changed');
  if(Buffer.byteLength(input.modelJson)>128*1024||hashBytes(input.modelJson)!==identity.modelHash)throw Error('Release model bytes changed or exceed 128 KiB');
  const model=JSON.parse(input.modelJson);
  const modelFields=new Set(['schemaVersion','kind','featureNames','hiddenSize','maxSteps','gateOrder','weightInput','weightHidden','biasInput','biasHidden','outputWeight','outputBias','calibration','thresholds','releaseStatus','datasetHash','splitHash']);
  if(Object.keys(model).some(k=>!modelFields.has(k)))throw Error('Unrecognized model metadata cannot enter a staged release');
  digest.parse(model.datasetHash);digest.parse(model.splitHash);
  if(model.calibration!==undefined)z.object({temperature:z.literal(1)}).strict().parse(model.calibration);
  if(model.thresholds!==undefined)z.object({contextual:z.literal(0),change:z.literal(1)}).strict().parse(model.thresholds);
  if(model.schemaVersion!=='vylnt-evidence-v4'||model.kind!=='evidence-lstm'||model.hiddenSize!==8||model.maxSteps!==74||model.gateOrder!=='ifgo'||model.releaseStatus!=='experimental'||canonicalJson(model.featureNames)!==canonicalJson(evidenceFeatureNames4))throw Error('Incompatible project release model');
  checkProjectModels(model,input.logistic);const categoryPolicy=projectCategoryPolicySchema.parse(input.categoryPolicy);
  const approved=projectRules.filter(category=>{
    const n=preflight.categories[category],r=result.categories[category],m=r.afterSafeguards,b=r.ruleOnly;
    if(!n||!r||n.families<10||n.classes['change-warranted'].contexts<30||n.classes.contextual.contexts<30||n.classes['change-warranted'].families<3||n.classes.contextual.families<3)throw Error('Insufficient category holdout counts');
    if(n.families>12||n.classes['change-warranted'].families>n.families||n.classes.contextual.families>n.families||r.metricContexts<n.classes['change-warranted'].contexts+n.classes.contextual.contexts||r.metricContexts>r.applicationContextLinks||r.applicationContextLinks>50000)throw Error('Inconsistent category count record');
    for(const v of [r.modelOnly,m,r.logistic.modelOnly,r.logistic.afterSafeguards,b]){
      if(v.totalExamples!==r.metricContexts||v.labelledExamples>v.totalExamples||v.abstentions>v.totalExamples||Math.abs(v.coverage-(v.totalExamples-v.abstentions)/Math.max(1,v.totalExamples))>1e-12)throw Error('Inconsistent category metric record');
    }
    const expected={precision:(m.precision??0)>=.9,recall:(m.recall??0)>=.95,coverage:m.coverage>=.5,noHighCriticalContextual:r.modelOnly.highCriticalContextual===0,
      noInsufficientEvidenceContextual:m.insufficientEvidenceContextual===0,ruleComparator:(m.precision??0)>(b.precision??0)&&(m.recall??0)>=(b.recall??0)-.05};
    const passed=Object.values(expected).every(Boolean);
    if(canonicalJson(expected)!==canonicalJson(r.gates)||passed!==r.passed)throw Error('Evaluation gate flags disagree with metrics');
    if(!passed)return false;
    const p=categoryPolicy.categories[category];
    if(!p?.supported||p.thresholds.contextual===0&&p.thresholds.change===1)throw Error('Passing category has no enabled validation policy');
    if(!categoryQualifies({changeCount:n.classes['change-warranted'].contexts,contextualCount:n.classes.contextual.contexts,changeFamilies:n.classes['change-warranted'].families,
      contextualFamilies:n.classes.contextual.families,testFamilies:n.families,precision:m.precision!,recall:m.recall!,coverage:m.coverage,highCriticalContextual:r.modelOnly.highCriticalContextual,
      rulePrecision:b.precision!,ruleRecall:b.recall!})||!m.precision95||!m.recall95||!m.coverage95)throw Error('Category does not meet the original release gates');
    return true;
  });
  if(canonicalJson(approved)!==canonicalJson(result.passingCategories)||result.passed!==projectRules.every(c=>result.categories[c].passed))throw Error('Evaluation category summary changed');
  if(!approved.length)throw Error('No category passed qualification; retain the experimental candidate');
  const runtimeCategoryPolicy={...categoryPolicy,categories:Object.fromEntries(projectRules.map(category=>[category,approved.includes(category)?categoryPolicy.categories[category]:{supported:false as const}]))};
  const runtimeCategoryPolicyHash=holdoutHash(runtimeCategoryPolicy);
  const release={version:stagedProjectReleaseVersion,runtimeEnabled:false,runtimeAcceptance:'pending',rulesetVersion:RULESET_VERSION,scope:stagedProjectScope,identity,
    modelJson:input.modelJson,runtimeCategoryPolicy,runtimeCategoryPolicyHash,stagedCategories:approved,categories:Object.fromEntries(approved.map(category=>[category,{evidenceSchema:'vylnt-evidence-v4',modelHash:identity.modelHash,
      categoryPolicyHash:identity.categoryPolicyHash,assessmentPolicyHash:identity.assessmentPolicyHash,evaluationHash:identity.evaluationHash,scope:stagedProjectScope,
      counts:preflight.categories[category],evaluation:result.categories[category]}]))};
  return {...release,releaseHash:holdoutHash(release)};
}

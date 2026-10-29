import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {stageProjectRelease,type ProjectReleaseIdentity} from '../packages/ml/project-release';
import {qualifyProjectCategory,holdoutHash,holdoutVersion,type HoldoutRow} from '../packages/ml/project-holdout';
import {projectRules,evidenceFeatureNames4} from '../packages/core/project-evidence';
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
// Hypothetical prediction/metric fixtures only; no candidate quality is measured.
export function releaseFixture(failed:string[]=[]){
  const width=evidenceFeatureNames4.length,flat=74*width+1;
  const model={schemaVersion:'vylnt-evidence-v4',kind:'evidence-lstm',featureNames:[...evidenceFeatureNames4],hiddenSize:8,maxSteps:74,gateOrder:'ifgo',releaseStatus:'experimental',datasetHash:sha('dataset'),splitHash:sha('split'),
    weightInput:Array.from({length:32},()=>Array(width).fill(0)),weightHidden:Array.from({length:32},()=>Array(8).fill(0)),biasInput:Array(32).fill(0),biasHidden:Array(32).fill(0),outputWeight:Array(8).fill(0),outputBias:0};
  const modelJson=JSON.stringify(model),identity:ProjectReleaseIdentity={candidateHash:sha('candidate'),modelHash:sha(modelJson),categoryPolicyHash:sha('policy'),evaluationHash:sha('evaluation'),registrationHash:sha('registration'),
    holdoutHash:sha('holdout'),sourceLockHash:sha('source'),exposureHash:sha('exposure'),assessmentPolicyHash:sha('assessment'),harnessHash:sha('harness'),parityHashes:{node:sha('node'),chromium:sha('chromium'),msedge:sha('edge')}};
  const categories=Object.fromEntries(projectRules.map(category=>{
    const rows:HoldoutRow[]=Array.from({length:60},(_,i)=>({family:sha('family'+i%12),variant:sha(category+i),sequence:[Array(width).fill(0),Array(width).fill(1)],category,severity:'medium',label:i<30?'change-warranted':'contextual',uncertain:false,evidenceRequiresReview:false,contextualAllowed:true,evidenceRecord:sha('record'),scenario:sha('scenario')}));
    const predictions=rows.map(r=>failed.includes(category)?'needs-review' as const:r.label);
    return[category,qualifyProjectCategory(rows,predictions,rows.map(r=>r.label))];
  }));
  const preflight={version:holdoutVersion,ready:true,deficits:[],categories:Object.fromEntries(projectRules.map(c=>[c,{families:12,classes:{'change-warranted':{contexts:30,families:12},contextual:{contexts:30,families:12}}}])),datasetHash:identity.holdoutHash,testPredictions:0,qualification:false};
  const result={version:holdoutVersion,categories,passingCategories:projectRules.filter(c=>categories[c].passed),passed:projectRules.every(c=>categories[c].passed),uniqueInputs:420,releaseStatus:'experimental',qualificationScope:'Controlled project applications only; release/runtime acceptance is still required.'};
  const categoryPolicy={version:'vylnt-project-candidate-v1',releaseStatus:'experimental',categories:Object.fromEntries(projectRules.map(c=>[c,{supported:true,calibration:{temperature:1},thresholds:{contextual:.2,change:.8},logisticCalibration:{temperature:1},logisticThresholds:{contextual:.2,change:.8}}]))};
  return{identity,preflight,result,modelJson,logistic:{mean:Array(flat).fill(0),scale:Array(flat).fill(1),weight:Array(flat).fill(0),bias:0},categoryPolicy};
}
it('stages passing categories only, disables failures and never enables a runtime',()=>{
  const f=releaseFixture(['CK-002']),stage=stageProjectRelease(f);
  expect(stage.stagedCategories).toHaveLength(6);expect(stage.runtimeEnabled).toBe(false);expect(stage.runtimeAcceptance).toBe('pending');
  expect(stage.runtimeCategoryPolicy.categories['CK-002']).toEqual({supported:false});expect(stage.categories).not.toHaveProperty('CK-002');
  const{releaseHash,...body}=stage;expect(releaseHash).toBe(holdoutHash(body));expect(JSON.stringify(stage)).not.toContain(sha('family0'));
  expect(stageProjectRelease(f)).toEqual(stage);expect(stage.identity).toEqual(f.identity);
});
it('rejects no passing categories, false gate flags and insufficient family/class coverage',()=>{
  expect(()=>stageProjectRelease(releaseFixture([...projectRules]))).toThrow(/No category/);
  const f=releaseFixture();f.result.categories['CK-001'].afterSafeguards.recall=.9;
  expect(()=>stageProjectRelease(f)).toThrow(/gate flags/);
  const counts=releaseFixture();counts.preflight.categories['HDR-001'].families=9;expect(()=>stageProjectRelease(counts)).toThrow(/counts/);
  const contexts=releaseFixture();contexts.preflight.categories['CK-003'].classes.contextual.contexts=29;expect(()=>stageProjectRelease(contexts)).toThrow(/counts/);
});
it('rejects tampered model/holdout, absent uncertainty, incompatible models and disabled policies',()=>{
  const f=releaseFixture();expect(()=>stageProjectRelease({...f,modelJson:f.modelJson+' '})).toThrow(/model bytes/);
  expect(()=>stageProjectRelease({...f,identity:{...f.identity,holdoutHash:sha('changed')}})).toThrow(/holdout/);
  const missing=releaseFixture();missing.result.categories['HDR-002'].afterSafeguards.precision95=null;expect(()=>stageProjectRelease(missing)).toThrow(/release gates/);
  const disabled=releaseFixture();disabled.categoryPolicy.categories['NET-001'].thresholds={contextual:0,change:1};expect(()=>stageProjectRelease(disabled)).toThrow(/validation policy/);
  const wrong=JSON.stringify({...JSON.parse(f.modelJson),hiddenSize:16});expect(()=>stageProjectRelease({...f,modelJson:wrong,identity:{...f.identity,modelHash:sha(wrong)}})).toThrow(/Incompatible/);
  const extra=JSON.stringify({...JSON.parse(f.modelJson),privateExamples:[]});expect(()=>stageProjectRelease({...f,modelJson:extra,identity:{...f.identity,modelHash:sha(extra)}})).toThrow(/metadata/);
});
it('recomputes critical and insufficient-evidence safety gates and refuses fabricated summaries',()=>{
  const f=releaseFixture();f.result.categories['CK-001'].modelOnly.highCriticalContextual=1;expect(()=>stageProjectRelease(f)).toThrow(/gate flags/);
  const unsafe=releaseFixture();unsafe.result.categories['HDR-003'].afterSafeguards.insufficientEvidenceContextual=1;expect(()=>stageProjectRelease(unsafe)).toThrow(/gate flags/);
  const summary=releaseFixture();summary.result.passingCategories=[];expect(()=>stageProjectRelease(summary)).toThrow(/summary/);
});

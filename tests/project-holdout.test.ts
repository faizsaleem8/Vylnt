import {expect,it} from 'vitest';
import {evidenceFeatureNames4,projectRules} from '../packages/core/project-evidence';
import {holdoutHash,inspectProjectHoldout,qualifyProjectCategory,holdoutMetrics,type HoldoutDataset,type HoldoutRow} from '../packages/ml/project-holdout';
const assignments=Object.fromEntries(Array.from({length:12},(_,i)=>[holdoutHash(['family',i]),'holdout']));
const policy={version:'vylnt-project-candidate-v1',releaseStatus:'experimental',categories:Object.fromEntries(projectRules.map(c=>[c,{supported:true,calibration:{temperature:1},thresholds:{contextual:.2,change:.8},logisticCalibration:{temperature:1},logisticThresholds:{contextual:.2,change:.8}}]))};
// Numeric mechanics fixtures only. Not independent applications or eligible data.
function dataset():HoldoutDataset{
  const examples:HoldoutRow[]=projectRules.flatMap(category=>Array.from({length:60},(_,i)=>{
    const sequence:HoldoutRow['sequence']=[evidenceFeatureNames4.map((_n,k)=>k<6?(i&(1<<k)?1:0):-1),evidenceFeatureNames4.map(n=>n.startsWith('rule_')?(n==='rule_'+category?1:0):-1)];
    return {category,family:Object.keys(assignments)[i%12],sequence,variant:holdoutHash(sequence),severity:'medium',label:i<30?'change-warranted':'contextual',uncertain:false,evidenceRequiresReview:false,contextualAllowed:true,evidenceRecord:'a'.repeat(64),scenario:'b'.repeat(64)};
  }));
  return {schemaVersion:'vylnt-evidence-v4',featureNames:[...evidenceFeatureNames4],sourceLockHash:'c'.repeat(64),examples};
}
it('recomputes all seven count/family gates without predicting',()=>{
  const complete=dataset();expect(inspectProjectHoldout(complete,assignments,{families:[],variants:[]},policy).ready).toBe(true);
  const empty=inspectProjectHoldout({...complete,examples:[]},assignments,{families:[],variants:[]},policy);
  expect(empty.ready).toBe(false);expect(empty.deficits).toHaveLength(21);expect(empty.testPredictions).toBe(0);
  const sparse=dataset();sparse.examples=sparse.examples.filter(r=>r.family===Object.keys(assignments)[0]);
  expect(inspectProjectHoldout(sparse,assignments,{families:[],variants:[]},policy).ready).toBe(false);
});
it('rejects previous family/input overlap, renamed partitions and repeated rows',()=>{
  const d=dataset(),first=d.examples[0];
  expect(()=>inspectProjectHoldout(d,assignments,{families:[first.family],variants:[]},policy)).toThrow(/exposed/);
  expect(()=>inspectProjectHoldout(d,assignments,{families:[],variants:[first.variant]},policy)).toThrow(/previous/);
  expect(()=>inspectProjectHoldout(d,{...assignments,[first.family]:'train'},{families:[],variants:[]},policy)).toThrow(/holdout source/);
  d.examples.push({...first});expect(()=>inspectProjectHoldout(d,assignments,{families:[],variants:[]},policy)).toThrow(/Repeated/);
});
it('rejects incompatible numbers/categories/features and disabled category policies',()=>{
  const d: {examples:{sequence:number[][]}[]}=dataset();d.examples[0].sequence[0][0]=2;expect(()=>inspectProjectHoldout(d,assignments,{families:[],variants:[]},policy)).toThrow();
  const wrong=dataset();wrong.examples[0].category='HDR-002';expect(()=>inspectProjectHoldout(wrong,assignments,{families:[],variants:[]},policy)).toThrow(/category/);
  expect(()=>inspectProjectHoldout({...dataset(),featureNames:['wrong']},assignments,{families:[],variants:[]},policy)).toThrow(/feature/);
  const disabled=structuredClone(policy);disabled.categories['CK-001'].thresholds={contextual:0,change:1};expect(inspectProjectHoldout(dataset(),assignments,{families:[],variants:[]},disabled).deficits.join()).toContain('CK-001');
  const incomplete=dataset();incomplete.examples[0].evidenceRequiresReview=true;incomplete.examples[0].contextualAllowed=false;
  expect(()=>inspectProjectHoldout(incomplete,assignments,{families:[],variants:[]},policy)).toThrow(/qualification counts/);
});
it('retains conflicts as uncertain audit rows without turning oracle labels into safeguards',()=>{
  const d=dataset(),first=d.examples[0];d.examples.push({...first,label:'contextual'});
  expect(()=>inspectProjectHoldout(d,assignments,{families:[],variants:[]},policy)).toThrow(/Conflicting/);
  first.uncertain=true;d.examples.at(-1)!.uncertain=true;expect(()=>inspectProjectHoldout(d,assignments,{families:[],variants:[]},policy)).not.toThrow();
  const unknown={...first,label:'needs-review' as const};
  const result=qualifyProjectCategory([unknown],['contextual'],['contextual']);
  expect(result.afterSafeguards.insufficientEvidenceContextual).toBe(1);expect(result.gates.noInsufficientEvidenceContextual).toBe(false);
});
it('applies original precision/recall/coverage/comparator gates and family uncertainty',()=>{
  const rows=dataset().examples.filter(r=>r.category==='HDR-001'),perfect=rows.map(r=>r.label);
  const result=qualifyProjectCategory(rows,perfect,perfect);expect(result.passed).toBe(true);
  expect(result.afterSafeguards.precision).toBe(1);expect(result.ruleOnly.precision).toBe(.5);
  expect(result.uncertainty.afterSafeguards.repetitions).toBe(1000);expect(result.afterSafeguards.precision95![0]).toBeLessThan(1);
  const abstain=qualifyProjectCategory(rows,rows.map(()=>'needs-review'),perfect);expect(abstain.gates.coverage).toBe(false);expect(abstain.gates.recall).toBe(false);
  expect(qualifyProjectCategory(rows,rows.map(()=>'change-warranted'),perfect).gates.ruleComparator).toBe(false);
});
it('cannot use high-severity safeguards to conceal an unsafe model-only proposal',()=>{
  const rows=dataset().examples.filter(r=>r.category==='HDR-001');rows[0].severity='high';
  const p=rows.map(r=>r.label);p[0]='contextual';const result=qualifyProjectCategory(rows,p,p);
  expect(result.modelOnly.highCriticalContextual).toBe(1);expect(result.afterSafeguards.highCriticalContextual).toBe(0);expect(result.gates.noHighCriticalContextual).toBe(false);
  rows[0].evidenceRequiresReview=true;rows[0].contextualAllowed=false;
  const guarded=qualifyProjectCategory(rows,p,p);expect(guarded.afterSafeguards.abstentions).toBeGreaterThan(0);
});
it('keeps abstentions in recall and coverage; unknown truths cannot improve known-label precision',()=>{
  const rows=dataset().examples.slice(0,2),m=holdoutMetrics(rows,['change-warranted','needs-review']);
  expect(m.recall).toBe(.5);expect(m.coverage).toBe(.5);expect(()=>holdoutMetrics(rows,[])).toThrow();
});
it('does not count repeated numeric contexts as independent metric examples or hide the highest severity',()=>{
  const rows=dataset().examples.filter(r=>r.category==='HDR-001'),repeated={...rows[0],family:holdoutHash('other-family'),severity:'critical' as const};
  const links=[...rows,repeated],predictions=links.map(r=>r.label);predictions[0]='contextual';predictions[predictions.length-1]='contextual';
  const result=qualifyProjectCategory(links,predictions,predictions);expect(result.applicationContextLinks).toBe(61);expect(result.metricContexts).toBe(60);expect(result.modelOnly.highCriticalContextual).toBe(1);expect(result.passed).toBe(false);
});

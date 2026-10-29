/** Fresh evidence-v4 qualification mechanics. No fitting or runtime promotion. */
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { canonicalJson } from '../core/integrity';
import { evidenceFeatureNames4, projectRules } from '../core/project-evidence';
import { projectCategoryDecision,projectCategoryPolicySchema,projectLstmLogit,projectLogisticLogit } from './project-candidate-runtime';
export {prepareProjectHoldout,projectHoldoutSourceLockSchema,projectSourceLockSchema} from './project-dataset';
export {evidenceFeatureNames4} from '../core/project-evidence';
export {projectCategoryPolicySchema} from './project-candidate-runtime';

export const holdoutVersion='vylnt-project-holdout-v1';
export const holdoutHash=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const rowSchema=z.object({family:digest,variant:digest,sequence:z.array(z.array(z.union([z.literal(-1),z.literal(0),z.literal(1)]))).min(2).max(74),
  category:z.enum(projectRules),severity:z.enum(['info','low','medium','high','critical']),label:z.enum(['change-warranted','contextual','needs-review']),
  uncertain:z.boolean(),evidenceRequiresReview:z.boolean(),contextualAllowed:z.boolean(),evidenceRecord:digest,scenario:digest}).strict();
export const holdoutDatasetSchema=z.object({schemaVersion:z.literal('vylnt-evidence-v4'),featureNames:z.array(z.string()),sourceLockHash:digest,examples:z.array(rowSchema).max(50000)}).strict();
export type HoldoutRow=z.infer<typeof rowSchema>;
export type HoldoutDataset=z.infer<typeof holdoutDatasetSchema>;
type State='change-warranted'|'contextual'|'needs-review';
const checkedState=(value:string):State=>{if(value==='change-warranted'||value==='contextual'||value==='needs-review')return value;throw Error('Invalid candidate decision');};
export function checkProjectModels(modelInput:unknown,logisticInput:unknown){
  const vector=z.array(z.number().finite()).max(74*256+1),matrix=z.array(vector).length(32);
  const model=z.object({featureNames:z.array(z.string()).min(1).max(256),weightInput:matrix,weightHidden:matrix,biasInput:vector,biasHidden:vector,outputWeight:vector,outputBias:z.number().finite()}).passthrough().parse(modelInput);
  const width=model.featureNames.length;
  if(model.weightInput.some(r=>r.length!==width)||model.weightHidden.some(r=>r.length!==8)||model.biasInput.length!==32||model.biasHidden.length!==32||model.outputWeight.length!==8||[...model.weightInput.flat(),...model.weightHidden.flat(),...model.biasInput,...model.biasHidden,...model.outputWeight].some(n=>Math.abs(n)>100))throw Error('Invalid LSTM numeric shape');
  const logistic=z.object({mean:vector,scale:vector,weight:vector,bias:z.number().finite()}).strict().parse(logisticInput);
  if([logistic.mean,logistic.scale,logistic.weight].some(r=>r.length!==74*width+1)||logistic.scale.some(n=>n<=0))throw Error('Invalid logistic numeric shape');
  return {model,logistic};
}

export function checkDevelopmentReadiness(input:unknown,splitInput:unknown){
  const row=rowSchema.omit({contextualAllowed:true,evidenceRequiresReview:true});
  const data=holdoutDatasetSchema.extend({examples:z.array(row).max(50000)}).parse(input);
  const split=z.object({version:z.literal('vylnt-project-development-split-v1'),sourceLockHash:digest,families:z.record(digest,z.enum(['train','validation']))}).strict().parse(splitInput);
  if(holdoutHash(data.featureNames)!==holdoutHash(evidenceFeatureNames4)||data.sourceLockHash!==split.sourceLockHash||Object.values(split.families).filter(p=>p==='train').length!==8||Object.values(split.families).filter(p=>p==='validation').length!==4)throw Error('Invalid development feature/family split');
  const groups=new Map<string,typeof data.examples>();
  for(const r of data.examples){if(!split.families[r.family]||r.variant!==holdoutHash(r.sequence)||r.sequence.some(s=>s.length!==data.featureNames.length))throw Error('Invalid development numeric binding');const g=groups.get(r.variant)??[];g.push(r);groups.set(r.variant,g);}
  const eligible=[...groups.values()].filter(g=>new Set(g.map(r=>r.label)).size===1&&g.every(r=>!r.uncertain&&r.label!=='needs-review')&&new Set(g.map(r=>split.families[r.family])).size===1).flat();
  for(const c of projectRules)for(const part of ['train','validation'])for(const label of ['change-warranted','contextual']){
    const rows=eligible.filter(r=>r.category===c&&split.families[r.family]===part&&r.label===label);
    if(new Set(rows.map(r=>r.variant)).size<(part==='train'?30:15)||new Set(rows.map(r=>r.family)).size<3)throw Error(`Development data not ready: ${c}/${part}/${label}`);
  }
}

/** Independent count recomputation; an audit's ready flag is never sufficient. */
export function inspectProjectHoldout(input:unknown,assignments:Record<string,string>,exposure:{families:string[];variants:string[]},policyInput:unknown){
  const data=holdoutDatasetSchema.parse(input),policy=projectCategoryPolicySchema.parse(policyInput);
  if(canonicalJson(data.featureNames)!==canonicalJson(evidenceFeatureNames4))throw Error('Holdout feature contract changed');
  if(Object.values(assignments).some(p=>p!=='holdout')||Object.keys(assignments).length!==12)throw Error('Expected twelve frozen holdout source families');
  if(Object.keys(assignments).some(f=>exposure.families.includes(f)))throw Error('Previously exposed family in holdout');
  const seen=new Set<string>(),groups=new Map<string,HoldoutRow[]>();
  for(const row of data.examples){
    if(assignments[row.family]!=='holdout'||exposure.families.includes(row.family)||exposure.variants.includes(row.variant))throw Error('Holdout contains previous or unregistered evidence');
    if(row.variant!==holdoutHash(row.sequence)||row.sequence.some(step=>step.length!==data.featureNames.length))throw Error('Holdout numeric variant changed');
    const last=row.sequence.at(-1)!;
    if(projectRules.some(category=>last[data.featureNames.indexOf('rule_'+category)]!==Number(category===row.category)))throw Error('Holdout category/input mismatch');
    const identity=canonicalJson([row.family,row.variant,row.label]);if(seen.has(identity))throw Error('Repeated holdout row');seen.add(identity);
    const members=groups.get(row.variant)??[];members.push(row);groups.set(row.variant,members);
    if(row.evidenceRequiresReview&&row.contextualAllowed)throw Error('Incomplete evidence cannot authorize contextual de-emphasis');
    if(row.evidenceRequiresReview&&!row.uncertain)throw Error('Incomplete evidence cannot satisfy qualification counts');
  }
  for(const members of groups.values())if((new Set(members.map(r=>r.label)).size>1||members.some(r=>r.uncertain||r.label==='needs-review'))&&members.some(r=>!r.uncertain))throw Error('Conflicting holdout input must remain uncertain in the audit');
  const deficits:string[]=[];
  const categories=Object.fromEntries(projectRules.map(category=>{
    const rows=data.examples.filter(r=>r.category===category&&!r.uncertain&&r.label!=='needs-review');
    const families=new Set(rows.map(r=>r.family)).size;
    if(families<10)deficits.push(`${category}: ${families}/10 eligible families`);
    const classes=Object.fromEntries((['change-warranted','contextual'] as const).map(label=>{
      const selected=rows.filter(r=>r.label===label),contexts=new Set(selected.map(r=>r.variant)).size,classFamilies=new Set(selected.map(r=>r.family)).size;
      if(contexts<30||classFamilies<3)deficits.push(`${category}/${label}: ${contexts}/30 distinct contexts, ${classFamilies}/3 families`);
      return[label,{contexts,families:classFamilies}];
    }));
    const entry=policy.categories[category];
    if(!entry?.supported||entry.thresholds.contextual===0&&entry.thresholds.change===1)deficits.push(`${category}: no validation-selected candidate policy`);
    return[category,{families,classes}];
  }));
  return {version:holdoutVersion,ready:!deficits.length,deficits,categories,datasetHash:holdoutHash(data),testPredictions:0,qualification:false};
}

function wilson(success:number,total:number){
  if(!total)return null;const z=1.959963984540054,p=success/total,d=1+z*z/total;
  const centre=(p+z*z/(2*total))/d,half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
  return [Math.max(0,centre-half),Math.min(1,centre+half)];
}
export function holdoutMetrics(rows:HoldoutRow[],predictions:State[]){
  if(rows.length!==predictions.length||predictions.some(p=>!['change-warranted','contextual','needs-review'].includes(p)))throw Error('Invalid predictions');
  let tp=0,fp=0,positive=0,known=0,contextualMistakes=0,insufficient=0,high=0;
  rows.forEach((row,i)=>{
    const p=predictions[i],labelled=!row.uncertain&&row.label!=='needs-review';known+=Number(p!=='needs-review');
    if(labelled){positive+=Number(row.label==='change-warranted');tp+=Number(row.label==='change-warranted'&&p==='change-warranted');fp+=Number(row.label==='contextual'&&p==='change-warranted');}
    contextualMistakes+=Number(row.label==='change-warranted'&&p==='contextual');
    insufficient+=Number((row.uncertain||row.label==='needs-review')&&p==='contextual');
    high+=Number(row.label==='change-warranted'&&['high','critical'].includes(row.severity)&&p==='contextual');
  });
  return {precision:tp+fp?tp/(tp+fp):null,recall:positive?tp/positive:null,coverage:rows.length?known/rows.length:0,abstentions:rows.length-known,
    contextualMisclassification:contextualMistakes,insufficientEvidenceContextual:insufficient,highCriticalContextual:high,
    precision95:wilson(tp,tp+fp),recall95:wilson(tp,positive),coverage95:wilson(known,rows.length),
    labelledExamples:rows.filter(r=>!r.uncertain&&r.label!=='needs-review').length,totalExamples:rows.length};
}
function familyIntervals(rows:HoldoutRow[],predictions:State[]){
  const families=[...new Set(rows.map(r=>r.family))].sort();
  const grouped=new Map(families.map(f=>[f,[0,0,0,0,0]]));
  rows.forEach((r,i)=>{const counts=grouped.get(r.family)!,p=predictions[i],labelled=!r.uncertain&&r.label!=='needs-review';
    counts[0]+=Number(labelled&&r.label==='change-warranted'&&p==='change-warranted');counts[1]+=Number(labelled&&r.label==='contextual'&&p==='change-warranted');counts[2]+=Number(labelled&&r.label==='change-warranted');counts[3]+=Number(p!=='needs-review');counts[4]++;
  });
  const groups=families.map(f=>grouped.get(f)!);
  let seed=42;const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const samples:{precision:number[];recall:number[];coverage:number[]}={precision:[],recall:[],coverage:[]};
  for(let repeat=0;repeat<1000;repeat++){
    const total=[0,0,0,0,0];for(let draw=0;draw<families.length;draw++){const sample=groups[Math.floor(random()*families.length)];sample.forEach((n,j)=>{total[j]+=n;});}
    const [tp,fp,positive,known,count]=total,m={precision:tp+fp?tp/(tp+fp):null,recall:positive?tp/positive:null,coverage:count?known/count:0};
    for(const key of ['precision','recall','coverage'] as const)if(m[key]!==null)samples[key].push(m[key]!);
  }
  return {method:'family-cluster-percentile-bootstrap',seed:42,repetitions:1000,intervals:Object.fromEntries(Object.entries(samples).map(([key,values])=>{
    values.sort((a,b)=>a-b);return[key,values.length?[values[Math.floor(.025*(values.length-1))],values[Math.ceil(.975*(values.length-1))]]:null];
  }))};
}
export function qualifyProjectCategory(rows:HoldoutRow[],raw:State[],logistic:State[]){
  // Guards use only independently extracted evidence/severity, never test labels
  // or label-conflict audit results. An uncertain oracle cannot repair predictions.
  const guard=(r:HoldoutRow,p:State):State=>r.evidenceRequiresReview||p==='contextual'&&(!r.contextualAllowed||['high','critical'].includes(r.severity))?'needs-review':p;
  const links=rows,linkRaw=raw,linkLogistic=logistic,unique=new Map<string,{row:HoldoutRow;raw:State;logistic:State}>();
  const severity={info:0,low:1,medium:2,high:3,critical:4};
  rows.forEach((row,i)=>{
    const key=canonicalJson([row.variant,row.label,row.uncertain]),previous=unique.get(key);
    if(!previous){unique.set(key,{row:{...row},raw:raw[i],logistic:logistic[i]});return;}
    if(previous.raw!==raw[i]||previous.logistic!==logistic[i])throw Error('One numeric variant cannot have different model predictions');
    if(severity[row.severity]>severity[previous.row.severity])previous.row.severity=row.severity;
    previous.row.evidenceRequiresReview ||= row.evidenceRequiresReview;previous.row.contextualAllowed &&= row.contextualAllowed;
  });
  rows=[...unique.values()].map(v=>v.row);raw=[...unique.values()].map(v=>v.raw);logistic=[...unique.values()].map(v=>v.logistic);
  const safe=raw.map((p,i)=>guard(rows[i],p)),safeLogistic=logistic.map((p,i)=>guard(rows[i],p));
  const baseline:State[]=rows.map(()=>'change-warranted'),modelOnly=holdoutMetrics(rows,raw),afterSafeguards=holdoutMetrics(rows,safe),ruleOnly=holdoutMetrics(rows,baseline);
  const gates={precision:(afterSafeguards.precision??0)>=.9,recall:(afterSafeguards.recall??0)>=.95,coverage:afterSafeguards.coverage>=.5,
    noHighCriticalContextual:modelOnly.highCriticalContextual===0,noInsufficientEvidenceContextual:afterSafeguards.insufficientEvidenceContextual===0,
    ruleComparator:(afterSafeguards.precision??0)>(ruleOnly.precision??0)&&(afterSafeguards.recall??0)>=(ruleOnly.recall??0)-.05};
  return {modelOnly,afterSafeguards,logistic:{modelOnly:holdoutMetrics(rows,logistic),afterSafeguards:holdoutMetrics(rows,safeLogistic)},ruleOnly,gates,passed:Object.values(gates).every(Boolean),applicationContextLinks:links.length,metricContexts:rows.length,
    uncertainty:{modelOnly:familyIntervals(links,linkRaw),afterSafeguards:familyIntervals(links,linkRaw.map((p,i)=>guard(links[i],p))),logisticModelOnly:familyIntervals(links,linkLogistic),logisticAfterSafeguards:familyIntervals(links,linkLogistic.map((p,i)=>guard(links[i],p))),ruleOnly:familyIntervals(links,links.map(()=>'change-warranted'))}};
}
/** Caller must persist an exclusive consumption marker before calling this. */
export function evaluateProjectHoldout(data:HoldoutDataset,model:Parameters<typeof projectLstmLogit>[0],logistic:Parameters<typeof projectLogisticLogit>[0],policyInput:unknown){
  const policy=projectCategoryPolicySchema.parse(policyInput),predictions=new Map<string,{lstm:State;logistic:State}>();
  for(const row of data.examples)if(!predictions.has(row.variant))predictions.set(row.variant,{
    lstm:checkedState(projectCategoryDecision(projectLstmLogit(model,row.sequence),row.category,policy).state),
    logistic:checkedState(projectCategoryDecision(projectLogisticLogit(logistic,row.sequence,data.featureNames.length),row.category,policy,true).state)});
  const categories=Object.fromEntries(projectRules.map(category=>{
    const rows=data.examples.filter(r=>r.category===category);return[category,qualifyProjectCategory(rows,rows.map(r=>predictions.get(r.variant)!.lstm),rows.map(r=>predictions.get(r.variant)!.logistic))];
  }));
  return {version:holdoutVersion,categories,passingCategories:projectRules.filter(c=>categories[c].passed),passed:projectRules.every(c=>categories[c].passed),
    uniqueInputs:predictions.size,releaseStatus:'experimental',qualificationScope:'Controlled project applications only; release/runtime acceptance is still required.'};
}
export {readNativeProjectExposures,assertFreshNativeSources} from './project-source-exposure';

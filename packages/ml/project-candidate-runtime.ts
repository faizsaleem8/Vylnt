/** Experimental candidate inspection only. Not an active assessment classifier. */
import { z } from 'zod';
import { projectRules } from '../core/project-evidence';
const finite=z.number().finite();
const calibration=z.object({temperature:finite.min(.05).max(20)}).strict();
const thresholds=z.object({contextual:finite.min(0).lt(.5),change:finite.gt(.5).max(1)}).strict();
export const projectCategoryPolicySchema=z.object({version:z.literal('vylnt-project-candidate-v1'),releaseStatus:z.literal('experimental'),
  categories:z.partialRecord(z.enum(projectRules),z.discriminatedUnion('supported',[
    z.object({supported:z.literal(false)}).strict(),
    z.object({supported:z.literal(true),calibration,thresholds,logisticCalibration:calibration,logisticThresholds:thresholds}).strict(),
  ]))}).strict();
export type ProjectCategoryPolicy=z.infer<typeof projectCategoryPolicySchema>;
type NumericLstm={featureNames:readonly string[];weightInput:number[][];weightHidden:number[][];biasInput:number[];biasHidden:number[];outputWeight:number[];outputBias:number};
export function checkedProjectSequence(sequence:number[][],width:number){
  if(!Number.isInteger(width)||width<1||width>256||sequence.length<2||sequence.length>74||sequence.some(step=>step.length!==width||step.some(n=>![-1,0,1].includes(n))))throw Error('Invalid project sequence');
}
const sigmoid=(x:number)=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
/** Retains logits for temperature scaling: recovering logits from a saturated
 * sigmoid would lose information. Archived numeric kernels stay unchanged. */
export function projectLstmLogit(model:NumericLstm,sequence:number[][]){
  checkedProjectSequence(sequence,model.featureNames.length);
  const vector=(row:number[],width:number)=>Array.isArray(row)&&row.length===width&&row.every(n=>Number.isFinite(n)&&Math.abs(n)<=100);
  if(!Array.isArray(model.weightInput)||model.weightInput.length!==32||!model.weightInput.every(row=>vector(row,model.featureNames.length))||!Array.isArray(model.weightHidden)||model.weightHidden.length!==32||!model.weightHidden.every(row=>vector(row,8))||!vector(model.biasInput,32)||!vector(model.biasHidden,32)||!vector(model.outputWeight,8)||!Number.isFinite(model.outputBias))throw Error('Invalid project LSTM shape');
  let hidden=Array<number>(8).fill(0),cell=Array<number>(8).fill(0);
  for(const input of sequence){
    const gates=model.weightInput.map((weights,k)=>weights.reduce((sum,w,j)=>sum+w*input[j],model.biasInput[k]+model.biasHidden[k])+model.weightHidden[k].reduce((sum,w,j)=>sum+w*hidden[j],0));
    cell=cell.map((value,j)=>sigmoid(gates[8+j])*value+sigmoid(gates[j])*Math.tanh(gates[16+j]));
    hidden=cell.map((value,j)=>sigmoid(gates[24+j])*Math.tanh(value));
  }
  const value=model.outputWeight.reduce((sum,w,j)=>sum+w*hidden[j],model.outputBias);
  if(!Number.isFinite(value))throw Error('Invalid project LSTM calculation');return value;
}
export function projectLogisticLogit(model:{mean:number[];scale:number[];weight:number[];bias:number},sequence:number[][],width:number){
  checkedProjectSequence(sequence,width);
  const values=sequence.flat();while(values.length<74*width)values.push(-1);values.push(sequence.length/74);
  if(![model.mean,model.scale,model.weight].every(row=>row.length===values.length&&row.every(Number.isFinite))||!model.scale.every(n=>n>0)||!Number.isFinite(model.bias))throw Error('Invalid project logistic model');
  const result=values.reduce((sum,value,i)=>sum+(value-model.mean[i])/model.scale[i]*model.weight[i],model.bias);
  if(!Number.isFinite(result))throw Error('Invalid project logistic calculation');return result;
}
export function projectCategoryDecision(logit:number,category:string,policy:ProjectCategoryPolicy,logistic=false){
  const entry=policy.categories[category as typeof projectRules[number]];
  if(!entry?.supported||!Number.isFinite(logit))return {score:null,state:'needs-review' as const};
  const {temperature}=logistic?entry.logisticCalibration:entry.calibration;
  const limits=logistic?entry.logisticThresholds:entry.thresholds;
  const score=sigmoid(Math.max(-40,Math.min(40,logit/temperature)));
  const state=limits.contextual===0&&limits.change===1?'needs-review':score>=limits.change?'change-warranted':score<=limits.contextual?'contextual':'needs-review';
  return {score,state};
}

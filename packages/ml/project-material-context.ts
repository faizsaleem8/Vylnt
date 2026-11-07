import {createHash} from 'node:crypto';
import {z} from 'zod';
import {canonicalJson} from '../core/integrity';
import {evidenceFeatureNames4,projectRules} from '../core/project-evidence';

const names=z.array(z.string().min(1)).min(1).max(100);
export const materialPolicySchema=z.object({
  version:z.literal('vylnt-native-material-context-v1'),
  common:names,
  categories:z.record(z.enum(projectRules),names),
}).strict().superRefine((policy,context)=>{
  if(projectRules.some(rule=>!policy.categories[rule]))context.addIssue({code:'custom',message:'Missing material category'});
  for(const columns of [policy.common,...Object.values(policy.categories)]){
    if(new Set(columns).size!==columns.length||columns.some(name=>!(evidenceFeatureNames4 as readonly string[]).includes(name))){
      context.addIssue({code:'custom',message:'Invalid material feature projection'});
    }
  }
});
export type MaterialPolicy=z.infer<typeof materialPolicySchema>;
export function materialVariant(sequence:number[][],category:typeof projectRules[number],policy:MaterialPolicy){
  const target=sequence.at(-1);
  if(!target||target.length!==evidenceFeatureNames4.length||target[evidenceFeatureNames4.indexOf('target')]!==1||
    target[(evidenceFeatureNames4 as readonly string[]).indexOf('rule_'+category)]!==1)throw Error('Material projection needs the bound category target row');
  const columns=[...policy.common,...policy.categories[category]];
  const values=columns.map(name=>target[(evidenceFeatureNames4 as readonly string[]).indexOf(name)]);
  if(values.some(value=>![-1,0,1].includes(value)))throw Error('Unsupported material feature value');
  return createHash('sha256').update(canonicalJson([category,values])).digest('hex');
}

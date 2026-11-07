import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {canonicalJson} from '../packages/core/integrity';
import {evidenceFeatureNames4} from '../packages/core/project-evidence';
import {materialPolicySchema,materialVariant} from '../packages/ml/project-material-context';
const policy=materialPolicySchema.parse(JSON.parse(await readFile('ml/project_material_policy.json','utf8')));
function sample(){
  const target=evidenceFeatureNames4.map(()=>-1);
  target[evidenceFeatureNames4.indexOf('target')]=1;
  target[evidenceFeatureNames4.indexOf('rule_CK-001')]=1;
  target[evidenceFeatureNames4.indexOf('secure')]=0;
  return [evidenceFeatureNames4.map(()=>-1),target];
}
it('ignores unrelated headers and background rows when counting cookie cases',()=>{
  const first=sample(),second=structuredClone(first);
  second[0][0]=1;second[1][evidenceFeatureNames4.indexOf('cspPresent')]=1;
  expect(materialVariant(first,'CK-001',policy)).toBe(materialVariant(second,'CK-001',policy));
  second[1][evidenceFeatureNames4.indexOf('httpOnly')]=1;
  expect(materialVariant(first,'CK-001',policy)).not.toBe(materialVariant(second,'CK-001',policy));
});
it('uses the same explicit category/value hash contract as Python',()=>{
  const sequence=sample(),target=sequence[1];
  const values=[...policy.common,...policy.categories['CK-001']].map(name=>target[evidenceFeatureNames4.indexOf(name)]);
  const expected=createHash('sha256').update(canonicalJson(['CK-001',values])).digest('hex');
  expect(materialVariant(sequence,'CK-001',policy)).toBe(expected);
  const python=spawnSync(process.env.VYLNT_PYTHON??'python',['-B','-c',
    'import json,sys; sys.path.insert(0,"ml"); import project_material as m; v=json.load(sys.stdin); print(m.material_variant(v["row"],v["features"],v["policy"]))'],
    {input:JSON.stringify({row:{sequence,category:'CK-001'},features:evidenceFeatureNames4,policy}),encoding:'utf8',windowsHide:true,timeout:10000});
  expect(python.status,python.stderr).toBe(0);expect(python.stdout.trim()).toBe(expected);
  expect(()=>materialVariant(sequence,'CK-002',policy)).toThrow('category target');
});
it('refuses identity fields and incomplete category projections',()=>{
  const changed=structuredClone(policy);changed.categories['CK-001'].push('cookieName');
  expect(()=>materialPolicySchema.parse(changed)).toThrow();
  const missing=structuredClone(policy);delete (missing.categories as Partial<typeof missing.categories>)['HDR-001'];
  expect(()=>materialPolicySchema.parse(missing)).toThrow();
});

import { describe,it,expect } from 'vitest';
import { projectCategoryPolicySchema,projectCategoryDecision,projectLogisticLogit,projectLstmLogit } from '../packages/ml/project-candidate-runtime';
const policy=()=>projectCategoryPolicySchema.parse({version:'vylnt-project-candidate-v1',releaseStatus:'experimental',categories:{'HDR-001':{supported:true,calibration:{temperature:2},thresholds:{contextual:.2,change:.8},logisticCalibration:{temperature:1},logisticThresholds:{contextual:.1,change:.9}}}});
describe('experimental project candidate decisions',()=>{
  it('calibrates logits with separate model policies and preserves uncertainty',()=>{
    expect(projectCategoryDecision(0,'HDR-001',policy()).state).toBe('needs-review');
    expect(projectCategoryDecision(4,'HDR-001',policy()).state).toBe('change-warranted');
    expect(projectCategoryDecision(-4,'HDR-001',policy()).state).toBe('contextual');
    expect(projectCategoryDecision(2.5,'HDR-001',policy()).state).toBe('needs-review');
    expect(projectCategoryDecision(2.5,'HDR-001',policy(),true).state).toBe('change-warranted');
    for(const category of ['CK-002','JS-002','unknown'])expect(projectCategoryDecision(1000,category,policy()).state).toBe('needs-review');
    expect(projectCategoryDecision(NaN,'HDR-001',policy()).state).toBe('needs-review');
  });
  it('keeps the disabled policy disabled even at saturated scores and rejects malformed policies',()=>{
    const p=policy(),entry=p.categories['HDR-001'];if(entry?.supported)entry.thresholds={contextual:0,change:1};
    expect(projectCategoryDecision(1000,'HDR-001',p).state).toBe('needs-review');
    expect(projectCategoryDecision(-1000,'HDR-001',p).state).toBe('needs-review');
    const bad=policy();if(bad.categories['HDR-001']?.supported)bad.categories['HDR-001'].calibration.temperature=0;
    expect(()=>projectCategoryPolicySchema.parse(bad)).toThrow();
    expect(()=>projectCategoryPolicySchema.parse({...policy(),releaseStatus:'qualified'})).toThrow();
  });
  it('uses the complete ordered padded sequence for logistic inference',()=>{
    const width=2,size=74*width+1,model={mean:Array(size).fill(0),scale:Array(size).fill(1),weight:Array(size).fill(0),bias:2};
    model.weight[0]=3;model.weight[4]=4;model.weight[size-1]=74;
    expect(projectLogisticLogit(model,[[1,0],[0,1]],width)).toBe(3); // 2+3-4+2
    expect(()=>projectLogisticLogit({...model,scale:Array(size).fill(0)},[[1,0],[0,1]],width)).toThrow();
    expect(()=>projectLogisticLogit(model,[[1,2],[0,1]],width)).toThrow();
  });
  it('retains large LSTM logits rather than inverting saturated probabilities',()=>{
    const model={featureNames:['x'],weightInput:Array.from({length:32},()=>[0]),weightHidden:Array.from({length:32},()=>Array(8).fill(0)),biasInput:Array(32).fill(0),biasHidden:Array(32).fill(0),outputWeight:Array(8).fill(0),outputBias:25};
    expect(projectLstmLogit(model,[[0],[1]])).toBe(25);
    expect(()=>projectLstmLogit({...model,outputWeight:[]},[[0],[1]])).toThrow();
    expect(projectCategoryDecision(25,'HDR-001',policy()).score).toBeLessThan(1);
  });
});

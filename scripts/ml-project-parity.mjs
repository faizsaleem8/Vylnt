// Numeric developer parity only. This never qualifies/promotes a category.
import { build } from 'esbuild';
import { readFile,writeFile,realpath } from 'node:fs/promises';
import { resolve,sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const privateRoot=await realpath('.local'),root=await realpath(resolve(process.argv[2]??''));
if(!root.startsWith(privateRoot+sep))throw Error('Candidate must be private under .local');
const hash=value=>createHash('sha256').update(value).digest('hex');
async function json(name,limit=2*1024*1024){const bytes=await readFile(resolve(root,name));if(bytes.length>limit)throw Error('Parity input too large');return {bytes,value:JSON.parse(bytes)};}
const candidate=await json('candidate.json'),model=await json('model.json',128*1024),parity=await json('parity.json');
const expectedFiles=['registration.json','model.json','logistic.json','category-policy.json','parity.json','training.json'].sort();
if(candidate.value.version!=='vylnt-project-candidate-v1'||candidate.value.releaseStatus!=='experimental'||candidate.value.qualification!==false||JSON.stringify(Object.keys(candidate.value.files??{}).sort())!==JSON.stringify(expectedFiles))throw Error('Invalid candidate manifest');
for(const [name,expected] of Object.entries(candidate.value.files??{})){
  if(!['registration.json','model.json','logistic.json','category-policy.json','parity.json','training.json'].includes(name))throw Error('Unexpected candidate file');
  if(hash((await json(name)).bytes)!==expected)throw Error('Candidate file changed');
}
const m=model.value;
if(m.schemaVersion!=='vylnt-evidence-v4'||m.hiddenSize!==8||m.maxSteps!==74||m.releaseStatus!=='experimental'||!Array.isArray(m.featureNames)||m.featureNames.length>256||!m.featureNames.length)throw Error('Invalid experimental model');
const vector=(value,size)=>Array.isArray(value)&&value.length===size&&value.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100);
if(!Array.isArray(m.weightInput)||m.weightInput.length!==32||!m.weightInput.every(row=>vector(row,m.featureNames.length))||!Array.isArray(m.weightHidden)||m.weightHidden.length!==32||!m.weightHidden.every(row=>vector(row,8))||!vector(m.biasInput,32)||!vector(m.biasHidden,32)||!vector(m.outputWeight,8)||!Number.isFinite(m.outputBias))throw Error('Invalid numeric model shape');
const modulePath=resolve('.local/project-numeric-parity.mjs');
await build({entryPoints:['packages/core/ml-lstm.ts'],outfile:modulePath,bundle:true,format:'esm',platform:'node',packages:'external'});
const {predictSequence}=await import(pathToFileURL(modulePath).href);
const decisionPath=resolve('.local/project-decision-parity.mjs');
await build({entryPoints:['packages/ml/project-candidate-runtime.ts'],outfile:decisionPath,bundle:true,format:'esm',platform:'node',packages:'external'});
const runtime=await import(pathToFileURL(decisionPath).href);
const logistic=(await json('logistic.json')).value;
const policy=runtime.projectCategoryPolicySchema.parse((await json('category-policy.json')).value);
if(!Array.isArray(parity.value.cases)||!parity.value.cases.length||parity.value.cases.length>56||parity.value.tolerance!==1e-6)throw Error('Invalid parity fixtures');
let maximumError=0;
const version2=parity.value.version===2;
let decisionCases=0;
function compare(entry,result){
  for(const name of ['lstmLogit','logisticLogit','lstmScore','logisticScore']){
    if(!Number.isFinite(entry[name])||!Number.isFinite(result[name]))throw Error('Missing or invalid decision parity value');
    const error=Math.abs(entry[name]-result[name]);maximumError=Math.max(maximumError,error);if(error>1e-6)throw Error('Calibrated/logistic parity failed');
  }
  if(entry.lstmDecision!==result.lstmDecision||entry.logisticDecision!==result.logisticDecision)throw Error('Category decision parity failed');
}
function compute(entry){
  const lstmLogit=runtime.projectLstmLogit(m,entry.sequence),logisticLogit=runtime.projectLogisticLogit(logistic,entry.sequence,m.featureNames.length);
  const lstm=runtime.projectCategoryDecision(lstmLogit,entry.category,policy),lr=runtime.projectCategoryDecision(logisticLogit,entry.category,policy,true);
  return {lstmLogit,logisticLogit,lstmScore:lstm.score,logisticScore:lr.score,lstmDecision:lstm.state,logisticDecision:lr.state};
}
function compareContract(entry,result){
  for(const name of ['lstm','logistic']){
    if(result[name].state!==entry[name].state)throw Error('Decision contract state differs');
    if(entry[name].score===null){if(result[name].score!==null)throw Error('Unsupported category gained a score');}
    else if(!Number.isFinite(result[name].score)||Math.abs(entry[name].score-result[name].score)>1e-6)throw Error('Decision contract score differs');
  }
}
const contracts=parity.value.contractCases??[];
if(!Array.isArray(contracts)||contracts.length>128)throw Error('Invalid decision contract fixtures');
const contractPolicy=contracts.length?runtime.projectCategoryPolicySchema.parse(parity.value.contractPolicy):null;
for(const entry of contracts){
  if(!Number.isFinite(entry.logit)||typeof entry.disabled!=='boolean')throw Error('Invalid decision contract');
  const p=structuredClone(contractPolicy);
  if(entry.disabled){p.categories['HDR-001'].thresholds={contextual:0,change:1};p.categories['HDR-001'].logisticThresholds={contextual:0,change:1};}
  compareContract(entry,{lstm:runtime.projectCategoryDecision(entry.logit,entry.category,p),logistic:runtime.projectCategoryDecision(entry.logit,entry.category,p,true)});
}
for(const entry of parity.value.cases){
  if(!Array.isArray(entry.sequence)||entry.sequence.length<2||entry.sequence.length>74||!entry.sequence.every(step=>vector(step,m.featureNames.length)&&step.every(n=>[-1,0,1].includes(n)))||!Number.isFinite(entry.rawScore))throw Error('Invalid parity case');
  const error=Math.abs(predictSequence(m,entry.sequence)-entry.rawScore);maximumError=Math.max(maximumError,error);
  if(error>1e-6)throw Error('Python/JavaScript parity failed');
  if(version2){compare(entry,compute(entry));decisionCases++;}
}
let browserName='node';
if(process.argv.length>3){
  if(process.argv[3]!=='--browser'||!['chromium','msedge'].includes(process.argv[4])||process.argv.length!==5)throw Error('Use --browser chromium or msedge');
  if(!version2)throw Error('Browser decision parity requires version 2 fixtures');
  browserName=process.argv[4];
  process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.local/browsers');
  const {chromium}=await import('playwright');const browser=await chromium.launch({channel:browserName,headless:true});
  try{
    const page=await browser.newPage();await page.route('**/*',route=>route.abort());
    const compiled=await build({entryPoints:['packages/ml/project-candidate-runtime.ts'],bundle:true,write:false,format:'iife',globalName:'VylntCandidate',platform:'browser'});
    await page.addScriptTag({content:compiled.outputFiles[0].text});
    const results=await page.evaluate(({model,logistic,policy,cases,contracts,contractPolicy})=>{
      const runtime=globalThis.VylntCandidate,p=runtime.projectCategoryPolicySchema.parse(policy);
      const modelCases=cases.map(entry=>{
        const lstmLogit=runtime.projectLstmLogit(model,entry.sequence),logisticLogit=runtime.projectLogisticLogit(logistic,entry.sequence,model.featureNames.length);
        const lstm=runtime.projectCategoryDecision(lstmLogit,entry.category,p),lr=runtime.projectCategoryDecision(logisticLogit,entry.category,p,true);
        return {lstmLogit,logisticLogit,lstmScore:lstm.score,logisticScore:lr.score,lstmDecision:lstm.state,logisticDecision:lr.state};
      });
      const contractResults=contracts.map(entry=>{
        const p=runtime.projectCategoryPolicySchema.parse(contractPolicy);
        if(entry.disabled){p.categories['HDR-001'].thresholds={contextual:0,change:1};p.categories['HDR-001'].logisticThresholds={contextual:0,change:1};}
        return {lstm:runtime.projectCategoryDecision(entry.logit,entry.category,p),logistic:runtime.projectCategoryDecision(entry.logit,entry.category,p,true)};
      });
      return {modelCases,contractResults};
    },{model:m,logistic,policy,cases:parity.value.cases,contracts,contractPolicy});
    results.modelCases.forEach((result,i)=>compare(parity.value.cases[i],result));
    results.contractResults.forEach((result,i)=>compareContract(contracts[i],result));
  }finally{await browser.close();}
}
const filename=browserName==='node'?'javascript-parity.json':`javascript-parity-${browserName}.json`;
await writeFile(resolve(root,filename),JSON.stringify({version:2,environment:browserName,candidateHash:hash(candidate.bytes),modelHash:hash(model.bytes),runtimeHash:hash(await readFile('packages/core/ml-lstm.ts')),decisionRuntimeHash:hash(await readFile('packages/ml/project-candidate-runtime.ts')),cases:parity.value.cases.length,decisionCases,contractCasesChecked:contracts.length,logisticChecked:version2,categoryDecisionsChecked:version2,maximumError,tolerance:1e-6,passed:true,qualification:false},null,2),{flag:'wx'});
console.log(`Project candidate parity passed (${browserName}; category decisions: ${version2}). No category qualified.`);

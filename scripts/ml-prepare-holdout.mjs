// Developer-owned external holdout preparation. Never fits or invokes a model.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const { values } = parseArgs({options:Object.fromEntries(['source-lock','runs','exposure','history-manifest','history-dataset','source-audit','output'].map(k=>[k,{type:'string'}]))});
if(Object.keys(values).length!==7) throw Error('Use --source-lock --runs <comma-separated completed directories> --exposure --history-manifest --history-dataset --source-audit --output <new private directory>');
const json=async p=>JSON.parse(await readFile(p,'utf8')), sha=x=>createHash('sha256').update(x).digest('hex');
const root=resolve(values.output), bundle=resolve(`.local/holdout-preparation-${randomUUID()}.mjs`);
await build({stdin:{contents:"export * from './packages/ml/application-corpus'; export { prepareInsightData, assertPrivateMlPath } from './packages/ml/prepare-insight-data'; export { canonicalJson } from './packages/core/integrity';",resolveDir:process.cwd()},bundle:true,outfile:bundle,format:'esm',platform:'node',packages:'external'});
const {parseApplicationLock,loadVerifiedApplication,applicationProfiles,prepareInsightData,assertPrivateMlPath,canonicalJson}=await import(pathToFileURL(bundle).href);
const digest=x=>sha(canonicalJson(x)); assertPrivateMlPath(resolve(root,'dataset.json'));
const lock=await json(values['source-lock']), apps=parseApplicationLock(lock), old=parseApplicationLock(await json('ml/applications/sources.lock.json'));
const sourceAudit=await json(values['source-audit']), exposure=await json(values.exposure);
if(apps.length!==12 || sourceAudit.version!==1 || !sourceAudit.independenceChecked || !Array.isArray(sourceAudit.applications) || !Array.isArray(sourceAudit.historicalRepositoryIds)) throw Error('Expected twelve selected independent application families and source audit');
const oldEntries=new Set(old.map(a=>a.files.find(f=>f.path===(a.root==='.'?a.entry:`${a.root}/${a.entry}`)).sha256));
const ids=new Set(),entries=new Set();
for(const a of apps){
  const identity=sourceAudit.applications.find(x=>x.repository===a.repository&&x.revision===a.revision);
  if(!identity || identity.fork!==false || !Number.isSafeInteger(identity.repositoryId) || identity.sharedTemplate!==false || !identity.licenseVerified || sourceAudit.historicalRepositoryIds.includes(identity.repositoryId) || ids.has(identity.repositoryId) || old.some(o=>o.familyId===a.familyId)) throw Error(`Prior/aliased/fork/template family or incomplete provenance: ${a.id}`);
  ids.add(identity.repositoryId);
  const entry=a.files.find(f=>f.path===(a.root==='.'?a.entry:`${a.root}/${a.entry}`)).sha256;
  if(entries.has(entry)||oldEntries.has(entry)) throw Error('Duplicate entry template; renaming does not create a family'); entries.add(entry);
  await loadVerifiedApplication(a,resolve('.local/ml-applications/cache'));
}
// Reproduce historical rows with the retained private key before accepting new family hashes.
const secret=(await readFile('.local/insights-dataset-key','utf8')).trim();
const historical=await json(values['history-dataset']), history=await json(values['history-manifest']);
const historyInputs=await Promise.all(history.examples.map(async annotation=>({annotation,report:await json(resolve(dirname(resolve(values['history-manifest'])),annotation.reportFile))})));
if(canonicalJson(prepareInsightData(historyInputs,secret,historical.schemaVersion).dataset)!==canonicalJson(historical) || !exposure.datasets?.[digest(historical)]) throw Error('Historical family key/data no longer reproduces; never remap families');
const expected=applicationProfiles.filter(p=>p.id==='baseline'||p.rule==='JS-002');
const sourceBytes=await readFile(values['source-lock']);
const harnessHash=sha(JSON.stringify(await Promise.all(['packages/ml/application-corpus.ts','scripts/ml-application-corpus.mjs','scripts/ml-holdout-smoke.mjs','apps/cli/scanner.ts','packages/core/evidence-v3.ts'].map(async path=>({path,sha256:sha(await readFile(path))})))));
const records=[],inputs=[],keys=new Set(),manifest=[];
for(const directory of values.runs.split(',').map(p=>resolve(p))){
  const summary=await json(resolve(directory,'summary.json')), oracle=await json(resolve(directory,'oracle-records.json')), m=await json(resolve(directory,'manifest.json'));
  if(summary.provenance!=='controlled'||summary.passed!==oracle.length||summary.annotations!==m.examples.length||m.version!==2||summary.sourceLockHash!==sha(sourceBytes)||summary.harnessHash!==harnessHash) throw Error('Incomplete collection or changed source/harness');
  for(const record of oracle){
    const app=apps.find(a=>a.id===record.application), profile=expected.find(p=>p.id===record.profile), key=`${record.application}/${record.profile}`;
    if(!app||!profile||keys.has(key)||record.repository!==app.repository||record.revision!==app.revision||record.familyId!==app.familyId||record.label!==profile.label||record.targetCategory!==profile.rule||record.harnessHash!==harnessHash||record.sourceLockHash!==sha(sourceBytes)||record.behavior?.passed!==true||record.behavior.scriptErrors!==0||record.oracle?.configurationPassed!==true||(profile.rule&&record.behavior.scriptExecutionVerified!==true)) throw Error('Incomplete, duplicate or mismatched application oracle');
    const {evidenceRecord,...facts}=record;
    if(evidenceRecord!==`${record.oracle.version}:${sha(JSON.stringify(facts))}`) throw Error('Oracle record identity changed');
    const matching=m.examples.filter(a=>a.evidenceRecord===evidenceRecord);
    if(matching.length!==(profile.rule?1:0)) throw Error('Missing or duplicated exact fixture target annotation');
    for(const annotation of matching){
      const report=await json(resolve(directory,annotation.reportFile));
      if(sha(JSON.stringify(report))!==record.reportHash||annotation.label!==record.label||annotation.familyId!==record.familyId||annotation.oraclePassed!==true||annotation.oracleVersion!==record.oracle.version)throw Error('Annotation/report binding failed');
      inputs.push({report,annotation});manifest.push({...annotation,reportFile:resolve(directory,annotation.reportFile)});
    }
    records.push(record);keys.add(key);
  }
}
if(keys.size!==apps.length*expected.length||apps.some(a=>expected.some(p=>!keys.has(`${a.id}/${p.id}`))))throw Error('All selected families need baseline and every JS-002 scenario');
const prepared=prepareInsightData(inputs,secret,'vynlt-evidence-v3'), rejected=[], retained=[];
const oldFamilies=new Set(exposure.families),oldVariants=new Set(exposure.variants);
for(const row of prepared.dataset.examples){const reason=oldFamilies.has(row.family)?'previous-family':oldVariants.has(row.variant)?'previous-numeric-input':null;if(reason)rejected.push({reason,row});else retained.push(row);}
const dataset={...prepared.dataset,examples:retained};
await mkdir(dirname(root),{recursive:true}); await mkdir(root);
const save=(name,value)=>writeFile(resolve(root,name),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
await save('dataset.json',dataset);await save('rejected.json',rejected);await save('unfiltered-dataset.json',prepared.dataset);await save('grouping-audit.json',prepared.audit);await save('manifest.json',{version:2,examples:manifest});await save('oracle-records.json',records);
await save('provenance.json',{version:1,complete:true,datasetHash:digest(dataset),unfilteredDatasetHash:digest(prepared.dataset),sourceLockHash:digest(lock),sourceAuditHash:digest(sourceAudit),exposureHash:digest(exposure),historicalDatasetHash:digest(historical),families:[...new Set(retained.map(r=>r.family))].sort(),harnessHash,oracleManifestHash:digest(records),collectedFamilies:apps.length,scenarios:records.length,rejectedRows:rejected.length,scope:'Pinned independent applications with controlled local JS-002 scenarios; no model scores used for selection'});
console.log(JSON.stringify({scenarios:records.length,collectedFamilies:apps.length,retainedFamilies:new Set(retained.map(r=>r.family)).size,retainedRows:retained.length,rejectedRows:rejected.length,output:root}));

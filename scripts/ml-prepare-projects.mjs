// Developer workflow. Does not fit models, consume a holdout or promote a release.
import { readFile,writeFile,mkdir,stat,realpath } from 'node:fs/promises';
import { resolve,dirname,sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash,randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
const {values,positionals}=parseArgs({allowPositionals:true,options:{source:{type:'string'},exposure:{type:'string'},registration:{type:'string'},manifest:{type:'string'},keys:{type:'string'},output:{type:'string'}}});
const action=positionals[0];
if(!['register','prepare'].includes(action)||positionals.length!==1||!values.output)throw Error('Use register --source <lock.json> --exposure <registry.json> --output <new .local directory>, or prepare --registration <directory> --manifest <private manifest.json> --keys <trusted-public-keys.json> --output <new .local directory>');
await mkdir('.local',{recursive:true});
const privateRoot=await realpath('.local');
async function privatePath(path,mustExist=true){
  const resolved=resolve(path);
  if(!resolved.startsWith(resolve('.local')+sep))throw Error('Private data must stay under .local/');
  const checked=await realpath(mustExist?resolved:dirname(resolved));
  if(checked!==privateRoot&&!checked.startsWith(privateRoot+sep))throw Error('Private path resolves outside .local/');
  return resolved;
}
let readBytes=0;
async function json(path,limit=1024*1024){
  const resolved=await privatePath(path),size=(await stat(resolved)).size;
  readBytes+=size;if(size>limit||readBytes>64*1024*1024)throw Error('Private preparation input size exceeded');
  return JSON.parse(await readFile(resolved,'utf8'));
}
const output=await privatePath(values.output,false);
const modulePath=resolve('.local/project-data-'+randomUUID()+'.mjs');
await build({entryPoints:['packages/ml/project-dataset.ts'],outfile:modulePath,bundle:true,platform:'node',format:'esm',packages:'external'});
const {prepareProjectData,projectSourceLockSchema}=await import(pathToFileURL(modulePath).href);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const preparationHash=hash(await readFile(modulePath));
const secret=(await readFile(await privatePath('.local/insights-dataset-key'),'utf8')).trim();
if(secret.length<32)throw Error('Existing private family key is missing or invalid');
const familyKeyHash=hash(secret);
const save=(name,value)=>writeFile(resolve(output,name),JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
if(action==='register'){
  if(!values.source||!values.exposure)throw Error('Registration requires --source and --exposure');
  const source=projectSourceLockSchema.parse(await json(values.source)),exposure=await json(values.exposure,16*1024*1024);
  if(exposure.version!==1||exposure.policy!=='vylnt-external-holdout-v1'||!Object.keys(exposure.datasets??{}).length||!exposure.families?.length||!exposure.variants?.length)throw Error('Use the complete retained historical exposure registry');
  const result=await prepareProjectData([],source,exposure,secret,[]);
  if(result.audit.trainFamilies!==8||result.audit.validationFamilies!==4)throw Error('Register exactly eight training and four validation families before collection');
  await mkdir(output);await save('sources.json',source);await save('exposure.json',exposure);
  await save('registration.json',{version:'vylnt-project-registration-v1',registeredAt:new Date().toISOString(),
    sourceHash:hash(JSON.stringify(source)),exposureHash:hash(JSON.stringify(exposure)),preparationHash,familyKeyHash,
    scope:'Development only. Native source suitability and independent oracle checks remain required.'});
  console.log('Registered 8 training and 4 validation families. No data collected or model trained.');
}else{
  if(!values.registration||!values.manifest||!values.keys)throw Error('Preparation requires --registration, --manifest and --keys');
  const registration=await json(resolve(values.registration,'registration.json'));
  const source=await json(resolve(values.registration,'sources.json')),exposure=await json(resolve(values.registration,'exposure.json'),16*1024*1024);
  if(registration.version!=='vylnt-project-registration-v1'||registration.sourceHash!==hash(JSON.stringify(source))||registration.exposureHash!==hash(JSON.stringify(exposure))||registration.preparationHash!==preparationHash||registration.familyKeyHash!==familyKeyHash)throw Error('Registration, preparation code, source selection, exposure or private family identity changed');
  const manifest=await json(values.manifest,4*1024*1024),keys=await json(values.keys);
  if(manifest.version!=='vylnt-project-manifest-v1'||!Array.isArray(manifest.examples)||manifest.examples.length>50000)throw Error('Invalid private project manifest');
  // Public keys come from the installation-owned archive, never from a report.
  if(!Array.isArray(keys)||!keys.length||keys.length>32)throw Error('Expected the installation trusted public-key archive');
  const inputs=[];
  for(const entry of manifest.examples){
    if(!entry||!['report','seal','oracle'].every(k=>typeof entry[k]==='string'))throw Error('Manifest entries need report, seal and oracle paths');
    const paths=Object.fromEntries(['report','seal','oracle'].map(k=>[k,resolve(dirname(values.manifest),entry[k])]));
    inputs.push({report:await json(paths.report,512*1024),seal:await json(paths.seal,132*1024),oracle:await json(paths.oracle,16*1024)});
  }
  const result=await prepareProjectData(inputs,source,exposure,secret,keys);
  await mkdir(output);
  for(const [name,value] of Object.entries(result))await save(name+'.json',value);
  await save('registration.json',registration);
  console.log(JSON.stringify(result.audit,null,2));
  if(!result.audit.ready)process.exitCode=2;
}

import {afterEach,it,expect,vi} from 'vitest';
import request from 'supertest';
import {mkdtemp,mkdir,readFile,writeFile,rm,unlink} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createReport,RULESET_VERSION} from '../packages/core';
import {contentHash,freezeInsights,verifyFrozenInsights,InsightSizeError} from '../packages/ml/frozen-insights';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {projectOwnerTag} from '../packages/core/project-evidence';
import {ProjectSigner,readArchivedProjectKeys} from '../apps/server/project-signing';
import {FileStore,SupabaseStore} from '../apps/server/store';
import {ProjectService} from '../apps/server/projects';
import {createApp} from '../apps/server/app';
import {insightHtml} from '../apps/server/insight-html';
import {verifyExport,type AnchorService} from '../apps/server/anchor';
import {gateConfigSchema} from '../apps/cli/gate-config';
import {gatePolicy} from '../packages/core/gate';
import type {runGate} from '../apps/cli/gate-runner';
import type {StoredInsightReport} from '../packages/core/insight-contracts';
const parent=resolve('.local/test-tmp'),dirs:string[]=[],services:ProjectService[]=[];
const owner={ownerId:'a',token:'a'},other={ownerId:'b',token:'b'};
const auth={authenticate:async(token:string)=>['a','b'].includes(token)?{ownerId:token,token}:undefined};
const scan=()=>createReport(crypto.randomUUID(),{url:'http://127.0.0.1/',scannedAt:'2026-10-29T00:00:00Z',headers:{},cookies:[],domCollected:true,scripts:[],resources:[]});
async function root(){await mkdir(parent,{recursive:true});const dir=await mkdtemp(join(parent,'project-frozen-'));dirs.push(dir);return dir;}
afterEach(async()=>{vi.unstubAllGlobals();for(const service of services.splice(0))await service.close();for(const dir of dirs.splice(0)){if(!resolve(dir).startsWith(parent+sep))throw Error('Unsafe test path');await rm(dir,{recursive:true,force:true});}});
async function fixture(){
  const dir=await root(),signer=await ProjectSigner.open(join(dir,'keys')),report=scan();
  const evidence={...await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false),ownerTag:await projectOwnerTag(signer.publicKey.keyId,owner.ownerId)};
  const seal=signer.seal(evidence),keys=signer.trustedKeys,content=await freezeInsights(report,{seal,keys}),hash=await contentHash(content);
  return{dir,signer,report,evidence,seal,keys,content,stored:{id:hash,hash,createdAt:'2026-10-29T00:00:00Z',content} as StoredInsightReport};
}
it('freezes signed provenance without changing analysis, qualification or legacy content',async()=>{
  const f=await fixture(),legacy=await freezeInsights(f.report);
  expect(f.content.version).toBe('vylnt-frozen-insights-v2');expect(f.content.analysis).toEqual(legacy.analysis);
  expect(f.content.originalScanHash).toBe(legacy.originalScanHash);expect(await contentHash(legacy)).not.toBe(f.stored.hash);
  expect(await verifyFrozenInsights(f.stored,f.keys)).toBe(true);expect(await verifyFrozenInsights(f.stored)).toBe(false);
  const oldHash=await contentHash(legacy);expect(await verifyFrozenInsights({...f.stored,id:oldHash,hash:oldHash,content:legacy})).toBe(true);
  for(const change of ['commit','owner','assessment','analysis','extra'] as const){
    const changed=structuredClone(f.stored);if(changed.content.version!=='vylnt-frozen-insights-v2')throw Error('fixture');
    if(change==='commit')changed.content.project.seal.evidence.commit='d'.repeat(40);
    if(change==='owner')changed.content.project.seal.evidence.ownerTag=await projectOwnerTag(f.seal.keyId,'b');
    if(change==='assessment')(changed.content.project as {assessment:string}).assessment='qualified';
    if(change==='analysis')changed.content.analysis.summary='Injected narrative';
    if(change==='extra')Object.assign(changed.content.project,{keys:f.keys});
    changed.id=changed.hash=await contentHash(changed.content);
    expect(await verifyFrozenInsights(changed,f.keys)).toBe(false);
  }
  await expect(freezeInsights(scan(),{seal:f.seal,keys:f.keys})).rejects.toThrow(/match/);
  expect(await verifyFrozenInsights({content:null} as unknown as StoredInsightReport,f.keys)).toBe(false);
});
it('persists immutable project versions, retains key history and deletes with the source',async()=>{
  const f=await fixture(),path=join(f.dir,'store.json'),store=new FileStore(path);await store.put(owner,f.report);
  await expect(store.putInsight(owner,f.content)).rejects.toThrow(/trusted/);
  const first=await store.putInsight(owner,f.content,f.keys);expect((await store.putInsight(owner,f.content,f.keys)).created).toBe(false);
  const loaded=new FileStore(path);expect(await loaded.getInsight(owner,first.report.id)).toEqual(first.report);expect(await loaded.getInsight(other,first.report.id)).toBeUndefined();
  await loaded.put(other,f.report);await expect(loaded.putInsight(other,f.content,f.keys)).rejects.toThrow(/trusted/);
  const changed=await freezeInsights(f.report,{seal:f.signer.seal({...f.evidence,commit:'d'.repeat(40)}),keys:f.keys});
  expect((await loaded.putInsight(owner,changed,f.keys)).report.id).not.toBe(first.report.id);
  await unlink(join(f.dir,'keys/signing-key.json'));const rotated=await ProjectSigner.open(join(f.dir,'keys'));
  expect(rotated.publicKey.keyId).not.toBe(f.signer.publicKey.keyId);expect(await verifyFrozenInsights(first.report,rotated.trustedKeys)).toBe(true);
  expect(await readArchivedProjectKeys(join(f.dir,'absent.json'))).toEqual([]);
  expect(await readArchivedProjectKeys(join(f.dir,'keys/trusted-public-keys.json'))).toEqual(rotated.trustedKeys);
  await loaded.remove(owner,f.report.scanId);expect(await loaded.getInsight(owner,first.report.id)).toBeUndefined();
});
it('rejects copied signed provenance in another account even after a direct storage write',async()=>{
  const f=await fixture(),path=join(f.dir,'injected-store.json');
  await writeFile(path,JSON.stringify({version:1,owners:{b:[{report:f.report,hash:f.content.originalScanHash,receivedAt:f.stored.createdAt,feedback:[]}]},insights:{b:[f.stored]}}));
  const store=new FileStore(path),projects={signer:f.signer} as unknown as ProjectService,app=createApp({store,auth,projects});
  expect(await verifyFrozenInsights(f.stored,f.keys,'a')).toBe(true);expect(await verifyFrozenInsights(f.stored,f.keys,'b')).toBe(false);
  expect((await request(app).get(`/api/insight-reports/${f.stored.id}.json`).set('Authorization','Bearer b')).status).toBe(409);
  expect((await request(app).post('/api/reports/verify-upload').set('Authorization','Bearer b').send(f.stored)).body.result).toBe('verification-unavailable');
});
it('uses migration 006 only for v2 and explains missing migration without accepting unknown keys',async()=>{
  const f=await fixture(),store=new SupabaseStore('https://fixture.invalid','public-fixture-key'),paths:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{paths.push(url);return url.includes('/rpc/')?new Response('true'):new Response(JSON.stringify([{report_id:f.stored.id,created_at:f.stored.createdAt,content:f.content}]));}));
  await store.putInsight(owner,f.content,f.keys);expect(paths[0]).toContain('/rpc/finalize_project_insight_report');
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:404})));
  await expect(store.putInsight(owner,f.content,f.keys)).rejects.toThrow('006_project_insight_reports.sql');
  await expect(store.putInsight(owner,f.content)).rejects.toThrow(/trusted/);
});
it('verifies canonical tampering before chain lookup and requires an external trusted key archive',async()=>{
  const f=await fixture(),archive=join(f.dir,'keys/trusted-public-keys.json');
  const proof={version:1,reportHash:f.stored.hash,chainId:31337,contractAddress:'0x'+'a'.repeat(40),instanceId:'0x'+'b'.repeat(64),status:'confirmed',attempts:1};
  expect((await verifyExport(f.stored,proof,join(f.dir,'no-deployment.json'),archive)).result).toBe('verification-unavailable');
  const changed=structuredClone(f.stored);changed.content.originalScanHash='0'.repeat(64);
  expect((await verifyExport(changed,proof,'unused',archive)).result).toBe('content-mismatch');
  expect((await verifyExport(f.stored,proof,'unused',join(f.dir,'absent.json'))).result).toBe('verification-unavailable');
});
it('finalises same-run project reports automatically, rejects stale evidence and preserves the frozen version',async()=>{
  const dir=await root(),repo=join(dir,'repo'),journal=join(dir,'journal');await mkdir(repo);await promisify(execFile)('git',['init','-q'],{cwd:repo,windowsHide:true});
  const store=new FileStore(),r=scan(),config=gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/']});
  const runner:typeof runGate=async options=>{await options.onScan?.({checkout:repo,app:repo,origin:'http://127.0.0.1',report:r,config,commit:'a'.repeat(40),configHash:'b'.repeat(64),signal:new AbortController().signal});return{version:1,commit:'a'.repeat(40),status:'passed',policy:gatePolicy,rulesetVersion:RULESET_VERSION,checks:[]};};
  let service=await ProjectService.open(journal,store,runner);services.push(service);const project=await service.claim(service.pairing('a').code,repo),job=await service.start(owner,project.id,'HEAD');
  await vi.waitFor(async()=>expect((await service.get('a',job.id))?.status).toBe('completed'));
  let rendered:StoredInsightReport|undefined;const queued:StoredInsightReport[]=[];
  const anchors={enqueue:async(_owner:string,value:StoredInsightReport,keys:typeof service.signer.trustedKeys)=>{expect(await verifyFrozenInsights(value,keys)).toBe(true);queued.push(value);}} as unknown as AnchorService;
  const app=()=>createApp({store,auth,projects:service,anchors,renderPdf:async(_row,_mode,_analysis,frozen)=>{rendered=frozen;return Buffer.from('%PDF-test');}});
  const body={analysisHash:await contentHash((await freezeInsights(r)).analysis)},url=`/api/scans/${r.scanId}/insight-reports`;
  expect((await request(app()).post(url).set('Authorization','Bearer b').send(body)).status).toBe(404);
  expect((await request(app()).post(url).set('Authorization','Bearer a').send({...body,project:{}})).status).toBe(400);
  const saved=await request(app()).post(url).set('Authorization','Bearer a').send(body);expect(saved.status).toBe(201);expect(saved.body.content.version).toBe('vylnt-frozen-insights-v2');expect(queued).toHaveLength(1);
  expect((await request(app()).post(url).set('Authorization','Bearer a').send(body)).status).toBe(200);
  const download=`/api/insight-reports/${saved.body.id}`;
  expect((await request(app()).get(download+'.pdf').set('Authorization','Bearer a')).status).toBe(200);expect(rendered).toEqual(saved.body);
  const html=insightHtml(saved.body,'');expect(html).toContain('Project provenance: commit');expect(html).toContain('remain unqualified');
  const ordinary=scan();await store.put(owner,ordinary);expect((await request(app()).post(`/api/scans/${ordinary.scanId}/insight-reports`).set('Authorization','Bearer a').send({analysisHash:await contentHash((await freezeInsights(ordinary)).analysis)})).body.content.version).toBe('vynlt-frozen-insights-v1');
  await service.close();const state=JSON.parse(await readFile(join(journal,'registry.json'),'utf8'));state.runs[0].evidence[0].evidence.commit='e'.repeat(40);await writeFile(join(journal,'registry.json'),JSON.stringify(state));
  service=await ProjectService.open(journal,store,runner);services.push(service);
  expect((await request(app()).post(url).set('Authorization','Bearer a').send(body)).status).toBe(409);
  expect((await request(app()).get(download+'.json').set('Authorization','Bearer a')).body).toEqual(saved.body);
  expect((await request(app()).get(download+'.json').set('Authorization','Bearer b')).status).toBe(404);
},30000);
it('rejects oversized combined snapshots explicitly',async()=>{
  const f=await fixture(),large=structuredClone(f.content);large.analysis.summary='x'.repeat(1024*1024);
  const store=new FileStore();await store.put(owner,f.report);await expect(store.putInsight(owner,large,f.keys)).rejects.toBeInstanceOf(InsightSizeError);
});

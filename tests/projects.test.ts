import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { ProjectService } from '../apps/server/projects';
import { FileStore } from '../apps/server/store';
import { createApp } from '../apps/server/app';
import { createReport, RULESET_VERSION } from '../packages/core';
import { gatePolicy } from '../packages/core/gate';
import { gateConfigSchema } from '../apps/cli/gate-config';
import { runGate } from '../apps/cli/gate-runner';
const dirs:string[]=[],services:ProjectService[]=[];
const owner={ownerId:'owner-a',token:'PRIVATE_BEARER_TOKEN'},other={ownerId:'owner-b',token:'other'};
const report=()=>createReport(crypto.randomUUID(),{url:'http://127.0.0.1/',scannedAt:'2026-10-27T00:00:00Z',headers:{},domCollected:true,cookies:[],scripts:[],resources:[]});
const config=gateConfigSchema.parse({version:1,directory:'.',startScript:'start',routes:['/']});
const fake:typeof runGate=async options=>{
  await options.onScan?.({checkout:options.repo,app:options.repo,origin:'http://127.0.0.1',report:report(),config,commit:'a'.repeat(40),configHash:'b'.repeat(64),signal:options.signal??new AbortController().signal});
  return {version:1,commit:'a'.repeat(40),status:'passed',policy:gatePolicy,rulesetVersion:RULESET_VERSION,checks:[]};
};
async function setup(runner:typeof runGate=fake,store=new FileStore()){
  const root=await mkdtemp(join(tmpdir(),'vylnt-projects-'));dirs.push(root);const repo=join(root,'repo'),journal=join(root,'journal');await mkdir(repo);
  await promisify(execFile)('git',['init','-q'],{cwd:repo,windowsHide:true});
  const service=await ProjectService.open(journal,store,runner);services.push(service);
  const project=await service.claim(service.pairing(owner.ownerId).code,repo);return{root,repo,journal,store,service,project};
}
afterEach(async()=>{for(const service of services.splice(0))await service.close();for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true});});
describe('local project ownership and durable jobs',()=>{
  it('pairs once, hides paths and isolates owners',async()=>{
    const {service,repo,project}=await setup();const code=service.pairing(owner.ownerId).code;
    const results=await Promise.allSettled([service.claim(code,repo),service.claim(code,repo)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(await service.list(owner.ownerId)).toEqual([project]);expect(await service.list(other.ownerId)).toEqual([]);
    await expect(service.start(other,project.id,'HEAD')).rejects.toMatchObject({status:404});
  });
  it('saves only same-run signed evidence, survives reload and removes evidence with scans',async()=>{
    const {service,project,store,journal}=await setup(),run=await service.start(owner,project.id,'HEAD');
    await vi.waitFor(async()=>expect((await service.get(owner.ownerId,run.id))?.status).toBe('completed'));
    const done=(await service.get(owner.ownerId,run.id))!,id=done.scanIds[0],row=(await store.get(owner,id))!;
    expect(await service.evidence(owner.ownerId,id,row.report)).toBeTruthy();expect(await service.evidence(other.ownerId,id,row.report)).toBeUndefined();
    const copied=report();expect(await service.evidence(owner.ownerId,copied.scanId,copied)).toBeUndefined();
    expect(await readFile(join(journal,'registry.json'),'utf8')).not.toContain(owner.token);
    await service.close();const restored=await ProjectService.open(journal,store,fake);services.push(restored);
    expect(await restored.evidence(owner.ownerId,id,row.report)).toBeTruthy();
    await restored.forget(owner.ownerId,[id]);expect(await restored.evidence(owner.ownerId,id,row.report)).toBeUndefined();
  });
  it('serializes jobs and cancels without saving partial observations',async()=>{
    const slow:typeof runGate=async options=>{await new Promise<void>(resolve=>{if(options.signal?.aborted)resolve();else options.signal?.addEventListener('abort',()=>resolve(),{once:true});});throw Error('cancelled');};
    const {service,project}=await setup(slow);
    const jobs=await Promise.allSettled([service.start(owner,project.id,'HEAD'),service.start(owner,project.id,'HEAD')]);expect(jobs.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const run=(jobs.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<ProjectService['start']>>>).value;
    await expect(service.cancel(other.ownerId,run.id)).rejects.toMatchObject({status:404});await service.cancel(owner.ownerId,run.id);
    await vi.waitFor(async()=>expect((await service.get(owner.ownerId,run.id))?.status).toBe('cancelled'));expect((await service.get(owner.ownerId,run.id))?.scanIds).toEqual([]);
  });
  it('marks interrupted work failed after restart, without reusing credentials',async()=>{
    const {service,project,journal,store}=await setup();const run=await service.start(owner,project.id,'HEAD');
    await vi.waitFor(async()=>expect((await service.get(owner.ownerId,run.id))?.status).toBe('completed'));await service.close();
    const state=JSON.parse(await readFile(join(journal,'registry.json'),'utf8'));state.runs[0].status='running';await writeFile(join(journal,'registry.json'),JSON.stringify(state));
    const restored=await ProjectService.open(journal,store,fake);services.push(restored);expect((await restored.get(owner.ownerId,run.id))?.status).toBe('failed');
  });
  it('cannot restore deleted provenance when a save finishes during cancellation',async()=>{
    const store=new FileStore(),put=store.put.bind(store);let release!:()=>void,id='';
    const barrier=new Promise<void>(done=>release=done);
    store.put=async(identity,report)=>{id=report.scanId;await barrier;return put(identity,report);};
    const {service,project}=await setup(fake,store),run=await service.start(owner,project.id,'HEAD');
    await vi.waitFor(()=>expect(id).not.toBe(''));
    const deletion=service.forget(owner.ownerId,[id]);release();await deletion;
    const finished=await service.get(owner.ownerId,run.id);expect(finished?.scanIds).toEqual([]);
    const saved=(await store.get(owner,id))!;expect(await service.evidence(owner.ownerId,id,saved.report)).toBeUndefined();
  });
  it('requires authentication for pairing/runs and rejects foreign scan provenance access',async()=>{
    const {service,store,project}=await setup(),auth={authenticate:async(token:string)=>token==='a'?owner:token==='b'?other:undefined},app=createApp({store,projects:service,auth});
    expect((await request(app).post('/api/project-pairings').send({})).status).toBe(401);
    expect((await request(app).get('/api/projects').set('Authorization','Bearer b')).body.projects).toEqual([]);
    expect((await request(app).post(`/api/projects/${project.id}/runs`).set('Authorization','Bearer b').send({commit:'HEAD'})).status).toBe(404);
    const run=await service.start(owner,project.id,'HEAD');await vi.waitFor(async()=>expect((await service.get(owner.ownerId,run.id))?.status).toBe('completed'));
    const id=(await service.get(owner.ownerId,run.id))!.scanIds[0];
    expect((await request(app).get(`/api/scans/${id}/project-evidence`).set('Authorization','Bearer a')).status).toBe(200);
    expect((await request(app).get(`/api/scans/${id}/project-evidence`).set('Authorization','Bearer b')).status).toBe(404);
    expect((await request(app).delete(`/api/scans/${id}`).set('Authorization','Bearer a')).status).toBe(204);
    expect((await service.runs(owner.ownerId))[0].scanIds).toEqual([]);
  });
});

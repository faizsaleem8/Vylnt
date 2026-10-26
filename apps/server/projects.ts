import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import { resolve, join, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { Store, Identity } from './store';
import type { Report } from '../../packages/core';
import { contentHash } from '../../packages/core/integrity';
import { sealedProjectEvidenceSchema, verifyProjectEvidence, type SealedProjectEvidence } from '../../packages/core/project-evidence';
import { collectResponseFacts } from '../../packages/ml/project-policy-facts';
import { runGate } from '../cli/gate-runner';
import { scanProjectPage } from '../cli/project-scanner';
import { mergeBrowserMeasurement, type BrowserMeasurement } from '../cli/project-probes';
import { replaceFile } from './replace-file';
import { ProjectSigner } from './project-signing';
import { inspectProject } from './project-inspection';

const execute = promisify(execFile), hash = (s: string) => createHash('sha256').update(s).digest('hex');
const projectSchema = z.object({id:z.string().uuid(),ownerId:z.string().min(1).max(256),name:z.string().max(100),path:z.string().min(1).max(4096)}).strict();
const runSchema = z.object({id:z.string().uuid(),projectId:z.string().uuid(),ownerId:z.string().min(1).max(256),
  commit:z.string().regex(/^(?:HEAD|[a-f0-9]{40}(?:[a-f0-9]{24})?)$/),status:z.enum(['queued','running','completed','failed','cancelled']),
  scanIds:z.array(z.string().uuid()).max(10),error:z.string().max(300).optional(),createdAt:z.string().datetime(),
  evidence:z.array(sealedProjectEvidenceSchema).max(10)}).strict();
const stateSchema = z.object({version:z.literal(1),projects:z.array(projectSchema).max(100),runs:z.array(runSchema).max(1000)}).strict();
type State = z.infer<typeof stateSchema>;
export class ProjectError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

/** Local single-process job registry. No bearer tokens, application logs or raw source are persisted. */
export class ProjectService {
  private queue: Promise<unknown> = Promise.resolve();
  private pairings = new Map<string,{ownerId:string;expires:number}>();
  private jobs = new Map<string,{abort:AbortController;done:Promise<void>}>();
  private closing = false;
  private constructor(private root: string, private state: State, readonly signer: ProjectSigner, private store: Store, private runner: typeof runGate) {}
  static async open(root: string, store: Store, runner: typeof runGate = runGate) {
    const directory = resolve(root); await mkdir(directory,{recursive:true});
    let state: State = {version:1,projects:[],runs:[]};
    try { state = stateSchema.parse(JSON.parse(await readFile(join(directory,'registry.json'),'utf8'))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const service = new ProjectService(directory,state,await ProjectSigner.open(directory),store,runner);
    await service.transaction(next=>{ for (const run of next.runs) if (['queued','running'].includes(run.status)) { run.status='failed'; run.error='API restarted before completion. Start a new run while signed in.'; } });
    return service;
  }
  private transaction<T>(work: (next: State)=>T): Promise<T> {
    const next = this.queue.then(async()=>{
      const data = structuredClone(this.state), result = work(data);
      stateSchema.parse(data);
      const path = join(this.root,'registry.json'), temporary = path + '.' + randomUUID() + '.tmp';
      await writeFile(temporary,JSON.stringify(data),{flag:'wx',mode:0o600});
      await replaceFile(temporary,path); this.state=data; return result;
    }); this.queue=next.catch(()=>{}); return next;
  }
  pairing(ownerId: string) {
    for (const [key,value] of this.pairings) if (value.expires <= Date.now()) this.pairings.delete(key);
    if (this.pairings.size >= 100) throw new ProjectError('Too many pending pairings',429);
    const code=randomBytes(24).toString('hex'),expires=Date.now()+5*60_000;
    this.pairings.set(hash(code),{ownerId,expires}); return {code,expiresAt:new Date(expires).toISOString()};
  }
  async claim(code: string, directory: string) {
    const digest=hash(code), pairing=this.pairings.get(digest);
    if (!pairing || pairing.expires <= Date.now()) throw new ProjectError('Pairing code is invalid or expired',401);
    const path=await realpath(resolve(directory));
    const env={...process.env}; for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
    const top=await execute('git',['rev-parse','--show-toplevel'],{cwd:path,env,windowsHide:true,timeout:10000,maxBuffer:8192});
    if (await realpath(top.stdout.trim()) !== path) throw new ProjectError('Register the repository root');
    // Consume before an asynchronous write: concurrent claims cannot reuse a code.
    if (this.pairings.get(digest) !== pairing || pairing.expires <= Date.now()) throw new ProjectError('Pairing code is invalid or expired',401);
    this.pairings.delete(digest);
    return this.transaction(state=>{
      const existing=state.projects.find(p=>p.ownerId===pairing.ownerId && p.path===path);
      const project=existing ?? {id:randomUUID(),ownerId:pairing.ownerId,path,name:basename(path).slice(0,100)};
      if (!existing) state.projects.push(project);
      return {id:project.id,name:project.name};
    });
  }
  async list(ownerId: string) { await this.queue; return this.state.projects.filter(p=>p.ownerId===ownerId).map(({id,name})=>({id,name})); }
  async runs(ownerId: string) { await this.queue; return this.state.runs.filter(r=>r.ownerId===ownerId).slice(-50).reverse().map(r=>this.view(r)); }
  private view(run: State['runs'][number]) { const {ownerId,evidence,...view}=run; return structuredClone(view); }
  async get(ownerId: string, id: string) { await this.queue; const run=this.state.runs.find(r=>r.id===id&&r.ownerId===ownerId); return run ? this.view(run) : undefined; }
  async evidence(ownerId: string, scanId: string, report: Report) {
    await this.queue;
    if (report.scanId !== scanId) return;
    const scanHash=await contentHash(report);
    const run=this.state.runs.find(r=>r.ownerId===ownerId && r.evidence.some(e=>e.evidence.originalScanHash===scanHash));
    // Multi-route runs require a digest match, not array position or matching URL.
    if (!run) return;
    for (const candidate of run!.evidence) { const valid=await verifyProjectEvidence(candidate,report,this.signer.trustedKeys); if (valid) return valid; }
  }
  async start(identity: Identity, projectId: string, commit: string) {
    if (this.closing) throw new ProjectError('Project runner is shutting down',503);
    z.string().regex(/^(?:HEAD|[a-f0-9]{40}(?:[a-f0-9]{24})?)$/).parse(commit);
    const id=randomUUID();
    const project=await this.transaction(state=>{
      if (state.runs.some(r=>['queued','running'].includes(r.status))) throw new ProjectError('Another local project run is active',409);
      const project=state.projects.find(p=>p.id===projectId && p.ownerId===identity.ownerId);
      if (!project) throw new ProjectError('Project not found',404);
      state.runs.push({id,projectId,ownerId:identity.ownerId,commit,status:'queued',scanIds:[],evidence:[],createdAt:new Date().toISOString()});
      return structuredClone(project);
    });
    const abort=new AbortController();
    if (this.closing) abort.abort();
    const done=this.execute(identity,project,id,commit,abort.signal).catch(()=>{
      // A disk failure must not crash the API or be reported as completed.
      const run=this.state.runs.find(r=>r.id===id); if (run) {run.status='failed';run.error='Project journal unavailable. Restore local storage before retrying.';}
    }).finally(()=>this.jobs.delete(id));
    this.jobs.set(id,{abort,done}); return (await this.get(identity.ownerId,id))!;
  }
  private async execute(identity: Identity, project: State['projects'][number], id: string, commit: string, signal: AbortSignal) {
    const observations: {report:Report;seal:SealedProjectEvidence}[]=[];
    const measurements = new Map<string, BrowserMeasurement>();
    let inspection:Awaited<ReturnType<typeof inspectProject>>|undefined;
    let failure:string|undefined;
    try {
      await this.transaction(state=>{state.runs.find(r=>r.id===id)!.status='running';});
      const adapterHash=hash(await readFile(fileURLToPath(import.meta.url),'utf8'));
      const result=await this.runner({repo:project.path,commit,output:join(this.root,'runs',id),signal,purpose:'project',
        scanner:async (target,options)=>{const collected=await scanProjectPage(target,options);measurements.set(collected.report.scanId,collected.measurement);return collected.report;},
        onSnapshot:async context=>{inspection=await inspectProject(context);},
        onScan:async context=>{
          signal.throwIfAborted();
          try {
            let evidence=await collectResponseFacts(context.report,{runId:id,commit:context.commit,configHash:context.configHash,adapterHash},context.config.protocol==='https' && !context.config.ignoreHTTPSErrors);
            const measurement=measurements.get(context.report.scanId);
            if(measurement){evidence=mergeBrowserMeasurement(evidence,measurement);measurements.delete(context.report.scanId);}
            evidence.inspection=inspection;
            observations.push({report:context.report,seal:this.signer.seal(evidence)});
          }catch(error){
            if(error instanceof z.ZodError && error.issues.some(issue=>issue.message==='Project evidence exceeds 128 KiB'))failure='Project evidence exceeds the 128 KiB companion limit. The run was rejected without dropping evidence.';
            throw error;
          }
        }});
      signal.throwIfAborted();
      if (result.status==='error' || !observations.length) {failure??=result.error;throw new Error('Local project scan could not complete. Inspect the local gate result.');}
      // Save seals before scans; a crash cannot leave a saved scan without its provenance record.
      await this.transaction(state=>{const run=state.runs.find(r=>r.id===id)!;run.commit=result.commit;run.evidence=observations.map(o=>o.seal);});
      for (const observation of observations) {
        signal.throwIfAborted(); await this.store.put(identity,observation.report);
        await this.transaction(state=>{state.runs.find(r=>r.id===id)!.scanIds.push(observation.report.scanId);});
      }
      signal.throwIfAborted();
      await this.transaction(state=>{state.runs.find(r=>r.id===id)!.status='completed';});
    } catch {
      await this.transaction(state=>{const run=state.runs.find(r=>r.id===id)!;run.status=signal.aborted?'cancelled':'failed';run.error=signal.aborted?'Run cancelled. Any already saved scans remain available.':failure??'Project collection or saving failed. Any already saved scans remain available; start a new run after resolving the local error.';});
    }
  }
  async cancel(ownerId: string,id: string) {
    const run=await this.get(ownerId,id); if (!run) throw new ProjectError('Run not found',404);
    this.jobs.get(id)?.abort.abort(); return run;
  }
  async forget(ownerId: string, scanIds: string[]) {
    await this.queue;
    const pending:Promise<void>[]=[];
    for (const run of this.state.runs) if (run.ownerId===ownerId && run.evidence.some(e=>scanIds.includes(e.evidence.scanId))) {
      const job=this.jobs.get(run.id);if(job){job.abort.abort();pending.push(job.done);}
    }
    await Promise.allSettled(pending);
    const affected=await this.transaction(state=>{
      const runs=state.runs.filter(r=>r.ownerId===ownerId&&(r.scanIds.some(id=>scanIds.includes(id)) || r.evidence.some(e=>scanIds.includes(e.evidence.scanId))));
      for (const run of runs) {
        run.evidence=run.evidence.filter(e=>!scanIds.includes(e.evidence.scanId));run.scanIds=run.scanIds.filter(id=>!scanIds.includes(id));
      }
      return runs.map(r=>r.id);
    });
    for (const id of affected) {
      const parent=resolve(this.root,'runs'),target=resolve(parent,id);
      if (!target.startsWith(parent+sep) || !z.uuid().safeParse(id).success) throw Error('Invalid cleanup target');
      await rm(target,{recursive:true,force:true,maxRetries:3});
    }
  }
  async close() { this.closing=true;await this.queue;this.pairings.clear();for (const job of this.jobs.values()) job.abort.abort();await Promise.allSettled([...this.jobs.values()].map(job=>job.done)); }
}

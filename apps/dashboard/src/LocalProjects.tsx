import React, { useEffect, useRef, useState } from 'react';

type Api = <T>(path:string,init?:RequestInit)=>Promise<T>;
type Project = {id:string;name:string};
type Run = {id:string;projectId:string;status:'queued'|'running'|'completed'|'cancelled'|'failed';commit:string;scanIds:string[];error?:string};
export function LocalProjects({api,onOpen}:{api:Api;onOpen:(id:string)=>void}) {
  const apiRef=useRef(api); apiRef.current=api;
  const controller=useRef<AbortController | undefined>(undefined);
  const [projects,setProjects]=useState<Project[]>([]),[runs,setRuns]=useState<Run[]>([]);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[commit,setCommit]=useState('HEAD');
  const [pair,setPair]=useState<{code:string;expiresAt:string}|null>(null);
  useEffect(()=>{
    const abort=new AbortController();controller.current=abort;let timer:ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const [p,r]=await Promise.all([apiRef.current<{projects:Project[]}>('/projects',{signal:abort.signal}),apiRef.current<{runs:Run[]}>('/project-runs',{signal:abort.signal})]);
        if(!abort.signal.aborted){setProjects(p.projects);setRuns(r.runs);setError('');}
      }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not load local projects');}
      finally{if(!abort.signal.aborted)timer=setTimeout(()=>void refresh(),3000);}
    }
    void refresh();return()=>{abort.abort();clearTimeout(timer);};
  },[]);
  useEffect(()=>{if(!pair)return;const timer=setTimeout(()=>setPair(null),Math.max(0,Date.parse(pair.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[pair]);
  async function act(work:()=>Promise<void>) {setBusy(true);setError('');try{await work();}catch(e){if(!controller.current?.signal.aborted)setError(e instanceof Error?e.message:'Project action failed');}finally{if(!controller.current?.signal.aborted)setBusy(false);}}
  const active=runs.some(r=>['queued','running'].includes(r.status));
  return <div className="local-projects">
    <section className="panel project-panel" aria-labelledby="project-register-title">
      <div className="section-heading"><div><h2 id="project-register-title">Local projects</h2><p className="muted">Create a fresh scan from a registered repository and a committed version.</p></div>
      <button disabled={busy} onClick={()=>void act(async()=>{const value=await apiRef.current<{code:string;expiresAt:string}>('/project-pairings',{method:'POST',body:'{}',signal:controller.current?.signal});if(!controller.current?.signal.aborted)setPair(value);})}>Register a project</button></div>
      <p className="small muted">Register only code you trust: its build and start scripts run locally under your account. Additional project insights are not yet qualified; reports retain the current assessments.</p>
      {pair&&<div role="status"><p>Run this from your VYLNT folder, replacing the repository path. The code expires in five minutes and works once.</p><pre className="code-block" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{`npm run project:register -- --repo "C:\\path\\to\\website" --code ${pair.code}`}</pre></div>}
      <label htmlFor="project-commit">Committed version</label><input id="project-commit" value={commit} onChange={e=>setCommit(e.target.value)} placeholder="HEAD or full commit SHA" autoComplete="off" />
      {!projects.length&&!error&&<p className="muted">No local projects registered.</p>}
      {projects.map(p=><div className="section-heading" key={p.id}><strong>{p.name}</strong><button disabled={busy||active||!/^(HEAD|[a-f0-9]{40}([a-f0-9]{24})?)$/.test(commit)} onClick={()=>void act(async()=>{const run=await apiRef.current<Run>(`/projects/${p.id}/runs`,{method:'POST',body:JSON.stringify({commit}),signal:controller.current?.signal});if(!controller.current?.signal.aborted){setPair(null);setRuns(old=>[run,...old.filter(r=>r.id!==run.id)]);}})}>Scan project</button></div>)}
      {error&&<p role="alert" className="error">{error}</p>}
    </section>
    <section className="panel project-panel" aria-labelledby="project-runs-title"><h2 id="project-runs-title">Recent runs</h2>
      <p role="status" aria-live="polite">{active?'A local project scan is running.':runs.length?`${runs.length} recent runs.`:'No runs yet.'}</p>
      {runs.map(run=><article key={run.id} className="finding-card"><div className="section-heading"><strong>{projects.find(p=>p.id===run.projectId)?.name??'Local project'} · {run.status}</strong>
        {['queued','running'].includes(run.status)&&<button disabled={busy} onClick={()=>void act(async()=>{await apiRef.current(`/project-runs/${run.id}`,{method:'DELETE',signal:controller.current?.signal});})}>Cancel run</button>}</div>
        <p className="small muted">Commit: {run.commit}</p>{run.error&&<p>{run.error}</p>}
        {run.scanIds.map((id,index)=><button key={id} onClick={()=>onOpen(id)}>Open scan {index+1}</button>)}
      </article>)}
    </section>
  </div>;
}

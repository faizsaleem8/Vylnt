import { expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createReport } from '../packages/core';
import { freezeInsights, contentHash } from '../packages/ml/frozen-insights';
import {collectResponseFacts} from '../packages/ml/project-policy-facts';
import {ProjectSigner} from '../apps/server/project-signing';
import {projectOwnerTag} from '../packages/core/project-evidence';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';

it('migration 005 enforces isolation, immutable writes, idempotency and source deletion in PostgreSQL', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema public, auth to authenticated; grant execute on function auth.uid() to authenticated;
      create table public.scans(owner_id uuid, scan_id uuid, report jsonb, report_hash text, primary key(owner_id,scan_id));`);
    await db.exec(await readFile('supabase/migrations/005_insight_reports.sql', 'utf8'));
    const owner = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
    const report = createReport(crypto.randomUUID(), { url: 'https://app.test/', scannedAt: '2026-10-21T00:00:00Z', resources: [], scripts: [], domCollected: true });
    const content = await freezeInsights(report), hash = await contentHash(content);
    await db.query('insert into scans values ($1,$2,$3,$4)', [owner, report.scanId, report, content.originalScanHash]);
    await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
    expect((await db.query<{ result: boolean }>('select public.finalize_insight_report($1,$2) as result', [content, hash])).rows[0].result).toBe(true);
    expect((await db.query<{ result: boolean }>('select public.finalize_insight_report($1,$2) as result', [content, hash])).rows[0].result).toBe(false);
    expect((await db.query('select * from insight_reports')).rows).toHaveLength(1);
    await expect(db.exec('update insight_reports set created_at=now()')).rejects.toThrow('permission denied');
    await expect(db.exec('delete from insight_reports')).rejects.toThrow('permission denied');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    expect((await db.query('select * from insight_reports')).rows).toHaveLength(0);
    await expect(db.query('select public.finalize_insight_report($1,$2)', [content, hash])).rejects.toThrow('Source scan mismatch');
    await db.exec('reset role'); await db.exec('delete from scans');
    expect((await db.query('select * from insight_reports')).rows).toHaveLength(0);
  } finally { await db.close(); }
}, 30000);

it('migration 006 retains legacy reports and enforces v2 linkage, ownership, immutability and limits',async()=>{
  const db=new PGlite(),parent=resolve('.local/test-tmp');await mkdir(parent,{recursive:true});const root=await mkdtemp(join(parent,'migration006-'));
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated;grant execute on function auth.uid() to authenticated;
      create table public.scans(owner_id uuid,scan_id uuid,report jsonb,report_hash text,primary key(owner_id,scan_id));`);
    await db.exec(await readFile('supabase/migrations/005_insight_reports.sql','utf8'));await db.exec(await readFile('supabase/migrations/006_project_insight_reports.sql','utf8'));
    const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
    const report=createReport(crypto.randomUUID(),{url:'http://127.0.0.1/',scannedAt:'2026-10-29T00:00:00Z',headers:{},domCollected:true,resources:[],scripts:[],cookies:[]});
    const signer=await ProjectSigner.open(root),evidence={...await collectResponseFacts(report,{runId:crypto.randomUUID(),commit:'a'.repeat(40),configHash:'b'.repeat(64),adapterHash:'c'.repeat(64)},false),ownerTag:await projectOwnerTag(signer.publicKey.keyId,owner)};
    const legacy=await freezeInsights(report),content=await freezeInsights(report,{seal:signer.seal(evidence),keys:signer.trustedKeys}),hash=await contentHash(content);
    await db.query('insert into scans values($1,$2,$3,$4)',[owner,report.scanId,report,content.originalScanHash]);
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    const save=(value:unknown,id=hash)=>db.query<{result:boolean}>('select public.finalize_project_insight_report($1,$2) as result',[value,id]);
    expect((await save(content)).rows[0].result).toBe(true);expect((await save(content)).rows[0].result).toBe(false);
    expect((await db.query<{result:boolean}>('select public.finalize_insight_report($1,$2) as result',[legacy,await contentHash(legacy)])).rows[0].result).toBe(true);
    expect((await db.query('select * from insight_reports')).rows).toHaveLength(2);
    if(content.version!=='vylnt-frozen-insights-v2')throw Error('fixture');
    for(const patch of [{assessment:'qualified'}, {seal:{...content.project.seal,evidence:{...evidence,originalScanHash:'e'.repeat(64)}}}, {seal:{...content.project.seal,signature:null}}]){
      await expect(save({...content,project:{...content.project,...patch}})).rejects.toThrow('Invalid project report identity');
    }
    await expect(save({...content,extra:'x'.repeat(1048576)})).rejects.toThrow('Combined report exceeds 1 MiB');
    await expect(save({...content,analysis:{...content.analysis,summary:'changed'}})).rejects.toThrow('Report hash conflict');
    await expect(db.exec('update insight_reports set created_at=now()')).rejects.toThrow('permission denied');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);expect((await db.query('select * from insight_reports')).rows).toHaveLength(0);await expect(save(content)).rejects.toThrow('Source scan mismatch');
    await db.exec('reset role');await db.exec('delete from scans');expect((await db.query('select * from insight_reports')).rows).toHaveLength(0);
  }finally{await db.close();if(!resolve(root).startsWith(parent+sep))throw Error('Unsafe cleanup');await rm(root,{recursive:true,force:true});}
},30000);

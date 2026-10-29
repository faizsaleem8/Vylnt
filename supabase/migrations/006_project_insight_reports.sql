-- Run after 005. Preserve v1 RPC, rows, hashes, grants and ownership policies.
begin;
create function public.finalize_project_insight_report(p_content jsonb, p_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid := (p_content->'originalScan'->>'scanId')::uuid;
  v_evidence jsonb := p_content->'project'->'seal'->'evidence';
  v_source public.scans%rowtype;
  v_count integer;
begin
  if v_owner is null then raise insufficient_privilege; end if;
  if octet_length(p_content::text) > 1048576 then
    raise sqlstate 'PGRST' using message = '{"code":"INSIGHTS_TOO_LARGE","message":"Combined report exceeds 1 MiB","details":null,"hint":null}', detail = '{"status":413}';
  end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
    or p_content->>'version' is distinct from 'vylnt-frozen-insights-v2'
    or p_content->'project'->>'assessment' is distinct from 'not-enabled'
    or p_content->'project'->'seal'->>'version' is distinct from 'vylnt-project-seal-v1'
    or v_evidence->>'version' is distinct from 'vylnt-evidence-v4'
    or v_evidence->>'scanId' is distinct from p_content->'originalScan'->>'scanId'
    or v_evidence->>'originalScanHash' is distinct from p_content->>'originalScanHash'
    or coalesce(v_evidence->>'ownerTag','') !~ '^[0-9a-f]{64}$'
    or coalesce(p_content->'project'->'seal'->>'keyId','') !~ '^[0-9a-f]{64}$'
    or coalesce(p_content->'project'->'seal'->>'signature','') !~ '^[A-Za-z0-9+/]{86}==$'
    or coalesce(v_evidence->>'commit','') !~ '^([0-9a-f]{40}|[0-9a-f]{64})$'
    or octet_length(v_evidence::text) > 131072
  then raise exception 'Invalid project report identity'; end if;
  select * into v_source from public.scans where owner_id = v_owner and scan_id = v_id for key share;
  if not found or v_source.report is distinct from p_content->'originalScan' or v_source.report_hash is distinct from p_content->>'originalScanHash' then raise exception 'Source scan mismatch'; end if;
  -- SQL enforces linkage and ownership, not Ed25519 trust or model derivation.
  -- The authenticated API independently verifies both on finalisation/retrieval.
  insert into public.insight_reports(owner_id,scan_id,report_id,content) values(v_owner,v_id,p_hash,p_content) on conflict do nothing;
  get diagnostics v_count = row_count;
  if exists(select 1 from public.insight_reports where owner_id=v_owner and report_id=p_hash and content is distinct from p_content) then raise exception 'Report hash conflict'; end if;
  return v_count=1;
end;
$$;
revoke all on function public.finalize_project_insight_report(jsonb,text) from public, anon;
grant execute on function public.finalize_project_insight_report(jsonb,text) to authenticated;
commit;

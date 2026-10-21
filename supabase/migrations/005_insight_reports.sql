-- Immutable report versions. Apply after 001-004. No service-role key required.
begin;
create table public.insight_reports (
  owner_id uuid not null,
  scan_id uuid not null,
  report_id text not null check (report_id ~ '^[0-9a-f]{64}$'),
  content jsonb not null check (octet_length(content::text) <= 1048576),
  created_at timestamptz not null default now(),
  primary key (owner_id, report_id),
  foreign key (owner_id, scan_id) references public.scans(owner_id, scan_id) on delete cascade
);
create index insight_reports_scan on public.insight_reports(owner_id, scan_id, created_at desc);
alter table public.insight_reports enable row level security;
create policy own_insight_reports_read on public.insight_reports for select to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.insight_reports from anon, authenticated;
grant select on public.insight_reports to authenticated;

-- The API independently verifies trusted derivation on finalisation AND retrieval.
-- A user JWT can call this RPC directly: storage is not an attestation of server origin.
create function public.finalize_insight_report(p_content jsonb, p_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid := (p_content->'originalScan'->>'scanId')::uuid;
  v_source public.scans%rowtype;
  v_count integer;
begin
  if v_owner is null then raise insufficient_privilege; end if;
  if octet_length(p_content::text) > 1048576 then
    raise sqlstate 'PGRST' using message = '{"code":"INSIGHTS_TOO_LARGE","message":"Combined report exceeds 1 MiB","details":null,"hint":null}', detail = '{"status":413}';
  end if;
  if p_hash !~ '^[0-9a-f]{64}$' or p_content->>'version' <> 'vynlt-frozen-insights-v1' then raise exception 'Invalid report identity'; end if;
  select * into v_source from public.scans where owner_id = v_owner and scan_id = v_id for key share;
  if not found or v_source.report is distinct from p_content->'originalScan' or v_source.report_hash is distinct from p_content->>'originalScanHash' then raise exception 'Source scan mismatch'; end if;
  insert into public.insight_reports(owner_id, scan_id, report_id, content) values (v_owner, v_id, p_hash, p_content) on conflict do nothing;
  get diagnostics v_count = row_count;
  if exists (select 1 from public.insight_reports where owner_id = v_owner and report_id = p_hash and content is distinct from p_content) then raise exception 'Report hash conflict'; end if;
  return v_count = 1;
end;
$$;
revoke all on function public.finalize_insight_report(jsonb,text) from public, anon;
grant execute on function public.finalize_insight_report(jsonb,text) to authenticated;
commit;

-- Apply in the Supabase SQL editor. Uses Supabase Auth; no service-role key in the app.
begin;
create table public.sites (
  owner_id uuid not null references auth.users(id) on delete cascade,
  origin text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, origin)
);
create table public.scans (
  owner_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid not null,
  origin text not null,
  scanned_at timestamptz not null,
  received_at timestamptz not null default now(),
  report jsonb not null,
  report_hash text not null check (report_hash ~ '^[0-9a-f]{64}$'),
  primary key (owner_id, scan_id),
  foreign key (owner_id, origin) references public.sites(owner_id, origin)
);
create index scans_owner_time on public.scans(owner_id, scanned_at desc);
create table public.findings (
  owner_id uuid not null,
  scan_id uuid not null,
  finding_id text not null,
  rule_id text not null,
  severity text not null check (severity in ('critical','high','medium','low','info')),
  confidence text not null check (confidence in ('high','medium','low')),
  evidence jsonb not null,
  primary key(owner_id, scan_id, finding_id),
  foreign key(owner_id, scan_id) references public.scans(owner_id, scan_id) on delete cascade
);
create table public.feedback (
  owner_id uuid not null,
  scan_id uuid not null,
  finding_id text not null,
  verdict text not null check (verdict in ('open','fixed','accepted_risk','false_positive')),
  notes text not null default '' check (length(notes) <= 1000),
  updated_at timestamptz not null default now(),
  primary key(owner_id, scan_id, finding_id),
  foreign key(owner_id, scan_id) references public.scans(owner_id, scan_id) on delete cascade,
  foreign key(owner_id, scan_id, finding_id) references public.findings(owner_id, scan_id, finding_id) on delete cascade
);
alter table public.sites enable row level security;
alter table public.scans enable row level security;
alter table public.findings enable row level security;
alter table public.feedback enable row level security;
create policy own_sites on public.sites for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_scans_read on public.scans for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_scans_delete on public.scans for delete to authenticated using ((select auth.uid()) = owner_id);
create policy own_findings on public.findings for select to authenticated using ((select auth.uid()) = owner_id);
create policy own_feedback on public.feedback for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
revoke all on public.sites, public.scans, public.findings, public.feedback from anon, authenticated;
grant select on public.sites, public.scans, public.findings to authenticated;
grant delete on public.scans to authenticated;
grant select, insert, update, delete on public.feedback to authenticated;

-- Atomic, immutable ingestion. Owner is taken only from verified Supabase Auth.
-- SECURITY DEFINER is limited to this function; callers cannot update scan rows directly.
create function public.ingest_scan(p_report jsonb, p_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_id uuid := (p_report->>'scanId')::uuid;
  v_origin text;
  v_old_hash text;
  v_item jsonb;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if octet_length(p_report::text) > 524288 or p_hash !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_report->'findings') is distinct from 'array'
    or jsonb_typeof(p_report->'observation') is distinct from 'object' then
    raise exception 'Invalid report' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_owner::text || v_id::text, 0));
  select report_hash into v_old_hash from public.scans where owner_id = v_owner and scan_id = v_id;
  if found then
    if v_old_hash <> p_hash then raise exception 'Immutable report conflict' using errcode = '23505'; end if;
    return false;
  end if;
  v_origin := substring(p_report->'observation'->>'url' from '^https?://[^/]+');
  if v_origin is null then raise exception 'HTTP(S) report URL required' using errcode = '22023'; end if;
  insert into public.sites(owner_id, origin) values(v_owner, v_origin) on conflict do nothing;
  insert into public.scans(owner_id, scan_id, origin, scanned_at, report, report_hash)
    values(v_owner, v_id, v_origin, (p_report->'observation'->>'scannedAt')::timestamptz, p_report, p_hash);
  for v_item in select value from pg_catalog.jsonb_array_elements(p_report->'findings') loop
    insert into public.findings(owner_id, scan_id, finding_id, rule_id, severity, confidence, evidence)
      values(v_owner, v_id, v_item->>'id', v_item->>'ruleId', v_item->>'severity', v_item->>'confidence', v_item->'evidence');
  end loop;
  return true;
end;
$$;
revoke all on function public.ingest_scan(jsonb,text) from public, anon;
grant execute on function public.ingest_scan(jsonb,text) to authenticated;
commit;

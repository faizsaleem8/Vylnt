-- Apply after 001_initial.sql. No report or evidence is rewritten.
begin;

create index if not exists scans_owner_page on public.scans(owner_id, scanned_at desc, scan_id desc);
create index if not exists scans_owner_origin_page on public.scans(owner_id, origin, scanned_at desc, scan_id desc);

-- A projection only: no table access and no evidence/feedback in list responses.
create or replace function public.scan_summary(p_report jsonb, p_hash text, p_received_at timestamptz)
returns jsonb language sql stable strict security invoker set search_path = '' as $$
  select jsonb_build_object(
    'scanId', p_report->'scanId', 'url', p_report->'observation'->'url',
    'scannedAt', p_report->'observation'->'scannedAt', 'score', p_report->'score',
    'findingCount', jsonb_array_length(p_report->'findings'),
    'highCount', (select count(*) from jsonb_array_elements(p_report->'findings') f where f->>'severity' in ('high', 'critical')),
    'coverage', jsonb_build_object('headers', (p_report->'observation') ? 'headers',
      'dom', p_report->'observation'->'domCollected', 'cookies', (p_report->'observation') ? 'cookies'),
    'hash', p_hash, 'receivedAt', p_received_at);
$$;

-- Return one JSON object, so PostgREST's row cap does not truncate totals.
-- Stable functions keep counts and their page in the same statement snapshot.
create or replace function public.list_scan_page(p_page integer default 1, p_limit integer default 50)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_page is null or p_page < 1 or p_page > 10000 or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid page or limit' using errcode = '22023';
  end if;
  return jsonb_build_object('page', p_page, 'limit', p_limit,
    'total', (select count(*) from public.scans where owner_id = (select auth.uid())),
    'scans', coalesce((select jsonb_agg(public.scan_summary(s.report, s.report_hash, s.received_at) order by s.scanned_at desc, s.scan_id desc)
      from (select report, report_hash, received_at, scanned_at, scan_id from public.scans
        where owner_id = (select auth.uid()) order by scanned_at desc, scan_id desc
        limit p_limit offset (p_page - 1) * p_limit) s), '[]'::jsonb));
end;
$$;

create or replace function public.list_site_page(p_page integer default 1, p_limit integer default 50)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_page is null or p_page < 1 or p_page > 10000 or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid page or limit' using errcode = '22023';
  end if;
  with latest as materialized (
    select distinct on (origin) origin, scanned_at, scan_id, report, report_hash, received_at
    from public.scans where owner_id = (select auth.uid()) order by origin, scanned_at desc, scan_id desc
  ), counts as (
    select origin, count(*) as scan_count from public.scans where owner_id = (select auth.uid()) group by origin
  ), page_rows as (
    select * from latest order by scanned_at desc, scan_id desc limit p_limit offset (p_page - 1) * p_limit
  )
  select jsonb_build_object('page', p_page, 'limit', p_limit, 'total', (select count(*) from latest),
    'overview', jsonb_build_object(
      'latestHigh', (select count(*) from latest l cross join lateral jsonb_array_elements(l.report->'findings') f where f->>'severity' in ('high', 'critical')),
      'averageScore', (select round(avg((report->>'score')::numeric)) from latest)),
    'sites', coalesce((select jsonb_agg(jsonb_build_object('origin', p.origin, 'scanCount', c.scan_count,
      'latest', public.scan_summary(p.report, p.report_hash, p.received_at)) order by p.scanned_at desc, p.scan_id desc)
      from page_rows p join counts c using (origin)), '[]'::jsonb)) into result;
  return result;
end;
$$;

revoke all on function public.scan_summary(jsonb, text, timestamptz) from public, anon;
revoke all on function public.list_scan_page(integer, integer) from public, anon;
revoke all on function public.list_site_page(integer, integer) from public, anon;
grant execute on function public.scan_summary(jsonb, text, timestamptz) to authenticated;
grant execute on function public.list_scan_page(integer, integer) to authenticated;
grant execute on function public.list_site_page(integer, integer) to authenticated;
notify pgrst, 'reload schema';
commit;

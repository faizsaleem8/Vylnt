-- Apply after 002_pagination.sql. Compare candidates share the exact sanitized page URL.
begin;
create or replace function public.list_comparison_page(p_scan_id uuid, p_page integer default 1, p_limit integer default 50)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare target_url text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_page is null or p_page < 1 or p_page > 10000 or p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid page or limit' using errcode = '22023';
  end if;
  select report->'observation'->>'url' into target_url from public.scans
    where owner_id = (select auth.uid()) and scan_id = p_scan_id;
  if not found then return null; end if;
  return jsonb_build_object('page', p_page, 'limit', p_limit,
    'total', (select count(*) from public.scans where owner_id = (select auth.uid()) and scan_id <> p_scan_id and report->'observation'->>'url' = target_url),
    'scans', coalesce((select jsonb_agg(public.scan_summary(s.report, s.report_hash, s.received_at) order by s.scanned_at desc, s.scan_id desc)
      from (select report, report_hash, received_at, scanned_at, scan_id from public.scans
        where owner_id = (select auth.uid()) and scan_id <> p_scan_id and report->'observation'->>'url' = target_url
        order by scanned_at desc, scan_id desc limit p_limit offset (p_page - 1) * p_limit) s), '[]'::jsonb));
end;
$$;
revoke all on function public.list_comparison_page(uuid, integer, integer) from public, anon;
grant execute on function public.list_comparison_page(uuid, integer, integer) to authenticated;
notify pgrst, 'reload schema';
commit;

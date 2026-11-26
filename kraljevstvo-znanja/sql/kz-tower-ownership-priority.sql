-- Tower ownership is independent of tower geometry.
-- Ordinary claims use earliest adjacent occupation; conquests override, most recent conquest wins.
select pg_advisory_xact_lock(770077003);
alter table public.kz_cells add column if not exists captured_at timestamptz;
-- Backfill only confirmed full-block captures that still match their acquisition transaction.
update public.kz_cells c set captured_at=c.created_at
where c.captured_at is null and exists(
 select 1 from public.kz_moves m where m.action='attack' and m.added_m2=20
 and m.kingdom_id=c.kingdom_id and m.created_at=c.created_at
 and c.x between m.at_x and m.at_x+4 and c.y between m.at_y and m.at_y+3);
create or replace function kz_private.mark_cell_capture()
returns trigger language plpgsql set search_path='' as $$
begin
 if old.kingdom_id is distinct from new.kingdom_id then
  new.captured_at:=clock_timestamp();
  -- All cells changed in this statement share the same priority.
  new.captured_at:=statement_timestamp();
 end if;
 return new;
end $$;
drop trigger if exists kz_mark_cell_capture on public.kz_cells;
create trigger kz_mark_cell_capture before update of kingdom_id on public.kz_cells
for each row execute function kz_private.mark_cell_capture();

-- Canonical resolver for future server-side flag ownership checks.
-- Only call for an actual tower location; the function does not create towers.
create or replace function kz_private.tower_owner(p_x bigint,p_y bigint)
returns uuid language sql stable set search_path='' as $$
 select c.kingdom_id from public.kz_cells c
 where c.x in(p_x-1,p_x) and c.y in(p_y-1,p_y)
 order by c.captured_at desc nulls last,c.created_at asc,c.kingdom_id asc
 limit 1
$$;
revoke all on function kz_private.tower_owner(bigint,bigint) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kz_map(p_min_x bigint DEFAULT NULL::bigint, p_max_x bigint DEFAULT NULL::bigint, p_min_y bigint DEFAULT NULL::bigint, p_max_y bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
select jsonb_build_object(
 'kingdoms',(select coalesce(jsonb_agg(jsonb_build_object('id',k.id,'name',k.name,'color',k.color,
  'area',k.area_m2,'anchor_x',a.x,'anchor_y',a.y,'members',
  (select count(*) from public.kz_members where kingdom_id=k.id)) order by k.area_m2 desc),'[]'::jsonb)
  from public.kz_kingdoms k
  left join lateral (select x,y from public.kz_cells where kingdom_id=k.id order by created_at desc limit 1) a on true),
 'cells',(select coalesce(jsonb_agg(jsonb_build_object('x',t.x,'y',t.y,'k',t.kingdom_id,'t',floor(extract(epoch from t.created_at)*1000000)::bigint,'a',case when t.captured_at is not null then floor(extract(epoch from t.captured_at)*1000000)::bigint end)),'[]'::jsonb)
 from (select x,y,kingdom_id,created_at,captured_at from public.kz_cells
   where p_min_x is not null and p_max_x is not null and p_min_y is not null and p_max_y is not null
    and x between p_min_x and p_max_x and y between p_min_y and p_max_y
   limit 8000) t));
$function$
;

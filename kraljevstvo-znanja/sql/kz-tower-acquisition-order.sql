-- Use actual acquisition time after the territory lock, rather than transaction start.
select pg_advisory_xact_lock(770077003);
alter table public.kz_cells add column if not exists tower_claimed_at timestamptz;
update public.kz_cells set tower_claimed_at=created_at where tower_claimed_at is null;
alter table public.kz_cells alter column tower_claimed_at set default clock_timestamp();
alter table public.kz_cells alter column tower_claimed_at set not null;
create or replace function kz_private.mark_cell_capture()
returns trigger language plpgsql set search_path='' as $$
begin
 if old.kingdom_id is distinct from new.kingdom_id then
  new.tower_claimed_at:=clock_timestamp();
  new.captured_at:=new.tower_claimed_at;
 end if;
 return new;
end $$;
create or replace function kz_private.tower_owner(p_x bigint,p_y bigint)
returns uuid language sql stable set search_path='' as $$
 select c.kingdom_id from public.kz_cells c
 where c.x in(p_x-1,p_x) and c.y in(p_y-1,p_y)
 order by c.captured_at desc nulls last,c.tower_claimed_at asc,c.kingdom_id asc
 limit 1
$$;
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
 'cells',(select coalesce(jsonb_agg(jsonb_build_object('x',t.x,'y',t.y,'k',t.kingdom_id,'t',floor(extract(epoch from t.tower_claimed_at)*1000000)::bigint,'a',case when t.captured_at is not null then floor(extract(epoch from t.captured_at)*1000000)::bigint end)),'[]'::jsonb)
 from (select x,y,kingdom_id,tower_claimed_at,captured_at from public.kz_cells
   where p_min_x is not null and p_max_x is not null and p_min_y is not null and p_max_y is not null
    and x between p_min_x and p_max_x and y between p_min_y and p_max_y
   limit 8000) t));
$function$
;

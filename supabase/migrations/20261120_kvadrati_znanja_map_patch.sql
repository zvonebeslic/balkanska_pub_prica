
-- Na GPS uporištu prvi kvadrat mora sadržavati samu GPS točku,
-- a svih 20 ćelija ostaju zbijene u pravokutnik 5 x 4 oko nje.
do $fix$
declare v_old text; v_new text;
begin
 select pg_get_functiondef('public.kz_place(uuid,text,bigint,bigint,text,integer,boolean,double precision,double precision,double precision)'::regprocedure) into v_old;
 v_new:=replace(v_old,
   'v_xx:=v_tx+(v_i/4)-2; v_yy:=v_ty+(v_i%4)-2;',
   'v_xx:=v_tx+(((v_i+12)%20)%5)-2; v_yy:=v_ty+(((v_i+12)%20)/5)-2;');
 if v_old=v_new then raise exception 'GPS patch nije pronađen u funkciji kz_place'; end if;
 execute v_new;
end $fix$;
create index if not exists kz_cells_by_realm_time on public.kz_cells(kingdom_id,created_at desc);
-- Oznaka je na postojećem kvadratu kraljevstva, čak i ako mu je
-- izvorna GPS lokacija u međuvremenu osvojena.
create or replace function public.kz_map(p_min_x bigint default null,p_max_x bigint default null,
p_min_y bigint default null,p_max_y bigint default null)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
select jsonb_build_object(
 'kingdoms',(select coalesce(jsonb_agg(jsonb_build_object('id',k.id,'name',k.name,'color',k.color,
  'area',k.area_m2,'anchor_x',a.x,'anchor_y',a.y,'members',
  (select count(*) from public.kz_members where kingdom_id=k.id)) order by k.area_m2 desc),'[]'::jsonb)
  from public.kz_kingdoms k
  left join lateral (select x,y from public.kz_cells where kingdom_id=k.id order by created_at desc limit 1) a on true),
 'cells',(select coalesce(jsonb_agg(jsonb_build_object('x',t.x,'y',t.y,'k',t.kingdom_id)),'[]'::jsonb)
 from (select x,y,kingdom_id from public.kz_cells
   where p_min_x is not null and p_max_x is not null and p_min_y is not null and p_max_y is not null
    and x between p_min_x and p_max_x and y between p_min_y and p_max_y
   limit 8000) t));
$$;
revoke all on function public.kz_map(bigint,bigint,bigint,bigint) from public;
grant execute on function public.kz_map(bigint,bigint,bigint,bigint) to anon,authenticated;

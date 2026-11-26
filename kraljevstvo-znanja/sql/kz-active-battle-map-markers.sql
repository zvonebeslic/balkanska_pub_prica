-- Public map markers, without any question, answer, or private player data.
alter table kz_private.territory_duels add column if not exists activity_at timestamptz;
update kz_private.territory_duels set activity_at=greatest(created_at,coalesce(deadline,created_at)) where activity_at is null;
alter table kz_private.territory_duels alter column activity_at set default clock_timestamp();
alter table kz_private.territory_duels alter column activity_at set not null;
create or replace function kz_private.touch_battle_activity() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.status is distinct from old.status or new.hits is distinct from old.hits
    or new.misses is distinct from old.misses or new.deadline is distinct from old.deadline then
   new.activity_at:=clock_timestamp();
 end if;
 return new;
end $$;
drop trigger if exists kz_battle_activity on kz_private.territory_duels;
create trigger kz_battle_activity before update on kz_private.territory_duels
for each row execute function kz_private.touch_battle_activity();
create index if not exists kz_active_battle_activity_idx on kz_private.territory_duels(activity_at) where status='active';

create or replace function public.kz_active_battles()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',d.id,'x',d.x,'y',d.y,'attacker',a.name,'defender',b.name,
  'remaining_ms',greatest(0,floor(extract(epoch from (greatest(d.activity_at,coalesce(d.deadline,d.activity_at))+interval '2 minutes'-now()))*1000))
 ) order by d.created_at),'[]'::jsonb)
 from kz_private.territory_duels d
 join public.kz_kingdoms a on a.id=d.attacker
 join public.kz_kingdoms b on b.id=d.defender
 where d.status='active'
 and greatest(d.activity_at,coalesce(d.deadline,d.activity_at))>now()-interval '2 minutes'
 and (select count(*) from public.kz_cells c where c.kingdom_id=d.defender and c.x between d.x and d.x+4 and c.y between d.y and d.y+3)=20
 and exists(select 1 from public.kz_cells c where c.kingdom_id=d.attacker and
 ((c.x in(d.x-1,d.x+5) and c.y between d.y and d.y+3) or
 (c.y in(d.y-1,d.y+4) and c.x between d.x and d.x+4)));
$$;
revoke all on function public.kz_active_battles() from public;
grant execute on function public.kz_active_battles() to anon,authenticated;

-- Zajednicke oznake koordinata za clanove Kraljevstva znanja.
-- Izvedeno na Supabase projektu hssfjguysejbosvholqu.

create table if not exists public.kz_coordinate_notes (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kz_kingdoms(id) on delete cascade,
  created_by uuid references public.kz_players(id) on delete set null,
  x bigint not null,
  y bigint not null,
  title text not null check (char_length(btrim(title)) between 1 and 90),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kz_coordinate_notes_realm_xy unique (kingdom_id,x,y),
  constraint kz_coordinate_notes_world_bounds check (x between -3500000 and 3500000 and y between -1800000 and 1800000)
);
create index if not exists kz_coordinate_notes_kingdom_idx on public.kz_coordinate_notes(kingdom_id,created_at desc);
alter table public.kz_coordinate_notes enable row level security;
revoke all on public.kz_coordinate_notes from public, anon, authenticated;
create or replace function public.kz_coord_list(p_guest_id uuid,p_guest_secret text)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare v_player uuid; v_kingdom uuid; v_role text;
begin
  v_player := public.kz_who(p_guest_id,p_guest_secret);
  select kingdom_id,role into v_kingdom,v_role from public.kz_members where player_id=v_player;
  if v_kingdom is null then return '[]'::jsonb; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',n.id,'x',n.x,'y',n.y,'title',n.title,'description',n.description,
      'can_delete',(n.created_by=v_player or v_role='kralj')
    ) order by n.created_at desc),'[]'::jsonb)
    from public.kz_coordinate_notes n where n.kingdom_id=v_kingdom
  );
end $$;
create or replace function public.kz_coord_save(
  p_guest_id uuid,p_guest_secret text,p_x bigint,p_y bigint,p_title text,p_description text default ''
)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare v_player uuid; v_kingdom uuid; v_note public.kz_coordinate_notes%rowtype;
begin
  v_player := public.kz_who(p_guest_id,p_guest_secret);
  select kingdom_id into v_kingdom from public.kz_members where player_id=v_player;
  if v_kingdom is null then raise exception 'Za spremanje lokacije moraš biti član kraljevstva.'; end if;
  if p_x is null or p_y is null or p_x not between -3500000 and 3500000
    or p_y not between -1800000 and 1800000 then
    raise exception 'Koordinate su izvan dopuštenog raspona.';
  end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 90 then
    raise exception 'Upiši naziv lokacije (1–90 znakova).';
  end if;
  if length(coalesce(p_description,'')) > 500 then
    raise exception 'Opis može imati najviše 500 znakova.';
  end if;
  if not exists(select 1 from public.kz_coordinate_notes
    where kingdom_id=v_kingdom and x=p_x and y=p_y)
    and (select count(*) from public.kz_coordinate_notes where kingdom_id=v_kingdom)>=200 then
    raise exception 'Kraljevstvo može spremiti najviše 200 lokacija.';
  end if;
  insert into public.kz_coordinate_notes(kingdom_id,created_by,x,y,title,description)
    values(v_kingdom,v_player,p_x,p_y,btrim(p_title),btrim(coalesce(p_description,'')))
  on conflict (kingdom_id,x,y) do update set
    title=excluded.title,description=excluded.description,
    updated_at=now()
  returning * into v_note;
  return jsonb_build_object('id',v_note.id,'x',v_note.x,'y',v_note.y,
    'title',v_note.title,'description',v_note.description);
end $$;
create or replace function public.kz_coord_delete(p_guest_id uuid,p_guest_secret text,p_id uuid)
returns boolean language plpgsql security definer set search_path = public,pg_temp as $$
declare v_player uuid; v_kingdom uuid; v_role text;
begin
  v_player := public.kz_who(p_guest_id,p_guest_secret);
  select kingdom_id,role into v_kingdom,v_role from public.kz_members where player_id=v_player;
  if v_kingdom is null then raise exception 'Nisi član kraljevstva.'; end if;
  delete from public.kz_coordinate_notes n
    where n.id=p_id and n.kingdom_id=v_kingdom
    and (n.created_by=v_player or v_role='kralj');
  if not found then raise exception 'Lokacija nije pronađena ili je ne možeš obrisati.'; end if;
  return true;
end $$;
revoke all on function public.kz_coord_list(uuid,text) from public,anon,authenticated;
revoke all on function public.kz_coord_save(uuid,text,bigint,bigint,text,text) from public,anon,authenticated;
revoke all on function public.kz_coord_delete(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.kz_coord_list(uuid,text) to anon,authenticated;
grant execute on function public.kz_coord_save(uuid,text,bigint,bigint,text,text) to anon,authenticated;
grant execute on function public.kz_coord_delete(uuid,text,uuid) to anon,authenticated;

create schema if not exists kz_private;
revoke all on schema kz_private from public, anon, authenticated;
create table if not exists kz_private.territory_duels (
 id uuid primary key default gen_random_uuid(), attacker uuid not null references public.kz_kingdoms(id) on delete cascade,
 defender uuid not null references public.kz_kingdoms(id) on delete cascade,
 x bigint not null,y bigint not null,questions text[] not null check(cardinality(questions)=8),
 position integer not null default 1 check(position between 1 and 8),
 hits integer not null default 0,misses integer not null default 0,deadline timestamptz,
 attack_loss bigint not null default 0,defense_loss bigint not null default 0,
 status text not null default 'active' check(status in ('active','won','lost','invalid')),
 created_at timestamptz not null default now()
);
alter table kz_private.territory_duels enable row level security;
revoke all on kz_private.territory_duels from public,anon,authenticated;
create unique index if not exists territory_duels_one_active on kz_private.territory_duels(attacker) where status='active';

create or replace function public.kz_territory_duel(
 p_guest_id uuid,p_guest_secret text,p_action text,p_x bigint default null,p_y bigint default null,
 p_id uuid default null,p_number integer default null,p_choice text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 player uuid; king uuid; enemy uuid; d kz_private.territory_duels%rowtype;
 q public.kz_questions%rowtype; ids text[]; bank bigint; enemy_count integer;
 right_answer boolean; timed_out boolean; previous_key text; loss bigint; response jsonb; adjacent boolean;
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 perform pg_advisory_xact_lock(770077003);
 select kingdom_id into king from public.kz_members where player_id=player and role='kralj';
 if king is null then
   if p_action='resume' then return null; end if;
   raise exception 'Samo kralj kvizaš može pokrenuti okršaj';
 end if;
 if coalesce(p_action,'') not in ('start','resume','answer') then raise exception 'Nepoznata radnja'; end if;
 select * into d from kz_private.territory_duels where attacker=king and status='active' for update;
 if not found then
   if p_action='resume' then return null; end if;
   if p_action='answer' then raise exception 'Okršaj više nije aktivan'; end if;
   if p_x is null or p_y is null or mod(p_x,5)<>0 or mod(p_y,4)<>0 then raise exception 'Blok nije poravnat'; end if;
   select c.kingdom_id,count(*) into enemy,enemy_count from public.kz_cells c
    where c.x between p_x and p_x+4 and c.y between p_y and p_y+3
    group by c.kingdom_id order by count(*) desc limit 1;
   if enemy is null or enemy=king or enemy_count<>20 then raise exception 'Odaberi cijeli protivnički blok od 20 m²'; end if;
   if not exists(select 1 from public.kz_cells c where c.kingdom_id=king and
    ((c.x in(p_x-1,p_x+5) and c.y between p_y and p_y+3) or
     (c.y in(p_y-1,p_y+4) and c.x between p_x and p_x+4))) then raise exception 'Napad mora dodirivati tvoju granicu'; end if;
   perform 1 from public.kz_kingdoms where id in(king,enemy) order by id for update;
   select bank_m2 into bank from public.kz_kingdoms where id=king;
   if bank<100 then raise exception 'Za napad treba 100 m² na kontu'; end if;
   select array_agg(s.id order by s.r) into ids from
     (select id,random() r from public.kz_questions where correct_key in('A','B','C') and options ?& array['A','B','C'] order by r limit 8) s;
   if coalesce(cardinality(ids),0)<>8 then raise exception 'Nema dovoljno pitanja'; end if;
   update public.kz_kingdoms set bank_m2=bank_m2-100 where id=king;
   insert into kz_private.territory_duels(attacker,defender,x,y,questions)
     values(king,enemy,p_x,p_y,ids) returning * into d;
 end if;
 perform 1 from public.kz_kingdoms where id in(d.attacker,d.defender) order by id for update;
 select count(*) into enemy_count from public.kz_cells c where c.kingdom_id=d.defender
  and c.x between d.x and d.x+4 and c.y between d.y and d.y+3;
 select exists(select 1 from public.kz_cells c where c.kingdom_id=king and
  ((c.x in(d.x-1,d.x+5) and c.y between d.y and d.y+3) or
   (c.y in(d.y-1,d.y+4) and c.x between d.x and d.x+4))) into adjacent;
 if enemy_count<>20 or not adjacent then
   update kz_private.territory_duels set status='invalid' where id=d.id returning * into d;
   update public.kz_kingdoms set bank_m2=bank_m2+100 where id=king;
 elsif p_action='answer' then
   if p_id is distinct from d.id or p_number is distinct from d.position or d.deadline is null then
     raise exception 'Pitanja se rješavaju redom i samo jednom';
   end if;
   if coalesce(p_choice,'') not in('A','B','C','SKIP') then raise exception 'Neispravan odgovor'; end if;
   select * into q from public.kz_questions where id=d.questions[d.position];
   previous_key:=q.correct_key;
   timed_out:=p_choice='SKIP' or clock_timestamp()>=d.deadline;
   right_answer:=not timed_out and p_choice=q.correct_key;
   if right_answer then
     select least(20,bank_m2) into loss from public.kz_kingdoms where id=d.defender;
     update public.kz_kingdoms set bank_m2=bank_m2-loss where id=d.defender;
     d.defense_loss:=d.defense_loss+loss;d.hits:=d.hits+1;
   else
     select least(20,bank_m2) into loss from public.kz_kingdoms where id=king;
     update public.kz_kingdoms set bank_m2=bank_m2-loss where id=king;
     d.attack_loss:=d.attack_loss+loss;d.misses:=d.misses+1;
   end if;
   if d.hits=3 then
     update public.kz_cells set kingdom_id=king,created_at=now()
      where kingdom_id=d.defender and x between d.x and d.x+4 and y between d.y and d.y+3;
     update public.kz_kingdoms set area_m2=area_m2-20 where id=d.defender;
     update public.kz_kingdoms set area_m2=area_m2+20,bank_m2=bank_m2+100 where id=king;
     insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,previous_kingdom,at_x,at_y)
       values(king,player,'attack',100,20,d.defender,d.x,d.y);
     d.status:='won';
   elsif d.position=8 then d.status:='lost';
   else d.position:=d.position+1;
   end if;
   update kz_private.territory_duels set position=d.position,hits=d.hits,misses=d.misses,
     attack_loss=d.attack_loss,defense_loss=d.defense_loss,status=d.status,deadline=null where id=d.id returning * into d;
 end if;
 response:=jsonb_build_object('id',d.id,'position',d.position,'hits',d.hits,'misses',d.misses,
  'attack_loss',d.attack_loss,'defense_loss',d.defense_loss,'status',d.status,'x',d.x,'y',d.y,
  'correct',right_answer,'correct_key',previous_key,'timed_out',timed_out,'loss',loss,
  'reward',case when d.status='won' then 100 else 0 end);
 if d.status='active' and p_action<>'answer' then
   select * into q from public.kz_questions where id=d.questions[d.position];
   if d.deadline is null then
     update kz_private.territory_duels set deadline=clock_timestamp()+make_interval(secs=>public.kz_question_seconds(q.prompt))
      where id=d.id returning * into d;
   end if;
   response:=response||jsonb_build_object('prompt',q.prompt,'options',q.options,'image',q.image,
    'remaining_ms',greatest(0,floor(extract(epoch from d.deadline-clock_timestamp())*1000)));
 end if;
 return response;
end $$;
revoke all on function public.kz_territory_duel(uuid,text,text,bigint,bigint,uuid,integer,text) from public;
grant execute on function public.kz_territory_duel(uuid,text,text,bigint,bigint,uuid,integer,text) to anon,authenticated;
CREATE OR REPLACE FUNCTION public.kz_place_block(p_guest_id uuid, p_guest_secret text, p_x bigint, p_y bigint, p_spawn boolean DEFAULT false, p_lat double precision DEFAULT NULL::double precision, p_lon double precision DEFAULT NULL::double precision, p_accuracy double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_player uuid;v_king uuid;v_bank bigint;v_area bigint;v_total bigint;
 v_first boolean;v_enemy uuid;v_enemy_count integer;v_own_count integer;
 v_occupied integer;v_touched boolean;
begin
 perform pg_advisory_xact_lock(770077003);
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into v_king from public.kz_members where player_id=v_player and role='kralj';
 if v_king is null then raise exception 'Samo kralj kvizaš može osvajati teritorij'; end if;
 if p_x is null or p_y is null or mod(p_x,5)<>0 or mod(p_y,4)<>0 then
   raise exception 'Blok nije poravnat u globalnoj mreži 5×4 m'; end if;
 select bank_m2,area_m2 into v_bank,v_area from public.kz_kingdoms where id=v_king for update;
 v_first:=v_area=0;
 -- Prvi blok i svako novo uporište moraju biti na GPS lokaciji.
 if v_first or coalesce(p_spawn,false) then
   if p_lat is null or p_lon is null or p_accuracy is null
      or p_lat not between -85 and 85 or p_lon not between -180 and 180
      or p_accuracy not between 0 and 100 then
     raise exception 'Za prvo ili novo uporište uključi precizan GPS (do 100 m).';
   end if;
   if p_x <> (floor(6371007.181 * (sqrt(3.0::double precision)/2) * radians(p_lon) / 5)::bigint * 5)
      or p_y <> (floor(6371007.181 / (sqrt(3.0::double precision)/2) * sin(radians(p_lat)) / 4)::bigint * 4) then
     raise exception 'Novo uporište mora biti točno na tvojoj GPS lokaciji.';
   end if;
 end if;
 -- Udaljena uporišta su dopuštena isključivo na GPS lokaciji.
 -- Sva ostala širenja, uključujući napade, zahtijevaju dodir s vlastitim rubom.
 if not (coalesce(p_spawn,false) or v_first) then
   -- Kandidat mora cijelom svojom stranom barem na jednom mjestu dodirivati
   -- ranije osvojene kvadrate istog kraljevstva, uključujući stare 1 m² teritorije.
   select exists(
      select 1 from public.kz_cells c where c.kingdom_id=v_king
       and (
        (c.x=p_x-1 and c.y between p_y and p_y+3) or
        (c.x=p_x+5 and c.y between p_y and p_y+3) or
        (c.y=p_y-1 and c.x between p_x and p_x+4) or
        (c.y=p_y+4 and c.x between p_x and p_x+4)
       )
   ) into v_touched;
   if not v_touched then raise exception 'Blok mora dodirivati tvoju granicu; novo uporište zahtijeva GPS'; end if;

 end if;
 select count(*),count(*) filter(where kingdom_id=v_king),
    count(*) filter(where kingdom_id<>v_king)
 into v_occupied,v_own_count,v_enemy_count
 from public.kz_cells where x between p_x and p_x+4 and y between p_y and p_y+3;
 if v_own_count>0 then raise exception 'Ne možeš postaviti novi blok preko vlastitog teritorija'; end if;
 if v_enemy_count>0 then
   raise exception 'Za tuđi blok pokreni Okršaj znanja u novoj verziji igre';
   -- Udaljeno uporište ne smije preskakati obranu: napad mora dodirivati
   -- postojeći teritorij napadača bez obzira na p_spawn.
   if not exists(
      select 1 from public.kz_cells c where c.kingdom_id=v_king
        and ((c.x=p_x-1 and c.y between p_y and p_y+3)
         or (c.x=p_x+5 and c.y between p_y and p_y+3)
         or (c.y=p_y-1 and c.x between p_x and p_x+4)
         or (c.y=p_y+4 and c.x between p_x and p_x+4))
   ) then raise exception 'Napad mora dodirivati tvoju granicu'; end if;
   if v_enemy_count<>20 then raise exception 'Za napad izaberi cijeli suparnički blok od 20 m²'; end if;
   select kingdom_id into v_enemy from public.kz_cells
     where x between p_x and p_x+4 and y between p_y and p_y+3 limit 1;
   if (select count(distinct kingdom_id) from public.kz_cells
       where x between p_x and p_x+4 and y between p_y and p_y+3)<>1
      then raise exception 'Blok prelazi granicu više kraljevstava'; end if;
 end if;
 -- Slobodni blok: 20 m² iz salda. Tuđi puni blok: napad košta 100 m² i uzima 20 m².
 if v_bank<(case when v_enemy is null then 20 else 100 end) then
   raise exception 'Nema dovoljno m² na kontu za ovaj potez'; end if;
 if v_enemy is null then
   insert into public.kz_cells(x,y,kingdom_id)
   select p_x+dx,p_y+dy,v_king from generate_series(0,4) dx cross join generate_series(0,3) dy;
 else
   update public.kz_cells set kingdom_id=v_king,created_at=now()
   where x between p_x and p_x+4 and y between p_y and p_y+3 and kingdom_id=v_enemy;
   update public.kz_kingdoms set area_m2=area_m2-20 where id=v_enemy;
 end if;
 update public.kz_kingdoms set area_m2=area_m2+20,
   bank_m2=bank_m2-(case when v_enemy is null then 20 else 100 end),
   anchor_x=coalesce(anchor_x,p_x+2),anchor_y=coalesce(anchor_y,p_y+2)
 where id=v_king returning area_m2 into v_total;
 insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,
 previous_kingdom,at_x,at_y)
 values(v_king,v_player,case when v_enemy is not null then 'attack'
 when p_spawn or v_first then 'spawn' else 'claim' end,
 case when v_enemy is null then 20 else 100 end,20,v_enemy,p_x,p_y);
 return jsonb_build_object('added',20,'spent',case when v_enemy is null then 20 else 100 end,
 'new_area',v_total,'attack',v_enemy is not null,'block_x',p_x,'block_y',p_y);
end $function$
;
CREATE OR REPLACE FUNCTION public.kz_place(p_guest_id uuid, p_guest_secret text, p_from_x bigint DEFAULT NULL::bigint, p_from_y bigint DEFAULT NULL::bigint, p_direction text DEFAULT NULL::text, p_size integer DEFAULT 20, p_spawn boolean DEFAULT false, p_lat double precision DEFAULT NULL::double precision, p_lon double precision DEFAULT NULL::double precision, p_accuracy double precision DEFAULT NULL::double precision, p_shape text DEFAULT 'blok'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_player uuid; v_king uuid; v_bank bigint; v_area bigint; v_total bigint;
 v_x bigint; v_y bigint; v_tx bigint; v_ty bigint; v_dx integer:=0; v_dy integer:=0;
 v_enemy uuid; v_actual integer; v_cost integer; v_occ integer; v_i integer;
 v_xx bigint; v_yy bigint; v_conflicts integer; v_patch_x bigint[]:='{}'; v_patch_y bigint[]:='{}';
 v_span integer; v_depth integer; v_perp integer; v_arm integer;
 v_r constant double precision:=6371007.181; v_k constant double precision:=0.8660254037844386;
begin
 -- Jedna transakcijska brava za globalnu mrežu: nema preuzimanja istog kvadrata u dvije paralelne radnje.
 perform pg_advisory_xact_lock(770077003);
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into v_king from public.kz_members where player_id=v_player and role='kralj';
 if v_king is null then raise exception 'Samo kralj kvizaš može raspoređivati teritorij'; end if;
 select bank_m2,area_m2 into v_bank,v_area from public.kz_kingdoms where id=v_king for update;
 if p_spawn or v_area=0 then
   if p_lat is null or p_lon is null or p_lat not between -85 and 85 or p_lon not between -180 and 180
     or p_accuracy is null or p_accuracy<0 or p_accuracy>100 then
       raise exception 'Za početnu lokaciju uključi GPS s preciznošću do 100 metara';
   end if;
   v_tx:=floor(v_r*v_k*radians(p_lon))::bigint;
   v_ty:=floor(v_r/v_k*sin(radians(p_lat)))::bigint;
   -- GPS uporište uzima prvu ćeliju iz zadanog oblika, orijentirano na istok.
   v_dx:=1; v_dy:=0;
 else
   if p_from_x is null or p_from_y is null then raise exception 'Dodirni svoju granicu na karti'; end if;
   if not exists(select 1 from public.kz_cells where x=p_from_x and y=p_from_y and kingdom_id=v_king) then
     raise exception 'Moraš odabrati vlastiti kvadrat'; end if;
   if p_direction='E' then v_dx:=1; elsif p_direction='W' then v_dx:=-1;
   elsif p_direction='N' then v_dy:=1; elsif p_direction='S' then v_dy:=-1;
   else raise exception 'Odaberi smjer širenja'; end if;
   v_tx:=p_from_x+v_dx; v_ty:=p_from_y+v_dy;
 end if;
 if coalesce(p_shape,'') not in ('blok','traka','kut','cikcak') then
   raise exception 'Nepoznat oblik; odaberi blok, traku, L-oblik ili cik-cak';
 end if;
 select kingdom_id into v_enemy from public.kz_cells where x=v_tx and y=v_ty;
 if v_enemy is not null then raise exception 'Za tuđi blok pokreni Okršaj znanja u novoj verziji igre'; end if;
 if v_enemy is null then
   v_actual:=case when (p_spawn or v_area=0) then 20 else p_size end;
   if v_actual not between 3 and 20 then raise exception 'Odaberi 3 do 20 m²'; end if;
   v_cost:=v_actual;
 else
   v_actual:=8; v_cost:=20;
 end if;
 if v_bank<v_cost then raise exception 'Nema dovoljno kvadrata znanja na kontu'; end if;
 -- Svaki oblik pokriva točno v_actual jedinstvenih, međusobno spojenih ćelija 1 m².
 for v_i in 0..v_actual-1 loop
   if p_shape='traka' then
     v_depth:=v_i; v_perp:=0;
   elsif p_shape='kut' then
     v_arm:=(v_actual+1)/2;
     if v_i<v_arm then
       v_depth:=v_i; v_perp:=0;
     else
       v_depth:=0; v_perp:=v_i-v_arm+1;
     end if;
   elsif p_shape='cikcak' then
     v_depth:=v_i/3;
     if mod(v_depth,2)=0 then v_perp:=mod(v_i,3);
     else v_perp:=2-mod(v_i,3); end if;
   else
     -- Zbijeni blok, približno kvadratan za 3–20 m².
     v_span:=ceil(sqrt(v_actual::double precision))::integer;
     v_depth:=v_i/v_span;
     if mod(v_i%v_span,2)=0 then v_perp:=-(v_i%v_span)/2;
     else v_perp:=((v_i%v_span)+1)/2; end if;
   end if;
   -- Rotacija oblika prema odabranom smjeru N/W/E/S.
   v_xx:=v_tx+v_dx*v_depth-v_dy*v_perp;
   v_yy:=v_ty+v_dy*v_depth+v_dx*v_perp;
   v_patch_x:=array_append(v_patch_x,v_xx);
   v_patch_y:=array_append(v_patch_y,v_yy);
 end loop;
 select count(*) into v_conflicts from generate_subscripts(v_patch_x,1) i
   join public.kz_cells c on c.x=v_patch_x[i] and c.y=v_patch_y[i]
   where (v_enemy is null) or c.kingdom_id<>v_enemy;
 if v_conflicts>0 then raise exception 'Na tom rubu nema dovoljno neprekinutih kvadrata iste vrste; odaberi drugi rub'; end if;
 if v_enemy is not null then
   select count(*) into v_occ from generate_subscripts(v_patch_x,1) i
     join public.kz_cells c on c.x=v_patch_x[i] and c.y=v_patch_y[i] and c.kingdom_id=v_enemy;
   if v_occ<>8 then raise exception 'Za napad treba osam susjednih kvadrata istog suparnika'; end if;
 end if;
 if v_enemy is null then
   insert into public.kz_cells(x,y,kingdom_id)
    select v_patch_x[i],v_patch_y[i],v_king from generate_subscripts(v_patch_x,1) i;
 else
   update public.kz_cells c set kingdom_id=v_king,created_at=now()
   from generate_subscripts(v_patch_x,1) i
   where c.x=v_patch_x[i] and c.y=v_patch_y[i] and c.kingdom_id=v_enemy;
   update public.kz_kingdoms set area_m2=area_m2-8 where id=v_enemy;
 end if;
 update public.kz_kingdoms set area_m2=area_m2+v_actual,bank_m2=bank_m2-v_cost,
   anchor_x=coalesce(anchor_x,v_tx),anchor_y=coalesce(anchor_y,v_ty)
 where id=v_king returning area_m2 into v_total;
 insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,previous_kingdom,at_x,at_y)
 values(v_king,v_player,case when v_enemy is not null then 'attack' when (p_spawn or v_area=0) then 'spawn' else 'claim' end,
 v_cost,v_actual,v_enemy,v_tx,v_ty);
 return jsonb_build_object('added',v_actual,'spent',v_cost,'new_area',v_total,'attack',v_enemy is not null);
end $function$
;

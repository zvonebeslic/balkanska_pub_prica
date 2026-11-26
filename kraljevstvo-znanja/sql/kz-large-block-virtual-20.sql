-- 10x8 map footprint = 20 virtual m². Keep the original number of blocks.
select pg_advisory_xact_lock(770077003);
lock table kz_private.territory_duels in share row exclusive mode;
lock table public.kz_cells, public.kz_kingdoms in share row exclusive mode;
do $$begin
 if exists(select 1 from kz_private.territory_duels where status='active') then raise exception 'Active battles'; end if;
 if exists(select 1 from public.kz_cells c where not exists(select 1 from kz_private.cells_before_80m2_20261126 b where floor(b.x/10.0)=floor(c.x/10.0) and floor(b.y/8.0)=floor(c.y/8.0) and b.kingdom_id=c.kingdom_id)) or (select count(*) from public.kz_cells)<>2240 then raise exception 'Territory changed after initial experiment'; end if;
end$$;
create table kz_private.cells_before_virtual20_20261126 as select * from public.kz_cells;
revoke all on kz_private.cells_before_virtual20_20261126 from public,anon,authenticated;
create temporary table kz_resize_mapping(bx bigint,by bigint,nx bigint,ny bigint,kingdom_id uuid,primary key(bx,by),unique(nx,ny)) on commit drop;
insert into kz_resize_mapping values
(1660960,5063776,1660900,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660965,5063776,1660910,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660970,5063776,1660920,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660975,5063776,1660930,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660980,5063776,1660940,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660985,5063776,1660950,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660990,5063776,1660960,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660995,5063776,1660970,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661000,5063776,1660980,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661005,5063776,1660990,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661010,5063776,1661000,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661015,5063776,1661010,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063776,1661020,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661025,5063776,1661030,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063772,1661020,5063768,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661030,5063776,1661040,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063768,1661020,5063760,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661035,5063776,1661050,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661030,5063780,1661040,5063784,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063764,1661020,5063752,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661040,5063776,1661060,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661035,5063780,1661050,5063784,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661035,5063772,1661050,5063768,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661030,5063784,1661040,5063792,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063760,1661020,5063744,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661045,5063776,1661070,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661035,5063784,1661050,5063792,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661050,5063776,1661080,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661040,5063784,1661060,5063792,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661035,5063788,1661050,5063800,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661050,5063780,1661080,5063784,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661045,5063784,1661070,5063792,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661035,5063792,1661050,5063808,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661050,5063784,1661080,5063792,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661035,5063796,1661050,5063816,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661055,5063784,1661090,5063792,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661030,5063796,1661040,5063816,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661060,5063784,1661100,5063792,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661025,5063796,1661030,5063816,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661060,5063780,1661100,5063784,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063796,1661020,5063816,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661060,5063776,1661100,5063776,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063792,1661020,5063808,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661015,5063792,1661010,5063808,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661010,5063792,1661000,5063808,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661005,5063792,1660990,5063808,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661000,5063792,1660980,5063808,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1660995,5063792,1660970,5063808,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1661020,5063756,1661030,5063752,'737edf41-aa1a-4cf9-931f-e6e98295453a'),
(1661025,5063756,1661040,5063752,'737edf41-aa1a-4cf9-931f-e6e98295453a'),
(3000575,7329180,3000570,7329176,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(3000580,7329180,3000580,7329176,'e03587d9-a08a-4598-b8a0-83e57fda85f0'),
(1664940,5062912,1664940,5062912,'737edf41-aa1a-4cf9-931f-e6e98295453a'),
(3000585,7333124,3000580,7333120,'e03587d9-a08a-4598-b8a0-83e57fda85f0');
delete from public.kz_cells;
insert into public.kz_cells(x,y,kingdom_id,created_at,captured_at,tower_claimed_at)
select m.nx+2*(b.x-m.bx)+dx,m.ny+2*(b.y-m.by)+dy,b.kingdom_id,b.created_at,b.captured_at,b.tower_claimed_at
from kz_private.cells_before_80m2_20261126 b join kz_resize_mapping m on b.kingdom_id=m.kingdom_id and b.x between m.bx and m.bx+4 and b.y between m.by and m.by+3 cross join generate_series(0,1) dx cross join generate_series(0,1) dy;
update public.kz_kingdoms k set area_m2=(select count(*)/4 from public.kz_cells c where c.kingdom_id=k.id) where exists(select 1 from public.kz_cells c where c.kingdom_id=k.id);
update public.kz_kingdoms k set anchor_x=m.nx+5,anchor_y=m.ny+4 from kz_private.kingdom_area_before_80m2_20261126 b join kz_resize_mapping m on m.kingdom_id=b.id and b.anchor_x between m.bx and m.bx+4 and b.anchor_y between m.by and m.by+3 where k.id=b.id;
do $$begin
 if (select count(*) from public.kz_cells)<>4320 or exists(select 1 from public.kz_cells group by floor(x/10.0),floor(y/8.0) having count(*)<>80 or count(distinct kingdom_id)<>1) or exists(select 1 from public.kz_kingdoms k join kz_private.kingdom_area_before_80m2_20261126 b on k.id=b.id where k.area_m2<>b.area_m2) then raise exception 'Validation failed';end if;
end$$;
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
 if p_x is null or p_y is null or mod(p_x,10)<>0 or mod(p_y,8)<>0 then
   raise exception 'Blok nije poravnat u globalnoj mreži 10×8 m'; end if;
 select bank_m2,area_m2 into v_bank,v_area from public.kz_kingdoms where id=v_king for update;
 v_first:=v_area=0;
 -- Prvi blok i svako novo uporište moraju biti unutar 5 km od GPS lokacije.
 if v_first or coalesce(p_spawn,false) then
   if p_lat is null or p_lon is null or p_accuracy is null
      or p_lat not between -85 and 85 or p_lon not between -180 and 180
      or p_accuracy not between 0 and 100 then
     raise exception 'Za prvo ili novo uporište uključi precizan GPS (do 100 m).';
   end if;
   if abs((p_x+5.0)/(6371007.181*(sqrt(3.0::double precision)/2)))>pi()
      or abs((p_y+4.0)*(sqrt(3.0::double precision)/2)/6371007.181)>sin(radians(85.0)) then
     raise exception 'Blok je izvan dopuštene mreže za GPS odabir.';
   elsif kz_private.spawn_distance_m(p_lat,p_lon,p_x,p_y)>5000 then
     raise exception 'Prvi blok ili novo uporište mora biti unutar 5 km od GPS lokacije.';
   end if;
 end if;
 -- Udaljena uporišta su dopuštena unutar 5 km od GPS lokacije.
 -- Sva ostala širenja, uključujući napade, zahtijevaju dodir s vlastitim rubom.
 if not (coalesce(p_spawn,false) or v_first) then
   -- Kandidat mora cijelom svojom stranom barem na jednom mjestu dodirivati
   -- ranije osvojene kvadrate istog kraljevstva, uključujući stare 1 m² teritorije.
   select exists(
      select 1 from public.kz_cells c where c.kingdom_id=v_king
       and (
        (c.x=p_x-1 and c.y between p_y and p_y+7) or
        (c.x=p_x+10 and c.y between p_y and p_y+7) or
        (c.y=p_y-1 and c.x between p_x and p_x+9) or
        (c.y=p_y+8 and c.x between p_x and p_x+9)
       )
   ) into v_touched;
   if not v_touched then raise exception 'Blok mora dodirivati tvoju granicu; novo uporište zahtijeva GPS'; end if;

 end if;
 select count(*),count(*) filter(where kingdom_id=v_king),
    count(*) filter(where kingdom_id<>v_king)
 into v_occupied,v_own_count,v_enemy_count
 from public.kz_cells where x between p_x and p_x+9 and y between p_y and p_y+7;
 if v_own_count>0 then raise exception 'Ne možeš postaviti novi blok preko vlastitog teritorija'; end if;
 if v_enemy_count>0 then
   raise exception 'Za tuđi blok pokreni Okršaj znanja u novoj verziji igre';
   -- Udaljeno uporište ne smije preskakati obranu: napad mora dodirivati
   -- postojeći teritorij napadača bez obzira na p_spawn.
   if not exists(
      select 1 from public.kz_cells c where c.kingdom_id=v_king
        and ((c.x=p_x-1 and c.y between p_y and p_y+7)
         or (c.x=p_x+10 and c.y between p_y and p_y+7)
         or (c.y=p_y-1 and c.x between p_x and p_x+9)
         or (c.y=p_y+8 and c.x between p_x and p_x+9))
   ) then raise exception 'Napad mora dodirivati tvoju granicu'; end if;
   if v_enemy_count<>80 then raise exception 'Za napad izaberi cijeli suparnički blok od 20 m²'; end if;
   select kingdom_id into v_enemy from public.kz_cells
     where x between p_x and p_x+9 and y between p_y and p_y+7 limit 1;
   if (select count(distinct kingdom_id) from public.kz_cells
       where x between p_x and p_x+9 and y between p_y and p_y+7)<>1
      then raise exception 'Blok prelazi granicu više kraljevstava'; end if;
 end if;
 -- Slobodni blok: 20 m² iz salda. Tuđi puni blok: napad košta 100 m² i uzima 20 m².
 if v_bank<(case when v_enemy is null then 20 else 100 end) then
   raise exception 'Nema dovoljno m² na kontu za ovaj potez'; end if;
 if v_enemy is null then
   insert into public.kz_cells(x,y,kingdom_id)
   select p_x+dx,p_y+dy,v_king from generate_series(0,9) dx cross join generate_series(0,7) dy;
 else
   update public.kz_cells set kingdom_id=v_king,created_at=now()
   where x between p_x and p_x+9 and y between p_y and p_y+7 and kingdom_id=v_enemy;
   update public.kz_kingdoms set area_m2=area_m2-20 where id=v_enemy;
 end if;
 update public.kz_kingdoms set area_m2=area_m2+20,
   bank_m2=bank_m2-(case when v_enemy is null then 20 else 100 end),
   anchor_x=coalesce(anchor_x,p_x+5),anchor_y=coalesce(anchor_y,p_y+4)
 where id=v_king returning area_m2 into v_total;
 insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,
 previous_kingdom,at_x,at_y)
 values(v_king,v_player,case when v_enemy is not null then 'attack'
 when p_spawn or v_first then 'spawn' else 'claim' end,
 case when v_enemy is null then 20 else 100 end,20,v_enemy,p_x,p_y);
 return jsonb_build_object('added',20,'spent',case when v_enemy is null then 20 else 100 end,
 'new_area',v_total,'attack',v_enemy is not null,'block_x',p_x,'block_y',p_y);
end $function$;

CREATE OR REPLACE FUNCTION public.kz_territory_duel(p_guest_id uuid, p_guest_secret text, p_action text, p_x bigint DEFAULT NULL::bigint, p_y bigint DEFAULT NULL::bigint, p_id uuid DEFAULT NULL::uuid, p_number integer DEFAULT NULL::integer, p_choice text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 player uuid; realm uuid; member_role text; enemy uuid; d kz_private.territory_duels%rowtype;
 r kz_private.duel_rounds%rowtype; q public.kz_questions%rowtype; ids text[];
 bank bigint; enemy_count integer; adjacent boolean; is_attacker boolean; is_defender boolean;
 attack_good boolean; defend_good boolean; loss bigint; response jsonb; round_list jsonb; review_rows jsonb; t timestamptz; inserted integer;
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 select m.kingdom_id,m.role into realm,member_role from public.kz_members m where m.player_id=player;
 if realm is null then if p_action='resume' then return null;end if;raise exception 'Nisi član kraljevstva';end if;
 if coalesce(p_action,'') not in ('start','resume','join','answer','state','review') then raise exception 'Nepoznata radnja';end if;
 perform pg_advisory_xact_lock(770077003);
 if p_action='start' and exists(select 1 from kz_private.territory_duels x where x.status='active' and (x.attacker_player=player or x.defender_player=player)) then
   raise exception 'Već sudjeluješ u okršaju. Prvo završi taj dvoboj.';
 end if;
 if p_id is not null then
   select * into d from kz_private.territory_duels where id=p_id for update;
 else
   select * into d from kz_private.territory_duels where status='active' and
    (attacker_player=player or defender_player=player or (attacker_player is null and attacker=realm and member_role='kralj'))
    order by created_at desc limit 1 for update;
 end if;
 if not found then
   if p_action='resume' then return null;end if;
   if p_action<>'start' then raise exception 'Okršaj nije dostupan';end if;
   if p_x is null or p_y is null or mod(p_x,10)<>0 or mod(p_y,8)<>0 then raise exception 'Blok nije poravnat';end if;
   if exists(select 1 from kz_private.territory_duels x where x.x=p_x and x.y=p_y and x.status='active') then raise exception 'Na tom bloku već traje okršaj';end if;
   select c.kingdom_id,count(*) into enemy,enemy_count from public.kz_cells c
    where c.x between p_x and p_x+9 and c.y between p_y and p_y+7 group by c.kingdom_id order by count(*) desc limit 1;
   if enemy is null or enemy=realm or enemy_count<>80 then raise exception 'Odaberi cijeli protivnički blok od 20 m²';end if;
   if not exists(select 1 from public.kz_cells c where c.kingdom_id=realm and
      ((c.x in(p_x-1,p_x+10) and c.y between p_y and p_y+7) or (c.y in(p_y-1,p_y+8) and c.x between p_x and p_x+9))) then raise exception 'Napad mora dodirivati tvoju granicu';end if;
   perform 1 from public.kz_kingdoms where id in(realm,enemy) order by id for update;
   select bank_m2 into bank from public.kz_kingdoms where id=realm;
   if bank<100 then raise exception 'Za napad treba 100 m² na kontu';end if;
   select array_agg(s.id order by s.r) into ids from
     (select id,random() r from public.kz_questions where correct_key in('A','B','C') and options ?& array['A','B','C'] order by r limit 8) s;
   if coalesce(cardinality(ids),0)<>8 then raise exception 'Nema dovoljno pitanja';end if;
   update public.kz_kingdoms set bank_m2=bank_m2-100 where id=realm;
   insert into kz_private.territory_duels(attacker,defender,x,y,questions,required_hits,attacker_player)
   values(realm,enemy,p_x,p_y,ids,case when (select bank_m2 from public.kz_kingdoms where id=enemy)=0 then 1 else 3 end,player) returning * into d;
 end if;
 if d.attacker_player is null and realm=d.attacker and member_role='kralj' and d.status='active' then
   update kz_private.territory_duels set attacker_player=player where id=d.id returning * into d;
 end if;
 is_attacker:=coalesce(d.attacker_player=player and realm=d.attacker,false);
 is_defender:=coalesce(d.defender_player=player and realm=d.defender,false);
 if p_action='join' then
   if realm<>d.defender or d.status<>'active' then raise exception 'Možeš braniti samo aktivni napad na svoje kraljevstvo';end if;
   if d.defender_player is not null and not is_defender then raise exception 'Drugi član već brani ovaj blok';end if;
   if exists(select 1 from kz_private.territory_duels x where x.id<>d.id and x.status='active' and (x.attacker_player=player or x.defender_player=player)) then raise exception 'Već sudjeluješ u drugom okršaju';end if;
 elsif not (is_attacker or is_defender) then raise exception 'Nisi sudionik okršaja';
 end if;
 if p_action='review' then
   if d.status='active' then raise exception 'Pitanja su dostupna tek nakon okršaja';end if;
   if d.finished_at is null or d.finished_at<now()-interval '5 minutes' then return '[]'::jsonb;end if;
   insert into kz_private.duel_reviews(duel_id,player_id) values(d.id,player) on conflict do nothing;
   get diagnostics inserted=row_count;
   if inserted=0 then return '[]'::jsonb;end if;
   select coalesce(jsonb_agg(jsonb_build_object('position',rr.position,'id',a.id,'source',a.source,
     'prompt',a.prompt,'options',a.options,'image',a.image,'correct_key',a.correct_key,
     'choice',case when is_attacker then rr.attacker_choice else rr.defender_choice end,
     'correct',case when is_attacker then rr.attacker_correct else rr.defender_correct end,
     'attacker_choice',rr.attacker_choice,'defender_choice',rr.defender_choice,
     'attacker_correct',rr.attacker_correct,'defender_correct',rr.defender_correct,'progress',rr.progress)
     order by rr.position),'[]'::jsonb) into review_rows
   from kz_private.duel_rounds rr join public.kz_questions a on a.id=rr.question_id
   where rr.duel_id=d.id and rr.resolved_at is not null;
   return review_rows;
 end if;
 if d.status='active' then
   perform 1 from public.kz_kingdoms where id in(d.attacker,d.defender) order by id for update;
   select count(*) into enemy_count from public.kz_cells c where c.kingdom_id=d.defender and c.x between d.x and d.x+9 and c.y between d.y and d.y+7;
   select exists(select 1 from public.kz_cells c where c.kingdom_id=d.attacker and
    ((c.x in(d.x-1,d.x+10) and c.y between d.y and d.y+7) or (c.y in(d.y-1,d.y+8) and c.x between d.x and d.x+9))) into adjacent;
   if enemy_count<>80 or not adjacent then
     update kz_private.territory_duels set status='invalid',finished_at=clock_timestamp(),deadline=null,issued_by=null where id=d.id returning * into d;
     update public.kz_kingdoms set bank_m2=bank_m2+100 where id=d.attacker;
   else
     select * into r from kz_private.duel_rounds where duel_id=d.id and position=d.position;
     t:=clock_timestamp();
     -- A defender may enter the current unanswered round, without resetting its deadline.
     if p_action='join' and d.defender_player is null then
       update kz_private.territory_duels set defender_player=player,activity_at=t where id=d.id returning * into d;
       is_defender:=true;
       if r.duel_id is not null and r.resolved_at is null and r.deadline>t and r.attacker_choice is null then
         update kz_private.duel_rounds set defender_player=player where duel_id=d.id and position=d.position returning * into r;
       end if;
     end if;
     if p_action='answer' and r.duel_id is not null and r.resolved_at is null and p_number=d.position then
       if coalesce(p_choice,'') not in ('A','B','C','SKIP') then raise exception 'Neispravan odgovor';end if;
       if is_attacker and r.attacker_choice is null then
         update kz_private.duel_rounds set attacker_choice=case when t>=r.deadline then 'SKIP' else p_choice end where duel_id=d.id and position=d.position returning * into r;
       elsif is_defender and r.defender_player=player and r.defender_choice is null then
         update kz_private.duel_rounds set defender_choice=case when t>=r.deadline then 'SKIP' else p_choice end where duel_id=d.id and position=d.position returning * into r;
       end if;
     end if;
     if r.duel_id is not null and r.resolved_at is null and
       (r.deadline<=t or (r.attacker_choice is not null and (r.defender_player is null or r.defender_choice is not null))) then
       select * into q from public.kz_questions where id=r.question_id;
       r.attacker_choice:=coalesce(r.attacker_choice,'SKIP');
       if r.defender_player is not null then r.defender_choice:=coalesce(r.defender_choice,'SKIP');end if;
       attack_good:=r.attacker_choice=q.correct_key;
       defend_good:=case when r.defender_player is null then null else r.defender_choice=q.correct_key end;
       d.hits:=greatest(0,d.hits+case when attack_good then 1 else 0 end-case when defend_good is true then 1 else 0 end);
       if not attack_good then
         select least(20,bank_m2) into loss from public.kz_kingdoms where id=d.attacker;
         update public.kz_kingdoms set bank_m2=bank_m2-loss where id=d.attacker;
         d.attack_loss:=d.attack_loss+loss;d.misses:=d.misses+1;d.insufficient_bank:=loss<20;
       end if;
       -- A correct defender neutralizes a correct attacker. Charge a failed defense only once.
       if (r.defender_player is null and attack_good) or defend_good is false then
         select least(20,bank_m2) into loss from public.kz_kingdoms where id=d.defender;
         update public.kz_kingdoms set bank_m2=bank_m2-loss where id=d.defender;
         d.defense_loss:=d.defense_loss+loss;
       end if;
       if d.hits>=d.required_hits then
         update public.kz_cells set kingdom_id=d.attacker,created_at=now() where kingdom_id=d.defender and x between d.x and d.x+9 and y between d.y and d.y+7;
         update public.kz_kingdoms set area_m2=area_m2-20 where id=d.defender;
         update public.kz_kingdoms set area_m2=area_m2+20,bank_m2=bank_m2+100 where id=d.attacker;
         insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,previous_kingdom,at_x,at_y)
           values(d.attacker,d.attacker_player,'attack',100,20,d.defender,d.x,d.y);
         d.status:='won';
       elsif d.insufficient_bank or d.position=8 then d.status:='lost';
       end if;
       perform kz_private.add_duel_score(d.id,r.attacker_player,attack_good,case when d.status='won' then 20 else 0 end);
       if r.defender_player is not null then perform kz_private.add_duel_score(d.id,r.defender_player,defend_good,0);end if;
       update kz_private.duel_rounds set attacker_choice=r.attacker_choice,defender_choice=r.defender_choice,
         attacker_correct=attack_good,defender_correct=defend_good,resolved_at=clock_timestamp(),progress=d.hits
         where duel_id=d.id and position=d.position returning * into r;
       update kz_private.territory_duels set hits=d.hits,misses=d.misses,attack_loss=d.attack_loss,defense_loss=d.defense_loss,
         status=d.status,insufficient_bank=d.insufficient_bank,deadline=null,issued_by=null,
         finished_at=case when d.status<>'active' then clock_timestamp() end
       where id=d.id returning * into d;
     end if;
     -- Only a participant calling start/resume/state can issue the next shared round.
     -- Brief intermission preserves the result display; both sides share one server deadline.
     if d.status='active' and p_action in ('start','resume','join','state') and
        (r.duel_id is null or (r.resolved_at is not null and r.resolved_at<=clock_timestamp()-interval '2 seconds')) then
       if r.duel_id is not null then d.position:=d.position+1;end if;
       select * into q from public.kz_questions where id=d.questions[d.position];
       insert into kz_private.duel_rounds(duel_id,position,question_id,attacker_player,defender_player,deadline)
         values(d.id,d.position,q.id,d.attacker_player,d.defender_player,clock_timestamp()+make_interval(secs=>public.kz_question_seconds(q.prompt)))
         returning * into r;
       update kz_private.territory_duels set position=d.position,deadline=r.deadline,issued_by=d.attacker_player where id=d.id returning * into d;
     end if;
   end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('position',rr.position,'attacker_correct',rr.attacker_correct,'defender_correct',rr.defender_correct,'progress',rr.progress) order by rr.position),'[]'::jsonb)
 into round_list from kz_private.duel_rounds rr where rr.duel_id=d.id and rr.resolved_at is not null;
 response:=jsonb_build_object('id',d.id,'position',d.position,'hits',d.hits,'misses',d.misses,'required_hits',d.required_hits,
  'attack_loss',d.attack_loss,'defense_loss',d.defense_loss,'status',d.status,'x',d.x,'y',d.y,'insufficient_bank',d.insufficient_bank,
  'side',case when is_attacker then 'attacker' else 'defender' end,'defender_online',d.defender_player is not null,
  'attacker_name',(select display_name from public.kz_players where id=d.attacker_player),
  'defender_name',(select display_name from public.kz_players where id=d.defender_player),
  'attacker_realm',(select name from public.kz_kingdoms where id=d.attacker),
  'defender_realm',(select name from public.kz_kingdoms where id=d.defender),
  'rounds',round_list,'reward',case when d.status='won' then 100 else 0 end);
 if d.status='active' and r.duel_id is not null and r.resolved_at is null then
   select * into q from public.kz_questions where id=r.question_id;
   response:=response||jsonb_build_object('prompt',q.prompt,'options',q.options,'image',q.image,
    'submitted',case when is_attacker then r.attacker_choice is not null else r.defender_player is distinct from player or r.defender_choice is not null end,
    'opponent_submitted',case when is_attacker then r.defender_choice is not null else r.attacker_choice is not null end,
    'remaining_ms',greatest(0,floor(extract(epoch from r.deadline-clock_timestamp())*1000)));
 else response:=response||jsonb_build_object('intermission',d.status='active');end if;
 return response;
end $function$;
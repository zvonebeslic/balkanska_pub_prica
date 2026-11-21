-- Kraljevstvo Znanja: jedan potez = jedan globalno poravnati blok od 20 m² (5×4 ćelije).
-- Naslijeđeni teritoriji 1 m² zadržavaju se netaknuti i blokirani za tuđe novo osvajanje.
-- Nagrade ABC pitanja +100%, stari rezultati i prijašnji saldi ne mijenjaju se.
CREATE OR REPLACE FUNCTION public.kz_answer(p_guest_id uuid, p_guest_secret text, p_game_id uuid, p_number integer, p_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_player uuid; v_game public.kz_games%rowtype; v_expected integer;
 v_right text; v_correct boolean; v_earned integer:=0; v_area bigint; v_role text; v_cool timestamptz;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 select * into v_game from public.kz_games where id=p_game_id and player_id=v_player for update;
 if not found or v_game.finished_at is not null then raise exception 'Ova partija više nije aktivna'; end if;
 if p_choice not in ('A','B','C') then raise exception 'Odgovor mora biti A, B ili C'; end if;
 select min(position) into v_expected from public.kz_game_questions
 where game_id=v_game.id and answered_at is null;
 if p_number<>v_expected then raise exception 'Pitanja se rješavaju redom i samo jednom'; end if;
 if not exists (select 1 from public.kz_members where player_id=v_player and kingdom_id=v_game.kingdom_id) then
   raise exception 'Članstvo se promijenilo tijekom partije'; end if;
 select q.correct_key into v_right from public.kz_game_questions g join public.kz_questions q on q.id=g.question_id
 where g.game_id=p_game_id and g.position=p_number;
 v_correct:=(p_choice=v_right);
 if v_correct then
   select area_m2 into v_area from public.kz_kingdoms where id=v_game.kingdom_id for update;
   select role into v_role from public.kz_members where player_id=v_player;
   v_earned:=case when v_area<500 then 40 when v_role='kralj' then 60
       when v_role='vojvoda' then 50 else 44 end;
   update public.kz_kingdoms set bank_m2=bank_m2+v_earned where id=v_game.kingdom_id;
 end if;
 update public.kz_game_questions set choice=p_choice,correct=v_correct,earned_m2=v_earned,answered_at=now()
 where game_id=p_game_id and position=p_number;
 update public.kz_games set correct_count=correct_count+case when v_correct then 1 else 0 end,
 wrong_count=wrong_count+case when v_correct then 0 else 1 end,
 earned_m2=earned_m2+v_earned
 where id=p_game_id;
 if p_number=5 then
   v_cool:=now()+interval '4 hours';
   update public.kz_games set finished_at=now(), duration_seconds=greatest(0,floor(extract(epoch from now()-started_at)))::integer where id=p_game_id;
   update public.kz_players set cooldown_until=v_cool where id=v_player;
 end if;
 return jsonb_build_object('correct',v_correct,'correct_key',v_right,'earned',v_earned,
   'finished',p_number=5,'cooldown_until',v_cool);
end $function$


create or replace function public.kz_place_block(
 p_guest_id uuid,p_guest_secret text,p_x bigint,p_y bigint,
 p_spawn boolean default false,p_lat double precision default null,
 p_lon double precision default null,p_accuracy double precision default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_player uuid;v_king uuid;v_bank bigint;v_area bigint;v_total bigint;
 v_first boolean;v_enemy uuid;v_enemy_count integer;v_own_count integer;
 v_occupied integer;v_touched boolean;v_gps_x bigint;v_gps_y bigint;
 v_r constant double precision:=6371007.181;
 v_k constant double precision:=0.8660254037844386;
begin
 perform pg_advisory_xact_lock(770077003);
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into v_king from public.kz_members where player_id=v_player and role='kralj';
 if v_king is null then raise exception 'Samo kralj kvizaš može osvajati teritorij'; end if;
 if p_x is null or p_y is null or mod(p_x,5)<>0 or mod(p_y,4)<>0 then
   raise exception 'Blok nije poravnat u globalnoj mreži 5×4 m'; end if;
 select bank_m2,area_m2 into v_bank,v_area from public.kz_kingdoms where id=v_king for update;
 v_first:=v_area=0;
 if p_spawn or v_first then
   if p_lat is null or p_lon is null or p_lat not between -85 and 85 or p_lon not between -180 and 180
    or p_accuracy is null or p_accuracy<0 or p_accuracy>100 then
      raise exception 'Za novo GPS uporište treba aktualna lokacija s preciznošću do 100 m';
   end if;
   v_gps_x:=floor(floor(v_r*v_k*radians(p_lon))/5)*5;
   v_gps_y:=floor(floor(v_r/v_k*sin(radians(p_lat)))/4)*4;
   if p_x<>v_gps_x or p_y<>v_gps_y then
     raise exception 'Blok GPS uporišta mora obuhvaćati prijavljenu GPS lokaciju';
   end if;
 else
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
   if not v_touched then raise exception 'Blok mora dodirivati tvoju granicu; za udaljenu lokaciju treba GPS'; end if;
 end if;
 select count(*),count(*) filter(where kingdom_id=v_king),
    count(*) filter(where kingdom_id<>v_king)
 into v_occupied,v_own_count,v_enemy_count
 from public.kz_cells where x between p_x and p_x+4 and y between p_y and p_y+3;
 if v_own_count>0 then raise exception 'Ne možeš postaviti novi blok preko vlastitog teritorija'; end if;
 if v_enemy_count>0 then
   if v_enemy_count<>20 then raise exception 'Za napad izaberi cijeli suparnički blok od 20 m²'; end if;
   select min(kingdom_id) into v_enemy from public.kz_cells
     where x between p_x and p_x+4 and y between p_y and p_y+3;
   if (select count(distinct kingdom_id) from public.kz_cells
       where x between p_x and p_x+4 and y between p_y and p_y+3)<>1
      then raise exception 'Blok prelazi granicu više kraljevstava'; end if;
 end if;
 -- Slobodni blok: 20 m² iz salda. Tuđi puni blok: napad košta 40 m² i uzima 20 m².
 if v_bank<(case when v_enemy is null then 20 else 40 end) then
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
   bank_m2=bank_m2-(case when v_enemy is null then 20 else 40 end),
   anchor_x=coalesce(anchor_x,p_x+2),anchor_y=coalesce(anchor_y,p_y+2)
 where id=v_king returning area_m2 into v_total;
 insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,
 previous_kingdom,at_x,at_y)
 values(v_king,v_player,case when v_enemy is not null then 'attack'
 when p_spawn or v_first then 'spawn' else 'claim' end,
 case when v_enemy is null then 20 else 40 end,20,v_enemy,p_x,p_y);
 return jsonb_build_object('added',20,'spent',case when v_enemy is null then 20 else 40 end,
 'new_area',v_total,'attack',v_enemy is not null,'block_x',p_x,'block_y',p_y);
end $$;
revoke all on function public.kz_place_block(uuid,text,bigint,bigint,boolean,double precision,double precision,double precision) from public;
grant execute on function public.kz_place_block(uuid,text,bigint,bigint,boolean,double precision,double precision,double precision) to anon,authenticated;
-- Zatvori stari endpoint za 1 m² / slobodne oblike: nema zaobilaženja novih pravila.
revoke all on function public.kz_place(uuid,text,bigint,bigint,text,integer,boolean,double precision,double precision,double precision,text) from anon,authenticated,public;
notify pgrst,'reload schema';

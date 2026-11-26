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
 -- Prvi blok i svako novo uporište moraju biti unutar 5 km od GPS lokacije.
 if v_first or coalesce(p_spawn,false) then
   if p_lat is null or p_lon is null or p_accuracy is null
      or p_lat not between -85 and 85 or p_lon not between -180 and 180
      or p_accuracy not between 0 and 100 then
     raise exception 'Za prvo ili novo uporište uključi precizan GPS (do 100 m).';
   end if;
   if abs((p_x+2.5)/(6371007.181*(sqrt(3.0::double precision)/2)))>pi()
      or abs((p_y+2.0)*(sqrt(3.0::double precision)/2)/6371007.181)>sin(radians(85.0)) then
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
end $function$;
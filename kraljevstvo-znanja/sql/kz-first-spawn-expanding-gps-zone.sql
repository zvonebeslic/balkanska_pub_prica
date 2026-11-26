-- Initial placement only: smallest permitted circle containing a completely empty 5 x 4 block.
create or replace function kz_private.spawn_distance_m(p_lat double precision,p_lon double precision,p_x bigint,p_y bigint)
returns double precision language sql immutable strict set search_path='' as $$
 select 1000*public.kz_geo_dist_km(p_lat,p_lon,
   degrees(asin(greatest(-1.0,least(1.0,(p_y+2.0)*(sqrt(3.0::double precision)/2)/6371007.181)))),
   degrees((p_x+2.5)/(6371007.181*(sqrt(3.0::double precision)/2))))
$$;
revoke all on function kz_private.spawn_distance_m(double precision,double precision,bigint,bigint) from public,anon,authenticated;

create or replace function kz_private.first_spawn_zone(p_lat double precision,p_lon double precision)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 r constant double precision:=6371007.181; k constant double precision:=sqrt(3.0::double precision)/2;
 gx bigint:=floor(r*k*radians(p_lon)/5)::bigint*5;
 gy bigint:=floor(r/k*sin(radians(p_lat))/4)::bigint*4;
 x0 bigint;y0 bigint; radius_m integer:=500; delta double precision; lon_delta double precision;
 south double precision;north double precision; west double precision; east double precision;
 minx bigint;maxx bigint;miny bigint;maxy bigint; world_min_x bigint;world_max_x bigint;world_min_y bigint;world_max_y bigint;
begin
 if not exists(select 1 from public.kz_cells c where c.x between gx and gx+4 and c.y between gy and gy+3) then
   return jsonb_build_object('radius_m',0,'x',gx,'y',gy);
 end if;
 world_min_x:=ceil((-r*k*pi()-2.5)/5)::bigint*5;
 world_max_x:=floor((r*k*pi()-2.5)/5)::bigint*5;
 world_min_y:=ceil((-r/k*sin(radians(85.0))-2)/4)::bigint*4;
 world_max_y:=floor((r/k*sin(radians(85.0))-2)/4)::bigint*4;
 -- Common case: nearby free block; no large spatial scan needed.
 select a.x,b.y into x0,y0
 from generate_series(greatest(world_min_x,gx-20),least(world_max_x,gx+20),5::bigint) a(x)
 cross join generate_series(greatest(world_min_y,gy-16),least(world_max_y,gy+16),4::bigint) b(y)
 where kz_private.spawn_distance_m(p_lat,p_lon,a.x,b.y)<=500
 and not exists(select 1 from public.kz_cells c where c.x between a.x and a.x+4 and c.y between b.y and b.y+3)
 order by kz_private.spawn_distance_m(p_lat,p_lon,a.x,b.y) limit 1;
 if found then return jsonb_build_object('radius_m',500,'x',x0,'y',y0);end if;
 loop
   delta:=degrees(radius_m/r);
   south:=greatest(-85.0,p_lat-delta);north:=least(85.0,p_lat+delta);
   lon_delta:=case when radius_m>=r*pi()/2 or abs(p_lat)+delta>=90 then 180.0
      else degrees(asin(least(1.0,sin(radius_m/r)/cos(radians(p_lat))))) end;
   west:=p_lon-lon_delta;east:=p_lon+lon_delta;
   miny:=greatest(world_min_y,ceil((r/k*sin(radians(south))-2)/4)::bigint*4);
   maxy:=least(world_max_y,floor((r/k*sin(radians(north))-2)/4)::bigint*4);
   -- Test all candidate centres in the current circle, including across the antimeridian.
   select a.x,b.y into x0,y0
   from (select distinct gs.x from (values (greatest(-180.0,west),least(180.0,east)),
      (greatest(-180.0,west+360),least(180.0,east+360)),
      (greatest(-180.0,west-360),least(180.0,east-360))) z(w,e)
      cross join lateral generate_series(
       greatest(world_min_x,ceil((r*k*radians(z.w)-2.5)/5)::bigint*5),
       least(world_max_x,floor((r*k*radians(z.e)-2.5)/5)::bigint*5),5::bigint) gs(x)
      where z.w<=z.e) a
   cross join generate_series(miny,maxy,4::bigint) b(y)
   where kz_private.spawn_distance_m(p_lat,p_lon,a.x,b.y)<=radius_m
     and not exists(select 1 from public.kz_cells c where c.x between a.x and a.x+4 and c.y between b.y and b.y+3)
   limit 1;
   if found then return jsonb_build_object('radius_m',radius_m,'x',x0,'y',y0);end if;
   if radius_m>=20016000 then raise exception 'Nema slobodnog bloka na karti.';end if;
   radius_m:=case when radius_m=500 then 1000 else radius_m+1000 end;
 end loop;
end $$;
revoke all on function kz_private.first_spawn_zone(double precision,double precision) from public,anon,authenticated;

create or replace function public.kz_first_spawn_zone(p_guest_id uuid,p_guest_secret text,p_lat double precision,p_lon double precision,p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path='' as $$
declare player uuid;
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 if not exists(select 1 from public.kz_members m join public.kz_kingdoms k on k.id=m.kingdom_id
   where m.player_id=player and m.role='kralj' and k.area_m2=0) then
   raise exception 'Prošireni GPS odabir vrijedi samo za prvi blok.';
 end if;
 if p_lat is null or p_lon is null or p_accuracy is null or p_lat not between -85 and 85
  or p_lon not between -180 and 180 or p_accuracy not between 0 and 100 then
   raise exception 'Za prvi blok uključi precizan GPS (do 100 m).';
 end if;
 return kz_private.first_spawn_zone(p_lat,p_lon);
end $$;
revoke all on function public.kz_first_spawn_zone(uuid,text,double precision,double precision,double precision) from public;
grant execute on function public.kz_first_spawn_zone(uuid,text,double precision,double precision,double precision) to anon,authenticated;
CREATE OR REPLACE FUNCTION public.kz_place_block(p_guest_id uuid, p_guest_secret text, p_x bigint, p_y bigint, p_spawn boolean DEFAULT false, p_lat double precision DEFAULT NULL::double precision, p_lon double precision DEFAULT NULL::double precision, p_accuracy double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_player uuid;v_king uuid;v_bank bigint;v_area bigint;v_total bigint;
 v_first boolean;v_enemy uuid;v_enemy_count integer;v_own_count integer;
 v_occupied integer;v_touched boolean;v_zone jsonb;v_radius integer;
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
   if v_first then
     v_zone:=kz_private.first_spawn_zone(p_lat,p_lon);
     v_radius:=(v_zone->>'radius_m')::integer;
     if v_radius=0 then
       if p_x<>(v_zone->>'x')::bigint or p_y<>(v_zone->>'y')::bigint then
         raise exception 'Prvi slobodni blok mora biti na GPS lokaciji.';
       end if;
     elsif abs((p_x+2.5)/(6371007.181*(sqrt(3.0::double precision)/2)))>pi()
        or abs((p_y+2.0)*(sqrt(3.0::double precision)/2)/6371007.181)>sin(radians(85.0)) then
       raise exception 'Blok je izvan dopuštene mreže za prvi GPS odabir.';
     elsif kz_private.spawn_distance_m(p_lat,p_lon,p_x,p_y)>v_radius then
       raise exception 'Prvi blok mora biti unutar % m od GPS lokacije.',v_radius;
     end if;
   elsif p_x <> (floor(6371007.181 * (sqrt(3.0::double precision)/2) * radians(p_lon) / 5)::bigint * 5)
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
 if v_area=0 then
   raise exception 'Za prvi blok koristi novi GPS odabir u Kraljevstvu znanja';
 end if;
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

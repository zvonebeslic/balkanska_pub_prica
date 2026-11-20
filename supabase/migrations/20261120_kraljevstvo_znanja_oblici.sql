-- Kraljevstvo Znanja: četiri geometrijska oblika osvajanja, svaka ćelija 1 m².
-- Ne dira postojeće kz_cells / kz_moves podatke. Pozivi bez p_shape dobivaju 'blok'.
drop function if exists public.kz_place(uuid,text,bigint,bigint,text,integer,boolean,double precision,double precision,double precision);
create or replace function public.kz_place(p_guest_id uuid,p_guest_secret text,
 p_from_x bigint default null,p_from_y bigint default null,
 p_direction text default null,p_size integer default 20,
 p_spawn boolean default false,p_lat double precision default null,
 p_lon double precision default null,p_accuracy double precision default null,
 p_shape text default 'blok')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
 if v_enemy=v_king then raise exception 'To je već tvoj teritorij, odaberi vanjsku granicu'; end if;
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
end $$;

revoke all on function public.kz_place(uuid,text,bigint,bigint,text,integer,boolean,double precision,double precision,double precision,text) from public;
grant execute on function public.kz_place(uuid,text,bigint,bigint,text,integer,boolean,double precision,double precision,double precision,text) to anon, authenticated;
notify pgrst, 'reload schema';

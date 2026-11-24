create or replace function public.kz_flag_random_position(p_region integer,p_flag_id integer,p_initial boolean default false)
returns table(lat double precision,lng double precision) language plpgsql volatile set search_path='' as $$
declare v_w double precision;v_e double precision;v_s double precision;v_n double precision;v_gap double precision;v_lat double precision;v_lng double precision;v_delta_lat double precision;v_delta_lng double precision;v_old_lat double precision;v_old_lng double precision;v_i integer;v_r constant double precision:=6371007.181;v_k constant double precision:=sqrt(3.0)/2.0;
begin
 case p_region when 0 then v_w:=12; v_e:=30; v_s:=35; v_n:=48; v_gap:=3.5;
when 1 then v_w:=-13; v_e:=50; v_s:=35; v_n:=72; v_gap:=12;
when 2 then v_w:=-169; v_e:=-52; v_s:=8; v_n:=83; v_gap:=35;
when 3 then v_w:=-82; v_e:=-34; v_s:=-56; v_n:=14; v_gap:=35;
when 4 then v_w:=-18; v_e:=52; v_s:=-36; v_n:=38; v_gap:=35;
when 5 then v_w:=26; v_e:=147; v_s:=-13; v_n:=77; v_gap:=35;
when 6 then v_w:=110; v_e:=180; v_s:=-48; v_n:=-10; v_gap:=35;
when 7 then v_w:=-180; v_e:=180; v_s:=-82; v_n:=-75; v_gap:=45; else raise exception 'Nepoznata regija zastavice'; end case;
 select f.lat,f.lng into v_old_lat,v_old_lng from public.kz_flag_points f where f.id=p_flag_id;
 v_delta_lat:=v_gap/110.0;
 for v_i in 1..12000 loop
  v_lng:=v_w+(v_e-v_w)*random();
  v_lat:=degrees(asin(sin(radians(v_s))+(sin(radians(v_n))-sin(radians(v_s)))*random()));
  if not (case p_region when 0 then ((pg_catalog.polygon('((13.4,45.7),(15,46.9),(18.7,46.8),(21.5,46),(23.5,44.7),(28.7,43.9),(29,41.4),(26,40.1),(25.5,38.4),(23,36.2),(20,35.1),(18.8,39),(16,40),(13.4,42.5))') @> pg_catalog.point(v_lng,v_lat)) and ((pg_catalog.polygon('((-11,36),(-10,43),(-7,45),(-5,49),(-11,51),(-8,59),(-2,59),(4,55),(10,56),(12,60),(21,71),(31,71),(31,62),(43,59),(49,56),(40,47),(35,44),(29,41),(28,36),(20,35),(18,40),(12,38),(9,43),(4,43))') @> pg_catalog.point(v_lng,v_lat))))
when 1 then (not (pg_catalog.polygon('((13.4,45.7),(15,46.9),(18.7,46.8),(21.5,46),(23.5,44.7),(28.7,43.9),(29,41.4),(26,40.1),(25.5,38.4),(23,36.2),(20,35.1),(18.8,39),(16,40),(13.4,42.5))') @> pg_catalog.point(v_lng,v_lat)) and ((pg_catalog.polygon('((-11,36),(-10,43),(-7,45),(-5,49),(-11,51),(-8,59),(-2,59),(4,55),(10,56),(12,60),(21,71),(31,71),(31,62),(43,59),(49,56),(40,47),(35,44),(29,41),(28,36),(20,35),(18,40),(12,38),(9,43),(4,43))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((-10,50),(-5,50),(-1,55),(-4,60),(-9,59))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((-9,51),(-6,51),(-6,55),(-10,55))') @> pg_catalog.point(v_lng,v_lat))))
when 2 then ((pg_catalog.polygon('((-168,69),(-155,60),(-137,59),(-130,49),(-124,40),(-117,32),(-110,31),(-105,24),(-97,16),(-88,16),(-86,11),(-82,9),(-78,9),(-77,20),(-81,27),(-79,34),(-67,44),(-53,52),(-56,61),(-80,70),(-105,73),(-128,72),(-151,73))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((-53,60),(-43,60),(-38,65),(-42,73),(-50,80),(-59,82),(-60,71))') @> pg_catalog.point(v_lng,v_lat)))
when 3 then ((pg_catalog.polygon('((-82,11),(-77,8),(-74,3),(-80,-3),(-79,-10),(-75,-16),(-72,-28),(-73,-37),(-70,-47),(-68,-56),(-63,-54),(-64,-42),(-59,-35),(-52,-33),(-48,-28),(-35,-7),(-35,-3),(-44,1),(-50,4),(-58,9),(-68,12))') @> pg_catalog.point(v_lng,v_lat)))
when 4 then ((pg_catalog.polygon('((-17,36),(5,37),(12,33),(24,33),(35,31),(41,12),(51,12),(49,2),(42,-12),(34,-23),(30,-34),(19,-35),(12,-29),(10,-19),(8,-6),(-1,5),(-9,5),(-17,14))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((47,-13),(50,-16),(49,-24),(44,-26),(43,-18))') @> pg_catalog.point(v_lng,v_lat)))
when 5 then ((pg_catalog.polygon('((26,41),(36,45),(39,57),(48,61),(65,71),(88,76),(114,73),(133,70),(142,58),(135,50),(130,42),(140,37),(141,31),(131,30),(123,23),(116,19),(110,11),(105,2),(101,-1),(96,6),(98,17),(90,21),(83,8),(76,7),(72,19),(66,24),(61,25),(58,30),(50,31),(46,39),(41,42),(35,35))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((95,22),(107,23),(120,19),(125,9),(126,-6),(122,-10),(115,-9),(108,-7),(104,3),(100,9))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((130,30),(136,34),(141,40),(146,44),(144,35),(138,33))') @> pg_catalog.point(v_lng,v_lat)))
when 6 then ((pg_catalog.polygon('((113,-11),(123,-12),(134,-11),(139,-15),(151,-21),(153,-29),(146,-39),(136,-36),(128,-34),(115,-33))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((166,-34),(179,-39),(175,-46),(168,-47),(166,-41))') @> pg_catalog.point(v_lng,v_lat)))
when 7 then (v_lat between -82 and -75) else false end) then continue; end if;
  v_lng:=degrees((floor(v_r*v_k*radians(v_lng)/5)*5+2.5)/(v_r*v_k));
  v_lat:=degrees(asin(greatest(-1.0,least(1.0,(floor(v_r/v_k*sin(radians(v_lat))/4)*4+2)*v_k/v_r))));
  if not p_initial and public.kz_geo_dist_km(v_old_lat,v_old_lng,v_lat,v_lng)<v_gap then continue; end if;
  v_delta_lng:=v_gap/(110.0*greatest(.01,cos(radians(abs(v_lat)+v_delta_lat))));
  if not exists(select 1 from public.kz_flag_points f where f.id<>p_flag_id and (not p_initial or f.id<p_flag_id)
   and f.region=p_region and f.lat between v_lat-v_delta_lat and v_lat+v_delta_lat
   and (f.lng between v_lng-v_delta_lng and v_lng+v_delta_lng or f.lng+360 between v_lng-v_delta_lng and v_lng+v_delta_lng or f.lng-360 between v_lng-v_delta_lng and v_lng+v_delta_lng)
   and public.kz_geo_dist_km(f.lat,f.lng,v_lat,v_lng)<v_gap) then
   lat:=v_lat;lng:=v_lng;return next;return;
  end if;
 end loop;
 raise exception 'Nije pronađen slobodan položaj za zastavicu %',p_flag_id;
end $$;
revoke all on function public.kz_flag_random_position(integer,integer,boolean) from public,anon,authenticated;
create index if not exists kz_flags_region_lat_lng_idx on public.kz_flag_points(region,lat,lng);

create or replace function public.kz_flag_answer(p_guest_id uuid,p_guest_secret text,p_challenge_id uuid,p_choice text,p_lat double precision,p_lng double precision,p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_player uuid; v_kingdom uuid; a public.kz_flag_attempts%rowtype; f public.kz_flag_points%rowtype;
 answer_key text; good boolean; reward integer:=0; src record; p double precision[]; newlat double precision; newlng double precision;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 if upper(coalesce(p_choice,'')) not in ('A','B','C') then raise exception 'Odaberi odgovor.'; end if;
 perform 1 from public.kz_players where id=v_player for update;
 select * into a from public.kz_flag_attempts where id=p_challenge_id and player_id=v_player for update;
 if not found or a.answered_at is not null then raise exception 'Pokušaj je već iskorišten ili ne postoji.'; end if;
 perform pg_advisory_xact_lock(770077042);
 select * into f from public.kz_flag_points where id=a.flag_id for update;
 if f.generation<>a.generation then raise exception 'Zastavicu je već riješio drugi igrač.'; end if;
 
 if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
 if public.kz_geo_dist_km(p_lat,p_lng,f.lat,f.lng)>2 then raise exception 'Zastavica je izvan kruga od 2 km.'; end if;
 select kingdom_id into v_kingdom from public.kz_members where player_id=v_player;
 if v_kingdom is null then raise exception 'Pridruži se kraljevstvu.'; end if;
 select correct_key into answer_key from public.kz_questions where id=a.question_id;
 if answer_key is null then raise exception 'Pitanje nije dostupno.'; end if;
 good:=upper(p_choice)=answer_key;
 if good then reward:=400; update public.kz_kingdoms set bank_m2=bank_m2+reward where id=v_kingdom; end if;
 select pos.lat,pos.lng into strict newlat,newlng from public.kz_flag_random_position(f.region::integer,f.id,false) pos;
 update public.kz_flag_attempts set answered_at=now(),choice=upper(p_choice),reward_m2=reward where id=a.id;
 update public.kz_flag_points set lat=newlat,lng=newlng,generation=generation+1 where id=f.id;
 return jsonb_build_object('correct',good,'correct_key',answer_key,'reward_m2',reward,'flag_id',f.id);
end $$;


notify pgrst,'reload schema';
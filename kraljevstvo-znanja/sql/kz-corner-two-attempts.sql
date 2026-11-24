-- Shared two-attempt corner flags and unified KZ question history.
alter table public.kz_flag_points add column if not exists kind text not null default 'golf' check(kind in ('golf','corner'));
alter table public.kz_flag_points add column if not exists used_attempts integer not null default 0 check(used_attempts between 0 and 1);
create index if not exists kz_flag_kind_region_idx on public.kz_flag_points(kind,region,local_bonus);
insert into public.kz_seen(player_id,question_id) select player_id,question_id from public.kz_flag_attempts on conflict do nothing;
insert into public.kz_seen(player_id,question_id) select player_id,question_id from public.kz_castle_challenges on conflict do nothing;
CREATE OR REPLACE FUNCTION public.kz_corner_random_position(p_region integer, p_flag_id integer, p_initial boolean DEFAULT false)
 RETURNS TABLE(lat double precision, lng double precision)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_w double precision;v_e double precision;v_s double precision;v_n double precision;v_gap double precision;v_lat double precision;v_lng double precision;v_delta_lat double precision;v_delta_lng double precision;v_old_lat double precision;v_old_lng double precision;v_i integer;v_r constant double precision:=6371007.181;v_k constant double precision:=sqrt(3.0)/2.0;
begin
 case p_region when 0 then v_w:=12; v_e:=30; v_s:=35; v_n:=48; v_gap:=2.5;
when 1 then v_w:=-13; v_e:=50; v_s:=35; v_n:=72; v_gap:=8;
when 2 then v_w:=-169; v_e:=-52; v_s:=8; v_n:=83; v_gap:=25;
when 3 then v_w:=-82; v_e:=-34; v_s:=-56; v_n:=14; v_gap:=25;
when 4 then v_w:=-18; v_e:=52; v_s:=-36; v_n:=38; v_gap:=25;
when 5 then v_w:=26; v_e:=147; v_s:=-13; v_n:=77; v_gap:=25;
when 6 then v_w:=110; v_e:=180; v_s:=-48; v_n:=-10; v_gap:=25;
when 7 then v_w:=-180; v_e:=180; v_s:=-82; v_n:=-75; v_gap:=32; else raise exception 'Nepoznata regija zastavice'; end case;
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
   and (f.region=p_region or f.local_bonus) and f.lat between v_lat-v_delta_lat and v_lat+v_delta_lat
   and (f.lng between v_lng-v_delta_lng and v_lng+v_delta_lng or f.lng+360 between v_lng-v_delta_lng and v_lng+v_delta_lng or f.lng-360 between v_lng-v_delta_lng and v_lng+v_delta_lng)
   and public.kz_geo_dist_km(f.lat,f.lng,v_lat,v_lng)<(case when f.kind='corner' and not f.local_bonus and f.region=p_region then v_gap else 1.0 end)) then
   lat:=v_lat;lng:=v_lng;return next;return;
  end if;
 end loop;
 raise exception 'Nije pronađen slobodan položaj za zastavicu %',p_flag_id;
end $function$;
CREATE OR REPLACE FUNCTION public.kz_corner_local_position(p_flag_id integer)
 RETURNS TABLE(lat double precision, lng double precision)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_lat double precision;v_lng double precision;v_old_lat double precision;v_old_lng double precision;v_i integer;v_dlat constant double precision:=1.0/110.0;v_dlng double precision;v_r constant double precision:=6371007.181;v_k constant double precision:=sqrt(3.0)/2.0;
begin
 select f.lat,f.lng into v_old_lat,v_old_lng from public.kz_flag_points f where f.id=p_flag_id;
 for v_i in 1..12000 loop
  v_lng:=13.48+(19.63-13.48)*random();
  v_lat:=degrees(asin(sin(radians(42.38))+(sin(radians(46.56))-sin(radians(42.38)))*random()));
  v_lng:=degrees((floor(v_r*v_k*radians(v_lng)/5)*5+2.5)/(v_r*v_k));
  v_lat:=degrees(asin(greatest(-1.0,least(1.0,(floor(v_r/v_k*sin(radians(v_lat))/4)*4+2)*v_k/v_r))));
  if not exists(select 1 from public.kz_flag_local_land b where b.outline @> pg_catalog.point(v_lng,v_lat) and not exists(select 1 from unnest(b.holes) h where h @> pg_catalog.point(v_lng,v_lat))) then continue; end if;
  if v_old_lat is not null and public.kz_geo_dist_km(v_old_lat,v_old_lng,v_lat,v_lng)<1.0 then continue; end if;
  v_dlng:=1.0/(110.0*cos(radians(abs(v_lat)+v_dlat)));
  if not exists(select 1 from public.kz_flag_points f where f.id<>p_flag_id and f.lat between v_lat-v_dlat and v_lat+v_dlat and f.lng between v_lng-v_dlng and v_lng+v_dlng and public.kz_geo_dist_km(f.lat,f.lng,v_lat,v_lng)<1.0) then
   lat:=v_lat;lng:=v_lng;return next;return;
  end if;
 end loop;
 raise exception 'Nije pronađena slobodna lokacija u HR/BiH za zastavicu %',p_flag_id;
end $function$;

revoke all on function public.kz_corner_random_position(integer,integer,boolean),public.kz_corner_local_position(integer) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kz_flag_map(p_south double precision, p_north double precision, p_west double precision, p_east double precision, p_lat double precision, p_lng double precision)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
 select id,region,lat,lng,generation,kind,case when kind='corner' then 2-used_attempts else 1 end as remaining from public.kz_flag_points
 where lat between greatest(-85,p_south) and least(85,p_north)
 and (p_east-p_west>=360 or lng between p_west and p_east or lng+360 between p_west and p_east or lng-360 between p_west and p_east)
 order by public.kz_geo_dist_km(p_lat,p_lng,lat,lng) limit 120
) x
$function$;

CREATE OR REPLACE FUNCTION public.kz_flag_challenge(p_guest_id uuid, p_guest_secret text, p_flag_id integer, p_generation integer, p_lat double precision, p_lng double precision, p_accuracy double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_player uuid; f public.kz_flag_points%rowtype; a public.kz_flag_attempts%rowtype; q public.kz_questions%rowtype;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 if not exists(select 1 from public.kz_members where player_id=v_player) then raise exception 'Pridruži se kraljevstvu.'; end if;
 select * into f from public.kz_flag_points where id=p_flag_id;
 if not found or f.generation<>p_generation then raise exception 'Zastavica je već premještena.'; end if;
 
 if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
 if public.kz_geo_dist_km(p_lat,p_lng,f.lat,f.lng)>2 then raise exception 'Zastavica je izvan kruga od 2 km.'; end if;
 select * into a from public.kz_flag_attempts where player_id=v_player and flag_id=f.id and generation=f.generation and answered_at is null order by issued_at desc limit 1;
 if found then
  if a.answered_at is not null then raise exception 'Pokušaj je već iskorišten.'; end if;
  select * into q from public.kz_questions where id=a.question_id;
 else
  select * into q from public.kz_questions q0 where q0.options ?& array['A','B','C'] and q0.correct_key in ('A','B','C') and not exists(select 1 from public.kz_seen s where s.player_id=v_player and s.question_id=q0.id) and not exists(select 1 from public.kz_flag_attempts other where other.flag_id=f.id and other.generation=f.generation and other.question_id=q0.id) order by random() limit 1;
  if not found then raise exception 'Pitanja nisu dostupna.'; end if;
  insert into public.kz_flag_attempts(player_id,flag_id,generation,question_id) values(v_player,f.id,f.generation,q.id) returning * into a;
  insert into public.kz_seen(player_id,question_id) values(v_player,q.id) on conflict do nothing;
 end if;
 return jsonb_build_object('challenge_id',a.id,'prompt',q.prompt,'options',q.options,'image',q.image,'kind',f.kind,'remaining',case when f.kind='corner' then 2-f.used_attempts else 1 end);
end $function$;

CREATE OR REPLACE FUNCTION public.kz_flag_answer(p_guest_id uuid, p_guest_secret text, p_challenge_id uuid, p_choice text, p_lat double precision, p_lng double precision, p_accuracy double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if good then reward:=20; update public.kz_kingdoms set bank_m2=bank_m2+reward where id=v_kingdom; end if;
 update public.kz_flag_attempts set answered_at=now(),choice=upper(p_choice),reward_m2=reward where id=a.id;
 if f.kind='corner' and f.used_attempts=0 then
  update public.kz_flag_points set used_attempts=1 where id=f.id;
  return jsonb_build_object('correct',good,'correct_key',answer_key,'reward_m2',reward,'flag_id',f.id,'moved',false,'remaining',1);
 end if;
 if f.kind='corner' and f.local_bonus then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_corner_local_position(f.id) pos;
 elsif f.kind='corner' then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_corner_random_position(f.region::integer,f.id,false) pos;
 elsif f.local_bonus then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_flag_local_position(f.id) pos;
 else
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_flag_random_position(f.region::integer,f.id,false) pos;
 end if;
 update public.kz_flag_points set lat=newlat,lng=newlng,generation=generation+1,used_attempts=0 where id=f.id;
 return jsonb_build_object('correct',good,'correct_key',answer_key,'reward_m2',reward,'flag_id',f.id,'moved',true,'remaining',0);
end $function$;

CREATE OR REPLACE FUNCTION public.kz_guardian_challenge(p_guest_id uuid, p_guest_secret text, p_guardian_id integer, p_lat double precision, p_lng double precision, p_accuracy double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE player uuid;kingdom uuid;
  catalog public.kz_guardian_catalog%rowtype;
  combat public.kz_castle_state%rowtype;
  prev public.kz_castle_challenges%rowtype;
  question public.kz_questions%rowtype;
  monster record;
  measured_km double precision;day_start timestamptz;attempts integer;
  new_challenge uuid;gen integer;
BEGIN
  player:=public.kz_who(p_guest_id,p_guest_secret);
  PERFORM 1 FROM public.kz_players WHERE id=player FOR UPDATE;
  SELECT kingdom_id INTO kingdom FROM public.kz_members WHERE player_id=player;
  IF kingdom IS NULL THEN RAISE EXCEPTION 'Pridruži se kraljevstvu za napad.';END IF;
  SELECT * INTO catalog FROM public.kz_guardian_catalog WHERE guardian_id=p_guardian_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Čuvar nije pronađen.';END IF;
  IF (catalog.kind='castle' AND p_guardian_id >=
     (201+least((SELECT count(*) FROM public.kz_kingdoms),1000))) THEN
    RAISE EXCEPTION 'Dvorac trenutačno nije aktivan.';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_accuracy IS NULL OR
     p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180
     OR p_accuracy<0 OR p_accuracy>150 THEN
    RAISE EXCEPTION 'Za napad uključi precizan GPS (točnost do 150 m).';
  END IF;

  SELECT * INTO monster FROM public.kz_guardian_position(p_guardian_id,now());
  measured_km:=public.kz_geo_dist_km(p_lat,p_lng,monster.lat,monster.lng);
  IF measured_km > 1 THEN
    RAISE EXCEPTION 'Predaleko si od čuvara (% m). Napad je moguć unutar 1 km.',
      round(measured_km*1000);
  END IF;
  SELECT * INTO combat FROM public.kz_castle_state WHERE castle_id=p_guardian_id;
  gen:=coalesce(combat.generation,0);
  day_start:=((now() AT TIME ZONE 'Europe/Sarajevo')::date AT TIME ZONE 'Europe/Sarajevo');
  SELECT * INTO prev FROM public.kz_castle_challenges
    WHERE player_id=player AND answered_at IS NULL
      AND mode='guardian' AND castle_id=p_guardian_id
      AND generation=gen AND issued_at>=day_start AND issued_at>now()-interval '3 minutes'
    ORDER BY issued_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO question FROM public.kz_questions WHERE id=prev.question_id;
    RETURN jsonb_build_object('challenge_id',prev.id,'guardian_id',p_guardian_id,
      'generation',gen,'hp',coalesce(combat.hp,100),
      'prompt',question.prompt,'options',question.options);
  END IF;
  day_start:=((now() AT TIME ZONE 'Europe/Sarajevo')::date AT TIME ZONE 'Europe/Sarajevo');
  SELECT count(*) INTO attempts FROM public.kz_castle_challenges
    WHERE player_id=player AND mode='guardian' AND issued_at>=day_start;
  IF attempts>=50 THEN
     RAISE EXCEPTION 'Potrošeno je 50 dnevnih pokušaja. Novi stižu u ponoć.';
  END IF;
  UPDATE public.kz_castle_challenges SET answered_at=now()
    WHERE player_id=player AND answered_at IS NULL AND mode='guardian';
  SELECT * INTO question FROM public.kz_questions q WHERE q.options ?& array['A','B','C'] AND q.correct_key in ('A','B','C') AND NOT EXISTS (SELECT 1 FROM public.kz_seen s WHERE s.player_id=player AND s.question_id=q.id) ORDER BY random() LIMIT 1;
  IF question.id IS NULL THEN RAISE EXCEPTION 'Pitanja nisu dostupna.';END IF;
  INSERT INTO public.kz_castle_challenges(
     player_id,castle_id,generation,question_id,mode)
     VALUES(player,p_guardian_id,gen,question.id,'guardian')
     RETURNING id INTO new_challenge;
  INSERT INTO public.kz_seen(player_id,question_id) VALUES(player,question.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('challenge_id',new_challenge,'guardian_id',p_guardian_id,
    'generation',gen,'hp',coalesce(combat.hp,100),
    'prompt',question.prompt,'options',question.options,
    'remaining',49-attempts);
END;
$function$;

CREATE OR REPLACE FUNCTION public.kz_castle_challenge(p_guest_id uuid, p_guest_secret text, p_castle_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_player uuid; v_count integer; v_gen integer := 0;
  v_hp integer := 100; v_existing public.kz_castle_challenges%rowtype;
  v_question public.kz_questions%rowtype;
BEGIN
  v_player:=public.kz_who(p_guest_id,p_guest_secret);
  PERFORM 1 FROM public.kz_players WHERE id=v_player FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.kz_members WHERE player_id=v_player) THEN
    RAISE EXCEPTION 'Za borbu se najprije pridruži kraljevstvu.';
  END IF;
  SELECT count(*) INTO v_count FROM public.kz_kingdoms;
  IF p_castle_id IS NULL OR NOT (
    (p_castle_id BETWEEN 0 AND (200 + least(v_count,1000)))
    OR (p_castle_id BETWEEN 2000 AND 13199)
  ) THEN
    RAISE EXCEPTION 'Čuvar nije aktivan.';
  END IF;
  SELECT generation,hp INTO v_gen,v_hp FROM public.kz_castle_state WHERE castle_id=p_castle_id;
  IF NOT FOUND THEN v_gen:=0;v_hp:=100;END IF;

  SELECT * INTO v_existing FROM public.kz_castle_challenges
    WHERE player_id=v_player AND answered_at IS NULL ORDER BY issued_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND AND v_existing.issued_at>now()-interval '3 minutes' AND
    v_existing.castle_id=p_castle_id AND v_existing.generation=v_gen THEN
    SELECT * INTO v_question FROM public.kz_questions WHERE id=v_existing.question_id;
    RETURN jsonb_build_object('challenge_id',v_existing.id,'castle_id',p_castle_id,
      'generation',v_gen,'hp',v_hp,'prompt',v_question.prompt,'options',v_question.options);
  END IF;
  UPDATE public.kz_castle_challenges SET answered_at=now()
    WHERE player_id=v_player AND answered_at IS NULL;

  IF EXISTS(SELECT 1 FROM public.kz_castle_challenges WHERE player_id=v_player
    AND issued_at > now()-interval '5 seconds') THEN
    RAISE EXCEPTION 'Pričekaj nekoliko sekundi prije sljedećeg pitanja.';
  END IF;
  SELECT * INTO v_question FROM public.kz_questions q WHERE q.options ?& array['A','B','C'] AND q.correct_key in ('A','B','C') AND NOT EXISTS (SELECT 1 FROM public.kz_seen s WHERE s.player_id=v_player AND s.question_id=q.id) ORDER BY random() LIMIT 1;
  IF v_question.id IS NULL THEN RAISE EXCEPTION 'Trenutačno nema dostupnih pitanja.'; END IF;
  INSERT INTO public.kz_castle_challenges(player_id,castle_id,generation,question_id)
    VALUES(v_player,p_castle_id,v_gen,v_question.id) RETURNING * INTO v_existing;
  INSERT INTO public.kz_seen(player_id,question_id) VALUES(v_player,v_question.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('challenge_id',v_existing.id,'castle_id',p_castle_id,
    'generation',v_gen,'hp',v_hp,'prompt',v_question.prompt,'options',v_question.options);
END;
$function$;

notify pgrst,'reload schema';
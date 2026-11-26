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
  IF (catalog.kind='castle' AND (CASE WHEN (case when p_guardian_id>=100000 then mod(p_guardian_id-100000,60000) else p_guardian_id end)>=49202 THEN (case when p_guardian_id>=100000 then mod(p_guardian_id-100000,60000) else p_guardian_id end)-49202 WHEN (case when p_guardian_id>=100000 then mod(p_guardian_id-100000,60000) else p_guardian_id end)>=48001 THEN (case when p_guardian_id>=100000 then mod(p_guardian_id-100000,60000) else p_guardian_id end)-48001 WHEN (case when p_guardian_id>=100000 then mod(p_guardian_id-100000,60000) else p_guardian_id end)>=24400 THEN (case when p_guardian_id>=100000 then mod(p_guardian_id-100000,60000) else p_guardian_id end)-24400 ELSE (case when p_guardian_id>=100000 then mod(p_guardian_id-100000,60000) else p_guardian_id end) END) >=
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
  IF measured_km > 5 THEN
    RAISE EXCEPTION 'Predaleko si od čuvara (% m). Napad je moguć unutar 5 km.',
      round(measured_km*1000);
  END IF;
  SELECT * INTO combat FROM public.kz_castle_state WHERE castle_id=p_guardian_id;
  gen:=coalesce(combat.generation,0);
  day_start:=((now() AT TIME ZONE 'Europe/Sarajevo')::date AT TIME ZONE 'Europe/Sarajevo');
  day_start:=((now() AT TIME ZONE 'Europe/Sarajevo')::date AT TIME ZONE 'Europe/Sarajevo');
  SELECT count(*) INTO attempts FROM public.kz_castle_challenges
    WHERE player_id=player AND mode='guardian' AND issued_at>=day_start;
  IF attempts>=50 THEN
     RAISE EXCEPTION 'Potrošeno je 50 dnevnih pokušaja. Novi stižu u ponoć.';
  END IF;
  UPDATE public.kz_castle_challenges SET answered_at=now()
    WHERE player_id=player AND answered_at IS NULL AND mode='guardian';
  WITH eligible AS MATERIALIZED (
    SELECT q0.* FROM public.kz_questions q0
    WHERE q0.options ?& array['A','B','C'] AND q0.correct_key IN ('A','B','C')
      AND NOT EXISTS (SELECT 1 FROM public.kz_seen s WHERE s.player_id=player AND s.question_id=q0.id)
  ), recent AS (
    SELECT k.source FROM (
      SELECT c.question_id,c.issued_at FROM public.kz_castle_challenges c WHERE c.player_id=player AND c.mode='guardian'
      UNION ALL
      SELECT a0.question_id,a0.issued_at FROM public.kz_flag_attempts a0 WHERE a0.player_id=player
      ORDER BY issued_at DESC LIMIT 5
    ) h JOIN public.kz_questions k ON k.id=h.question_id
  ), chosen_source AS (
    SELECT s.source FROM (SELECT DISTINCT e.source FROM eligible e) s
    ORDER BY EXISTS(SELECT 1 FROM recent r WHERE r.source=s.source), random()
    LIMIT 1
  )
  SELECT e.* INTO question FROM eligible e
  JOIN chosen_source cs ON cs.source=e.source
  ORDER BY random() LIMIT 1;
  IF question.id IS NULL THEN RAISE EXCEPTION 'Pitanja nisu dostupna.';END IF;
  INSERT INTO public.kz_castle_challenges(
     player_id,castle_id,generation,question_id,mode,issued_at)
     VALUES(player,p_guardian_id,gen,question.id,'guardian',clock_timestamp())
     RETURNING id INTO new_challenge;
  INSERT INTO public.kz_seen(player_id,question_id) VALUES(player,question.id) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('challenge_id',new_challenge,'guardian_id',p_guardian_id,
    'generation',gen,'hp',coalesce(combat.hp,100),
    'prompt',question.prompt,'options',question.options,
    'remaining',49-attempts,'time_seconds',public.kz_question_seconds(question.prompt));
END;
$function$;

CREATE OR REPLACE FUNCTION public.kz_guardian_answer(p_guest_id uuid, p_guest_secret text, p_challenge_id uuid, p_choice text, p_lat double precision, p_lng double precision, p_accuracy double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE player uuid;kingdom uuid;
  attack public.kz_castle_challenges%rowtype;
  enemy public.kz_castle_state%rowtype;
  cfg public.kz_guardian_catalog%rowtype;
  target record;
  answer_key text;correct boolean;defeated boolean:=false;
  value_m2 integer:=0;credited integer:=0;
  km double precision; new_origin double precision[];
  inserted integer:=0;day_start timestamptz;
  attempts integer;
BEGIN
  player:=public.kz_who(p_guest_id,p_guest_secret);
  PERFORM 1 FROM public.kz_players WHERE id=player FOR UPDATE;
  SELECT * INTO attack FROM public.kz_castle_challenges
    WHERE id=p_challenge_id AND player_id=player
      AND mode='guardian' FOR UPDATE;
  IF NOT FOUND OR attack.answered_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pitanje nije aktivno.';
  END IF;
  day_start:=((now() AT TIME ZONE 'Europe/Sarajevo')::date AT TIME ZONE 'Europe/Sarajevo');
  IF attack.issued_at < day_start OR clock_timestamp() > attack.issued_at + make_interval(secs => (SELECT public.kz_question_seconds(prompt) FROM public.kz_questions WHERE id=attack.question_id)) THEN
    RAISE EXCEPTION 'Vrijeme je isteklo. Pokušaj je iskorišten.';
  END IF;
  IF upper(trim(coalesce(p_choice,''))) NOT IN ('A','B','C') THEN
    RAISE EXCEPTION 'Odaberi ponuđeni odgovor.';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_accuracy IS NULL OR
     p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180
     OR p_accuracy<0 OR p_accuracy>150 THEN
    RAISE EXCEPTION 'Za odgovor trebaš precizan GPS (točnost do 150 m).';
  END IF;
  SELECT * INTO cfg FROM public.kz_guardian_catalog WHERE guardian_id=attack.castle_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Čuvar nije pronađen.';END IF;
  SELECT * INTO target FROM public.kz_guardian_position(attack.castle_id,now());
  km:=public.kz_geo_dist_km(p_lat,p_lng,target.lat,target.lng);
  IF km > 5 THEN
    RAISE EXCEPTION 'Izašao si iz kruga od 5 km. Napad je prekinut.';
  END IF;
  SELECT kingdom_id INTO kingdom FROM public.kz_members WHERE player_id=player;
  IF kingdom IS NULL THEN RAISE EXCEPTION 'Više nisi član kraljevstva.';END IF;
  SELECT correct_key INTO answer_key FROM public.kz_questions WHERE id=attack.question_id;
  IF answer_key IS NULL THEN RAISE EXCEPTION 'Pitanje nije pronađeno.';END IF;
  correct:=upper(trim(answer_key))=upper(trim(p_choice));
  UPDATE public.kz_castle_challenges SET answered_at=now(),choice=upper(trim(p_choice))
    WHERE id=attack.id;
  INSERT INTO public.kz_castle_state(castle_id,born_at)
     VALUES(attack.castle_id,
       CASE WHEN cfg.kind='castle' THEN '2026-11-22 17:00:00+00'::timestamptz
         ELSE now() END)
     ON CONFLICT(castle_id) DO NOTHING;
  SELECT * INTO enemy FROM public.kz_castle_state
    WHERE castle_id=attack.castle_id FOR UPDATE;
  IF enemy.generation<>attack.generation THEN
    SELECT count(*) INTO attempts FROM public.kz_castle_challenges
      WHERE player_id=player AND mode='guardian' AND issued_at>=day_start;
    RETURN jsonb_build_object('correct',correct,'stale',true,'defeated',false,
      'guardian_id',attack.castle_id,'castle_id',attack.castle_id,
      'generation',enemy.generation,'hp',enemy.hp,'remaining',greatest(0,50-attempts),
      'born_at',extract(epoch FROM enemy.born_at)*1000,
      'start_lat',enemy.start_lat,'start_lng',enemy.start_lng,
      'route_bearing',enemy.route_bearing);
  END IF;
  IF correct THEN
    IF enemy.hp<=20 THEN
      defeated:=true;
      value_m2:=cfg.reward_m2;
      INSERT INTO public.kz_guardian_rewards(
        guardian_id,generation,kingdom_id,player_id,reward_m2)
      VALUES(attack.castle_id,attack.generation,kingdom,player,value_m2)
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS inserted=ROW_COUNT;
      IF inserted=1 THEN
        UPDATE public.kz_kingdoms SET bank_m2=bank_m2+value_m2
           WHERE id=kingdom;
        credited:=value_m2;
      END IF;
      -- Nova pozicija: siguran server, nasumičan KVADRAT u istoj regiji.
      SELECT ARRAY[spawn.lat,spawn.lng] INTO new_origin
        FROM public.kz_random_world_spawn(attack.castle_id) AS spawn;
      UPDATE public.kz_castle_state SET generation=generation+1,hp=100,
         defeats=defeats+1,born_at=now(),updated_at=now(),
         start_lat=least(84.85,greatest(-84.85,new_origin[1])),
         start_lng=new_origin[2],route_bearing=random()*360
       WHERE castle_id=attack.castle_id RETURNING * INTO enemy;
    ELSE
      UPDATE public.kz_castle_state SET hp=hp-20,updated_at=now()
         WHERE castle_id=attack.castle_id RETURNING * INTO enemy;
    END IF;
  END IF;
  SELECT count(*) INTO attempts FROM public.kz_castle_challenges
    WHERE player_id=player AND mode='guardian' AND issued_at>=day_start;
  RETURN jsonb_build_object('correct',correct,'stale',false,
    'defeated',defeated,'reward_m2',credited,
    'guardian_id',attack.castle_id,'castle_id',attack.castle_id,
    'generation',enemy.generation,'hp',enemy.hp,'remaining',greatest(0,50-attempts),
    'born_at',extract(epoch FROM enemy.born_at)*1000,
    'start_lat',enemy.start_lat,'start_lng',enemy.start_lng,
    'route_bearing',enemy.route_bearing);
END;
$function$;

CREATE OR REPLACE FUNCTION public.kz_flag_answer(p_guest_id uuid, p_guest_secret text, p_challenge_id uuid, p_choice text, p_lat double precision, p_lng double precision, p_accuracy double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_player uuid; v_kingdom uuid; a public.kz_flag_attempts%rowtype; f public.kz_flag_points%rowtype;
 answer_key text; good boolean; reward integer:=0; src record; p double precision[]; newlat double precision; newlng double precision; expired boolean;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 if upper(coalesce(p_choice,'')) not in ('A','B','C','SKIP') then raise exception 'Odaberi odgovor.'; end if;
 perform 1 from public.kz_players where id=v_player for update;
 select * into a from public.kz_flag_attempts where id=p_challenge_id and player_id=v_player for update;
 if not found or a.answered_at is not null then raise exception 'Pokušaj je već iskorišten ili ne postoji.'; end if;
 perform pg_advisory_xact_lock(770077042);
 select * into f from public.kz_flag_points where id=a.flag_id for update;
 if f.generation<>a.generation then raise exception 'Zastavicu je već riješio drugi igrač.'; end if;
 
 if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
 if public.kz_geo_dist_km(p_lat,p_lng,f.lat,f.lng)>5 then raise exception 'Zastavica je izvan kruga od 5 km.'; end if;
 select kingdom_id into v_kingdom from public.kz_members where player_id=v_player;
 if v_kingdom is null then raise exception 'Pridruži se kraljevstvu.'; end if;
 select correct_key into answer_key from public.kz_questions where id=a.question_id;
 if answer_key is null then raise exception 'Pitanje nije dostupno.'; end if;
 expired:=upper(p_choice)='SKIP' or clock_timestamp()>a.issued_at+make_interval(secs => (select public.kz_question_seconds(prompt) from public.kz_questions where id=a.question_id));
 good:=not expired and upper(p_choice)=answer_key;
 if good then reward:=20; update public.kz_kingdoms set bank_m2=bank_m2+reward where id=v_kingdom; end if;
 update public.kz_flag_attempts set answered_at=now(),choice=case when expired then null else upper(p_choice) end,reward_m2=reward where id=a.id;
 if (f.kind='astronaut' and f.used_attempts<3) or (f.kind='corner' and f.used_attempts<1) or (f.kind='iwo' and f.used_attempts<2) then
  update public.kz_flag_points set used_attempts=f.used_attempts+1 where id=f.id;
  return jsonb_build_object('correct',good,'timed_out',expired,'correct_key',case when expired then null else answer_key end,'reward_m2',reward,'flag_id',f.id,'moved',false,'remaining',case when f.kind='astronaut' then 3-f.used_attempts when f.kind='iwo' then 2-f.used_attempts else 1 end);
 end if;
 if f.kind='astronaut' and f.local_bonus then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_astronaut_local_position(f.id) pos;
 elsif f.kind='astronaut' then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_astronaut_random_position(f.region::integer,f.id,false) pos;
 elsif f.kind='iwo' and f.local_bonus then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_iwo_local_position(f.id) pos;
 elsif f.kind='iwo' then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_iwo_random_position(f.region::integer,f.id,false) pos;
 elsif f.kind='corner' and f.local_bonus then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_corner_local_position(f.id) pos;
 elsif f.kind='corner' then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_corner_random_position(f.region::integer,f.id,false) pos;
 elsif f.local_bonus then
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_flag_local_position(f.id) pos;
 else
  select pos.lat,pos.lng into strict newlat,newlng from public.kz_flag_random_position(f.region::integer,f.id,false) pos;
 end if;
 update public.kz_flag_points set lat=newlat,lng=newlng,generation=generation+1,used_attempts=0 where id=f.id;
 return jsonb_build_object('correct',good,'timed_out',expired,'correct_key',case when expired then null else answer_key end,'reward_m2',reward,'flag_id',f.id,'moved',true,'remaining',0);
end $function$;

CREATE OR REPLACE FUNCTION public.kz_flag_challenge(p_guest_id uuid, p_guest_secret text, p_flag_id integer, p_generation integer, p_lat double precision, p_lng double precision, p_accuracy double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_player uuid; f public.kz_flag_points%rowtype; a public.kz_flag_attempts%rowtype; q public.kz_questions%rowtype; skipped jsonb;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 if not exists(select 1 from public.kz_members where player_id=v_player) then raise exception 'Pridruži se kraljevstvu.'; end if;
 if p_flag_id>=1000000 and p_flag_id<6000000 and p_generation=0 and not exists(select 1 from public.kz_flag_points where id=p_flag_id) then
   if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
   insert into public.kz_flag_points(id,region,lat,lng,generation,local_bonus,kind,used_attempts)
   select p_flag_id,s.region,v.lat,v.lng,0,s.local_bonus,s.kind,0 from public.kz_flag_virtual_seed s
   cross join lateral public.kz_flag_virtual_position(s,p_flag_id/1000000) v
   where s.id=p_flag_id%1000000 and public.kz_geo_dist_km(p_lat,p_lng,v.lat,v.lng)<=2
   on conflict(id) do nothing;
 end if;
 perform pg_advisory_xact_lock(770077042);
 select * into f from public.kz_flag_points where id=p_flag_id for update;
 if not found or f.generation<>p_generation then raise exception 'Zastavica je već premještena.'; end if;
 
 if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
 if public.kz_geo_dist_km(p_lat,p_lng,f.lat,f.lng)>5 then raise exception 'Zastavica je izvan kruga od 5 km.'; end if;
 select * into a from public.kz_flag_attempts where player_id=v_player and flag_id=f.id and generation=f.generation and answered_at is null order by issued_at desc limit 1;
 if found then
  skipped:=public.kz_flag_answer(p_guest_id,p_guest_secret,a.id,'SKIP',p_lat,p_lng,p_accuracy);
  if coalesce((skipped->>'moved')::boolean,false) then
   return skipped;
  end if;
  select * into f from public.kz_flag_points where id=p_flag_id for update;
 end if;
  WITH eligible AS MATERIALIZED (
    SELECT q0.* FROM public.kz_questions q0
    WHERE q0.options ?& array['A','B','C'] AND q0.correct_key IN ('A','B','C')
      AND NOT EXISTS (SELECT 1 FROM public.kz_seen s WHERE s.player_id=v_player AND s.question_id=q0.id)
      AND NOT EXISTS (SELECT 1 FROM public.kz_flag_attempts other WHERE other.flag_id=f.id AND other.generation=f.generation AND other.question_id=q0.id)
  ), recent AS (
    SELECT k.source FROM (
      SELECT c.question_id,c.issued_at FROM public.kz_castle_challenges c WHERE c.player_id=v_player AND c.mode='guardian'
      UNION ALL
      SELECT a0.question_id,a0.issued_at FROM public.kz_flag_attempts a0 WHERE a0.player_id=v_player
      ORDER BY issued_at DESC LIMIT 5
    ) h JOIN public.kz_questions k ON k.id=h.question_id
  ), chosen_source AS (
    SELECT s.source FROM (SELECT DISTINCT e.source FROM eligible e) s
    ORDER BY EXISTS(SELECT 1 FROM recent r WHERE r.source=s.source), random()
    LIMIT 1
  )
  SELECT e.* INTO q FROM eligible e
  JOIN chosen_source cs ON cs.source=e.source
  ORDER BY random() LIMIT 1;
  if not found then raise exception 'Pitanja nisu dostupna.'; end if;
  insert into public.kz_flag_attempts(player_id,flag_id,generation,question_id,issued_at) values(v_player,f.id,f.generation,q.id,clock_timestamp()) returning * into a;
  insert into public.kz_seen(player_id,question_id) values(v_player,q.id) on conflict do nothing;
 return jsonb_build_object('challenge_id',a.id,'time_seconds',public.kz_question_seconds(q.prompt),'prompt',q.prompt,'options',q.options,'image',q.image,'kind',f.kind,'remaining',case when f.kind='astronaut' then 4-f.used_attempts when f.kind='iwo' then 3-f.used_attempts when f.kind='corner' then 2-f.used_attempts else 1 end);
end $function$;

CREATE OR REPLACE FUNCTION kz_private.first_spawn_zone(p_lat double precision, p_lon double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 r constant double precision:=6371007.181; k constant double precision:=sqrt(3.0::double precision)/2;
 gx bigint:=floor(r*k*radians(p_lon)/5)::bigint*5;
 gy bigint:=floor(r/k*sin(radians(p_lat))/4)::bigint*4;
 x0 bigint;y0 bigint; radius_m integer:=500; delta double precision; lon_delta double precision;
 south double precision;north double precision; west double precision; east double precision;
 minx bigint;maxx bigint;miny bigint;maxy bigint; world_min_x bigint;world_max_x bigint;world_min_y bigint;world_max_y bigint;
begin
 if not exists(select 1 from public.kz_cells c where c.x between gx and gx+4 and c.y between gy and gy+3) then
   return jsonb_build_object('radius_m',5000,'x',gx,'y',gy);
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
 if found then return jsonb_build_object('radius_m',5000,'x',x0,'y',y0);end if;
 -- No unbounded search: the player can select another free block in the fixed circle.
 return jsonb_build_object('radius_m',5000,'x',gx,'y',gy);
end $function$;
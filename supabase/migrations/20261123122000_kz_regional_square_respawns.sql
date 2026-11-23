BEGIN;
-- Random respawn is region-preserving (5000 Balkan, 2000 Europe, 700 elsewhere),
-- server-authoritative and snapped to the exact global 5 × 4 metre square grid.
CREATE OR REPLACE FUNCTION public.kz_random_world_spawn(p_guardian_id integer)
RETURNS TABLE(lat double precision,lng double precision)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path TO ''
AS $function$
DECLARE
  v_region smallint;
  v_base record;
  v_prev record;
  v_geo double precision[];
  v_x double precision;
  v_y double precision;
  v_r constant double precision := 6371007.181;
  v_k constant double precision := sqrt(3.0)/2.0;
  v_try integer;
BEGIN
  SELECT c.region_id INTO v_region
  FROM public.kz_guardian_catalog c WHERE c.guardian_id=p_guardian_id;
  IF v_region IS NULL THEN
    RAISE EXCEPTION 'KZ: unknown region for guardian %',p_guardian_id;
  END IF;
  SELECT s.start_lat,s.start_lng INTO v_prev
  FROM public.kz_castle_state s WHERE s.castle_id=p_guardian_id;
  FOR v_try IN 1..32 LOOP
    SELECT c.base_lat,c.base_lng INTO v_base
    FROM public.kz_guardian_catalog c
    WHERE c.region_id=v_region AND c.guardian_id<>p_guardian_id
    ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'KZ: no spawn squares for region %',v_region; END IF;
    -- A few km from a random world-grid sample, no fixed city centres.
    v_geo:=public.kz_geo_dest(v_base.base_lat,v_base.base_lng,random()*360,0.3+random()*1.7);
    v_x:=floor(v_r*v_k*radians(v_geo[2])/5);
    v_y:=floor((v_r/v_k)*sin(radians(v_geo[1]))/4);
    lat:=degrees(asin(greatest(-1.0,least(1.0,(v_y*4+2)*v_k/v_r))));
    lng:=degrees((v_x*5+2.5)/(v_r*v_k));
    IF
      (v_prev.start_lat IS NULL OR v_prev.start_lng IS NULL
        OR public.kz_geo_dist_km(lat,lng,v_prev.start_lat,v_prev.start_lng)>25)
      AND NOT EXISTS(
        SELECT 1 FROM public.kz_castle_state other
        WHERE other.castle_id<>p_guardian_id
          AND other.start_lat IS NOT NULL AND other.start_lng IS NOT NULL
          AND abs(other.start_lat-lat)<0.06
          AND abs(other.start_lng-lng)<0.1
          AND public.kz_geo_dist_km(lat,lng,other.start_lat,other.start_lng)<3
      )
      THEN RETURN NEXT;RETURN;
    END IF;
  END LOOP;
  -- Fallback still yields a valid grid square in the same region.
  RETURN NEXT;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.kz_random_world_spawn(integer)
  FROM PUBLIC,anon,authenticated;

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
  IF attack.issued_at < day_start OR attack.issued_at < now()-interval '3 minutes' THEN
    RAISE EXCEPTION 'Pitanje je isteklo. Pokušaji se obnavljaju u ponoć.';
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
  IF km>1 THEN
    RAISE EXCEPTION 'Izašao si iz kruga od 1 km. Napad je prekinut.';
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
CREATE OR REPLACE FUNCTION public.kz_castle_answer(p_guest_id uuid, p_guest_secret text, p_challenge_id uuid, p_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_player uuid; v_attack public.kz_castle_challenges%rowtype;
  v_correct_key text; v_correct boolean; v_state public.kz_castle_state%rowtype;
  v_defeated boolean := false;
  v_new_lat double precision; v_new_lng double precision;
  v_attempt integer;
BEGIN
  v_player:=public.kz_who(p_guest_id,p_guest_secret);
  IF upper(coalesce(p_choice,'')) NOT IN ('A','B','C') THEN
    RAISE EXCEPTION 'Odaberi odgovor A, B ili C.';
  END IF;
  SELECT * INTO v_attack FROM public.kz_castle_challenges
    WHERE id=p_challenge_id AND player_id=v_player FOR UPDATE;
  IF NOT FOUND OR v_attack.answered_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pitanje više nije aktivno.';
  END IF;
  IF v_attack.issued_at < now()-interval '3 minutes' THEN
    RAISE EXCEPTION 'Vrijeme za odgovor je isteklo.';
  END IF;
  SELECT correct_key INTO v_correct_key FROM public.kz_questions
    WHERE id=v_attack.question_id;
  IF v_correct_key IS NULL THEN RAISE EXCEPTION 'Pitanje nije pronađeno.'; END IF;
  v_correct := upper(trim(p_choice))=upper(trim(v_correct_key));
  UPDATE public.kz_castle_challenges
    SET answered_at=now(),choice=upper(trim(p_choice))
    WHERE id=v_attack.id;

  INSERT INTO public.kz_castle_state(castle_id) VALUES(v_attack.castle_id)
    ON CONFLICT (castle_id) DO NOTHING;
  SELECT * INTO v_state FROM public.kz_castle_state
    WHERE castle_id=v_attack.castle_id FOR UPDATE;
  IF v_state.generation<>v_attack.generation THEN
    RETURN jsonb_build_object('correct',v_correct,'stale',true,
      'defeated',false,'castle_id',v_attack.castle_id,
      'generation',v_state.generation,'hp',v_state.hp,
      'born_at',extract(epoch FROM v_state.born_at)*1000,
    'start_lat',v_state.start_lat,'start_lng',v_state.start_lng,
    'route_bearing',v_state.route_bearing);
  END IF;
  IF v_correct THEN
    IF v_state.hp <= 20 THEN
      v_defeated:=true;
      -- Novi globalni sektor, uz zaštitu od ponavljanja i zbijanja respawnova.
      FOR v_attempt IN 1..16 LOOP
        SELECT lat,lng INTO v_new_lat,v_new_lng FROM public.kz_random_world_spawn(v_state.castle_id);
        EXIT WHEN
          (v_state.start_lat IS NULL OR v_state.start_lng IS NULL OR
           abs(v_new_lat-v_state.start_lat)>1.5 OR
           abs(v_new_lng-v_state.start_lng)>1.5)
          AND NOT EXISTS (
            SELECT 1 FROM public.kz_castle_state other
            WHERE other.castle_id <> v_state.castle_id
              AND other.start_lat IS NOT NULL
              AND other.start_lng IS NOT NULL
              AND abs(other.start_lat-v_new_lat)<0.5
              AND abs(other.start_lng-v_new_lng)<0.5
          );
      END LOOP;
      UPDATE public.kz_castle_state SET
        generation=generation+1,hp=100,born_at=now(),
        defeats=defeats+1,updated_at=now(),
        start_lat=v_new_lat,start_lng=v_new_lng,route_bearing=random()*360
        WHERE castle_id=v_state.castle_id RETURNING * INTO v_state;
    ELSE
      UPDATE public.kz_castle_state SET hp=hp-20,updated_at=now()
        WHERE castle_id=v_state.castle_id RETURNING * INTO v_state;
    END IF;
  END IF;
  RETURN jsonb_build_object('correct',v_correct,'stale',false,
    'defeated',v_defeated,'castle_id',v_attack.castle_id,
    'generation',v_state.generation,'hp',v_state.hp,
    'born_at',extract(epoch FROM v_state.born_at)*1000,
    'start_lat',v_state.start_lat,'start_lng',v_state.start_lng,
    'route_bearing',v_state.route_bearing);
END;
$function$;
COMMIT;

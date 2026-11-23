BEGIN;
-- Globalno slučajno ponovno pojavljivanje: server bira kopnene sektore,
-- bez vezanja uz gradove. Vjerojatnost je proporcionalna površini.
CREATE OR REPLACE FUNCTION public.kz_random_world_spawn()
RETURNS TABLE(lat double precision,lng double precision)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path TO ''
AS $function$
DECLARE zone record;
BEGIN
  SELECT b.west,b.east,b.south,b.north INTO zone
  FROM (VALUES
    (-158.0, -137.0, 55.0, 66.0),
    (-128.0, -112.0, 53.0, 65.0),
    (-112.0, -82.0, 50.0, 65.0),
    (-120.0, -103.0, 32.0, 48.0),
    (-103.0, -74.0, 30.0, 48.0),
    (-97.0, -87.0, 17.0, 26.0),
    (-76.0, -53.0, -9.0, 10.0),
    (-72.0, -49.0, -29.0, -9.0),
    (-70.0, -61.0, -48.0, -30.0),
    (-9.0, 26.0, 43.0, 56.0),
    (25.0, 49.0, 45.0, 59.0),
    (11.0, 25.0, 60.0, 68.0),
    (-12.0, 30.0, 14.0, 30.0),
    (-10.0, 18.0, -5.0, 13.0),
    (19.0, 38.0, -8.0, 14.0),
    (16.0, 31.0, -29.0, -9.0),
    (46.0, 92.0, 38.0, 60.0),
    (70.0, 87.0, 13.0, 29.0),
    (92.0, 119.0, 23.0, 41.0),
    (105.0, 134.0, 41.0, 61.0),
    (97.0, 107.0, 7.0, 22.0),
    (121.0, 139.0, 31.0, 44.0),
    (119.0, 146.0, -33.0, -18.0),
    (48.0, 49.0, -23.0, -15.0)
  ) AS b(west,east,south,north)
  ORDER BY -ln(greatest(random(),1e-10)) /
    ((b.east-b.west)*(sin(radians(b.north))-sin(radians(b.south))))
  LIMIT 1;
  lat := degrees(asin(sin(radians(zone.south))+
    (sin(radians(zone.north))-sin(radians(zone.south)))*random()));
  lng := zone.west+(zone.east-zone.west)*random();
  RETURN NEXT;
END;
$function$;
REVOKE ALL ON FUNCTION public.kz_random_world_spawn() FROM PUBLIC,anon,authenticated;

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
      SELECT lat,lng INTO v_new_lat,v_new_lng FROM public.kz_random_world_spawn();
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

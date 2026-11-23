-- Odmak nakon poraza: izbjegava bliske prethodne i aktivne respawn položaje.
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
        SELECT lat,lng INTO v_new_lat,v_new_lng FROM public.kz_random_world_spawn();
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

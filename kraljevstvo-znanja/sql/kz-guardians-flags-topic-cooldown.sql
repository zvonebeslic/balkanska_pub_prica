-- KZ: random eligible source, then random unseen ABC question; avoid the last five sources across flags and guardians when possible.
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
 select * into f from public.kz_flag_points where id=p_flag_id for update;
 if not found or f.generation<>p_generation then raise exception 'Zastavica je već premještena.'; end if;
 
 if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
 if public.kz_geo_dist_km(p_lat,p_lng,f.lat,f.lng)>2 then raise exception 'Zastavica je izvan kruga od 2 km.'; end if;
 select * into a from public.kz_flag_attempts where player_id=v_player and flag_id=f.id and generation=f.generation and answered_at is null order by issued_at desc limit 1;
 if found then
  if a.answered_at is not null then raise exception 'Pokušaj je već iskorišten.'; end if;
  select * into q from public.kz_questions where id=a.question_id;
 else
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
  insert into public.kz_flag_attempts(player_id,flag_id,generation,question_id) values(v_player,f.id,f.generation,q.id) returning * into a;
  insert into public.kz_seen(player_id,question_id) values(v_player,q.id) on conflict do nothing;
 end if;
 return jsonb_build_object('challenge_id',a.id,'prompt',q.prompt,'options',q.options,'image',q.image,'kind',f.kind,'remaining',case when f.kind='iwo' then 3-f.used_attempts when f.kind='corner' then 2-f.used_attempts else 1 end);
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

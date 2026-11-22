-- KvizToGo · Shared Castle Fleet in Kingdom of Knowledge.
-- Mirror of the live verified setup for repeatable deployments.
-- Access only through authenticated game RPC; direct table access denied.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kz_castle_state (
  castle_id integer PRIMARY KEY CHECK(castle_id BETWEEN 0 AND 20000),
  generation integer NOT NULL DEFAULT 0 CHECK(generation>=0),
  hp integer NOT NULL DEFAULT 100 CHECK(hp BETWEEN 1 AND 100),
  born_at timestamptz NOT NULL DEFAULT now(),
  defeats integer NOT NULL DEFAULT 0 CHECK(defeats>=0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kz_castle_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kz_castle_state FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.kz_castle_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.kz_players(id) ON DELETE CASCADE,
  castle_id integer NOT NULL,
  generation integer NOT NULL,
  question_id text NOT NULL REFERENCES public.kz_questions(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  choice text
);
ALTER TABLE public.kz_castle_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kz_castle_challenges FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS kz_castle_challenges_player_time
  ON public.kz_castle_challenges(player_id,issued_at DESC);

CREATE OR REPLACE FUNCTION public.kz_castle_answer(p_guest_id uuid, p_guest_secret text, p_challenge_id uuid, p_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_player uuid; v_attack public.kz_castle_challenges%rowtype;
  v_correct_key text; v_correct boolean; v_state public.kz_castle_state%rowtype;
  v_defeated boolean := false;
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
      'born_at',extract(epoch FROM v_state.born_at)*1000);
  END IF;
  IF v_correct THEN
    IF v_state.hp <= 20 THEN
      v_defeated:=true;
      UPDATE public.kz_castle_state SET
        generation=generation+1,hp=100,born_at=now(),
        defeats=defeats+1,updated_at=now()
        WHERE castle_id=v_state.castle_id RETURNING * INTO v_state;
    ELSE
      UPDATE public.kz_castle_state SET hp=hp-20,updated_at=now()
        WHERE castle_id=v_state.castle_id RETURNING * INTO v_state;
    END IF;
  END IF;
  RETURN jsonb_build_object('correct',v_correct,'stale',false,
    'defeated',v_defeated,'castle_id',v_attack.castle_id,
    'generation',v_state.generation,'hp',v_state.hp,
    'born_at',extract(epoch FROM v_state.born_at)*1000);
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
  IF p_castle_id IS NULL OR p_castle_id < 0 OR p_castle_id >= 201 + least(v_count, 1000) THEN
    RAISE EXCEPTION 'Dvorac nije aktivan.';
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
  SELECT * INTO v_question FROM public.kz_questions ORDER BY random() LIMIT 1;
  IF v_question.id IS NULL THEN RAISE EXCEPTION 'Trenutačno nema dostupnih pitanja.'; END IF;
  INSERT INTO public.kz_castle_challenges(player_id,castle_id,generation,question_id)
    VALUES(v_player,p_castle_id,v_gen,v_question.id) RETURNING * INTO v_existing;
  RETURN jsonb_build_object('challenge_id',v_existing.id,'castle_id',p_castle_id,
    'generation',v_gen,'hp',v_hp,'prompt',v_question.prompt,'options',v_question.options);
END;
$function$;

CREATE OR REPLACE FUNCTION public.kz_castle_status()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'now', extract(epoch FROM now())*1000,
    'kingdoms',(SELECT count(*) FROM public.kz_kingdoms),
    'states',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',s.castle_id,'generation',s.generation,'hp',s.hp,
      'born_at',extract(epoch FROM s.born_at)*1000,
      'defeats',s.defeats)),'[]'::jsonb) FROM public.kz_castle_state s)
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.kz_castle_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kz_castle_challenge(uuid,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kz_castle_answer(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kz_castle_status() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kz_castle_challenge(uuid,text,integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kz_castle_answer(uuid,text,uuid,text) TO anon,authenticated;
COMMIT;

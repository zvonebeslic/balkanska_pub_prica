-- KvizToGo · GPS knowledge attacks / guardian daily quota / realm bank rewards.
-- Existing tables kz_castle_state, kz_castle_challenges, kz_kingdoms and
-- kz_players are created by earlier Kraljevstvo znanja migrations.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kz_guardian_catalog(
  guardian_id integer PRIMARY KEY CHECK(guardian_id BETWEEN 0 AND 13199),
  kind text NOT NULL CHECK(kind IN ('castle','iron')),
  base_lat double precision NOT NULL CHECK(base_lat BETWEEN -90 AND 90),
  base_lng double precision NOT NULL CHECK(base_lng BETWEEN -180 AND 180),
  base_bearing double precision NOT NULL DEFAULT 0,
  reward_m2 integer NOT NULL CHECK(reward_m2 IN (20,80))
);
ALTER TABLE public.kz_guardian_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kz_guardian_catalog FROM PUBLIC,anon,authenticated;
ALTER TABLE public.kz_castle_state
  ADD COLUMN IF NOT EXISTS start_lat double precision,
  ADD COLUMN IF NOT EXISTS start_lng double precision,
  ADD COLUMN IF NOT EXISTS route_bearing double precision;
CREATE TABLE IF NOT EXISTS public.kz_guardian_rewards(
  guardian_id integer NOT NULL,
  generation integer NOT NULL,
  kingdom_id uuid NOT NULL REFERENCES public.kz_kingdoms(id),
  player_id uuid NOT NULL REFERENCES public.kz_players(id),
  reward_m2 integer NOT NULL CHECK(reward_m2>0),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(guardian_id,generation)
);
ALTER TABLE public.kz_guardian_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kz_guardian_rewards FROM PUBLIC,anon,authenticated;
ALTER TABLE public.kz_castle_challenges
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'legacy';
CREATE INDEX IF NOT EXISTS kz_castle_daily_attempts_idx
  ON public.kz_castle_challenges(player_id,issued_at)
  WHERE mode='guardian';

CREATE OR REPLACE FUNCTION public.kz_castle_status()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT jsonb_build_object(
  'now',extract(epoch FROM now())*1000,
  'kingdoms',(SELECT count(*) FROM public.kz_kingdoms),
  'states',(SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',s.castle_id,'generation',s.generation,'hp',s.hp,
    'born_at',extract(epoch FROM s.born_at)*1000,
    'defeats',s.defeats,'start_lat',s.start_lat,'start_lng',s.start_lng,
    'route_bearing',s.route_bearing)),'[]'::jsonb)
   FROM public.kz_castle_state s)
 );
$function$
;

CREATE OR REPLACE FUNCTION public.kz_geo_bearing(lat_a double precision, lng_a double precision, lat_b double precision, lng_b double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 SELECT mod((degrees(atan2(
   sin(radians(lng_b-lng_a))*cos(radians(lat_b)),
   cos(radians(lat_a))*sin(radians(lat_b))-
   sin(radians(lat_a))*cos(radians(lat_b))*cos(radians(lng_b-lng_a))
 ))+360)::numeric,360)::double precision;
$function$
;

CREATE OR REPLACE FUNCTION public.kz_geo_dest(lat double precision, lng double precision, bearing double precision, km double precision)
 RETURNS double precision[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
DECLARE
  a double precision:=radians(lat);
  l double precision:=radians(lng);
  b double precision:=radians(bearing);
  d double precision:=km/6371.0088;
  ny double precision;
  nx double precision;
BEGIN
  ny:=asin(least(1,greatest(-1,sin(a)*cos(d)+cos(a)*sin(d)*cos(b))));
  nx:=l+atan2(sin(b)*sin(d)*cos(a),cos(d)-sin(a)*sin(ny));
  RETURN ARRAY[degrees(ny),mod((degrees(nx)+540)::numeric,360)::double precision-180];
END;
$function$
;

CREATE OR REPLACE FUNCTION public.kz_geo_dist_km(lat_a double precision, lng_a double precision, lat_b double precision, lng_b double precision)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 SELECT 12742.0176*asin(least(1.0,sqrt(
   power(sin(radians((lat_b-lat_a)/2)),2)+
   cos(radians(lat_a))*cos(radians(lat_b))*
   power(sin(radians((lng_b-lng_a)/2)),2)
 )));
$function$
;

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
      -- Robot remains stationary after spawning; new robot appears nearby.
      IF cfg.kind='iron' THEN
        new_origin:=public.kz_geo_dest(cfg.base_lat,cfg.base_lng,random()*360,1+4*random());
      ELSE
        new_origin:=public.kz_geo_dest(cfg.base_lat,cfg.base_lng,random()*360,6+22*random());
      END IF;
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
$function$
;

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
  SELECT * INTO question FROM public.kz_questions q
    WHERE NOT EXISTS(SELECT 1 FROM public.kz_castle_challenges a
      WHERE a.player_id=player AND a.question_id=q.id AND a.mode='guardian')
    ORDER BY random() LIMIT 1;
  IF question.id IS NULL THEN
    SELECT * INTO question FROM public.kz_questions ORDER BY random() LIMIT 1;
  END IF;
  IF question.id IS NULL THEN RAISE EXCEPTION 'Pitanja nisu dostupna.';END IF;
  INSERT INTO public.kz_castle_challenges(
     player_id,castle_id,generation,question_id,mode)
     VALUES(player,p_guardian_id,gen,question.id,'guardian')
     RETURNING id INTO new_challenge;
  RETURN jsonb_build_object('challenge_id',new_challenge,'guardian_id',p_guardian_id,
    'generation',gen,'hp',coalesce(combat.hp,100),
    'prompt',question.prompt,'options',question.options,
    'remaining',49-attempts);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.kz_guardian_position(p_guardian_id integer, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(lat double precision, lng double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE c public.kz_guardian_catalog%rowtype;
  st public.kz_castle_state%rowtype;
  origin_lat double precision; origin_lng double precision;
  b double precision;heading double precision;km_left double precision; seg double precision;
  p double precision[]; q double precision[];
  ys double precision[]; xs double precision[];
  kms double precision[]:=ARRAY[0,200,400,500,525,550,575,600,800,1000];
  sides double precision[]:=ARRAY[0,0,0,0,22,-22,22,0,0,0];
  k integer;j integer;cycle integer;
BEGIN
 SELECT * INTO c FROM public.kz_guardian_catalog WHERE guardian_id=p_guardian_id;
 IF NOT FOUND THEN RETURN;END IF;
 SELECT * INTO st FROM public.kz_castle_state WHERE castle_id=p_guardian_id;
 IF c.kind='iron' THEN
   lat:=coalesce(st.start_lat,c.base_lat);
   lng:=coalesce(st.start_lng,c.base_lng);
   RETURN NEXT;RETURN;
 END IF;
 origin_lat:=coalesce(st.start_lat,c.base_lat);
 origin_lng:=coalesce(st.start_lng,c.base_lng);
 b:=coalesce(st.route_bearing,c.base_bearing);
 km_left:=greatest(0,extract(epoch FROM (p_at-coalesce(st.born_at,'2026-11-22 17:00:00+00'::timestamptz)))/1800.0);

 FOR cycle IN 0..1000 LOOP
   heading:=b+cycle*7*(CASE WHEN mod(p_guardian_id,2)=0 THEN 1 ELSE -1 END);
   ys:=ARRAY[]::double precision[];xs:=ARRAY[]::double precision[];
   FOR k IN 1..10 LOOP
      p:=public.kz_geo_dest(origin_lat,origin_lng,heading,kms[k]);
      IF sides[k]<>0 THEN p:=public.kz_geo_dest(p[1],p[2],heading+90,sides[k]);END IF;
      ys:=array_append(ys,p[1]);xs:=array_append(xs,p[2]);
   END LOOP;
   -- outward waypoints and reversed return, avoiding duplicate far endpoint
   FOR j IN 11..19 LOOP
      ys:=array_append(ys,ys[20-j]);xs:=array_append(xs,xs[20-j]);
   END LOOP;
   FOR j IN 1..array_length(ys,1)-1 LOOP
     seg:=public.kz_geo_dist_km(ys[j],xs[j],ys[j+1],xs[j+1]);
     IF km_left<=seg THEN
       p:=public.kz_geo_dest(ys[j],xs[j],
         public.kz_geo_bearing(ys[j],xs[j],ys[j+1],xs[j+1]),km_left);
       lat:=p[1];lng:=p[2];RETURN NEXT;RETURN;
     END IF;
     km_left:=km_left-seg;
   END LOOP;
 END LOOP;
 lat:=origin_lat;lng:=origin_lng;RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.kz_guardian_quota(p_guest_id uuid, p_guest_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_player uuid;day_start timestamptz;used integer;
BEGIN
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 day_start:=((now() AT TIME ZONE 'Europe/Sarajevo')::date
   AT TIME ZONE 'Europe/Sarajevo');
 SELECT count(*) INTO used FROM public.kz_castle_challenges
   WHERE player_id=v_player AND mode='guardian' AND issued_at>=day_start;
 RETURN jsonb_build_object('remaining',greatest(0,50-used),'used',used,
   'daily_limit',50,
   'resets_at',extract(epoch from
     (((now() AT TIME ZONE 'Europe/Sarajevo')::date+1)
       AT TIME ZONE 'Europe/Sarajevo'))*1000);
END;
$function$
;

REVOKE EXECUTE ON FUNCTION public.kz_guardian_position(integer,timestamptz)
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.kz_guardian_quota(uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kz_guardian_quota(uuid,text) TO anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.kz_guardian_challenge(uuid,text,integer,double precision,double precision,double precision)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kz_guardian_challenge(uuid,text,integer,double precision,double precision,double precision)
  TO anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.kz_guardian_answer(uuid,text,uuid,text,double precision,double precision,double precision)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kz_guardian_answer(uuid,text,uuid,text,double precision,double precision,double precision)
  TO anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.kz_castle_challenge(uuid,text,integer)
  FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.kz_castle_answer(uuid,text,uuid,text)
  FROM PUBLIC,anon,authenticated;
COMMIT;

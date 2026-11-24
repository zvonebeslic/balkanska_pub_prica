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
  select * into q from public.kz_questions q0 where q0.options ?& array['A','B','C'] and q0.correct_key in ('A','B','C') and not exists(select 1 from public.kz_seen s where s.player_id=v_player and s.question_id=q0.id) and not exists(select 1 from public.kz_flag_attempts other where other.flag_id=f.id and other.generation=f.generation and other.question_id=q0.id) order by random() limit 1;
  if not found then raise exception 'Pitanja nisu dostupna.'; end if;
  insert into public.kz_flag_attempts(player_id,flag_id,generation,question_id) values(v_player,f.id,f.generation,q.id) returning * into a;
  insert into public.kz_seen(player_id,question_id) values(v_player,q.id) on conflict do nothing;
 end if;
 return jsonb_build_object('challenge_id',a.id,'prompt',q.prompt,'options',q.options,'image',q.image,'kind',f.kind,'remaining',case when f.kind='corner' then 2-f.used_attempts else 1 end);
end $function$;
notify pgrst,'reload schema';
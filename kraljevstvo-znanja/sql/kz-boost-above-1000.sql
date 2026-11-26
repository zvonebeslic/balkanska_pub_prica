CREATE OR REPLACE FUNCTION public.kz_answer(p_guest_id uuid, p_guest_secret text, p_game_id uuid, p_number integer, p_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_player uuid; v_game public.kz_games%rowtype; v_expected integer;
 v_right text; v_correct boolean; v_deadline timestamptz; v_expired boolean; v_earned integer:=0; v_area bigint; v_role text; v_cool timestamptz;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 select * into v_game from public.kz_games where id=p_game_id and player_id=v_player for update;
 if not found or v_game.finished_at is not null then raise exception 'Ova partija više nije aktivna'; end if;
 if coalesce(p_choice,'') not in ('A','B','C','SKIP') then raise exception 'Odgovor mora biti A, B ili C'; end if;
 select min(position) into v_expected from public.kz_game_questions
 where game_id=v_game.id and answered_at is null;
 if v_expected is null or p_number is distinct from v_expected then raise exception 'Pitanja se rješavaju redom i samo jednom'; end if;
 if not exists (select 1 from public.kz_members where player_id=v_player and kingdom_id=v_game.kingdom_id) then
   raise exception 'Članstvo se promijenilo tijekom partije'; end if;
 select q.correct_key,g.deadline_at into v_right,v_deadline from public.kz_game_questions g join public.kz_questions q on q.id=g.question_id
 where g.game_id=p_game_id and g.position=p_number;
 if v_deadline is null then raise exception 'Prvo pokreni pitanje'; end if;
 v_expired:=p_choice='SKIP' or clock_timestamp()>=v_deadline;
 v_correct:=not v_expired and p_choice=v_right;
 if v_correct then
   select area_m2 into v_area from public.kz_kingdoms where id=v_game.kingdom_id for update;
   select role into v_role from public.kz_members where player_id=v_player;
   v_earned:=case when v_area<=1000 then 40 when v_role='kralj' then 60
       when v_role='vojvoda' then 50 else 44 end;
   update public.kz_kingdoms set bank_m2=bank_m2+v_earned where id=v_game.kingdom_id;
 end if;
 update public.kz_game_questions set choice=case when v_expired then null else p_choice end,correct=v_correct,earned_m2=v_earned,answered_at=now()
 where game_id=p_game_id and position=p_number;
 update public.kz_games set correct_count=correct_count+case when v_correct then 1 else 0 end,
 wrong_count=wrong_count+case when v_correct then 0 else 1 end,
 earned_m2=earned_m2+v_earned
 where id=p_game_id;
 if p_number=10 then
   v_cool:=now()+interval '4 hours';
   update public.kz_games set finished_at=now(), duration_seconds=greatest(0,floor(extract(epoch from now()-started_at)))::integer where id=p_game_id;
   update public.kz_players set cooldown_until=v_cool where id=v_player;
 end if;
 return jsonb_build_object('correct',v_correct,'timed_out',v_expired,'correct_key',v_right,'earned',v_earned,
   'finished',p_number=10,'cooldown_until',v_cool);
end $function$
;

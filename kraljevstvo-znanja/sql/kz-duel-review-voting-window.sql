CREATE OR REPLACE FUNCTION public.kz_vote(p_guest_id uuid, p_guest_secret text, p_game_id uuid, p_position integer, p_vote text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_player uuid;v_question text;v_prompt text;v_source text;v_answer text;v_session text;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 if p_vote not in ('like','dislike') then raise exception 'Nepoznata ocjena';end if;
 select a.id,a.prompt,a.source,a.options->>a.correct_key
 into v_question,v_prompt,v_source,v_answer
 from public.kz_games g
 join public.kz_game_questions q on q.game_id=g.id
 join public.kz_questions a on a.id=q.question_id
 where g.id=p_game_id and g.player_id=v_player and q.position=p_position and q.answered_at is not null;
 if v_question is null then
   select a.id,a.prompt,a.source,a.options->>a.correct_key into v_question,v_prompt,v_source,v_answer
   from kz_private.duel_rounds r join kz_private.territory_duels d on d.id=r.duel_id
   join public.kz_questions a on a.id=r.question_id join kz_private.duel_reviews v on v.duel_id=d.id and v.player_id=v_player
   where r.duel_id=p_game_id and r.position=p_position and r.resolved_at is not null and d.status<>'active';
 end if;
 if v_question is null then raise exception 'Pitanje nije tvoje ili još nije odgovoreno';end if;
 v_session:='kz:'||v_player::text;
 perform pg_advisory_xact_lock(hashtext(v_session),hashtext(v_question));
 if exists(select 1 from public.quiz_question_votes
   where session_id=v_session and question_id=v_question and quiz_mode='kraljevstvo_znanja')
 then return false;end if;
 insert into public.quiz_question_votes(session_id,user_id,question_id,question_text,
  correct_answer,question_topic,quiz_mode,selected_theme,vote,language)
 values(v_session,auth.uid(),v_question,v_prompt,v_answer,replace(v_source,'.json',''),
  'kraljevstvo_znanja',null,p_vote,'hr');
 return true;
end $function$
;

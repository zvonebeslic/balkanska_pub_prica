CREATE OR REPLACE FUNCTION public.kz_active_battles()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',d.id,'x',d.x,'y',d.y,'attacker',a.name,'defender',b.name,'attacker_id',d.attacker,'defender_id',d.defender,'defended',d.defender_player is not null,
  'remaining_ms',greatest(0,floor(extract(epoch from (greatest(d.activity_at,coalesce(d.deadline,d.activity_at))+interval '2 minutes'-now()))*1000))
 ) order by d.created_at),'[]'::jsonb)
 from kz_private.territory_duels d
 join public.kz_kingdoms a on a.id=d.attacker
 join public.kz_kingdoms b on b.id=d.defender
 where d.status='active'
 and greatest(d.activity_at,coalesce(d.deadline,d.activity_at))>now()-interval '2 minutes'
 and (select count(*) from public.kz_cells c where c.kingdom_id=d.defender and c.x between d.x and d.x+4 and c.y between d.y and d.y+3)=20
 and exists(select 1 from public.kz_cells c where c.kingdom_id=d.attacker and
 ((c.x in(d.x-1,d.x+5) and c.y between d.y and d.y+3) or
 (c.y in(d.y-1,d.y+4) and c.x between d.x and d.x+4)));
$function$
;
CREATE OR REPLACE FUNCTION public.kz_member_statistics(p_guest_id uuid, p_guest_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare player uuid; realm uuid; result jsonb;
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into realm from public.kz_members where player_id=player;
 with members as (
  select p.id,p.display_name,m.role from public.kz_players p
  left join public.kz_members m on m.player_id=p.id
  where (realm is not null and m.kingdom_id=realm) or (realm is null and p.id=player)
 ), events as (
  select g.player_id,'quiz'::text as kind,
   count(*) filter(where q.correct is true) hits,
   count(*) filter(where q.correct is not true) misses,
   coalesce(sum(q.earned_m2),0)::bigint earned,0::bigint captured
   from public.kz_games g join members m on m.id=g.player_id join public.kz_game_questions q on q.game_id=g.id
   where q.answered_at is not null or q.deadline_at<=now() group by g.player_id
  union all
  select c.player_id,'guardian',count(*) filter(where c.choice=q.correct_key),count(*) filter(where c.choice is distinct from q.correct_key),0,0
   from public.kz_castle_challenges c join members m on m.id=c.player_id join public.kz_questions q on q.id=c.question_id
   where c.answered_at is not null or c.issued_at+make_interval(secs=>case when c.mode='guardian' then public.kz_question_seconds(q.prompt) else 180 end)<=now()
   group by c.player_id
  union all
  select r.player_id,'guardian',0,0,coalesce(sum(r.reward_m2),0),0
   from public.kz_guardian_rewards r join members m on m.id=r.player_id group by r.player_id
  union all
  select f.player_id,'flag',count(*) filter(where f.choice=q.correct_key),count(*) filter(where f.choice is distinct from q.correct_key),
   coalesce(sum(f.reward_m2),0),0
   from public.kz_flag_attempts f join members m on m.id=f.player_id join public.kz_questions q on q.id=f.question_id
   where f.answered_at is not null or f.issued_at+make_interval(secs=>public.kz_question_seconds(q.prompt))<=now()
   group by f.player_id
  union all
  select s.player_id,'territory',sum(s.hits),sum(s.misses),0,sum(s.captured_m2)
   from kz_private.duel_player_scores s join members m on m.id=s.player_id group by s.player_id
  union all
  select p.player_id,'territory',0,count(*),0,0
   from kz_private.duel_rounds r join kz_private.territory_duels d on d.id=r.duel_id
   cross join lateral (values(r.attacker_player,r.attacker_choice),(r.defender_player,r.defender_choice)) p(player_id,choice)
   join members m on m.id=p.player_id
   where d.status='active' and r.resolved_at is null and r.deadline<=now() and p.choice is null group by p.player_id
 ), source_totals as (
  select player_id,kind,sum(hits) hits,sum(misses) misses,sum(earned) earned,sum(captured) captured from events group by player_id,kind
 ), totals as (
  select player_id,sum(hits) hits,sum(misses) misses,sum(earned) earned,sum(captured) captured,
    jsonb_object_agg(kind,jsonb_build_object('correct',hits,'wrong',misses,'earned',earned,'captured',captured)) sources
  from source_totals group by player_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'role',m.role,
   'total_correct',coalesce(t.hits,0),'total_wrong',coalesce(t.misses,0),
   'total_earned',coalesce(t.earned,0),'captured_m2',coalesce(t.captured,0),'sources',coalesce(t.sources,'{}'::jsonb))
  order by case m.role when 'kralj' then 1 when 'vojvoda' then 2 else 3 end,m.display_name),'[]'::jsonb)
 into result from members m left join totals t on t.player_id=m.id;
 return result;
end $function$
;
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
   where r.duel_id=p_game_id and r.position=p_position and r.resolved_at is not null and d.status<>'active'
    and v.viewed_at>=now()-interval '5 minutes';
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

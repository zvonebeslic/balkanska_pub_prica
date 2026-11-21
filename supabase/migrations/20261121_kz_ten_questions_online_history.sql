-- Kraljevstvo Znanja: 10 ABC pitanja svaka 4 sata i ista povijest/ocjene kao Online kviz.
-- Povijest ranijih završenih partija ne mijenja se.
alter table public.kz_games drop constraint if exists kz_games_check;
alter table public.kz_games add constraint kz_games_check check(correct_count+wrong_count<=10);
alter table public.kz_game_questions drop constraint if exists kz_game_questions_position_check;
alter table public.kz_game_questions add constraint kz_game_questions_position_check check(position between 1 and 10);

CREATE OR REPLACE FUNCTION public.kz_start(p_guest_id uuid, p_guest_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_player uuid; v_kingdom uuid; v_game uuid; v_cooldown timestamptz; v_count integer;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select cooldown_until into v_cooldown from public.kz_players where id=v_player for update;
 select kingdom_id into v_kingdom from public.kz_members where player_id=v_player;
 if v_kingdom is null then raise exception 'Prvo osnuj kraljevstvo ili se pridruži postojećem'; end if;
 select id into v_game from public.kz_games where player_id=v_player and finished_at is null;
 if v_game is null then
   if v_cooldown>now() then raise exception 'Pitanja su na hlađenju do %',v_cooldown; end if;
   select count(*) into v_count from public.kz_questions q
   where not exists(select 1 from public.kz_seen s where s.player_id=v_player and s.question_id=q.id);
   if v_count<10 then raise exception 'Baza nema deset novih, neponovljenih ABC pitanja'; end if;
   insert into public.kz_games(player_id,kingdom_id) values(v_player,v_kingdom) returning id into v_game;
   with picked as (select q.id from public.kz_questions q
      where not exists(select 1 from public.kz_seen s where s.player_id=v_player and s.question_id=q.id)
      order by random() limit 10),
    numbered as (select id,row_number() over()::smallint as pos from picked)
   insert into public.kz_game_questions(game_id,position,question_id)
     select v_game,pos,id from numbered;
   insert into public.kz_seen(player_id,question_id)
     select v_player,question_id from public.kz_game_questions where game_id=v_game;
 end if;
 return public.kz_state(p_guest_id,p_guest_secret);
end $function$;
CREATE OR REPLACE FUNCTION public.kz_answer(p_guest_id uuid, p_guest_secret text, p_game_id uuid, p_number integer, p_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_player uuid; v_game public.kz_games%rowtype; v_expected integer;
 v_right text; v_correct boolean; v_earned integer:=0; v_area bigint; v_role text; v_cool timestamptz;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 select * into v_game from public.kz_games where id=p_game_id and player_id=v_player for update;
 if not found or v_game.finished_at is not null then raise exception 'Ova partija više nije aktivna'; end if;
 if p_choice not in ('A','B','C') then raise exception 'Odgovor mora biti A, B ili C'; end if;
 select min(position) into v_expected from public.kz_game_questions
 where game_id=v_game.id and answered_at is null;
 if p_number<>v_expected then raise exception 'Pitanja se rješavaju redom i samo jednom'; end if;
 if not exists (select 1 from public.kz_members where player_id=v_player and kingdom_id=v_game.kingdom_id) then
   raise exception 'Članstvo se promijenilo tijekom partije'; end if;
 select q.correct_key into v_right from public.kz_game_questions g join public.kz_questions q on q.id=g.question_id
 where g.game_id=p_game_id and g.position=p_number;
 v_correct:=(p_choice=v_right);
 if v_correct then
   select area_m2 into v_area from public.kz_kingdoms where id=v_game.kingdom_id for update;
   select role into v_role from public.kz_members where player_id=v_player;
   v_earned:=case when v_area<500 then 40 when v_role='kralj' then 60
       when v_role='vojvoda' then 50 else 44 end;
   update public.kz_kingdoms set bank_m2=bank_m2+v_earned where id=v_game.kingdom_id;
 end if;
 update public.kz_game_questions set choice=p_choice,correct=v_correct,earned_m2=v_earned,answered_at=now()
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
 return jsonb_build_object('correct',v_correct,'correct_key',v_right,'earned',v_earned,
   'finished',p_number=10,'cooldown_until',v_cool);
end $function$;
CREATE OR REPLACE FUNCTION public.kz_state(p_guest_id uuid, p_guest_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_player uuid; v_realm uuid; v_role text; v_result jsonb; v_game jsonb;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id,role into v_realm,v_role from public.kz_members where player_id=v_player;
 select jsonb_build_object('id',g.id,'started_at',g.started_at,
   'questions',(select coalesce(jsonb_agg(jsonb_build_object(
      'position',q.position,'id',a.id,'source',a.source,'prompt',a.prompt,'options',a.options,'image',a.image,
      'correct_key',case when q.choice is not null then a.correct_key else null end,
      'choice',q.choice,'correct',q.correct,'earned',q.earned_m2) order by q.position),'[]'::jsonb)
     from public.kz_game_questions q join public.kz_questions a on a.id=q.question_id where q.game_id=g.id))
   into v_game from public.kz_games g where g.player_id=v_player and g.finished_at is null limit 1;
 select jsonb_build_object(
  'player',(select jsonb_build_object('id',p.id,'name',p.display_name,'cooldown_until',p.cooldown_until,
    'total_correct',(select coalesce(sum(correct_count),0) from public.kz_games where player_id=v_player and finished_at is not null),
    'total_wrong',(select coalesce(sum(wrong_count),0) from public.kz_games where player_id=v_player and finished_at is not null),
    'total_earned',(select coalesce(sum(earned_m2),0) from public.kz_games where player_id=v_player and finished_at is not null))
    from public.kz_players p where p.id=v_player),
  'kingdom',(select jsonb_build_object('id',k.id,'name',k.name,'color',k.color,'area',k.area_m2,
    'bank',k.bank_m2,'role',v_role,'anchor_x',k.anchor_x,'anchor_y',k.anchor_y)
    from public.kz_kingdoms k where k.id=v_realm),
  'members',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'role',m.role,
    'cooldown_until',p.cooldown_until,
    'last10',(select coalesce(jsonb_agg(jsonb_build_object('at',h.finished_at,'correct',h.correct_count,
       'wrong',h.wrong_count,'earned',h.earned_m2,'seconds',h.duration_seconds) order by h.finished_at desc),'[]'::jsonb)
       from (select finished_at,correct_count,wrong_count,earned_m2,duration_seconds from public.kz_games
         where player_id=p.id and finished_at is not null order by finished_at desc limit 10) h),
    'total_correct',(select coalesce(sum(correct_count),0) from public.kz_games where player_id=p.id and finished_at is not null),
    'total_wrong',(select coalesce(sum(wrong_count),0) from public.kz_games where player_id=p.id and finished_at is not null),
    'total_earned',(select coalesce(sum(earned_m2),0) from public.kz_games where player_id=p.id and finished_at is not null))
    order by case m.role when 'kralj' then 1 when 'vojvoda' then 2 else 3 end,p.display_name),'[]'::jsonb)
    from public.kz_members m join public.kz_players p on p.id=m.player_id where m.kingdom_id=v_realm),
  'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',p.display_name,'at',r.created_at) order by r.created_at),'[]'::jsonb)
    from public.kz_join_requests r join public.kz_players p on p.id=r.player_id
    where r.kingdom_id=v_realm and r.status='pending' and v_role='kralj'),
  'mail',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'body',x.body,'at',x.created_at,'read',x.read_at is not null) order by x.created_at desc),'[]'::jsonb)
    from (select id,body,created_at,read_at from public.kz_mail where player_id=v_player order by created_at desc limit 30) x),
  'game',v_game
 ) into v_result;
 return v_result;
end $function$;

-- Ako je netko počeo staru partiju s 5 pitanja, nadopuni mu je do 10 bez ponavljanja.
do $migrate$
declare g record; v_needed int; v_found int;
begin
 for g in select id,player_id from public.kz_games where finished_at is null loop
   select greatest(0,10-count(*)) into v_needed from public.kz_game_questions where game_id=g.id;
   if v_needed>0 then
     with picked as (
       select q.id from public.kz_questions q
       where not exists(select 1 from public.kz_seen s where s.player_id=g.player_id and s.question_id=q.id)
       order by random() limit v_needed
     ), numbered as (
       select id, (select coalesce(max(position),0) from public.kz_game_questions where game_id=g.id)
         + row_number() over()::integer as pos from picked
     )
     insert into public.kz_game_questions(game_id,position,question_id)
     select g.id,pos,id from numbered;
     get diagnostics v_found=row_count;
     if v_found<>v_needed then raise exception 'Nema dovoljno pitanja za nadopunu stare partije %',g.id;end if;
     insert into public.kz_seen(player_id,question_id)
     select g.player_id,question_id from public.kz_game_questions
     where game_id=g.id on conflict do nothing;
   end if;
 end loop;
end $migrate$;

-- Igračev pregled pojedinačnih odgovora iz zadnjih 12 partija (uključuje završenu partiju).
create or replace function public.kz_history(p_guest_id uuid,p_guest_secret text)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'at',g.finished_at,
   'correct',g.correct_count,'wrong',g.wrong_count,'earned',g.earned_m2,
   'seconds',g.duration_seconds,
   'questions',(select coalesce(jsonb_agg(jsonb_build_object(
     'position',q.position,'id',a.id,'source',a.source,'prompt',a.prompt,'options',a.options,
     'image',a.image,'choice',q.choice,'correct_key',a.correct_key,
     'correct',q.correct,'earned',q.earned_m2) order by q.position),'[]'::jsonb)
    from public.kz_game_questions q join public.kz_questions a on a.id=q.question_id
    where q.game_id=g.id)) order by g.finished_at desc),'[]'::jsonb)
 from (select id,finished_at,correct_count,wrong_count,earned_m2,duration_seconds
       from public.kz_games where player_id=public.kz_who(p_guest_id,p_guest_secret)
       and finished_at is not null order by finished_at desc limit 12) g;
$$;
revoke all on function public.kz_history(uuid,text) from public;
grant execute on function public.kz_history(uuid,text) to anon,authenticated;

-- Ocjene se upisuju u isti quiz_question_votes kao na Online kvizu,
-- ali samo za odgovor koji je podnositelj stvarno riješio.
create or replace function public.kz_vote(p_guest_id uuid,p_guest_secret text,
 p_game_id uuid,p_position integer,p_vote text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
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
end $$;
revoke all on function public.kz_vote(uuid,text,uuid,integer,text) from public;
grant execute on function public.kz_vote(uuid,text,uuid,integer,text) to anon,authenticated;
notify pgrst, 'reload schema';

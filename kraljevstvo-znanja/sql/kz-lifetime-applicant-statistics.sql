create table if not exists kz_private.archived_duel_scores(
 duel_id uuid not null,player_id uuid not null references public.kz_players(id) on delete cascade,
 hits integer not null,misses integer not null,captured_m2 bigint not null,primary key(duel_id,player_id)
);
alter table kz_private.archived_duel_scores enable row level security;
revoke all on kz_private.archived_duel_scores from public,anon,authenticated;
create index if not exists kz_archived_duel_scores_player on kz_private.archived_duel_scores(player_id);
create or replace function kz_private.archive_duel_personal_statistics() returns trigger language plpgsql set search_path='' as $$
begin
 insert into kz_private.archived_duel_scores(duel_id,player_id,hits,misses,captured_m2)
 select duel_id,player_id,hits,misses,captured_m2 from kz_private.duel_player_scores where duel_id=old.id
 on conflict(duel_id,player_id) do nothing;
 return old;
end $$;
revoke all on function kz_private.archive_duel_personal_statistics() from public,anon,authenticated;
drop trigger if exists kz_archive_duel_personal_statistics on kz_private.territory_duels;
create trigger kz_archive_duel_personal_statistics before delete on kz_private.territory_duels
for each row execute function kz_private.archive_duel_personal_statistics();
create or replace function kz_private.player_lifetime_statistics(p_ids uuid[])
returns jsonb language plpgsql stable set search_path='' as $function$
declare result jsonb;
begin
 with members as (
  select p.id,p.display_name,m.role,m.joined_at from public.kz_players p
  left join public.kz_members m on m.player_id=p.id
  where p.id=any(p_ids)
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
   from (select player_id,hits,misses,captured_m2 from kz_private.duel_player_scores union all select player_id,hits,misses,captured_m2 from kz_private.archived_duel_scores) s join members m on m.id=s.player_id group by s.player_id
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
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'role',m.role,'joined_at',m.joined_at,
   'total_correct',coalesce(t.hits,0),'total_wrong',coalesce(t.misses,0),
   'total_earned',coalesce(t.earned,0),'captured_m2',coalesce(t.captured,0),'sources',coalesce(t.sources,'{}'::jsonb))
  order by case m.role when 'kralj' then 1 when 'vojvoda' then 2 else 3 end,m.joined_at asc nulls last,m.id),'[]'::jsonb)
 into result from members m left join totals t on t.player_id=m.id;
 return result;
end $function$
;
revoke all on function kz_private.player_lifetime_statistics(uuid[]) from public,anon,authenticated;
create or replace function public.kz_member_statistics(p_guest_id uuid,p_guest_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare player uuid; realm uuid; ids uuid[];
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into realm from public.kz_members where player_id=player;
 if realm is null then ids:=array[player];else
  select array_agg(player_id) into ids from public.kz_members where kingdom_id=realm;
 end if;
 return kz_private.player_lifetime_statistics(ids);
end $$;
create or replace function public.kz_applicant_statistics(p_guest_id uuid,p_guest_secret text,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare reviewer uuid;realm uuid;applicant uuid;
begin
 reviewer:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into realm from public.kz_members where player_id=reviewer and role='kralj';
 if realm is null then raise exception 'Samo kralj kvizaš može pregledati zahtjeve';end if;
 select player_id into applicant from public.kz_join_requests where id=p_request and kingdom_id=realm and status='pending';
 if applicant is null then raise exception 'Zahtjev više nije dostupan';end if;
 if exists(select 1 from public.kz_members where player_id=applicant) then raise exception 'Igrač je već član kraljevstva';end if;
 return kz_private.player_lifetime_statistics(array[applicant])->0;
end $$;
revoke all on function public.kz_applicant_statistics(uuid,text,uuid) from public;
grant execute on function public.kz_applicant_statistics(uuid,text,uuid) to anon,authenticated;
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
      'position',q.position,'id',case when q.answered_at is not null then a.id end,'source',case when q.answered_at is not null then a.source end,'prompt',case when q.answered_at is not null then a.prompt end,'options',case when q.answered_at is not null then a.options end,'image',case when q.answered_at is not null then a.image end,
      'correct_key',case when q.answered_at is not null then a.correct_key else null end,
      'choice',case when q.answered_at is not null and q.choice is null then 'SKIP' else q.choice end,'correct',q.correct,'earned',q.earned_m2) order by q.position),'[]'::jsonb)
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
    order by case m.role when 'kralj' then 1 when 'vojvoda' then 2 else 3 end,m.joined_at,p.id),'[]'::jsonb)
    from public.kz_members m join public.kz_players p on p.id=m.player_id where m.kingdom_id=v_realm),
  'requests',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',p.display_name,'at',r.created_at) order by r.created_at),'[]'::jsonb)
    from public.kz_join_requests r join public.kz_players p on p.id=r.player_id
    where r.kingdom_id=v_realm and r.status='pending' and v_role='kralj'),
  'mail',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'body',x.body,'at',x.created_at,'read',x.read_at is not null) order by x.created_at desc),'[]'::jsonb)
    from (select id,body,created_at,read_at from public.kz_mail where player_id=v_player order by created_at desc limit 30) x),
  'game',v_game
 ) into v_result;
 return v_result;
end $function$
;

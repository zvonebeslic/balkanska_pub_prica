-- Individual territory statistics, with one record per player and duel.
select pg_advisory_xact_lock(770077003);
alter table kz_private.territory_duels add column if not exists issued_by uuid references public.kz_players(id) on delete set null;
create table if not exists kz_private.duel_player_scores(
 duel_id uuid not null references kz_private.territory_duels(id) on delete cascade,
 player_id uuid not null references public.kz_players(id) on delete cascade,
 hits integer not null default 0,misses integer not null default 0,captured_m2 integer not null default 0,
 primary key(duel_id,player_id)
);
alter table kz_private.duel_player_scores enable row level security;
revoke all on kz_private.duel_player_scores from public,anon,authenticated;
create index if not exists duel_player_scores_player on kz_private.duel_player_scores(player_id);
-- Historical duels: winning moves are recorded, otherwise use the eligible current king.
insert into kz_private.duel_player_scores(duel_id,player_id,hits,misses,captured_m2)
select d.id,coalesce(w.player_id,m.player_id),d.hits,d.misses,case when d.status='won' then 20 else 0 end
from kz_private.territory_duels d
left join lateral (select x.player_id from public.kz_moves x where d.status='won' and x.action='attack'
 and x.kingdom_id=d.attacker and x.previous_kingdom=d.defender and x.at_x=d.x and x.at_y=d.y
 and x.created_at>=d.created_at order by x.created_at limit 1) w on true
left join public.kz_members m on m.kingdom_id=d.attacker and m.role='kralj' and m.joined_at<=d.created_at
where coalesce(w.player_id,m.player_id) is not null and d.hits+d.misses>0
on conflict do nothing;
update kz_private.territory_duels d set issued_by=m.player_id from public.kz_members m
where d.status='active' and d.deadline is not null and d.issued_by is null and m.kingdom_id=d.attacker and m.role='kralj';
CREATE OR REPLACE FUNCTION public.kz_territory_duel(p_guest_id uuid, p_guest_secret text, p_action text, p_x bigint DEFAULT NULL::bigint, p_y bigint DEFAULT NULL::bigint, p_id uuid DEFAULT NULL::uuid, p_number integer DEFAULT NULL::integer, p_choice text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 player uuid; king uuid; enemy uuid; d kz_private.territory_duels%rowtype;
 q public.kz_questions%rowtype; ids text[]; bank bigint; enemy_count integer;
 right_answer boolean; timed_out boolean; previous_key text; loss bigint; response jsonb; adjacent boolean;
 insufficient_bank boolean:=false;
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 perform pg_advisory_xact_lock(770077003);
 select kingdom_id into king from public.kz_members where player_id=player and role='kralj';
 if king is null then
   if p_action='resume' then return null; end if;
   raise exception 'Samo kralj kvizaš može pokrenuti okršaj';
 end if;
 if coalesce(p_action,'') not in ('start','resume','answer') then raise exception 'Nepoznata radnja'; end if;
 select * into d from kz_private.territory_duels where attacker=king and status='active' for update;
 if not found then
   if p_action='resume' then return null; end if;
   if p_action='answer' then raise exception 'Okršaj više nije aktivan'; end if;
   if p_x is null or p_y is null or mod(p_x,5)<>0 or mod(p_y,4)<>0 then raise exception 'Blok nije poravnat'; end if;
   select c.kingdom_id,count(*) into enemy,enemy_count from public.kz_cells c
    where c.x between p_x and p_x+4 and c.y between p_y and p_y+3
    group by c.kingdom_id order by count(*) desc limit 1;
   if enemy is null or enemy=king or enemy_count<>20 then raise exception 'Odaberi cijeli protivnički blok od 20 m²'; end if;
   if not exists(select 1 from public.kz_cells c where c.kingdom_id=king and
    ((c.x in(p_x-1,p_x+5) and c.y between p_y and p_y+3) or
     (c.y in(p_y-1,p_y+4) and c.x between p_x and p_x+4))) then raise exception 'Napad mora dodirivati tvoju granicu'; end if;
   perform 1 from public.kz_kingdoms where id in(king,enemy) order by id for update;
   select bank_m2 into bank from public.kz_kingdoms where id=king;
   if bank<100 then raise exception 'Za napad treba 100 m² na kontu'; end if;
   select array_agg(s.id order by s.r) into ids from
     (select id,random() r from public.kz_questions where correct_key in('A','B','C') and options ?& array['A','B','C'] order by r limit 8) s;
   if coalesce(cardinality(ids),0)<>8 then raise exception 'Nema dovoljno pitanja'; end if;
   update public.kz_kingdoms set bank_m2=bank_m2-100 where id=king;
   insert into kz_private.territory_duels(attacker,defender,x,y,questions,required_hits)
     values(king,enemy,p_x,p_y,ids,case when (select bank_m2 from public.kz_kingdoms where id=enemy)=0 then 1 else 3 end) returning * into d;
 end if;
 perform 1 from public.kz_kingdoms where id in(d.attacker,d.defender) order by id for update;
 select count(*) into enemy_count from public.kz_cells c where c.kingdom_id=d.defender
  and c.x between d.x and d.x+4 and c.y between d.y and d.y+3;
 select exists(select 1 from public.kz_cells c where c.kingdom_id=king and
  ((c.x in(d.x-1,d.x+5) and c.y between d.y and d.y+3) or
   (c.y in(d.y-1,d.y+4) and c.x between d.x and d.x+4))) into adjacent;
 if enemy_count<>20 or not adjacent then
   update kz_private.territory_duels set status='invalid' where id=d.id returning * into d;
   update public.kz_kingdoms set bank_m2=bank_m2+100 where id=king;
 elsif p_action='answer' then
   if p_id is distinct from d.id or p_number is distinct from d.position or d.deadline is null then
     raise exception 'Pitanja se rješavaju redom i samo jednom';
   end if;
   if coalesce(p_choice,'') not in('A','B','C','SKIP') then raise exception 'Neispravan odgovor'; end if;
   select * into q from public.kz_questions where id=d.questions[d.position];
   previous_key:=q.correct_key;
   timed_out:=p_choice='SKIP' or clock_timestamp()>=d.deadline;
   right_answer:=not timed_out and p_choice=q.correct_key;
   if right_answer then
     select least(20,bank_m2) into loss from public.kz_kingdoms where id=d.defender;
     update public.kz_kingdoms set bank_m2=bank_m2-loss where id=d.defender;
     d.defense_loss:=d.defense_loss+loss;d.hits:=d.hits+1;
   else
     select least(20,bank_m2) into loss from public.kz_kingdoms where id=king;
     update public.kz_kingdoms set bank_m2=bank_m2-loss where id=king;
     d.attack_loss:=d.attack_loss+loss;d.misses:=d.misses+1;
     insufficient_bank:=loss<20;
   end if;
   if d.hits>=d.required_hits then
     update public.kz_cells set kingdom_id=king,created_at=now()
      where kingdom_id=d.defender and x between d.x and d.x+4 and y between d.y and d.y+3;
     update public.kz_kingdoms set area_m2=area_m2-20 where id=d.defender;
     update public.kz_kingdoms set area_m2=area_m2+20,bank_m2=bank_m2+100 where id=king;
     insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,previous_kingdom,at_x,at_y)
       values(king,player,'attack',100,20,d.defender,d.x,d.y);
     d.status:='won';
   elsif insufficient_bank or d.position=8 then d.status:='lost';
   else d.position:=d.position+1;
   end if;
   insert into kz_private.duel_player_scores(duel_id,player_id,hits,misses,captured_m2)
     values(d.id,player,case when right_answer then 1 else 0 end,case when right_answer then 0 else 1 end,case when d.status='won' then 20 else 0 end)
     on conflict(duel_id,player_id) do update set hits=kz_private.duel_player_scores.hits+excluded.hits,
       misses=kz_private.duel_player_scores.misses+excluded.misses,captured_m2=kz_private.duel_player_scores.captured_m2+excluded.captured_m2;
   update kz_private.territory_duels set position=d.position,hits=d.hits,misses=d.misses,
     attack_loss=d.attack_loss,defense_loss=d.defense_loss,status=d.status,deadline=null,issued_by=null where id=d.id returning * into d;
 end if;
 response:=jsonb_build_object('id',d.id,'position',d.position,'hits',d.hits,'misses',d.misses,'required_hits',d.required_hits,
  'attack_loss',d.attack_loss,'defense_loss',d.defense_loss,'status',d.status,'x',d.x,'y',d.y,
  'correct',right_answer,'correct_key',previous_key,'timed_out',timed_out,'loss',loss,'insufficient_bank',insufficient_bank,
  'reward',case when d.status='won' then 100 else 0 end);
 if d.status='active' and p_action<>'answer' then
   select * into q from public.kz_questions where id=d.questions[d.position];
   if d.deadline is null then
     update kz_private.territory_duels set deadline=clock_timestamp()+make_interval(secs=>public.kz_question_seconds(q.prompt)),issued_by=player
      where id=d.id returning * into d;
   end if;
   response:=response||jsonb_build_object('prompt',q.prompt,'options',q.options,'image',q.image,
    'remaining_ms',greatest(0,floor(extract(epoch from d.deadline-clock_timestamp())*1000)));
 end if;
 return response;
end $function$
;
-- Only the member's own kingdom is visible; one aggregate per source, no question text.
create or replace function public.kz_member_statistics(p_guest_id uuid,p_guest_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
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
  select d.issued_by,'territory',0,count(*),0,0
   from kz_private.territory_duels d join members m on m.id=d.issued_by
   where d.status='active' and d.deadline<=now() group by d.issued_by
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
end $$;
revoke all on function public.kz_member_statistics(uuid,text) from public;
grant execute on function public.kz_member_statistics(uuid,text) to anon,authenticated;
-- Completed game history is summary only, including direct RPC access.
create or replace function public.kz_history(p_guest_id uuid,p_guest_secret text)
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'at',g.finished_at,'correct',g.correct_count,
 'wrong',g.wrong_count,'earned',g.earned_m2,'seconds',g.duration_seconds) order by g.finished_at desc),'[]'::jsonb)
 from (select id,finished_at,correct_count,wrong_count,earned_m2,duration_seconds from public.kz_games
 where player_id=public.kz_who(p_guest_id,p_guest_secret) and finished_at is not null order by finished_at desc limit 12) g;
$$;

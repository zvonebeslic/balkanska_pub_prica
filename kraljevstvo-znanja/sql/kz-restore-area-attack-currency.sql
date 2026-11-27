CREATE OR REPLACE FUNCTION public.kz_battle_history(p_guest_id uuid, p_guest_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare player uuid; realm uuid; result jsonb;
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into realm from public.kz_members where player_id=player;
 select coalesce(jsonb_agg(to_jsonb(h) order by h.at desc),'[]'::jsonb) into result from (
  select d.id,d.status,coalesce(d.finished_at,d.activity_at,d.created_at) at,d.x,d.y,d.hits,d.required_hits,
  a.name attacker,b.name defender,pa.display_name attacker_name,pd.display_name defender_name,
  coalesce(sa.hits,0) attacker_correct,coalesce(sa.misses,0) attacker_wrong,
  coalesce(sd.hits,0) defender_correct,coalesce(sd.misses,0) defender_wrong,
  d.attack_loss,d.defense_loss,d.defender_player is not null defended,
  case when d.attacker=realm then 'attacker' else 'defender' end side
  from kz_private.territory_duels d join public.kz_kingdoms a on a.id=d.attacker join public.kz_kingdoms b on b.id=d.defender
  left join public.kz_players pa on pa.id=d.attacker_player left join public.kz_players pd on pd.id=d.defender_player
  left join kz_private.duel_player_scores sa on sa.duel_id=d.id and sa.player_id=d.attacker_player
  left join kz_private.duel_player_scores sd on sd.duel_id=d.id and sd.player_id=d.defender_player
  where realm in(d.attacker,d.defender) and d.status<>'active'
  order by coalesce(d.finished_at,d.activity_at,d.created_at) desc limit 100
 ) h;
 return result;
end $function$
;
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
CREATE OR REPLACE FUNCTION public.kz_territory_duel(p_guest_id uuid, p_guest_secret text, p_action text, p_x bigint DEFAULT NULL::bigint, p_y bigint DEFAULT NULL::bigint, p_id uuid DEFAULT NULL::uuid, p_number integer DEFAULT NULL::integer, p_choice text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 player uuid; realm uuid; member_role text; enemy uuid; d kz_private.territory_duels%rowtype;
 r kz_private.duel_rounds%rowtype; q public.kz_questions%rowtype; ids text[];
 bank bigint; enemy_count integer; adjacent boolean; is_attacker boolean; is_defender boolean;
 attack_good boolean; defend_good boolean; loss bigint; response jsonb; round_list jsonb; review_rows jsonb; t timestamptz; inserted integer;
begin
 player:=public.kz_who(p_guest_id,p_guest_secret);
 select m.kingdom_id,m.role into realm,member_role from public.kz_members m where m.player_id=player;
 if realm is null then if p_action='resume' then return null;end if;raise exception 'Nisi član kraljevstva';end if;
 if coalesce(p_action,'') not in ('start','resume','join','answer','state','review') then raise exception 'Nepoznata radnja';end if;
 perform pg_advisory_xact_lock(770077003);
 if p_action='start' and exists(select 1 from kz_private.territory_duels x where x.status='active' and (x.attacker_player=player or x.defender_player=player)) then
   raise exception 'Već sudjeluješ u okršaju. Prvo završi taj dvoboj.';
 end if;
 if p_id is not null then
   select * into d from kz_private.territory_duels where id=p_id for update;
 else
   select * into d from kz_private.territory_duels where status='active' and
    (attacker_player=player or defender_player=player or (attacker_player is null and attacker=realm and member_role='kralj'))
    order by created_at desc limit 1 for update;
 end if;
 if not found then
   if p_action='resume' then return null;end if;
   if p_action<>'start' then raise exception 'Okršaj nije dostupan';end if;
   if p_x is null or p_y is null or mod(p_x,10)<>0 or mod(p_y,8)<>0 then raise exception 'Blok nije poravnat';end if;
   if exists(select 1 from kz_private.territory_duels x where x.x=p_x and x.y=p_y and x.status='active') then raise exception 'Na tom bloku već traje okršaj';end if;
   select c.kingdom_id,count(*) into enemy,enemy_count from public.kz_cells c
    where c.x between p_x and p_x+9 and c.y between p_y and p_y+7 group by c.kingdom_id order by count(*) desc limit 1;
   if enemy is null or enemy=realm or enemy_count<>80 then raise exception 'Odaberi cijeli protivnički blok od 20 m²';end if;
   if not exists(select 1 from public.kz_cells c where c.kingdom_id=realm and
      ((c.x in(p_x-1,p_x+10) and c.y between p_y and p_y+7) or (c.y in(p_y-1,p_y+8) and c.x between p_x and p_x+9))) then raise exception 'Napad mora dodirivati tvoju granicu';end if;
   perform 1 from public.kz_kingdoms where id in(realm,enemy) order by id for update;
   select bank_m2 into bank from public.kz_kingdoms where id=realm;
   if bank<100 then raise exception 'Za napad treba 100 m² na kontu';end if;
   select array_agg(s.id order by s.r) into ids from
     (select id,random() r from public.kz_questions where correct_key in('A','B','C') and options ?& array['A','B','C'] order by r limit 8) s;
   if coalesce(cardinality(ids),0)<>8 then raise exception 'Nema dovoljno pitanja';end if;
   update public.kz_kingdoms set bank_m2=bank_m2-100 where id=realm;
   insert into kz_private.territory_duels(attacker,defender,x,y,questions,required_hits,attacker_player)
   values(realm,enemy,p_x,p_y,ids,3,player) returning * into d;
 end if;
 if d.attacker_player is null and realm=d.attacker and member_role='kralj' and d.status='active' then
   update kz_private.territory_duels set attacker_player=player where id=d.id returning * into d;
 end if;
 is_attacker:=coalesce(d.attacker_player=player and realm=d.attacker,false);
 is_defender:=coalesce(d.defender_player=player and realm=d.defender,false);
 if p_action='join' then
   if realm<>d.defender or d.status<>'active' then raise exception 'Možeš braniti samo aktivni napad na svoje kraljevstvo';end if;
   if d.defender_player is not null and not is_defender then raise exception 'Drugi član već brani ovaj blok';end if;
   if exists(select 1 from kz_private.territory_duels x where x.id<>d.id and x.status='active' and (x.attacker_player=player or x.defender_player=player)) then raise exception 'Već sudjeluješ u drugom okršaju';end if;
 elsif not (is_attacker or is_defender) then raise exception 'Nisi sudionik okršaja';
 end if;
 if p_action='review' then
   if d.status='active' then raise exception 'Pitanja su dostupna tek nakon okršaja';end if;
   if d.finished_at is null or d.finished_at<now()-interval '5 minutes' then return '[]'::jsonb;end if;
   insert into kz_private.duel_reviews(duel_id,player_id) values(d.id,player) on conflict do nothing;
   get diagnostics inserted=row_count;
   if inserted=0 then return '[]'::jsonb;end if;
   select coalesce(jsonb_agg(jsonb_build_object('position',rr.position,'id',a.id,'source',a.source,
     'prompt',a.prompt,'options',a.options,'image',a.image,'correct_key',a.correct_key,
     'choice',case when is_attacker then rr.attacker_choice else rr.defender_choice end,
     'correct',case when is_attacker then rr.attacker_correct else rr.defender_correct end,
     'attacker_choice',rr.attacker_choice,'defender_choice',rr.defender_choice,
     'attacker_correct',rr.attacker_correct,'defender_correct',rr.defender_correct,'progress',rr.progress)
     order by rr.position),'[]'::jsonb) into review_rows
   from kz_private.duel_rounds rr join public.kz_questions a on a.id=rr.question_id
   where rr.duel_id=d.id and rr.resolved_at is not null;
   return review_rows;
 end if;
 if d.status='active' then
   perform 1 from public.kz_kingdoms where id in(d.attacker,d.defender) order by id for update;
   select count(*) into enemy_count from public.kz_cells c where c.kingdom_id=d.defender and c.x between d.x and d.x+9 and c.y between d.y and d.y+7;
   select exists(select 1 from public.kz_cells c where c.kingdom_id=d.attacker and
    ((c.x in(d.x-1,d.x+10) and c.y between d.y and d.y+7) or (c.y in(d.y-1,d.y+8) and c.x between d.x and d.x+9))) into adjacent;
   if enemy_count<>80 or not adjacent then
     update kz_private.territory_duels set status='invalid',finished_at=clock_timestamp(),deadline=null,issued_by=null where id=d.id returning * into d;
     update public.kz_kingdoms set bank_m2=bank_m2+100 where id=d.attacker;
   else
     select * into r from kz_private.duel_rounds where duel_id=d.id and position=d.position;
     t:=clock_timestamp();
     -- A defender may enter the current unanswered round, without resetting its deadline.
     if p_action='join' and d.defender_player is null then
       update kz_private.territory_duels set defender_player=player,activity_at=t where id=d.id returning * into d;
       is_defender:=true;
       if r.duel_id is not null and r.resolved_at is null and r.deadline>t and r.attacker_choice is null then
         update kz_private.duel_rounds set defender_player=player where duel_id=d.id and position=d.position returning * into r;
       end if;
     end if;
     if p_action='answer' and r.duel_id is not null and r.resolved_at is null and p_number=d.position then
       if coalesce(p_choice,'') not in ('A','B','C','SKIP') then raise exception 'Neispravan odgovor';end if;
       if is_attacker and r.attacker_choice is null then
         update kz_private.duel_rounds set attacker_choice=case when t>=r.deadline then 'SKIP' else p_choice end where duel_id=d.id and position=d.position returning * into r;
       elsif is_defender and r.defender_player=player and r.defender_choice is null then
         update kz_private.duel_rounds set defender_choice=case when t>=r.deadline then 'SKIP' else p_choice end where duel_id=d.id and position=d.position returning * into r;
       end if;
     end if;
     if r.duel_id is not null and r.resolved_at is null and
       (r.deadline<=t or (r.attacker_choice is not null and (r.defender_player is null or r.defender_choice is not null))) then
       select * into q from public.kz_questions where id=r.question_id;
       r.attacker_choice:=coalesce(r.attacker_choice,'SKIP');
       if r.defender_player is not null then r.defender_choice:=coalesce(r.defender_choice,'SKIP');end if;
       attack_good:=r.attacker_choice=q.correct_key;
       defend_good:=case when r.defender_player is null then null else r.defender_choice=q.correct_key end;
       d.hits:=greatest(0,d.hits+case when attack_good then 1 else 0 end-case when defend_good is true then 1 else 0 end);
       if not attack_good then
         select least(20,bank_m2) into loss from public.kz_kingdoms where id=d.attacker;
         update public.kz_kingdoms set bank_m2=bank_m2-loss where id=d.attacker;
         d.attack_loss:=d.attack_loss+loss;d.misses:=d.misses+1;d.insufficient_bank:=loss<20;
       end if;
       if d.hits>=d.required_hits then
         update public.kz_cells set kingdom_id=d.attacker,created_at=now() where kingdom_id=d.defender and x between d.x and d.x+9 and y between d.y and d.y+7;
         update public.kz_kingdoms set area_m2=area_m2-20 where id=d.defender;
         update public.kz_kingdoms set area_m2=area_m2+20,bank_m2=bank_m2+100 where id=d.attacker;
         insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,previous_kingdom,at_x,at_y)
           values(d.attacker,d.attacker_player,'attack',100,20,d.defender,d.x,d.y);
         d.status:='won';
       elsif d.insufficient_bank or d.position=8 then d.status:='lost';
       end if;
       perform kz_private.add_duel_score(d.id,r.attacker_player,attack_good,case when d.status='won' then 20 else 0 end);
       if r.defender_player is not null then perform kz_private.add_duel_score(d.id,r.defender_player,defend_good,0);end if;
       update kz_private.duel_rounds set attacker_choice=r.attacker_choice,defender_choice=r.defender_choice,
         attacker_correct=attack_good,defender_correct=defend_good,resolved_at=clock_timestamp(),progress=d.hits
         where duel_id=d.id and position=d.position returning * into r;
       update kz_private.territory_duels set hits=d.hits,misses=d.misses,attack_loss=d.attack_loss,defense_loss=d.defense_loss,
         status=d.status,insufficient_bank=d.insufficient_bank,deadline=null,issued_by=null,
         finished_at=case when d.status<>'active' then clock_timestamp() end
       where id=d.id returning * into d;
     end if;
     -- Only a participant calling start/resume/state can issue the next shared round.
     -- Brief intermission preserves the result display; both sides share one server deadline.
     if d.status='active' and p_action in ('start','resume','join','state') and
        (r.duel_id is null or (r.resolved_at is not null and r.resolved_at<=clock_timestamp()-interval '2 seconds')) then
       if r.duel_id is not null then d.position:=d.position+1;end if;
       select * into q from public.kz_questions where id=d.questions[d.position];
       insert into kz_private.duel_rounds(duel_id,position,question_id,attacker_player,defender_player,deadline)
         values(d.id,d.position,q.id,d.attacker_player,d.defender_player,clock_timestamp()+make_interval(secs=>public.kz_question_seconds(q.prompt)))
         returning * into r;
       update kz_private.territory_duels set position=d.position,deadline=r.deadline,issued_by=d.attacker_player where id=d.id returning * into d;
     end if;
   end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('position',rr.position,'attacker_correct',rr.attacker_correct,'defender_correct',rr.defender_correct,'progress',rr.progress) order by rr.position),'[]'::jsonb)
 into round_list from kz_private.duel_rounds rr where rr.duel_id=d.id and rr.resolved_at is not null;
 response:=jsonb_build_object('id',d.id,'position',d.position,'hits',d.hits,'misses',d.misses,'required_hits',d.required_hits,
  'attack_loss',d.attack_loss,'defense_loss',d.defense_loss,'status',d.status,'x',d.x,'y',d.y,'insufficient_bank',d.insufficient_bank,
  'side',case when is_attacker then 'attacker' else 'defender' end,'defender_online',d.defender_player is not null,
  'attacker_name',(select display_name from public.kz_players where id=d.attacker_player),
  'defender_name',(select display_name from public.kz_players where id=d.defender_player),
  'attacker_realm',(select name from public.kz_kingdoms where id=d.attacker),
  'defender_realm',(select name from public.kz_kingdoms where id=d.defender),
  'rounds',round_list,'reward',case when d.status='won' then 100 else 0 end);
 if d.status='active' and r.duel_id is not null and r.resolved_at is null then
   select * into q from public.kz_questions where id=r.question_id;
   response:=response||jsonb_build_object('prompt',q.prompt,'options',q.options,'image',q.image,
    'submitted',case when is_attacker then r.attacker_choice is not null else r.defender_player is distinct from player or r.defender_choice is not null end,
    'opponent_submitted',case when is_attacker then r.defender_choice is not null else r.attacker_choice is not null end,
    'remaining_ms',greatest(0,floor(extract(epoch from r.deadline-clock_timestamp())*1000)));
 else response:=response||jsonb_build_object('intermission',d.status='active');end if;
 return response;
end $function$
;
alter table kz_private.territory_duels alter column currency set default 'm2';

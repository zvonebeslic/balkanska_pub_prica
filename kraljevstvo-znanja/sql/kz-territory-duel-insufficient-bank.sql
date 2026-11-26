-- A fully paid penalty may leave the bank at zero. Only an unpaid or partially paid penalty ends the duel early.
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
   update kz_private.territory_duels set position=d.position,hits=d.hits,misses=d.misses,
     attack_loss=d.attack_loss,defense_loss=d.defense_loss,status=d.status,deadline=null where id=d.id returning * into d;
 end if;
 response:=jsonb_build_object('id',d.id,'position',d.position,'hits',d.hits,'misses',d.misses,'required_hits',d.required_hits,
  'attack_loss',d.attack_loss,'defense_loss',d.defense_loss,'status',d.status,'x',d.x,'y',d.y,
  'correct',right_answer,'correct_key',previous_key,'timed_out',timed_out,'loss',loss,'insufficient_bank',insufficient_bank,
  'reward',case when d.status='won' then 100 else 0 end);
 if d.status='active' and p_action<>'answer' then
   select * into q from public.kz_questions where id=d.questions[d.position];
   if d.deadline is null then
     update kz_private.territory_duels set deadline=clock_timestamp()+make_interval(secs=>public.kz_question_seconds(q.prompt))
      where id=d.id returning * into d;
   end if;
   response:=response||jsonb_build_object('prompt',q.prompt,'options',q.options,'image',q.image,
    'remaining_ms',greatest(0,floor(extract(epoch from d.deadline-clock_timestamp())*1000)));
 end if;
 return response;
end $function$
;

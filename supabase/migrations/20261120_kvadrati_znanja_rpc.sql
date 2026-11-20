
-- Svi pozivi provjeravaju stvarni auth.uid() ili 256-bitnu tajnu vezanu uz gostujući UUID.
create or replace function public.kz_who(p_guest_id uuid, p_guest_secret text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if auth.uid() is not null then
   select id into v_id from public.kz_players where auth_user=auth.uid();
 elsif p_guest_id is not null and p_guest_secret ~ '^[a-fA-F0-9]{64}$' then
   select id into v_id from public.kz_players
   where guest_id=p_guest_id and guest_hash=encode(digest(p_guest_secret,'sha256'),'hex');
 end if;
 if v_id is null then raise exception 'Identitet nije potvrđen. Osvježi stranicu.'; end if;
 return v_id;
end $$;
revoke all on function public.kz_who(uuid,text) from public,anon,authenticated;

create or replace function public.kz_identity(p_guest_id uuid,p_guest_secret text,p_name text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_guest public.kz_players%rowtype; v_name text;
begin
 v_name:=left(coalesce(nullif(trim(p_name),''),'Kvizaš'),32);
 if p_guest_id is null or p_guest_secret !~ '^[a-fA-F0-9]{64}$' then
   raise exception 'Nedostaje siguran gostujući identitet';
 end if;
 select * into v_guest from public.kz_players where guest_id=p_guest_id for update;
 if found and v_guest.guest_hash<>encode(digest(p_guest_secret,'sha256'),'hex') then
   raise exception 'Pogrešna tajna gostujućeg identiteta';
 end if;
 if auth.uid() is not null then
   select id into v_id from public.kz_players where auth_user=auth.uid();
   if v_id is null then
     if v_guest.id is not null and v_guest.auth_user is null then
       update public.kz_players set auth_user=auth.uid(),display_name=v_name
       where id=v_guest.id returning id into v_id;
     elsif v_guest.id is not null and v_guest.auth_user=auth.uid() then
       v_id:=v_guest.id;
     else
       insert into public.kz_players(auth_user,display_name)
       values(auth.uid(),v_name) returning id into v_id;
     end if;
   end if;
 else
   if v_guest.id is null then
     insert into public.kz_players(guest_id,guest_hash,display_name)
     values(p_guest_id,encode(digest(p_guest_secret,'sha256'),'hex'),v_name)
     returning id into v_id;
   else
     v_id:=v_guest.id;
   end if;
 end if;
 return jsonb_build_object('id',v_id,'signed_in',auth.uid() is not null);
end $$;

create or replace function public.kz_catalog()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
select coalesce(jsonb_agg(n.name order by n.name),'[]'::jsonb)
from public.kz_names n
where not exists(select 1 from public.kz_kingdoms k where k.name=n.name);
$$;

create or replace function public.kz_create(p_guest_id uuid,p_guest_secret text,p_name text,p_color text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_player uuid; v_kingdom uuid;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 if exists(select 1 from public.kz_members where player_id=v_player) then
   raise exception 'Već si član kraljevstva';
 end if;
 if p_color is null or p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Neispravna boja'; end if;
 if not exists(select 1 from public.kz_names where name=p_name) then raise exception 'Ime nije na popisu'; end if;
 insert into public.kz_kingdoms(name,color)
 values(p_name,upper(p_color)) returning id into v_kingdom;
 insert into public.kz_members(player_id,kingdom_id,role) values(v_player,v_kingdom,'kralj');
 return jsonb_build_object('kingdom_id',v_kingdom);
end $$;

create or replace function public.kz_state(p_guest_id uuid,p_guest_secret text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_player uuid; v_realm uuid; v_role text; v_result jsonb; v_game jsonb;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id,role into v_realm,v_role from public.kz_members where player_id=v_player;
 select jsonb_build_object('id',g.id,'started_at',g.started_at,
   'questions',(select coalesce(jsonb_agg(jsonb_build_object(
      'position',q.position,'prompt',a.prompt,'options',a.options,'image',a.image,
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
       'wrong',h.wrong_count,'earned',h.earned_m2) order by h.finished_at desc),'[]'::jsonb)
       from (select finished_at,correct_count,wrong_count,earned_m2 from public.kz_games
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
end $$;

create or replace function public.kz_map(p_min_x bigint default null,p_max_x bigint default null,
p_min_y bigint default null,p_max_y bigint default null)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
select jsonb_build_object(
 'kingdoms',(select coalesce(jsonb_agg(jsonb_build_object('id',k.id,'name',k.name,'color',k.color,
  'area',k.area_m2,'anchor_x',k.anchor_x,'anchor_y',k.anchor_y,'members',
  (select count(*) from public.kz_members where kingdom_id=k.id)) order by k.area_m2 desc),'[]'::jsonb)
  from public.kz_kingdoms k),
 'cells',(select coalesce(jsonb_agg(jsonb_build_object('x',t.x,'y',t.y,'k',t.kingdom_id)),'[]'::jsonb)
 from (select x,y,kingdom_id from public.kz_cells
   where p_min_x is not null and p_max_x is not null and p_min_y is not null and p_max_y is not null
    and x between p_min_x and p_max_x and y between p_min_y and p_max_y
   limit 8000) t));
$$;

create or replace function public.kz_start(p_guest_id uuid,p_guest_secret text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
   if v_count<5 then raise exception 'Baza nema pet novih, neponovljenih ABC pitanja'; end if;
   insert into public.kz_games(player_id,kingdom_id) values(v_player,v_kingdom) returning id into v_game;
   with picked as (select q.id from public.kz_questions q
      where not exists(select 1 from public.kz_seen s where s.player_id=v_player and s.question_id=q.id)
      order by random() limit 5),
    numbered as (select id,row_number() over()::smallint as pos from picked)
   insert into public.kz_game_questions(game_id,position,question_id)
     select v_game,pos,id from numbered;
   insert into public.kz_seen(player_id,question_id)
     select v_player,question_id from public.kz_game_questions where game_id=v_game;
 end if;
 return public.kz_state(p_guest_id,p_guest_secret);
end $$;

create or replace function public.kz_answer(p_guest_id uuid,p_guest_secret text,
 p_game_id uuid,p_number integer,p_choice text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
   v_earned:=case when v_area<500 then 20 when v_role='kralj' then 30
       when v_role='vojvoda' then 25 else 22 end;
   update public.kz_kingdoms set bank_m2=bank_m2+v_earned where id=v_game.kingdom_id;
 end if;
 update public.kz_game_questions set choice=p_choice,correct=v_correct,earned_m2=v_earned,answered_at=now()
 where game_id=p_game_id and position=p_number;
 update public.kz_games set correct_count=correct_count+case when v_correct then 1 else 0 end,
 wrong_count=wrong_count+case when v_correct then 0 else 1 end,
 earned_m2=earned_m2+v_earned
 where id=p_game_id;
 if p_number=5 then
   v_cool:=now()+interval '4 hours';
   update public.kz_games set finished_at=now() where id=p_game_id;
   update public.kz_players set cooldown_until=v_cool where id=v_player;
 end if;
 return jsonb_build_object('correct',v_correct,'correct_key',v_right,'earned',v_earned,
   'finished',p_number=5,'cooldown_until',v_cool);
end $$;

create or replace function public.kz_apply(p_guest_id uuid,p_guest_secret text,p_kingdom uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_player uuid; v_req uuid;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 if exists(select 1 from public.kz_members where player_id=v_player) then raise exception 'Već si u kraljevstvu'; end if;
 if not exists(select 1 from public.kz_kingdoms where id=p_kingdom) then raise exception 'Kraljevstvo ne postoji'; end if;
 if exists(select 1 from public.kz_join_requests where player_id=v_player and status='pending') then
   raise exception 'Već imaš zahtjev koji čeka odluku';
 end if;
 insert into public.kz_join_requests(player_id,kingdom_id) values(v_player,p_kingdom) returning id into v_req;
 return jsonb_build_object('request_id',v_req);
end $$;

create or replace function public.kz_review(p_guest_id uuid,p_guest_secret text,p_request uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_king uuid; v_player uuid; v_request public.kz_join_requests%rowtype; v_role text;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into v_king from public.kz_members where player_id=v_player and role='kralj';
 if v_king is null then raise exception 'Samo kralj kvizaš odlučuje o članstvu'; end if;
 perform 1 from public.kz_kingdoms where id=v_king for update;
 select * into v_request from public.kz_join_requests where id=p_request and kingdom_id=v_king for update;
 if not found or v_request.status<>'pending' then raise exception 'Zahtjev više nije na čekanju'; end if;
 if p_accept then
   if (select count(*) from public.kz_members where kingdom_id=v_king)>=5 then raise exception 'Kraljevstvo već ima 5 članova'; end if;
   if exists(select 1 from public.kz_members where player_id=v_request.player_id) then raise exception 'Igrač već ima kraljevstvo'; end if;
   v_role:=case when exists(select 1 from public.kz_members where kingdom_id=v_king and role='vojvoda') then 'vojnik' else 'vojvoda' end;
   insert into public.kz_members(player_id,kingdom_id,role) values(v_request.player_id,v_king,v_role);
 end if;
 update public.kz_join_requests set status=case when p_accept then 'accepted' else 'rejected' end,decided_at=now() where id=p_request;
 insert into public.kz_mail(player_id,body) values(v_request.player_id,
    case when p_accept then 'Primljen/a si u kraljevstvo ' else 'Odbijen je zahtjev za kraljevstvo ' end ||
    (select name from public.kz_kingdoms where id=v_king)||'.');
 return jsonb_build_object('accepted',p_accept,'role',v_role);
end $$;

create or replace function public.kz_membership(p_guest_id uuid,p_guest_secret text,p_action text,p_target uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_player uuid; v_king uuid; v_role text; v_target_role text;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 select kingdom_id,role into v_king,v_role from public.kz_members where player_id=v_player;
 if v_king is null then raise exception 'Nema aktivnog članstva'; end if;
 perform 1 from public.kz_kingdoms where id=v_king for update;
 if p_action='leave' and v_role<>'kralj' then
   if exists(select 1 from public.kz_games where player_id=v_player and finished_at is null) then raise exception 'Prvo završi pet pitanja'; end if;
   delete from public.kz_members where player_id=v_player;
 elsif p_action='close' and v_role='kralj' then
   if (select count(*) from public.kz_members where kingdom_id=v_king)<>1
      or (select area_m2+bank_m2 from public.kz_kingdoms where id=v_king)<>0 then
      raise exception 'Kraljevstvo s članovima ili teritorijem ne može se zatvoriti; predaj krunu';
   end if;
   delete from public.kz_kingdoms where id=v_king;
 elsif p_action in ('crown','duke','kick') and v_role='kralj' and p_target is not null and p_target<>v_player then
   select role into v_target_role from public.kz_members where player_id=p_target and kingdom_id=v_king;
   if v_target_role is null then raise exception 'Odabrani igrač nije član kraljevstva'; end if;
   if p_action='crown' then
     update public.kz_members set role='vojnik' where player_id=v_player;
     update public.kz_members set role='kralj' where player_id=p_target;
     if v_target_role='vojvoda' then update public.kz_members set role='vojvoda' where player_id=v_player; end if;
     insert into public.kz_mail(player_id,body)
      values(p_target,'Predana ti je kruna kraljevstva '||(select name from public.kz_kingdoms where id=v_king)||'.');
   elsif p_action='duke' then
     update public.kz_members set role='vojnik' where kingdom_id=v_king and role='vojvoda';
     update public.kz_members set role='vojvoda' where player_id=p_target;
   else
     if exists(select 1 from public.kz_games where player_id=p_target and finished_at is null) then raise exception 'Igrač prvo mora završiti pitanja'; end if;
     delete from public.kz_members where player_id=p_target;
     insert into public.kz_mail(player_id,body) values(p_target,'Više nisi član kraljevstva '||(select name from public.kz_kingdoms where id=v_king)||'.');
   end if;
 else
   raise exception 'Nemaš ovlast za ovu radnju';
 end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.kz_place(p_guest_id uuid,p_guest_secret text,
 p_from_x bigint default null,p_from_y bigint default null,
 p_direction text default null,p_size integer default 20,
 p_spawn boolean default false,p_lat double precision default null,
 p_lon double precision default null,p_accuracy double precision default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_player uuid; v_king uuid; v_bank bigint; v_area bigint; v_total bigint;
 v_x bigint; v_y bigint; v_tx bigint; v_ty bigint; v_dx integer:=0; v_dy integer:=0;
 v_enemy uuid; v_actual integer; v_cost integer; v_occ integer; v_i integer;
 v_xx bigint; v_yy bigint; v_conflicts integer; v_patch_x bigint[]:='{}'; v_patch_y bigint[]:='{}';
 v_r constant double precision:=6371007.181; v_k constant double precision:=0.8660254037844386;
begin
 -- Jedna transakcijska brava za globalnu mrežu: nema preuzimanja istog kvadrata u dvije paralelne radnje.
 perform pg_advisory_xact_lock(770077003);
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into v_king from public.kz_members where player_id=v_player and role='kralj';
 if v_king is null then raise exception 'Samo kralj kvizaš može raspoređivati teritorij'; end if;
 select bank_m2,area_m2 into v_bank,v_area from public.kz_kingdoms where id=v_king for update;
 if p_spawn or v_area=0 then
   if p_lat is null or p_lon is null or p_lat not between -85 and 85 or p_lon not between -180 and 180
     or p_accuracy is null or p_accuracy<0 or p_accuracy>100 then
       raise exception 'Za početnu lokaciju uključi GPS s preciznošću do 100 metara';
   end if;
   v_tx:=floor(v_r*v_k*radians(p_lon))::bigint;
   v_ty:=floor(v_r/v_k*sin(radians(p_lat)))::bigint;
 else
   if p_from_x is null or p_from_y is null then raise exception 'Dodirni svoju granicu na karti'; end if;
   if not exists(select 1 from public.kz_cells where x=p_from_x and y=p_from_y and kingdom_id=v_king) then
     raise exception 'Moraš odabrati vlastiti kvadrat'; end if;
   if p_direction='E' then v_dx:=1; elsif p_direction='W' then v_dx:=-1;
   elsif p_direction='N' then v_dy:=1; elsif p_direction='S' then v_dy:=-1;
   else raise exception 'Odaberi smjer širenja'; end if;
   v_tx:=p_from_x+v_dx; v_ty:=p_from_y+v_dy;
 end if;
 select kingdom_id into v_enemy from public.kz_cells where x=v_tx and y=v_ty;
 if v_enemy=v_king then raise exception 'To je već tvoj teritorij, odaberi vanjsku granicu'; end if;
 if v_enemy is null then
   v_actual:=case when (p_spawn or v_area=0) then 20 else p_size end;
   if v_actual not between 3 and 20 then raise exception 'Odaberi 3 do 20 m²'; end if;
   v_cost:=v_actual;
 else
   v_actual:=8; v_cost:=20;
 end if;
 if v_bank<v_cost then raise exception 'Nema dovoljno kvadrata znanja na kontu'; end if;
 for v_i in 0..v_actual-1 loop
   if (p_spawn or v_area=0) then
     v_xx:=v_tx+(v_i/4)-2; v_yy:=v_ty+(v_i%4)-2;
   elsif v_dx<>0 then
     v_xx:=v_tx+v_dx*(v_i/4); v_yy:=v_ty+(v_i%4)-1;
   else
     v_xx:=v_tx+(v_i%4)-1; v_yy:=v_ty+v_dy*(v_i/4);
   end if;
   v_patch_x:=array_append(v_patch_x,v_xx);
   v_patch_y:=array_append(v_patch_y,v_yy);
 end loop;
 select count(*) into v_conflicts from generate_subscripts(v_patch_x,1) i
   join public.kz_cells c on c.x=v_patch_x[i] and c.y=v_patch_y[i]
   where (v_enemy is null) or c.kingdom_id<>v_enemy;
 if v_conflicts>0 then raise exception 'Na tom rubu nema dovoljno neprekinutih kvadrata iste vrste; odaberi drugi rub'; end if;
 if v_enemy is not null then
   select count(*) into v_occ from generate_subscripts(v_patch_x,1) i
     join public.kz_cells c on c.x=v_patch_x[i] and c.y=v_patch_y[i] and c.kingdom_id=v_enemy;
   if v_occ<>8 then raise exception 'Za napad treba osam susjednih kvadrata istog suparnika'; end if;
 end if;
 if v_enemy is null then
   insert into public.kz_cells(x,y,kingdom_id)
    select v_patch_x[i],v_patch_y[i],v_king from generate_subscripts(v_patch_x,1) i;
 else
   update public.kz_cells c set kingdom_id=v_king,created_at=now()
   from generate_subscripts(v_patch_x,1) i
   where c.x=v_patch_x[i] and c.y=v_patch_y[i] and c.kingdom_id=v_enemy;
   update public.kz_kingdoms set area_m2=area_m2-8 where id=v_enemy;
 end if;
 update public.kz_kingdoms set area_m2=area_m2+v_actual,bank_m2=bank_m2-v_cost,
   anchor_x=coalesce(anchor_x,v_tx),anchor_y=coalesce(anchor_y,v_ty)
 where id=v_king returning area_m2 into v_total;
 insert into public.kz_moves(kingdom_id,player_id,action,spent_m2,added_m2,previous_kingdom,at_x,at_y)
 values(v_king,v_player,case when v_enemy is not null then 'attack' when (p_spawn or v_area=0) then 'spawn' else 'claim' end,
 v_cost,v_actual,v_enemy,v_tx,v_ty);
 return jsonb_build_object('added',v_actual,'spent',v_cost,'new_area',v_total,'attack',v_enemy is not null);
end $$;

create or replace function public.kz_read_mail(p_guest_id uuid,p_guest_secret text,p_mail_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.kz_mail set read_at=coalesce(read_at,now())
 where id=p_mail_id and player_id=public.kz_who(p_guest_id,p_guest_secret);
 return found;
end $$;

do $$ declare r record; begin
 for r in select p.oid::regprocedure as signature from pg_proc p
  join pg_namespace n on p.pronamespace=n.oid
  where n.nspname='public' and p.proname in
    ('kz_identity','kz_catalog','kz_create','kz_state','kz_map',
    'kz_start','kz_answer','kz_apply','kz_review','kz_membership','kz_place','kz_read_mail')
 loop
   execute format('revoke all on function %s from PUBLIC',r.signature);
   execute format('grant execute on function %s to anon,authenticated',r.signature);
 end loop;
end $$;

create or replace function kz_private.realm_role_label(role text) returns text language sql immutable set search_path='' as $$
 select case role when 'kralj' then 'Kralj kvizaš' when 'vojvoda' then 'Vojvoda kvizaš' when 'vojnik' then 'Vojnik kvizaš' else role end
$$;
CREATE OR REPLACE FUNCTION public.kz_membership(p_guest_id uuid, p_guest_secret text, p_action text, p_target uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_player uuid; v_king uuid; v_role text; v_target_role text; v_roles jsonb; rec record;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 select kingdom_id,role into v_king,v_role from public.kz_members where player_id=v_player;
 if v_king is null then raise exception 'Nema aktivnog članstva'; end if;
 perform 1 from public.kz_kingdoms where id=v_king for update;
 select coalesce(jsonb_object_agg(player_id::text,role),'{}'::jsonb) into v_roles from public.kz_members where kingdom_id=v_king;
 if p_action='leave' and v_role<>'kralj' then
   if exists(select 1 from public.kz_games where player_id=v_player and finished_at is null) then raise exception 'Prvo završi pet pitanja'; end if;
   delete from public.kz_members where player_id=v_player;
   perform kz_private.log_realm_event(v_king,'leave',coalesce((select display_name from public.kz_players where id=v_player),'Igrač')||' napušta kraljevstvo.',null,clock_timestamp());
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
     update public.kz_members set role='vojnik' where kingdom_id=v_king and role='vojvoda' and player_id<>p_target;
     update public.kz_members set role='vojvoda' where player_id=p_target;
   else
     if exists(select 1 from public.kz_games where player_id=p_target and finished_at is null) then raise exception 'Igrač prvo mora završiti pitanja'; end if;
     delete from public.kz_members where player_id=p_target;
     perform kz_private.log_realm_event(v_king,'kick',coalesce((select display_name from public.kz_players where id=p_target),'Igrač')||' je isključen iz kraljevstva. Odluka: '||coalesce((select display_name from public.kz_players where id=v_player),'Kralj kvizaš')||'.',null,clock_timestamp());
     insert into public.kz_mail(player_id,body) values(p_target,'Više nisi član kraljevstva '||(select name from public.kz_kingdoms where id=v_king)||'.');
   end if;
 else
   raise exception 'Nemaš ovlast za ovu radnju';
 end if;
 for rec in select m.player_id,m.role,p.display_name,v_roles->>m.player_id::text old_role
   from public.kz_members m join public.kz_players p on p.id=m.player_id
   where m.kingdom_id=v_king and v_roles ? m.player_id::text and (v_roles->>m.player_id::text) is distinct from m.role
 loop
   perform kz_private.log_realm_event(v_king,
    case when (case rec.role when 'kralj' then 3 when 'vojvoda' then 2 else 1 end) >
       (case rec.old_role when 'kralj' then 3 when 'vojvoda' then 2 else 1 end) then 'promotion' else 'demotion' end,
    rec.display_name||': '||kz_private.realm_role_label(rec.old_role)||' → '||kz_private.realm_role_label(rec.role)||'.',null,clock_timestamp());
 end loop;
 return jsonb_build_object('ok',true);
end $function$
;
-- Expand old labels only within the known event templates, never in usernames.
update kz_private.realm_events set body=regexp_replace(body,'\(čin: (kralj|vojvoda|vojnik)\)\.$','(čin: '||kz_private.realm_role_label(substring(body from '\(čin: (kralj|vojvoda|vojnik)\)\.$'))||').')
where kind='join' and body ~ '\(čin: (kralj|vojvoda|vojnik)\)\.$';
update kz_private.realm_events set body=regexp_replace(body,': (kralj|vojvoda|vojnik) → (kralj|vojvoda|vojnik)\.$',': '||kz_private.realm_role_label(substring(body from ': (kralj|vojvoda|vojnik) →'))||' → '||kz_private.realm_role_label(substring(body from ' → (kralj|vojvoda|vojnik)\.$'))||'.')
where kind in ('promotion','demotion') and body ~ ': (kralj|vojvoda|vojnik) → (kralj|vojvoda|vojnik)\.$';

CREATE OR REPLACE FUNCTION public.kz_review(p_guest_id uuid, p_guest_secret text, p_request uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_king uuid; v_player uuid; v_request public.kz_join_requests%rowtype; v_role text;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 select kingdom_id into v_king from public.kz_members where player_id=v_player and role='kralj';
 if v_king is null then raise exception 'Samo kralj kvizaš odlučuje o članstvu'; end if;
 perform 1 from public.kz_kingdoms where id=v_king for update;
 select * into v_request from public.kz_join_requests where id=p_request and kingdom_id=v_king for update;
 if not found or v_request.status<>'pending' then raise exception 'Zahtjev više nije na čekanju'; end if;
 if p_accept then
   if (select count(*) from public.kz_members where kingdom_id=v_king)>=10 then raise exception 'Kraljevstvo već ima 10 članova'; end if;
   if exists(select 1 from public.kz_members where player_id=v_request.player_id) then raise exception 'Igrač već ima kraljevstvo'; end if;
   v_role:=case when exists(select 1 from public.kz_members where kingdom_id=v_king and role='vojvoda') then 'vojnik' else 'vojvoda' end;
   insert into public.kz_members(player_id,kingdom_id,role) values(v_request.player_id,v_king,v_role);
 end if;
 update public.kz_join_requests set status=case when p_accept then 'accepted' else 'rejected' end,decided_at=now() where id=p_request;
 insert into public.kz_mail(player_id,body) values(v_request.player_id,
    case when p_accept then 'Primljen/a si u kraljevstvo ' else 'Odbijen je zahtjev za kraljevstvo ' end ||
    (select name from public.kz_kingdoms where id=v_king)||'.');
 return jsonb_build_object('accepted',p_accept,'role',v_role);
end $function$
;

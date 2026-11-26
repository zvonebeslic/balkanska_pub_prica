-- Never fabricate a default player name. Reuse the verified shared identity.
create or replace function kz_private.real_player_name(n text)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(btrim(n)<>''
   and lower(btrim(n)) not in ('kvizaš','kvizas','gost','guest','kviztogo korisnik','kvizoman','tvoj rezultat','your score')
   and lower(btrim(n)) !~ '^kvizaš[0-9]{3}$',false)
$$;
create or replace function public.kz_saved_name(p_guest_id uuid,p_guest_secret text)
returns text language plpgsql security definer set search_path='' as $$
declare n text; blocked boolean; u uuid:=auth.uid();
begin
 if u is not null then
   select p.name_requires_change or p.permanently_hidden into blocked from public.profiles p where p.id=u;
   if coalesce(blocked,false) then return null;end if;
   select btrim(v.name) into n from (
     select p.username name,1 ord from public.profiles p where p.id=u
     union all select a.raw_user_meta_data->>'username',2 from auth.users a where a.id=u
     union all select p.full_name,3 from public.profiles p where p.id=u
     union all select a.raw_user_meta_data->>'full_name',4 from auth.users a where a.id=u
     union all select a.raw_user_meta_data->>'name',5 from auth.users a where a.id=u
   ) v where kz_private.real_player_name(v.name) order by v.ord limit 1;
   return left(n,32);
 end if;
 if p_guest_id is null or p_guest_secret is null or p_guest_secret !~ '^[a-fA-F0-9]{64}$' then return null;end if;
 if private.kviz_guest_secret_valid('guest:'||p_guest_id::text,p_guest_secret) then
   select btrim(player_name) into n from public.daily30_leaderboard_names
   where player_key='guest:'||p_guest_id::text and user_id is null
   and not name_requires_change and not permanently_hidden and kz_private.real_player_name(player_name);
 end if;
 return left(n,32);
end $$;
revoke all on function public.kz_saved_name(uuid,text) from public;
grant execute on function public.kz_saved_name(uuid,text) to anon,authenticated;
CREATE OR REPLACE FUNCTION public.kz_identity(p_guest_id uuid, p_guest_secret text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare v_id uuid; v_guest public.kz_players%rowtype; v_name text;
begin
 v_name:=left(nullif(btrim(p_name),''),32);
 if p_guest_id is null or p_guest_secret !~ '^[a-fA-F0-9]{64}$' then
   raise exception 'Nedostaje siguran gostujući identitet';
 end if;
 select * into v_guest from public.kz_players where guest_id=p_guest_id for update;
 if found and v_guest.guest_hash<>encode(digest(p_guest_secret,'sha256'),'hex') then
   raise exception 'Pogrešna tajna gostujućeg identiteta';
 end if;
 if auth.uid() is not null then
   v_name:=public.kz_saved_name(p_guest_id,p_guest_secret);
   if v_name is null then raise exception 'Najprije spremi korisničko ime na profilu'; end if;
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
   if not kz_private.real_player_name(v_name) then raise exception 'Upiši svoje korisničko ime'; end if;
   if not public.daily30_claim_name_secure('guest:'||p_guest_id::text,v_name,p_guest_secret) then
     raise exception 'Ime nije dostupno ili gostujući identitet nije potvrđen';
   end if;
   if v_guest.id is null then
     insert into public.kz_players(guest_id,guest_hash,display_name)
     values(p_guest_id,encode(digest(p_guest_secret,'sha256'),'hex'),v_name)
     returning id into v_id;
   else
     v_id:=v_guest.id;
   end if;
 end if;
 update public.kz_players set display_name=v_name where id=v_id and display_name is distinct from v_name;
 return jsonb_build_object('id',v_id,'signed_in',auth.uid() is not null,'name',v_name);
end $function$
;
-- Repair only names with a verified existing link; don't assign invented names.
update public.kz_players p set display_name=left(btrim(pr.username),32)
from public.profiles pr where p.auth_user=pr.id and kz_private.real_player_name(pr.username)
and not pr.name_requires_change and not pr.permanently_hidden and p.display_name is distinct from left(btrim(pr.username),32);
update public.kz_players p set display_name=left(btrim(n.player_name),32)
from public.daily30_leaderboard_names n
where p.auth_user is null and n.player_key='guest:'||p.guest_id::text and n.user_id is null
and not n.name_requires_change and not n.permanently_hidden and kz_private.real_player_name(n.player_name)
and p.display_name is distinct from left(btrim(n.player_name),32);

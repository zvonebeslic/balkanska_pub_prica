
-- pgcrypto je na ovom Supabase projektu instaliran u shemi extensions, ne u public.
do $fix$
declare v_sig regprocedure; v_def text; v_old text;
begin
 foreach v_sig in array array[
   'public.kz_who(uuid,text)'::regprocedure,
   'public.kz_identity(uuid,text,text)'::regprocedure
 ] loop
   v_old:=pg_get_functiondef(v_sig);
   v_def:=replace(v_old, 'SET search_path TO ''public'', ''pg_temp''',
       'SET search_path TO ''public'', ''extensions'', ''pg_temp''');
   if v_def=v_old then raise exception 'Nije pronađen očekivani search_path za %',v_sig; end if;
   execute v_def;
 end loop;
end $fix$;
-- Veći katalog unaprijed odobrenih imena bez promjene pravila odabira.
insert into public.kz_names(name)
select a.prefix||' '||b.suffix
from (values ('Zlatni'),('Srebrni'),('Plavi'),('Crveni'),('Bijeli'),('Crni'),
  ('Zeleni'),('Jadranski'),('Nebeski'),('Gorski'),('Olujni'),('Sjeverni'),
  ('Južni'),('Tajni'),('Veliki'),('Čelični'),('Vječni'),('Kraljevski'),('Mudri'),('Svijetli'),
  ('Hrabri'),('Borbeni'),('Magleni'),('Kristalni')) a(prefix)
cross join (values ('Feniks'),('Zmaj'),('Grifon'),('Sokol'),('Lav'),('Vitez'),
  ('Kompas'),('Štit'),('Prsten'),('Pehar'),('Znak'),('Zbor'),
  ('Orlovi'),('Ratnici'),('Čuvari'),('Umovi'),('Putnici'),('Znalci'),
  ('Mačevi'),('Dvorac'),('Atlas'),('Kvizaši'),('Meridijan'),('Pobjednici')) b(suffix)
on conflict do nothing;

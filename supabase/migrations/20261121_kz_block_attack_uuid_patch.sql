-- Popravak napada: UUID vlasnika čita se iz jedne postojeće ćelije, bez MIN(uuid).
do $$
declare old_code text; new_code text;
begin
 select pg_get_functiondef('public.kz_place_block(uuid,text,bigint,bigint,boolean,double precision,double precision,double precision)'::regprocedure) into old_code;
 new_code:=replace(old_code,
 'select min(kingdom_id) into v_enemy from public.kz_cells',
 'select kingdom_id into v_enemy from public.kz_cells');
 if old_code=new_code then raise exception 'KZ RPC patch not found'; end if;
 -- Bez ORDER BY, ali svi pripadaju istom v_enemy nakon provjere count(distinct).
 new_code:=replace(new_code,
 'where x between p_x and p_x+4 and y between p_y and p_y+3;',
 'where x between p_x and p_x+4 and y between p_y and p_y+3 limit 1;');
 -- Ovaj replace mogao bi pogoditi drugi upit; sigurnije ciljano iz izvornog DDL-a.
 new_code:=replace(old_code,
 'select min(kingdom_id) into v_enemy from public.kz_cells
     where x between p_x and p_x+4 and y between p_y and p_y+3;',
 'select kingdom_id into v_enemy from public.kz_cells
     where x between p_x and p_x+4 and y between p_y and p_y+3 limit 1;');
 if old_code=new_code then raise exception 'Precizni patch nije pronađen'; end if;
 execute new_code;
end $$;
notify pgrst,'reload schema';

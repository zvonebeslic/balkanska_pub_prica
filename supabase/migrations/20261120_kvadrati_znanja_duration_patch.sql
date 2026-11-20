
alter table public.kz_games
  add column if not exists duration_seconds integer not null default 0
  check (duration_seconds>=0);
do $patch$
declare f text; g text;
begin
 f:=pg_get_functiondef('public.kz_answer(uuid,text,uuid,integer,text)'::regprocedure);
 g:=replace(f,
  'update public.kz_games set finished_at=now() where id=p_game_id;',
  'update public.kz_games set finished_at=now(), duration_seconds=greatest(0,floor(extract(epoch from now()-started_at)))::integer where id=p_game_id;');
 if f=g then raise exception 'kz_answer duration patch target not found'; end if;
 execute g;

 f:=pg_get_functiondef('public.kz_state(uuid,text)'::regprocedure);
 g:=replace(f,
  '''earned'',h.earned_m2) order by h.finished_at desc',
  '''earned'',h.earned_m2,''seconds'',h.duration_seconds) order by h.finished_at desc');
 g:=replace(g,
  'select finished_at,correct_count,wrong_count,earned_m2 from public.kz_games',
  'select finished_at,correct_count,wrong_count,earned_m2,duration_seconds from public.kz_games');
 if f=g or position('''seconds'',h.duration_seconds' in g)=0 then
   raise exception 'kz_state duration patch target not found';
 end if;
 execute g;
end $patch$;

DO $$
declare g record; i integer; new_id integer; loc record;
begin
 perform pg_advisory_xact_lock(770077042);
 select coalesce(max(id),0) into new_id from public.kz_flag_points;
 for g in select region,local_bonus,count(*) filter(where kind='golf') as golf_n,count(*) filter(where kind='corner') as corner_n from public.kz_flag_points group by region,local_bonus order by local_bonus,region loop
  for i in 1..greatest(0,floor(g.golf_n*0.7)::integer-g.corner_n::integer) loop
   new_id:=new_id+1;
   if g.local_bonus then select * into strict loc from public.kz_corner_local_position(new_id);
   else select * into strict loc from public.kz_corner_random_position(g.region::integer,new_id,true); end if;
   insert into public.kz_flag_points(id,region,local_bonus,lat,lng,generation,kind,used_attempts) values(new_id,g.region,g.local_bonus,loc.lat,loc.lng,0,'corner',0);
  end loop;
 end loop;
end $$;
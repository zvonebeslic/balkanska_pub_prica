begin;
create function public.kz_flag_challenge(p_guest_id uuid,p_guest_secret text,p_flag_id integer,p_generation integer,p_lat double precision,p_lng double precision,p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_player uuid; f public.kz_flag_points%rowtype; a public.kz_flag_attempts%rowtype; q public.kz_questions%rowtype;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 perform 1 from public.kz_players where id=v_player for update;
 if not exists(select 1 from public.kz_members where player_id=v_player) then raise exception 'Pridruži se kraljevstvu.'; end if;
 select * into f from public.kz_flag_points where id=p_flag_id;
 if not found or f.generation<>p_generation then raise exception 'Zastavica je već premještena.'; end if;
 
 if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
 if public.kz_geo_dist_km(p_lat,p_lng,f.lat,f.lng)>2 then raise exception 'Zastavica je izvan kruga od 2 km.'; end if;
 select * into a from public.kz_flag_attempts where player_id=v_player and flag_id=f.id and generation=f.generation order by issued_at desc limit 1;
 if found then
  if a.answered_at is not null then raise exception 'Pokušaj je već iskorišten.'; end if;
  select * into q from public.kz_questions where id=a.question_id;
 else
  select * into q from public.kz_questions where options ?& array['A','B','C'] and correct_key in ('A','B','C') order by random() limit 1;
  if not found then raise exception 'Pitanja nisu dostupna.'; end if;
  insert into public.kz_flag_attempts(player_id,flag_id,generation,question_id) values(v_player,f.id,f.generation,q.id) returning * into a;
 end if;
 return jsonb_build_object('challenge_id',a.id,'prompt',q.prompt,'options',q.options,'image',q.image);
end $$;

create function public.kz_flag_answer(p_guest_id uuid,p_guest_secret text,p_challenge_id uuid,p_choice text,p_lat double precision,p_lng double precision,p_accuracy double precision)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_player uuid; v_kingdom uuid; a public.kz_flag_attempts%rowtype; f public.kz_flag_points%rowtype;
 answer_key text; good boolean; reward integer:=0; src record; p double precision[]; newlat double precision; newlng double precision;
begin
 v_player:=public.kz_who(p_guest_id,p_guest_secret);
 if upper(coalesce(p_choice,'')) not in ('A','B','C') then raise exception 'Odaberi odgovor.'; end if;
 perform 1 from public.kz_players where id=v_player for update;
 select * into a from public.kz_flag_attempts where id=p_challenge_id and player_id=v_player for update;
 if not found or a.answered_at is not null then raise exception 'Pokušaj je već iskorišten ili ne postoji.'; end if;
 select * into f from public.kz_flag_points where id=a.flag_id for update;
 if f.generation<>a.generation then raise exception 'Zastavicu je već riješio drugi igrač.'; end if;
 
 if p_lat is null or p_lng is null or p_accuracy is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or p_accuracy not between 0 and 150 then raise exception 'Uključi precizan GPS (točnost do 150 m).'; end if;
 if public.kz_geo_dist_km(p_lat,p_lng,f.lat,f.lng)>2 then raise exception 'Zastavica je izvan kruga od 2 km.'; end if;
 select kingdom_id into v_kingdom from public.kz_members where player_id=v_player;
 if v_kingdom is null then raise exception 'Pridruži se kraljevstvu.'; end if;
 select correct_key into answer_key from public.kz_questions where id=a.question_id;
 if answer_key is null then raise exception 'Pitanje nije dostupno.'; end if;
 good:=upper(p_choice)=answer_key;
 if good then reward:=400; update public.kz_kingdoms set bank_m2=bank_m2+reward where id=v_kingdom; end if;
 select base_lat,base_lng into src from public.kz_guardian_catalog where region_id=f.region
 and public.kz_geo_dist_km(f.lat,f.lng,base_lat,base_lng)>25 order by random() limit 1;
 if not found then raise exception 'Nema nove lokacije.'; end if;
 p:=public.kz_geo_dest(src.base_lat,src.base_lng,random()*360,0.2+random()*1.5);
 newlat:=degrees(asin(greatest(-1.0,least(1.0,(floor((6371007.181/(sqrt(3.0)/2))*sin(radians(p[1]))/4)*4+2)*(sqrt(3.0)/2)/6371007.181))));
 newlng:=degrees((floor(6371007.181*(sqrt(3.0)/2)*radians(p[2])/5)*5+2.5)/(6371007.181*(sqrt(3.0)/2)));
 update public.kz_flag_attempts set answered_at=now(),choice=upper(p_choice),reward_m2=reward where id=a.id;
 update public.kz_flag_points set lat=newlat,lng=newlng,generation=generation+1 where id=f.id;
 return jsonb_build_object('correct',good,'correct_key',answer_key,'reward_m2',reward,'flag_id',f.id);
end $$;

revoke execute on function public.kz_flag_challenge(uuid,text,integer,integer), public.kz_flag_answer(uuid,text,uuid,text) from public,anon,authenticated;
revoke execute on function public.kz_flag_challenge(uuid,text,integer,integer,double precision,double precision,double precision), public.kz_flag_answer(uuid,text,uuid,text,double precision,double precision,double precision) from public,anon,authenticated;
grant execute on function public.kz_flag_challenge(uuid,text,integer,integer,double precision,double precision,double precision), public.kz_flag_answer(uuid,text,uuid,text,double precision,double precision,double precision) to anon,authenticated;
notify pgrst,'reload schema';
commit;
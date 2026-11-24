-- Additional ex-YU flag quota; polygons from johan/world.geo.json (Natural Earth generalized borders).
begin;
select pg_advisory_xact_lock(770077042);
alter table public.kz_flag_points drop constraint kz_flag_points_region_check;
alter table public.kz_flag_points add constraint kz_flag_points_region_check check (region between 0 and 8);
create or replace function public.kz_flag_random_position(p_region integer,p_flag_id integer,p_initial boolean default false)
returns table(lat double precision,lng double precision) language plpgsql volatile set search_path='' as $$
declare v_w double precision;v_e double precision;v_s double precision;v_n double precision;v_gap double precision;v_lat double precision;v_lng double precision;v_delta_lat double precision;v_delta_lng double precision;v_old_lat double precision;v_old_lng double precision;v_i integer;v_r constant double precision:=6371007.181;v_k constant double precision:=sqrt(3.0)/2.0;
begin
 case p_region when 0 then v_w:=12; v_e:=30; v_s:=35; v_n:=48; v_gap:=3.5;
when 1 then v_w:=-13; v_e:=50; v_s:=35; v_n:=72; v_gap:=12;
when 2 then v_w:=-169; v_e:=-52; v_s:=8; v_n:=83; v_gap:=35;
when 3 then v_w:=-82; v_e:=-34; v_s:=-56; v_n:=14; v_gap:=35;
when 4 then v_w:=-18; v_e:=52; v_s:=-36; v_n:=38; v_gap:=35;
when 5 then v_w:=26; v_e:=147; v_s:=-13; v_n:=77; v_gap:=35;
when 6 then v_w:=110; v_e:=180; v_s:=-48; v_n:=-10; v_gap:=35;
when 7 then v_w:=-180; v_e:=180; v_s:=-82; v_n:=-75; v_gap:=45;
when 8 then v_w:=13; v_e:=23.2; v_s:=40.7; v_n:=47; v_gap:=1.8; else raise exception 'Nepoznata regija zastavice'; end case;
 select f.lat,f.lng into v_old_lat,v_old_lng from public.kz_flag_points f where f.id=p_flag_id;
 v_delta_lat:=v_gap/110.0;
 for v_i in 1..12000 loop
  v_lng:=v_w+(v_e-v_w)*random();
  v_lat:=degrees(asin(sin(radians(v_s))+(sin(radians(v_n))-sin(radians(v_s)))*random()));
  if not (case p_region when 0 then ((pg_catalog.polygon('((13.4,45.7),(15,46.9),(18.7,46.8),(21.5,46),(23.5,44.7),(28.7,43.9),(29,41.4),(26,40.1),(25.5,38.4),(23,36.2),(20,35.1),(18.8,39),(16,40),(13.4,42.5))') @> pg_catalog.point(v_lng,v_lat)) and ((pg_catalog.polygon('((-11,36),(-10,43),(-7,45),(-5,49),(-11,51),(-8,59),(-2,59),(4,55),(10,56),(12,60),(21,71),(31,71),(31,62),(43,59),(49,56),(40,47),(35,44),(29,41),(28,36),(20,35),(18,40),(12,38),(9,43),(4,43))') @> pg_catalog.point(v_lng,v_lat))))
when 1 then (not (pg_catalog.polygon('((13.4,45.7),(15,46.9),(18.7,46.8),(21.5,46),(23.5,44.7),(28.7,43.9),(29,41.4),(26,40.1),(25.5,38.4),(23,36.2),(20,35.1),(18.8,39),(16,40),(13.4,42.5))') @> pg_catalog.point(v_lng,v_lat)) and ((pg_catalog.polygon('((-11,36),(-10,43),(-7,45),(-5,49),(-11,51),(-8,59),(-2,59),(4,55),(10,56),(12,60),(21,71),(31,71),(31,62),(43,59),(49,56),(40,47),(35,44),(29,41),(28,36),(20,35),(18,40),(12,38),(9,43),(4,43))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((-10,50),(-5,50),(-1,55),(-4,60),(-9,59))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((-9,51),(-6,51),(-6,55),(-10,55))') @> pg_catalog.point(v_lng,v_lat))))
when 2 then ((pg_catalog.polygon('((-168,69),(-155,60),(-137,59),(-130,49),(-124,40),(-117,32),(-110,31),(-105,24),(-97,16),(-88,16),(-86,11),(-82,9),(-78,9),(-77,20),(-81,27),(-79,34),(-67,44),(-53,52),(-56,61),(-80,70),(-105,73),(-128,72),(-151,73))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((-53,60),(-43,60),(-38,65),(-42,73),(-50,80),(-59,82),(-60,71))') @> pg_catalog.point(v_lng,v_lat)))
when 3 then ((pg_catalog.polygon('((-82,11),(-77,8),(-74,3),(-80,-3),(-79,-10),(-75,-16),(-72,-28),(-73,-37),(-70,-47),(-68,-56),(-63,-54),(-64,-42),(-59,-35),(-52,-33),(-48,-28),(-35,-7),(-35,-3),(-44,1),(-50,4),(-58,9),(-68,12))') @> pg_catalog.point(v_lng,v_lat)))
when 4 then ((pg_catalog.polygon('((-17,36),(5,37),(12,33),(24,33),(35,31),(41,12),(51,12),(49,2),(42,-12),(34,-23),(30,-34),(19,-35),(12,-29),(10,-19),(8,-6),(-1,5),(-9,5),(-17,14))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((47,-13),(50,-16),(49,-24),(44,-26),(43,-18))') @> pg_catalog.point(v_lng,v_lat)))
when 5 then ((pg_catalog.polygon('((26,41),(36,45),(39,57),(48,61),(65,71),(88,76),(114,73),(133,70),(142,58),(135,50),(130,42),(140,37),(141,31),(131,30),(123,23),(116,19),(110,11),(105,2),(101,-1),(96,6),(98,17),(90,21),(83,8),(76,7),(72,19),(66,24),(61,25),(58,30),(50,31),(46,39),(41,42),(35,35))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((95,22),(107,23),(120,19),(125,9),(126,-6),(122,-10),(115,-9),(108,-7),(104,3),(100,9))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((130,30),(136,34),(141,40),(146,44),(144,35),(138,33))') @> pg_catalog.point(v_lng,v_lat)))
when 6 then ((pg_catalog.polygon('((113,-11),(123,-12),(134,-11),(139,-15),(151,-21),(153,-29),(146,-39),(136,-36),(128,-34),(115,-33))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((166,-34),(179,-39),(175,-46),(168,-47),(166,-41))') @> pg_catalog.point(v_lng,v_lat)))
when 7 then (v_lat between -82 and -75)
when 8 then ((pg_catalog.polygon('((13.806475,46.509306),(14.632472,46.431817),(15.137092,46.658703),(16.011664,46.683611),(16.202298,46.852386),(16.370505,46.841327),(16.564808,46.503751),(15.768733,46.238108),(15.67153,45.834154),(15.323954,45.731783),(15.327675,45.452316),(14.935244,45.471695),(14.595109,45.634941),(14.411968,45.466166),(13.71506,45.500324),(13.93763,45.591016),(13.69811,46.016778),(13.806475,46.509306))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((18.829838,45.908878),(19.072769,45.521511),(19.390476,45.236516),(19.005486,44.860234),(18.553214,45.08159),(17.861783,45.06774),(17.002146,45.233777),(16.534939,45.211608),(16.318157,45.004127),(15.959367,45.233777),(15.750026,44.818712),(16.23966,44.351143),(16.456443,44.04124),(16.916156,43.667722),(17.297373,43.446341),(17.674922,43.028563),(18.56,42.65),(18.450016,42.479991),(17.50997,42.849995),(16.930006,43.209998),(16.015385,43.507215),(15.174454,44.243191),(15.37625,44.317915),(14.920309,44.738484),(14.901602,45.07606),(14.258748,45.233777),(13.952255,44.802124),(13.656976,45.136935),(13.679403,45.484149),(13.71506,45.500324),(14.411968,45.466166),(14.595109,45.634941),(14.935244,45.471695),(15.327675,45.452316),(15.323954,45.731783),(15.67153,45.834154),(15.768733,46.238108),(16.564808,46.503751),(16.882515,46.380632),(17.630066,45.951769),(18.456062,45.759481),(18.829838,45.908878))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((19.005486,44.860234),(19.36803,44.863),(19.11761,44.42307),(19.59976,44.03847),(19.454,43.5681),(19.21852,43.52384),(19.03165,43.43253),(18.70648,43.20011),(18.56,42.65),(17.674922,43.028563),(17.297373,43.446341),(16.916156,43.667722),(16.456443,44.04124),(16.23966,44.351143),(15.750026,44.818712),(15.959367,45.233777),(16.318157,45.004127),(16.534939,45.211608),(17.002146,45.233777),(17.861783,45.06774),(18.553214,45.08159),(19.005486,44.860234))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((20.874313,45.416375),(21.483526,45.18117),(21.562023,44.768947),(22.145088,44.478422),(22.459022,44.702517),(22.705726,44.578003),(22.474008,44.409228),(22.65715,44.234923),(22.410446,44.008063),(22.500157,43.642814),(22.986019,43.211161),(22.604801,42.898519),(22.436595,42.580321),(22.545012,42.461362),(22.380526,42.32026),(21.91708,42.30364),(21.576636,42.245224),(21.54332,42.32025),(21.66292,42.43922),(21.77505,42.6827),(21.63302,42.67717),(21.43866,42.86255),(21.27421,42.90959),(21.143395,43.068685),(20.95651,43.13094),(20.81448,43.27205),(20.63508,43.21671),(20.49679,42.88469),(20.25758,42.81275),(20.3398,42.89852),(19.95857,43.10604),(19.63,43.21378),(19.48389,43.35229),(19.21852,43.52384),(19.454,43.5681),(19.59976,44.03847),(19.11761,44.42307),(19.36803,44.863),(19.00548,44.86023),(19.390476,45.236516),(19.072769,45.521511),(18.82982,45.90888),(19.596045,46.17173),(20.220192,46.127469),(20.762175,45.734573),(20.874313,45.416375))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((19.801613,42.500093),(19.738051,42.688247),(19.30449,42.19574),(19.37177,41.87755),(19.16246,41.95502),(18.88214,42.28151),(18.45,42.48),(18.56,42.65),(18.70648,43.20011),(19.03165,43.43253),(19.21852,43.52384),(19.48389,43.35229),(19.63,43.21378),(19.95857,43.10604),(20.3398,42.89852),(20.25758,42.81275),(20.0707,42.58863),(19.801613,42.500093))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((20.59023,41.85541),(20.71731,41.84711),(20.76216,42.05186),(21.3527,42.2068),(21.576636,42.245224),(21.91708,42.30364),(22.380526,42.32026),(22.881374,41.999297),(22.952377,41.337994),(22.76177,41.3048),(22.597308,41.130487),(22.055378,41.149866),(21.674161,40.931275),(21.02004,40.842727),(20.60518,41.08622),(20.46315,41.51509),(20.59023,41.85541))') @> pg_catalog.point(v_lng,v_lat)) or (pg_catalog.polygon('((20.76216,42.05186),(20.71731,41.84711),(20.59023,41.85541),(20.52295,42.21787),(20.28374,42.32025),(20.0707,42.58863),(20.25758,42.81275),(20.49679,42.88469),(20.63508,43.21671),(20.81448,43.27205),(20.95651,43.13094),(21.143395,43.068685),(21.27421,42.90959),(21.43866,42.86255),(21.63302,42.67717),(21.77505,42.6827),(21.66292,42.43922),(21.54332,42.32025),(21.576636,42.245224),(21.3527,42.2068),(20.76216,42.05186))') @> pg_catalog.point(v_lng,v_lat))) else false end) then continue; end if;
  v_lng:=degrees((floor(v_r*v_k*radians(v_lng)/5)*5+2.5)/(v_r*v_k));
  v_lat:=degrees(asin(greatest(-1.0,least(1.0,(floor(v_r/v_k*sin(radians(v_lat))/4)*4+2)*v_k/v_r))));
  if not p_initial and public.kz_geo_dist_km(v_old_lat,v_old_lng,v_lat,v_lng)<v_gap then continue; end if;
  v_delta_lng:=v_gap/(110.0*greatest(.01,cos(radians(abs(v_lat)+v_delta_lat))));
  if not exists(select 1 from public.kz_flag_points f where f.id<>p_flag_id and (not p_initial or f.id<p_flag_id)
   and (f.region=p_region or (p_region=8 and f.region in (0,1)) or (p_region in (0,1) and f.region=8)) and f.lat between v_lat-v_delta_lat and v_lat+v_delta_lat
   and (f.lng between v_lng-v_delta_lng and v_lng+v_delta_lng or f.lng+360 between v_lng-v_delta_lng and v_lng+v_delta_lng or f.lng-360 between v_lng-v_delta_lng and v_lng+v_delta_lng)
   and public.kz_geo_dist_km(f.lat,f.lng,v_lat,v_lng)<(case when f.region=8 or p_region=8 then 1.8 else v_gap end)) then
   lat:=v_lat;lng:=v_lng;return next;return;
  end if;
 end loop;
 raise exception 'Nije pronađen slobodan položaj za zastavicu %',p_flag_id;
end $$;
revoke all on function public.kz_flag_random_position(integer,integer,boolean) from public,anon,authenticated;
create index if not exists kz_flags_region_lat_lng_idx on public.kz_flag_points(region,lat,lng);


DO $$
declare v_id integer; v_count integer; p record;
begin
 select count(*) into v_count from public.kz_flag_points where region=8;
 select coalesce(max(id),0) into v_id from public.kz_flag_points;
 for i in 1..greatest(0,15000-v_count) loop
   v_id:=v_id+1;
   select * into strict p from public.kz_flag_random_position(8,v_id,false);
   insert into public.kz_flag_points(id,region,lat,lng) values(v_id,8,p.lat,p.lng);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
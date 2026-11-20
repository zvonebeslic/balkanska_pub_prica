
-- Kvadrati znanja: potpuno odvojena pohrana. Nema izmjena u quiz_* ni daily30_*.
create table if not exists public.kz_names (name text primary key);
insert into public.kz_names(name) values
('Zlatni Feniks'),('Plavi Zmaj'),('Sjeverna Kruna'),('Južna Tvrđava'),
('Čuvari Znanja'),('Zeleni Grifon'),('Crna Ruža'),('Bijeli Vuk'),
('Zmajevo Oko'),('Srebrni Štit'),('Zvjezdana Straža'),('Orlovo Gnijezdo'),
('Kraljevstvo Munja'),('Kraljevstvo Sova'),('Rimski Lav'),('Jadranski Vitezovi'),
('Alpska Legija'),('Tajna Knjižnica'),('Smargadni Mač'),('Crveni Kompas'),
('Kvizovska Armada'),('Čelični Um'),('Vječni Istraživači'),('Vukovi Karpata'),
('Pustinjski Sokol'),('Kraljevski Akordi'),('Nebeska Kula'),('Balkanski Grifon'),
('Čuvari Vremena'),('Mudra Družina'),('Olimpska Munja'),('Zlatni Meridijan'),
('Kraljevstvo Atlas'),('Jutarnja Zvijezda'),('Feniksova Zemlja'),('Gorska Kruna')
on conflict do nothing;
create table if not exists public.kz_players (
 id uuid primary key default gen_random_uuid(),
 auth_user uuid unique references auth.users(id) on delete set null,
 guest_id uuid unique,
 guest_hash text,
 display_name text not null default 'Kvizaš',
 cooldown_until timestamptz,
 created_at timestamptz not null default now(),
 check ((guest_id is null) = (guest_hash is null))
);
create table if not exists public.kz_kingdoms (
 id uuid primary key default gen_random_uuid(),
 name text not null unique references public.kz_names(name),
 color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
 area_m2 bigint not null default 0 check (area_m2>=0),
 bank_m2 bigint not null default 0 check (bank_m2>=0),
 anchor_x bigint, anchor_y bigint,
 created_at timestamptz not null default now()
);
create table if not exists public.kz_members (
 player_id uuid primary key references public.kz_players(id) on delete cascade,
 kingdom_id uuid not null references public.kz_kingdoms(id) on delete cascade,
 role text not null check (role in ('kralj','vojvoda','vojnik')),
 joined_at timestamptz not null default now()
);
create unique index if not exists kz_one_king on public.kz_members(kingdom_id) where role='kralj';
create unique index if not exists kz_one_duke on public.kz_members(kingdom_id) where role='vojvoda';
create index if not exists kz_members_realm on public.kz_members(kingdom_id);
create table if not exists public.kz_cells (
 x bigint not null, y bigint not null,
 kingdom_id uuid not null references public.kz_kingdoms(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(x,y)
);
create index if not exists kz_cells_kingdom on public.kz_cells(kingdom_id);
create table if not exists public.kz_questions (
 id text primary key,
 source text not null,
 prompt text not null,
 options jsonb not null,
 correct_key text not null check (correct_key in ('A','B','C')),
 image text,
 imported_at timestamptz not null default now(),
 check (jsonb_typeof(options)='object' and options ? 'A' and options ? 'B' and options ? 'C')
);
create table if not exists public.kz_games (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.kz_players(id),
 kingdom_id uuid not null references public.kz_kingdoms(id),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 correct_count integer not null default 0,
 wrong_count integer not null default 0,
 earned_m2 integer not null default 0,
 check(correct_count+wrong_count<=5)
);
create index if not exists kz_games_player on public.kz_games(player_id,started_at desc);
create unique index if not exists kz_one_open_game on public.kz_games(player_id) where finished_at is null;
create table if not exists public.kz_game_questions (
 game_id uuid not null references public.kz_games(id) on delete cascade,
 position smallint not null check(position between 1 and 5),
 question_id text not null references public.kz_questions(id),
 choice text check(choice in ('A','B','C')),
 correct boolean,
 earned_m2 integer not null default 0,
 answered_at timestamptz,
 primary key(game_id,position)
);
create table if not exists public.kz_seen (
 player_id uuid not null references public.kz_players(id) on delete cascade,
 question_id text not null references public.kz_questions(id),
 primary key(player_id,question_id)
);
create table if not exists public.kz_join_requests (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.kz_players(id) on delete cascade,
 kingdom_id uuid not null references public.kz_kingdoms(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now(),
 decided_at timestamptz
);
create unique index if not exists kz_only_one_pending on public.kz_join_requests(player_id) where status='pending';
create index if not exists kz_join_realm on public.kz_join_requests(kingdom_id,status);
create table if not exists public.kz_mail (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.kz_players(id) on delete cascade,
 body text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists kz_mail_player on public.kz_mail(player_id,created_at desc);
create table if not exists public.kz_moves (
 id bigint generated always as identity primary key,
 kingdom_id uuid not null references public.kz_kingdoms(id),
 player_id uuid not null references public.kz_players(id),
 action text not null check(action in ('claim','attack','spawn','capture')),
 spent_m2 integer not null,
 added_m2 integer not null,
 previous_kingdom uuid,
 at_x bigint not null, at_y bigint not null,
 created_at timestamptz not null default now()
);
create index if not exists kz_moves_realm on public.kz_moves(kingdom_id,created_at desc);
-- Svi podaci ostaju zatvoreni. Jedine javne ulazne točke su autorizirani RPC-ovi.
do $$ declare n text; begin
 foreach n in array array['kz_names','kz_players','kz_kingdoms','kz_members','kz_cells',
 'kz_questions','kz_games','kz_game_questions','kz_seen','kz_join_requests','kz_mail','kz_moves'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on table public.%I from anon, authenticated',n);
 end loop;
end $$;
comment on table public.kz_cells is 'Globalna sferna ekvivalentna mreža 1 m²; x/y su koordinate Lambertove cilindrične ekvivalentne projekcije, standardna paralela 30°.';

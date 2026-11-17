-- my-app server schema (milestone 4: accounts + Strava). Postgres on Supabase.
-- v1 keeps the same shapes in IndexedDB (see replica/architecture.md).
-- Units: metres, seconds, timestamptz in UTC. Access: row-level security.

create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- One row per auth user.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  units text not null default 'mi' check (units in ('mi', 'km')),
  default_font text,
  default_colour text check (default_colour ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Linked data sources (Strava first).
create table connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  provider text not null check (provider in ('strava')),
  external_user_id text not null,
  access_token text not null,          -- server-only; never selected by clients (see policies)
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  backfill_cursor timestamptz,          -- resumable history import
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider),
  unique (provider, external_user_id)
);
create index on connections (user_id);

create table gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  type text not null default 'shoes' check (type in ('shoes', 'bike', 'watch', 'other')),
  start_distance_m double precision not null default 0 check (start_distance_m >= 0),
  retired boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on gear (user_id, retired);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  connection_id uuid references connections(id) on delete set null,
  gear_id uuid references gear(id) on delete set null,
  source text not null check (source in ('apple_health', 'strava', 'gpx', 'tcx', 'fit', 'manual')),
  external_id text,                     -- provider id; null for files/manual
  file_hash text,                       -- sha-256 of an imported file
  type text not null default 'run'
    check (type in ('run', 'trail_run', 'walk', 'hike', 'ride', 'swim', 'workout', 'other')),
  title text not null default '' check (length(title) <= 120),
  location_name text,
  started_at timestamptz not null,
  utc_offset_min integer not null default 0 check (utc_offset_min between -840 and 840),
  distance_m double precision check (distance_m >= 0),
  moving_time_s integer check (moving_time_s >= 0),
  elapsed_time_s integer check (elapsed_time_s >= 0),
  elevation_gain_m double precision check (elevation_gain_m >= 0),
  avg_hr smallint check (avg_hr between 20 and 250),
  max_hr smallint check (max_hr between 20 and 250),
  calories integer check (calories >= 0),
  splits jsonb not null default '[]',   -- [{ unit: 'mi'|'km', distance_m, time_s, elev_m }]
  route_polyline text,                  -- Google encoded polyline, simplified
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_needs_id check (source not in ('strava', 'apple_health') or external_id is not null)
);
create unique index activities_source_external on activities (user_id, source, external_id)
  where external_id is not null;
create unique index activities_file_hash on activities (user_id, file_hash)
  where file_hash is not null;
create index on activities (user_id, started_at desc);
create index on activities (connection_id);
create index on activities (gear_id);

-- Background photos; the bytes live in the private storage bucket "photos".
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null unique,    -- photos/<user_id>/<id>.jpg
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now()
);
create index on photos (user_id);

-- A saved design: background + positioned elements, re-rendered from the activity.
create table compositions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  activity_id uuid references activities(id) on delete cascade,
  photo_id uuid references photos(id) on delete set null,
  background jsonb not null default '{"kind":"solid","colour":"#000000"}',
  elements jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on compositions (user_id, updated_at desc);
create index on compositions (activity_id);
create index on compositions (photo_id);

-- updated_at triggers
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger connections_updated before update on connections for each row execute function set_updated_at();
create trigger gear_updated before update on gear for each row execute function set_updated_at();
create trigger activities_updated before update on activities for each row execute function set_updated_at();
create trigger compositions_updated before update on compositions for each row execute function set_updated_at();

-- Row-level security: users see and change only their own rows.
alter table profiles enable row level security;
alter table connections enable row level security;
alter table gear enable row level security;
alter table activities enable row level security;
alter table photos enable row level security;
alter table compositions enable row level security;

create policy own_profile on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy own_gear on gear for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_activities on activities for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_photos on photos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_compositions on compositions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Connections hold OAuth tokens: clients may list and delete their own, never
-- read tokens or insert/update (only the server, with the service role, does).
create policy read_own_connections on connections for select using (user_id = auth.uid());
create policy delete_own_connections on connections for delete using (user_id = auth.uid());
-- (A column-level revoke can't override Supabase's table-level grant, so
-- replace the grant with an explicit column list.)
revoke all on connections from authenticated, anon;
grant select (id, user_id, provider, external_user_id, scopes, last_synced_at, created_at, updated_at)
  on connections to authenticated;
grant delete on connections to authenticated;

-- Storage: the "photos" bucket, one folder per user.
-- create policy on storage.objects for all
--   using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
--   with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

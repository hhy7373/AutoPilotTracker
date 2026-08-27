-- AutoPilotLog / 智驾日记 v0.2
-- Supabase/PostgreSQL schema. Apply only after reviewing RLS policies and storage settings.

create extension if not exists pgcrypto;

create type public.verification_status as enum ('unverified', 'reviewed', 'verified', 'rejected');
create type public.evidence_level as enum ('none', 'self_reported', 'image', 'video', 'device');
create type public.trip_source as enum ('manual', 'app', 'video', 'device');

create table public.systems (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems(id),
  slug text unique not null,
  version text not null,
  hardware text not null,
  aliases text[] not null default '{}',
  released_at date,
  verification_status public.verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  unique (system_id, version, hardware)
);

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems(id),
  slug text unique not null,
  name text not null,
  hardware text not null,
  trim_name text,
  created_at timestamptz not null default now(),
  unique (system_id, name, trim_name)
);

create table public.vehicle_profiles (
  id uuid primary key default gen_random_uuid(),
  vehicle_model_id uuid not null references public.vehicle_models(id),
  owner_id uuid references auth.users(id),
  vin_hash text not null,
  vin_last6 text check (vin_last6 is null or length(vin_last6) = 6),
  created_at timestamptz not null default now(),
  unique (owner_id, vin_hash)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id),
  release_id uuid not null references public.releases(id),
  vehicle_profile_id uuid not null references public.vehicle_profiles(id),
  trip_date date not null,
  total_km numeric(8,2) not null check (total_km > 0 and total_km <= 5000),
  road_type text not null,
  region_level text,
  source public.trip_source not null default 'manual',
  evidence_level public.evidence_level not null default 'none',
  verification_status public.verification_status not null default 'unverified',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sequence_no smallint not null check (sequence_no > 0 and sequence_no <= 100),
  event_type text not null check (event_type in ('critical', 'safety', 'comfort', 'preference', 'system_exit')),
  scene text not null,
  description text not null check (length(description) between 1 and 2000),
  driver_action text,
  verification_status public.verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  unique (trip_id, sequence_no)
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  sha256 text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.public_trips as
select t.id, t.release_id, s.brand, s.name as system_name, r.version, r.hardware,
       vm.name as vehicle_model, vm.trim_name, t.trip_date, t.total_km,
       t.road_type, t.source, t.evidence_level, t.verification_status,
       count(distinct e.id)::int as event_count,
       count(distinct ev.id)::int as evidence_count
from public.trips t
join public.releases r on r.id = t.release_id
join public.systems s on s.id = r.system_id
join public.vehicle_profiles vp on vp.id = t.vehicle_profile_id
join public.vehicle_models vm on vm.id = vp.vehicle_model_id
left join public.events e on e.trip_id = t.id
left join public.evidence ev on ev.trip_id = t.id
where t.verification_status <> 'rejected' and t.published_at is not null
group by t.id, s.brand, s.name, r.version, r.hardware, vm.name, vm.trim_name;

grant select on public.public_trips to anon, authenticated;

alter table public.systems enable row level security;
alter table public.releases enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_profiles enable row level security;
alter table public.trips enable row level security;
alter table public.events enable row level security;
alter table public.evidence enable row level security;
alter table public.audit_logs enable row level security;

create policy "public can read systems" on public.systems for select using (true);
create policy "public can read releases" on public.releases for select using (verification_status <> 'rejected');
create policy "public can read vehicle models" on public.vehicle_models for select using (true);
create policy "authors read own vehicle profiles" on public.vehicle_profiles for select using (auth.uid() = owner_id);
create policy "authors insert own vehicle profiles" on public.vehicle_profiles for insert with check (auth.uid() = owner_id);
create policy "authors read own trips" on public.trips for select using (auth.uid() = author_id);
create policy "authors insert own trips" on public.trips for insert with check (auth.uid() = author_id and verification_status = 'unverified');
create policy "authors read own events" on public.events for select using (exists (select 1 from public.trips t where t.id = trip_id and t.author_id = auth.uid()));
create policy "authors insert own events" on public.events for insert with check (exists (select 1 from public.trips t where t.id = trip_id and t.author_id = auth.uid()));
create policy "authors read own evidence" on public.evidence for select using (exists (select 1 from public.trips t where t.id = trip_id and t.author_id = auth.uid()));
create policy "authors insert own evidence" on public.evidence for insert with check (exists (select 1 from public.trips t where t.id = trip_id and t.author_id = auth.uid()));

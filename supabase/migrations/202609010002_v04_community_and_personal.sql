-- AutoPilotLog v0.4 community, personal records and API support.
-- Review and apply only after the API deployment is ready.

alter table public.trips add column if not exists is_test boolean not null default false;
alter table public.trips add column if not exists idempotency_key text;
create unique index if not exists trips_author_idempotency_key_idx
  on public.trips(author_id, idempotency_key) where idempotency_key is not null;

create table if not exists public.user_profiles (
  user_id uuid primary key,
  display_name text not null check (length(display_name) between 1 and 40),
  email_linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null,
  display_name text not null check (length(display_name) between 1 and 40),
  title text not null check (length(title) between 1 and 80),
  body text not null check (length(body) between 1 and 5000),
  trip_id uuid references public.trips(id) on delete set null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null,
  display_name text not null check (length(display_name) between 1 and 40),
  body text not null check (length(body) between 1 and 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason text not null check (length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  check ((post_id is not null) <> (comment_id is not null))
);

alter table public.user_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reports enable row level security;

create policy "users read own profile" on public.user_profiles for select to authenticated using (auth.uid() = user_id);
create policy "users insert own profile" on public.user_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own profile" on public.user_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public can read visible community posts" on public.community_posts for select to anon, authenticated using (is_hidden = false);
create policy "authenticated users create posts" on public.community_posts for insert to authenticated with check (auth.uid() = author_id and is_hidden = false);
create policy "authors update own posts" on public.community_posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "public can read visible community comments" on public.community_comments for select to anon, authenticated using (is_hidden = false);
create policy "authenticated users create comments" on public.community_comments for insert to authenticated with check (auth.uid() = author_id and is_hidden = false);
create policy "authors update own comments" on public.community_comments for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "authenticated users create reports" on public.community_reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "reporters read own reports" on public.community_reports for select to authenticated using (auth.uid() = reporter_id);

create policy "admins read all profiles" on public.user_profiles for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins read all posts" on public.community_posts for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins update all posts" on public.community_posts for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins read all comments" on public.community_comments for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins update all comments" on public.community_comments for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins read all reports" on public.community_reports for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins update all reports" on public.community_reports for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins manage providers" on public.providers for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins manage sources" on public.catalog_sources for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins read change logs" on public.catalog_change_logs for select to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins insert change logs" on public.catalog_change_logs for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins manage systems" on public.systems for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins manage releases" on public.releases for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins manage vehicle models" on public.vehicle_models for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins manage trips" on public.trips for all to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.user_profiles to authenticated;
grant insert, update on public.user_profiles to authenticated;
grant select on public.community_posts, public.community_comments to anon, authenticated;
grant insert, update on public.community_posts, public.community_comments to authenticated;
grant insert, select on public.community_reports to authenticated;
grant update on public.community_reports to authenticated;

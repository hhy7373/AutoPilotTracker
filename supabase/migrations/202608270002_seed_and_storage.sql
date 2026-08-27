-- AutoPilotLog / 智驾日记 v0.2 seed data and evidence storage policies
-- Run after 202608270001_initial_v02.sql.

insert into public.systems (brand, name, slug) values
  ('小鹏', 'XNGP', 'xpeng-xngp'),
  ('华为 ADS', 'ADS', 'huawei-ads'),
  ('理想', 'AD Max', 'li-auto-ad-max'),
  ('蔚来', 'NOP+', 'nio-nop-plus'),
  ('小米', 'HAD', 'xiaomi-had')
on conflict (slug) do update set brand = excluded.brand, name = excluded.name;

insert into public.releases (system_id, slug, version, hardware, released_at, verification_status)
select s.id, v.slug, v.version, v.hardware, v.released_at::date, 'verified'
from (values
  ('xpeng-xngp', 'xngp-5.6.0', '5.6.0', 'Orin-X', '2026-08-18'),
  ('huawei-ads', 'ads-4.0.1', '4.0.1', 'MDC 810', '2026-08-16'),
  ('li-auto-ad-max', 'ideal-7.2.0', '7.2.0', '双 Orin-X', '2026-08-12'),
  ('nio-nop-plus', 'nio-3.9.5', '3.9.5', 'Adam', '2026-08-09'),
  ('xiaomi-had', 'xiaomi-1.8.0', '1.8.0', 'Thor', '2026-08-06')
) as v(system_slug, slug, version, hardware, released_at)
join public.systems s on s.slug = v.system_slug
on conflict (slug) do update set version = excluded.version, hardware = excluded.hardware, released_at = excluded.released_at;

insert into public.vehicle_models (system_id, slug, name, hardware, trim_name)
select s.id, v.slug, v.name, v.hardware, v.trim_name
from (values
  ('xpeng-xngp', 'xp-p7i-max', 'P7i', 'Orin-X', 'Max 智驾版'),
  ('xpeng-xngp', 'xp-g6-ultra', 'G6', 'Orin-X', 'Ultra'),
  ('huawei-ads', 'huawei-m9-ultra', '问界 M9', 'MDC 810', 'Ultra'),
  ('huawei-ads', 'huawei-r7-max', '智界 R7', 'MDC 810', 'Max'),
  ('li-auto-ad-max', 'ideal-l6-max', '理想 L6', '双 Orin-X', 'Max'),
  ('nio-nop-plus', 'nio-et5t', 'ET5T', 'Adam', '2025 款'),
  ('xiaomi-had', 'xiaomi-su7-max', 'SU7', 'Thor', 'Max')
) as v(system_slug, slug, name, hardware, trim_name)
join public.systems s on s.slug = v.system_slug
on conflict (slug) do update set name = excluded.name, hardware = excluded.hardware, trim_name = excluded.trim_name;

create or replace view public.public_release_stats as
select r.id, r.slug, s.brand, s.name as system_name, r.version, r.hardware,
       r.released_at, r.verification_status,
       coalesce(sum(t.total_km), 0)::numeric as total_km,
       count(distinct t.id)::int as trip_count,
       count(distinct vp.id)::int as vehicle_count,
       count(distinct e.id) filter (where e.event_type in ('critical', 'safety'))::int as safety_event_count,
       case when coalesce(sum(t.total_km), 0) > 0
         then round((count(distinct e.id) filter (where e.event_type in ('critical', 'safety')))::numeric / sum(t.total_km) * 100, 2)
         else 0 end as safety_per_100km,
       case when count(distinct t.id) > 0
         then round(count(distinct t.id) filter (where e.id is null)::numeric / count(distinct t.id) * 100, 0)
         else 0 end as no_event_pct
from public.releases r
join public.systems s on s.id = r.system_id
left join public.trips t on t.release_id = r.id
  and t.published_at is not null and t.verification_status <> 'rejected'
left join public.vehicle_profiles vp on vp.id = t.vehicle_profile_id
left join public.events e on e.trip_id = t.id
group by r.id, r.slug, s.brand, s.name, r.version, r.hardware, r.released_at, r.verification_status;

grant select on public.public_release_stats to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('trip-evidence', 'trip-evidence', false)
on conflict (id) do update set public = false;

create policy "authors upload own trip evidence" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'trip-evidence'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "authors read own trip evidence" on storage.objects
for select to authenticated
using (
  bucket_id = 'trip-evidence'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "public can read published trips" on public.trips
for select to anon, authenticated
using (published_at is not null and verification_status <> 'rejected');

create policy "public can read published events" on public.events
for select to anon, authenticated
using (exists (
  select 1 from public.trips t
  where t.id = trip_id and t.published_at is not null and t.verification_status <> 'rejected'
));

create policy "public can read published evidence counts" on public.evidence
for select to anon, authenticated
using (exists (
  select 1 from public.trips t
  where t.id = trip_id and t.published_at is not null and t.verification_status <> 'rejected'
));

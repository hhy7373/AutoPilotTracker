-- AutoPilotLog / 智驾日记 v0.2.1 security and public-view fix
-- Public views must not join vehicle_profiles, which contains VIN hashes.

alter table public.trips
  add column if not exists vehicle_model_id uuid references public.vehicle_models(id);

update public.trips t
set vehicle_model_id = vm.id
from public.vehicle_profiles vp
join public.vehicle_models vm on vm.id = vp.vehicle_model_id
where t.vehicle_profile_id = vp.id and t.vehicle_model_id is null;

create index if not exists trips_vehicle_model_id_idx on public.trips(vehicle_model_id);

create or replace view public.public_trips as
select t.id, t.release_id, s.brand, s.name as system_name, r.version, r.hardware,
       vm.name as vehicle_model, vm.trim_name, t.trip_date, t.total_km,
       t.road_type, t.source, t.evidence_level, t.verification_status,
       count(distinct e.id)::int as event_count,
       0::int as evidence_count
from public.trips t
join public.releases r on r.id = t.release_id
join public.systems s on s.id = r.system_id
join public.vehicle_models vm on vm.id = t.vehicle_model_id
left join public.events e on e.trip_id = t.id
where t.verification_status <> 'rejected' and t.published_at is not null
group by t.id, s.brand, s.name, r.version, r.hardware, vm.name, vm.trim_name;

create or replace view public.public_release_stats as
select r.id, r.slug, s.brand, s.name as system_name, r.version, r.hardware,
       r.released_at, r.verification_status,
       coalesce(sum(t.total_km), 0)::numeric as total_km,
       count(distinct t.id)::int as trip_count,
       count(distinct t.vehicle_model_id)::int as vehicle_count,
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
left join public.events e on e.trip_id = t.id
group by r.id, r.slug, s.brand, s.name, r.version, r.hardware, r.released_at, r.verification_status;

grant select on public.public_trips to anon, authenticated;
grant select on public.public_release_stats to anon, authenticated;

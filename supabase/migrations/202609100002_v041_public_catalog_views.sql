-- AutoPilotLog v0.4.1 public catalog boundary.
-- Only reviewed/published records with a reviewed/published primary source
-- participate in public version statistics.

drop view if exists public.public_trip_event_summary;
drop view if exists public.public_trips;
drop view if exists public.public_release_stats;

create view public.public_trips as
select t.id, t.release_id, s.brand, s.name as system_name, r.version, r.hardware,
       t.vehicle_model_id, vm.name as vehicle_model, vm.trim_name,
       t.trip_date, t.total_km, t.road_type, t.source, t.evidence_level,
       t.verification_status,
       count(distinct e.id)::int as event_count,
       coalesce(array_agg(distinct e.event_type) filter (where e.id is not null), '{}')::text[] as event_types,
       count(distinct ev.id)::int as evidence_count
from public.trips t
join public.releases r on r.id = t.release_id
join public.systems s on s.id = r.system_id
join public.vehicle_models vm on vm.id = t.vehicle_model_id
left join public.events e on e.trip_id = t.id
left join public.evidence ev on ev.trip_id = t.id
where t.verification_status <> 'rejected'
  and t.published_at is not null
  and t.is_test = false
  and exists (
    select 1 from public.system_vehicle_compatibility c
    where c.system_id = r.system_id
      and c.vehicle_model_id = t.vehicle_model_id
      and (c.release_id = t.release_id or c.release_id is null)
      and c.verification_status in ('reviewed', 'published')
  )
group by t.id, s.brand, s.name, r.version, r.hardware, vm.name, vm.trim_name;

create view public.public_trip_event_summary as
select e.trip_id, e.event_type, e.scene, count(*)::int as event_count
from public.events e
join public.trips t on t.id = e.trip_id
where t.verification_status <> 'rejected'
  and t.published_at is not null
  and t.is_test = false
group by e.trip_id, e.event_type, e.scene;

create view public.public_release_stats as
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
join public.catalog_sources rs on rs.id = r.primary_source_id
join public.catalog_sources ss on ss.id = s.primary_source_id
left join public.trips t on t.release_id = r.id
  and t.published_at is not null
  and t.verification_status <> 'rejected'
  and t.is_test = false
left join public.events e on e.trip_id = t.id
where r.verification_status = 'verified'
  and r.catalog_status in ('reviewed', 'published')
  and s.catalog_status in ('reviewed', 'published')
  and rs.verification_status in ('reviewed', 'published')
  and ss.verification_status in ('reviewed', 'published')
  and (t.id is null or exists (
    select 1 from public.system_vehicle_compatibility c
    where c.system_id = r.system_id
      and c.vehicle_model_id = t.vehicle_model_id
      and (c.release_id = t.release_id or c.release_id is null)
      and c.verification_status in ('reviewed', 'published')
  ))
group by r.id, r.slug, s.brand, s.name, r.version, r.hardware, r.released_at, r.verification_status;

alter view public.public_release_stats set (security_invoker = true);
alter view public.public_trips set (security_invoker = true);
alter view public.public_trip_event_summary set (security_invoker = true);
grant select on public.public_trips to anon, authenticated;
grant select on public.public_trip_event_summary to anon, authenticated;
grant select on public.public_release_stats to anon, authenticated;

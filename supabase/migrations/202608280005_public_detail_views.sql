-- AutoPilotLog / 智驾日记 v0.2.3 public detail views
-- Only expose published, non-rejected trips and aggregate event/evidence data.

drop view if exists public.public_trips;

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
where t.verification_status <> 'rejected' and t.published_at is not null
group by t.id, s.brand, s.name, r.version, r.hardware, vm.name, vm.trim_name;

create or replace view public.public_trip_event_summary as
select e.trip_id, e.event_type, e.scene, count(*)::int as event_count
from public.events e
join public.trips t on t.id = e.trip_id
where t.verification_status <> 'rejected' and t.published_at is not null
group by e.trip_id, e.event_type, e.scene;

alter view public.public_trips set (security_invoker = true);
alter view public.public_trip_event_summary set (security_invoker = true);

grant select on public.public_trips to anon, authenticated;
grant select on public.public_trip_event_summary to anon, authenticated;

-- AutoPilotLog v0.4.1
-- Source traceability, system/vehicle compatibility and administrator evidence access.
-- This migration intentionally does not publish unverified candidate facts.

alter table public.catalog_sources add column if not exists source_priority integer not null default 3 check (source_priority between 1 and 3);
alter table public.catalog_sources add column if not exists conflict_note text;
alter table public.catalog_sources add column if not exists verified_by text;
alter table public.systems add column if not exists verification_note text;
alter table public.releases add column if not exists verification_note text;
alter table public.vehicle_models add column if not exists verification_note text;

create table if not exists public.system_vehicle_compatibility (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems(id) on delete cascade,
  vehicle_model_id uuid not null references public.vehicle_models(id) on delete cascade,
  release_id uuid references public.releases(id) on delete set null,
  hardware text,
  source_id uuid references public.catalog_sources(id),
  verification_status text not null default 'draft' check (verification_status in ('draft', 'reviewed', 'published', 'retired')),
  verified_at date,
  verified_by text,
  verification_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (system_id, vehicle_model_id, release_id)
);

insert into public.catalog_sources (source_type, title, url, excerpt, verification_status, source_priority)
select 'official', v.title, v.url, '官方入口记录；具体版本、车型和配置须由管理员打开原文逐条核验后再发布。', 'draft', 1
from (values
  ('华为乾崑智能汽车解决方案官网', 'https://auto.huawei.com/'),
  ('小鹏汽车官网', 'https://www.xiaopeng.com/'),
  ('理想汽车官网', 'https://www.lixiang.com/'),
  ('蔚来汽车官网', 'https://www.nio.cn/'),
  ('小米汽车官网', 'https://www.xiaomiev.com/'),
  ('地平线官网', 'https://www.horizon.cc/'),
  ('卓驭官网', 'https://www.driving-x.com/'),
  ('元戎启行官网', 'https://www.deeproute.ai/'),
  ('文远知行官网', 'https://www.weride.ai/')
) v(title, url)
where not exists (select 1 from public.catalog_sources s where s.url = v.url);

alter table public.system_vehicle_compatibility enable row level security;
create policy "public can read reviewed compatibilities" on public.system_vehicle_compatibility
  for select to anon, authenticated using (verification_status in ('reviewed', 'published'));
create policy "admins manage compatibilities" on public.system_vehicle_compatibility
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
grant select on public.system_vehicle_compatibility to anon, authenticated;

create policy "admins read trip evidence objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-evidence' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index if not exists system_vehicle_compatibility_status_idx
  on public.system_vehicle_compatibility (verification_status, system_id, vehicle_model_id);

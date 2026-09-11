-- AutoPilotLog v0.4.1
-- Source traceability, system/vehicle compatibility and administrator evidence access.
-- This migration intentionally does not publish unverified candidate facts.

alter table public.catalog_sources add column if not exists source_priority integer not null default 3 check (source_priority between 1 and 3);
alter table public.catalog_sources add column if not exists conflict_note text;
alter table public.catalog_sources add column if not exists verified_by text;
alter table public.systems add column if not exists verification_note text;
alter table public.releases add column if not exists verification_note text;
alter table public.vehicle_models add column if not exists verification_note text;
alter table public.vehicle_models add column if not exists vehicle_brand text;

update public.vehicle_models set vehicle_brand = case
  when slug in ('xp-p7i-max', 'xp-g6-ultra') then '小鹏'
  when slug in ('huawei-m9-ultra') then '问界'
  when slug in ('huawei-r7-max') then '智界'
  when slug in ('ideal-l6-max') then '理想'
  when slug in ('nio-et5t') then '蔚来'
  when slug in ('xiaomi-su7-max') then '小米'
  else vehicle_brand end
where vehicle_brand is null;

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
select 'official', v.title, v.url, v.excerpt, v.verification_status, 1
from (values
  ('华为乾崑 ADS 官方功能页', 'https://auto.huawei.com/cn/ads', '官方页面明确展示“乾崑智驾 ADS”及其辅助驾驶定位；具体 OTA、车型和配置仍需分别核验。', 'reviewed'),
  ('小鹏汽车官方首页', 'https://www.xiaopeng.com/', '官方首页展示小鹏车型及第二代 VLA 信息；XNGP 历史版本需使用对应官方公告，不以首页替代。', 'reviewed'),
  ('小鹏 P7 官方车型页', 'https://www.xiaopeng.com/p7n.html', '官方车型页明确展示 P7 搭载第二代 VLA。', 'reviewed'),
  ('小鹏 G6 2026 官方车型页', 'https://www.xiaopeng.com/g6_2026.html', '官方车型页明确展示 2026 款 G6、图灵 AI 芯片和第二代 VLA。', 'reviewed'),
  ('理想 L6 官方车型页', 'https://www.lixiang.com/L6', '官方车型页展示 L6 的马赫 M100 芯片、马赫 VLA 和车型配置内容。', 'reviewed'),
  ('蔚来智能辅助驾驶官方页面', 'https://www.nio.cn/ad', '官方页面明确展示全域领航辅助 NOP+，并说明其仍属于辅助驾驶。', 'reviewed'),
  ('蔚来 ET5T 官方车型页', 'https://www.nio.cn/et5t', '官方车型入口用于核验 ET5T 车型身份；智驾硬件需以具体配置资料继续核验。', 'reviewed'),
  ('小米 SU7 官方车型页', 'https://www.xiaomiev.com/su7', '官方车型页明确展示 Xiaomi HAD 小米辅助驾驶。', 'reviewed'),
  ('地平线官网入口', 'https://www.horizon.cc/', '官网入口已登记；当前环境无法稳定建立 TLS，产品/车型搭载关系暂不发布。', 'draft'),
  ('卓驭官网入口', 'https://www.driving-x.com/', '官网入口已登记；当前环境无法稳定建立 TLS，产品/车型搭载关系暂不发布。', 'draft'),
  ('元戎启行官网', 'https://www.deeproute.ai/', '官方首页展示自动驾驶产品，但未作为车企 OTA 版本发布。', 'reviewed'),
  ('文远知行官网', 'https://www.weride.ai/', '官方首页展示 Robotaxi、Robobus、WRD 3.0 等产品；不等同于乘用车 OTA。', 'reviewed')
) v(title, url, excerpt, verification_status)
where not exists (select 1 from public.catalog_sources s where s.url = v.url);

update public.catalog_sources
set checked_at = current_date, checked_by = 'AutoPilotLog research', verified_by = case when verification_status in ('reviewed', 'published') then 'AutoPilotLog research' else null end
where checked_by is null;

update public.systems s set primary_source_id = cs.id, verification_note = case s.slug
  when 'huawei-ads' then '官方页核验到乾崑智驾 ADS；具体 OTA 与车型搭载关系仍需单独来源。'
  when 'xpeng-xngp' then '官网当前展示第二代 VLA；XNGP 作为历史系统标签保留，具体版本需历史公告。'
  when 'li-auto-ad-max' then '官方 L6 页面核验到马赫 VLA/智驾能力；AD Pro/Max 配置关系需单独来源。'
  when 'nio-nop-plus' then '官方智能驾驶页核验到 NOP+，并明确其为辅助驾驶。'
  when 'xiaomi-had' then '官方 SU7 页面核验到 Xiaomi HAD；具体软件版本需官方 OTA 来源。'
  else verification_note end
from public.catalog_sources cs
where cs.verification_status in ('reviewed', 'published')
  and cs.url in ('https://auto.huawei.com/cn/ads', 'https://www.xiaopeng.com/', 'https://www.lixiang.com/L6', 'https://www.nio.cn/ad', 'https://www.xiaomiev.com/su7')
  and ((s.slug = 'huawei-ads' and cs.url = 'https://auto.huawei.com/cn/ads')
    or (s.slug = 'xpeng-xngp' and cs.url = 'https://www.xiaopeng.com/')
    or (s.slug = 'li-auto-ad-max' and cs.url = 'https://www.lixiang.com/L6')
    or (s.slug = 'nio-nop-plus' and cs.url = 'https://www.nio.cn/ad')
    or (s.slug = 'xiaomi-had' and cs.url = 'https://www.xiaomiev.com/su7'));

alter table public.system_vehicle_compatibility enable row level security;
drop policy if exists "public can read reviewed compatibilities" on public.system_vehicle_compatibility;
create policy "public can read reviewed compatibilities" on public.system_vehicle_compatibility
  for select to anon, authenticated using (verification_status in ('reviewed', 'published'));
drop policy if exists "admins manage compatibilities" on public.system_vehicle_compatibility;
create policy "admins manage compatibilities" on public.system_vehicle_compatibility
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
grant select on public.system_vehicle_compatibility to anon, authenticated;

-- Replace the v0.2 policies that exposed every catalog row, including drafts.
-- The API also filters these tables, but RLS must enforce the same boundary for
-- direct Supabase REST clients.
drop policy if exists "public can read systems" on public.systems;
drop policy if exists "public can read releases" on public.releases;
drop policy if exists "public can read vehicle models" on public.vehicle_models;
drop policy if exists "public can read verified systems" on public.systems;
drop policy if exists "public can read verified releases" on public.releases;
drop policy if exists "public can read verified vehicle models" on public.vehicle_models;

create policy "public can read verified systems" on public.systems
  for select to anon, authenticated
  using (
    catalog_status in ('reviewed', 'published')
    and primary_source_id is not null
    and exists (
      select 1 from public.catalog_sources cs
      where cs.id = systems.primary_source_id
        and cs.verification_status in ('reviewed', 'published')
    )
  );

create policy "public can read verified releases" on public.releases
  for select to anon, authenticated
  using (
    verification_status = 'verified'
    and catalog_status in ('reviewed', 'published')
    and primary_source_id is not null
    and exists (
      select 1 from public.catalog_sources cs
      where cs.id = releases.primary_source_id
        and cs.verification_status in ('reviewed', 'published')
    )
    and exists (
      select 1 from public.systems s
      where s.id = releases.system_id
        and s.catalog_status in ('reviewed', 'published')
        and s.primary_source_id is not null
    )
  );

create policy "public can read verified vehicle models" on public.vehicle_models
  for select to anon, authenticated
  using (
    catalog_status in ('reviewed', 'published')
    and primary_source_id is not null
    and exists (
      select 1 from public.catalog_sources cs
      where cs.id = vehicle_models.primary_source_id
        and cs.verification_status in ('reviewed', 'published')
    )
    and exists (
      select 1 from public.systems s
      where s.id = vehicle_models.system_id
        and s.catalog_status in ('reviewed', 'published')
        and s.primary_source_id is not null
    )
  );

-- Seed draft compatibility rows for the existing catalog. They are useful to
-- the administrator immediately, but cannot enter public selections until a
-- source is verified and the row is promoted.
insert into public.system_vehicle_compatibility
  (system_id, vehicle_model_id, release_id, hardware, source_id, verification_status, verification_note)
select vm.system_id, vm.id, r.id, coalesce(vm.hardware, r.hardware),
       coalesce(vm.primary_source_id, r.primary_source_id), 'draft',
       '待管理员核验系统、车型、硬件与版本搭载关系。'
from public.vehicle_models vm
left join public.releases r on r.system_id = vm.system_id
where not exists (
  select 1 from public.system_vehicle_compatibility c
  where c.system_id = vm.system_id
    and c.vehicle_model_id = vm.id
    and c.release_id is not distinct from r.id
);

-- The API reads evidence for the private administrator review screen. This
-- policy does not expose evidence to anonymous users or non-admin users.
drop policy if exists "admins read all trip evidence" on public.evidence;
create policy "admins read all trip evidence" on public.evidence
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
grant select on public.evidence to authenticated;

drop policy if exists "admins read trip evidence objects" on storage.objects;
create policy "admins read trip evidence objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-evidence' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index if not exists system_vehicle_compatibility_status_idx
  on public.system_vehicle_compatibility (verification_status, system_id, vehicle_model_id);

-- Do not promote seeded OTA/configuration claims without an exact source URL.
-- The official landing pages prove the system/provider exists, but do not by
-- themselves prove a specific release date, hardware mapping, or trim.
update public.releases
set catalog_status = 'draft', verification_note = coalesce(verification_note, '待补充具体官方 OTA/公告 URL、发布日期与硬件适配原文。')
where primary_source_id is null;

update public.vehicle_models
set catalog_status = 'draft', verification_note = coalesce(verification_note, '待补充具体官方车型/配置 URL 与智驾硬件适配原文。')
where primary_source_id is null;

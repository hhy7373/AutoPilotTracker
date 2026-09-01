-- AutoPilotLog v0.3 catalog governance
-- Adds provider classification and human-verifiable source evidence.

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  provider_type text not null check (provider_type in ('oem', 'technology_provider')),
  website text,
  catalog_status text not null default 'draft' check (catalog_status in ('draft', 'reviewed', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('official', 'automotive_media', 'manual')),
  title text not null,
  url text not null,
  published_at date,
  checked_at date not null default current_date,
  excerpt text,
  checked_by text,
  verification_status text not null default 'draft' check (verification_status in ('draft', 'reviewed', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_change_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  source_id uuid references public.catalog_sources(id),
  before_data jsonb,
  after_data jsonb,
  changed_by text,
  change_reason text not null,
  created_at timestamptz not null default now()
);

alter table public.systems add column if not exists provider_id uuid references public.providers(id);
alter table public.systems add column if not exists system_kind text not null default 'oem' check (system_kind in ('oem', 'technology_solution'));
alter table public.systems add column if not exists catalog_status text not null default 'draft' check (catalog_status in ('draft', 'reviewed', 'published', 'retired'));
alter table public.systems add column if not exists primary_source_id uuid references public.catalog_sources(id);
alter table public.systems add column if not exists verified_at date;

alter table public.releases add column if not exists release_type text not null default 'ota' check (release_type in ('ota', 'vehicle_software', 'technology_platform', 'solution'));
alter table public.releases add column if not exists catalog_status text not null default 'draft' check (catalog_status in ('draft', 'reviewed', 'published', 'retired'));
alter table public.releases add column if not exists primary_source_id uuid references public.catalog_sources(id);
alter table public.releases add column if not exists verified_at date;

alter table public.vehicle_models add column if not exists model_year text;
alter table public.vehicle_models add column if not exists catalog_status text not null default 'draft' check (catalog_status in ('draft', 'reviewed', 'published', 'retired'));
alter table public.vehicle_models add column if not exists primary_source_id uuid references public.catalog_sources(id);
alter table public.vehicle_models add column if not exists verified_at date;

insert into public.providers (slug, name, provider_type, website, catalog_status) values
  ('huawei', '华为', 'oem', 'https://auto.huawei.com/', 'reviewed'),
  ('xpeng', '小鹏', 'oem', 'https://www.xiaopeng.com/', 'reviewed'),
  ('li-auto', '理想', 'oem', 'https://www.lixiang.com/', 'reviewed'),
  ('nio', '蔚来', 'oem', 'https://www.nio.cn/', 'reviewed'),
  ('horizon', '地平线', 'technology_provider', 'https://www.horizon.cc/', 'reviewed'),
  ('zhuoyu', '卓驭', 'technology_provider', 'https://www.driving-x.com/', 'draft'),
  ('deeproute', '元戎启行', 'technology_provider', 'https://www.deeproute.ai/', 'reviewed'),
  ('weride', '文远知行', 'technology_provider', 'https://www.weride.ai/', 'reviewed')
on conflict (slug) do update set name = excluded.name, provider_type = excluded.provider_type, website = excluded.website;

update public.systems s set provider_id = p.id, system_kind = 'oem', catalog_status = 'reviewed', verified_at = current_date
from public.providers p where p.slug = case s.slug
  when 'huawei-ads' then 'huawei'
  when 'xpeng-xngp' then 'xpeng'
  when 'li-auto-ad-max' then 'li-auto'
  when 'nio-nop-plus' then 'nio'
  else null end;

insert into public.systems (brand, name, slug, provider_id, system_kind, catalog_status)
select p.name, v.name, v.slug, p.id, 'technology_solution', v.catalog_status
from (values
  ('horizon', '地平线征程', 'horizon-journey', 'draft'),
  ('zhuoyu', '卓驭智驾方案', 'zhuoyu-driving', 'draft'),
  ('deeproute', '元戎启行智驾方案', 'deeproute-driving', 'draft'),
  ('weride', '文远知行自动驾驶方案', 'weride-driving', 'draft')
) v(provider_slug, name, slug, catalog_status)
join public.providers p on p.slug = v.provider_slug
on conflict (slug) do update set name = excluded.name, provider_id = excluded.provider_id, system_kind = excluded.system_kind;

alter table public.providers enable row level security;
alter table public.catalog_sources enable row level security;
alter table public.catalog_change_logs enable row level security;

create policy "public can read published providers" on public.providers for select to anon, authenticated using (catalog_status in ('reviewed', 'published'));
create policy "public can read verified catalog sources" on public.catalog_sources for select to anon, authenticated using (verification_status in ('reviewed', 'published'));

grant select on public.providers to anon, authenticated;
grant select on public.catalog_sources to anon, authenticated;

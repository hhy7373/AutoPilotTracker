-- AutoPilotLog v0.3.2 catalog review state
-- Publish only the seeded, previously verified OEM catalog records.
-- Technology-provider records remain draft until their sources are manually checked.

insert into public.providers (slug, name, provider_type, website, catalog_status)
values ('xiaomi', '小米', 'oem', 'https://www.xiaomiev.com/', 'reviewed')
on conflict (slug) do update set
  name = excluded.name,
  provider_type = excluded.provider_type,
  website = excluded.website,
  catalog_status = 'reviewed';

update public.systems s
set provider_id = p.id,
    system_kind = 'oem',
    catalog_status = 'reviewed',
    verified_at = current_date
from public.providers p
where s.slug = 'xiaomi-had'
  and p.slug = 'xiaomi';

update public.releases r
set catalog_status = 'reviewed',
    verified_at = current_date
from public.systems s
where r.system_id = s.id
  and s.catalog_status in ('reviewed', 'published')
  and r.verification_status = 'verified';

update public.vehicle_models vm
set catalog_status = 'reviewed',
    verified_at = current_date
from public.systems s
where vm.system_id = s.id
  and s.catalog_status in ('reviewed', 'published');

-- AutoPilotLog v0.4.1: official catalog evidence
-- Run after 202609100001_v041_catalog_review_and_admin.sql and before
-- 202609100002_v041_public_catalog_views.sql.
--
-- Every reviewed row below is limited to facts directly visible on an
-- official page opened by the researcher. The old sample OTA rows remain
-- unverified/draft because no exact official OTA announcement was found.

insert into public.catalog_sources
  (source_type, title, url, excerpt, verification_status, source_priority,
   checked_by, verified_by, checked_at)
select v.source_type, v.title, v.url, v.excerpt, 'reviewed', 1,
       'AutoPilotLog research', 'AutoPilotLog research', current_date
from (values
  ('official', '华为乾崑智驾 ADS 4 官方发布新闻',
   'https://auto.huawei.com/cn/news/2025/huawei-qiankun-intelligent-technology-launch/',
   '官方新闻写明 2025 年 4 月 22 日正式发布乾崑智驾 ADS 4，并介绍 WEWA 架构和车端传感器方案。'),
  ('official', '小鹏 P7 官方车型页', 'https://www.xiaopeng.com/p7n.html',
   '官方车型页写明 P7 搭载第二代 VLA、最高三颗图灵 AI 芯片和 2250TOPS 有效算力。'),
  ('official', '小鹏 G6 2026 官方车型页', 'https://www.xiaopeng.com/g6_2026.html',
   '官方车型页写明 2026 款 G6 搭载三颗图灵 AI 芯片、2250TOPS 和第二代 VLA。'),
  ('official', '理想 L6 官方车型页', 'https://www.lixiang.com/L6',
   '官方车型页用于核验 L6 车型及马赫 M100、马赫 VLA 产品信息。'),
  ('official', '蔚来智能辅助驾驶官方页面', 'https://www.nio.cn/ad',
   '官方页面明确展示全域领航辅助 NOP+，并说明其属于辅助驾驶。'),
  ('official', '蔚来 ET5T 官方车型页', 'https://www.nio.cn/et5t',
   '官方车型页展示 ET5T、NOP+、Cedar S AQUILA 超感系统和 Cedar S ADAM 中央计算平台。'),
  ('official', '小米 SU7 官方车型页', 'https://www.xiaomiev.com/su7',
   '官方车型页写明 Xiaomi HAD、全系激光雷达、4D 毫米波雷达和 700TOPS 辅助驾驶算力。'),
  ('official', '文远知行 WRD 3.0 官方产品入口', 'https://www.weride.ai/',
   '官方首页列出 WRD 3.0 One-Stage End-to-End ADAS；该记录作为技术方案版本，不作为车企 OTA。')
) v(source_type, title, url, excerpt)
where not exists (select 1 from public.catalog_sources s where s.url = v.url);

-- Publish system identity only where an official source establishes the
-- system/product exists. This does not publish an OTA build number.
update public.systems s
set catalog_status = 'reviewed', verified_at = current_date,
    primary_source_id = (select cs.id from public.catalog_sources cs where cs.url = v.url limit 1),
    verification_note = v.note
from (values
  ('huawei-ads', 'https://auto.huawei.com/cn/news/2025/huawei-qiankun-intelligent-technology-launch/', '官方新闻直接证明乾崑智驾 ADS 4 发布；小版本和逐车型搭载关系仍需分别核验。'),
  ('xpeng-xngp', 'https://www.xiaopeng.com/p7n.html', '官方 P7 页面直接证明第二代 VLA 与图灵芯片方案；历史 XNGP OTA 版本仍不以此页面替代。'),
  ('li-auto-ad-max', 'https://www.lixiang.com/L6', '官方 L6 页面直接证明马赫 VLA/M100 产品信息；AD Pro/Max 配置映射仍需逐配置来源。'),
  ('nio-nop-plus', 'https://www.nio.cn/ad', '官方智能驾驶页直接证明 NOP+，并明确其为辅助驾驶。'),
  ('xiaomi-had', 'https://www.xiaomiev.com/su7', '官方 SU7 页面直接证明 Xiaomi HAD 与 700TOPS 硬件方案；OTA 构建号仍需单独来源。'),
  ('weride-driving', 'https://www.weride.ai/', '官方首页直接列出 WRD 3.0 ADAS；这是技术方案产品版本，不等同于车企 OTA。')
) v(slug, url, note)
where s.slug = v.slug
  and exists (select 1 from public.catalog_sources cs where cs.url = v.url and cs.verification_status in ('reviewed', 'published'));

-- Product/solution labels directly visible on official pages. These are not
-- inferred OTA build numbers and therefore use a non-OTA release_type.
insert into public.releases
  (system_id, slug, version, hardware, release_type, released_at,
   verification_status, catalog_status, primary_source_id, verified_at,
   verification_note)
select s.id, v.slug, v.version, v.hardware, v.release_type,
       v.released_at::date, 'verified', 'reviewed', cs.id, current_date, v.note
from (values
  ('huawei-ads', 'huawei-ads-4', 'ADS 4', 'WEWA 架构；高精度固态激光雷达方案', 'technology_platform', '2025-04-22', '官方发布新闻直接证明 ADS 4；硬件描述仅限新闻明确内容。', 'https://auto.huawei.com/cn/news/2025/huawei-qiankun-intelligent-technology-launch/'),
  ('xpeng-xngp', 'xpeng-vla-2', '第二代 VLA', '图灵 AI 芯片×3；2250TOPS', 'technology_platform', null, 'P7/G6 官方车型页直接证明该产品和算力，未推断 OTA 日期。', 'https://www.xiaopeng.com/p7n.html'),
  ('li-auto-ad-max', 'li-mahe-vla', '马赫 VLA', '马赫 M100', 'technology_platform', null, 'L6 官方车型页直接展示马赫 VLA/M100，未推断 OTA 日期。', 'https://www.lixiang.com/L6'),
  ('nio-nop-plus', 'nio-nop-plus-official', 'NOP+', 'Cedar S AQUILA；Cedar S ADAM', 'technology_platform', null, 'ET5T 官方车型页直接展示 NOP+ 与相关硬件平台，未推断 OTA 日期。', 'https://www.nio.cn/et5t'),
  ('xiaomi-had', 'xiaomi-had-official', 'Xiaomi HAD', '激光雷达；4D 毫米波雷达；700TOPS', 'technology_platform', null, 'SU7 官方车型页直接展示 Xiaomi HAD 与硬件，未推断 OTA 日期。', 'https://www.xiaomiev.com/su7'),
  ('weride-driving', 'weride-wrd-3', 'WRD 3.0', '官方未披露', 'solution', null, '文远知行官网直接列出 WRD 3.0 ADAS；不等同于乘用车 OTA。', 'https://www.weride.ai/')
) v(system_slug, slug, version, hardware, release_type, released_at, note, source_url)
join public.systems s on s.slug = v.system_slug
join public.catalog_sources cs on cs.url = v.source_url
where cs.verification_status in ('reviewed', 'published')
  and not exists (select 1 from public.releases r where r.slug = v.slug);

-- Add model-level records where the official page establishes the model and
-- hardware. The page does not establish every trim's exact mapping, so the
-- published row deliberately leaves trim_name NULL. Existing Max/Ultra/year
-- sample rows remain draft until a configuration-specific source is attached.
insert into public.vehicle_models
  (system_id, slug, name, hardware, trim_name, model_year, vehicle_brand,
   catalog_status, primary_source_id, verified_at, verification_note)
select s.id, v.slug, v.name, v.hardware, null, v.model_year, v.vehicle_brand,
       'reviewed', cs.id, current_date, v.note
from (values
  ('xpeng-xngp', 'xp-p7-official', 'P7', '小鹏', '图灵 AI 芯片×3；2250TOPS', null, '官方 P7 页面直接展示车型、第二代 VLA 和图灵硬件。', 'https://www.xiaopeng.com/p7n.html'),
  ('xpeng-xngp', 'xp-g6-2026-official', 'G6', '小鹏', '图灵 AI 芯片×3；2250TOPS', '2026', '2026 款 G6 官方页直接展示车型、第二代 VLA 和图灵硬件。', 'https://www.xiaopeng.com/g6_2026.html'),
  ('li-auto-ad-max', 'ideal-l6-official', '理想 L6', '理想', '马赫 M100；马赫 VLA', null, 'L6 官方页直接展示车型和马赫产品信息。', 'https://www.lixiang.com/L6'),
  ('nio-nop-plus', 'nio-et5t-official', 'ET5T', '蔚来', 'Cedar S AQUILA；Cedar S ADAM', null, 'ET5T 官方页直接展示车型、NOP+ 和相关硬件平台。', 'https://www.nio.cn/et5t'),
  ('xiaomi-had', 'xiaomi-su7-official', 'SU7', '小米', '激光雷达；4D 毫米波雷达；700TOPS', null, 'SU7 官方页直接展示车型、Xiaomi HAD 和辅助驾驶硬件。', 'https://www.xiaomiev.com/su7')
) v(system_slug, slug, name, vehicle_brand, hardware, model_year, note, source_url)
join public.catalog_sources cs on cs.url = v.source_url
join public.systems s on s.slug = v.system_slug
where cs.verification_status in ('reviewed', 'published')
  and not exists (select 1 from public.vehicle_models existing where existing.slug = v.slug);

-- Only create relationships that are directly supported by the same official
-- model page. No relationship is created for the old sample OTA rows.
insert into public.system_vehicle_compatibility
  (system_id, vehicle_model_id, release_id, hardware, source_id,
   verification_status, verified_at, verified_by, verification_note)
select s.id, vm.id, r.id, v.hardware, cs.id, 'reviewed', current_date,
       'AutoPilotLog research', v.note
from (values
  ('xpeng-xngp', 'xp-p7-official', 'xpeng-vla-2', '图灵 AI 芯片×3；2250TOPS', 'https://www.xiaopeng.com/p7n.html', 'P7 官方页同时证明车型、第二代 VLA 和图灵硬件。'),
  ('xpeng-xngp', 'xp-g6-2026-official', 'xpeng-vla-2', '图灵 AI 芯片×3；2250TOPS', 'https://www.xiaopeng.com/g6_2026.html', '2026 款 G6 官方页同时证明车型、第二代 VLA 和图灵硬件。'),
  ('li-auto-ad-max', 'ideal-l6-official', 'li-mahe-vla', '马赫 M100；马赫 VLA', 'https://www.lixiang.com/L6', 'L6 官方页同时证明车型和马赫产品信息。'),
  ('nio-nop-plus', 'nio-et5t-official', 'nio-nop-plus-official', 'Cedar S AQUILA；Cedar S ADAM', 'https://www.nio.cn/et5t', 'ET5T 官方页同时证明车型、NOP+ 和相关硬件平台。'),
  ('xiaomi-had', 'xiaomi-su7-official', 'xiaomi-had-official', '激光雷达；4D 毫米波雷达；700TOPS', 'https://www.xiaomiev.com/su7', 'SU7 官方页同时证明车型、Xiaomi HAD 和辅助驾驶硬件。')
) v(system_slug, vehicle_slug, release_slug, hardware, source_url, note)
join public.systems s on s.slug = v.system_slug
join public.vehicle_models vm on vm.slug = v.vehicle_slug
join public.releases r on r.slug = v.release_slug
join public.catalog_sources cs on cs.url = v.source_url
where cs.verification_status in ('reviewed', 'published')
  and not exists (
    select 1 from public.system_vehicle_compatibility c
    where c.system_id = s.id and c.vehicle_model_id = vm.id and c.release_id = r.id
  );

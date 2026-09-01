export const catalogSourceTypes = ['官网', '汽车资讯平台', '人工补充'];
export const catalogStatuses = ['draft', 'reviewed', 'published', 'retired'];

export const catalogSeed = {
  providers: [
    { id: 'huawei', name: '华为', type: '车企/智驾系统', website: 'https://auto.huawei.com/', status: 'reviewed' },
    { id: 'xpeng', name: '小鹏', type: '车企/智驾系统', website: 'https://www.xiaopeng.com/', status: 'reviewed' },
    { id: 'li-auto', name: '理想', type: '车企/智驾系统', website: 'https://www.lixiang.com/', status: 'reviewed' },
    { id: 'nio', name: '蔚来', type: '车企/智驾系统', website: 'https://www.nio.cn/', status: 'reviewed' },
    { id: 'horizon', name: '地平线', type: '技术提供方', website: 'https://www.horizon.cc/', status: 'reviewed' },
    { id: 'zhuoyu', name: '卓驭', type: '技术提供方', website: 'https://www.driving-x.com/', status: 'draft' },
    { id: 'deeproute', name: '元戎启行', type: '技术提供方', website: 'https://www.deeproute.ai/', status: 'reviewed' },
    { id: 'weride', name: '文远知行', type: '技术提供方', website: 'https://www.weride.ai/', status: 'reviewed' }
  ],
  systems: [
    { id: 'huawei-ads', providerId: 'huawei', name: '华为乾崑 ADS', kind: '车企智驾系统', status: 'reviewed', sourceUrl: 'https://auto.huawei.com/', sourceType: '官网', verifiedAt: '2026-09-01', note: '版本与搭载车型需以官方 OTA/车型公告逐条核验。' },
    { id: 'xpeng-xngp', providerId: 'xpeng', name: '小鹏 XNGP', kind: '车企智驾系统', status: 'reviewed', sourceUrl: 'https://www.xiaopeng.com/', sourceType: '官网', verifiedAt: '2026-09-01', note: '版本与搭载车型需以官方 OTA/车型公告逐条核验。' },
    { id: 'li-auto-ad', providerId: 'li-auto', name: '理想 AD', kind: '车企智驾系统', status: 'reviewed', sourceUrl: 'https://www.lixiang.com/', sourceType: '官网', verifiedAt: '2026-09-01', note: '区分 AD Pro、AD Max 等硬件/功能组合。' },
    { id: 'nio-nop', providerId: 'nio', name: '蔚来 NOP+', kind: '车企智驾系统', status: 'reviewed', sourceUrl: 'https://www.nio.cn/', sourceType: '官网', verifiedAt: '2026-09-01', note: '版本与车型适配需以 NIO 官方升级说明核验。' },
    { id: 'horizon-journey', providerId: 'horizon', name: '地平线征程', kind: '技术方案', status: 'draft', sourceUrl: 'https://www.horizon.cc/', sourceType: '官网', verifiedAt: '', note: '技术平台/芯片方案，不作为车主 OTA 版本展示。' },
    { id: 'zhuoyu-driving', providerId: 'zhuoyu', name: '卓驭智驾方案', kind: '技术方案', status: 'draft', sourceUrl: 'https://www.driving-x.com/', sourceType: '官网', verifiedAt: '', note: '方案商信息需与搭载车型和合作车企建立关联。' },
    { id: 'deeproute-driving', providerId: 'deeproute', name: '元戎启行智驾方案', kind: '技术方案', status: 'draft', sourceUrl: 'https://www.deeproute.ai/', sourceType: '官网', verifiedAt: '', note: '方案商信息需与搭载车型和合作车企建立关联。' },
    { id: 'weride-driving', providerId: 'weride', name: '文远知行自动驾驶方案', kind: '技术方案', status: 'draft', sourceUrl: 'https://www.weride.ai/', sourceType: '官网', verifiedAt: '', note: '自动驾驶方案与量产车型搭载关系需单独核验。' }
  ],
  releases: [
    { id: 'huawei-ads-4.0.1', systemId: 'huawei-ads', version: '4.0.1', releaseType: 'OTA/软件版本', hardware: 'MDC 810', date: '2026-08-16', status: 'draft', sourceUrl: 'https://auto.huawei.com/', sourceType: '官网' },
    { id: 'xpeng-xngp-5.6.0', systemId: 'xpeng-xngp', version: '5.6.0', releaseType: 'OTA/软件版本', hardware: 'Orin-X', date: '2026-08-18', status: 'draft', sourceUrl: 'https://www.xiaopeng.com/', sourceType: '官网' },
    { id: 'li-auto-ad-7.2.0', systemId: 'li-auto-ad', version: '7.2.0', releaseType: 'OTA/软件版本', hardware: '双 Orin-X', date: '2026-08-12', status: 'draft', sourceUrl: 'https://www.lixiang.com/', sourceType: '官网' },
    { id: 'nio-nop-3.9.5', systemId: 'nio-nop', version: '3.9.5', releaseType: 'OTA/软件版本', hardware: 'Adam', date: '2026-08-09', status: 'draft', sourceUrl: 'https://www.nio.cn/', sourceType: '官网' },
    { id: 'horizon-journey-6', systemId: 'horizon-journey', version: '征程 6 系列', releaseType: '技术平台版本', hardware: '征程系列芯片', date: '', status: 'draft', sourceUrl: 'https://www.horizon.cc/', sourceType: '官网' },
    { id: 'zhuoyu-current', systemId: 'zhuoyu-driving', version: '待官方核验', releaseType: '方案版本', hardware: '待核验', date: '', status: 'draft', sourceUrl: 'https://www.driving-x.com/', sourceType: '官网' },
    { id: 'deeproute-current', systemId: 'deeproute-driving', version: '待官方核验', releaseType: '方案版本', hardware: '待核验', date: '', status: 'draft', sourceUrl: 'https://www.deeproute.ai/', sourceType: '官网' },
    { id: 'weride-current', systemId: 'weride-driving', version: '待官方核验', releaseType: '方案版本', hardware: '待核验', date: '', status: 'draft', sourceUrl: 'https://www.weride.ai/', sourceType: '官网' }
  ],
  vehicles: [
    { id: 'huawei-m9', systemId: 'huawei-ads', name: '问界 M9', trim: '待逐配置核验', hardware: 'MDC 810', status: 'draft', sourceUrl: 'https://auto.huawei.com/', sourceType: '官网' },
    { id: 'xpeng-p7i', systemId: 'xpeng-xngp', name: '小鹏 P7i', trim: '待逐配置核验', hardware: 'Orin-X', status: 'draft', sourceUrl: 'https://www.xiaopeng.com/', sourceType: '官网' },
    { id: 'li-l6', systemId: 'li-auto-ad', name: '理想 L6', trim: '待逐配置核验', hardware: '双 Orin-X', status: 'draft', sourceUrl: 'https://www.lixiang.com/', sourceType: '官网' },
    { id: 'nio-et5t', systemId: 'nio-nop', name: '蔚来 ET5T', trim: '待逐配置核验', hardware: 'Adam', status: 'draft', sourceUrl: 'https://www.nio.cn/', sourceType: '官网' }
  ]
};

export function readCatalog() {
  try { return JSON.parse(localStorage.getItem('autopilotlog-catalog') || 'null') || catalogSeed; } catch { return catalogSeed; }
}

export function saveCatalog(catalog) {
  localStorage.setItem('autopilotlog-catalog', JSON.stringify(catalog));
}

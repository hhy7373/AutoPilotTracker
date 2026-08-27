import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, BarChart3, Bell, CheckCircle2, ChevronDown, CircleHelp,
  Database, GitCompareArrows, Info, MapPin, Menu, Plus, ShieldCheck,
  SlidersHorizontal, Sparkles, Users, X
} from 'lucide-react';
import './styles.css';

const releases = [
  { id: 'xngp-5.6.0', brand: '小鹏', system: 'XNGP', version: '5.6.0', hardware: 'Orin-X', date: '2026-08-18', km: 18420, trips: 632, cars: 48, safety: 0.42, interventions: 2.64, noEvent: 58, delta: -18, status: 'verified', color: '#e06b4f', scenarios: { 路口: 31, 并线: 24, 施工: 18, 加塞: 15, 其他: 12 } },
  { id: 'ads-4.0.1', brand: '华为 ADS', system: 'ADS', version: '4.0.1', hardware: 'MDC 810', date: '2026-08-16', km: 22680, trips: 791, cars: 61, safety: 0.31, interventions: 1.98, noEvent: 64, delta: -23, status: 'verified', color: '#5c7cfa', scenarios: { 路口: 27, 并线: 29, 施工: 14, 加塞: 17, 其他: 13 } },
  { id: 'ideal-7.2.0', brand: '理想', system: 'AD Max', version: '7.2.0', hardware: '双 Orin-X', date: '2026-08-12', km: 14320, trips: 488, cars: 37, safety: 0.55, interventions: 2.31, noEvent: 61, delta: -9, status: 'reviewed', color: '#d09a38', scenarios: { 路口: 34, 并线: 21, 施工: 16, 加塞: 13, 其他: 16 } },
  { id: 'nio-3.9.5', brand: '蔚来', system: 'NOP+', version: '3.9.5', hardware: 'Adam', date: '2026-08-09', km: 9760, trips: 306, cars: 29, safety: 0.62, interventions: 2.92, noEvent: 53, delta: 4, status: 'reviewed', color: '#9b7bd4', scenarios: { 路口: 29, 并线: 32, 施工: 12, 加塞: 18, 其他: 9 } },
  { id: 'xiaomi-1.8.0', brand: '小米', system: 'HAD', version: '1.8.0', hardware: 'Thor', date: '2026-08-06', km: 8240, trips: 274, cars: 22, safety: 0.48, interventions: 2.18, noEvent: 60, delta: -12, status: 'unverified', color: '#7f8c9a', scenarios: { 路口: 32, 并线: 26, 施工: 15, 加塞: 16, 其他: 11 } }
];

const seedTrips = [
  { id: 1, brand: '华为 ADS', version: '4.0.1', km: 38, road: '城市道路', events: 1, severity: 'Comfort', source: 'manual', date: '2026-08-26' },
  { id: 2, brand: '小鹏', version: '5.6.0', km: 62, road: '高速公路', events: 0, severity: '—', source: 'manual', date: '2026-08-25' },
  { id: 3, brand: '理想', version: '7.2.0', km: 24, road: '城市道路', events: 1, severity: 'Safety', source: 'manual', date: '2026-08-24' }
];

const navItems = [
  { id: 'overview', label: '总览', icon: BarChart3 },
  { id: 'releases', label: '版本追踪', icon: GitCompareArrows },
  { id: 'submit', label: '提交行程', icon: Plus },
  { id: 'method', label: '方法与标准', icon: CircleHelp }
];

function readTrips() {
  try { return JSON.parse(localStorage.getItem('cfsd-trips') || 'null') || seedTrips; } catch { return seedTrips; }
}

function App() {
  const [active, setActive] = useState('overview');
  const [selectedBrand, setSelectedBrand] = useState('全部系统');
  const [selectedRelease, setSelectedRelease] = useState(releases[1]);
  const [trips, setTrips] = useState(readTrips);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');

  const filtered = useMemo(() => selectedBrand === '全部系统' ? releases : releases.filter(r => r.brand === selectedBrand), [selectedBrand]);
  const totals = useMemo(() => {
    const rows = filtered;
    return {
      km: rows.reduce((s, r) => s + r.km, 0),
      trips: rows.reduce((s, r) => s + r.trips, 0),
      cars: rows.reduce((s, r) => s + r.cars, 0),
      safety: rows.reduce((s, r) => s + r.safety * r.km, 0) / Math.max(rows.reduce((s, r) => s + r.km, 0), 1),
      interventions: rows.reduce((s, r) => s + r.interventions * r.km, 0) / Math.max(rows.reduce((s, r) => s + r.km, 0), 1),
      noEvent: Math.round(rows.reduce((s, r) => s + r.noEvent * r.trips, 0) / Math.max(rows.reduce((s, r) => s + r.trips, 0), 1))
    };
  }, [filtered]);

  function navigate(id) { setActive(id); if (id === 'submit') setShowForm(true); }
  function saveTrip(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry = { id: Date.now(), brand: form.get('brand'), version: form.get('version'), km: Number(form.get('km')), road: form.get('road'), events: Number(form.get('events')), severity: form.get('severity'), source: 'manual', date: form.get('date') };
    const next = [entry, ...trips];
    setTrips(next); localStorage.setItem('cfsd-trips', JSON.stringify(next));
    setShowForm(false); setActive('overview'); setNotice('行程已保存到本机演示数据');
    window.setTimeout(() => setNotice(''), 3200);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark"><Sparkles size={17} /></div><div><strong>智驾观测站</strong><span>CHINA FSD TRACKER</span></div></div>
      <div className="workspace-pill"><span className="live-dot" /> 社区公开数据库 <ChevronDown size={14} /></div>
      <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === 'releases' && <small>5</small>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="trust-mini"><ShieldCheck size={17} /><div><b>数据透明</b><span>方法公开 · 样本可审计</span></div></div><button className="user-chip"><div className="avatar">访</div><span>访客模式</span><ChevronDown size={14} /></button></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="mobile-menu"><Menu size={20} /></div><div className="breadcrumb">社区数据库 <span>/</span> {navItems.find(n => n.id === active)?.label}</div><div className="top-actions"><span className="last-update"><span className="live-dot" /> 数据更新于 08-27 09:00</span><button className="icon-btn"><Bell size={18} /></button><button className="submit-btn" onClick={() => setShowForm(true)}><Plus size={17} /> 提交一次行程</button></div></header>
      <div className="page-body">
        {active === 'overview' && <Overview filtered={filtered} totals={totals} trips={trips} selectedBrand={selectedBrand} setSelectedBrand={setSelectedBrand} setSelectedRelease={setSelectedRelease} setActive={setActive} setShowForm={setShowForm} />}
        {active === 'releases' && <Releases filtered={filtered} selectedBrand={selectedBrand} setSelectedBrand={setSelectedBrand} setSelectedRelease={setSelectedRelease} />}
        {active === 'method' && <Method />}
      </div>
    </main>

    {showForm && <TripModal onClose={() => setShowForm(false)} onSubmit={saveTrip} />}
    {notice && <div className="toast"><CheckCircle2 size={17} /> {notice}</div>}
  </div>;
}

function Overview({ filtered, totals, trips, selectedBrand, setSelectedBrand, setSelectedRelease, setActive, setShowForm }) {
  return <>
    <section className="hero"><div><div className="eyebrow"><span className="eyebrow-line" /> COMMUNITY INTELLIGENCE</div><h1>看见每一次<br /><em>智驾进化</em></h1><p>真实车主的道路数据，追踪中国智能驾驶系统的版本变化。</p></div><div className="hero-art"><div className="orbit orbit-1" /><div className="orbit orbit-2" /><div className="radar"><span /><span /><span /><span /></div><div className="art-caption">LIVE<br /><b>DATA</b></div></div></section>
    <div className="filter-row"><div className="filter-label"><SlidersHorizontal size={16} /> 观察范围</div><div className="segmented">{['全部系统', '小鹏', '华为 ADS', '理想', '蔚来', '小米'].map(b => <button key={b} onClick={() => setSelectedBrand(b)} className={selectedBrand === b ? 'selected' : ''}>{b}</button>)}</div><button className="filter-more">更多筛选 <ChevronDown size={15} /></button></div>
    <div className="metric-grid">
      <Metric label="社区累计里程" value={totals.km.toLocaleString()} unit="km" note="+12.8% 较上周" positive icon={<MapPin size={17} />} />
      <Metric label="有效行程" value={totals.trips.toLocaleString()} unit="次" note={`${totals.cars} 辆车参与`} icon={<Database size={17} />} />
      <Metric label="安全类干预" value={totals.safety.toFixed(2)} unit="次 / 100 km" note="基于已验证样本" positive icon={<ShieldCheck size={17} />} />
      <Metric label="无事件行程" value={`${totals.noEvent}%`} unit="" note="样本加权比例" positive icon={<CheckCircle2 size={17} />} />
    </div>
    <section className="content-grid"><div className="card timeline-card"><CardHeader title="版本表现追踪" subtitle="安全类干预次数 / 100 km" action="查看全部版本" onClick={() => setActive('releases')} /><div className="chart-wrap"><div className="y-axis"><span>0.8</span><span>0.6</span><span>0.4</span><span>0.2</span><span>0</span></div><div className="bar-chart"><div className="grid-lines"><i /><i /><i /><i /><i /></div>{filtered.map(r => <button className="bar-group" key={r.id} onClick={() => setSelectedRelease(r)}><div className="bar-value">{r.safety.toFixed(2)}</div><div className="bar" style={{ height: `${Math.max(24, r.safety / 0.8 * 155)}px`, background: r.color }} /><span>{r.brand.replace('华为 ADS', '华为').replace('小米', '小米')}</span><small>{r.version}</small></button>)}</div></div><div className="chart-legend"><span><i className="legend-dot current" /> 当前版本</span><span><i className="legend-dot past" /> 历史版本</span><span className="confidence"><Info size={13} /> 仅展示样本量 ≥ 20 辆的版本</span></div></div>
      <div className="card activity-card"><CardHeader title="最近社区动态" subtitle="来自车主的最新记录" action="查看全部" onClick={() => setActive('releases')} /><div className="activity-list">{trips.slice(0, 4).map((t, i) => <div className="activity" key={t.id}><div className={`activity-icon ${i % 2 ? 'orange' : 'blue'}`}>{t.events === 0 ? <CheckCircle2 size={16} /> : <span>!</span>}</div><div className="activity-text"><b>{t.brand} · {t.version}</b><span>{t.events === 0 ? '完成一次无事件行程' : `${t.severity} 类事件 · ${t.road}`}</span></div><time>{t.date.slice(5)}</time></div>)}</div><button className="ghost-wide" onClick={() => setShowForm(true)}>＋ 分享我的一次行程</button></div>
    </section>
    <section className="card release-table-card"><CardHeader title="最新版本" subtitle="按最近数据更新时间排序" action="版本目录" onClick={() => setActive('releases')} /><div className="release-table"><div className="table-head"><span>系统 / 版本</span><span>样本</span><span>安全干预</span><span>无事件行程</span><span>变化</span><span>状态</span></div>{filtered.map(r => <button className="table-row" key={r.id} onClick={() => setSelectedRelease(r)}><span className="release-name"><i style={{ background: r.color }} /><b>{r.brand} <small>{r.system}</small></b><em>{r.version}</em></span><span>{r.cars} 辆车<br /><small>{r.km.toLocaleString()} km</small></span><span><strong>{r.safety.toFixed(2)}</strong> <small>/ 100 km</small></span><span>{r.noEvent}%</span><span className={r.delta <= 0 ? 'good' : 'bad'}>{r.delta > 0 ? '+' : ''}{r.delta}%</span><span><Status status={r.status} /></span></button>)}</div></section>
    <footer className="disclaimer"><Info size={15} /><span>这里的数字来自社区志愿者样本，仅用于观察版本趋势，不代表车企官方安全评级或全体用户表现。</span><a href="#method" onClick={(e) => { e.preventDefault(); setActive('method'); }}>了解数据方法 <ArrowUpRight size={13} /></a></footer>
  </>;
}

function Metric({ label, value, unit, note, positive, icon }) { return <div className="metric-card"><div className="metric-icon">{icon}</div><span className="metric-label">{label}</span><div className="metric-value">{value}<small>{unit}</small></div><span className={positive ? 'metric-note positive' : 'metric-note'}>{positive && '↗ '}{note}</span></div>; }
function CardHeader({ title, subtitle, action, onClick }) { return <div className="card-header"><div><h2>{title}</h2><span>{subtitle}</span></div><button onClick={onClick}>{action} <ArrowUpRight size={14} /></button></div>; }
function Status({ status }) { const map = { verified: ['已验证', 'green'], reviewed: ['已复核', 'yellow'], unverified: ['待验证', 'gray'] }; const [label, cls] = map[status]; return <span className={`status ${cls}`}><i />{label}</span>; }

function Releases({ filtered, selectedBrand, setSelectedBrand, setSelectedRelease }) { return <><section className="subpage-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> RELEASE MONITOR</div><h1>版本追踪</h1><p>按系统、硬件与版本查看社区实测表现。</p></div><button className="outline-btn"><Bell size={16} /> 订阅版本更新</button></section><div className="filter-row releases-filter"><div className="filter-label"><SlidersHorizontal size={16} /> 系统</div><div className="segmented">{['全部系统', '小鹏', '华为 ADS', '理想', '蔚来', '小米'].map(b => <button key={b} onClick={() => setSelectedBrand(b)} className={selectedBrand === b ? 'selected' : ''}>{b}</button>)}</div></div><div className="release-cards">{filtered.map(r => <button className="release-large-card" key={r.id} onClick={() => setSelectedRelease(r)}><div className="release-card-top"><span className="system-dot" style={{ background: r.color }} /><span>{r.brand} <small>{r.system}</small></span><Status status={r.status} /></div><div className="release-version">{r.version}</div><div className="release-meta"><span><b>{r.km.toLocaleString()}</b> km</span><span><b>{r.cars}</b> 辆车</span><span><b>{r.trips}</b> 行程</span></div><div className="mini-progress"><i style={{ width: `${r.noEvent}%`, background: r.color }} /></div><div className="release-card-bottom"><span>无事件行程 <b>{r.noEvent}%</b></span><span className={r.delta <= 0 ? 'good' : 'bad'}>{r.delta <= 0 ? '改善' : '上升'} {Math.abs(r.delta)}%</span></div></button>)}</div><div className="compare-callout"><div className="callout-icon"><GitCompareArrows size={21} /></div><div><b>想比较两个版本？</b><span>我们建议只在同车型、同硬件和相近道路条件下比较。</span></div><button>开始对比 <ArrowUpRight size={15} /></button></div><Method compact /></>; }

function Method({ compact = false }) { return <section className={compact ? 'method-section compact' : 'method-section'}><div className="subpage-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> DATA STANDARD V0.1</div><h1>方法与标准</h1><p>让每一个数字都能被理解、复核和质疑。</p></div></div><div className="method-grid"><div className="method-card"><Database size={20} /><h3>数据从哪里来？</h3><p>第一版只接受车主主动填报。后续会接入手机 App、视频辅助和经过授权的设备数据，并始终标记数据来源。</p><a href="#">查看采集规范 <ArrowUpRight size={13} /></a></div><div className="method-card"><ShieldCheck size={20} /><h3>什么算一次事件？</h3><p>平台区分 Critical、Safety、Comfort、Preference 和 System Exit，不把所有“接管”混为一谈。</p><a href="#">查看事件字典 <ArrowUpRight size={13} /></a></div><div className="method-card"><Users size={20} /><h3>如何理解样本？</h3><p>所有指标同时展示里程、行程、车辆数、时间范围、验证状态和数据来源，不提供脱离上下文的单一总分。</p><a href="#">查看统计公式 <ArrowUpRight size={13} /></a></div></div>{!compact && <div className="privacy-note"><Info size={18} /><div><b>隐私优先</b><span>默认不保存完整 VIN、精确路线、车牌、人脸或未经授权的车端数据。当前演示数据只保存在你的浏览器。</span></div></div>}</section>; }

function TripModal({ onClose, onSubmit }) { const [brand, setBrand] = useState('华为 ADS'); const versions = releases.find(r => r.brand === brand)?.version || releases[0].version; return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-header"><div><div className="eyebrow"><span className="eyebrow-line" /> SHARE A TRIP</div><h2>提交一次行程</h2><p>大约需要 30 秒。当前数据仅保存在本机。</p></div><button className="close-btn" onClick={onClose}><X size={19} /></button></div><form onSubmit={onSubmit}><div className="form-grid"><label>品牌 / 系统<select name="brand" value={brand} onChange={(e) => setBrand(e.target.value)}>{releases.map(r => <option key={r.brand}>{r.brand}</option>)}</select></label><label>软件版本<select key={brand} name="version" defaultValue={versions}>{releases.filter(r => r.brand === brand).map(r => <option key={r.version}>{r.version}</option>)}</select></label><label>行程日期<input name="date" type="date" defaultValue="2026-08-27" required /></label><label>行驶里程（km）<input name="km" type="number" min="0.1" step="0.1" placeholder="例如 42.5" required /></label><label>主要道路<select name="road"><option>城市道路</option><option>高速公路</option><option>国道 / 省道</option><option>地库 / 泊车</option></select></label><label>人工干预次数<input name="events" type="number" min="0" step="1" defaultValue="0" required /></label><label className="full">最严重事件类型<select name="severity"><option>—</option><option>Critical</option><option>Safety</option><option>Comfort</option><option>Preference</option><option>System Exit</option></select></label></div><div className="form-consent"><input type="checkbox" id="consent" required /><label htmlFor="consent">我确认这是我的真实驾驶记录，并理解它会作为匿名社区样本使用。</label></div><button className="submit-form" type="submit"><CheckCircle2 size={17} /> 保存这次行程</button></form></div></div>; }

createRoot(document.getElementById('root')).render(<App />);

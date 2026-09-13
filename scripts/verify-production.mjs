import { readFileSync, existsSync } from 'node:fs';

function loadLocalEnv() {
  if (!existsSync('.env.local')) return {};
  return Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('=');
    return index < 0 ? [line, ''] : [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
  }));
}
const localEnv = loadLocalEnv();
const apiBase = (process.env.AUTOPILOTLOG_API_BASE || localEnv.AUTOPILOTLOG_API_BASE || 'http://autopilottrack.cn/api').replace(/\/$/, '');
const supabaseUrl = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY;

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { response, body };
}

let failed = false;
async function check(label, fn) {
  try {
    const result = await fn();
    console.log(`PASS ${label}${result ? `: ${result}` : ''}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${label}: ${error.message}`);
  }
}

await check('API health', async () => {
  const { response, body } = await request(`${apiBase}/health`);
  if (!response.ok || body?.ok !== true) throw new Error(`HTTP ${response.status}`);
  return 'service healthy';
});

function assertPublicShape(value) {
  const forbidden = new Set(['author_id', 'owner_id', 'vin_hash', 'storage_path', 'email']);
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    for (const [key, child] of Object.entries(current)) {
      if (forbidden.has(key)) throw new Error(`公开响应包含禁止字段 ${key}`);
      if (child && typeof child === 'object') stack.push(child);
    }
  }
}

for (const [label, path] of [['公开车型目录', '/catalog/vehicles'], ['公开系统目录', '/catalog/systems'], ['公开版本目录', '/catalog/releases'], ['公开行程', '/trips']]) {
  await check(label, async () => {
    const { response, body } = await request(`${apiBase}${path}`);
    if (!response.ok || !Array.isArray(body?.data)) throw new Error(body?.error || `HTTP ${response.status}`);
    assertPublicShape(body);
    return `${body.data.length} records`;
  });
}

if (supabaseUrl && anonKey) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  for (const [label, path] of [
    ['vehicle_brand 字段', 'vehicle_models?select=id,vehicle_brand&limit=1'],
    ['来源证据表', 'catalog_sources?select=id,verification_status&limit=1'],
    ['系统车型搭载表', 'system_vehicle_compatibility?select=id&limit=1'],
    ['公开版本统计视图', 'public_release_stats?select=id&limit=1'],
    ['公开行程事件摘要视图', 'public_trip_event_summary?select=trip_id,event_type,scene,event_count&limit=1']
  ]) {
    await check(`Supabase ${label}`, async () => {
      const { response, body } = await request(`${supabaseUrl}/rest/v1/${path}`, { headers });
      if (!response.ok) throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
      return 'schema available';
    });
  }
} else {
  console.warn('SKIP Supabase schema checks: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not set');
}

if (failed) process.exitCode = 1;

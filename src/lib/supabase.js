import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloudConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT'));
export const supabase = isCloudConfigured ? createClient(url, anonKey) : null;

export function getSupabaseErrorMessage(error) {
  const raw = String(error?.message || error || '').trim();
  const normalized = raw.toLowerCase();
  if (/^[^a-z]*[\u4e00-\u9fff]/.test(raw) && !normalized.includes('anonymous sign-ins are disabled')) return raw;
  if (normalized.includes('anonymous sign-ins are disabled') || normalized.includes('anonymous_provider_disabled')) return '匿名投稿暂未开启，请稍后再试或联系管理员。';
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror') || normalized.includes('network error')) return '网络连接失败，请检查网络后重试。';
  if (normalized.includes('invalid api key') || normalized.includes('unauthorized') || normalized.includes('jwt')) return '云端认证配置无效，请稍后再试或联系管理员。';
  if (normalized.includes('row-level security') || normalized.includes('permission denied') || normalized.includes('not authorized')) return '当前身份没有执行该操作的权限，请稍后再试。';
  if (normalized.includes('duplicate key') || normalized.includes('already exists')) return '这条记录可能已经提交，请刷新后确认。';
  if (normalized.includes('storage') || normalized.includes('upload')) return '行程图片上传失败，请检查图片后重试。';
  if (normalized.includes('violates') || normalized.includes('invalid input') || normalized.includes('check constraint')) return '提交内容不符合数据规范，请检查后重试。';
  return '云端提交失败，请稍后重试。';
}

export async function ensureAnonymousSession() {
  if (!supabase) return { user: null, error: null, mode: 'local' };
  const current = await supabase.auth.getSession();
  if (current.error) return { user: null, error: current.error, mode: 'cloud' };
  if (current.data.session?.user) return { user: current.data.session.user, error: null, mode: 'cloud' };
  const { data, error } = await supabase.auth.signInAnonymously();
  return { user: data.user || null, error, mode: 'cloud' };
}

export async function listPublicTrips({ brand, releaseId, vehicleModelId, eventType, roadType, from, to, page = 1, pageSize = 20 } = {}) {
  if (!supabase) return { data: [], count: 0, error: null, mode: 'local' };
  let query = supabase.from('public_trips').select('*', { count: 'exact' });
  if (brand && brand !== '全部系统') query = query.eq('brand', brand);
  if (releaseId) query = query.eq('release_id', releaseId);
  if (vehicleModelId) query = query.eq('vehicle_model_id', vehicleModelId);
  if (eventType) query = query.contains('event_types', [eventType]);
  if (roadType) query = query.eq('road_type', roadType);
  if (from) query = query.gte('trip_date', from);
  if (to) query = query.lte('trip_date', to);
  const rangeStart = Math.max(0, (page - 1) * pageSize);
  const { data, count, error } = await query.range(rangeStart, rangeStart + pageSize - 1);
  return { data: data || [], count: count || 0, error, mode: 'cloud' };
}

export async function listReleases({ brand, page = 1, pageSize = 50 } = {}) {
  if (!supabase) return { data: [], count: 0, error: null, mode: 'local' };
  let query = supabase.from('public_release_stats').select('*', { count: 'exact' });
  if (brand && brand !== '全部系统') query = query.eq('brand', brand);
  const from = Math.max(0, (page - 1) * pageSize);
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  return { data: data || [], count: count || 0, error, mode: 'cloud' };
}

export async function getPublicTrip(tripId) {
  if (!supabase) return { data: null, error: null, mode: 'local' };
  return supabase.from('public_trips').select('*').eq('id', tripId).maybeSingle();
}

export async function listPublicTripEventSummary(tripId) {
  if (!supabase) return { data: [], error: null, mode: 'local' };
  return supabase.from('public_trip_event_summary').select('*').eq('trip_id', tripId).order('event_type').order('scene');
}

export async function submitTrip({ trip, events = [], files = [] }) {
  if (!supabase) return { data: null, error: new Error('Supabase 未配置，当前为本机演示模式'), mode: 'local' };
  const session = await ensureAnonymousSession();
  if (session.error || !session.user) return { data: null, error: session.error || new Error('匿名登录失败'), mode: 'cloud' };
  const { data: release, error: releaseError } = await supabase.from('releases').select('id').eq('slug', trip.releaseSlug).single();
  if (releaseError) return { data: null, error: releaseError, mode: 'cloud' };
  const { data: vehicleModel, error: modelError } = await supabase.from('vehicle_models').select('id').eq('slug', trip.vehicleModelSlug).single();
  if (modelError) return { data: null, error: modelError, mode: 'cloud' };
  const existingVehicle = await supabase.from('vehicle_profiles').select('id').eq('owner_id', session.user.id).eq('vin_hash', trip.vinHash).maybeSingle();
  if (existingVehicle.error) return { data: null, error: existingVehicle.error, mode: 'cloud' };
  const vehicleResult = existingVehicle.data ? existingVehicle : await supabase.from('vehicle_profiles').insert({
    vehicle_model_id: vehicleModel.id, owner_id: session.user.id,
    vin_hash: trip.vinHash, vin_last6: trip.vinLast6
  }).select('id').single();
  const vehicle = vehicleResult.data;
  const vehicleError = vehicleResult.error;
  if (vehicleError) return { data: null, error: vehicleError, mode: 'cloud' };
  const { data, error } = await supabase.from('trips').insert({
    author_id: session.user.id, release_id: release.id, vehicle_profile_id: vehicle.id,
    vehicle_model_id: vehicleModel.id,
    trip_date: trip.tripDate, total_km: trip.totalKm, road_type: trip.roadType, source: 'manual'
  }).select('id, verification_status, created_at').single();
  if (error) return { data: null, error, mode: 'cloud' };
  if (events.length) {
    const { error: eventError } = await supabase.from('events').insert(events.map((event, index) => ({
      trip_id: data.id, sequence_no: index + 1, event_type: event.type.toLowerCase().replace(' ', '_'),
      scene: event.scene, description: event.description, driver_action: event.driverAction || null
    })));
    if (eventError) return { data: null, error: eventError, mode: 'cloud' };
  }
  const evidence = [];
  for (const file of files.slice(0, 3)) {
    const path = `${session.user.id}/${data.id}/${crypto.randomUUID()}-${file.name}`;
    const upload = await supabase.storage.from('trip-evidence').upload(path, file, { upsert: false, contentType: file.type });
    if (upload.error) return { data: null, error: upload.error, mode: 'cloud' };
    evidence.push({ trip_id: data.id, storage_path: path, mime_type: file.type, byte_size: file.size, sha256: await sha256File(file) });
  }
  if (evidence.length) {
    const { error: evidenceError } = await supabase.from('evidence').insert(evidence);
    if (evidenceError) return { data: null, error: evidenceError, mode: 'cloud' };
  }
  return { data, error: null, mode: 'cloud' };
}

async function sha256File(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

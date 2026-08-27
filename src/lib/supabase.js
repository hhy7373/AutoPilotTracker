import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloudConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT'));
export const supabase = isCloudConfigured ? createClient(url, anonKey) : null;

export async function ensureAnonymousSession() {
  if (!supabase) return { user: null, error: null, mode: 'local' };
  const current = await supabase.auth.getUser();
  if (current.data.user) return { user: current.data.user, error: null, mode: 'cloud' };
  const { data, error } = await supabase.auth.signInAnonymously();
  return { user: data.user || null, error, mode: 'cloud' };
}

export async function listPublicTrips({ brand, releaseId, page = 1, pageSize = 20 } = {}) {
  if (!supabase) return { data: [], count: 0, error: null, mode: 'local' };
  let query = supabase.from('public_trips').select('*', { count: 'exact' });
  if (brand && brand !== '全部系统') query = query.eq('brand', brand);
  if (releaseId) query = query.eq('release_id', releaseId);
  const from = Math.max(0, (page - 1) * pageSize);
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  return { data: data || [], count: count || 0, error, mode: 'cloud' };
}

export async function listReleases({ brand, page = 1, pageSize = 50 } = {}) {
  if (!supabase) return { data: [], count: 0, error: null, mode: 'local' };
  let query = supabase.from('releases').select('*, systems!inner(brand,name)', { count: 'exact' });
  if (brand && brand !== '全部系统') query = query.eq('systems.brand', brand);
  const from = Math.max(0, (page - 1) * pageSize);
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  return { data: data || [], count: count || 0, error, mode: 'cloud' };
}

export async function submitTrip({ trip, events = [], files = [] }) {
  if (!supabase) return { data: null, error: new Error('Supabase 未配置，当前为本机演示模式'), mode: 'local' };
  const session = await ensureAnonymousSession();
  if (session.error || !session.user) return { data: null, error: session.error || new Error('匿名登录失败'), mode: 'cloud' };
  const { data: release, error: releaseError } = await supabase.from('releases').select('id').eq('slug', trip.releaseSlug).single();
  if (releaseError) return { data: null, error: releaseError, mode: 'cloud' };
  const { data: vehicleModel, error: modelError } = await supabase.from('vehicle_models').select('id').eq('slug', trip.vehicleModelSlug).single();
  if (modelError) return { data: null, error: modelError, mode: 'cloud' };
  const { data: vehicle, error: vehicleError } = await supabase.from('vehicle_profiles').insert({
    vehicle_model_id: vehicleModel.id, owner_id: session.user.id,
    vin_hash: trip.vinHash, vin_last6: trip.vinLast6
  }).select('id').single();
  if (vehicleError) return { data: null, error: vehicleError, mode: 'cloud' };
  const { data, error } = await supabase.from('trips').insert({
    author_id: session.user.id, release_id: release.id, vehicle_profile_id: vehicle.id,
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
    evidence.push({ trip_id: data.id, storage_path: path, mime_type: file.type, byte_size: file.size, sha256: 'client-side-pending' });
  }
  if (evidence.length) {
    const { error: evidenceError } = await supabase.from('evidence').insert(evidence);
    if (evidenceError) return { data: null, error: evidenceError, mode: 'cloud' };
  }
  return { data, error: null, mode: 'cloud' };
}

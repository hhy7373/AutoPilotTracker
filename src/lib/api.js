import { supabase, ensureAnonymousSession, getSupabaseErrorMessage } from './supabase';

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

async function authHeaders() {
  if (!supabase) throw new Error('认证服务未配置。');
  let { data } = await supabase.auth.getSession();
  if (!data.session) {
    const sessionResult = await ensureAnonymousSession();
    if (sessionResult.error || !sessionResult.user) throw new Error(getSupabaseErrorMessage(sessionResult.error || '匿名登录失败'));
    ({ data } = await supabase.auth.getSession());
  }
  if (!data.session?.access_token) throw new Error('未获取到登录会话，请刷新后重试。');
  return { Authorization: `Bearer ${data.session.access_token}` };
}

export const isApiConfigured = Boolean(import.meta.env.VITE_API_BASE_URL) || (typeof window !== 'undefined' && window.location.hostname === '8.138.251.200');
function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function request(path, options = {}, { auth = false } = {}) {
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? await authHeaders() : {}), ...(options.headers || {}) };
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '接口请求失败，请稍后重试。');
  return payload;
}

async function uploadRequest(path, fields, files = [], options = {}) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, typeof value === 'string' ? value : JSON.stringify(value)));
  files.slice(0, 3).forEach(file => form.append('evidence', file, file.name));
  const headers = { Accept: 'application/json', ...(await authHeaders()), ...(options.headers || {}) };
  const response = await fetch(`${apiBase}${path}`, { method: 'POST', headers, body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '接口请求失败，请稍后重试。');
  return payload;
}

export const api = {
  health: () => request('/health'),
  listPosts: () => request('/community/posts'),
  getPost: id => request(`/community/posts/${encodeURIComponent(id)}`),
  createPost: body => request('/community/posts', { method: 'POST', body: JSON.stringify(body) }, { auth: true }),
  submitTrip: ({ trip, events = [], files = [], idempotencyKey }) => uploadRequest('/trips', { trip: JSON.stringify({ ...trip, events }) }, files, { headers: { 'Idempotency-Key': idempotencyKey || createIdempotencyKey() } }),
  createComment: (id, body) => request(`/community/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify(body) }, { auth: true }),
  reportPost: (id, reason) => request(`/community/posts/${encodeURIComponent(id)}/reports`, { method: 'POST', body: JSON.stringify({ reason }) }, { auth: true }),
  listMyTrips: () => request('/me/trips', {}, { auth: true }),
  getMyTrip: id => request(`/me/trips/${encodeURIComponent(id)}`, {}, { auth: true }),
  linkEmail: email => request('/me/link-email', { method: 'POST', body: JSON.stringify({ email }) }, { auth: true }),
  listAdminCatalog: () => request('/admin/catalog', {}, { auth: true }),
  updateAdminCatalog: (type, id, body) => request(`/admin/catalog/${type}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }, { auth: true }),
  listAdminSubmissions: () => request('/admin/submissions', {}, { auth: true }),
  updateAdminSubmission: (id, verificationStatus) => request(`/admin/submissions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ verificationStatus }) }, { auth: true }),
  hidePost: id => request(`/admin/posts/${encodeURIComponent(id)}/hide`, { method: 'POST' }, { auth: true }),
  listAdminReports: () => request('/admin/reports', {}, { auth: true }),
  listAuditLogs: () => request('/admin/audit-logs', {}, { auth: true })
};

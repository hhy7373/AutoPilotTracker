import { supabase } from './supabase';

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

async function authHeaders() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function request(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(await authHeaders()), ...(options.headers || {}) };
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '接口请求失败，请稍后重试。');
  return payload;
}

async function uploadRequest(path, fields, files = []) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, typeof value === 'string' ? value : JSON.stringify(value)));
  files.slice(0, 3).forEach(file => form.append('evidence', file, file.name));
  const headers = { Accept: 'application/json', ...(await authHeaders()) };
  const response = await fetch(`${apiBase}${path}`, { method: 'POST', headers, body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '接口请求失败，请稍后重试。');
  return payload;
}

export const api = {
  health: () => request('/health'),
  listPosts: () => request('/community/posts'),
  getPost: id => request(`/community/posts/${encodeURIComponent(id)}`),
  createPost: body => request('/community/posts', { method: 'POST', body: JSON.stringify(body) }),
  submitTrip: ({ trip, events = [], files = [] }) => uploadRequest('/trips', { trip: JSON.stringify({ ...trip, events }) }, files),
  createComment: (id, body) => request(`/community/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  reportPost: (id, reason) => request(`/community/posts/${encodeURIComponent(id)}/reports`, { method: 'POST', body: JSON.stringify({ reason }) }),
  listMyTrips: () => request('/me/trips'),
  getMyTrip: id => request(`/me/trips/${encodeURIComponent(id)}`),
  linkEmail: email => request('/me/link-email', { method: 'POST', body: JSON.stringify({ email }) }),
  listAdminCatalog: () => request('/admin/catalog'),
  updateAdminCatalog: (type, id, body) => request(`/admin/catalog/${type}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listAdminSubmissions: () => request('/admin/submissions'),
  updateAdminSubmission: (id, verificationStatus) => request(`/admin/submissions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ verificationStatus }) }),
  hidePost: id => request(`/admin/posts/${encodeURIComponent(id)}/hide`, { method: 'POST' }),
  listAdminReports: () => request('/admin/reports'),
  listAuditLogs: () => request('/admin/audit-logs')
};

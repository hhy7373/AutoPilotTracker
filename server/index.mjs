import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { validateVin } from '../src/lib/validation.js';

const app = Fastify({ logger: { redact: ['req.headers.authorization', 'req.headers.cookie'] } });
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 3 } });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } }) : null;

const limits = new Map();
function cleanText(value, max) { return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max); }
function rateLimit(request, bucket, max, windowMs) {
  const identity = request.user?.id || request.ip;
  const key = `${bucket}:${identity}`;
  const now = Date.now();
  const entry = limits.get(key) || { start: now, count: 0 };
  if (now - entry.start > windowMs) { entry.start = now; entry.count = 0; }
  entry.count += 1;
  limits.set(key, entry);
  return entry.count <= max;
}

async function authenticate(request, reply) {
  if (!supabase) return reply.code(503).send({ error: '认证服务未配置。' });
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return reply.code(401).send({ error: '需要登录后执行此操作。' });
  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !data.user) return reply.code(401).send({ error: '登录状态已失效，请刷新后重试。' });
  request.user = data.user;
  request.supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${header.slice(7)}` } } });
}

function isAdmin(user) { return user?.app_metadata?.role === 'admin'; }
function adminClient(request, reply) {
  if (!request.supabase) { reply.code(503).send({ error: '管理员数据服务未配置。' }); return null; }
  return request.supabase;
}
function publicTrip(row) { return { id: row.id, releaseId: row.release_id, brand: row.brand, system: row.system_name, version: row.version, hardware: row.hardware, vehicle: row.vehicle_model, trim: row.trim_name, date: row.trip_date, km: row.total_km, road: row.road_type, events: row.event_count, eventTypes: row.event_types, evidenceCount: row.evidence_count, verificationStatus: row.verification_status }; }
function vinFingerprint(vin) { return createHash('sha256').update(vin).digest('hex'); }
function parseTripBody(body) {
  const hashedVin = cleanText(body.vinHash, 128).toLowerCase();
  if (!body.vin && /^[a-f0-9]{64}$/.test(hashedVin)) {
    const km = Number(body.totalKm);
    if (!Number.isFinite(km) || km <= 0 || km > 5000 || Math.round(km * 100) !== km * 100) return { error: '行驶里程必须大于 0、不超过 5000 km，且最多保留两位小数。' };
    return { value: { ...body, vinHash: hashedVin, vinLast6: cleanText(body.vinLast6, 6) || null, totalKm: km } };
  }
  const vinResult = validateVin(body.vin || '', { allowTestVin: Boolean(body.isTest) });
  if (!vinResult.valid) return { error: vinResult.message };
  const km = Number(body.totalKm);
  if (!Number.isFinite(km) || km <= 0 || km > 5000 || Math.round(km * 100) !== km * 100) return { error: '行驶里程必须大于 0、不超过 5000 km，且最多保留两位小数。' };
  return { value: { ...body, vin: vinResult.normalized, vinHash: vinFingerprint(vinResult.normalized), vinLast6: vinResult.normalized.slice(-6), totalKm: km } };
}

app.get('/api/health', async () => ({ ok: true, service: 'autopilotlog-api', authConfigured: Boolean(supabase) }));

app.get('/api/catalog/providers', async (_request, reply) => {
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  const { data, error } = await supabase.from('providers').select('id, slug, name, provider_type, website, catalog_status').in('catalog_status', ['reviewed', 'published']).order('name');
  if (error) return reply.code(502).send({ error: '目录暂时无法读取。' });
  return { data };
});

app.get('/api/catalog/systems', async (request, reply) => {
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  let query = supabase.from('systems').select('id, provider_id, brand, name, slug, system_kind, catalog_status, verified_at').in('catalog_status', ['reviewed', 'published']).order('brand');
  if (request.query?.providerId) query = query.eq('provider_id', request.query.providerId);
  const { data, error } = await query;
  if (error) return reply.code(502).send({ error: '系统目录暂时无法读取。' });
  return { data: data || [] };
});

app.get('/api/catalog/releases', async (request, reply) => {
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  let query = supabase.from('releases').select('id, system_id, slug, version, hardware, release_type, released_at, catalog_status').in('catalog_status', ['reviewed', 'published']).order('released_at', { ascending: false });
  if (request.query?.systemId) query = query.eq('system_id', request.query.systemId);
  const { data, error } = await query;
  if (error) return reply.code(502).send({ error: '版本目录暂时无法读取。' });
  return { data };
});

app.get('/api/catalog/vehicles', async (request, reply) => {
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  let query = supabase.from('vehicle_models').select('id, system_id, slug, name, trim_name, hardware, model_year, catalog_status').in('catalog_status', ['reviewed', 'published']).order('name');
  if (request.query?.systemId) query = query.eq('system_id', request.query.systemId);
  const { data, error } = await query;
  if (error) return reply.code(502).send({ error: '车型目录暂时无法读取。' });
  return { data };
});

app.get('/api/trips', async (request, reply) => {
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  const { data, error, count } = await supabase.from('public_trips').select('*', { count: 'exact' }).range(0, 49);
  if (error) return reply.code(502).send({ error: '公开行程暂时无法读取。' });
  return { data: (data || []).map(publicTrip), count: count || 0 };
});

app.post('/api/trips', { preHandler: authenticate }, async (request, reply) => {
  if (!rateLimit(request, 'trip-write', 10, 60 * 60 * 1000)) return reply.code(429).send({ error: '投稿过于频繁，请稍后再试。' });
  let body = request.body || {};
  if (request.isMultipart()) {
    const fields = {}; const files = [];
    for await (const part of request.parts()) { if (part.file) files.push({ filename: part.filename, mimetype: part.mimetype, buffer: await part.toBuffer() }); else fields[part.fieldname] = part.value; }
    try { body = { ...JSON.parse(fields.trip || '{}'), files }; } catch { return reply.code(400).send({ error: '投稿数据格式无效。' }); }
  }
  const parsed = parseTripBody(body);
  if (parsed.error) return reply.code(400).send({ error: parsed.error });
  body = parsed.value;
  if (!body.releaseSlug || !body.vehicleModelSlug || !body.tripDate) return reply.code(400).send({ error: '版本、车型和日期均为必填项。' });
  const idempotencyKey = cleanText(request.headers['idempotency-key'] || body.idempotencyKey, 100);
  if (!idempotencyKey) return reply.code(400).send({ error: '缺少幂等请求标识，请重新提交。' });
  const db = request.supabase;
  const existing = await db.from('trips').select('id, verification_status, created_at').eq('author_id', request.user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing.error) return reply.code(502).send({ error: '投稿状态暂时无法确认。' });
  if (existing.data) return reply.code(200).send({ data: existing.data, replayed: true });
  const { data: release, error: releaseError } = await db.from('releases').select('id').eq('slug', cleanText(body.releaseSlug, 120)).single();
  const { data: vehicleModel, error: modelError } = await db.from('vehicle_models').select('id').eq('slug', cleanText(body.vehicleModelSlug, 120)).single();
  if (releaseError || modelError) return reply.code(400).send({ error: '版本或车型不在已核验目录中。' });
  const vinHash = body.vinHash;
  if (!vinHash) return reply.code(400).send({ error: '缺少 VIN 指纹，请在客户端完成 VIN 校验。' });
  const existingVehicle = await db.from('vehicle_profiles').select('id').eq('owner_id', request.user.id).eq('vin_hash', vinHash).maybeSingle();
  if (existingVehicle.error) return reply.code(502).send({ error: '车辆档案暂时无法读取。' });
  const vehicleResult = existingVehicle.data ? existingVehicle : await db.from('vehicle_profiles').insert({ vehicle_model_id: vehicleModel.id, owner_id: request.user.id, vin_hash: vinHash, vin_last6: cleanText(body.vinLast6, 6) || null }).select('id').single();
  if (vehicleResult.error) return reply.code(400).send({ error: '车辆档案保存失败，请检查 VIN 后重试。' });
  const { data: trip, error: tripError } = await db.from('trips').insert({ author_id: request.user.id, release_id: release.id, vehicle_profile_id: vehicleResult.data.id, vehicle_model_id: vehicleModel.id, trip_date: body.tripDate, total_km: body.totalKm, road_type: cleanText(body.roadType, 60), source: 'manual', verification_status: 'unverified', idempotency_key: idempotencyKey, is_test: body.isTest === true }).select('id, verification_status, created_at').single();
  if (tripError) return reply.code(400).send({ error: '行程保存失败，请稍后重试。' });
  const events = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
  if (events.length) {
    const eventRows = events.map((event, index) => ({ trip_id: trip.id, sequence_no: index + 1, event_type: cleanText(event.type, 30).toLowerCase().replace(/\s+/g, '_'), scene: cleanText(event.scene, 100), description: cleanText(event.description, 2000), driver_action: cleanText(event.driverAction, 100) || null }));
    const { error: eventError } = await db.from('events').insert(eventRows);
    if (eventError) return reply.code(400).send({ error: '人工干预事件保存失败，请联系管理员处理。' });
  }
  if (Array.isArray(body.files)) {
    const evidence = [];
    for (const file of body.files.slice(0, 3)) {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) || file.buffer.length > 5 * 1024 * 1024) return reply.code(400).send({ error: '图片必须是 JPG、PNG、WEBP 或 GIF，且单张不超过 5 MB。' });
      const path = `${request.user.id}/${trip.id}/${crypto.randomUUID()}-${file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const upload = await db.storage.from('trip-evidence').upload(path, file.buffer, { upsert: false, contentType: file.mimetype });
      if (upload.error) return reply.code(400).send({ error: '行程图片上传失败，请稍后重试。' });
      evidence.push({ trip_id: trip.id, storage_path: path, mime_type: file.mimetype, byte_size: file.buffer.length, sha256: createHash('sha256').update(file.buffer).digest('hex') });
    }
    if (evidence.length) { const { error: evidenceError } = await db.from('evidence').insert(evidence); if (evidenceError) return reply.code(400).send({ error: '证据记录保存失败，请联系管理员处理。' }); }
  }
  return reply.code(201).send({ data: trip });
});

app.get('/api/me/trips', { preHandler: authenticate }, async (request, reply) => {
  const { data, error } = await request.supabase.from('trips').select('id, trip_date, total_km, road_type, verification_status, published_at, created_at').eq('author_id', request.user.id).order('created_at', { ascending: false });
  if (error) return reply.code(502).send({ error: '个人投稿暂时无法读取。' });
  return { data: data || [] };
});

app.get('/api/me/trips/:id', { preHandler: authenticate }, async (request, reply) => {
  const { data, error } = await request.supabase.from('trips').select('id, release_id, vehicle_model_id, trip_date, total_km, road_type, verification_status, published_at, created_at').eq('id', request.params.id).eq('author_id', request.user.id).maybeSingle();
  if (error) return reply.code(502).send({ error: '个人投稿暂时无法读取。' });
  if (!data) return reply.code(404).send({ error: '未找到该投稿。' });
  return { data };
});

app.post('/api/me/link-email', { preHandler: authenticate }, async (request, reply) => {
  const email = String(request.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply.code(400).send({ error: '请输入有效的邮箱地址。' });
  const { error } = await request.supabase.auth.updateUser({ email });
  if (error) return reply.code(400).send({ error: '绑定邮箱失败，请稍后重试。' });
  return { ok: true, message: '验证邮件已发送，请完成邮箱验证。' };
});

app.get('/api/community/posts', async (_request, reply) => {
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  const { data, error } = await supabase.from('community_posts').select('id, display_name, title, body, trip_id, created_at, updated_at').eq('is_hidden', false).order('created_at', { ascending: false }).range(0, 49);
  if (error) return reply.code(502).send({ error: '社区内容暂时无法读取。' });
  return { data: data || [] };
});

app.get('/api/community/posts/:id', async (request, reply) => {
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  const [post, comments] = await Promise.all([
    supabase.from('community_posts').select('id, display_name, title, body, trip_id, created_at, updated_at').eq('id', request.params.id).eq('is_hidden', false).maybeSingle(),
    supabase.from('community_comments').select('id, post_id, display_name, body, created_at').eq('post_id', request.params.id).eq('is_hidden', false).order('created_at')
  ]);
  if (post.error || comments.error) return reply.code(502).send({ error: '帖子暂时无法读取。' });
  if (!post.data) return reply.code(404).send({ error: '未找到该帖子。' });
  return { data: { post: post.data, comments: comments.data || [] } };
});

app.post('/api/community/posts/:id/comments', { preHandler: authenticate }, async (request, reply) => {
  if (!rateLimit(request, 'comment-write', 30, 60 * 60 * 1000)) return reply.code(429).send({ error: '评论过于频繁，请稍后再试。' });
  const body = cleanText(request.body?.body, 1000); const displayName = cleanText(request.body?.displayName || '匿名车主', 40);
  if (!body) return reply.code(400).send({ error: '评论内容不能为空。' });
  const { data: post, error: postError } = await request.supabase.from('community_posts').select('id').eq('id', request.params.id).eq('is_hidden', false).maybeSingle();
  if (postError || !post) return reply.code(404).send({ error: '帖子不存在或已隐藏。' });
  const { data, error } = await request.supabase.from('community_comments').insert({ post_id: request.params.id, author_id: request.user.id, display_name: displayName, body }).select('id, post_id, display_name, body, created_at').single();
  if (error) return reply.code(400).send({ error: '评论保存失败，请稍后重试。' });
  return reply.code(201).send({ data });
});

app.post('/api/community/posts', { preHandler: authenticate }, async (request, reply) => {
  if (!rateLimit(request, 'post-write', 10, 60 * 60 * 1000)) return reply.code(429).send({ error: '发帖过于频繁，请稍后再试。' });
  const body = request.body || {};
  const title = cleanText(body.title, 80); const content = cleanText(body.body, 5000); const displayName = cleanText(body.displayName || '匿名车主', 40);
  if (!title || !content) return reply.code(400).send({ error: '标题和正文不能为空。' });
  const tripId = body.tripId || null;
  if (tripId) {
    const { data: trip, error: tripError } = await request.supabase.from('public_trips').select('id').eq('id', tripId).maybeSingle();
    if (tripError || !trip) return reply.code(400).send({ error: '只能引用已经公开的行程。' });
  }
  const { data, error } = await request.supabase.from('community_posts').insert({ author_id: request.user.id, display_name: displayName, title, body: content, trip_id: tripId }).select('id, display_name, title, body, trip_id, created_at').single();
  if (error) return reply.code(400).send({ error: '帖子保存失败，请检查内容后重试。' });
  return reply.code(201).send({ data });
});

app.post('/api/community/posts/:id/reports', { preHandler: authenticate }, async (request, reply) => {
  if (!rateLimit(request, 'report-write', 20, 24 * 60 * 60 * 1000)) return reply.code(429).send({ error: '举报操作过于频繁，请稍后再试。' });
  const reason = cleanText(request.body?.reason, 500);
  if (!reason) return reply.code(400).send({ error: '请填写举报理由。' });
  const { error } = await request.supabase.from('community_reports').insert({ reporter_id: request.user.id, post_id: request.params.id, reason });
  if (error) return reply.code(400).send({ error: '举报提交失败，请稍后重试。' });
  return { ok: true };
});

app.post('/api/community/comments/:id/reports', { preHandler: authenticate }, async (request, reply) => {
  if (!rateLimit(request, 'report-write', 20, 24 * 60 * 60 * 1000)) return reply.code(429).send({ error: '举报操作过于频繁，请稍后再试。' });
  if (!supabase) return reply.code(503).send({ error: '数据服务未配置。' });
  const reason = cleanText(request.body?.reason, 500);
  if (!reason) return reply.code(400).send({ error: '请填写举报理由。' });
  const { error } = await request.supabase.from('community_reports').insert({ reporter_id: request.user.id, comment_id: request.params.id, reason });
  if (error) return reply.code(400).send({ error: '举报提交失败，请稍后重试。' });
  return { ok: true };
});

app.get('/api/admin/catalog', { preHandler: authenticate }, async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: '需要管理员权限。' });
  const db = adminClient(request, reply); if (!db) return;
  const [providers, systems, releases, vehicles] = await Promise.all([
    db.from('providers').select('*').order('name'),
    db.from('systems').select('*').order('brand'),
    db.from('releases').select('*').order('released_at', { ascending: false }),
    db.from('vehicle_models').select('*').order('name')
  ]);
  if (providers.error || systems.error || releases.error || vehicles.error) return reply.code(502).send({ error: '管理目录暂时无法读取。' });
  return { data: { providers: providers.data, systems: systems.data, releases: releases.data, vehicles: vehicles.data } };
});

app.get('/api/admin/submissions', { preHandler: authenticate }, async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: '需要管理员权限。' });
  const db = adminClient(request, reply); if (!db) return;
  const { data, error } = await db.from('trips').select('id, author_id, release_id, vehicle_model_id, trip_date, total_km, road_type, verification_status, published_at, created_at, is_test').order('created_at', { ascending: false }).range(0, 99);
  if (error) return reply.code(502).send({ error: '审核队列暂时无法读取。' });
  return { data: data || [] };
});

app.patch('/api/admin/submissions/:id', { preHandler: authenticate }, async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: '需要管理员权限。' });
  const db = adminClient(request, reply); if (!db) return;
  const allowed = ['unverified', 'reviewed', 'verified', 'rejected'];
  const status = request.body?.verificationStatus;
  if (!allowed.includes(status)) return reply.code(400).send({ error: '审核状态无效。' });
  const patch = { verification_status: status };
  if (status === 'reviewed' || status === 'verified') patch.published_at = new Date().toISOString();
  if (status === 'rejected' || status === 'unverified') patch.published_at = null;
  const { data, error } = await db.from('trips').update(patch).eq('id', request.params.id).select('id, verification_status, published_at').single();
  if (error) return reply.code(400).send({ error: '审核状态更新失败。' });
  return { data };
});

app.post('/api/admin/posts/:id/hide', { preHandler: authenticate }, async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: '需要管理员权限。' });
  const db = adminClient(request, reply); if (!db) return;
  const { data, error } = await db.from('community_posts').update({ is_hidden: true }).eq('id', request.params.id).select('id, is_hidden').single();
  if (error) return reply.code(400).send({ error: '帖子隐藏失败。' });
  return { data };
});

app.get('/api/admin/reports', { preHandler: authenticate }, async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: '需要管理员权限。' });
  const db = adminClient(request, reply); if (!db) return;
  const { data, error } = await db.from('community_reports').select('*').eq('status', 'open').order('created_at', { ascending: false });
  if (error) return reply.code(502).send({ error: '举报队列暂时无法读取。' });
  return { data: data || [] };
});

app.patch('/api/admin/catalog/:type/:id', { preHandler: authenticate }, async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: '需要管理员权限。' });
  const db = adminClient(request, reply); if (!db) return;
  const tableMap = { providers: 'providers', systems: 'systems', releases: 'releases', vehicles: 'vehicle_models' };
  const table = tableMap[request.params.type];
  if (!table) return reply.code(400).send({ error: '目录类型无效。' });
  const body = request.body || {};
  const allowed = {
    providers: ['name', 'website', 'provider_type', 'catalog_status'],
    systems: ['brand', 'name', 'system_kind', 'catalog_status', 'verified_at', 'primary_source_id'],
    releases: ['version', 'hardware', 'release_type', 'catalog_status', 'released_at', 'primary_source_id'],
    vehicles: ['name', 'trim_name', 'hardware', 'model_year', 'catalog_status', 'primary_source_id']
  }[request.params.type];
  const changes = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(changes).length) return reply.code(400).send({ error: '没有可修改的目录字段。' });
  const { data: before } = await db.from(table).select('*').eq('id', request.params.id).maybeSingle();
  const { data, error } = await db.from(table).update(changes).eq('id', request.params.id).select('*').single();
  if (error) return reply.code(400).send({ error: '目录更新失败。' });
  const { error: auditError } = await db.from('catalog_change_logs').insert({ entity_type: request.params.type, entity_id: request.params.id, before_data: before, after_data: data, changed_by: request.user.id, change_reason: cleanText(body.changeReason || '管理员目录校正', 500) });
  if (auditError) return reply.code(502).send({ error: '目录已更新，但审计日志写入失败，请立即检查。' });
  return { data };
});

app.get('/api/admin/audit-logs', { preHandler: authenticate }, async (request, reply) => {
  if (!isAdmin(request.user)) return reply.code(403).send({ error: '需要管理员权限。' });
  const db = adminClient(request, reply); if (!db) return;
  const { data, error } = await db.from('catalog_change_logs').select('id, entity_type, entity_id, source_id, before_data, after_data, changed_by, change_reason, created_at').order('created_at', { ascending: false }).range(0, 199);
  if (error) return reply.code(502).send({ error: '审计日志暂时无法读取。' });
  return { data: data || [] };
});

app.listen({ port: Number(process.env.PORT || 3001), host: process.env.HOST || '127.0.0.1' });

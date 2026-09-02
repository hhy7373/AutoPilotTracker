# AutoPilotLog API 契约 v0.3

## 认证

- 公开目录、公开行程和公开社区内容不要求登录。
- 写入接口使用 `Authorization: Bearer <Supabase access token>`。
- 匿名用户通过 Supabase Anonymous Sign-Ins 获取 token；服务端从 token 获取用户 ID，不接受客户端传入作者 ID。
- 管理员由 Supabase JWT `app_metadata.role=admin` 判断。

## 目录与公开数据

```text
GET /api/catalog/providers
GET /api/catalog/systems
GET /api/catalog/releases
GET /api/catalog/vehicles
GET /api/trips
```

只返回已核验/已发布目录和已发布行程，不返回 VIN、VIN 哈希、作者 ID、邮箱、精确位置或 Storage 原始路径。

## 投稿与个人记录

```text
POST /api/trips
GET  /api/me/trips
GET  /api/me/trips/:id
POST /api/me/link-email
```

`POST /api/trips` 支持 JSON 或 multipart/form-data；服务端校验 VIN 和 0–5000 km 里程，使用 `Idempotency-Key` 防止重复投稿，行程默认为 `unverified`。

## 社区

```text
GET  /api/community/posts
GET  /api/community/posts/:id
POST /api/community/posts
POST /api/community/posts/:id/comments
POST /api/community/posts/:id/reports
POST /api/community/comments/:id/reports
```

帖子标题最多 80 字，正文最多 5000 字，评论最多 1000 字。帖子只允许文字和已发布行程引用，服务端执行基础 HTML 清理和限频。

## 管理

```text
GET   /api/admin/catalog
PATCH /api/admin/catalog/:type/:id
GET   /api/admin/submissions
PATCH /api/admin/submissions/:id
POST  /api/admin/posts/:id/hide
GET   /api/admin/reports
GET   /api/admin/audit-logs
```

管理员修改目录、审核投稿和隐藏帖子必须写入审计日志。普通用户不能修改审核状态、作者 ID、统计字段或目录校验状态。

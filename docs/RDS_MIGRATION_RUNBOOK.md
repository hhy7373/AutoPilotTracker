# 阿里云 RDS PostgreSQL 迁移运行手册

## 目标架构

阿里云 ECS 上运行 Nginx、Vite 静态页面和 Fastify API；RDS PostgreSQL 与 ECS 位于华南 3（广州）同一 VPC，RDS 只允许 ECS 私网访问。Supabase Auth 在本阶段继续保留，Supabase Storage 暂不迁移。

## 迁移前置条件

- 创建同地域 RDS PostgreSQL，启用自动备份和 SSL。
- 安全组只允许 ECS 私网地址访问 PostgreSQL 端口。
- 在服务器环境变量配置 `DATABASE_URL`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`。
- 任何高权限密钥只能保存在服务器环境变量或密钥管理服务，不进入前端和 Git。

## 身份兼容

RDS 不建立到 Supabase `auth.users` 的外键。业务表使用 `auth_subject` 保存 Supabase JWT 的 `sub`，`auth_provider` 固定为 `supabase`。API 验证 JWT 后按 `auth_subject` 做权限过滤，保留匿名用户 subject 以维持历史记录归属。

## 切换步骤

1. 备份 Supabase 业务表、Storage 元数据和当前迁移版本。
2. 在 RDS 创建兼容表结构，先导入系统、来源、版本、车型、搭载关系，再导入行程、事件、证据元数据和审计日志。
3. 对照表数量、主键、VIN 哈希、测试记录和公开视图结果。
4. 暂停投稿写入，执行最终增量同步。
5. 将 API 的数据库连接切换到 RDS，运行健康检查和抽样读写测试。
6. 保留 Supabase 只读回滚窗口，确认 RDS 备份恢复成功后再关闭旧业务写入。

## 回滚

若 RDS 连接、数据校验或关键接口失败，停止 API 写入并将数据库连接切回兼容的 Supabase 仓储，保留迁移日志和失败原因。未经核对不得删除 Supabase 数据。

## 当前状态

本手册和迁移兼容设计已加入仓库；RDS 实例尚未创建，当前生产业务数据仍在 Supabase。

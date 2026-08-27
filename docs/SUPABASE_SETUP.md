# Supabase 配置清单

## 1. 创建项目

在 Supabase 创建项目后，打开 Authentication → Providers，启用 Anonymous Sign-Ins。匿名身份用于让没有注册账号的车主提交数据；后续可以再绑定邮箱或第三方账号。

## 2. 执行迁移

按顺序在 SQL Editor 执行：

1. `supabase/migrations/202608270001_initial_v02.sql`
2. `supabase/migrations/202608270002_seed_and_storage.sql`

第二个脚本会写入五类系统、示例版本、车型字典和私有 `trip-evidence` bucket。生产环境执行前应审查种子数据和 Storage policy。

## 3. 配置前端

复制 `.env.example` 为 `.env.local`，填写 Project URL 和公开 anon/publishable key：

```text
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的公开匿名访问密钥
```

禁止填写 `service_role` key，禁止将 `.env.local` 提交到 Git。

## 4. 验证

- 访客可以读取 `public_release_stats` 和 `public_trips` 中已发布数据。
- 匿名用户提交的行程默认为 `unverified`，不能自行修改审核状态。
- 图片只进入私有 bucket，路径第一段必须是当前匿名用户 ID。
- 重复提交同一辆车时复用该匿名用户下的车辆档案，不重复创建 VIN 指纹记录。
- 生产部署前还需增加文件大小/MIME 白名单、病毒扫描、EXIF 清除、限流和审核员角色策略。

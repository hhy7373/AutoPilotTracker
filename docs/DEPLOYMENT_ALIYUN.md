# 阿里云 ECS 部署记录

## 当前环境

- 服务器系统：Alibaba Cloud Linux 4
- 公网地址：`8.138.251.200`
- Web 服务：Nginx
- 站点目录：`/var/www/autopilotlog`
- Nginx 配置：`/etc/nginx/conf.d/00-autopilotlog.conf`
- 公网访问：`http://8.138.251.200/`

## 部署方式

项目是 Vite 静态站点。部署前在本地执行 `npm run build`，构建产物位于 `dist/`；将 `dist/` 内容上传至服务器站点目录，由 Nginx 在 80 端口提供服务。

`.env.local` 不上传服务器。Vite 构建时会把前端所需的 Supabase 公共配置注入静态 JavaScript；当前使用的是公开 publishable/anon key，不得改用 `service_role` key。

## 更新网站

在项目目录执行：

```powershell
npm run build
scp -r -i C:\Users\ADAS_TEST_PC\Desktop\codex.pem dist\* root@8.138.251.200:/var/www/autopilotlog/
ssh -i C:\Users\ADAS_TEST_PC\Desktop\codex.pem root@8.138.251.200 "nginx -t && systemctl reload nginx"
```

更新后检查：

```powershell
Invoke-WebRequest http://8.138.251.200/ -UseBasicParsing
```

生产验收可执行：

```powershell
$env:VITE_SUPABASE_URL = "你的 Supabase URL"
$env:VITE_SUPABASE_ANON_KEY = "你的公开 anon/publishable key"
npm run verify:production
```

该命令只读取公开 schema 和目录接口，不输出密钥；迁移完成后应全部显示 `PASS`。

## 当前验证

- Nginx 配置测试通过。
- Nginx 已启用开机自启并处于 active 状态。
- 首页、JS 和 CSS 从公网返回 HTTP 200。
- Hash 路由由前端处理，不需要额外的 Nginx 重写规则。

## API 服务（v0.4）

API 服务使用 `server/index.mjs`，默认监听 `127.0.0.1:3001`。生产环境需要在服务器设置 `SUPABASE_URL`、`SUPABASE_ANON_KEY`，再使用 systemd 启动 API，并在 Nginx 增加 `/api/` 到 `127.0.0.1:3001` 的反向代理。

开启 API 前必须先在 Supabase SQL Editor 审查并执行 `202609010002_v04_community_and_personal.sql`。管理员功能需要给指定 Supabase 用户设置 `app_metadata.role=admin`，不得把高权限密钥放入前端。

## API 服务（v0.4.1）

发布 v0.4.1 时还需要依次执行 `202609100001_v041_catalog_review_and_admin.sql`、`202609100002_v041_public_catalog_views.sql`。第一份迁移新增来源追踪字段、系统/车型/版本搭载关系、车型品牌字段和管理员查看私有证据的 RLS 策略；第二份迁移重建公开版本统计、公开行程和事件摘要视图，且公开车型、投稿校验和公开统计都要求存在已核验搭载关系，并排除 `is_test=true` 测试行程。执行前先确认 v0.3.2 目录迁移已完成；若 SQL Editor 会话失效，应重新登录 Supabase 控制台后再执行，不能跳过生产数据库迁移。

管理员账号必须由 Supabase Auth 创建，并在 `app_metadata` 设置 `role=admin`。前端 `#/admin` 支持密码登录或 Magic Link；普通用户会得到权限拒绝，不会看到审核数据。部署后用管理员账号访问 `http://autopilottrack.cn/#/admin`，默认选择 `Unverified · 待审核`，确认能看到测试行程后再发布真实投稿。迁移未执行时，线上投稿入口会保持禁用，不会把旧草稿目录当作可投稿数据。

更新 API 时：

```powershell
scp -i C:\Users\ADAS_TEST_PC\Desktop\codex.pem server\index.mjs root@8.138.251.200:/opt/autopilotlog-api/server/index.mjs
ssh -i C:\Users\ADAS_TEST_PC\Desktop\codex.pem root@8.138.251.200 "systemctl restart autopilotlog-api && systemctl status autopilotlog-api --no-pager"
```

更新静态前端仍按上面的 `npm run build` 和 `scp dist` 流程执行。公网尚未启用 HTTPS，管理员登录、Magic Link 和证据查看应在证书配置完成后进行。

## 后续建议

- 配置域名并申请 HTTPS 证书。
- 将 SSH 私钥移出桌面并继续保持仅当前用户可读。
- 后续加入自动部署脚本或 GitHub Actions。
- 生产环境继续完善图片大小/MIME 校验、EXIF 清理、限流和审核后台。

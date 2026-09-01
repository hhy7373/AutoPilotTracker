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

## 当前验证

- Nginx 配置测试通过。
- Nginx 已启用开机自启并处于 active 状态。
- 首页、JS 和 CSS 从公网返回 HTTP 200。
- Hash 路由由前端处理，不需要额外的 Nginx 重写规则。

## 后续建议

- 配置域名并申请 HTTPS 证书。
- 将 SSH 私钥移出桌面并继续保持仅当前用户可读。
- 后续加入自动部署脚本或 GitHub Actions。
- 生产环境继续完善图片大小/MIME 校验、EXIF 清理、限流和审核后台。

# 项目重要记忆

> 这是项目的长期上下文文件。每次重大产品、数据或合规决策后更新。

## 目标

建立面向小鹏、华为 ADS、理想、蔚来、小米等系统的统一社区数据标准和公开版本追踪数据库，记录真实道路中的智驾行程与人工干预事件，帮助用户观察版本迭代和场景问题变化。

## 当前阶段

- 阶段：v0.4.1 管理审核与可追溯数据字典
- 日期：2026-08-27
- 仓库：GitHub `hhy7373/ChinaFSDTracker`，当前开发分支为 `codex/initial-mvp`
- 后端：Supabase 已建立并用于公开数据与匿名投稿
- 数据：浏览器本地演示数据 + 用户本地录入
- GitHub：已配置 SSH remote，使用 SSH over 443；本地专用密钥指纹为 `SHA256:2t+F81gGBE1GwxZrpqIKFYFNaDReGSuBiR21FMbO6ec`

## 不变的产品判断

1. 平台是社区样本数据库，不是官方认证、安全评级或事故率统计平台。
2. 不同品牌的系统退出逻辑、硬件和用户操作习惯不同，首版禁止用单一综合分数直接排名所有品牌。
3. 核心比较单位是“版本 × 车型/硬件 × 道路/场景 × 事件等级”。
4. 数据可信度必须与统计值一起展示；未验证数据不能伪装成遥测真值。
5. 默认最小化采集：粗粒度区域代替精确坐标，VIN 只允许哈希/后六位，视频默认私有。
6. AI 只能生成待确认的事件候选，不能直接把模型判断写成事实。

## 统一术语

- Trip：一次驾驶行程。
- Event：行程中的人工干预、系统退出或其他可观察事件。
- Critical Intervention：为避免潜在碰撞或严重违法风险而采取的紧急干预。
- Safety Intervention：红灯、逆行、冲出车道等安全相关干预。
- Comfort Intervention：急刹、犹豫、路线不符合预期等舒适性问题。
- System Exit：系统主动退出或要求驾驶员接管。
- Evidence：版本截图、事件视频、日志或其他可审核证据。
- Verification：unverified / reviewed / verified。

## 当前首版范围

- 支持品牌：小鹏、华为 ADS、理想、蔚来、小米。
- 支持功能：版本浏览、品牌筛选、版本详情、行程/事件录入、基础指标统计、方法说明。
- 暂不支持：邮箱/第三方账号体系、官方车端 API、精确事件地图、跨品牌总榜、自动视频识别。

## 下一次迭代前必须确认

- GitHub 组织/仓库名与默认分支策略。
- 后端部署区域及个人信息处理方案。
- 事件分类是否需要邀请真实车主进行可用性测试。
- 首批实际版本字典和版本别名规范。

## AutoPilotLog 品牌与前端增强（2026-08-27）

- 产品英文名固定为 `AutoPilotLog`，中文名固定为“智驾日记”；旧名称 China FSD Tracker / 智驾观测站不再用于界面品牌。
- 车辆录入使用品牌、车型配置下拉菜单；软件版本由品牌字典自动带出，减少自由文本造成的脏数据。
- VIN 在 MVP 中用于本机识别车辆：保存于浏览器 `localStorage` 的最近 5 个记录，并在已提交行程中以遮蔽形式展示；当前没有云端同步，也不应上传完整 VIN 到公开接口。
- 行程人工干预不再只有总次数；每次干预必须记录类型、场景和文字描述，页面列表逐条展示。
- 行程图片最多 3 张，MVP 以 Data URL 保存在本机演示记录中；生产版应改为对象存储、压缩、权限控制和 EXIF 清理。
- 新增真实可操作页面：总览、版本追踪、已提交行程、提交行程和方法与标准；版本卡片可打开详情，通知/订阅/筛选/方法链接均有明确反馈。

## 版本发布规则（2026-08-27）

- 每次版本变更必须在 `docs/releases/` 新增对应 Release Note，并和代码、数据标准、迁移脚本一起提交。
- Release Note 必须写清楚新增、改进、修复、数据/API 变更、隐私安全影响、验证结果和已知限制。
- v0.2 的设计基线文件为 `docs/API_CONTRACT_V0.2.md` 与 `supabase/migrations/202608270001_initial_v02.sql`；尚未连接真实 Supabase 项目。
- 前端云端适配已加入：配置 `.env.local` 后使用 Supabase 匿名会话；未配置时仍使用 `localStorage`。云端写入用 release/model slug 解析数据库 UUID，禁止客户端伪造审核状态。
- Supabase 配置顺序固定为 `202608270001_initial_v02.sql` → `202608270002_seed_and_storage.sql`；前端配置说明见 `docs/SUPABASE_SETUP.md`。
- v0.2.0 安全加固追加 `202608280003_security_invoker_views.sql`，公开视图不得绕过底层 RLS。
- v0.2.1 追加 `202608280004_public_views_rls_fix.sql`：行程冗余保存车型关联，公开视图不再 join `vehicle_profiles`，避免为了公开行程而暴露 VIN 档案读取权限。
- v0.2.3 增加 Hash 可分享路由、版本独立详情、公开行程筛选/分页/详情，以及 `202608280005_public_detail_views.sql`；公开行程详情只返回事件摘要和证据数量，不返回 VIN、作者标识、描述或 Storage 路径。
- v0.2.3 云端模式严格只展示 Supabase 真实数据；无公开行程时显示空状态，不回退到本地演示数据。公开端已区分“Supabase 社区公开数据”和“本地演示模式”。
- v0.2.4 已在 Supabase 项目 `vcyrttqnliovmcgktljs` 开启 Anonymous Sign-Ins；匿名用户通过现有 RLS 只能创建和读取自己的车辆档案、行程、事件和证据，投稿默认保持 `unverified`。
- v0.2.4 前端提交失败会保留表单和图片预览，显示中文错误并允许用户手动重试；不自动重试，避免产生重复投稿。
- v0.2.4 暂不包含验证码、服务端幂等或新的防滥用系统，后续需要补充匿名投稿限流与异常检测。
- 2026-09-01 已部署到阿里云 ECS（Alibaba Cloud Linux 4），公网地址为 `http://8.138.251.200/`；Nginx 站点目录为 `/var/www/autopilotlog`，配置文件为 `/etc/nginx/conf.d/00-autopilotlog.conf`，Nginx 已设置开机自启。
- 阿里云部署记录见 `docs/DEPLOYMENT_ALIYUN.md`；更新流程为本地 `npm run build` 后上传 `dist/`，不上传 `.env.local`、源代码或 SSH 私钥。
- v0.3.0 增加八类对象的目录种子与分类：华为、小鹏、理想、蔚来为车企系统；地平线、卓驭、元戎启行、文远知行为技术提供方/方案商。新目录记录带来源 URL、来源类型、核验日期和草稿/核验状态；部分技术方案资料仍必须人工核验。
- v0.3.0 增加 VIN 格式/校验位/测试 VIN 与单次 5000 km 上限校验，并补全方法章节 Hash 路由和系统字典页面。
- v0.3.0 采用浅色 Apple 风格和移动优先 CSS；业务数据库仍在 Supabase，阿里云 ECS 当前只承载静态站点。
- v0.3.1 进一步固化浅色 Apple-inspired 主题，使用白色半透明侧栏、浅灰背景、圆角卡片和移动端全屏表单；已重新部署到阿里云并验证静态资源返回 200。
- v0.3.2 修复匿名会话首次初始化、阿里云 `/api` 提交链路和前端旧构建问题；提交表单改为“自动驾驶系统 → 车辆品牌 → 车辆配置”三级联动，并在公网完成字段验收。
- v0.3.2 线上验证通过：匿名测试帖子和测试行程均通过阿里云 API 写入并返回 201；测试行程保持 `unverified`，未进入公开列表。
- v0.3.2 目录发布状态迁移为 `202609090001_v032_catalog_review.sql`；仅将已有 `verification_status=verified` 的车企版本及车型标记为 `reviewed`，技术提供方草稿不进入公开选择项。
- 2026-09-10 Supabase SQL Editor 会话授权失效，`202609090001_v032_catalog_review.sql` 已提交 GitHub 但尚未在生产数据库执行；ECS API 临时兼容读取旧版已验证车企种子目录，技术方案草稿仍被隐藏。恢复控制台授权后执行迁移，再移除兼容分支。
- 2026-09-10 ECS API 已重启并验证健康检查、系统、版本和车型目录接口；生产环境变量仅保存在 `/etc/autopilotlog-api.env`，未进入仓库或前端构建。
- v0.4.0 已加入 Fastify API、Supabase Auth JWT、个人记录、邮箱绑定入口、匿名社区帖子/评论/举报和管理员审核接口；API 契约见 `docs/API_CONTRACT_V0.3.md`。
- v0.4.0 服务端投稿支持 VIN/里程校验、幂等键和图片 multipart 上传；阿里云 API 生产部署仍需配置服务器环境变量和 Nginx `/api` 代理。
- v0.4.1 增加 `system_vehicle_compatibility` 搭载关系、来源优先级/冲突备注/核验人字段和官方入口来源种子；官方入口登记不等于具体版本已核验，未补充原文证据的记录继续保持草稿。
- v0.4.1 增加管理员邮箱密码/Magic Link 登录入口；管理员由 Supabase JWT `app_metadata.role=admin` 唯一判断，普通用户即使登录也不能进入审核队列。
- v0.4.1 管理后台默认显示 `unverified` 行程，审核队列展示版本、车型配置、道路、人工干预和证据数量；管理员查看图片只能通过 300 秒私有签名链接，公开响应不返回 Storage 路径。
- v0.4.1 新增迁移 `202609100001_v041_catalog_review_and_admin.sql`、数据政策 `docs/CATALOG_DATA_POLICY.md` 和 Release Note；迁移需在 Supabase SQL Editor 执行后才能启用搭载关系和管理员证据读取策略。
- 当前仍需完成：在 Supabase 设置管理员账号的 `app_metadata.role=admin`，执行 v0.4.1 迁移，逐条补充真实 OTA/车型公告来源，并重新部署 ECS API 与静态前端。当前公网仍为 HTTP，登录和证据查看应待 HTTPS 配置后使用。
- v0.4.1 当前代码状态：投稿表单从云端已核验目录读取系统、车辆品牌、车型配置和版本；云端公开系统/版本/车型接口要求目录状态为 `reviewed/published`、存在已核验来源，投稿接口再次校验版本与车型属于同一系统。
- v0.4.1 管理员目录维护支持关联来源证据后再发布系统、版本和车型；管理员审核队列可请求 300 秒私有证据签名链接，公开接口仍不返回 Storage 原始路径。生产迁移执行顺序为 `202609100001_v041_catalog_review_and_admin.sql` → `202609100002_v041_public_catalog_views.sql`。
- v0.4.1 本地验证已通过 `npm run build`、`npm run api:check`、`git diff --check`；生产 Supabase 迁移仍需在 SQL Editor 执行后才能完成线上目录与审核闭环。
- v0.4.1 研究记录保存在 `docs/CATALOG_RESEARCH_V041.md`；官方入口只能证明系统/产品/车型存在，不能自动证明具体 OTA 版本、发布日期、硬件或配置，缺少精确原文的记录必须保持草稿。
- 线上诊断：若 `/api/catalog/vehicles` 返回“车型目录尚未完成 v0.4.1 数据库迁移”，说明生产库尚未增加 `vehicle_brand` 字段，需先执行两份 v0.4.1 迁移。
- 迁移后验收命令为 `npm run verify:production`；它只读取 API 和 Supabase schema，不输出密钥，全部 PASS 后才能继续管理员和投稿闭环验收。
- 当前验收证据：`vehicle_models.vehicle_brand` 和 `system_vehicle_compatibility` 在生产 Supabase 中不存在；来源表和 `public_release_stats` 存在，API 健康及公开行程隐私检查通过。目标仍未完成。
- 2026-09-11 复核确认 ECS 的 systemd API 工作目录为 `/opt/autopilotlog-api`，线上 `/api/health` 返回 200，Nginx 与 API 均 active；部署文档更新命令已同步该实际路径。Supabase v0.4.1 迁移仍待执行。
- v0.4.1 迁移补强数据库级公开边界：移除旧版系统、版本和车型的公开宽松 RLS，仅允许关联已核验来源且状态合格的记录被 anon/authenticated 读取；同时初始化车型搭载关系草稿，管理员可在后台关联来源并发布。
- 2026-09-12 线上复核：最新前端/API 已部署到 ECS，`/api/health` 返回 200，公开行程为空状态和禁止字段边界通过；生产 Supabase 仍缺少 `vehicle_models.vehicle_brand` 与 `system_vehicle_compatibility`，因为 SQL Editor 会话当前不可用，v0.4.1 迁移和管理员审核闭环仍未完成。恢复登录后必须依次执行 `202609100001_v041_catalog_review_and_admin.sql`、`202609100002_v041_public_catalog_views.sql`，再运行 `npm run verify:production`。
- v0.4.1 公开统计视图额外排除 `trips.is_test=true`，测试投稿即使被误发布也不会污染公开统计；该修正已写入 `202609100002_v041_public_catalog_views.sql`，生产迁移需重新执行该文件中的视图定义。
- v0.4.1 公开车型接口、投稿校验和 RLS 现在统一要求已核验/已发布的系统—车型搭载关系；公开行程详情和事件摘要也排除 `is_test=true`。生产需依次执行两份 v0.4.1 迁移。
- v0.4.1 公开行程与版本统计视图同样要求存在已核验/已发布搭载关系；管理员误发布的旧关联不会进入公开统计。该规则需通过重新执行 `202609100002_v041_public_catalog_views.sql` 生效。
- 2026-09-13 已将搭载关系边界同步到 API 契约、Supabase 配置、字典政策和生产验收脚本；本地 `npm run build`、`npm run api:check`、`git diff --check` 通过，生产验收仍因两份 v0.4.1 迁移未执行而失败。

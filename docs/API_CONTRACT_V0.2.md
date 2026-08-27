# AutoPilotLog API 契约 v0.2

本契约定义云端 Beta 的最小接口边界。MVP 当前仍使用 `localStorage`；接入 Supabase 时，前端只能调用公开视图和受 RLS 保护的写入接口。

## 认证与隐私

- 公开读取不要求登录，只返回已发布且非敏感字段。
- 提交行程需要匿名身份或登录身份；服务端写入 `author_id`，客户端不能自行指定审核状态。
- VIN 不进入公开 API。服务端保存 `vin_hash` 与可选的 `vin_last6`，前端表单的完整 VIN 只用于本次哈希计算。
- 图片通过受保护的对象存储上传，API 只返回 `evidence_id` 和短期签名 URL；生产环境需压缩并清除 EXIF。
- 所有写入接口需要限流、大小限制和审计日志。
- Supabase 项目需启用 Anonymous Sign-Ins；前端只使用 publishable/anon key，`service_role` 只能留在服务端。
- 需创建私有 Storage bucket `trip-evidence`，并配置仅允许行程作者上传、审核员读取的 Storage RLS 策略。

## 公开读取

### `GET /api/v0.2/releases`

查询参数：`brand`、`system`、`status`、`page`、`pageSize`。

只返回 `id`、品牌、系统、版本、硬件、发布日期、聚合统计和 `verification_status`。

### `GET /api/v0.2/trips`

查询参数：`brand`、`releaseId`、`from`、`to`、`page`、`pageSize`。

只返回已发布行程：行程 ID、版本 ID、品牌、系统版本、车型的公开名称、硬件、里程、道路类型、日期、事件摘要、证据数量和审核状态。不得返回 VIN、作者标识、精确坐标或原始图片地址。

### `GET /api/v0.2/trips/{id}`

返回一条已发布行程及其逐条事件；事件包含类型、场景、描述、驾驶员动作、证据数量和审核状态。

## 写入

### `POST /api/v0.2/trips`

请求至少包含（客户端使用品牌字典映射出的 slug，不直接提交数据库 UUID）：

```json
{
  "releaseSlug": "ads-4.0.1",
  "vehicleModelSlug": "huawei-m9-ultra",
  "vin": "仅在服务端安全通道提交",
  "tripDate": "2026-08-27",
  "totalKm": 42.5,
  "roadType": "urban",
  "events": [{
    "type": "comfort",
    "scene": "merge",
    "description": "匝道汇入时减速犹豫",
    "driverAction": "light_brake"
  }]
}
```

服务端根据 slug 解析关联实体，创建后默认 `verification_status=unverified`，响应返回 `tripId`、`verificationStatus` 和 `createdAt`。

### `POST /api/v0.2/trips/{id}/evidence`

使用 `multipart/form-data` 上传图片或视频。单个文件、单次行程和用户每日总量均需限制；服务端完成 MIME 校验、病毒扫描、缩略图和 EXIF 清理后才进入审核队列。

## 管理接口

管理端单独使用受保护路由：审核、退回、发布、隐藏、合并重复车辆、查看审计日志。普通客户端不能提交或修改 `verification_status`、聚合统计和 `author_id`。

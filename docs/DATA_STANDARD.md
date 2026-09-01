# 中国智能驾驶社区数据标准 v0.1

## 1. 核心实体

```text
VehicleProfile -> Trip -> Event -> Evidence
       \-> SoftwareRelease
```

### VehicleProfile

保存品牌、车型、年款、智驾硬件和传感器配置。禁止保存完整 VIN；生产环境使用不可逆标识。

### SoftwareRelease

至少包含 `systemName`、`systemVersion`、`vehicleSoftwareVersion`、`hardware`、`releasedAt`、`aliases`。

### Trip

至少包含行程日期、总里程、道路类型、智驾系统、软件版本、车型、硬件、天气/光照、数据来源和验证状态。

### Event

至少包含事件类型、严重程度、场景、驾驶员动作、事件说明、是否有证据、粗粒度区域和验证状态。

## 2. 事件等级

| 等级 | 定义 |
| --- | --- |
| Critical | 为避免潜在碰撞、严重违法或立即危险而紧急干预 |
| Safety | 与交通安全相关，但不属于立即危险 |
| Comfort | 舒适性、犹豫、急刹、路线选择等问题 |
| Preference | 驾驶员个人偏好或习惯性接管 |
| System Exit | 系统主动退出/请求接管，尚未判定原因 |

## 3. 首版指标

- `interventionsPer100Km = eventCount / totalKm * 100`
- `safetyEventsPer100Km = safetyOrCriticalEventCount / totalKm * 100`
- `noEventTripRate = tripsWithZeroEvents / totalTrips`
- `criticalEventsPer100Km = criticalEventCount / totalKm * 100`

所有指标必须同时显示总里程、行程数、车辆数、最早/最新日期、数据来源与验证状态。样本过少时只展示“样本不足”，不制造精确排名。

## 4. 采集来源

`manual`（人工填报）、`app`（手机 App）、`video`（视频辅助）、`device`（授权设备/遥测）。首版只启用 `manual`。

## 5. 数据质量

每条数据带有 `verificationStatus`、`evidenceLevel`、`source`、`createdAt` 和 `updatedAt`。后端上线后增加去重哈希、审核日志、提交频率限制和举报流程。

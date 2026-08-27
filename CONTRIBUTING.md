# 贡献与版本管理

## 分支

- `master`：稳定主线
- `codex/<topic>`：功能、修复或文档分支

## 提交

提交信息使用清晰的动词开头，例如：

```text
feat: add trip submission flow
fix: correct release filter stats
docs: update data standard
```

每次提交前运行 `npm run build`。合并到主线前应通过 GitHub Actions 的 Build 检查。

## Release Note（强制）

每一次版本变更都必须新增或更新 `docs/releases/vX.Y.Z.md`，不能只依赖 Git commit message。Release Note 至少说明：

- 新增、改进和修复内容
- 数据标准、API 或数据库迁移是否变化
- 隐私与安全影响
- 构建、交互和迁移验证结果
- 已知限制与下一步

发布版本前，Release Note 必须与代码、文档和迁移脚本在同一个 PR 中提交。模板见 `docs/RELEASE_NOTES_TEMPLATE.md`。

## 数据变更

任何字段、事件等级或指标公式变更，都要同步更新 `docs/DATA_STANDARD.md` 和 `docs/PROJECT_MEMORY.md`，并在 PR 描述中说明向后兼容策略。

# Rollouts Dashboard 设计与实现（对齐 Argo 方案）

本文档描述当前 Rollouts Dashboard 的信息架构、交互能力和数据流，覆盖两阶段补齐计划的落地状态。

## 1. 页面与路由

| 路由 | 页面 | 组件 |
|------|------|------|
| `/rollouts` | Rollout 列表 | `RolloutsPage` |
| `/rollouts/[namespace]/[name]` | Rollout 详情 | `RolloutDetailEnhanced` |

## 2. 实时数据模型（Watch 优先 + Polling Fallback）

### 后端
- SSE：
  - `GET /api/v1/rollout/watch/:namespace`
  - `GET /api/v1/rollout/watch/:namespace/:name`
- 事件：`snapshot | upsert | delete | error | heartbeat`
- 事件数据：`{ type, namespace, name, resourceVersion, rollout, ts }`

### 前端
- 新增 `lib/watch-client.ts` 与 `hooks/use-rollouts-watch.ts`
- 固定退避：`1s -> 2s -> 5s -> 10s`
- 连续失败 5 次后切换到 SWR 轮询并提示
- 列表与详情页均采用 Watch 优先模式

## 3. 列表页能力

### 3.1 过滤与检索
- 收藏（localStorage）
- 仅关注（Needs Attention）
- 多状态组合筛选（Progressing / Paused / Healthy / Failed）
- 关键字检索支持：
  - 普通关键字
  - `label:value`
  - 逗号分隔多关键字
- 筛选状态与 URL 查询参数同步

### 3.2 键盘效率
- `/` 聚焦搜索框
- `Shift+H` 打开快捷键帮助弹层

## 4. 详情页能力

### 4.1 操作区
- `RESTART`
- `RETRY`
- `PAUSE`
- `RESUME`
- `DISABLE`
- `ENABLE`（仅在 Disabled 状态展示）
- `PROMOTE`（推进当前步骤）
- `PROMOTE-FULL`（兼容 `approve` 语义）
- `ANALYSIS`（打开分析弹窗）

说明：
- `RESUME` 仅恢复暂停（`spec.paused=false`）。
- `ENABLE` / `DISABLE` 用于独立切换禁用状态（`spec.disabled`）。
- `ABORT` 保留为兼容接口，后端实现等价于 `DISABLE`。

### 4.2 Analysis 占位框架
- API：`GET /api/v1/rollout/:namespace/:name/analysis`
- 弹窗结构：`Summary + Metrics Tabs`
- 无数据源时显示“未接入分析数据源”，不阻断其他功能

### 4.3 Revisions 与回滚
- 回滚接口：`POST /api/v1/rollout/rollback/:namespace/:name`
- 第一阶段仅支持 Deployment
- 非 Deployment：按钮禁用 + tooltip（“当前仅支持 Deployment 回滚”）

### 4.4 容器编辑
- 支持编辑 `containers` 与 `initContainers` 的镜像
- API：`POST /api/v1/rollout/set-image/:namespace/:name`

## 5. Steps 展示增强

`getStepTypeLabel` 扩展支持：
- `analysis`
- `experiment`
- `setCanaryScale`
- `setHeaderRoute`
- `setMirrorRoute`
- `plugin`

步骤卡片支持展开查看原始配置细节（JSON）。

## 6. Feature Flags

前端配置（`lib/config.ts`）：
- `rolloutWatchEnabled`（`NEXT_PUBLIC_ROLLOUT_WATCH_ENABLED`）
- `rolloutAnalysisEnabled`（`NEXT_PUBLIC_ROLLOUT_ANALYSIS_ENABLED`）
- `rollbackEnabled`（`NEXT_PUBLIC_ROLLBACK_ENABLED`）

默认均为启用（变量值不为 `false` 时视为开启）。

## 7. API 与类型增量

### 后端新增
- `GET /rollout/watch/:namespace`
- `GET /rollout/watch/:namespace/:name`
- `POST /rollout/promote/:namespace/:name`
- `POST /rollout/rollback/:namespace/:name`
- `GET /rollout/:namespace/:name/analysis`
- `POST /rollout/set-image/:namespace/:name`
- `POST /rollout/enable/:namespace/:name`
- `POST /rollout/disable/:namespace/:name`

### 前端新增类型
- `RolloutWatchEvent`
- `RolloutAnalysisSummary`
- `RolloutAnalysisRun`
- `RolloutRollbackResponse`

### 错误码增量
- `UNSUPPORTED_ROLLBACK_KIND`
- `WATCH_STREAM_UNAVAILABLE`
- `ANALYSIS_SOURCE_NOT_CONFIGURED`

## 8. 当前状态（计划闭环）

### Phase 1
- 实时 Watch：完成
- Promote 语义拆分：完成
- 回滚到稳定版本（Deployment）：完成
- Analysis 框架占位：完成

### Phase 2
- 列表筛选增强：完成
- 键盘效率：完成
- 高级 Steps 展示：完成
- 容器编辑能力：完成

## 9. 验证建议

1. 列表页创建/更新 Rollout，2 秒内可见变更。
2. 断开 Watch 后观察自动重连，5 次失败后回退轮询。
3. 对比 `PROMOTE` 与 `PROMOTE-FULL` 行为差异。
4. Deployment 回滚后检查 revision 与 Pod 回到 stable。
5. 打开 Analysis 弹窗，验证占位状态与空 runs 展示。

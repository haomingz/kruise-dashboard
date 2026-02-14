# API 接口参考

Kruise Dashboard 后端提供 REST API + SSE Watch，用于管理 Kubernetes 集群中的 OpenKruise 资源。

基础路径：`http://localhost:8080/api/v1`

## 通用说明

### 响应格式

成功响应：

```json
{
  "data": {}
}
```

错误响应：

```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "error message",
  "code": "ERROR_CODE"
}
```

### 常用错误码

| HTTP | code | 说明 |
|------|------|------|
| 400 | `BAD_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未授权 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `ROLLOUT_NOT_PROMOTABLE` | 当前状态不可 Promote |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |
| 501 | `UNSUPPORTED_ROLLBACK_KIND` | 当前仅支持 Deployment 回滚 |
| 503 | `WATCH_STREAM_UNAVAILABLE` | Watch 流不可用 |
| 200 | `ANALYSIS_SOURCE_NOT_CONFIGURED` | Analysis 占位状态，无真实数据源 |

### 路径参数

| 参数 | 说明 |
|------|------|
| `:namespace` | Kubernetes 命名空间 |
| `:name` | 资源名称 |
| `:type` | 工作负载类型 |

---

## Rollout 管理

### 查询接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/rollout/:namespace/:name` | 获取 Rollout 详情 |
| GET | `/rollout/:namespace/:name/pods` | 获取 Pod、Revision、容器信息 |
| GET | `/rollout/status/:namespace/:name` | 获取 Rollout 状态 |
| GET | `/rollout/history/:namespace/:name` | 获取历史 |
| GET | `/rollout/list/:namespace` | 列出命名空间 Rollout |
| GET | `/rollout/active/:namespace` | 列出活跃 Rollout |
| GET | `/rollout/:namespace/:name/analysis` | Analysis 占位数据 |

### 控制接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/rollout/pause/:namespace/:name` | 暂停 |
| POST | `/rollout/resume/:namespace/:name` | 恢复（仅设置 `spec.paused=false`） |
| POST | `/rollout/enable/:namespace/:name` | 启用（设置 `spec.disabled=false`） |
| POST | `/rollout/disable/:namespace/:name` | 禁用（设置 `spec.disabled=true`） |
| POST | `/rollout/restart/:namespace/:name` | 重启 |
| POST | `/rollout/retry/:namespace/:name` | 重试当前步骤 |
| POST | `/rollout/abort/:namespace/:name` | 兼容接口，等价于 `disable` |
| POST | `/rollout/promote/:namespace/:name` | Promote（推进当前步骤，非 full） |
| POST | `/rollout/approve/:namespace/:name` | Promote-Full（兼容旧语义） |
| POST | `/rollout/rollback/:namespace/:name` | 回滚到稳定版本（Phase 1 仅 Deployment） |
| POST | `/rollout/set-image/:namespace/:name` | 修改容器或 initContainer 镜像 |
| POST | `/rollout/undo/:namespace/:name` | 占位接口（未实现） |

### Promote / Promote-Full 语义

- `promote`：继续当前步骤（不跳过全流程）。
- `approve`：保持兼容，作为 `promote-full` 使用。

### Resume / Enable / Disable 语义

- `resume`：仅恢复暂停状态（`spec.paused=false`），不修改 `spec.disabled`。
- `enable`：仅解除禁用状态（`spec.disabled=false`），不修改 `spec.paused`。
- `disable`：设置 `spec.disabled=true`。
- `abort`：兼容旧调用，当前实现直接复用 `disable`。

### Rollback 语义（Phase 1）

- 仅支持 `workloadRef.kind=Deployment`。
- 非 Deployment 返回：`501 + UNSUPPORTED_ROLLBACK_KIND`。
- 回滚流程：读取 `status.canaryStatus.stableRevision` -> 找到 stable ReplicaSet -> 用 stable `spec.template` 覆盖 Deployment 模板。

### Set Image 请求体

```json
{
  "container": "app",
  "image": "nginx:1.27.0",
  "initContainer": false
}
```

---

## Rollout Watch（SSE）

### 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/rollout/watch/:namespace` | 监听命名空间 Rollout |
| GET | `/rollout/watch/:namespace/:name` | 监听单个 Rollout |

### 事件类型

- `snapshot`
- `upsert`
- `delete`
- `error`
- `heartbeat`

### SSE 事件数据格式

```text
event: upsert
data: {"type":"rollout","namespace":"default","name":"demo","resourceVersion":"12345","rollout":{},"ts":"2026-02-13T12:00:00Z"}
```

其中：
- `type` 固定为 `rollout`
- `rollout` 在 `heartbeat` / 某些 `error` 事件中可能为 `null`

---

## Analysis 占位接口

### `GET /rollout/:namespace/:name/analysis`

返回结构：

```json
{
  "data": {
    "source": "placeholder",
    "status": "not_configured",
    "code": "ANALYSIS_SOURCE_NOT_CONFIGURED",
    "summary": "Analysis data source is not configured yet",
    "runs": []
  }
}
```

`status` 枚举约定：`not_configured | pending | running | completed`

---

## 集群 / 命名空间 / 工作负载

### 集群
- `GET /cluster/metrics`

### 命名空间
- `GET /namespaces`

### 工作负载
- `GET /workload/:namespace`
- `GET /workload/:namespace/:type`
- `GET /workload/:namespace/:type/:name`
- `GET /workload/:namespace/:type/:name/pods`
- `POST /workload/:namespace/:type/:name/scale?replicas=N`
- `POST /workload/:namespace/:type/:name/restart`
- `DELETE /workload/:namespace/:type/:name`

---

## 前端 API 映射（核心新增）

`openkruise-dashboard/api/rollout.ts` 已新增：
- `pauseRollout`
- `resumeRollout`
- `enableRollout`
- `disableRollout`
- `abortRollout`
- `retryRollout`
- `promoteRollout`
- `approveRollout`
- `rollbackRollout`
- `restartRollout`
- `watchRollouts`
- `watchRollout`
- `getRolloutAnalysis`
- `setRolloutImage`

> 返回 [项目主页](../README.md)

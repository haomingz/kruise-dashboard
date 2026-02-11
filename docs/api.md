# API 接口参考

Kruise Dashboard 后端提供 RESTful API，用于管理 Kubernetes 集群中的 OpenKruise 资源。

**基础路径**：`http://localhost:8080/api/v1`

## 通用说明

### 响应格式

**成功响应**：

```json
{
  "data": { ... }
}
```

**错误响应**：

```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

### 错误码

| HTTP 状态码 | code | 说明 |
|-------------|------|------|
| 400 | `BAD_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未授权 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

### 路径参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `:namespace` | Kubernetes 命名空间 | `default`、`production` |
| `:name` | 资源名称 | `my-cloneset`、`my-rollout` |
| `:type` | 工作负载类型 | `cloneset`、`statefulset`、`daemonset`、`deployment`、`broadcastjob`、`advancedcronjob` |

---

## 集群

### 获取集群指标

```
GET /cluster/metrics
```

获取 Kubernetes 集群的资源使用和性能指标。

**响应示例**：

```json
{
  "data": {
    "nodes": 3,
    "cpu_usage": "45%",
    "memory_usage": "62%",
    "pod_count": 128
  }
}
```

---

## 命名空间

### 列出所有命名空间

```
GET /namespaces
```

列出 Kubernetes 集群中所有命名空间的名称。

**响应示例**：

```json
{
  "data": ["default", "kube-system", "kruise-system", "production"]
}
```

---

## Rollout 管理

### 获取 Rollout 详情

```
GET /rollout/:namespace/:name
```

获取指定 Rollout 的完整信息。

**请求示例**：

```
GET /api/v1/rollout/default/my-rollout
```

### 获取 Rollout 状态

```
GET /rollout/status/:namespace/:name
```

获取 Rollout 的当前状态。

**请求示例**：

```
GET /api/v1/rollout/status/default/my-rollout
```

### 获取 Rollout 历史

```
GET /rollout/history/:namespace/:name
```

获取 Rollout 的版本历史记录。

**请求示例**：

```
GET /api/v1/rollout/history/default/my-rollout
```

### 暂停 Rollout

```
POST /rollout/pause/:namespace/:name
```

暂停正在进行中的 Rollout。

**请求示例**：

```
POST /api/v1/rollout/pause/default/my-rollout
```

### 恢复 Rollout

```
POST /rollout/resume/:namespace/:name
```

恢复已暂停的 Rollout，继续执行发布。

**请求示例**：

```
POST /api/v1/rollout/resume/default/my-rollout
```

### 回滚 Rollout

```
POST /rollout/undo/:namespace/:name
```

撤销当前 Rollout，回滚到上一个版本。

**请求示例**：

```
POST /api/v1/rollout/undo/default/my-rollout
```

### 重启 Rollout

```
POST /rollout/restart/:namespace/:name
```

重启 Rollout。

**请求示例**：

```
POST /api/v1/rollout/restart/default/my-rollout
```

### 审批 Rollout

```
POST /rollout/approve/:namespace/:name
```

审批等待确认的 Rollout 步骤，允许发布继续进行到下一阶段。

**请求示例**：

```
POST /api/v1/rollout/approve/default/my-rollout
```

### 列出所有 Rollout

```
GET /rollout/list/:namespace
```

列出指定命名空间内的所有 Rollout。

**请求示例**：

```
GET /api/v1/rollout/list/default
```

### 列出活跃的 Rollout

```
GET /rollout/active/:namespace
```

列出指定命名空间内正在进行中的 Rollout。

**请求示例**：

```
GET /api/v1/rollout/active/default
```

---

## 工作负载管理

### 列出所有工作负载

```
GET /workload/:namespace
```

列出指定命名空间内的所有 OpenKruise 工作负载（包含所有支持的类型）。

**请求示例**：

```
GET /api/v1/workload/default
```

### 获取工作负载详情

```
GET /workload/:namespace/:type/:name
```

获取指定工作负载的完整信息。

**请求示例**：

```
GET /api/v1/workload/default/cloneset/my-cloneset
```

### 按类型列出工作负载

```
GET /workload/:namespace/:type
```

列出指定命名空间内特定类型的所有工作负载。

**请求示例**：

```
GET /api/v1/workload/default/cloneset
```

### 获取工作负载的 Pod 列表

```
GET /workload/:namespace/:type/:name/pods
```

获取指定工作负载管理的所有 Pod 的详细信息。

**请求示例**：

```
GET /api/v1/workload/default/cloneset/my-cloneset/pods
```

### 扩缩容工作负载

```
POST /workload/:namespace/:type/:name/scale?replicas=N
```

调整工作负载的副本数。

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `replicas` | integer | 是 | 目标副本数 |

**请求示例**：

```
POST /api/v1/workload/default/cloneset/my-cloneset/scale?replicas=5
```

> 注意：仅 `deployment`、`cloneset`、`statefulset` 类型支持扩缩容。

### 重启工作负载

```
POST /workload/:namespace/:type/:name/restart
```

重启指定的工作负载（触发滚动更新）。

**请求示例**：

```
POST /api/v1/workload/default/cloneset/my-cloneset/restart
```

> 注意：`broadcastjob` 和 `advancedcronjob` 类型不支持重启。

### 删除工作负载

```
DELETE /workload/:namespace/:type/:name
```

删除指定的工作负载。

**请求示例**：

```
DELETE /api/v1/workload/default/cloneset/my-cloneset
```

---

## 支持的工作负载类型

| `:type` 值 | Kubernetes 资源 | API Group | API Version | 可扩缩 | 可重启 |
|-------------|----------------|-----------|-------------|--------|--------|
| `deployment` | Deployment | `apps` | `v1` | Yes | Yes |
| `cloneset` | CloneSet | `apps.kruise.io` | `v1alpha1` | Yes | Yes |
| `statefulset` | StatefulSet | `apps.kruise.io` | `v1beta1` | Yes | Yes |
| `daemonset` | DaemonSet | `apps.kruise.io` | `v1alpha1` | No | Yes |
| `broadcastjob` | BroadcastJob | `apps.kruise.io` | `v1alpha1` | No | No |
| `advancedcronjob` | AdvancedCronJob | `apps.kruise.io` | `v1alpha1` | No | No |

---

## 前端 API 客户端

前端通过 `api/` 目录下的模块调用这些接口：

| 模块 | 函数 | 对应端点 |
|------|------|----------|
| `cluster.ts` | `getClusterMetrics()` | `GET /cluster/metrics` |
| `namespace.ts` | `listNamespaces()` | `GET /namespaces` |
| `workload.ts` | `listAllWorkloads(namespace)` | `GET /workload/:namespace` |
| `workload.ts` | `getWorkload(namespace, type, name)` | `GET /workload/:namespace/:type/:name` |
| `workload.ts` | `listWorkloads(namespace, type)` | `GET /workload/:namespace/:type` |
| `workload.ts` | `getWorkloadWithPods(namespace, type, name)` | `GET /workload/:namespace/:type/:name/pods` |
| `workload.ts` | `scaleWorkload(namespace, type, name, replicas)` | `POST /workload/.../scale` |
| `workload.ts` | `restartWorkload(namespace, type, name)` | `POST /workload/.../restart` |
| `workload.ts` | `deleteWorkload(namespace, type, name)` | `DELETE /workload/:namespace/:type/:name` |
| `rollout.ts` | `getRollout(namespace, name)` | `GET /rollout/:namespace/:name` |
| `rollout.ts` | `getRolloutStatus(namespace, name)` | `GET /rollout/status/:namespace/:name` |
| `rollout.ts` | `getRolloutHistory(namespace, name)` | `GET /rollout/history/:namespace/:name` |
| `rollout.ts` | `pauseRollout(namespace, name)` | `POST /rollout/pause/:namespace/:name` |
| `rollout.ts` | `resumeRollout(namespace, name)` | `POST /rollout/resume/:namespace/:name` |
| `rollout.ts` | `undoRollout(namespace, name)` | `POST /rollout/undo/:namespace/:name` |
| `rollout.ts` | `restartRollout(namespace, name)` | `POST /rollout/restart/:namespace/:name` |
| `rollout.ts` | `approveRollout(namespace, name)` | `POST /rollout/approve/:namespace/:name` |
| `rollout.ts` | `listAllRollouts(namespace)` | `GET /rollout/list/:namespace` |
| `rollout.ts` | `listActiveRollouts(namespace)` | `GET /rollout/active/:namespace` |

---

> 返回 [项目主页](../README.md)

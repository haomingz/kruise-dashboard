# OpenKruise Dashboard — 后端

Go 后端 API 服务，为 Kruise Dashboard 前端提供 Kubernetes 集群中 OpenKruise 资源的管理接口。

## 快速启动

```bash
# 安装依赖
go mod download

# 启动开发服务（自动 fmt + vet）
make run

# 或直接运行
go run main.go
```

服务启动于 `http://localhost:8080`

## 环境变量

在项目根目录创建 `.env` 文件（可参考 `.env.example`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `8080` |
| `GIN_MODE` | Gin 运行模式（`debug` / `release`） | `release` |
| `LOG_LEVEL` | 日志级别（`debug` / `info` / `warn` / `error`） | `info` |
| `ALLOWED_ORIGINS` | CORS 允许的前端源，多个用逗号分隔 | `http://localhost:3000` |

## 项目结构

```
openkruise-backend/
├── main.go                          # 入口文件，Gin 路由配置
├── handlers/                        # HTTP 请求处理器
│   ├── k8s.go                       # Kubernetes 客户端初始化 & 集群指标
│   ├── rollout.go                   # Rollout 管理端点
│   ├── workload.go                  # 工作负载管理端点
│   ├── workload_types.go            # 工作负载类型注册表（GVR 映射）
│   └── workload_types_test.go       # 类型注册表单元测试
├── pkg/                             # 共享包
│   ├── logger/                      # 结构化日志
│   │   └── logger.go                # Zap 日志初始化，支持环境变量配置
│   └── response/                    # 统一 API 响应
│       ├── response.go              # Success / Error / BadRequest 等辅助函数
│       └── response_test.go         # 响应格式测试
├── Makefile                         # 构建和开发任务
├── .env.example                     # 环境变量模板
├── go.mod                           # Go 模块依赖
└── go.sum                           # 依赖校验
```

## 开发命令

```bash
make run              # 格式化 + 静态检查 + 启动服务
make build-binary     # 编译可执行文件
make test             # 运行测试（含覆盖率）
make fmt              # 代码格式化 (go fmt)
make vet              # 静态检查 (go vet)
make docker-build     # 构建 Docker 镜像
make docker-push      # 推送 Docker 镜像
```

## 支持的工作负载类型

工作负载类型通过 `workload_types.go` 中的注册表统一管理：

| 类型 | API Group | Version | 可扩缩 | 可重启 |
|------|-----------|---------|--------|--------|
| `deployment` | `apps` | `v1` | Yes | Yes |
| `cloneset` | `apps.kruise.io` | `v1alpha1` | Yes | Yes |
| `statefulset` | `apps.kruise.io` | `v1beta1` | Yes | Yes |
| `daemonset` | `apps.kruise.io` | `v1alpha1` | No | Yes |
| `broadcastjob` | `apps.kruise.io` | `v1alpha1` | No | No |
| `advancedcronjob` | `apps.kruise.io` | `v1alpha1` | No | No |

## API 端点

基础路径：`/api/v1`

**集群**
- `GET /cluster/metrics` — 集群性能指标

**Rollout 管理**
- `GET /rollout/:namespace/:name` — 获取 Rollout 详情
- `GET /rollout/:namespace/:name/pods` — 获取 Pod + Revision + 容器信息
- `GET /rollout/watch/:namespace` — SSE 监听命名空间 Rollout 变更
- `GET /rollout/watch/:namespace/:name` — SSE 监听单个 Rollout 变更
- `GET /rollout/status/:namespace/:name` — Rollout 状态
- `GET /rollout/history/:namespace/:name` — Rollout 历史
- `GET /rollout/:namespace/:name/analysis` — Analysis 占位信息
- `POST /rollout/pause/:namespace/:name` — 暂停 Rollout
- `POST /rollout/resume/:namespace/:name` — 恢复 Rollout（仅设置 `spec.paused=false`）
- `POST /rollout/enable/:namespace/:name` — 启用 Rollout（设置 `spec.disabled=false`）
- `POST /rollout/disable/:namespace/:name` — 禁用 Rollout（设置 `spec.disabled=true`）
- `POST /rollout/undo/:namespace/:name` — 占位接口（未实现）
- `POST /rollout/restart/:namespace/:name` — 重启 Rollout
- `POST /rollout/promote/:namespace/:name` — Promote（推进当前步骤）
- `POST /rollout/approve/:namespace/:name` — Promote-Full（兼容语义）
- `POST /rollout/abort/:namespace/:name` — 兼容接口，当前等价于 `disable`
- `POST /rollout/retry/:namespace/:name` — Retry（重试步骤）
- `POST /rollout/rollback/:namespace/:name` — 回滚到稳定版本（Phase 1 仅 Deployment）
- `POST /rollout/set-image/:namespace/:name` — 更新容器/initContainer 镜像
- `GET /rollout/list/:namespace` — 列出命名空间内所有 Rollout
- `GET /rollout/active/:namespace` — 列出活跃的 Rollout

**工作负载管理**
- `GET /workload/:namespace` — 列出命名空间内所有工作负载
- `GET /workload/:namespace/:type/:name` — 获取工作负载详情
- `GET /workload/:namespace/:type` — 按类型列出工作负载
- `GET /workload/:namespace/:type/:name/pods` — 获取工作负载的 Pod 列表
- `POST /workload/:namespace/:type/:name/scale?replicas=N` — 扩缩容
- `POST /workload/:namespace/:type/:name/restart` — 重启工作负载
- `DELETE /workload/:namespace/:type/:name` — 删除工作负载

> 完整的 API 文档请参见 [docs/api.md](../docs/api.md)

## 测试

```bash
# 运行所有测试并生成覆盖率报告
make test

# 仅运行测试
go test ./...
```

## Kubernetes 要求

- 集群已安装 [OpenKruise](https://openkruise.io/)
- 有效的 kubeconfig 文件（默认路径 `~/.kube/config`）
- RBAC 权限需包含对 `apps.kruise.io` 和 `rollouts.kruise.io` 资源组的读写权限

## 关键设计

- **单例客户端**：Kubernetes 客户端在启动时初始化一次（`handlers.InitK8sClient()`），不要重复初始化
- **动态客户端**：使用 `k8s.io/client-go/dynamic` 操作 OpenKruise CRD
- **统一响应**：所有 API 返回通过 `pkg/response` 统一格式，错误响应包含 `trace_id`
- **结构化日志**：使用 Uber Zap，输出 JSON 格式日志

---

> 返回 [项目主页](../README.md)

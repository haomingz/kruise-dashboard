# Kruise Dashboard

OpenKruise 工作负载可视化管理平台。提供对 CloneSet、Advanced StatefulSet、Advanced DaemonSet、BroadcastJob、AdvancedCronJob 等 Kruise 自定义资源的全面管理能力。

## 功能特性

- **工作负载管理**：查看、扩缩容、重启、删除 OpenKruise 工作负载
- **发布管理**：监控和控制渐进式发布（Rollout），支持暂停、恢复、启用、禁用、回滚、Promote / Promote-Full
- **集群监控**：实时查看集群资源使用和性能指标
- **Namespace 切换**：全局命名空间选择器，快速在不同命名空间间切换
- **Pod 管理**：查看每个工作负载的 Pod 详情和状态
- **现代化 UI**：基于 Next.js 16 + React 19 + shadcn/ui 构建

## 技术栈

| 模块 | 技术 | 版本 |
|------|------|------|
| 后端框架 | Go + Gin | Go 1.22 / Gin 1.9 |
| 前端框架 | Next.js (App Router + Turbopack) | 16.1 |
| UI 框架 | React + TypeScript | React 19 / TS 5.9 |
| 样式 | Tailwind CSS + shadcn/ui | Tailwind 4.1 |
| 数据请求 | Axios + SWR | Axios 1.13 / SWR 2.4 |
| 测试 | Vitest + React Testing Library / Go test | - |
| 日志 | Uber Zap（结构化 JSON） | - |
| 包管理 | pnpm (workspace) | 10+ |
| Kubernetes | client-go (动态客户端) | 0.29 |

## 项目结构

```
kruise-dashboard/
├── package.json                     # pnpm workspace 根配置
├── pnpm-workspace.yaml              # workspace 定义
├── openkruise-backend/              # Go 后端 API 服务
│   ├── main.go                      # 入口文件，路由定义，godotenv 加载
│   ├── handlers/                    # HTTP 请求处理器
│   │   ├── k8s.go                   # Kubernetes 客户端初始化 + Namespace 列表
│   │   ├── rollout.go               # Rollout 管理接口
│   │   ├── workload.go              # 工作负载管理接口
│   │   ├── workload_types.go        # 工作负载类型注册表
│   │   └── workload_types_test.go   # 类型注册表测试
│   ├── pkg/                         # 共享包
│   │   ├── logger/                  # Zap 结构化日志
│   │   └── response/                # 统一 API 响应格式
│   ├── Makefile                     # 构建和开发任务
│   └── .env.example                 # 环境变量模板
├── openkruise-dashboard/            # Next.js 前端应用
│   ├── app/                         # App Router 页面
│   │   ├── rollouts/[namespace]/[name]/  # Rollout 详情页
│   │   └── workloads/[type]/[namespace]/[name]/  # 工作负载详情页
│   ├── components/                  # React 组件
│   │   ├── namespace-selector.tsx   # Namespace 切换选择器
│   │   ├── namespace-provider.tsx   # Namespace Context Provider
│   │   └── ui/                      # shadcn/ui 基础组件
│   ├── api/                         # API 客户端层
│   ├── hooks/                       # SWR 数据请求 Hooks
│   ├── lib/                         # 工具函数和配置
│   ├── vitest.config.ts             # 测试配置
│   └── package.json                 # Node.js 依赖
└── docs/                            # 项目文档
    ├── api.md                       # API 接口参考
    ├── architecture.md              # 系统架构文档
    └── deployment.md                # 部署指南
```

## 快速开始

### 环境要求

- **Go** 1.22+
- **Node.js** 18+
- **pnpm** 10+
- **Kubernetes 集群**：已安装 [OpenKruise](https://openkruise.io/)
- **kubectl**：已配置集群访问

### 1. 克隆仓库

```bash
git clone https://github.com/openkruise/kruise-dashboard.git
cd kruise-dashboard
```

### 2. 启动后端

```bash
cd openkruise-backend
cp .env.example .env       # 按需修改环境变量
go mod download
make run
```

后端服务默认启动于 `http://localhost:8080`（可通过 `PORT` 环境变量修改）。

### 3. 启动前端

```bash
# 在项目根目录
pnpm install
cd openkruise-dashboard
pnpm dev
```

前端服务启动于 `http://localhost:3000`，打开浏览器访问即可。

> 如果端口 3000 被占用（如 Windows Hyper-V 端口保留），可在 `package.json` 中修改 `dev` 脚本添加 `--port 3500`。

## 环境变量

### 后端

在 `openkruise-backend/` 目录下创建 `.env` 文件（可参考 `.env.example`）。后端使用 [godotenv](https://github.com/joho/godotenv) 自动加载 `.env` 文件：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `8080` |
| `GIN_MODE` | Gin 运行模式（`debug` / `release`） | `release` |
| `LOG_LEVEL` | 日志级别（`debug` / `info` / `warn` / `error`） | `info` |
| `ALLOWED_ORIGINS` | CORS 允许的前端源，多个用逗号分隔 | `http://localhost:3000` |

### 前端

在 `openkruise-dashboard/` 目录下创建 `.env.local` 文件：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_DEFAULT_NAMESPACE` | 默认 Kubernetes 命名空间 | `default` |

## Docker 部署

### 构建后端镜像

```bash
cd openkruise-backend
make docker-build
```

### 运行

```bash
docker run -p 8080:8080 \
  -v ~/.kube/config:/root/.kube/config:ro \
  -e GIN_MODE=release \
  -e ALLOWED_ORIGINS=http://your-frontend-domain \
  ringtail/kruise-dashboard-backend:latest
```

> 详细部署说明请参见 [docs/deployment.md](docs/deployment.md)

## API 概览

后端提供 RESTful API，基础路径为 `/api/v1`。所有成功响应包裹在 `{"data": ...}` 信封中。

| 分组 | 端点示例 | 说明 |
|------|----------|------|
| 集群 | `GET /cluster/metrics` | 集群性能指标 |
| 命名空间 | `GET /namespaces` | 列出所有命名空间 |
| 发布 | `GET /rollout/list/:namespace` | 列出所有 Rollout |
| 工作负载 | `GET /workload/:namespace` | 列出所有工作负载 |

支持的工作负载类型：`cloneset`、`statefulset`、`daemonset`、`deployment`、`broadcastjob`、`advancedcronjob`

> 完整 API 文档请参见 [docs/api.md](docs/api.md)

## 前端路由

| 路径 | 说明 |
|------|------|
| `/` | Dashboard 首页 |
| `/rollouts/:namespace/:name` | Rollout 详情页 |
| `/workloads/:type/:namespace/:name` | 工作负载详情页 |

## 测试

### 后端测试

```bash
cd openkruise-backend
make test        # 运行测试并生成覆盖率报告
```

### 前端测试

```bash
cd openkruise-dashboard
pnpm test              # 运行所有测试
pnpm test:watch        # 监听模式
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -m "feat: add my feature"`
4. 推送分支：`git push origin feature/my-feature`
5. 发起 Pull Request

### 开发规范

- 后端遵循 Go 标准项目布局，使用 `go fmt` 和 `go vet`
- 前端使用 TypeScript 严格模式，ESLint + Prettier 格式化
- 提交信息建议使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范

## 相关文档

- [API 接口参考](docs/api.md)
- [系统架构](docs/architecture.md)
- [部署指南](docs/deployment.md)
- [Rollouts Dashboard 设计](docs/rollouts-dashboard-design.md)
- [后端开发文档](openkruise-backend/README.md)
- [前端开发文档](openkruise-dashboard/README.md)

## 许可证

本项目遵循 MIT 许可证 — 详见 [LICENSE](LICENSE) 文件。

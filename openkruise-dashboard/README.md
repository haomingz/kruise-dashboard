# OpenKruise Dashboard — 前端

基于 Next.js 16 构建的 OpenKruise 工作负载管理界面，提供实时监控和操作能力。

## 功能

- 实时查看 CloneSet、StatefulSet、DaemonSet、BroadcastJob 等工作负载
- 渐进式发布（Rollout）的监控与控制
- Rollout 支持独立启用/禁用（`enable` / `disable`）与暂停/恢复（`pause` / `resume`）分离控制
- Rollout Watch（SSE）优先 + 自动回退轮询
- Promote / Promote-Full 语义拆分
- Rollback（第一阶段支持 Deployment）
- Analysis 占位弹窗（Summary + Metrics）
- Rollout 列表高级筛选（收藏、Needs Attention、多状态、label:value、多关键字）
- 键盘快捷键（`/` 聚焦搜索、`Shift+H` 打开快捷键帮助）
- 容器与 initContainer 镜像编辑
- Workload 表格支持变体（`WorkloadTable` / `WorkloadTableWithoutImage`）
- 工作负载扩缩容、重启、删除操作
- Pod 详情和状态查看
- 集群资源使用概览

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_DEFAULT_NAMESPACE=default
NEXT_PUBLIC_ROLLOUT_WATCH_ENABLED=true
NEXT_PUBLIC_ROLLOUT_ANALYSIS_ENABLED=true
NEXT_PUBLIC_ROLLBACK_ENABLED=true
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

> 前端依赖后端 API 服务，请确保后端已启动。参见 [后端文档](../openkruise-backend/README.md)。

## 项目结构

```
openkruise-dashboard/
├── app/                             # Next.js App Router 页面
│   ├── layout.tsx                   # 根布局（字体、元数据）
│   ├── page.tsx                     # 首页（Dashboard）
│   ├── rollouts/page.tsx            # Rollout 列表页
│   ├── rollouts/[namespace]/[name]/page.tsx
│   └── workloads/[type]/[namespace]/[name]/page.tsx
├── components/                      # React 组件
│   ├── dashboard-header.tsx         # 顶部导航
│   ├── dashboard-page.tsx           # 页面布局
│   ├── dashboard-shell.tsx          # 外壳组件
│   ├── main-nav.tsx                 # 主导航栏
│   ├── overview.tsx                 # 集群概览
│   ├── recent-activity.tsx          # 最近活动
│   ├── rollouts-page.tsx            # Rollout 列表（watch + 筛选 + 快捷键）
│   ├── rollout-card.tsx             # Rollout 卡片
│   ├── rollout-detail-enhanced.tsx  # Rollout 详情页
│   ├── rollout-analysis-modal.tsx   # Analysis 弹窗
│   ├── rollout-revisions.tsx        # Revisions + rollback 入口
│   ├── rollout-containers.tsx       # 容器镜像编辑
│   ├── rollout-steps-pipeline.tsx   # Steps 流水线
│   ├── workload-cards.tsx           # 工作负载卡片
│   ├── workload-detail.tsx          # 工作负载详情
│   ├── workload-table.tsx           # 工作负载表格（含 with-image / without-image 变体）
│   ├── workload-table.test.tsx      # 表格组件测试
│   ├── workload-tabs.tsx            # 工作负载标签页（按类型选择表格变体）
│   └── ui/                          # shadcn/ui 基础组件
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── collapsible.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── progress.tsx
│       ├── sheet.tsx
│       ├── table.tsx
│       └── tabs.tsx
├── api/                             # API 客户端层
│   ├── axiosInstance.ts             # Axios 实例配置
│   ├── cluster.ts                   # 集群指标 API
│   ├── rollout.ts                   # Rollout 管理 API（含 enable/disable/watch/promote/rollback/analysis）
│   ├── workload.ts                  # 工作负载管理 API
│   └── namespace.ts                 # 命名空间 API
├── hooks/                           # SWR 数据请求 Hooks
│   ├── use-cluster.ts               # useClusterMetrics()
│   ├── use-workloads.ts             # useAllWorkloads(), useWorkloadWithPods()
│   ├── use-rollouts.ts              # Rollout SWR hooks
│   ├── use-rollouts-watch.ts        # Rollout SSE watch hook
│   └── use-rollout-analysis.ts      # Analysis hook
├── lib/                             # 工具函数
│   ├── config.ts                    # 应用配置（含 feature flags）
│   ├── watch-client.ts              # SSE watch 客户端
│   ├── config.test.ts               # 配置测试
│   ├── rollout-utils.ts             # Rollout 转换与步骤标签
│   └── utils.ts                     # 通用工具函数
├── vitest.config.ts                 # Vitest 测试配置
├── vitest.setup.ts                  # 测试环境初始化
├── tailwind.config.js               # Tailwind CSS 配置
├── components.json                  # shadcn/ui 配置
├── tsconfig.json                    # TypeScript 配置
└── package.json                     # 依赖和脚本
```

## 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router + Turbopack) | 16.1.6 |
| UI 库 | React | 19.2.4 |
| 语言 | TypeScript (严格模式) | 5.9.3 |
| 样式 | Tailwind CSS | 4.1.18 |
| UI 组件 | shadcn/ui (Radix UI) | - |
| 图标 | Lucide React | 0.563.0 |
| HTTP 客户端 | Axios | 1.13.5 |
| 数据请求 | SWR + SSE Watch fallback | 2.4.0 |
| 测试 | Vitest + React Testing Library | Vitest 4.0 |
| 格式化 | Prettier + ESLint | - |

## 可用脚本

```bash
npm run dev            # 启动开发服务器（Turbopack）
npm run build          # 生产环境构建
npm start              # 启动生产服务器
npm run lint           # 运行 ESLint
npm test               # 运行所有测试
npm run test:watch     # 测试监听模式
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_DEFAULT_NAMESPACE` | 默认 Kubernetes 命名空间 | `default` |
| `NEXT_PUBLIC_ROLLOUT_WATCH_ENABLED` | 启用 Rollout Watch | `true` |
| `NEXT_PUBLIC_ROLLOUT_ANALYSIS_ENABLED` | 启用 Analysis UI | `true` |
| `NEXT_PUBLIC_ROLLBACK_ENABLED` | 启用 Rollback 按钮 | `true` |

## 开发指南

### 组件开发

- 默认使用 Server Components，交互组件添加 `"use client"` 指令
- UI 基础组件使用 shadcn/ui（位于 `components/ui/`）
- 新组件放在 `components/` 目录下

### API 调用

- 所有 API 调用通过 `api/` 目录封装，不要内联使用 fetch 或 axios
- Axios 实例在 `api/axiosInstance.ts` 中配置，默认超时 10 秒
- 使用 `hooks/` 目录下的 SWR Hooks 获取数据
- Rollout 页面优先使用 SSE Watch，失败后自动回退 SWR 轮询

### 添加新功能

1. 在 `api/` 中添加 API 客户端函数
2. 在 `hooks/` 中创建 SWR Hook
3. 在 `components/` 中创建 React 组件
4. 在 `app/` 中添加页面路由

## 测试

项目使用 Vitest + React Testing Library 进行测试。

```bash
npm test               # 运行所有测试
npm run test:watch     # 监听模式，修改文件后自动运行
```

测试文件放在被测文件同目录，命名为 `*.test.ts(x)`。

## API 集成

Dashboard 通过 Axios 与后端 API 通信，基础路径为 `http://localhost:8080/api/v1`（可通过环境变量配置）。

主要 API 模块：
- `cluster.ts` — 集群指标
- `workload.ts` — 工作负载 CRUD 操作
- `rollout.ts` — Rollout 管理操作

> 完整 API 文档请参见 [docs/api.md](../docs/api.md)

## 故障排查

### 无法连接后端

1. 确认后端已启动：`cd ../openkruise-backend && make run`
2. 检查 `NEXT_PUBLIC_API_BASE_URL` 环境变量
3. 检查后端 CORS 配置是否包含 `http://localhost:3000`

### 构建错误

```bash
# 清除缓存并重新构建
rm -rf .next node_modules
npm install
npm run build
```

---

> 返回 [项目主页](../README.md) | [后端文档](../openkruise-backend/README.md)

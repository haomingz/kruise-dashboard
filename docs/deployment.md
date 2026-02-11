# 部署指南

## 本地开发

最简单的启动方式，适用于开发调试。

### 后端

```bash
cd openkruise-backend
cp .env.example .env       # 首次运行时创建并按需修改
go mod download
make run
```

后端默认监听 8080 端口，可通过 `.env` 中的 `PORT` 变量修改。

### 前端

```bash
# 在项目根目录安装依赖
pnpm install

# 启动开发服务器
cd openkruise-dashboard
pnpm dev
```

> 确保本地已配置好 kubeconfig 且能访问安装了 OpenKruise 的 Kubernetes 集群。
> 如果前端端口不是 3000，需在后端 `.env` 的 `ALLOWED_ORIGINS` 中添加对应源。

---

## Docker 部署

### 构建后端镜像

```bash
cd openkruise-backend
make docker-build
```

默认镜像名格式：`ringtail/kruise-dashboard-backend:<version>-<git-commit>`

自定义镜像名：

```bash
make docker-build PREFIX=your-registry VERSION=v1.0
```

### 运行后端容器

```bash
docker run -d \
  --name kruise-backend \
  -p 8080:8080 \
  -v ~/.kube/config:/root/.kube/config:ro \
  -e GIN_MODE=release \
  -e LOG_LEVEL=info \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  ringtail/kruise-dashboard-backend:v0.1-<commit>
```

**参数说明**：

| 参数 | 说明 |
|------|------|
| `-p 8080:8080` | 映射 API 服务端口 |
| `-v ~/.kube/config:...` | 挂载 kubeconfig（只读） |
| `-e GIN_MODE=release` | 生产模式 |
| `-e ALLOWED_ORIGINS=...` | 设置前端 CORS 源 |

### 构建前端镜像

前端可使用标准的 Next.js Docker 部署方式：

```dockerfile
# Dockerfile 示例
FROM node:18-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY openkruise-dashboard/package.json openkruise-dashboard/
RUN pnpm install --frozen-lockfile
COPY openkruise-dashboard/ openkruise-dashboard/
RUN cd openkruise-dashboard && pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/openkruise-dashboard/.next/standalone ./
COPY --from=builder /app/openkruise-dashboard/.next/static ./.next/static
COPY --from=builder /app/openkruise-dashboard/public ./public

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=http://kruise-backend:8080/api/v1

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t kruise-dashboard-frontend .
docker run -d -p 3000:3000 kruise-dashboard-frontend
```

### 推送镜像

```bash
# 后端
cd openkruise-backend
make docker-push

# 前端（如使用自定义 Dockerfile）
docker push your-registry/kruise-dashboard-frontend:tag
```

---

## Kubernetes 部署

### 前置要求

1. Kubernetes 集群已安装 [OpenKruise](https://openkruise.io/docs/installation)
2. 集群已安装 Metrics Server（用于集群指标接口）
3. 有权限创建 Deployment、Service、ServiceAccount、ClusterRole 等资源

### 部署后端

创建 `deploy-backend.yaml`：

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kruise-dashboard
  namespace: kruise-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kruise-dashboard
rules:
  # OpenKruise 工作负载
  - apiGroups: ["apps.kruise.io"]
    resources:
      - clonesets
      - statefulsets
      - daemonsets
      - broadcastjobs
      - advancedcronjobs
    verbs: ["get", "list", "watch", "update", "patch", "delete"]
  # OpenKruise Rollout
  - apiGroups: ["rollouts.kruise.io"]
    resources:
      - rollouts
    verbs: ["get", "list", "watch", "update", "patch"]
  # 标准 Kubernetes 资源
  - apiGroups: ["apps"]
    resources:
      - deployments
    verbs: ["get", "list", "watch", "update", "patch", "delete"]
  # Pod、Node、Namespace 信息
  - apiGroups: [""]
    resources:
      - pods
      - nodes
      - namespaces
    verbs: ["get", "list", "watch"]
  # Metrics
  - apiGroups: ["metrics.k8s.io"]
    resources:
      - nodes
      - pods
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kruise-dashboard
subjects:
  - kind: ServiceAccount
    name: kruise-dashboard
    namespace: kruise-system
roleRef:
  kind: ClusterRole
  name: kruise-dashboard
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kruise-dashboard-backend
  namespace: kruise-system
  labels:
    app: kruise-dashboard-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kruise-dashboard-backend
  template:
    metadata:
      labels:
        app: kruise-dashboard-backend
    spec:
      serviceAccountName: kruise-dashboard
      containers:
        - name: backend
          image: ringtail/kruise-dashboard-backend:v0.1
          ports:
            - containerPort: 8080
          env:
            - name: GIN_MODE
              value: "release"
            - name: LOG_LEVEL
              value: "info"
            - name: ALLOWED_ORIGINS
              value: "http://kruise-dashboard-frontend:3000"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /api/v1/cluster/metrics
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/v1/cluster/metrics
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: kruise-dashboard-backend
  namespace: kruise-system
spec:
  selector:
    app: kruise-dashboard-backend
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP
```

```bash
kubectl apply -f deploy-backend.yaml
```

### 部署前端

创建 `deploy-frontend.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kruise-dashboard-frontend
  namespace: kruise-system
  labels:
    app: kruise-dashboard-frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kruise-dashboard-frontend
  template:
    metadata:
      labels:
        app: kruise-dashboard-frontend
    spec:
      containers:
        - name: frontend
          image: your-registry/kruise-dashboard-frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_API_BASE_URL
              value: "http://kruise-dashboard-backend:8080/api/v1"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: kruise-dashboard-frontend
  namespace: kruise-system
spec:
  selector:
    app: kruise-dashboard-frontend
  ports:
    - port: 3000
      targetPort: 3000
  type: ClusterIP
```

```bash
kubectl apply -f deploy-frontend.yaml
```

### 通过 Ingress 暴露访问

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kruise-dashboard
  namespace: kruise-system
spec:
  rules:
    - host: kruise-dashboard.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kruise-dashboard-frontend
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: kruise-dashboard-backend
                port:
                  number: 8080
```

---

## RBAC 权限要求

后端 ServiceAccount 需要以下最小权限：

| API Group | 资源 | 操作 |
|-----------|------|------|
| `apps.kruise.io` | clonesets, statefulsets, daemonsets, broadcastjobs, advancedcronjobs | get, list, watch, update, patch, delete |
| `rollouts.kruise.io` | rollouts | get, list, watch, update, patch |
| `apps` | deployments | get, list, watch, update, patch, delete |
| `""` (core) | pods, nodes, namespaces | get, list, watch |
| `metrics.k8s.io` | nodes, pods | get, list |

## 生产环境建议

### 安全

- 使用 HTTPS（通过 Ingress TLS 或 cert-manager）
- 限制 `ALLOWED_ORIGINS` 为实际前端域名
- 配置 NetworkPolicy 限制后端仅接受前端 Pod 的请求
- 使用最小权限原则配置 RBAC

### 可用性

- 后端建议至少 2 副本用于高可用
- 配置 PodDisruptionBudget
- 设置合理的资源 requests 和 limits

### 监控

- 后端使用结构化 JSON 日志，可直接对接日志采集系统（如 Fluentd、Loki）
- 利用 Kubernetes 原生的 Probe 机制监控服务健康

### 日志级别

| 级别 | 建议使用场景 |
|------|-------------|
| `debug` | 本地开发调试 |
| `info` | 生产环境（默认） |
| `warn` | 仅关注警告和错误 |
| `error` | 最小日志输出 |

---

## 目录导航

- [API 接口参考](api.md)
- [系统架构](architecture.md)
- [项目主页](../README.md)

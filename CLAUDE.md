# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kruise Dashboard is a comprehensive management interface for OpenKruise workloads. It consists of two main components:

- **openkruise-backend/**: Go backend API server (Gin framework, default port 8080)
- **openkruise-dashboard/**: Next.js 16 frontend dashboard (default port 3000)

The project uses a **pnpm workspace** monorepo structure. The backend communicates with Kubernetes clusters using client-go to manage OpenKruise custom resources (CloneSets, Advanced StatefulSets, Advanced DaemonSets, Rollouts). The frontend provides a modern UI for visualizing and controlling these workloads.

## Development Commands

### Setup

```bash
# Install all frontend dependencies (run from project root)
pnpm install
```

### Backend (Go)

All backend commands should be run from the `openkruise-backend/` directory:

```bash
# Run in development mode
make run                  # Formats, vets, and runs the server
go run main.go           # Direct run without checks

# Build
make build-binary        # Builds executable: kruise-game-dashboard-backend
go build -o kruise-dashboard main.go

# Testing
make test                # Runs tests with coverage (fmt + vet + test)
go test ./               # Run tests only

# Code quality
make fmt                 # Format code with go fmt
make vet                 # Run go vet

# Docker
make docker-build        # Build Docker image
make docker-push         # Push Docker image
```

### Frontend (Next.js)

All frontend commands should be run from the `openkruise-dashboard/` directory:

```bash
# Development
pnpm dev                 # Start dev server with Turbopack

# Production
pnpm build               # Build for production
pnpm start               # Start production server

# Code quality
pnpm lint                # Run ESLint

# Testing
pnpm test                # Run tests with Vitest
pnpm test:watch          # Run tests in watch mode
```

## Architecture

### Monorepo Structure

The project uses pnpm workspace. The root `pnpm-workspace.yaml` defines `openkruise-dashboard` as the workspace package. The `.gitignore` is unified at root level (no sub-directory `.gitignore` files).

### Backend Structure

```
openkruise-backend/
├── main.go                 # Entry point, Gin router, godotenv .env loading
├── handlers/               # HTTP request handlers
│   ├── k8s.go             # K8s client init + namespace listing
│   ├── rollout.go         # Rollout management API handlers
│   ├── workload.go        # Workload management API handlers
│   └── workload_types.go  # Workload type registry (GVR mapping)
├── pkg/                    # Shared packages
│   ├── logger/            # Zap structured logger
│   └── response/          # Unified API response envelope
├── go.mod                 # Go module dependencies
├── Makefile               # Build and development tasks
└── .env.example           # Environment variable template
```

**Key Backend Patterns:**
- Handlers follow RESTful conventions with namespace/name parameters
- Kubernetes client is initialized once at startup via `handlers.InitK8sClient()`
- CORS origins configurable via `ALLOWED_ORIGINS` env var (comma-separated)
- Backend loads `.env` files automatically via `godotenv`
- PORT is configurable via env var (default: 8080)
- All responses wrapped in `{"data": ...}` envelope via `pkg/response`
- Module path: `github.com/openkruise/kruise-dashboard/extensions-backend`

### Frontend Structure

```
openkruise-dashboard/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard home (redirect)
│   ├── layout.tsx         # Root layout with NamespaceProvider
│   ├── rollouts/
│   │   └── [namespace]/[name]/   # Rollout detail page
│   └── workloads/
│       └── [type]/[namespace]/[name]/  # Workload detail page
├── components/             # React components
│   ├── dashboard-page.tsx # Dashboard layout with namespace selector
│   ├── namespace-selector.tsx  # Global namespace dropdown
│   ├── namespace-provider.tsx  # Namespace React Context Provider
│   ├── rollout-*.tsx      # Rollout-specific components
│   ├── workload-*.tsx     # Workload-specific components
│   └── ui/                # shadcn/ui components
├── api/                    # API client layer
│   ├── axiosInstance.ts   # Axios config + response envelope interceptor
│   ├── namespace.ts       # Namespace listing API
│   ├── cluster.ts         # Cluster metrics API
│   ├── rollout.ts         # Rollout management API
│   └── workload.ts        # Workload management API
├── hooks/                  # SWR data fetching hooks
│   ├── use-namespace.ts   # Namespace context + list hook
│   ├── use-cluster.ts     # Cluster metrics hook
│   ├── use-workloads.ts   # Workload list/detail hooks
│   └── use-rollouts.ts    # Rollout list/detail hooks
└── lib/                    # Utility functions and config
```

**Key Frontend Patterns:**
- Uses Next.js 16 App Router with React 19 and Turbopack
- `turbopack.root` in `next.config.ts` points to parent dir (required because git root != project root)
- Server Components by default, `"use client"` for interactive components
- API calls go through `api/` directory which uses Axios instance
- Axios response interceptor auto-unwraps backend `{"data": ...}` envelope
- Global namespace state managed via React Context (`NamespaceProvider` wraps the app in layout.tsx)
- SWR hooks in `hooks/` directory handle data fetching with auto-refresh
- UI built with Tailwind CSS 4 and shadcn/ui (Radix UI primitives)
- TypeScript for type safety

### Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `dashboard-page.tsx` | Dashboard home with overview |
| `/rollouts/[namespace]/[name]` | `rollout-detail.tsx` | Rollout detail page |
| `/workloads/[type]/[namespace]/[name]` | `workload-detail.tsx` | Workload detail page |

### API Routes

**Base URL:** `http://localhost:8080/api/v1`

**Cluster & Namespace:**
- `GET /cluster/metrics` - Get cluster performance metrics
- `GET /namespaces` - List all cluster namespaces

**Rollouts:**
- `GET /rollout/:namespace/:name` - Get rollout details
- `GET /rollout/status/:namespace/:name` - Get rollout status
- `GET /rollout/history/:namespace/:name` - Get rollout history
- `POST /rollout/pause/:namespace/:name` - Pause rollout
- `POST /rollout/resume/:namespace/:name` - Resume rollout
- `POST /rollout/undo/:namespace/:name` - Undo rollout
- `POST /rollout/restart/:namespace/:name` - Restart rollout
- `POST /rollout/approve/:namespace/:name` - Approve rollout
- `GET /rollout/list/:namespace` - List all rollouts
- `GET /rollout/active/:namespace` - List active rollouts

**Workloads:**
- `GET /workload/:namespace` - List all workloads
- `GET /workload/:namespace/:type/:name` - Get specific workload
- `GET /workload/:namespace/:type` - List workloads by type
- `GET /workload/:namespace/:type/:name/pods` - Get workload pods
- `POST /workload/:namespace/:type/:name/scale` - Scale workload
- `POST /workload/:namespace/:type/:name/restart` - Restart workload
- `DELETE /workload/:namespace/:type/:name` - Delete workload

Workload types: `cloneset`, `statefulset`, `daemonset`, `deployment`, `broadcastjob`, `advancedcronjob`

## Kubernetes Integration

The backend requires:
- Access to a Kubernetes cluster with OpenKruise installed
- Valid kubeconfig file (default: `~/.kube/config`)
- RBAC permissions to read/write OpenKruise custom resources

The backend uses these Kubernetes client-go libraries:
- `k8s.io/client-go` - Core Kubernetes client
- `k8s.io/apimachinery` - API machinery (metav1, schema, etc.)
- `k8s.io/metrics` - Metrics API for cluster stats

## Important Notes

### Backend Development
- When modifying handlers, ensure proper error handling and return appropriate HTTP status codes
- Kubernetes client is a singleton initialized at startup - don't reinitialize
- All OpenKruise resources use `apps.kruise.io` API group; Rollouts use `rollouts.kruise.io`
- Backend auto-loads `.env` via godotenv; no need to export env vars manually
- All API responses use the `pkg/response` envelope format

### Frontend Development
- Use `pnpm` (not npm/yarn) for all package operations
- Turbopack dev mode configured in `next.config.ts` with `turbopack.root` pointing to monorepo root
- Follow shadcn/ui patterns for new components
- API calls should go through the `api/` directory, not inline fetch/axios
- The Axios interceptor in `axiosInstance.ts` unwraps `{"data": ...}` envelope automatically
- Namespace state is global via React Context - use `useNamespace()` hook
- Route params use multi-segment dynamic routes: `[namespace]/[name]`, not encoded single params
- Update `ALLOWED_ORIGINS` in backend `.env` if frontend port changes

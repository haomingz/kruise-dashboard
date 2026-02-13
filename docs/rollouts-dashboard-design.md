# Rollouts Dashboard - UI Design Architecture

> This document describes the page design architecture for the Rollouts Dashboard,
> including layout, components, data flow, and styling conventions.

---

## 1. Page Routes

| Route                              | Page            | Component                |
|------------------------------------|-----------------|--------------------------|
| `/rollouts`                        | Rollouts List   | `RolloutsPage`           |
| `/rollouts/[namespace]/[name]`     | Rollout Detail  | `RolloutDetailEnhanced`  |

---

## 2. List Page (`/rollouts`) Design

### Layout

```
+--------------------------------------------------+
| [Logo]  Dashboard  Rollouts          | NS: [v]   |  <- Header (MainNav + NamespaceSelector)
|--------------------------------------------------|
|  Rollouts                       [Grid] [Table]   |  <- Title + view toggle
|  Manage your OpenKruise rollout deployments       |
|  +--------------------------------------------+  |
|  | Search rollouts...                          |  |  <- Search bar
|  +--------------------------------------------+  |
|  [All(5)] [Progressing(1)] [Paused(1)] ...       |  <- Status filter buttons with counts
|                                                   |
|  +---------+  +---------+  +---------+           |
|  | Card 1  |  | Card 2  |  | Card 3  |           |  <- Card grid (Grid view)
|  |         |  |         |  |         |           |     grid-cols-1 / md:2 / lg:3
|  +---------+  +---------+  +---------+           |
|                                                   |
|  -- or --                                         |
|                                                   |
|  +--------------------------------------------+  |
|  | Name | Strategy | Status | Progress | Age  |  |  <- Table view
|  | ...  | ...      | ...    | ...      | ...  |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
```

### Features
- **Dual view modes**: Grid (card grid) / Table (data table), toggle via button group
- **Search**: Real-time filter by rollout name
- **Status filter**: All / Progressing / Paused / Healthy / Failed, each button shows count
- **Responsive**: 1 col -> 2 cols -> 3 cols adaptive

---

## 3. Rollout Card Design

### Card Structure

```
+----------------------------------------------+
| rollout-name  >                    sync  [S]  |  <- Header: name (clickable) + sync + status
|----------------------------------------------|
| Strategy    [ Canary ]                        |  <- Strategy badge
| Weight      [ 20 ]                            |  <- Current weight (Canary only, > 0)
| ------------------------------------------   |
| ...demo-6fd76f75b  [check] [stable]  Rev 9   |  <- RS name (truncated) + status + role + rev
| [ok][ok][ok]                                  |  <- Pod status squares (from revision data)
|                                                |
| ...demo-579589c5cd         [canary]  Rev 10   |
| [ok]                                          |
|                                                |
| [RESTART] [PROMOTE-FULL] [ABORT]              |  <- Action buttons (with confirm dialogs)
+----------------------------------------------+
```

### Fallback (no revision data)
When revision data is unavailable, the card falls back to:
```
| Stable  [check]                    3 pods     |
| [ok][ok][ok]                                  |
| Canary                             1 pod      |
| [ok]                                          |
```

### Card Behavior
- Click name -> navigate to detail page `/rollouts/{ns}/{name}`
- RESTART -> AlertDialog confirm -> call `restartRollout` API
- PROMOTE-FULL -> AlertDialog confirm -> call `approveRollout` API (Paused/Progressing only)
- ABORT -> AlertDialog confirm (red) -> call `abortRollout` API (Paused/Progressing only)
- After action -> auto revalidate SWR cache
- Each card fetches revision data via `useRolloutPods` (SWR auto-dedup + 10s refresh)

---

## 4. Detail Page (`/rollouts/[namespace]/[name]`) Design

### Layout

```
+--------------------------------------------------+
| [Logo]  Dashboard  Rollouts          | NS: [v]   |  <- Header
|--------------------------------------------------|
| <- Back   rollout-name  [status-icon]             |
|           namespace / phase                       |
|     [RESTART] [PAUSE] [RESUME] [APPROVE] [ABORT] |  <- Action bar (dynamic per phase)
|--------------------------------------------------|
| +- Summary -----------+ +- Workload Ref --------+|
| | Strategy  [Canary]   | | workload-name         ||  <- 2-col grid (md:grid-cols-2)
| | Step      1/8        | | Kind: Deployment      ||
| | Set Weight   20%     | | Age: 5d               ||
| | Actual Weight 15%    | | UID: abc123...         ||
| | Replicas  5/5        | +----------------------+||
| | Message   ...        |                          |
| +---------------------+                          |
|                                                   |
| +- Steps -------------+ +- Revisions -----------+|
| | * Set Weight: 20%   | | v demo-6fd76f75b      ||  <- 2-col grid (lg:grid-cols-2)
| | |                    | |   [stable] Rev 9 3/3  ||
| | * Pause    Current   | |   Pods: [ok][ok][ok]  ||     Revisions use Collapsible
| | |                    | |   Containers:          ||
| | o Set Weight: 40%   | |   app -> nginx:1.25    ||
| | |                    | |                        ||
| | o Pause              | | > demo-579589c5cd     ||
| +---------------------+ |   [canary] Rev 10 1/1  ||
|                          +------------------------+|
|                                                   |
| +- Containers (conditional) --------------------+|
| | [pkg] app    -> nginx:1.26                      ||  <- From workload spec
| | [pkg] sidecar -> envoy:1.28                     ||
| +-------------------------------------------------+|
|                                                   |
| +- Traffic Routing (conditional) ----------------+|
| | Service: xxx  |  Ingress: yyy                    ||
| +-------------------------------------------------+|
|                                                   |
| +- Details --------------------------------------+|
| | Name: xxx      |  Namespace: yyy                 ||
| | Strategy: xxx  |  Phase: yyy                     ||
| | Age: xxx       |  Generation: yyy                ||
| | Created: xxx                                     ||
| +-------------------------------------------------+|
+--------------------------------------------------+
```

### Revisions Panel

Uses `Collapsible` (Radix UI) for each revision:
- Canary revision: expanded by default
- Stable revision: expanded by default
- Old revisions: collapsed, show ROLLBACK button (with AlertDialog confirmation)

Role badge colors:
| Role    | Colors                                          |
|---------|-------------------------------------------------|
| canary  | `bg-blue-100 text-blue-800 border-blue-300`     |
| stable  | `bg-green-100 text-green-800 border-green-300`  |
| old     | `variant="outline" text-muted-foreground`        |

### Containers Card
Displayed between Revisions and Traffic Routing when container data is available.
Shows current workload containers (name + image) from the workload's pod template spec.

### Steps Pipeline

Vertical timeline with each step:
- **Left side**: Circle/icon (step type)
- **Right side**: Step card (label + status)
- **Connector**: Vertical line between steps

Color rules:
| State              | Dot Color          | Card Border          | Card Background    |
|--------------------|--------------------|----------------------|--------------------|
| Completed          | `bg-green-500`     | `border-green-300`   | `bg-green-50`      |
| Current (running)  | `bg-blue-500`      | `border-blue-400`    | `bg-blue-50`       |
| Current (paused)   | `bg-orange-500`    | `border-orange-400`  | `bg-orange-50`     |
| Pending            | `bg-gray-300`      | `border-gray-200`    | `bg-gray-50` 60%   |

Step type icon mapping:
| Type       | Icon          | Label Example     |
|------------|---------------|--------------------|
| Set Weight | `Scale`       | Set Weight: 20%    |
| Pause      | `PauseCircle` | Pause              |
| Replicas   | `Server`      | Replicas: 3        |

### Action Buttons

| Button   | Icon          | Condition                           | Style       |
|----------|---------------|-------------------------------------|-------------|
| RESTART  | `RefreshCw`   | Always visible                      | outline     |
| PAUSE    | `PauseCircle` | phase === "Progressing"             | outline     |
| RESUME   | `PlayCircle`  | phase === "Paused" or spec.paused   | outline     |
| APPROVE  | `CheckCircle2`| phase === "Paused" or "Progressing" | outline     |
| ABORT    | `XCircle`     | phase === "Paused" or "Progressing" | destructive |

All actions use AlertDialog for confirmation. ABORT button uses red styling
(`text-red-600 border-red-200 hover:bg-red-50`) with red confirm button
(`bg-red-600 hover:bg-red-700`).

---

## 5. Shared Components

| Component                | File                         | Used In                       |
|--------------------------|------------------------------|-------------------------------|
| `RolloutStatusIcon`      | `rollout-status.tsx`         | Card, list table, detail page |
| `RolloutStrategyBadge`   | `rollout-status.tsx`         | Card, list table, detail page |
| `PodStatusSquare`        | `rollout-pod-status.tsx`     | Pod grid (real data)          |
| `PodStatusGrid`          | `rollout-pod-status.tsx`     | Card revisions, detail page   |
| `PodStatusGridSimple`    | `rollout-pod-status.tsx`     | Pod grid (count-based)        |
| `RolloutStepsPipeline`   | `rollout-steps-pipeline.tsx` | Detail page Steps section     |
| `RolloutRevisions`       | `rollout-revisions.tsx`      | Detail page Revisions section |
| `RolloutContainers`      | `rollout-containers.tsx`     | Detail page Containers card   |

---

## 6. Color/Style Conventions

| Element                  | Style                                                   |
|--------------------------|---------------------------------------------------------|
| Canary strategy badge    | `bg-amber-100 text-amber-800 border-amber-300`         |
| BlueGreen strategy badge | `bg-teal-100 text-teal-800 border-teal-300`            |
| Healthy/Completed status | `text-green-500` + `CheckCircle`                        |
| Progressing status       | `text-blue-500` + `RefreshCw` (animate-spin)            |
| Paused status            | `text-orange-500` + `PauseCircle`                       |
| Failed/Degraded status   | `text-red-500` + `XCircle`                              |
| Pod (healthy)            | `bg-green-500 text-white rounded-md w-7 h-7` + icon    |
| Pod (pending)            | `bg-amber-400 text-white` + `Loader2` (animate-spin)   |
| Pod (failed)             | `bg-red-500 text-white` + `AlertCircle`                 |
| Action buttons           | shadcn `Button variant="outline" size="sm"` + icon     |
| Abort button             | `text-red-600 border-red-200 hover:bg-red-50`          |
| Canary revision border   | `border-blue-200 bg-blue-50/50`                         |
| Stable revision border   | `border-green-200 bg-green-50/50`                       |
| Old revision border      | `border-gray-200 bg-gray-50/50`                         |

---

## 7. Data Flow

```
Backend API (Go / Gin)
  |
api/rollout.ts (Axios request layer)
  |
hooks/use-rollouts.ts (SWR hooks, auto-refresh)
  |
lib/rollout-utils.ts (transform: raw K8s -> TransformedRollout)
  |
React Components (useMemo filter/search -> render)
```

### Refresh Intervals
- List page: 30s (`REFRESH_INTERVAL`)
- Detail page: 10s (`DETAIL_REFRESH_INTERVAL`)
- After action: immediate revalidate (SWR `mutate`)

### Revision Data Flow
The `GetRolloutPods` endpoint returns:
- `pods`: all pods matching the workload's label selector
- `workloadRef`: the workload reference from the rollout spec
- `revisions`: pods grouped by ReplicaSet (Deployment) or controller-revision-hash (CloneSet/StatefulSet)
- `containers`: current container info from the workload's pod template spec

Each revision includes: RS name, revision number, pod-template-hash, isStable/isCanary flags,
replicas/readyReplicas counts, pod list, and container info.

---

## 8. API Endpoints

### Rollout Management

| Method | Path                                  | Handler            | Description            |
|--------|---------------------------------------|--------------------|-----------------------|
| GET    | `/rollout/:ns/:name`                  | `GetRollout`       | Get rollout details    |
| GET    | `/rollout/:ns/:name/pods`             | `GetRolloutPods`   | Get pods + revisions   |
| GET    | `/rollout/status/:ns/:name`           | `GetRolloutStatus` | Get rollout status     |
| GET    | `/rollout/history/:ns/:name`          | `GetRolloutHistory`| Get revision history   |
| POST   | `/rollout/pause/:ns/:name`            | `PauseRollout`     | Pause rollout          |
| POST   | `/rollout/resume/:ns/:name`           | `ResumeRollout`    | Resume rollout         |
| POST   | `/rollout/undo/:ns/:name`             | `UndoRollout`      | Undo rollout           |
| POST   | `/rollout/restart/:ns/:name`          | `RestartRollout`   | Restart rollout        |
| POST   | `/rollout/approve/:ns/:name`          | `ApproveRollout`   | Approve/promote rollout|
| POST   | `/rollout/abort/:ns/:name`            | `AbortRollout`     | Abort (disable) rollout|
| GET    | `/rollout/list/:ns`                   | `ListAllRollouts`  | List all rollouts      |
| GET    | `/rollout/active/:ns`                 | `ListActiveRollouts`| List active rollouts  |

---

## 9. Component File Inventory

```
openkruise-dashboard/
+-- app/rollouts/
|   +-- page.tsx                          # List page route
|   +-- [namespace]/[name]/page.tsx       # Detail page route
+-- components/
|   +-- rollouts-page.tsx                 # List page main component
|   +-- rollout-card.tsx                  # Rollout card (with revision display)
|   +-- rollout-detail-enhanced.tsx       # Enhanced detail page
|   +-- rollout-steps-pipeline.tsx        # Steps vertical pipeline
|   +-- rollout-pod-status.tsx            # Pod status squares
|   +-- rollout-revisions.tsx             # Revision panel (collapsible)
|   +-- rollout-containers.tsx            # Containers info display
|   +-- rollout-status.tsx                # Shared StatusIcon + StrategyBadge
|   +-- main-nav.tsx                      # Navigation (includes Rollouts link)
+-- api/
|   +-- rollout.ts                        # API layer (types + fetch functions)
+-- hooks/
|   +-- use-rollouts.ts                   # SWR hooks (all rollout data fetching)
+-- lib/
    +-- rollout-utils.ts                  # Data types + transform + utility functions
```

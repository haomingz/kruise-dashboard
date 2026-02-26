"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  Workflow,
  Route,
} from "lucide-react"
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { ExplainerStrategy, LiveRolloutSnapshot } from "@/lib/rollout-explainer"
import type { RolloutStep, TransformedRolloutDetail } from "@/lib/rollout-utils"
import { cn } from "@/lib/utils"

type StageStatus = "done" | "current" | "pending"
type TrafficMode = "weight" | "match"
type TopologyViewMode = "cards" | "flow"

interface MigrationStage {
  id: string
  order: number
  title: string
  summary: string
  status: StageStatus
  canaryPods: number
  stablePods: number
  canaryTraffic: number
  trafficMode: TrafficMode
  pauseText?: string
  stepSpecSummary: string
  stableWorkloadReplicas: number
  canaryWorkloadReplicas: number
  actualStablePods?: number
  actualCanaryPods?: number
  useExtraCanaryDeployment: boolean
  canaryRouteEnabled: boolean
  canaryServiceEnabled: boolean
  canaryIngressEnabled: boolean
  matchRuleSummary?: string
  ops: string[]
}

interface TrafficRoutingScene {
  hasTrafficRoutingRef: boolean
  hasIngressProvider: boolean
  hasGatewayProvider: boolean
  hasCustomProvider: boolean
  disableGenerateCanaryService: boolean
  hasDedicatedCanaryService: boolean
  routeTypeLabel: string
  stableRouteName: string
  canaryRouteName: string
  stableServiceBase: string
}

interface RolloutResourceTopologyDiagramProps {
  strategy: ExplainerStrategy
  detail?: TransformedRolloutDetail | null
  snapshot?: LiveRolloutSnapshot | null
  desiredWorkloadReplicas?: number
  actualStablePods?: number
  actualCanaryPods?: number
  title?: string
  description?: string
  sourceHint?: string
  defaultExpanded?: boolean
}

const STATUS_STYLE: Record<StageStatus, { border: string; bg: string; marker: string; stroke: string }> = {
  done: {
    border: "border-emerald-300",
    bg: "bg-emerald-50/70",
    marker: "bg-emerald-600",
    stroke: "#16a34a",
  },
  current: {
    border: "border-blue-300",
    bg: "bg-blue-50/70",
    marker: "bg-blue-600",
    stroke: "#2563eb",
  },
  pending: {
    border: "border-slate-300",
    bg: "bg-slate-50/70",
    marker: "bg-slate-500",
    stroke: "#64748b",
  },
}

function trimText(input: string, max = 42): string {
  if (input.length <= max) {
    return input
  }
  return `${input.slice(0, max - 1)}…`
}

function parseTrafficWeight(value: string | number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback
  }
  const raw = String(value).trim().replace("%", "")
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return Math.max(0, Math.min(100, parsed))
}

function parseReplicaTarget(value: string | number | undefined, baseReplicas: number, fallback: number): number {
  if (value === undefined) {
    return fallback
  }
  if (typeof value === "number") {
    return Math.max(0, Math.round(value))
  }
  const raw = String(value).trim()
  if (raw.endsWith("%")) {
    const parsed = Number.parseInt(raw.replace("%", ""), 10)
    if (Number.isNaN(parsed)) {
      return fallback
    }
    return Math.max(0, Math.ceil((baseReplicas * parsed) / 100))
  }
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return Math.max(0, parsed)
}

function hasMatches(step: RolloutStep): boolean {
  const value = (step as { matches?: unknown }).matches
  return Array.isArray(value) && value.length > 0
}

function getPauseText(pause: RolloutStep["pause"]): string | undefined {
  if (!pause) {
    return undefined
  }
  if (typeof pause === "object" && pause.duration !== undefined) {
    return String(pause.duration)
  }
  return "manual approve"
}

function toPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function parseNonNegativeInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }
  return undefined
}

function calculateImplicitCanaryTraffic(stage: MigrationStage): number {
  const total = Math.max(stage.stablePods + stage.canaryPods, 0)
  if (total === 0) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round((stage.canaryPods / total) * 100)))
}

function formatMatchRuleSummary(step: RolloutStep): string | undefined {
  const rawMatches = (step as { matches?: unknown }).matches
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) {
    return undefined
  }

  const clauses: string[] = []
  rawMatches.forEach((rawMatch, index) => {
    const match = asRecord(rawMatch)
    if (!match) {
      return
    }

    const matchParts: string[] = []
    const headers = Array.isArray(match.headers) ? match.headers : []
    headers.forEach((rawHeader) => {
      const header = asRecord(rawHeader)
      if (!header) {
        return
      }
      const name = nonEmptyString(header.name) ?? "header"
      const type = nonEmptyString(header.type) ?? "Exact"
      const value = nonEmptyString(header.value) ?? "*"
      matchParts.push(`header:${name} ${type} ${value}`)
    })

    const queryParams = Array.isArray(match.queryParams) ? match.queryParams : []
    queryParams.forEach((rawQuery) => {
      const query = asRecord(rawQuery)
      if (!query) {
        return
      }
      const name = nonEmptyString(query.name) ?? "query"
      const type = nonEmptyString(query.type) ?? "Exact"
      const value = nonEmptyString(query.value) ?? "*"
      matchParts.push(`query:${name} ${type} ${value}`)
    })

    if (matchParts.length === 0) {
      clauses.push(`match#${index + 1}`)
      return
    }
    clauses.push(matchParts.join(" && "))
  })

  if (clauses.length === 0) {
    return "matches(headers/query)"
  }
  return clauses.join(" OR ")
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }
  return undefined
}

function resolveTrafficRoutingScene(detail: TransformedRolloutDetail | null | undefined): TrafficRoutingScene {
  const strategySpec = asRecord(detail?.rawSpec?.strategy)
  // `abtest` is a canary variant (matches-based), so prefer canary spec first.
  // Fallback to blueGreen for compatibility with non-canary rollout detail payloads.
  const scoped = asRecord(strategySpec?.canary) ?? asRecord(strategySpec?.blueGreen)
  const refs = Array.isArray(scoped?.trafficRoutings)
    ? (scoped?.trafficRoutings as unknown[]).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item))
    : []

  const firstRef = refs[0]
  const ingressRef = refs.map((item) => asRecord(item.ingress)).find((item) => item !== undefined)
  const gatewayRef = refs.map((item) => asRecord(item.gateway)).find((item) => item !== undefined)
  const stableServiceBase =
    nonEmptyString(firstRef?.service) ??
    nonEmptyString(detail?.trafficRoutings?.at(0)?.service) ??
    "stable-service"
  const ingressName = nonEmptyString(ingressRef?.name) ?? "stable-ingress"
  const httpRouteName = nonEmptyString(gatewayRef?.httpRouteName) ?? "stable-httproute"
  const hasIngressProvider = refs.some((item) => Boolean(nonEmptyString(asRecord(item.ingress)?.name)))
  const hasGatewayProvider = refs.some((item) => Boolean(asRecord(item.gateway)))
  const hasCustomProvider = refs.some((item) => {
    const customRefs = item.customNetworkRefs
    return Array.isArray(customRefs) && customRefs.length > 0
  })
  const hasTrafficRoutingRef = refs.length > 0
  const disableGenerateCanaryService = Boolean(scoped?.disableGenerateCanaryService)
  const hasDedicatedCanaryService = hasTrafficRoutingRef && !disableGenerateCanaryService

  let routeTypeLabel = "TrafficRouting"
  if (hasIngressProvider && !hasGatewayProvider && !hasCustomProvider) {
    routeTypeLabel = "Ingress"
  } else if (!hasIngressProvider && hasGatewayProvider && !hasCustomProvider) {
    routeTypeLabel = "HTTPRoute"
  } else if (!hasIngressProvider && !hasGatewayProvider && hasCustomProvider) {
    routeTypeLabel = "CustomNetwork"
  } else if (hasIngressProvider || hasGatewayProvider || hasCustomProvider) {
    routeTypeLabel = "Ingress/HTTPRoute"
  }

  const stableRouteName = hasIngressProvider
    ? `Ingress/${ingressName}`
    : hasGatewayProvider
      ? `HTTPRoute/${httpRouteName}`
      : hasCustomProvider
        ? "CustomNetworkRef"
        : "TrafficRouting(not configured)"
  const canaryRouteName = hasIngressProvider ? `Ingress/${ingressName}-canary` : stableRouteName

  return {
    hasTrafficRoutingRef,
    hasIngressProvider,
    hasGatewayProvider,
    hasCustomProvider,
    disableGenerateCanaryService,
    hasDedicatedCanaryService,
    routeTypeLabel,
    stableRouteName,
    canaryRouteName,
    stableServiceBase,
  }
}

function resolveStageStatus(
  order: number,
  stepCount: number,
  snapshot: LiveRolloutSnapshot | null | undefined
): StageStatus {
  if (!snapshot) {
    return order === 0 ? "current" : "pending"
  }

  const completed =
    snapshot.phase === "Healthy" ||
    snapshot.phase === "Completed" ||
    snapshot.currentStepState === "Completed"
  if (completed) {
    return order < stepCount + 1 ? "done" : "current"
  }

  const currentOrder = Math.max(0, snapshot.currentStepIndex)
  if (order < currentOrder) {
    return "done"
  }
  if (order === currentOrder) {
    return "current"
  }
  return "pending"
}

function getStepTitle(
  strategy: ExplainerStrategy,
  order: number,
  prevTraffic: number,
  nextTraffic: number,
  prevReplicas: number,
  nextReplicas: number,
  pauseText: string | undefined,
  matchMode: boolean
): string {
  if (pauseText && nextReplicas === prevReplicas && nextTraffic === prevTraffic && !matchMode) {
    return `Step ${order}: Pause / Approval`
  }
  if (matchMode) {
    return `Step ${order}: A/B Match Routing`
  }
  if (order === 1 && nextReplicas > 0 && nextTraffic === 0) {
    return `Step ${order}: 启动 Canary Pod（0% 流量）`
  }
  if (nextTraffic >= 100) {
    return `Step ${order}: 全量流量切换`
  }
  if (nextTraffic > prevTraffic) {
    return `Step ${order}: 灰度扩大到 ${nextTraffic}%`
  }
  if (nextReplicas > prevReplicas) {
    return `Step ${order}: 扩大 Canary Pod 到 ${nextReplicas}`
  }
  return strategy === "abtest" ? `Step ${order}: A/B 发布推进` : `Step ${order}: Canary 发布推进`
}

function buildStepSpecSummary(step: RolloutStep, pauseText: string | undefined, matchMode: boolean): string {
  const parts: string[] = []
  if (step.replicas !== undefined) {
    parts.push(`replicas=${String(step.replicas)}`)
  }
  if (step.traffic !== undefined) {
    parts.push(`traffic=${String(step.traffic)}`)
  }
  if (matchMode) {
    const matches = ((step as { matches?: unknown }).matches as unknown[] | undefined)?.length ?? 0
    parts.push(`matches=${matches}`)
  }
  if (pauseText) {
    parts.push(`pause=${pauseText}`)
  }
  return parts.length > 0 ? parts.join(", ") : "step spec: no replicas/traffic/pause field"
}

function calcPodsByStyle(
  useExtraCanaryDeployment: boolean,
  desiredReplicas: number,
  nextCanaryReplicas: number
): {
  stablePods: number
  canaryPods: number
  stableWorkloadReplicas: number
  canaryWorkloadReplicas: number
} {
  if (useExtraCanaryDeployment) {
    return {
      stablePods: desiredReplicas,
      canaryPods: nextCanaryReplicas,
      stableWorkloadReplicas: desiredReplicas,
      canaryWorkloadReplicas: nextCanaryReplicas,
    }
  }
  const stablePods = Math.max(desiredReplicas - nextCanaryReplicas, 0)
  return {
    stablePods,
    canaryPods: nextCanaryReplicas,
    stableWorkloadReplicas: stablePods,
    canaryWorkloadReplicas: 0,
  }
}

function buildDefaultStages(
  strategy: ExplainerStrategy,
  baseReplicas: number,
  snapshot: LiveRolloutSnapshot | null | undefined,
  useExtraCanaryDeployment: boolean,
  routingScene: TrafficRoutingScene
): MigrationStage[] {
  const defaults =
    strategy === "abtest"
      ? [
          { pods: Math.max(1, Math.ceil(baseReplicas * 0.1)), traffic: 0, mode: "match" as const, spec: "replicas=10%, matches=1" },
          { pods: Math.max(1, Math.ceil(baseReplicas * 0.1)), traffic: 10, mode: "weight" as const, spec: "replicas=10%, traffic=10%" },
          { pods: Math.max(1, Math.ceil(baseReplicas * 0.5)), traffic: 50, mode: "weight" as const, spec: "replicas=50%, traffic=50%" },
          { pods: baseReplicas, traffic: 100, mode: "weight" as const, spec: "replicas=100%, traffic=100%" },
        ]
      : [
          { pods: Math.max(1, Math.ceil(baseReplicas * 0.1)), traffic: 0, mode: "weight" as const, spec: "replicas=10%, traffic=0%" },
          { pods: Math.max(1, Math.ceil(baseReplicas * 0.1)), traffic: 10, mode: "weight" as const, spec: "replicas=10%, traffic=10%" },
          { pods: Math.max(1, Math.ceil(baseReplicas * 0.5)), traffic: 50, mode: "weight" as const, spec: "replicas=50%, traffic=50%" },
          { pods: baseReplicas, traffic: 100, mode: "weight" as const, spec: "replicas=100%, traffic=100%" },
        ]

  const baselinePods = calcPodsByStyle(useExtraCanaryDeployment, baseReplicas, 0)
  const stages: MigrationStage[] = [
    {
      id: "baseline",
      order: 0,
      title: "Step 0: Stable 基线",
      summary: useExtraCanaryDeployment
        ? "stable Deployment 提供全部流量，canary Deployment 尚未创建。"
        : "单 Deployment 基线运行，新版本 Pod 尚未接流量。",
      status: resolveStageStatus(0, defaults.length, snapshot),
      canaryPods: baselinePods.canaryPods,
      stablePods: baselinePods.stablePods,
      stableWorkloadReplicas: baselinePods.stableWorkloadReplicas,
      canaryWorkloadReplicas: baselinePods.canaryWorkloadReplicas,
      canaryTraffic: 0,
      trafficMode: "weight",
      useExtraCanaryDeployment,
      canaryRouteEnabled: false,
      canaryServiceEnabled: false,
      canaryIngressEnabled: false,
      stepSpecSummary: "baseline: traffic=0%, replicas=0",
      ops: [
        "stable Service selector -> stableRevision",
        useExtraCanaryDeployment ? "canary Deployment not created yet" : "Workload partition=stable",
        routingScene.hasTrafficRoutingRef
          ? `${routingScene.routeTypeLabel} 100% -> stable Service`
          : "未配置 trafficRoutings，不会创建 canary Service/Ingress",
      ],
    },
  ]

  let prevCanaryReplicas = 0
  let prevTraffic = 0
  defaults.forEach((item, index) => {
    const order = index + 1
    const title = getStepTitle(
      strategy,
      order,
      prevTraffic,
      item.traffic,
      prevCanaryReplicas,
      item.pods,
      undefined,
      item.mode === "match"
    )
    const pods = calcPodsByStyle(useExtraCanaryDeployment, baseReplicas, item.pods)
    const matchRuleSummary = item.mode === "match" ? "headers/query 规则命中流量" : undefined
    const summary =
      item.mode === "match"
        ? `canary Pod ${pods.canaryPods}，按规则导流（${matchRuleSummary}）`
        : `canary Pod ${pods.canaryPods}（约 ${toPercent(item.pods, baseReplicas)}%），canary traffic ${item.traffic}%`
    const canaryRouteEnabled = routingScene.hasTrafficRoutingRef && (item.mode === "match" || item.traffic > 0)
    const canaryServiceEnabled = routingScene.hasTrafficRoutingRef && routingScene.hasDedicatedCanaryService

    const ops: string[] = [
      useExtraCanaryDeployment
        ? `Canary Deployment replicas -> ${pods.canaryWorkloadReplicas}`
        : `Workload partition update -> canary replicas ${item.pods}`,
    ]
    if (!routingScene.hasTrafficRoutingRef) {
      ops.push("未配置 trafficRoutings，跳过 Service/Ingress/HTTPRoute patch")
    } else if (item.mode === "match") {
      ops.push("TrafficRouting.patch: matches(headers/query) -> canary Service")
      ops.push(`Match Rule: ${matchRuleSummary}`)
    } else {
      ops.push(`TrafficRouting.patch: canary weight -> ${item.traffic}%`)
      if (item.traffic === 0) {
        ops.push(
          canaryServiceEnabled
            ? "traffic=0%，canary Service 已创建用于后续步骤，canary 路由资源暂不创建"
            : "traffic=0%，canary 路由资源保持未创建或已清理"
        )
      }
    }
    if (order === 1 && item.traffic === 0) {
      ops.push("新 Pod 已启动但流量仍保持 0% canary")
    }

    stages.push({
      id: `default-step-${order}`,
      order,
      title,
      summary,
      status: resolveStageStatus(order, defaults.length, snapshot),
      canaryPods: pods.canaryPods,
      stablePods: pods.stablePods,
      stableWorkloadReplicas: pods.stableWorkloadReplicas,
      canaryWorkloadReplicas: pods.canaryWorkloadReplicas,
      canaryTraffic: item.traffic,
      trafficMode: item.mode,
      useExtraCanaryDeployment,
      canaryRouteEnabled,
      canaryServiceEnabled,
      canaryIngressEnabled: canaryRouteEnabled && routingScene.hasIngressProvider,
      matchRuleSummary,
      stepSpecSummary: item.spec,
      ops,
    })
    prevCanaryReplicas = item.pods
    prevTraffic = item.traffic
  })

  return stages
}

function buildStagesFromDetail(
  strategy: ExplainerStrategy,
  detail: TransformedRolloutDetail | null | undefined,
  snapshot: LiveRolloutSnapshot | null | undefined,
  routingScene: TrafficRoutingScene,
  desiredWorkloadReplicas: number | undefined,
  actualStablePods: number | undefined,
  actualCanaryPods: number | undefined
): MigrationStage[] {
  // `enableExtraWorkloadForCanary` belongs to canary strategy and still applies to A/B (matches) mode.
  const useExtraCanaryDeployment = Boolean(detail?.enableExtraWorkloadForCanary)
  const stableCurrent = Math.max(actualStablePods ?? detail?.stableReplicas ?? 0, 0)
  const canaryCurrent = Math.max(actualCanaryPods ?? detail?.canaryReplicas ?? 0, 0)
  const inferredTotal = stableCurrent + canaryCurrent
  const baseReplicas =
    desiredWorkloadReplicas && desiredWorkloadReplicas > 0
      ? desiredWorkloadReplicas
      : useExtraCanaryDeployment
        ? stableCurrent > 0
          ? stableCurrent
          : inferredTotal > 0
            ? inferredTotal
            : 10
        : inferredTotal > 0
          ? inferredTotal
          : 10

  const steps = detail?.steps ?? []
  if (steps.length === 0) {
    return buildDefaultStages(strategy, baseReplicas, snapshot, useExtraCanaryDeployment, routingScene)
  }
  const firstStep = steps[0]
  const firstStepHasRoutingSignals = Boolean(firstStep && (firstStep.traffic !== undefined || hasMatches(firstStep)))

  const baselinePods = calcPodsByStyle(useExtraCanaryDeployment, baseReplicas, 0)
  const stages: MigrationStage[] = [
    {
      id: "baseline",
      order: 0,
      title: "Step 0: Stable 基线",
      summary: useExtraCanaryDeployment
        ? "stable Deployment 保持服务，等待创建 canary Deployment。"
        : "新版本尚未接流，先保持 stable baseline。",
      status: resolveStageStatus(0, steps.length, snapshot),
      canaryPods: baselinePods.canaryPods,
      stablePods: baselinePods.stablePods,
      stableWorkloadReplicas: baselinePods.stableWorkloadReplicas,
      canaryWorkloadReplicas: baselinePods.canaryWorkloadReplicas,
      canaryTraffic: 0,
      trafficMode: "weight",
      useExtraCanaryDeployment,
      canaryRouteEnabled: false,
      canaryServiceEnabled: false,
      canaryIngressEnabled: false,
      stepSpecSummary: "baseline: traffic=0%, replicas=0",
      ops: [
        "Rollout 初始化，Workload 标记 in-progressing",
        firstStepHasRoutingSignals
          ? "stable Service selector -> stableRevision（首个 step 有 traffic/matches 时）"
          : "首个 step 仅 replicas，stable Service 保持原 selector",
        useExtraCanaryDeployment ? "canary Deployment not created yet" : "canary replicas=0",
        routingScene.hasTrafficRoutingRef
          ? `${routingScene.routeTypeLabel} 默认保持 stable 路径`
          : "未配置 trafficRoutings，不会创建 canary Service/Ingress",
      ],
    },
  ]

  let prevCanaryReplicas = 0
  let prevTraffic = 0
  let prevCanaryWorkloadReplicas = 0

  steps.forEach((step, index) => {
    const order = index + 1
    const matchMode = hasMatches(step)
    const matchRuleSummary = matchMode ? formatMatchRuleSummary(step) : undefined
    const nextMode: TrafficMode = matchMode ? "match" : "weight"
    const pauseText = getPauseText(step.pause)
    const nextCanaryReplicas = parseReplicaTarget(
      step.replicas as string | number | undefined,
      baseReplicas,
      prevCanaryReplicas
    )
    const nextTraffic = parseTrafficWeight(step.traffic as string | number | undefined, prevTraffic)
    const pods = calcPodsByStyle(useExtraCanaryDeployment, baseReplicas, nextCanaryReplicas)
    const canaryRouteEnabled = routingScene.hasTrafficRoutingRef && (matchMode || nextTraffic > 0)
    const canaryServiceEnabled =
      routingScene.hasTrafficRoutingRef &&
      routingScene.hasDedicatedCanaryService &&
      (matchMode || step.traffic !== undefined)

    const title = getStepTitle(
      strategy,
      order,
      prevTraffic,
      nextTraffic,
      prevCanaryReplicas,
      nextCanaryReplicas,
      pauseText,
      matchMode
    )
    const summary = useExtraCanaryDeployment
      ? `stable Deployment=${pods.stableWorkloadReplicas}，canary Deployment=${pods.canaryWorkloadReplicas}，canary traffic=${nextMode === "match" ? `rule(${matchRuleSummary ?? "headers/query"})` : `${nextTraffic}%`}`
      : `stable Pod ${pods.stablePods}，canary Pod ${pods.canaryPods}，canary traffic ${nextMode === "match" ? `rule(${matchRuleSummary ?? "headers/query"})` : `${nextTraffic}%`}`

    const ops: string[] = []
    if (useExtraCanaryDeployment) {
      if (prevCanaryWorkloadReplicas === 0 && pods.canaryWorkloadReplicas > 0) {
        ops.push(`Create canary Deployment, replicas=${pods.canaryWorkloadReplicas}`)
      } else if (prevCanaryWorkloadReplicas !== pods.canaryWorkloadReplicas) {
        ops.push(`Patch canary Deployment replicas -> ${pods.canaryWorkloadReplicas}`)
      }
    } else if (step.replicas !== undefined) {
      ops.push(`Update workload partition -> canary replicas ${nextCanaryReplicas}`)
    }

    if (!routingScene.hasTrafficRoutingRef) {
      if (step.traffic !== undefined || matchMode) {
        ops.push("未配置 trafficRoutings，TrafficRouting 相关 patch 不会执行")
      }
    } else {
      if (step.traffic !== undefined) {
        ops.push(`TrafficRouting.patch: canary weight -> ${nextTraffic}%`)
        if (nextTraffic === 0 && !matchMode) {
          ops.push(
            canaryServiceEnabled
              ? "traffic=0%，canary Service 已创建用于后续步骤，canary 路由资源暂不创建"
              : "traffic=0%，canary 路由资源保持未创建或已清理"
          )
        }
      }
      if (matchMode) {
        ops.push("TrafficRouting.patch: matches(headers/query) -> canary Service")
        if (matchRuleSummary) {
          ops.push(`Match Rule: ${matchRuleSummary}`)
        }
      }
    }
    if (!matchMode && step.traffic === undefined && nextCanaryReplicas > 0) {
      const implicit = Math.max(0, Math.min(100, toPercent(pods.canaryPods, pods.canaryPods + pods.stablePods)))
      ops.push(`未显式配置 traffic，流量按 stable Service endpoints 自然分配（约 canary ${implicit}%）`)
    }
    if (pauseText) {
      ops.push(`Rollout.statusPatch: StepPaused，pause=${pauseText}`)
    }
    if (ops.length === 0) {
      ops.push("Rollout 继续 Reconcile，保持当前流量/副本目标")
    }
    if (order === 1 && nextCanaryReplicas > 0 && nextTraffic === 0 && nextMode !== "match") {
      ops.push("新 Pod 已启动但流量仍保持 0% canary")
    }

    stages.push({
      id: `detail-step-${order}`,
      order,
      title,
      summary,
      status: resolveStageStatus(order, steps.length, snapshot),
      canaryPods: pods.canaryPods,
      stablePods: pods.stablePods,
      stableWorkloadReplicas: pods.stableWorkloadReplicas,
      canaryWorkloadReplicas: pods.canaryWorkloadReplicas,
      canaryTraffic: nextTraffic,
      trafficMode: nextMode,
      pauseText,
      useExtraCanaryDeployment,
      canaryRouteEnabled,
      canaryServiceEnabled,
      canaryIngressEnabled: canaryRouteEnabled && routingScene.hasIngressProvider,
      matchRuleSummary,
      stepSpecSummary: buildStepSpecSummary(step, pauseText, matchMode),
      ops,
    })

    prevCanaryReplicas = nextCanaryReplicas
    prevTraffic = nextTraffic
    prevCanaryWorkloadReplicas = pods.canaryWorkloadReplicas
  })

  const finalOrder = steps.length + 1
  stages.push({
    id: "finalising",
    order: finalOrder,
    title: `Step ${finalOrder}: Promote + Finalising`,
    summary: useExtraCanaryDeployment
      ? "推广成功后收敛为 stable Deployment，删除 canary Deployment。"
      : "推广成功后由 stable 路径承载全部流量。",
    status: resolveStageStatus(finalOrder, steps.length, snapshot),
    canaryPods: 0,
    stablePods: baseReplicas,
    stableWorkloadReplicas: baseReplicas,
    canaryWorkloadReplicas: 0,
    canaryTraffic: 0,
    trafficMode: "weight",
    useExtraCanaryDeployment,
    canaryRouteEnabled: false,
    canaryServiceEnabled: false,
    canaryIngressEnabled: false,
    stepSpecSummary: "finalising: traffic=100%, cleanup canary resources",
    ops: [
      "TrafficRouting.restore: stable Service -> new stable revision",
      routingScene.hasTrafficRoutingRef
        ? "Cleanup canary Ingress/route + canary Service（若存在）"
        : "Cleanup canary labels/resources",
      useExtraCanaryDeployment ? "Delete extra canary Deployment" : "Cleanup workload canary markers",
      "Cleanup BatchRelease，移除 in-progressing 托管标记",
    ],
  })

  if (detail && snapshot) {
    const actualStable = Math.max(actualStablePods ?? detail.stableReplicas ?? 0, 0)
    const actualCanary = Math.max(actualCanaryPods ?? detail.canaryReplicas ?? 0, 0)
    const targetOrder =
      snapshot.phase === "Healthy" || snapshot.phase === "Completed"
        ? finalOrder
        : Math.max(0, snapshot.currentStepIndex)
    const target = stages.find((stage) => stage.order === targetOrder)
    if (target) {
      target.actualStablePods = actualStable
      target.actualCanaryPods = actualCanary
    }
  }

  return stages
}

function StageCard({
  stage,
  stableServiceName,
  canaryServiceName,
  stableRouteName,
  canaryRouteName,
  routeTypeLabel,
  stableWorkloadName,
  canaryWorkloadName,
}: Readonly<{
  stage: MigrationStage
  stableServiceName: string
  canaryServiceName: string
  stableRouteName: string
  canaryRouteName: string
  routeTypeLabel: string
  stableWorkloadName: string
  canaryWorkloadName: string
}>) {
  const style = STATUS_STYLE[stage.status]
  const implicitCanaryTraffic = calculateImplicitCanaryTraffic(stage)
  const hasImplicitEndpointSplit = !stage.canaryRouteEnabled && !stage.canaryServiceEnabled && stage.canaryPods > 0
  const matchRuleDisplay = stage.matchRuleSummary ? trimText(stage.matchRuleSummary, 44) : "headers/query"
  const stableTraffic = stage.canaryRouteEnabled
    ? stage.trafficMode === "match"
      ? "未命中规则流量"
      : `${Math.max(0, 100 - stage.canaryTraffic)}%`
    : hasImplicitEndpointSplit
      ? `${Math.max(0, 100 - implicitCanaryTraffic)}% (endpoint ratio)`
      : "100%"
  const canaryTraffic = stage.canaryRouteEnabled
    ? stage.trafficMode === "match"
      ? `命中规则流量 (${matchRuleDisplay})`
      : `${stage.canaryTraffic}%`
    : hasImplicitEndpointSplit
      ? `${implicitCanaryTraffic}% (endpoint ratio)`
      : "0%"
  const canaryWorkloadLabel = stage.useExtraCanaryDeployment
    ? `${canaryWorkloadName} (replicas=${stage.canaryWorkloadReplicas})`
    : `${stableWorkloadName} (shared)`
  const canaryRouteSource = stage.canaryIngressEnabled ? canaryRouteName : stableRouteName
  const canaryServiceDisplayName = stage.canaryServiceEnabled ? canaryServiceName : `${stableServiceName} (reused)`

  return (
    <article className={cn("rounded-lg border p-3", style.border, style.bg)}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white", style.marker)}>
          {stage.order}
        </span>
        <h4 className="text-sm font-semibold text-slate-900">{stage.title}</h4>
        {stage.status === "current" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
      </div>

      <p className="mb-2 text-xs text-slate-700">{stage.summary}</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[10px]">target stable pod={stage.stablePods}</Badge>
        <Badge variant="outline" className="text-[10px]">target canary pod={stage.canaryPods}</Badge>
        <Badge variant="outline" className="text-[10px]">stable deploy={stage.stableWorkloadReplicas}</Badge>
        {stage.useExtraCanaryDeployment && (
          <Badge variant="outline" className="text-[10px]">canary deploy={stage.canaryWorkloadReplicas}</Badge>
        )}
        <Badge variant="outline" className="text-[10px]">{routeTypeLabel}</Badge>
        <Badge variant="outline" className="text-[10px]">{`canary traffic=${canaryTraffic}`}</Badge>
        {stage.matchRuleSummary && (
          <Badge variant="outline" className="text-[10px] bg-cyan-50 text-cyan-700">{`match=${matchRuleDisplay}`}</Badge>
        )}
        {stage.actualStablePods !== undefined && (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">actual stable={stage.actualStablePods}</Badge>
        )}
        {stage.actualCanaryPods !== undefined && (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">actual canary={stage.actualCanaryPods}</Badge>
        )}
        {stage.pauseText && <Badge variant="outline" className="text-[10px]">pause={stage.pauseText}</Badge>}
      </div>

      <div className="space-y-1.5 rounded-md border border-slate-200 bg-white/70 p-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700">
          <Route className="h-3.5 w-3.5 text-cyan-700" /> {stableRouteName}
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> {stableServiceName} ({stableTraffic})
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> {stableWorkloadName}
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> stable pods
        </div>
        {stage.canaryRouteEnabled ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700">
            <Route className="h-3.5 w-3.5 text-cyan-700" /> {canaryRouteSource}
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> {canaryServiceDisplayName} ({canaryTraffic})
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> {canaryWorkloadLabel}
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> canary pods
          </div>
        ) : (
          <div className="space-y-1 text-[11px] text-slate-500">
            {stage.canaryServiceEnabled ? (
              <>
                <p>{`当前阶段已创建 ${canaryServiceName}，但 canary 路由资源未创建（traffic=0）。`}</p>
                <p>stable 路径保持 100%，canary 路径保持 0%。</p>
              </>
            ) : (
              <p>当前阶段未创建 canary 路由资源（无 matches 或 traffic=0）。</p>
            )}
            {!stage.canaryServiceEnabled && stage.canaryPods > 0 && (
              <p>{`流量按 stable Service endpoints 自然分配，canary 约 ${implicitCanaryTraffic}%`}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 rounded-md border border-slate-200 bg-white/70 p-2">
        <p className="font-mono text-[11px] text-slate-700">{stage.stepSpecSummary}</p>
        {stage.ops.map((op) => (
          <p key={`${stage.id}-${op}`} className="text-[11px] leading-relaxed text-slate-700">
            - {op}
          </p>
        ))}
      </div>
    </article>
  )
}

function createFlowNode(
  id: string,
  x: number,
  y: number,
  title: string,
  subtitle: string,
  tone: "route" | "service" | "workload" | "pods" | "notice"
): Node<{ label: ReactNode; title: string; subtitle: string }> {
  const tones: Record<typeof tone, { border: string; bg: string; title: string }> = {
    route: { border: "#06b6d4", bg: "#ecfeff", title: "#0e7490" },
    service: { border: "#6366f1", bg: "#eef2ff", title: "#3730a3" },
    workload: { border: "#38bdf8", bg: "#eff6ff", title: "#0369a1" },
    pods: { border: "#22c55e", bg: "#ecfdf5", title: "#166534" },
    notice: { border: "#a3a3a3", bg: "#f8fafc", title: "#334155" },
  }
  const color = tones[tone]
  return {
    id,
    position: { x, y },
    data: {
      title,
      subtitle,
      label: (
        <div className="leading-tight">
          <p className="font-semibold" style={{ color: color.title }}>{title}</p>
          <p className="mt-1 text-[11px] text-slate-600">{subtitle}</p>
        </div>
      ),
    },
    style: {
      width: 230,
      borderRadius: 10,
      border: `2px solid ${color.border}`,
      background: color.bg,
      padding: 8,
      fontSize: 12,
      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    type: "default",
    selectable: false,
    connectable: false,
    focusable: false,
  }
}

function createFlowEdge(
  id: string,
  source: string,
  target: string,
  label?: string,
  dashed?: boolean
): Edge {
  return {
    id,
    source,
    target,
    label,
    labelStyle: { fontSize: 11, fill: "#334155" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#334155" },
    style: dashed
      ? { stroke: "#334155", strokeWidth: 1.6, strokeDasharray: "6 4" }
      : { stroke: "#334155", strokeWidth: 1.8 },
    type: "smoothstep",
  }
}

function buildStageFlowGraph(
  stage: MigrationStage,
  stableServiceName: string,
  canaryServiceName: string,
  stableRouteName: string,
  canaryRouteName: string,
  routeTypeLabel: string,
  stableWorkloadName: string,
  canaryWorkloadName: string
): { nodes: Node[]; edges: Edge[] } {
  const implicitCanaryTraffic = calculateImplicitCanaryTraffic(stage)
  const hasImplicitEndpointSplit = !stage.canaryRouteEnabled && !stage.canaryServiceEnabled && stage.canaryPods > 0
  const matchRuleDisplay = stage.matchRuleSummary ? trimText(stage.matchRuleSummary, 36) : "headers/query"
  const stableTraffic = stage.canaryRouteEnabled
    ? stage.trafficMode === "match"
      ? "rule-unmatched"
      : `${Math.max(0, 100 - stage.canaryTraffic)}%`
    : hasImplicitEndpointSplit
      ? `${Math.max(0, 100 - implicitCanaryTraffic)}% endpoint ratio`
      : "100%"
  const canaryTraffic = stage.canaryRouteEnabled
    ? stage.trafficMode === "match"
      ? `rule-matched (${matchRuleDisplay})`
      : `${stage.canaryTraffic}%`
    : hasImplicitEndpointSplit
      ? `${implicitCanaryTraffic}% endpoint ratio`
      : "0%"
  const hasCanaryWorkload = stage.useExtraCanaryDeployment || stage.canaryWorkloadReplicas > 0 || stage.canaryPods > 0
  const canaryServiceDisplay = stage.canaryServiceEnabled ? canaryServiceName : `${stableServiceName} (reused)`
  const canaryWorkloadDisplay = stage.useExtraCanaryDeployment ? canaryWorkloadName : `${stableWorkloadName} (shared)`

  const nodes: Node[] = [
    createFlowNode("stable-route", 20, 65, stableRouteName, `${routeTypeLabel} stable`, "route"),
    createFlowNode("stable-service", 290, 65, stableServiceName, `traffic=${stableTraffic}`, "service"),
    createFlowNode("stable-workload", 560, 65, stableWorkloadName, `replicas=${stage.stableWorkloadReplicas}`, "workload"),
    createFlowNode("stable-pods", 830, 65, "stable Pods", `target=${stage.stablePods}, actual=${stage.actualStablePods ?? "-"}`, "pods"),
  ]

  const edges: Edge[] = [
    createFlowEdge("stable-route-to-service", "stable-route", "stable-service", stableTraffic),
    createFlowEdge("stable-service-to-workload", "stable-service", "stable-workload"),
    createFlowEdge("stable-workload-to-pods", "stable-workload", "stable-pods"),
  ]

  if (hasCanaryWorkload) {
    if (stage.canaryIngressEnabled) {
      nodes.push(createFlowNode("canary-route", 20, 235, canaryRouteName, `${routeTypeLabel} canary`, "route"))
    }
    if (stage.canaryRouteEnabled || stage.canaryServiceEnabled) {
      nodes.push(createFlowNode("canary-service", 290, 235, canaryServiceDisplay, `traffic=${canaryTraffic}`, "service"))
    } else {
      nodes.push(createFlowNode("canary-note", 290, 235, "No explicit canary route", `traffic=${canaryTraffic}`, "notice"))
    }
    nodes.push(
      createFlowNode(
        "canary-workload",
        560,
        235,
        canaryWorkloadDisplay,
        `replicas=${stage.useExtraCanaryDeployment ? stage.canaryWorkloadReplicas : stage.canaryPods}`,
        "workload"
      ),
      createFlowNode("canary-pods", 830, 235, "canary Pods", `target=${stage.canaryPods}, actual=${stage.actualCanaryPods ?? "-"}`, "pods")
    )

    if (stage.canaryRouteEnabled || stage.canaryServiceEnabled) {
      if (stage.canaryIngressEnabled) {
        edges.push(createFlowEdge("canary-route-to-service", "canary-route", "canary-service", canaryTraffic))
      } else if (stage.canaryRouteEnabled) {
        edges.push(createFlowEdge("stable-route-to-canary-service", "stable-route", "canary-service", canaryTraffic, !stage.canaryServiceEnabled))
      } else {
        edges.push(createFlowEdge("stable-service-to-canary-service", "stable-service", "canary-service", canaryTraffic, true))
      }
      edges.push(createFlowEdge("canary-service-to-workload", "canary-service", "canary-workload", stage.canaryServiceEnabled ? undefined : "reused"))
    } else {
      edges.push(createFlowEdge("stable-service-to-canary-workload", "stable-service", "canary-workload", "no explicit route", true))
    }
    edges.push(createFlowEdge("canary-workload-to-pods", "canary-workload", "canary-pods"))
  }

  if (!stage.canaryRouteEnabled && stage.canaryPods === 0) {
    nodes.push(createFlowNode("route-off", 20, 235, "Canary route not created", "no matches / traffic=0", "notice"))
    edges.push(createFlowEdge("stable-route-to-route-off", "stable-route", "route-off", undefined, true))
  }

  return { nodes, edges }
}

function StageFlow({
  stages,
  stableServiceName,
  canaryServiceName,
  stableRouteName,
  canaryRouteName,
  routeTypeLabel,
  stableWorkloadName,
  canaryWorkloadName,
}: Readonly<{
  stages: MigrationStage[]
  stableServiceName: string
  canaryServiceName: string
  stableRouteName: string
  canaryRouteName: string
  routeTypeLabel: string
  stableWorkloadName: string
  canaryWorkloadName: string
}>) {
  return (
    <div className="space-y-4 rounded-md border bg-slate-50/40 p-3">
      {stages.map((stage, index) => {
        const style = STATUS_STYLE[stage.status]
        const canaryRouteSource = stage.canaryIngressEnabled ? canaryRouteName : stableRouteName
        const canaryServiceDisplay = stage.canaryServiceEnabled ? canaryServiceName : `${stableServiceName} (reused)`
        const { nodes, edges } = buildStageFlowGraph(
          stage,
          stableServiceName,
          canaryServiceName,
          stableRouteName,
          canaryRouteName,
          routeTypeLabel,
          stableWorkloadName,
          canaryWorkloadName
        )
        return (
          <div key={`stage-flow-${stage.id}`} className={cn("rounded-xl border bg-white p-3", style.border)}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white", style.marker)}>
                {stage.order}
              </span>
              <h4 className="text-base font-semibold text-slate-900">{stage.title}</h4>
              <Badge variant="outline" className="text-[11px]">{stage.status}</Badge>
            </div>

            <div className="mb-2 rounded-md border bg-white p-1">
              <div className="h-[430px] w-full" data-testid={`topology-reactflow-step-${stage.order}`}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  fitView
                  fitViewOptions={{ padding: 0.12 }}
                  minZoom={0.5}
                  maxZoom={1.6}
                  nodesDraggable
                  nodesConnectable={false}
                  elementsSelectable={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={16} size={1} color="#e2e8f0" />
                  <Controls position="bottom-right" />
                </ReactFlow>
              </div>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[1.7fr_1fr]">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <p className="font-mono text-[11px] text-slate-700">{stage.stepSpecSummary}</p>
                {stage.ops.slice(0, 5).map((op) => (
                  <p key={`${stage.id}-op-${op}`} className="text-[11px] leading-relaxed text-slate-700">
                    - {op}
                  </p>
                ))}
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
                <p>{`stable Route: ${stableRouteName}`}</p>
                <p>{`canary Route: ${stage.canaryRouteEnabled ? canaryRouteSource : "not created"}`}</p>
                <p>{`stable Service: ${stableServiceName}`}</p>
                <p>{`canary Service: ${stage.canaryServiceEnabled ? canaryServiceDisplay : "not created"}`}</p>
                <p>{`stable Workload: ${stableWorkloadName}`}</p>
                <p>{`canary Workload: ${stage.useExtraCanaryDeployment ? canaryWorkloadName : `${stableWorkloadName} (shared)`}`}</p>
              </div>
            </div>

            {index < stages.length - 1 && (
              <div className="mt-2 text-center text-xs text-slate-500">↓ next step</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function RolloutResourceTopologyDiagram({
  strategy,
  detail,
  snapshot,
  desiredWorkloadReplicas,
  actualStablePods,
  actualCanaryPods,
  title = "K8s 资源迁移时间线图",
  description = "按真实 spec.steps 展示 Pod 数量、流量切换、pause 时间，并支持 React Flow 拓扑模式。",
  sourceHint,
  defaultExpanded = false,
}: Readonly<RolloutResourceTopologyDiagramProps>) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [viewMode, setViewMode] = useState<TopologyViewMode>("cards")

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.set("topologyOpen", expanded ? "1" : "0")
    if (viewMode === "cards") {
      url.searchParams.delete("topologyView")
    } else {
      url.searchParams.set("topologyView", viewMode)
    }
    const next = `${url.pathname}${url.search}${url.hash}`
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (next !== current) {
      window.history.replaceState(window.history.state, "", next)
    }
  }, [expanded, viewMode])

  const routingScene = useMemo(() => resolveTrafficRoutingScene(detail), [detail])
  const stableServiceBase = routingScene.stableServiceBase
  const stableServiceName = `Service/${stableServiceBase}`
  const canaryServiceName = routingScene.hasDedicatedCanaryService
    ? `Service/${stableServiceBase}-canary`
    : `Service/${stableServiceBase}`
  const stableWorkloadName = detail ? `${detail.workloadRefKind}/${detail.workloadRef}` : "Deployment/stable"
  const canaryWorkloadName = detail
    ? `${detail.workloadRefKind}/${detail.workloadRef}-canary`
    : "Deployment/canary"

  const normalizedDesiredReplicas = parseNonNegativeInt(desiredWorkloadReplicas)
  const normalizedActualStable = parseNonNegativeInt(actualStablePods)
  const normalizedActualCanary = parseNonNegativeInt(actualCanaryPods)

  const stages = useMemo(
    () =>
      buildStagesFromDetail(
        strategy,
        detail,
        snapshot,
        routingScene,
        normalizedDesiredReplicas,
        normalizedActualStable,
        normalizedActualCanary
      ),
    [
      strategy,
      detail,
      snapshot,
      routingScene,
      normalizedDesiredReplicas,
      normalizedActualStable,
      normalizedActualCanary,
    ]
  )

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {sourceHint && (
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              {sourceHint}
            </span>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-cyan-50 text-cyan-700">{routingScene.routeTypeLabel}</Badge>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700">stable Service</Badge>
              <Badge variant="outline" className="bg-teal-50 text-teal-700">
                {routingScene.hasDedicatedCanaryService ? "canary Service" : "canary Service(reused stable)"}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">stable Deployment</Badge>
              <Badge variant="outline" className="bg-sky-50 text-sky-700">canary Deployment</Badge>
              <Badge variant="outline" className="bg-lime-50 text-lime-700">stable Pod</Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700">canary Pod</Badge>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {expanded ? "收起资源图" : "展开资源图"}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-3">
            {!detail && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                当前未选中具体 Rollout，显示的是通用迁移路径示例。
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "cards" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                阶段卡片
              </Button>
              <Button
                size="sm"
                variant={viewMode === "flow" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => setViewMode("flow")}
              >
                <Workflow className="h-3.5 w-3.5" />
                React Flow 图
              </Button>
            </div>

            {viewMode === "cards" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stages.map((stage) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    stableServiceName={stableServiceName}
                    canaryServiceName={canaryServiceName}
                    stableRouteName={routingScene.stableRouteName}
                    canaryRouteName={routingScene.canaryRouteName}
                    routeTypeLabel={routingScene.routeTypeLabel}
                    stableWorkloadName={stableWorkloadName}
                    canaryWorkloadName={canaryWorkloadName}
                  />
                ))}
              </div>
            ) : (
              <StageFlow
                stages={stages}
                stableServiceName={stableServiceName}
                canaryServiceName={canaryServiceName}
                stableRouteName={routingScene.stableRouteName}
                canaryRouteName={routingScene.canaryRouteName}
                routeTypeLabel={routingScene.routeTypeLabel}
                stableWorkloadName={stableWorkloadName}
                canaryWorkloadName={canaryWorkloadName}
              />
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

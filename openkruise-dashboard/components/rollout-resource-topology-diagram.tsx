"use client"

import { type ComponentType, type ReactNode, useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Info,
  Layers,
  LayoutGrid,
  Loader2,
  Maximize2,
  Route,
  Server,
  Workflow,
} from "lucide-react"
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  MarkerType,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
} from "@xyflow/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import type { ExplainerStrategy, LiveRolloutSnapshot } from "@/lib/rollout-explainer"
import type { RolloutStep, TransformedRolloutDetail } from "@/lib/rollout-utils"
import { cn } from "@/lib/utils"

type StageStatus = "done" | "current" | "pending"
type TrafficMode = "weight" | "match"
type TopologyViewMode = "cards" | "flow"
type TopologyEdgeTone = "stable" | "canary" | "neutral"
type FlowNodeTone = "route" | "service" | "workload" | "pods" | "notice"
type StepScalar = string | number | undefined

type TopologyEdgeData = Record<string, unknown> & {
  labelText?: string
  dashed?: boolean
  tone?: TopologyEdgeTone
}

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

function parseTrafficWeight(value: StepScalar, fallback: number): number {
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

function parseReplicaTarget(value: StepScalar, baseReplicas: number, fallback: number): number {
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

function resolveStableRouteName(
  hasIngressProvider: boolean,
  hasGatewayProvider: boolean,
  hasCustomProvider: boolean,
  ingressName: string,
  httpRouteName: string
): string {
  if (hasIngressProvider) {
    return `Ingress/${ingressName}`
  }
  if (hasGatewayProvider) {
    return `HTTPRoute/${httpRouteName}`
  }
  if (hasCustomProvider) {
    return "CustomNetworkRef"
  }
  return "TrafficRouting(not configured)"
}

function resolveRouteTypeLabel(
  hasIngressProvider: boolean,
  hasGatewayProvider: boolean,
  hasCustomProvider: boolean
): string {
  if (hasIngressProvider && !hasGatewayProvider && !hasCustomProvider) {
    return "Ingress"
  }
  if (!hasIngressProvider && hasGatewayProvider && !hasCustomProvider) {
    return "HTTPRoute"
  }
  if (!hasIngressProvider && !hasGatewayProvider && hasCustomProvider) {
    return "CustomNetwork"
  }
  if (hasIngressProvider || hasGatewayProvider || hasCustomProvider) {
    return "Ingress/HTTPRoute"
  }
  return "TrafficRouting"
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
  const routeTypeLabel = resolveRouteTypeLabel(hasIngressProvider, hasGatewayProvider, hasCustomProvider)

  const stableRouteName = resolveStableRouteName(
    hasIngressProvider,
    hasGatewayProvider,
    hasCustomProvider,
    ingressName,
    httpRouteName
  )
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

type StepTitleInput = {
  strategy: ExplainerStrategy
  order: number
  prevTraffic: number
  nextTraffic: number
  prevReplicas: number
  nextReplicas: number
  pauseText?: string
  matchMode: boolean
}

function getStepTitle({
  strategy,
  order,
  prevTraffic,
  nextTraffic,
  prevReplicas,
  nextReplicas,
  pauseText,
  matchMode,
}: StepTitleInput): string {
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

function resolveCanaryTrafficText(mode: TrafficMode, matchRuleSummary: string | undefined, nextTraffic: number): string {
  if (mode === "match") {
    return `rule(${matchRuleSummary ?? "headers/query"})`
  }
  return `${nextTraffic}%`
}

type TrafficDisplayMode = "card" | "flow"

function resolveTrafficLabels(
  stage: MigrationStage,
  implicitCanaryTraffic: number,
  matchRuleDisplay: string,
  mode: TrafficDisplayMode
): { stableTraffic: string; canaryTraffic: string } {
  const endpointSuffix = mode === "card" ? " (endpoint ratio)" : " endpoint ratio"
  const ruleMatchedLabel = mode === "card" ? `命中规则流量 (${matchRuleDisplay})` : `rule-matched (${matchRuleDisplay})`
  const ruleUnmatchedLabel = mode === "card" ? "未命中规则流量" : "rule-unmatched"

  if (stage.canaryRouteEnabled) {
    if (stage.trafficMode === "match") {
      return {
        stableTraffic: ruleUnmatchedLabel,
        canaryTraffic: ruleMatchedLabel,
      }
    }
    return {
      stableTraffic: `${Math.max(0, 100 - stage.canaryTraffic)}%`,
      canaryTraffic: `${stage.canaryTraffic}%`,
    }
  }

  const hasImplicitEndpointSplit = !stage.canaryServiceEnabled && stage.canaryPods > 0
  if (hasImplicitEndpointSplit) {
    return {
      stableTraffic: `${Math.max(0, 100 - implicitCanaryTraffic)}%${endpointSuffix}`,
      canaryTraffic: `${implicitCanaryTraffic}%${endpointSuffix}`,
    }
  }

  return {
    stableTraffic: "100%",
    canaryTraffic: "0%",
  }
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

function resolveBaseReplicas(
  desiredWorkloadReplicas: number | undefined,
  useExtraCanaryDeployment: boolean,
  stableCurrent: number,
  inferredTotal: number
): number {
  if (desiredWorkloadReplicas && desiredWorkloadReplicas > 0) {
    return desiredWorkloadReplicas
  }
  if (useExtraCanaryDeployment) {
    if (stableCurrent > 0) {
      return stableCurrent
    }
    if (inferredTotal > 0) {
      return inferredTotal
    }
    return 10
  }
  if (inferredTotal > 0) {
    return inferredTotal
  }
  return 10
}

type DefaultStageTemplate = {
  pods: number
  traffic: number
  mode: TrafficMode
  spec: string
}

function createDefaultStageTemplates(strategy: ExplainerStrategy, baseReplicas: number): DefaultStageTemplate[] {
  const tenPercentPods = Math.max(1, Math.ceil(baseReplicas * 0.1))
  const halfPods = Math.max(1, Math.ceil(baseReplicas * 0.5))
  const steps: DefaultStageTemplate[] = [
    { pods: tenPercentPods, traffic: 0, mode: "weight", spec: "replicas=10%, traffic=0%" },
    { pods: tenPercentPods, traffic: 10, mode: "weight", spec: "replicas=10%, traffic=10%" },
    { pods: halfPods, traffic: 50, mode: "weight", spec: "replicas=50%, traffic=50%" },
    { pods: baseReplicas, traffic: 100, mode: "weight", spec: "replicas=100%, traffic=100%" },
  ]
  if (strategy !== "abtest") {
    return steps
  }
  return [
    { pods: tenPercentPods, traffic: 0, mode: "match", spec: "replicas=10%, matches=1" },
    ...steps.slice(1),
  ]
}

function resolveBaselineSummary(useExtraCanaryDeployment: boolean, fromDetail: boolean): string {
  if (useExtraCanaryDeployment) {
    return fromDetail
      ? "stable Deployment 保持服务，等待创建 canary Deployment。"
      : "stable Deployment 提供全部流量，canary Deployment 尚未创建。"
  }
  return fromDetail
    ? "新版本尚未接流，先保持 stable baseline。"
    : "单 Deployment 基线运行，新版本 Pod 尚未接流量。"
}

function resolveBaselineStableServiceOperation(firstStepHasRoutingSignals: boolean): string {
  return firstStepHasRoutingSignals
    ? "stable Service selector -> stableRevision（首个 step 有 traffic/matches 时）"
    : "首个 step 仅 replicas，stable Service 保持原 selector"
}

function createBaselineOps(params: Readonly<{
  useExtraCanaryDeployment: boolean
  routingScene: TrafficRoutingScene
  firstStepHasRoutingSignals?: boolean
  includeRolloutInitialization?: boolean
}>): string[] {
  const ops: string[] = []
  if (params.includeRolloutInitialization) {
    ops.push("Rollout 初始化，Workload 标记 in-progressing")
  }
  const stableServiceOperation = params.firstStepHasRoutingSignals === undefined
    ? "stable Service selector -> stableRevision"
    : resolveBaselineStableServiceOperation(params.firstStepHasRoutingSignals)
  ops.push(stableServiceOperation)
  if (params.useExtraCanaryDeployment) {
    ops.push("canary Deployment not created yet")
  } else {
    ops.push(params.firstStepHasRoutingSignals === undefined ? "Workload partition=stable" : "canary replicas=0")
  }
  if (params.routingScene.hasTrafficRoutingRef) {
    const routeOperation = params.firstStepHasRoutingSignals === undefined
      ? `${params.routingScene.routeTypeLabel} 100% -> stable Service`
      : `${params.routingScene.routeTypeLabel} 默认保持 stable 路径`
    ops.push(routeOperation)
  } else {
    ops.push("未配置 trafficRoutings，不会创建 canary Service/Ingress")
  }
  return ops
}

function resolveDefaultStepSummary(
  item: DefaultStageTemplate,
  pods: ReturnType<typeof calcPodsByStyle>,
  baseReplicas: number,
  matchRuleSummary: string | undefined
): string {
  if (item.mode === "match") {
    return `canary Pod ${pods.canaryPods}，按规则导流（${matchRuleSummary ?? "headers/query 规则命中流量"}）`
  }
  return `canary Pod ${pods.canaryPods}（约 ${toPercent(item.pods, baseReplicas)}%），canary traffic ${item.traffic}%`
}

function createDefaultStepOps(params: Readonly<{
  useExtraCanaryDeployment: boolean
  pods: ReturnType<typeof calcPodsByStyle>
  item: DefaultStageTemplate
  routingScene: TrafficRoutingScene
  canaryServiceEnabled: boolean
  matchRuleSummary: string | undefined
  order: number
}>): string[] {
  const ops: string[] = []
  if (params.useExtraCanaryDeployment) {
    ops.push(`Canary Deployment replicas -> ${params.pods.canaryWorkloadReplicas}`)
  } else {
    ops.push(`Workload partition update -> canary replicas ${params.item.pods}`)
  }

  if (!params.routingScene.hasTrafficRoutingRef) {
    ops.push("未配置 trafficRoutings，跳过 Service/Ingress/HTTPRoute patch")
  } else if (params.item.mode === "match") {
    ops.push(
      "TrafficRouting.patch: matches(headers/query) -> canary Service",
      `Match Rule: ${params.matchRuleSummary ?? "headers/query 规则命中流量"}`
    )
  } else {
    ops.push(`TrafficRouting.patch: canary weight -> ${params.item.traffic}%`)
    if (params.item.traffic === 0) {
      const trafficZeroOperation = params.canaryServiceEnabled
        ? "traffic=0%，canary Service 已创建用于后续步骤，canary 路由资源暂不创建"
        : "traffic=0%，canary 路由资源保持未创建或已清理"
      ops.push(trafficZeroOperation)
    }
  }

  if (params.order === 1 && params.item.traffic === 0) {
    ops.push("新 Pod 已启动但流量仍保持 0% canary")
  }
  return ops
}

function buildDefaultStages(
  strategy: ExplainerStrategy,
  baseReplicas: number,
  snapshot: LiveRolloutSnapshot | null | undefined,
  useExtraCanaryDeployment: boolean,
  routingScene: TrafficRoutingScene
): MigrationStage[] {
  const defaults = createDefaultStageTemplates(strategy, baseReplicas)

  const baselinePods = calcPodsByStyle(useExtraCanaryDeployment, baseReplicas, 0)
  const stages: MigrationStage[] = [
    {
      id: "baseline",
      order: 0,
      title: "Step 0: Stable 基线",
      summary: resolveBaselineSummary(useExtraCanaryDeployment, false),
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
      ops: createBaselineOps({
        useExtraCanaryDeployment,
        routingScene,
      }),
    },
  ]

  let prevCanaryReplicas = 0
  let prevTraffic = 0
  defaults.forEach((item, index) => {
    const order = index + 1
    const title = getStepTitle({
      strategy,
      order,
      prevTraffic,
      nextTraffic: item.traffic,
      prevReplicas: prevCanaryReplicas,
      nextReplicas: item.pods,
      pauseText: undefined,
      matchMode: item.mode === "match",
    })
    const pods = calcPodsByStyle(useExtraCanaryDeployment, baseReplicas, item.pods)
    const matchRuleSummary = item.mode === "match" ? "headers/query 规则命中流量" : undefined
    const summary = resolveDefaultStepSummary(item, pods, baseReplicas, matchRuleSummary)
    const canaryRouteEnabled = routingScene.hasTrafficRoutingRef && (item.mode === "match" || item.traffic > 0)
    const canaryServiceEnabled = routingScene.hasTrafficRoutingRef && routingScene.hasDedicatedCanaryService
    const ops = createDefaultStepOps({
      useExtraCanaryDeployment,
      pods,
      item,
      routingScene,
      canaryServiceEnabled,
      matchRuleSummary,
      order,
    })

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

function resolveDetailStepSummary(
  useExtraCanaryDeployment: boolean,
  pods: ReturnType<typeof calcPodsByStyle>,
  canaryTrafficText: string
): string {
  if (useExtraCanaryDeployment) {
    return `stable Deployment=${pods.stableWorkloadReplicas}，canary Deployment=${pods.canaryWorkloadReplicas}，canary traffic=${canaryTrafficText}`
  }
  return `stable Pod ${pods.stablePods}，canary Pod ${pods.canaryPods}，canary traffic ${canaryTrafficText}`
}

function createWorkloadOps(params: Readonly<{
  useExtraCanaryDeployment: boolean
  prevCanaryWorkloadReplicas: number
  nextCanaryWorkloadReplicas: number
  stepReplicas: StepScalar
  nextCanaryReplicas: number
}>): string[] {
  if (params.useExtraCanaryDeployment) {
    if (params.prevCanaryWorkloadReplicas === 0 && params.nextCanaryWorkloadReplicas > 0) {
      return [`Create canary Deployment, replicas=${params.nextCanaryWorkloadReplicas}`]
    }
    if (params.prevCanaryWorkloadReplicas !== params.nextCanaryWorkloadReplicas) {
      return [`Patch canary Deployment replicas -> ${params.nextCanaryWorkloadReplicas}`]
    }
    return []
  }
  if (params.stepReplicas !== undefined) {
    return [`Update workload partition -> canary replicas ${params.nextCanaryReplicas}`]
  }
  return []
}

function createRoutingOps(params: Readonly<{
  routingScene: TrafficRoutingScene
  stepTraffic: StepScalar
  nextTraffic: number
  matchMode: boolean
  canaryServiceEnabled: boolean
  matchRuleSummary: string | undefined
}>): string[] {
  if (!params.routingScene.hasTrafficRoutingRef) {
    if (params.stepTraffic !== undefined || params.matchMode) {
      return ["未配置 trafficRoutings，TrafficRouting 相关 patch 不会执行"]
    }
    return []
  }

  const ops: string[] = []
  if (params.stepTraffic !== undefined) {
    ops.push(`TrafficRouting.patch: canary weight -> ${params.nextTraffic}%`)
    if (params.nextTraffic === 0 && !params.matchMode) {
      const trafficZeroOperation = params.canaryServiceEnabled
        ? "traffic=0%，canary Service 已创建用于后续步骤，canary 路由资源暂不创建"
        : "traffic=0%，canary 路由资源保持未创建或已清理"
      ops.push(trafficZeroOperation)
    }
  }
  if (params.matchMode) {
    ops.push("TrafficRouting.patch: matches(headers/query) -> canary Service")
    if (params.matchRuleSummary) {
      ops.push(`Match Rule: ${params.matchRuleSummary}`)
    }
  }
  return ops
}

function createImplicitTrafficOp(params: Readonly<{
  matchMode: boolean
  stepTraffic: StepScalar
  nextCanaryReplicas: number
  pods: ReturnType<typeof calcPodsByStyle>
}>): string[] {
  if (params.matchMode || params.stepTraffic !== undefined || params.nextCanaryReplicas <= 0) {
    return []
  }
  const implicit = Math.max(0, Math.min(100, toPercent(params.pods.canaryPods, params.pods.canaryPods + params.pods.stablePods)))
  return [`未显式配置 traffic，流量按 stable Service endpoints 自然分配（约 canary ${implicit}%）`]
}

function createPauseOps(pauseText: string | undefined): string[] {
  if (!pauseText) {
    return []
  }
  return [`Rollout.statusPatch: StepPaused，pause=${pauseText}`]
}

function createDetailStepOps(params: Readonly<{
  useExtraCanaryDeployment: boolean
  prevCanaryWorkloadReplicas: number
  nextCanaryWorkloadReplicas: number
  stepReplicas: StepScalar
  nextCanaryReplicas: number
  routingScene: TrafficRoutingScene
  stepTraffic: StepScalar
  nextTraffic: number
  matchMode: boolean
  canaryServiceEnabled: boolean
  matchRuleSummary: string | undefined
  pauseText: string | undefined
  order: number
  pods: ReturnType<typeof calcPodsByStyle>
}>): string[] {
  const ops = [
    ...createWorkloadOps({
      useExtraCanaryDeployment: params.useExtraCanaryDeployment,
      prevCanaryWorkloadReplicas: params.prevCanaryWorkloadReplicas,
      nextCanaryWorkloadReplicas: params.nextCanaryWorkloadReplicas,
      stepReplicas: params.stepReplicas,
      nextCanaryReplicas: params.nextCanaryReplicas,
    }),
    ...createRoutingOps({
      routingScene: params.routingScene,
      stepTraffic: params.stepTraffic,
      nextTraffic: params.nextTraffic,
      matchMode: params.matchMode,
      canaryServiceEnabled: params.canaryServiceEnabled,
      matchRuleSummary: params.matchRuleSummary,
    }),
    ...createImplicitTrafficOp({
      matchMode: params.matchMode,
      stepTraffic: params.stepTraffic,
      nextCanaryReplicas: params.nextCanaryReplicas,
      pods: params.pods,
    }),
    ...createPauseOps(params.pauseText),
  ]
  if (params.order === 1 && params.nextCanaryReplicas > 0 && params.nextTraffic === 0 && !params.matchMode) {
    ops.push("新 Pod 已启动但流量仍保持 0% canary")
  }
  if (ops.length === 0) {
    return ["Rollout 继续 Reconcile，保持当前流量/副本目标"]
  }
  return ops
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
  const baseReplicas = resolveBaseReplicas(
    desiredWorkloadReplicas,
    useExtraCanaryDeployment,
    stableCurrent,
    inferredTotal
  )

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
      summary: resolveBaselineSummary(useExtraCanaryDeployment, true),
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
      ops: createBaselineOps({
        useExtraCanaryDeployment,
        routingScene,
        firstStepHasRoutingSignals,
        includeRolloutInitialization: true,
      }),
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
      step.replicas,
      baseReplicas,
      prevCanaryReplicas
    )
    const nextTraffic = parseTrafficWeight(step.traffic, prevTraffic)
    const pods = calcPodsByStyle(useExtraCanaryDeployment, baseReplicas, nextCanaryReplicas)
    const canaryRouteEnabled = routingScene.hasTrafficRoutingRef && (matchMode || nextTraffic > 0)
    const canaryServiceEnabled =
      routingScene.hasTrafficRoutingRef &&
      routingScene.hasDedicatedCanaryService &&
      (matchMode || step.traffic !== undefined)

    const title = getStepTitle({
      strategy,
      order,
      prevTraffic,
      nextTraffic,
      prevReplicas: prevCanaryReplicas,
      nextReplicas: nextCanaryReplicas,
      pauseText,
      matchMode,
    })
    const canaryTrafficText = resolveCanaryTrafficText(nextMode, matchRuleSummary, nextTraffic)
    const summary = resolveDetailStepSummary(useExtraCanaryDeployment, pods, canaryTrafficText)
    const ops = createDetailStepOps({
      useExtraCanaryDeployment,
      prevCanaryWorkloadReplicas,
      nextCanaryWorkloadReplicas: pods.canaryWorkloadReplicas,
      stepReplicas: step.replicas,
      nextCanaryReplicas,
      routingScene,
      stepTraffic: step.traffic,
      nextTraffic,
      matchMode,
      canaryServiceEnabled,
      matchRuleSummary,
      pauseText,
      order,
      pods,
    })

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
  const matchRuleDisplay = stage.matchRuleSummary ? trimText(stage.matchRuleSummary, 44) : "headers/query"
  const { stableTraffic, canaryTraffic } = resolveTrafficLabels(stage, implicitCanaryTraffic, matchRuleDisplay, "card")
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
        {stage.status === "current" && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
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

const FLOW_NODE_TONES: Record<FlowNodeTone, {
  border: string; bg: string; titleColor: string
  iconBg: string; iconColor: string
  typeBg: string; typeColor: string
}> = {
  route:    { border: "#06b6d4", bg: "#ecfeff", titleColor: "#0e7490", iconBg: "#cffafe", iconColor: "#0e7490", typeBg: "#cffafe", typeColor: "#0e7490" },
  service:  { border: "#6366f1", bg: "#eef2ff", titleColor: "#3730a3", iconBg: "#e0e7ff", iconColor: "#4338ca", typeBg: "#e0e7ff", typeColor: "#4338ca" },
  workload: { border: "#38bdf8", bg: "#eff6ff", titleColor: "#0369a1", iconBg: "#e0f2fe", iconColor: "#0284c7", typeBg: "#e0f2fe", typeColor: "#0284c7" },
  pods:     { border: "#22c55e", bg: "#ecfdf5", titleColor: "#166534", iconBg: "#dcfce7", iconColor: "#15803d", typeBg: "#dcfce7", typeColor: "#15803d" },
  notice:   { border: "#a3a3a3", bg: "#f8fafc", titleColor: "#334155", iconBg: "#e2e8f0", iconColor: "#475569", typeBg: "#f1f5f9", typeColor: "#64748b" },
}

const FLOW_NODE_ICONS: Record<FlowNodeTone, ComponentType<{ className?: string; size?: number; color?: string }>> = {
  route:    Globe,
  service:  Layers,
  workload: Server,
  pods:     Boxes,
  notice:   Info,
}

const FLOW_NODE_TYPE_LABELS: Record<FlowNodeTone, string> = {
  route:    "Route",
  service:  "Service",
  workload: "Workload",
  pods:     "Pods",
  notice:   "Notice",
}

function createFlowNode(
  id: string,
  x: number,
  y: number,
  title: string,
  subtitle: string,
  tone: FlowNodeTone
): Node<{ label: ReactNode; title: string; subtitle: string }> {
  const color = FLOW_NODE_TONES[tone]
  const Icon = FLOW_NODE_ICONS[tone]
  const typeLabel = FLOW_NODE_TYPE_LABELS[tone]

  return {
    id,
    position: { x, y },
    data: {
      title,
      subtitle,
      label: (
        <div>
          {/* 图标徽章 + 资源类型标签 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 6,
              background: color.iconBg,
              flexShrink: 0,
            }}>
              <Icon size={13} color={color.iconColor} />
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: color.typeColor,
              background: color.typeBg,
              borderRadius: 4,
              padding: "1px 6px",
              letterSpacing: "0.03em",
            }}>
              {typeLabel}
            </span>
          </div>
          {/* 资源名称 */}
          <p style={{ fontSize: 13, fontWeight: 700, color: color.titleColor, lineHeight: 1.3, marginBottom: 3 }}>
            {title}
          </p>
          {/* 副标题 */}
          <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>
            {subtitle}
          </p>
        </div>
      ),
    },
    style: {
      width: 256,
      minHeight: 96,
      borderRadius: 12,
      border: `2px solid ${color.border}`,
      background: color.bg,
      padding: "10px 12px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
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

function resolveEdgeStroke(tone: TopologyEdgeTone | undefined): string {
  if (tone === "stable") {
    return "#1d4ed8"  // blue-700：稳定路径
  }
  if (tone === "canary") {
    return "#d97706"  // amber-600：canary 路径
  }
  return "#94a3b8"  // slate-400：中性/虚线
}

function estimateLabelLineCount(text: string, charsPerLine = 27): number {
  const words = text.trim().split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0) {
    return 1
  }

  let lines = 1
  let width = 0
  words.forEach((word) => {
    if (width === 0) {
      width = word.length
      return
    }
    const next = width + 1 + word.length
    if (next > charsPerLine) {
      lines += 1
      width = word.length
      return
    }
    width = next
  })
  return lines
}

function TopologyEdge(props: Readonly<EdgeProps<Edge<TopologyEdgeData>>>): ReactNode {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    data,
  } = props

  const tone = data?.tone ?? "neutral"
  const stroke = resolveEdgeStroke(tone)
  const dashed = Boolean(data?.dashed)
  const labelText = data?.labelText?.trim() ?? ""
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
    offset: 20,
  })
  const lineCount = estimateLabelLineCount(labelText)
  const yOffset = 16 + Math.max(0, lineCount - 1) * 14

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: dashed ? 1.6 : 1.8,
          strokeDasharray: dashed ? "6 4" : undefined,
        }}
      />
      {labelText ? (
        <EdgeLabelRenderer>
          <div
            data-testid={`topology-edge-label-${id}`}
            className="pointer-events-none absolute max-w-[300px] whitespace-normal wrap-break-word text-[13px] leading-[1.35rem] text-slate-700"
            style={{
              left: labelX,
              top: labelY,
              transform: `translate(-50%, calc(-100% - ${yOffset}px))`,
              textShadow: "0 1px 1px rgba(255,255,255,0.88)",
              zIndex: 40,
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

function createFlowEdge(
  id: string,
  source: string,
  target: string,
  label?: string,
  options?: {
    dashed?: boolean
    tone?: TopologyEdgeTone
  }
): Edge<TopologyEdgeData> {
  const tone = options?.tone ?? "neutral"
  const dashed = options?.dashed ?? false
  const stroke = resolveEdgeStroke(tone)

  return {
    id,
    source,
    target,
    type: "topologyEdge",
    data: {
      labelText: label,
      dashed,
      tone,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
    style: dashed
      ? { stroke, strokeWidth: 1.6, strokeDasharray: "6 4" }
      : { stroke, strokeWidth: 1.8 },
    zIndex: dashed ? 2 : 3,
  }
}

type StageFlowResourceNames = {
  stableServiceName: string
  canaryServiceName: string
  stableRouteName: string
  canaryRouteName: string
  routeTypeLabel: string
  stableWorkloadName: string
  canaryWorkloadName: string
}

type StageFlowGraphParams = StageFlowResourceNames & {
  stage: MigrationStage
}

function buildStableLane(params: Readonly<{
  stage: MigrationStage
  names: StageFlowResourceNames
  stableTraffic: string
}>): { nodes: Node[]; edges: Edge[] } {
  const { stage, names, stableTraffic } = params
  return {
    nodes: [
      createFlowNode("stable-route", 20, 65, names.stableRouteName, `${names.routeTypeLabel} stable`, "route"),
      createFlowNode("stable-service", 410, 65, names.stableServiceName, `traffic=${stableTraffic}`, "service"),
      createFlowNode("stable-workload", 800, 65, names.stableWorkloadName, `replicas=${stage.stableWorkloadReplicas}`, "workload"),
      createFlowNode("stable-pods", 1190, 65, "stable Pods", `target=${stage.stablePods}, actual=${stage.actualStablePods ?? "-"}`, "pods"),
    ],
    edges: [
      createFlowEdge("stable-route-to-service", "stable-route", "stable-service", stableTraffic, { tone: "stable" }),
      createFlowEdge("stable-service-to-workload", "stable-service", "stable-workload", undefined, { tone: "stable" }),
      createFlowEdge("stable-workload-to-pods", "stable-workload", "stable-pods", undefined, { tone: "stable" }),
    ],
  }
}

function createCanaryEntryNode(params: Readonly<{
  stage: MigrationStage
  names: StageFlowResourceNames
  canaryTraffic: string
}>): Node {
  const canaryServiceDisplay = params.stage.canaryServiceEnabled
    ? params.names.canaryServiceName
    : `${params.names.stableServiceName} (reused)`
  if (params.stage.canaryRouteEnabled || params.stage.canaryServiceEnabled) {
    return createFlowNode("canary-service", 410, 235, canaryServiceDisplay, `traffic=${params.canaryTraffic}`, "service")
  }
  return createFlowNode("canary-note", 410, 235, "No explicit canary route", `traffic=${params.canaryTraffic}`, "notice")
}

function createCanaryRoutingEdges(params: Readonly<{
  stage: MigrationStage
  canaryTraffic: string
}>): Edge[] {
  if (!params.stage.canaryRouteEnabled && !params.stage.canaryServiceEnabled) {
    return [
      createFlowEdge("stable-service-to-canary-workload", "stable-service", "canary-workload", "no explicit route", {
        dashed: true,
        tone: "neutral",
      }),
    ]
  }

  const edges: Edge[] = []
  if (params.stage.canaryIngressEnabled) {
    edges.push(createFlowEdge("canary-route-to-service", "canary-route", "canary-service", params.canaryTraffic, { tone: "canary" }))
  } else if (params.stage.canaryRouteEnabled) {
    edges.push(
      createFlowEdge("stable-route-to-canary-service", "stable-route", "canary-service", params.canaryTraffic, {
        dashed: !params.stage.canaryServiceEnabled,
        tone: params.stage.canaryServiceEnabled ? "canary" : "neutral",
      })
    )
  } else {
    edges.push(
      createFlowEdge("stable-service-to-canary-service", "stable-service", "canary-service", params.canaryTraffic, {
        dashed: true,
        tone: "neutral",
      })
    )
  }
  edges.push(
    createFlowEdge("canary-service-to-workload", "canary-service", "canary-workload", params.stage.canaryServiceEnabled ? undefined : "reused", {
      tone: params.stage.canaryServiceEnabled ? "canary" : "neutral",
    })
  )
  return edges
}

function appendCanaryLane(
  graph: { nodes: Node[]; edges: Edge[] },
  params: Readonly<{
    stage: MigrationStage
    names: StageFlowResourceNames
    canaryTraffic: string
  }>
): void {
  const hasCanaryWorkload = params.stage.useExtraCanaryDeployment || params.stage.canaryWorkloadReplicas > 0 || params.stage.canaryPods > 0
  if (!hasCanaryWorkload) {
    return
  }

  const canaryWorkloadDisplay = params.stage.useExtraCanaryDeployment
    ? params.names.canaryWorkloadName
    : `${params.names.stableWorkloadName} (shared)`
  const canaryNodes: Node[] = [
    ...(params.stage.canaryIngressEnabled
      ? [createFlowNode("canary-route", 20, 235, params.names.canaryRouteName, `${params.names.routeTypeLabel} canary`, "route")]
      : []),
    createCanaryEntryNode(params),
    createFlowNode(
      "canary-workload",
      800,
      235,
      canaryWorkloadDisplay,
      `replicas=${params.stage.useExtraCanaryDeployment ? params.stage.canaryWorkloadReplicas : params.stage.canaryPods}`,
      "workload"
    ),
    createFlowNode("canary-pods", 1190, 235, "canary Pods", `target=${params.stage.canaryPods}, actual=${params.stage.actualCanaryPods ?? "-"}`, "pods"),
  ]
  graph.nodes.push(...canaryNodes)

  const canaryEdges = [
    ...createCanaryRoutingEdges({ stage: params.stage, canaryTraffic: params.canaryTraffic }),
    createFlowEdge("canary-workload-to-pods", "canary-workload", "canary-pods", undefined, { tone: "canary" }),
  ]
  graph.edges.push(...canaryEdges)
}

function appendRouteOffNotice(graph: { nodes: Node[]; edges: Edge[] }, stage: MigrationStage): void {
  if (stage.canaryRouteEnabled || stage.canaryPods > 0) {
    return
  }
  graph.nodes.push(createFlowNode("route-off", 410, 235, "Canary route not created", "no matches / traffic=0", "notice"))
  graph.edges.push(
    createFlowEdge("stable-route-to-route-off", "stable-route", "route-off", undefined, {
      dashed: true,
      tone: "neutral",
    })
  )
}

function resolveStageFlowDisplayNames(
  stage: MigrationStage,
  names: Pick<StageFlowResourceNames, "canaryRouteName" | "stableRouteName" | "canaryServiceName" | "stableServiceName" | "canaryWorkloadName" | "stableWorkloadName">
): {
  canaryRouteSource: string
  canaryServiceDisplay: string
  canaryWorkloadDisplay: string
} {
  const canaryRouteSource = stage.canaryIngressEnabled ? names.canaryRouteName : names.stableRouteName
  const canaryServiceDisplay = stage.canaryServiceEnabled ? names.canaryServiceName : `${names.stableServiceName} (reused)`
  const canaryWorkloadDisplay = stage.useExtraCanaryDeployment ? names.canaryWorkloadName : `${names.stableWorkloadName} (shared)`
  return {
    canaryRouteSource,
    canaryServiceDisplay,
    canaryWorkloadDisplay,
  }
}

export function buildStageFlowGraph({
  stage,
  stableServiceName,
  canaryServiceName,
  stableRouteName,
  canaryRouteName,
  routeTypeLabel,
  stableWorkloadName,
  canaryWorkloadName,
}: Readonly<StageFlowGraphParams>): { nodes: Node[]; edges: Edge[] } {
  const implicitCanaryTraffic = calculateImplicitCanaryTraffic(stage)
  const matchRuleDisplay = stage.matchRuleSummary ?? "headers/query"
  const { stableTraffic, canaryTraffic } = resolveTrafficLabels(stage, implicitCanaryTraffic, matchRuleDisplay, "flow")
  const names: StageFlowResourceNames = {
    stableServiceName,
    canaryServiceName,
    stableRouteName,
    canaryRouteName,
    routeTypeLabel,
    stableWorkloadName,
    canaryWorkloadName,
  }
  const graph = buildStableLane({ stage, names, stableTraffic })
  appendCanaryLane(graph, { stage, names, canaryTraffic })
  appendRouteOffNotice(graph, stage)
  return graph
}

function StageFlowStepPicker({
  stages,
  currentIndex,
  onPrev,
  onNext,
  onSelect,
}: Readonly<{
  stages: MigrationStage[]
  currentIndex: number
  onPrev: () => void
  onNext: () => void
  onSelect: (i: number) => void
}>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentIndex === 0} onClick={onPrev} aria-label="上一步">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {stages.map((s, index) => {
        const s_style = STATUS_STYLE[s.status]
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-semibold text-white transition-opacity",
              s_style.marker,
              index === currentIndex ? "ring-2 ring-offset-1 ring-blue-400" : "opacity-60 hover:opacity-90"
            )}
            aria-current={index === currentIndex ? "step" : undefined}
            title={s.title}
          >
            {s.order}
          </button>
        )
      })}
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentIndex === stages.length - 1} onClick={onNext} aria-label="下一步">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="ml-1 text-xs text-slate-500">
        {currentIndex + 1} / {stages.length}
      </span>
    </div>
  )
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
  const edgeTypes = useMemo(() => ({ topologyEdge: TopologyEdge }), [])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)

  const clampedIndex = Math.max(0, Math.min(selectedIndex, stages.length - 1))
  const clampedFullscreenIndex = Math.max(0, Math.min(fullscreenIndex, stages.length - 1))
  const stage = stages[clampedIndex]
  const fullscreenStage = stages[clampedFullscreenIndex]

  const { canaryRouteSource, canaryServiceDisplay, canaryWorkloadDisplay } = useMemo(
    () =>
      resolveStageFlowDisplayNames(stage, {
        canaryRouteName,
        stableRouteName,
        canaryServiceName,
        stableServiceName,
        canaryWorkloadName,
        stableWorkloadName,
      }),
    [stage, canaryRouteName, stableRouteName, canaryServiceName, stableServiceName, canaryWorkloadName, stableWorkloadName]
  )

  const { nodes, edges } = useMemo(
    () =>
      buildStageFlowGraph({
        stage,
        stableServiceName,
        canaryServiceName,
        stableRouteName,
        canaryRouteName,
        routeTypeLabel,
        stableWorkloadName,
        canaryWorkloadName,
      }),
    [stage, stableServiceName, canaryServiceName, stableRouteName, canaryRouteName, routeTypeLabel, stableWorkloadName, canaryWorkloadName]
  )

  const { nodes: fullscreenNodes, edges: fullscreenEdges } = useMemo(
    () =>
      buildStageFlowGraph({
        stage: fullscreenStage,
        stableServiceName,
        canaryServiceName,
        stableRouteName,
        canaryRouteName,
        routeTypeLabel,
        stableWorkloadName,
        canaryWorkloadName,
      }),
    [fullscreenStage, stableServiceName, canaryServiceName, stableRouteName, canaryRouteName, routeTypeLabel, stableWorkloadName, canaryWorkloadName]
  )

  if (!stage) {
    return null
  }

  const style = STATUS_STYLE[stage.status]
  const fsStyle = fullscreenStage ? STATUS_STYLE[fullscreenStage.status] : style

  return (
    <div className="space-y-3 rounded-md border bg-slate-50/40 p-3">
      {/* Stage 选择器 */}
      <StageFlowStepPicker
        stages={stages}
        currentIndex={clampedIndex}
        onPrev={() => setSelectedIndex((i) => Math.max(0, i - 1))}
        onNext={() => setSelectedIndex((i) => Math.min(stages.length - 1, i + 1))}
        onSelect={(i) => setSelectedIndex(i)}
      />

      {/* 当前 Stage */}
      <div className={cn("rounded-xl border bg-white p-3", style.border)}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white", style.marker)}>
            {stage.order}
          </span>
          <h4 className="text-base font-semibold text-slate-900">{stage.title}</h4>
          <Badge variant="outline" className="text-[11px]">{stage.status}</Badge>
        </div>

        <div className="relative mb-2 rounded-md border bg-white p-1">
          <div className="h-[430px] w-full" data-testid={`topology-reactflow-step-${stage.order}`}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.5}
              maxZoom={1.6}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable={false}
            >
              <Background gap={16} size={1} color="#e2e8f0" />
              <Controls position="bottom-right" />
            </ReactFlow>
          </div>
          <div className="absolute right-3 top-3 z-10">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setFullscreenIndex(clampedIndex)
                setFullscreenOpen(true)
              }}
              aria-label="全屏查看流程图"
              title="全屏查看"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
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
            {stage.ops.length > 5 && (
              <p className="mt-0.5 text-[11px] text-slate-400">… 另 {stage.ops.length - 5} 项操作</p>
            )}
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
            <p>{`stable Route: ${stableRouteName}`}</p>
            <p>{`canary Route: ${stage.canaryRouteEnabled ? canaryRouteSource : "not created"}`}</p>
            <p>{`stable Service: ${stableServiceName}`}</p>
            <p>{`canary Service: ${stage.canaryServiceEnabled ? canaryServiceDisplay : "not created"}`}</p>
            <p>{`stable Workload: ${stableWorkloadName}`}</p>
            <p>{`canary Workload: ${canaryWorkloadDisplay}`}</p>
          </div>
        </div>
      </div>

      {/* 全屏 Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="flex h-[92vh] w-full max-w-[94vw] flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
          <div className="flex shrink-0 items-center justify-between border-b px-5 py-3 pr-14">
            <DialogTitle className="text-base font-semibold">K8s 资源拓扑图（全屏）</DialogTitle>
            {fullscreenStage && (
              <div className="mr-2 flex items-center gap-2">
                <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold text-white", fsStyle.marker)}>
                  {fullscreenStage.order}
                </span>
                <span className="text-sm font-medium text-slate-700">{fullscreenStage.title}</span>
                <Badge variant="outline" className="text-[10px]">{fullscreenStage.status}</Badge>
              </div>
            )}
          </div>
          <div className="shrink-0 border-b bg-slate-50/70 px-4 py-2">
            <StageFlowStepPicker
              stages={stages}
              currentIndex={clampedFullscreenIndex}
              onPrev={() => setFullscreenIndex((i) => Math.max(0, i - 1))}
              onNext={() => setFullscreenIndex((i) => Math.min(stages.length - 1, i + 1))}
              onSelect={(i) => setFullscreenIndex(i)}
            />
          </div>
          <div className="min-h-0 flex-1">
            <ReactFlow
              key={fullscreenStage?.id}
              nodes={fullscreenNodes}
              edges={fullscreenEdges}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.3}
              maxZoom={2.5}
              nodesDraggable
              nodesConnectable={false}
              panOnDrag
              panOnScroll
              zoomOnScroll
              zoomOnPinch
              zoomOnDoubleClick={false}
            >
              <Background gap={16} size={1} color="#e2e8f0" />
              <Controls position="bottom-right" />
            </ReactFlow>
          </div>
        </DialogContent>
      </Dialog>
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
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof globalThis.window === "undefined") return defaultExpanded
    return new URLSearchParams(globalThis.window.location.search).get("topologyOpen") === "1" || defaultExpanded
  })
  const [viewMode, setViewMode] = useState<TopologyViewMode>(() => {
    if (typeof globalThis.window === "undefined") return "cards"
    return new URLSearchParams(globalThis.window.location.search).get("topologyView") === "flow" ? "flow" : "cards"
  })

  useEffect(() => {
    if (globalThis.window === undefined) {
      return
    }
    const url = new URL(globalThis.window.location.href)
    url.searchParams.set("topologyOpen", expanded ? "1" : "0")
    if (viewMode === "cards") {
      url.searchParams.delete("topologyView")
    } else {
      url.searchParams.set("topologyView", viewMode)
    }
    const next = `${url.pathname}${url.search}${url.hash}`
    const current = `${globalThis.window.location.pathname}${globalThis.window.location.search}${globalThis.window.location.hash}`
    if (next !== current) {
      globalThis.window.history.replaceState(globalThis.window.history.state, "", next)
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

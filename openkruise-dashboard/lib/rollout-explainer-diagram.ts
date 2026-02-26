import {
  getExplainerSteps,
  mapSnapshotToExplainerStep,
  type ExplainerStep,
  type ExplainerStrategy,
  type LiveRolloutSnapshot,
} from "./rollout-explainer"
import { getStepTypeLabel, type RolloutStep, type TransformedRolloutDetail } from "./rollout-utils"

export type DiagramKind = "canary" | "abtest" | "trigger" | "edge" | "live"

export type DiagramNodeStatus = "done" | "current" | "pending" | "blocked" | "disabled"

export type DiagramNodeIcon =
  | "workflow"
  | "rocket"
  | "route"
  | "chart"
  | "pause"
  | "check"
  | "shield"
  | "ban"
  | "user"
  | "webhook"
  | "watch"
  | "refresh"
  | "rollback"
  | "repeat"
  | "scale"

export interface DiagramNode {
  id: string
  label: string
  subLabel: string
  detailLines?: string[]
  x: number
  y: number
  width: number
  height: number
  status: DiagramNodeStatus
  icon: DiagramNodeIcon
  stepId?: string
  tooltip?: string
}

export interface DiagramEdge {
  id: string
  from: string
  to: string
  label?: string
  style: "solid" | "dashed"
}

export interface DiagramLegendItem {
  status: DiagramNodeStatus
  label: string
}

export interface DiagramModel {
  kind: DiagramKind
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  legend: DiagramLegendItem[]
  viewport: {
    width: number
    height: number
    minWidth: number
  }
}

type MainStateKey =
  | "step-init"
  | "step-upgrade"
  | "step-traffic-routing"
  | "step-metrics-analysis"
  | "step-paused"
  | "step-ready"
  | "completed"

interface ResolvedProgress {
  mappedStateKey: ExplainerStep["stateKey"] | null
  mainStateKey: MainStateKey | null
  currentIndex: number
}

const MAIN_STATE_ORDER: MainStateKey[] = [
  "step-init",
  "step-upgrade",
  "step-traffic-routing",
  "step-metrics-analysis",
  "step-paused",
  "step-ready",
  "completed",
]

const MAIN_NODE_LAYOUT = {
  xStart: 24,
  y: 34,
  width: 172,
  height: 88,
  xGap: 30,
}

const DEFAULT_LEGEND: DiagramLegendItem[] = [
  { status: "done", label: "已完成（done）" },
  { status: "current", label: "当前执行（current）" },
  { status: "pending", label: "待执行（pending）" },
  { status: "blocked", label: "等待/阻塞（blocked）" },
  { status: "disabled", label: "已禁用（disabled）" },
]

function getMainStepIds(strategy: ExplainerStrategy): Record<MainStateKey, string | undefined> {
  const map: Record<MainStateKey, string | undefined> = {
    "step-init": undefined,
    "step-upgrade": undefined,
    "step-traffic-routing": undefined,
    "step-metrics-analysis": undefined,
    "step-paused": undefined,
    "step-ready": undefined,
    completed: undefined,
  }
  for (const step of getExplainerSteps(strategy)) {
    if (isMainState(step.stateKey)) {
      map[step.stateKey] = step.id
    }
  }
  return map
}

function isMainState(state: ExplainerStep["stateKey"] | null): state is MainStateKey {
  return (
    state === "step-init" ||
    state === "step-upgrade" ||
    state === "step-traffic-routing" ||
    state === "step-metrics-analysis" ||
    state === "step-paused" ||
    state === "step-ready" ||
    state === "completed"
  )
}

function mapRawStepStateToMain(currentStepState?: string): MainStateKey | null {
  switch (currentStepState) {
    case "StepInit":
      return "step-init"
    case "StepUpgrade":
      return "step-upgrade"
    case "StepTrafficRouting":
      return "step-traffic-routing"
    case "StepMetricsAnalysis":
      return "step-metrics-analysis"
    case "StepPaused":
      return "step-paused"
    case "StepReady":
      return "step-ready"
    case "Completed":
      return "completed"
    default:
      return null
  }
}

function resolveProgress(snapshot?: LiveRolloutSnapshot | null): ResolvedProgress | null {
  if (!snapshot) {
    return null
  }

  const mappedStateKey = mapSnapshotToExplainerStep(snapshot)?.stateKey ?? null
  let mainStateKey: MainStateKey | null = isMainState(mappedStateKey) ? mappedStateKey : null

  if (!mainStateKey && mappedStateKey === "global-paused") {
    mainStateKey = mapRawStepStateToMain(snapshot.currentStepState)
  }
  if (!mainStateKey && snapshot.phase === "Healthy") {
    mainStateKey = "completed"
  }
  if (!mainStateKey) {
    mainStateKey = mapRawStepStateToMain(snapshot.currentStepState)
  }

  return {
    mappedStateKey,
    mainStateKey,
    currentIndex: mainStateKey ? MAIN_STATE_ORDER.indexOf(mainStateKey) : -1,
  }
}

function buildTooltip(step: ExplainerStep | undefined): string | undefined {
  if (!step) {
    return undefined
  }
  const opText = step.ops
    .slice(0, 2)
    .map((op) => `${op.resourceKind}.${op.operation}: ${op.fieldPaths.join(", ")}`)
    .join(" | ")
  return `${step.title} | ${step.summary}${opText ? ` | ${opText}` : ""}`
}

function buildStepDetailLines(step: ExplainerStep | undefined): string[] {
  if (!step) {
    return []
  }
  return step.ops.slice(0, 2).map((op) => {
    const firstField = op.fieldPaths.at(0) ?? "-"
    return `${op.resourceKind}.${op.operation} -> ${firstField}`
  })
}

function createMainNodes(strategy: ExplainerStrategy): DiagramNode[] {
  const ids = getMainStepIds(strategy)
  const steps = getExplainerSteps(strategy)
  const stepByState = new Map(steps.map((step) => [step.stateKey, step]))

  const specs: Array<{
    state: MainStateKey
    label: string
    subLabel: string
    icon: DiagramNodeIcon
  }> = [
    { state: "step-init", label: "StepInit", subLabel: "初始化 Rollout 控制", icon: "workflow" },
    { state: "step-upgrade", label: "StepUpgrade", subLabel: "执行 Batch 升级", icon: "rocket" },
    { state: "step-traffic-routing", label: "StepTrafficRouting", subLabel: "patch TrafficRouting", icon: "route" },
    { state: "step-metrics-analysis", label: "StepMetricsAnalysis", subLabel: "metrics gate 分析", icon: "chart" },
    { state: "step-paused", label: "StepPaused", subLabel: "等待 Approve", icon: "pause" },
    { state: "step-ready", label: "StepReady", subLabel: "推进下一 Batch", icon: "check" },
    { state: "completed", label: "Completed", subLabel: "Finalising 收敛", icon: "check" },
  ]

  return specs.map((spec, index) => {
    const x = MAIN_NODE_LAYOUT.xStart + index * (MAIN_NODE_LAYOUT.width + MAIN_NODE_LAYOUT.xGap)
    return {
      id: spec.state,
      label: spec.label,
      subLabel: spec.subLabel,
      x,
      y: MAIN_NODE_LAYOUT.y,
      width: MAIN_NODE_LAYOUT.width,
      height: MAIN_NODE_LAYOUT.height,
      status: "pending",
      icon: spec.icon,
      stepId: ids[spec.state],
      detailLines: buildStepDetailLines(stepByState.get(spec.state)),
      tooltip: buildTooltip(stepByState.get(spec.state)),
    }
  })
}

function applyMainStatuses(nodes: DiagramNode[], progress: ResolvedProgress | null): DiagramNode[] {
  if (!progress || progress.currentIndex < 0 || progress.mappedStateKey === "disabled") {
    return nodes
  }

  const completedIndex = MAIN_STATE_ORDER.indexOf("completed")
  return nodes.map((node, index) => {
    if (progress.mainStateKey === "completed") {
      return {
        ...node,
        status: index < completedIndex ? "done" : "current",
      }
    }
    if (index < progress.currentIndex) {
      return { ...node, status: "done" }
    }
    if (index === progress.currentIndex) {
      return {
        ...node,
        status: progress.mainStateKey === "step-paused" ? "blocked" : "current",
      }
    }
    return node
  })
}

function buildMainEdges(): DiagramEdge[] {
  const edges: DiagramEdge[] = []
  for (let i = 0; i < MAIN_STATE_ORDER.length - 1; i += 1) {
    const from = MAIN_STATE_ORDER.at(i)
    const to = MAIN_STATE_ORDER.at(i + 1)
    if (!from || !to) {
      continue
    }
    edges.push({
      id: `main-${from}-${to}`,
      from,
      to,
      style: "solid",
    })
  }
  return edges
}

function withCanarySpecialNodes(nodes: DiagramNode[], progress: ResolvedProgress | null): DiagramNode[] {
  const globalPaused: DiagramNode = {
    id: "global-paused",
    label: "Global Pause",
    subLabel: "spec.strategy.paused=true",
    detailLines: ["Rollout.patch -> spec.strategy.paused=true"],
    x: 330,
    y: 176,
    width: 200,
    height: 86,
    status: progress?.mappedStateKey === "global-paused" ? "blocked" : "pending",
    icon: "shield",
  }
  const disabled: DiagramNode = {
    id: "disabled",
    label: "Disabled",
    subLabel: "spec.disabled=true",
    detailLines: ["Rollout.patch -> spec.disabled=true", "finalising -> cleanup"],
    x: 1088,
    y: 176,
    width: 200,
    height: 86,
    status: progress?.mappedStateKey === "disabled" ? "disabled" : "pending",
    icon: "ban",
  }
  return [...nodes, globalPaused, disabled]
}

function withCanarySpecialEdges(edges: DiagramEdge[]): DiagramEdge[] {
  return [
    ...edges,
    {
      id: "main-global-paused",
      from: "step-upgrade",
      to: "global-paused",
      label: "Pause Trigger",
      style: "dashed",
    },
    {
      id: "main-disabled",
      from: "step-traffic-routing",
      to: "disabled",
      label: "Disable Trigger",
      style: "dashed",
    },
  ]
}

function resolveABMatchStatus(progress: ResolvedProgress | null): DiagramNodeStatus {
  if (!progress || progress.currentIndex < 0 || progress.mappedStateKey === "disabled") {
    return "pending"
  }
  if (progress.currentIndex < MAIN_STATE_ORDER.indexOf("step-traffic-routing")) {
    return "pending"
  }
  if (progress.mainStateKey === "step-traffic-routing") {
    return progress.mappedStateKey === "step-traffic-routing" ? "current" : "done"
  }
  return "done"
}

export function buildCanaryDiagram(snapshot?: LiveRolloutSnapshot | null): DiagramModel {
  const progress = resolveProgress(snapshot)
  const mainNodes = applyMainStatuses(createMainNodes("canary"), progress)
  const nodes = withCanarySpecialNodes(mainNodes, progress)
  const edges = withCanarySpecialEdges(buildMainEdges())

  return {
    kind: "canary",
    nodes,
    edges,
    legend: DEFAULT_LEGEND,
    viewport: {
      width: 1470,
      height: 300,
      minWidth: 1200,
    },
  }
}

export function buildABTestDiagram(snapshot?: LiveRolloutSnapshot | null): DiagramModel {
  const progress = resolveProgress(snapshot)
  const mainNodes = applyMainStatuses(createMainNodes("abtest"), progress)
  const nodes = withCanarySpecialNodes(mainNodes, progress)
  const edges = withCanarySpecialEdges(buildMainEdges())

  nodes.push({
    id: "ab-match-routing",
    label: "Match Routing",
    subLabel: "headers/query 定向流量",
    detailLines: ["matches.headers/query -> canary", "non-match -> stable"],
    x: 548,
    y: 176,
    width: 224,
    height: 86,
    status: resolveABMatchStatus(progress),
    icon: "route",
  })

  edges.push(
    {
      id: "ab-traffic-to-match",
      from: "step-traffic-routing",
      to: "ab-match-routing",
      label: "A/B matches",
      style: "dashed",
    },
    {
      id: "ab-match-to-metrics",
      from: "ab-match-routing",
      to: "step-metrics-analysis",
      style: "dashed",
    }
  )

  return {
    kind: "abtest",
    nodes,
    edges,
    legend: DEFAULT_LEGEND,
    viewport: {
      width: 1500,
      height: 300,
      minWidth: 1220,
    },
  }
}

export function buildTriggerDiagram(): DiagramModel {
  const width = 220
  const gap = 28
  const y = 44
  const labels: Array<[string, string, DiagramNodeIcon]> = [
    ["User Action", "patch Workload / Rollout", "user"],
    ["Mutating Webhook", "patch Workload", "webhook"],
    ["Controller Watch", "事件入队", "watch"],
    ["Rollout Reconcile", "状态机推进", "refresh"],
    ["Controller Actions", "BatchRelease/TrafficRouting", "workflow"],
  ]

  const nodes: DiagramNode[] = labels.map(([label, subLabel, icon], index) => ({
    id: `trigger-${index}`,
    label,
    subLabel,
    detailLines: index === 0 ? ["kubectl apply / patch"] : index === 3 ? ["reconcile loop"] : [],
    x: 24 + index * (width + gap),
    y,
    width,
    height: 92,
    status: index === 3 ? "current" : "pending",
    icon,
  }))

  const edges: DiagramEdge[] = nodes.slice(0, -1).flatMap((node, index) => {
    const nextNode = nodes.at(index + 1)
    if (!nextNode) {
      return []
    }
    return [
      {
        id: `trigger-edge-${index}`,
        from: node.id,
        to: nextNode.id,
        style: "solid" as const,
      },
    ]
  })

  return {
    kind: "trigger",
    nodes,
    edges,
    legend: [
      { status: "current", label: "链路核心处理点" },
      { status: "pending", label: "链路阶段节点" },
    ],
    viewport: {
      width: 1270,
      height: 198,
      minWidth: 980,
    },
  }
}

export function buildEdgeCaseDiagram(): DiagramModel {
  const nodes: DiagramNode[] = [
    {
      id: "edge-start",
      label: "运行中的 Rollout",
      subLabel: "Edge Case 决策入口",
      detailLines: ["phase=Progressing"],
      x: 540,
      y: 24,
      width: 240,
      height: 92,
      status: "current",
      icon: "workflow",
    },
    {
      id: "edge-rollback",
      label: "Rollback",
      subLabel: "切回旧 revision",
      detailLines: ["reason=Cancelling", "restore stable traffic"],
      x: 60,
      y: 138,
      width: 240,
      height: 92,
      status: "pending",
      icon: "rollback",
    },
    {
      id: "edge-continuous",
      label: "Continuous Release",
      subLabel: "发布中再次发版",
      detailLines: ["isContinuousRelease", "doProgressingReset"],
      x: 368,
      y: 138,
      width: 240,
      height: 92,
      status: "pending",
      icon: "repeat",
    },
    {
      id: "edge-hpa",
      label: "HPA Compatibility",
      subLabel: "副本动态变化",
      detailLines: ["replicas changed", "recalculate batch"],
      x: 676,
      y: 138,
      width: 240,
      height: 92,
      status: "pending",
      icon: "scale",
    },
    {
      id: "edge-pause-disabled",
      label: "Pause vs Disabled",
      subLabel: "暂停与禁用",
      detailLines: ["paused=hold", "disabled=cleanup"],
      x: 984,
      y: 138,
      width: 240,
      height: 92,
      status: "pending",
      icon: "shield",
    },
  ]

  const edges: DiagramEdge[] = [
    { id: "edge-start-1", from: "edge-start", to: "edge-rollback", style: "solid" },
    { id: "edge-start-2", from: "edge-start", to: "edge-continuous", style: "solid" },
    { id: "edge-start-3", from: "edge-start", to: "edge-hpa", style: "solid" },
    { id: "edge-start-4", from: "edge-start", to: "edge-pause-disabled", style: "solid" },
  ]

  return {
    kind: "edge",
    nodes,
    edges,
    legend: [
      { status: "current", label: "当前讨论入口" },
      { status: "pending", label: "边缘场景分支" },
    ],
    viewport: {
      width: 1290,
      height: 272,
      minWidth: 1080,
    },
  }
}

export function buildLiveDiagram(
  snapshot: LiveRolloutSnapshot | null,
  strategy: ExplainerStrategy,
  rolloutDetail?: Pick<TransformedRolloutDetail, "steps">
): DiagramModel {
  if (rolloutDetail?.steps && rolloutDetail.steps.length > 0) {
    return buildConcreteRolloutDiagram(snapshot, rolloutDetail.steps)
  }

  const model = strategy === "abtest" ? buildABTestDiagram(snapshot) : buildCanaryDiagram(snapshot)
  return {
    ...model,
    kind: "live",
  }
}

function getConcreteIconFromStep(step: RolloutStep): DiagramNodeIcon {
  const { type } = getStepTypeLabel(step)
  switch (type) {
    case "setWeight":
    case "setHeaderRoute":
    case "setMirrorRoute":
      return "route"
    case "pause":
      return "pause"
    case "analysis":
      return "chart"
    case "replicas":
      return "rocket"
    case "setCanaryScale":
      return "scale"
    case "experiment":
      return "workflow"
    default:
      return "workflow"
  }
}

function getConcreteDetailLines(step: RolloutStep): string[] {
  const lines: string[] = []
  if (step.replicas !== undefined) {
    lines.push(`BatchRelease: replicas=${String(step.replicas)}`)
  }
  if (step.traffic !== undefined) {
    lines.push(`TrafficRouting: traffic=${String(step.traffic)}`)
  }
  const matches = (step as { matches?: unknown }).matches
  if (Array.isArray(matches) && matches.length > 0) {
    lines.push(`A/B matches: ${matches.length} 条规则`)
  }
  if (step.pause) {
    if (typeof step.pause === "object" && step.pause?.duration !== undefined) {
      lines.push(`Pause gate: duration=${String(step.pause.duration)}`)
    } else {
      lines.push("Pause gate: manual approve")
    }
  }
  if (lines.length === 0) {
    const { label } = getStepTypeLabel(step)
    lines.push(`Step action: ${label}`)
  }
  return lines.slice(0, 2)
}

function buildConcreteRolloutDiagram(
  snapshot: LiveRolloutSnapshot | null,
  steps: RolloutStep[]
): DiagramModel {
  const columns = 3
  const nodeWidth = 318
  const nodeHeight = 104
  const xGap = 24
  const yGap = 28
  const xStart = 24
  const yStart = 24
  const activeIndex = snapshot ? Math.max(0, snapshot.currentStepIndex - 1) : -1
  const completed = snapshot?.phase === "Healthy" || snapshot?.phase === "Completed"
  const disabled = Boolean(snapshot?.disabled || snapshot?.phase === "Disabled" || snapshot?.phase === "Disabling")
  const blocked = snapshot?.currentStepState === "StepPaused"

  const nodes: DiagramNode[] = steps.map((step, index) => {
    const row = Math.floor(index / columns)
    const col = index % columns
    const x = xStart + col * (nodeWidth + xGap)
    const y = yStart + row * (nodeHeight + yGap)
    const stepTypeLabel = getStepTypeLabel(step).label
    let status: DiagramNodeStatus = "pending"
    if (completed) {
      status = "done"
    } else if (disabled && index === activeIndex) {
      status = "disabled"
    } else if (index < activeIndex) {
      status = "done"
    } else if (index === activeIndex) {
      status = blocked ? "blocked" : "current"
    }

    const detailLines = getConcreteDetailLines(step)
    return {
      id: `live-step-${index}`,
      label: `Step ${index + 1}`,
      subLabel: stepTypeLabel,
      detailLines,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      status,
      icon: getConcreteIconFromStep(step),
      tooltip: `Step ${index + 1} | ${stepTypeLabel} | ${detailLines.join(" | ")}`,
    }
  })

  const edges: DiagramEdge[] = []
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const fromNode = nodes.at(i)
    const toNode = nodes.at(i + 1)
    if (!fromNode || !toNode) {
      continue
    }
    edges.push({
      id: `live-edge-${i}`,
      from: fromNode.id,
      to: toNode.id,
      style: "solid",
    })
  }

  const rows = Math.max(1, Math.ceil(steps.length / columns))
  const viewportWidth = xStart * 2 + columns * nodeWidth + (columns - 1) * xGap
  const viewportHeight = yStart * 2 + rows * nodeHeight + (rows - 1) * yGap

  return {
    kind: "live",
    nodes,
    edges,
    legend: DEFAULT_LEGEND,
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
      minWidth: 0,
    },
  }
}

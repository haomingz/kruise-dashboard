"use client"

import { type ComponentType, type ReactNode, useMemo, useState } from "react"
import {
  Activity,
  Ban,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  Gauge,
  Repeat,
  RefreshCw,
  Rocket,
  Route,
  Scale,
  Shield,
  Undo2,
  User,
  Watch,
  Webhook,
  Workflow,
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
import { FlowFullscreenButton } from "@/components/flow-fullscreen-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { DiagramModel, DiagramNode, DiagramNodeIcon, DiagramNodeStatus } from "@/lib/rollout-explainer-diagram"
import { cn } from "@/lib/utils"

type StatusPalette = {
  nodeFill: string
  nodeStroke: string
  text: string
  chipBg: string
  chipText: string
}

const STATUS_STYLE: Record<DiagramNodeStatus, StatusPalette> = {
  done: {
    nodeFill: "#ecfdf3",
    nodeStroke: "#16a34a",
    text: "#14532d",
    chipBg: "#dcfce7",
    chipText: "#166534",
  },
  current: {
    nodeFill: "#eff6ff",
    nodeStroke: "#2563eb",
    text: "#1e3a8a",
    chipBg: "#dbeafe",
    chipText: "#1d4ed8",
  },
  pending: {
    nodeFill: "#f8fafc",
    nodeStroke: "#94a3b8",
    text: "#334155",
    chipBg: "#e2e8f0",
    chipText: "#475569",
  },
  blocked: {
    nodeFill: "#fff7ed",
    nodeStroke: "#d97706",
    text: "#9a3412",
    chipBg: "#ffedd5",
    chipText: "#c2410c",
  },
  disabled: {
    nodeFill: "#fef2f2",
    nodeStroke: "#dc2626",
    text: "#991b1b",
    chipBg: "#fee2e2",
    chipText: "#b91c1c",
  },
}

const STATUS_LABEL: Record<DiagramNodeStatus, string> = {
  done: "done",
  current: "current",
  pending: "pending",
  blocked: "blocked",
  disabled: "disabled",
}

const COMPACT_SUBLABEL_NODE_IDS = new Set(["step-init", "step-upgrade", "step-traffic-routing", "step-metrics-analysis", "step-paused", "step-ready", "completed", "ab-match-routing", "global-paused", "disabled"])

const ICON_MAP: Record<DiagramNodeIcon, ComponentType<{ className?: string; size?: number; color?: string }>> = {
  workflow: Workflow,
  rocket: Rocket,
  route: Route,
  chart: Gauge,
  pause: CirclePause,
  check: CheckCircle2,
  shield: Shield,
  ban: Ban,
  user: User,
  webhook: Webhook,
  watch: Watch,
  refresh: RefreshCw,
  rollback: Undo2,
  repeat: Repeat,
  scale: Scale,
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 1)}…`
}

function resolveNodeDimensions(node: DiagramNode, isCompact: boolean): {
  width: number
  minHeight: number
  borderRadius: number
  padding: number
  boxShadow: string
} {
  if (isCompact) {
    return {
      width: Math.min(node.width, 188),
      minHeight: 76,
      borderRadius: 12,
      padding: 8,
      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.06)",
    }
  }
  return {
    width: node.width,
    minHeight: node.height,
    borderRadius: 14,
    padding: 10,
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
  }
}

function renderStatusChip(status: DiagramNodeStatus, palette: StatusPalette, staticMode: boolean): ReactNode {
  if (staticMode) {
    return null
  }
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: palette.chipBg, color: palette.chipText }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function renderNodeDetail(node: DiagramNode, isCompact: boolean, textColor: string): ReactNode {
  if (isCompact) {
    const compactDetailLine = node.detailLines?.at(0)
    if (!compactDetailLine) {
      return null
    }
    return (
      <p className="font-mono text-[10px]" style={{ color: textColor, opacity: 0.85 }}>
        {truncateText(compactDetailLine, 36)}
      </p>
    )
  }

  if (!node.detailLines || node.detailLines.length === 0) {
    return null
  }
  return (
    <div className="space-y-0.5">
      {node.detailLines.map((line) => (
        <p key={`${node.id}-${line}`} className="font-mono text-[10px]" style={{ color: textColor }}>
          {line}
        </p>
      ))}
    </div>
  )
}

function buildFlowNodeLabel(node: DiagramNode, palette: StatusPalette, isCompact: boolean, staticMode: boolean): ReactNode {
  const showSubLabel = !isCompact || COMPACT_SUBLABEL_NODE_IDS.has(node.id)
  const subLabel = isCompact ? truncateText(node.subLabel, 32) : node.subLabel
  const spacingClass = isCompact ? "space-y-0.5" : "space-y-1"
  const titleSizeClass = isCompact ? "text-[11px]" : "text-xs"
  const subLabelSizeClass = isCompact ? "text-[10px]" : "text-[11px]"
  const tooltipText = [node.label, node.subLabel, ...(node.detailLines ?? [])].filter(Boolean).join(" | ")
  const Icon = ICON_MAP[node.icon]
  const iconSize = isCompact ? 11 : 13

  return (
    <div data-node-id={node.id} data-node-status={node.status} title={tooltipText} className={cn(spacingClass)}>
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="inline-flex shrink-0 items-center justify-center rounded"
            style={{
              width: isCompact ? 18 : 20,
              height: isCompact ? 18 : 20,
              background: palette.chipBg,
            }}
          >
            <Icon size={iconSize} color={palette.nodeStroke} />
          </span>
          <p className={cn("truncate font-semibold", titleSizeClass)} style={{ color: palette.text }}>
            {node.label}
          </p>
        </div>
        {renderStatusChip(node.status, palette, staticMode)}
      </div>
      {showSubLabel ? (
        <p className={cn(subLabelSizeClass)} style={{ color: palette.text, opacity: 0.9 }}>
          {subLabel}
        </p>
      ) : null}
      {renderNodeDetail(node, isCompact, palette.text)}
    </div>
  )
}

function buildFlowNode(node: DiagramNode, isCompact: boolean, staticMode: boolean): Node {
  const palette = STATUS_STYLE[node.status]
  const dims = resolveNodeDimensions(node, isCompact)
  return {
    id: node.id,
    position: { x: node.x, y: node.y },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: false,
    style: {
      width: dims.width,
      minHeight: dims.minHeight,
      borderRadius: dims.borderRadius,
      border: `2px solid ${palette.nodeStroke}`,
      background: `linear-gradient(180deg, #ffffff 0%, ${palette.nodeFill} 100%)`,
      padding: dims.padding,
      boxShadow: dims.boxShadow,
    },
    data: {
      label: buildFlowNodeLabel(node, palette, isCompact, staticMode),
    },
  }
}

function resolveEdgeLabel(label: string | undefined, staticMode: boolean, isCompact: boolean): string | undefined {
  if (staticMode || isCompact === false) {
    return label
  }
  return undefined
}

export interface RolloutStateMachineReactFlowProps {
  model: DiagramModel
  title: string
  description?: string
  sourceHint?: string
  helperText?: string
  defaultExpanded?: boolean
  staticMode?: boolean
  compact?: boolean
}

export function RolloutStateMachineReactFlow({
  model,
  title,
  description,
  sourceHint,
  helperText,
  defaultExpanded = false,
  staticMode = false,
  compact,
}: Readonly<RolloutStateMachineReactFlowProps>) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isCompact = compact ?? staticMode
  const helperTextResolved =
    helperText ??
    (staticMode
      ? "静态源码流程图，不表示线上 Rollout 实时状态。"
      : "阅读方式：绿色=已完成，蓝色=当前执行，橙色=等待/阻塞，灰色=待执行。")

  const displayNodes = useMemo<DiagramNode[]>(
    () =>
      model.nodes.map((node) =>
        staticMode
          ? {
              ...node,
              status: "pending" as DiagramNodeStatus,
            }
          : node
      ),
    [model.nodes, staticMode]
  )

  const nodeStatusById = useMemo(
    () => new Map<string, DiagramNodeStatus>(displayNodes.map((node) => [node.id, node.status])),
    [displayNodes]
  )
  const fitViewOptions = useMemo(() => ({ padding: 0.12 }), [])

  const nodes = useMemo<Node[]>(
    () => displayNodes.map((node) => buildFlowNode(node, isCompact, staticMode)),
    [displayNodes, isCompact, staticMode]
  )

  const edges = useMemo<Edge[]>(
    () =>
      model.edges.map((edge) => {
        const sourceStatus: DiagramNodeStatus = nodeStatusById.get(edge.from) ?? "pending"
        const stroke = STATUS_STYLE[sourceStatus].nodeStroke
        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          label: resolveEdgeLabel(edge.label, staticMode, isCompact),
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: stroke,
            width: 18,
            height: 18,
          },
          style: {
            stroke,
            strokeWidth: 2,
            strokeDasharray: edge.style === "dashed" ? "6 4" : undefined,
          },
          labelStyle: {
            fontSize: 10,
            fontWeight: 600,
            fill: "#475569",
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 6,
          labelBgStyle: {
            fill: "#ffffff",
            fillOpacity: 0.92,
          },
          data: {
            edgeId: edge.id,
          },
        }
      }),
    [isCompact, model.edges, nodeStatusById, staticMode]
  )

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {sourceHint ? (
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              {sourceHint}
            </span>
          ) : null}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-4">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">默认收起，按需展开查看状态机流程图。</p>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {expanded ? "收起流程图" : "展开流程图"}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-3">
            {staticMode ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-600">
                静态流程图：不关联线上 Rollout 实时状态。
              </div>
            ) : null}
            {nodes.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">当前没有可展示的流程图数据。</div>
            ) : (
              <div className="relative rounded-xl border border-slate-200 bg-linear-to-b from-slate-50 to-slate-100/70 p-2 shadow-inner">
                <div className="h-[360px] w-full sm:h-[430px] lg:h-[500px]" data-testid={`state-machine-reactflow-${model.kind}`}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    fitView
                    fitViewOptions={fitViewOptions}
                    minZoom={0.45}
                    maxZoom={1.8}
                    nodesDraggable
                    nodesFocusable={!staticMode}
                    nodesConnectable={false}
                    edgesFocusable={!staticMode}
                    elementsSelectable={!staticMode}
                    panOnDrag
                    panOnScroll
                    zoomOnScroll
                    zoomOnPinch
                    zoomOnDoubleClick={!staticMode}
                    onlyRenderVisibleElements={nodes.length > 80}
                  >
                    <Background gap={18} size={1} color="#cbd5e1" />
                    <Controls position="bottom-right" showInteractive={!staticMode} />
                  </ReactFlow>
                </div>
                <div className="absolute right-3 top-3 z-10">
                  <FlowFullscreenButton title={title} nodes={nodes} edges={edges} fitViewOptions={fitViewOptions} />
                </div>
              </div>
            )}

            {staticMode ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-md border bg-white/80 px-2 py-1 text-xs shadow-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <span className="text-slate-700">实线：主流程</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-white/80 px-2 py-1 text-xs shadow-sm">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <span className="text-slate-700">虚线：条件分支</span>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {model.legend.map((item) => (
                  <div
                    key={`${model.kind}-${item.status}`}
                    className="flex items-center gap-2 rounded-md border bg-white/80 px-2 py-1 text-xs shadow-sm"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_STYLE[item.status].nodeStroke }}
                    />
                    <span className="text-slate-700">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">{helperTextResolved}</p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

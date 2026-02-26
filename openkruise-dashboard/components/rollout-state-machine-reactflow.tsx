"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { DiagramModel, DiagramNodeStatus } from "@/lib/rollout-explainer-diagram"
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

const COMPACT_LABEL: Record<string, string> = {
  StepInit: "Init",
  StepUpgrade: "Upgrade",
  StepTrafficRouting: "Traffic",
  StepMetricsAnalysis: "Metrics",
  StepPaused: "Pause",
  StepReady: "Ready",
  Completed: "Done",
  "Global Pause": "Pause",
  Disabled: "Disabled",
  "Match Routing": "A/B Match",
}

const COMPACT_SUBLABEL_NODE_IDS = new Set(["ab-match-routing", "global-paused", "disabled"])

function toCompactLabel(label: string): string {
  return COMPACT_LABEL[label] ?? label
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 1)}…`
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

  const displayNodes = useMemo(
    () =>
      model.nodes.map((node) =>
        staticMode
          ? {
              ...node,
              status: "pending",
            }
          : node
      ),
    [model.nodes, staticMode]
  )

  const nodeStatusById = useMemo(() => new Map(displayNodes.map((node) => [node.id, node.status])), [displayNodes])
  const fitViewOptions = useMemo(() => ({ padding: 0.12 }), [])
  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  const nodes = useMemo<Node[]>(
    () =>
      displayNodes.map((node) => {
        const style = STATUS_STYLE[node.status]
        const compactLabel = isCompact ? toCompactLabel(node.label) : node.label
        const showSubLabel = !isCompact || COMPACT_SUBLABEL_NODE_IDS.has(node.id)
        const compactSubLabel = isCompact ? truncateText(node.subLabel, 16) : node.subLabel
        const tooltipText = [node.label, node.subLabel, ...(node.detailLines ?? [])].filter(Boolean).join(" | ")
        return {
          id: node.id,
          position: { x: node.x, y: node.y },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: false,
          selectable: false,
          style: {
            width: isCompact ? Math.min(node.width, 160) : node.width,
            minHeight: isCompact ? 64 : node.height,
            borderRadius: isCompact ? 12 : 14,
            border: `2px solid ${style.nodeStroke}`,
            background: `linear-gradient(180deg, #ffffff 0%, ${style.nodeFill} 100%)`,
            padding: isCompact ? 8 : 10,
            boxShadow: isCompact ? "0 4px 10px rgba(15, 23, 42, 0.06)" : "0 6px 16px rgba(15, 23, 42, 0.08)",
          },
          data: {
            label: (
              <div data-node-id={node.id} data-node-status={node.status} title={tooltipText} className={cn(isCompact ? "space-y-0.5" : "space-y-1")}>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className={cn("font-semibold", isCompact ? "text-[11px]" : "text-xs")} style={{ color: style.text }}>
                    {compactLabel}
                  </p>
                  {!staticMode ? (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: style.chipBg, color: style.chipText }}
                    >
                      {STATUS_LABEL[node.status]}
                    </span>
                  ) : null}
                </div>
                {showSubLabel ? (
                  <p className={cn(isCompact ? "text-[10px]" : "text-[11px]")} style={{ color: style.text, opacity: 0.9 }}>
                    {compactSubLabel}
                  </p>
                ) : null}
                {!isCompact && node.detailLines && node.detailLines.length > 0 ? (
                  <div className="space-y-0.5">
                    {node.detailLines.map((line) => (
                      <p key={`${node.id}-${line}`} className="font-mono text-[10px]" style={{ color: style.text }}>
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ),
          },
        }
      }),
    [displayNodes, isCompact, staticMode]
  )

  const edges = useMemo<Edge[]>(
    () =>
      model.edges.map((edge) => {
        const sourceStatus = nodeStatusById.get(edge.from) ?? "pending"
        const stroke = STATUS_STYLE[sourceStatus].nodeStroke
        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          label: isCompact ? undefined : edge.label,
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
    [isCompact, model.edges, nodeStatusById]
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
              <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/70 p-2 shadow-inner">
                <div className="h-[360px] w-full sm:h-[430px] lg:h-[500px]" data-testid={`state-machine-reactflow-${model.kind}`}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    fitView
                    fitViewOptions={fitViewOptions}
                    minZoom={0.45}
                    maxZoom={1.8}
                    nodesDraggable={false}
                    nodesFocusable={!staticMode}
                    nodesConnectable={false}
                    edgesFocusable={!staticMode}
                    elementsSelectable={!staticMode}
                    panOnDrag={!staticMode}
                    panOnScroll={!staticMode}
                    zoomOnScroll={!staticMode}
                    zoomOnPinch={!staticMode}
                    zoomOnDoubleClick={!staticMode}
                    onlyRenderVisibleElements={nodes.length > 80}
                    proOptions={proOptions}
                  >
                    <Background gap={18} size={1} color="#cbd5e1" />
                    <Controls position="bottom-right" showInteractive={!staticMode} />
                  </ReactFlow>
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

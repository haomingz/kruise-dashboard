"use client"

import { useMemo, useState, type ComponentType } from "react"
import {
  Activity,
  ArrowDown,
  Ban,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  Gauge,
  GitPullRequestArrow,
  GitPullRequestCreateArrow,
  Radio,
  RefreshCw,
  Route,
  Scale,
  Shield,
  Undo2,
  User,
  Waypoints,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type {
  DiagramEdge,
  DiagramModel,
  DiagramNode,
  DiagramNodeIcon,
  DiagramNodeStatus,
} from "@/lib/rollout-explainer-diagram"

const ICON_MAP: Record<DiagramNodeIcon, ComponentType<{ className?: string }>> = {
  workflow: Waypoints,
  rocket: GitPullRequestCreateArrow,
  route: Route,
  chart: Gauge,
  pause: CirclePause,
  check: CheckCircle2,
  shield: Shield,
  ban: Ban,
  user: User,
  webhook: Radio,
  watch: Activity,
  refresh: RefreshCw,
  rollback: Undo2,
  repeat: GitPullRequestArrow,
  scale: Scale,
}

type StatusStyle = {
  nodeFill: string
  nodeStroke: string
  textColor: string
  edgeColor: string
}

const STATUS_STYLE: Record<DiagramNodeStatus, StatusStyle> = {
  done: {
    nodeFill: "#ecfdf3",
    nodeStroke: "#16a34a",
    textColor: "#14532d",
    edgeColor: "#16a34a",
  },
  current: {
    nodeFill: "#eff6ff",
    nodeStroke: "#2563eb",
    textColor: "#1e3a8a",
    edgeColor: "#2563eb",
  },
  pending: {
    nodeFill: "#f8fafc",
    nodeStroke: "#94a3b8",
    textColor: "#334155",
    edgeColor: "#94a3b8",
  },
  blocked: {
    nodeFill: "#fff7ed",
    nodeStroke: "#d97706",
    textColor: "#9a3412",
    edgeColor: "#d97706",
  },
  disabled: {
    nodeFill: "#fef2f2",
    nodeStroke: "#dc2626",
    textColor: "#991b1b",
    edgeColor: "#dc2626",
  },
}

export interface RolloutFlowDiagramProps {
  model: DiagramModel
  title: string
  description?: string
  helperText?: string
  sourceHint?: string
  defaultExpanded?: boolean
  className?: string
}

function getEdgePath(from: DiagramNode, to: DiagramNode): string {
  const x1 = from.x + from.width
  const y1 = from.y + from.height / 2
  const x2 = to.x
  const y2 = to.y + to.height / 2

  if (Math.abs(y2 - y1) < 8) {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
}

function renderEdge(edge: DiagramEdge, nodeMap: Map<string, DiagramNode>) {
  const from = nodeMap.get(edge.from)
  const to = nodeMap.get(edge.to)
  if (!from || !to) {
    return null
  }

  const fromStyle = STATUS_STYLE[from.status]
  const toStyle = STATUS_STYLE[to.status]
  const stroke = from.status === "pending" ? toStyle.edgeColor : fromStyle.edgeColor
  const x1 = from.x + from.width
  const y1 = from.y + from.height / 2
  const x2 = to.x
  const y2 = to.y + to.height / 2
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  return (
    <g key={edge.id} data-edge-id={edge.id}>
      <path
        d={getEdgePath(from, to)}
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray={edge.style === "dashed" ? "6 5" : undefined}
        fill="none"
        opacity={0.95}
      />
      {edge.label && (
        <text
          x={midX}
          y={midY - 6}
          textAnchor="middle"
          fontSize={10}
          fill="#475569"
          className="font-medium"
        >
          {edge.label}
        </text>
      )}
    </g>
  )
}

function renderNode(node: DiagramNode) {
  const Icon = ICON_MAP[node.icon]
  const style = STATUS_STYLE[node.status]
  const iconSize = 14
  const iconX = node.x + 12
  const iconY = node.y + 10

  return (
    <g
      key={node.id}
      data-node-id={node.id}
      data-node-status={node.status}
      tabIndex={0}
      aria-label={`${node.label} ${node.subLabel}`}
    >
      <title>{node.tooltip ?? `${node.label} - ${node.subLabel}`}</title>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={12}
        ry={12}
        fill={style.nodeFill}
        stroke={style.nodeStroke}
        strokeWidth={2}
      />
      <foreignObject x={iconX} y={iconY} width={iconSize} height={iconSize}>
        <Icon className="h-3.5 w-3.5 text-slate-700" />
      </foreignObject>
      <text
        x={node.x + 32}
        y={node.y + 22}
        textAnchor="start"
        fontSize={12}
        fontWeight={700}
        fill={style.textColor}
      >
        {node.label}
      </text>
      <text x={node.x + 12} y={node.y + 44} textAnchor="start" fontSize={11} fill={style.textColor} opacity={0.9}>
        {node.subLabel}
      </text>
    </g>
  )
}

export function RolloutFlowDiagram({
  model,
  title,
  description,
  helperText = "阅读方式：绿色=已完成，蓝色=当前执行，橙色=等待/阻塞，灰色=待执行。",
  sourceHint,
  defaultExpanded = false,
  className,
}: Readonly<RolloutFlowDiagramProps>) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const nodeMap = new Map(model.nodes.map((node) => [node.id, node]))
  const orderedNodes = useMemo(
    () => [...model.nodes].sort((left, right) => left.y - right.y || left.x - right.x),
    [model.nodes]
  )

  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-4 pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {sourceHint && (
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              {sourceHint}
            </span>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">默认收起，按需展开查看流程图与步骤细节。</span>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {expanded ? "收起流程图" : "展开流程图"}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-3">
            {model.nodes.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                当前没有可展示的流程图数据。
              </div>
            ) : (
              <div className="rounded-lg border bg-slate-50/40 p-2">
                <svg
                  role="img"
                  aria-label={title}
                  viewBox={`0 0 ${model.viewport.width} ${model.viewport.height}`}
                  preserveAspectRatio="xMinYMin meet"
                  className="h-auto w-full"
                >
                  {model.edges.map((edge) => renderEdge(edge, nodeMap))}
                  {model.nodes.map((node) => renderNode(node))}
                </svg>
              </div>
            )}

            {orderedNodes.length > 0 && (
              <div className="rounded-lg border bg-white/80 p-3">
                <h4 className="text-sm font-semibold text-slate-800">步骤细节（纵向箭头卡片）</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  细节从图中抽离，按从上到下顺序展示每个步骤的关键 patch/update 操作。
                </p>
                <div className="mt-3 space-y-1">
                  {orderedNodes.map((node, index) => {
                    const statusStyle = STATUS_STYLE[node.status]
                    return (
                      <div key={`detail-${node.id}`}>
                        <article className="rounded-md border bg-slate-50/70 px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: statusStyle.nodeStroke }}
                            />
                            <p className="text-sm font-semibold text-slate-900">{node.label}</p>
                            <p className="text-xs text-slate-600">{node.subLabel}</p>
                          </div>
                          {node.detailLines && node.detailLines.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {node.detailLines.map((line) => (
                                <p key={`${node.id}-${line}`} className="font-mono text-[11px] text-slate-700">
                                  {line}
                                </p>
                              ))}
                            </div>
                          )}
                        </article>
                        {index < orderedNodes.length - 1 && (
                          <div className="flex justify-center py-1.5 text-slate-400">
                            <ArrowDown className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {model.legend.map((item) => (
                <div
                  key={`${model.kind}-${item.status}`}
                  className="flex items-center gap-2 rounded-md border bg-white/70 px-2 py-1 text-xs"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_STYLE[item.status].nodeStroke }}
                  />
                  <span className="text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{helperText}</p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

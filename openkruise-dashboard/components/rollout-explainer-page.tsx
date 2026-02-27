"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  Code2,
  Gauge,
  GitBranch,
  ListChecks,
  Loader2,
  Network,
  Radar,
  Rocket,
  Route,
  Waypoints,
} from "lucide-react"
import { MainNav } from "@/components/main-nav"
import { NamespaceSelector } from "@/components/namespace-selector"
import { RolloutFlowDiagram } from "@/components/rollout-flow-diagram"
import { RolloutResourceTopologyDiagram } from "@/components/rollout-resource-topology-diagram"
import { RolloutStateMachineReactFlow } from "@/components/rollout-state-machine-reactflow"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RevisionInfo } from "@/api/rollout"
import { useNamespace } from "@/hooks/use-namespace"
import { useAllRollouts, useRollout, useRolloutPods } from "@/hooks/use-rollouts"
import { useRolloutsWatch } from "@/hooks/use-rollouts-watch"
import {
  abTestExplainerSteps,
  buildLiveRolloutSnapshot,
  canaryExplainerSteps,
  edgeCaseRules,
  getExplainerSteps,
  inferExplainerStrategy,
  mapSnapshotToExplainerStep,
  triggerRules,
  type ExplainerStep,
  type K8sResourceOp,
  type SourceRef,
} from "@/lib/rollout-explainer"
import {
  buildABTestDiagram,
  buildCanaryDiagram,
  buildEdgeCaseDiagram,
  buildTriggerDiagram,
} from "@/lib/rollout-explainer-diagram"
import { transformRolloutDetail, transformRolloutList } from "@/lib/rollout-utils"
import { config } from "@/lib/config"
import { cn } from "@/lib/utils"
import { dump } from "js-yaml"
import { getSingletonHighlighter } from "shiki"

// 静态图模型不依赖任何运行时状态，提升为模块常量避免每次 mount 重新构建
const CANARY_DIAGRAM_MODEL = buildCanaryDiagram(null)
const AB_TEST_DIAGRAM_MODEL = buildABTestDiagram(null)
const TRIGGER_DIAGRAM_MODEL = buildTriggerDiagram()
const EDGE_CASE_DIAGRAM_MODEL = buildEdgeCaseDiagram()

function rolloutKey(rollout: { namespace: string; name: string }): string {
  return `${rollout.namespace}/${rollout.name}`
}

type ExplainerTabValue = "canary" | "abtest" | "trigger" | "edge" | "live"

function resolveTabValue(value: string | null | undefined): ExplainerTabValue {
  if (value === "canary" || value === "abtest" || value === "trigger" || value === "edge" || value === "live") {
    return value
  }
  return "canary"
}

function YamlHighlightedBlock({ yaml }: Readonly<{ yaml: string }>) {
  const [html, setHtml] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atTop, setAtTop] = useState(true)
  const [atBottom, setAtBottom] = useState(true)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAtTop(el.scrollTop <= 2)
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2)
  }, [])

  useEffect(() => {
    if (!yaml) {
      setHtml("")
      return
    }
    let cancelled = false
    getSingletonHighlighter({ themes: ["github-dark"], langs: ["yaml"] }).then((hl) => {
      if (cancelled) return
      setHtml(hl.codeToHtml(yaml, { lang: "yaml", theme: "github-dark" }))
    })
    return () => {
      cancelled = true
    }
  }, [yaml])

  // 内容变化后重新计算渐变蒙层显隐
  useEffect(() => {
    updateFades()
  }, [html, updateFades])

  return (
    <div className="relative overflow-hidden rounded-md border border-slate-700">
      <div
        ref={scrollRef}
        onScroll={updateFades}
        className="no-scrollbar max-h-[380px] overflow-auto"
      >
        {html ? (
          <div
            className="[&>pre]:m-0! [&>pre]:px-3 [&>pre]:py-2 [&_code]:font-mono [&_code]:text-[11px] [&_code]:leading-5"
            // shiki 生成的 HTML 来自受控的 YAML 序列化输出，内容安全
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="m-0 bg-[#0d1117] px-3 py-2 font-mono text-[11px] leading-5 text-slate-300">
            {yaml}
          </pre>
        )}
      </div>

      {/* 顶部渐变：已向下滚动时显示 */}
      {!atTop && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-linear-to-b from-[#0d1117] to-transparent" />
      )}
      {/* 底部渐变：未到底时显示，提示还有内容 */}
      {!atBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-linear-to-t from-[#0d1117] to-transparent" />
      )}
    </div>
  )
}

function OperationItem({ op }: Readonly<{ op: K8sResourceOp }>) {
  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs sm:text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
          {op.resourceKind}
        </Badge>
        <Badge variant="secondary" className="bg-slate-200 text-slate-800">
          {op.operation}
        </Badge>
      </div>
      <p className="mt-1.5 leading-relaxed text-slate-700">{op.description}</p>
      <div className="mt-2 space-y-1">
        <p className="text-[11px] font-medium text-slate-600">字段路径</p>
        {op.fieldPaths.map((fieldPath) => (
          <p key={`${op.resourceKind}-${op.operation}-${fieldPath}`} className="font-mono text-[11px] text-slate-500">
            {fieldPath}
          </p>
        ))}
      </div>
      {op.details && op.details.length > 0 && (
        <div className="mt-2 rounded-md border border-blue-100 bg-blue-50/70 p-2">
          {op.details.map((detail) => (
            <p key={`${op.resourceKind}-${detail}`} className="text-[11px] leading-relaxed text-slate-700">
              - {detail}
            </p>
          ))}
        </div>
      )}
    </li>
  )
}

function SourceLinks({ refs }: Readonly<{ refs: SourceRef[] }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {refs.map((ref) => (
        <a
          key={`${ref.label}-${ref.url}`}
          href={ref.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          {ref.label}
        </a>
      ))}
    </div>
  )
}

function FlowStepCard({
  step,
  active,
  index,
}: Readonly<{ step: ExplainerStep; active: boolean; index: number }>) {
  const stepIconMap: Record<ExplainerStep["stateKey"], ComponentType<{ className?: string }>> = {
    "step-init": Waypoints,
    "step-upgrade": Rocket,
    "step-traffic-routing": Route,
    "step-metrics-analysis": Gauge,
    "step-paused": CirclePause,
    "step-ready": CheckCircle2,
    completed: CheckCircle2,
    "global-paused": CirclePause,
    disabled: Ban,
  }
  const Icon = stepIconMap[step.stateKey]

  return (
    <article
      className={cn(
        "rounded-xl border p-3 shadow-sm transition-colors sm:p-4",
        active
          ? "border-blue-400 bg-blue-50/70 ring-1 ring-blue-200"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" />
        </span>
        <Badge variant={active ? "default" : "outline"} className="font-mono">
          #{index + 1}
        </Badge>
        <h4 className="text-base font-semibold">{step.title}</h4>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{step.summary}</p>
      <p className="mt-2 text-xs sm:text-sm">
        <span className="font-semibold text-slate-700">触发（Trigger）: </span>
        {step.trigger}
      </p>
      <ul className="mt-2 space-y-2">
        {step.ops.map((op) => (
          <OperationItem key={`${step.id}-${op.resourceKind}-${op.operation}-${op.description}`} op={op} />
        ))}
      </ul>
      {step.notes.length > 0 && (
        <div className="mt-2 rounded-md border border-amber-100 bg-amber-50/70 p-2 text-xs text-slate-700 sm:text-sm">
          {step.notes.map((note) => (
            <p key={`${step.id}-${note}`}>- {note}</p>
          ))}
        </div>
      )}
      <div className="mt-2">
        <SourceLinks refs={step.sourceRefs} />
      </div>
    </article>
  )
}

function FlowRail({
  title,
  description,
  steps,
  activeStepId,
}: Readonly<{
  title: string
  description: string
  steps: ExplainerStep[]
  activeStepId?: string
}>) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-1">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {steps.map((step, index) => (
          <FlowStepCard key={step.id} step={step} active={step.id === activeStepId} index={index} />
        ))}
      </CardContent>
    </Card>
  )
}

export function RolloutExplainerPage() {
  const { namespace } = useNamespace()
  const { data: rawList, isLoading: isListLoading } = useAllRollouts(namespace)

  const allRollouts = useMemo(() => {
    if (!rawList?.rollouts) return []
    return transformRolloutList(rawList.rollouts as Record<string, unknown>[]).sort((a, b) =>
      rolloutKey(a).localeCompare(rolloutKey(b))
    )
  }, [rawList])

  const [selectedKey, setSelectedKey] = useState(() => {
    if (typeof globalThis.window === "undefined") {
      return ""
    }
    return new URLSearchParams(globalThis.location.search).get("rollout") ?? ""
  })
  const [activeTab, setActiveTab] = useState<ExplainerTabValue>(() => {
    if (typeof globalThis.window === "undefined") {
      return "canary"
    }
    return resolveTabValue(new URLSearchParams(globalThis.location.search).get("tab"))
  })
  const [specExpanded, setSpecExpanded] = useState(false)

  const resolvedSelectedKey = useMemo(() => {
    const firstRollout = allRollouts.at(0)
    if (!firstRollout) {
      return ""
    }
    const found = allRollouts.some((rollout) => rolloutKey(rollout) === selectedKey)
    return found ? selectedKey : rolloutKey(firstRollout)
  }, [allRollouts, selectedKey])

  const selectedRollout = useMemo(
    () => allRollouts.find((rollout) => rolloutKey(rollout) === resolvedSelectedKey) ?? null,
    [allRollouts, resolvedSelectedKey]
  )

  const selectedNamespace = selectedRollout?.namespace ?? namespace
  const selectedName = selectedRollout?.name ?? ""

  useEffect(() => {
    if (typeof globalThis.window === "undefined") {
      return
    }
    const url = new URL(globalThis.location.href)
    if (activeTab === "canary") {
      url.searchParams.delete("tab")
    } else {
      url.searchParams.set("tab", activeTab)
    }
    if (resolvedSelectedKey) {
      url.searchParams.set("rollout", resolvedSelectedKey)
    } else {
      url.searchParams.delete("rollout")
    }
    const next = `${url.pathname}${url.search}${url.hash}`
    const current = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`
    if (next !== current) {
      globalThis.history.replaceState(globalThis.history.state, "", next)
    }
  }, [activeTab, resolvedSelectedKey])

  const watchEnabled = config.rolloutWatchEnabled && selectedName.length > 0
  const watchState = useRolloutsWatch({
    namespace: selectedNamespace,
    name: selectedName,
    enabled: watchEnabled,
  })
  const refreshInterval = watchState.fallbackPolling ? 10000 : 0
  const watchModeLabel = watchEnabled
    ? watchState.fallbackPolling
      ? "Polling fallback（降级轮询）"
      : "Watch stream（实时流）"
    : "Watch disabled（未启用）"
  const watchSourceHint = watchEnabled
    ? watchState.fallbackPolling
      ? "数据来源：Polling fallback"
      : "数据来源：Watch stream"
    : "数据来源：Polling"

  const { data: rawDetail, isLoading: isDetailLoading } = useRollout(selectedNamespace, selectedName, {
    refreshInterval,
  })
  const { data: podsData } = useRolloutPods(selectedNamespace, selectedName, {
    refreshInterval,
  })

  const detail = useMemo(() => {
    if (!rawDetail) return null
    return transformRolloutDetail(rawDetail)
  }, [rawDetail])
  const rolloutSpecText = useMemo(() => {
    if (!detail?.rawSpec) {
      return ""
    }
    try {
      return dump(detail.rawSpec, { indent: 2, lineWidth: -1, noRefs: true })
    } catch {
      return ""
    }
  }, [detail])

  const explainerStrategy = useMemo(() => inferExplainerStrategy(detail), [detail])
  const liveSnapshot = useMemo(() => buildLiveRolloutSnapshot(detail), [detail])
  const currentMappedStep = useMemo(() => mapSnapshotToExplainerStep(liveSnapshot), [liveSnapshot])
  const liveStepCatalog = useMemo(() => getExplainerSteps(explainerStrategy), [explainerStrategy])
  const revisions: RevisionInfo[] = podsData?.revisions ?? []
  const livePodCounts = useMemo(() => {
    let stablePods = 0
    let canaryPods = 0

    const currentRevisions = podsData?.revisions ?? []
    currentRevisions.forEach((revision) => {
      const pods = Array.isArray(revision.pods) ? revision.pods : []
      const rawReplicas = revision.replicas
      const replicas =
        typeof rawReplicas === "number" && Number.isFinite(rawReplicas)
          ? Math.max(0, Math.round(rawReplicas))
          : pods.length
      if (revision.isStable === true) {
        stablePods += replicas
      }
      if (revision.isCanary === true) {
        canaryPods += replicas
      }
    })

    const totalPods = Array.isArray(podsData?.pods) ? podsData.pods.length : 0
    if (stablePods === 0 && canaryPods === 0 && totalPods > 0) {
      stablePods = totalPods
    }

    return {
      stablePods,
      canaryPods,
    }
  }, [podsData])
  const desiredWorkloadReplicas = useMemo(() => {
    const workloadRef = (podsData?.workloadRef as Record<string, unknown> | null | undefined) ?? undefined
    if (!workloadRef) {
      return undefined
    }

    const spec = (workloadRef.spec as Record<string, unknown> | undefined) ?? undefined
    const status = (workloadRef.status as Record<string, unknown> | undefined) ?? undefined

    const specReplicas =
      typeof spec?.replicas === "number" && Number.isFinite(spec.replicas)
        ? Math.max(0, Math.round(spec.replicas))
        : undefined
    if (specReplicas !== undefined) {
      return specReplicas
    }

    if (typeof status?.replicas === "number" && Number.isFinite(status.replicas)) {
      return Math.max(0, Math.round(status.replicas))
    }

    return undefined
  }, [podsData])
  const canaryDiagramModel = CANARY_DIAGRAM_MODEL
  const abTestDiagramModel = AB_TEST_DIAGRAM_MODEL
  const triggerDiagramModel = TRIGGER_DIAGRAM_MODEL
  const edgeCaseDiagramModel = EDGE_CASE_DIAGRAM_MODEL
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/40">
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 min-h-14 items-center gap-4 px-4 py-2 sm:pl-6 sm:pr-6 sm:py-0 min-w-0">
          <MainNav className="min-w-0 flex-1 shrink" />
          <NamespaceSelector />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto min-w-0 max-w-7xl space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rollouts 流程解读</h1>
              <p className="text-sm text-muted-foreground">
                基于 OpenKruise 官方文档与控制器源码，展示 Canary / A-B / Trigger 与 Edge Case。
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/rollouts" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                返回 Rollouts
              </Link>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(resolveTabValue(value))} className="min-w-0">
            <TabsList className="h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="canary" className="flex-none gap-1.5">
                <GitBranch className="h-4 w-4" />
                Canary 流程
              </TabsTrigger>
              <TabsTrigger value="abtest" className="flex-none gap-1.5">
                <Route className="h-4 w-4" />
                A/B 流程
              </TabsTrigger>
              <TabsTrigger value="trigger" className="flex-none gap-1.5">
                <Radar className="h-4 w-4" />
                Trigger 与 Watch
              </TabsTrigger>
              <TabsTrigger value="edge" className="flex-none gap-1.5">
                <ListChecks className="h-4 w-4" />
                边缘场景（Edge Cases）
              </TabsTrigger>
              <TabsTrigger value="live" className="flex-none gap-1.5">
                <Activity className="h-4 w-4" />
                实时视图
              </TabsTrigger>
            </TabsList>

            <TabsContent value="canary" className="space-y-4">
              <RolloutStateMachineReactFlow
                model={canaryDiagramModel}
                title="Canary State Machine Diagram"
                description="按 openkruise/rollouts 控制器状态机展示 Canary 推进路径（静态源码解读，不绑定当前线上 Rollout）。"
                sourceHint="核对源码：pkg/controller/rollout/rollout_canary.go + pkg/trafficrouting/manager.go"
                staticMode
              />
              <FlowRail
                title="Canary 状态机"
                description="StepInit -> StepUpgrade -> StepTrafficRouting -> StepMetricsAnalysis -> StepPaused -> StepReady -> Completed"
                steps={canaryExplainerSteps}
              />
            </TabsContent>

            <TabsContent value="abtest" className="space-y-4">
              <RolloutStateMachineReactFlow
                model={abTestDiagramModel}
                title="A/B TrafficRouting Diagram"
                description="A/B 在 StepTrafficRouting 通过 matches（headers/query）分支导流（静态源码解读，不绑定当前线上 Rollout）。"
                sourceHint="核对源码：pkg/controller/rollout/rollout_canary.go + pkg/trafficrouting/network/{gateway,ingress}"
                staticMode
              />
              <Card className="gap-3 py-4">
                <CardHeader className="px-4 pb-1">
                  <CardTitle className="text-base sm:text-lg">A/B 关键要点</CardTitle>
                  <CardDescription>
                    A/B 测试复用渐进发布流程，关键在于 traffic matches（headers/query）对流量进行定向导流。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-4 text-xs text-muted-foreground sm:text-sm">
                  <p>- 第一批常见为小副本（如 1 个 Pod）+ headers 匹配导流。</p>
                  <p>- 后续批次可以移除匹配规则，回归普通负载均衡行为。</p>
                  <p>- Gateway API 场景会修改 HTTPRoute rules/matches/backendRefs；Ingress 场景会 patch 注解。</p>
                </CardContent>
              </Card>
              <FlowRail
                title="A/B 状态机"
                description="与 Canary 同步推进，但 TrafficRouting 阶段优先体现匹配路由策略。"
                steps={abTestExplainerSteps}
              />
            </TabsContent>

            <TabsContent value="trigger" className="space-y-4">
              <RolloutFlowDiagram
                model={triggerDiagramModel}
                title="Trigger Chain Diagram"
                description="User Action -> Mutating Webhook -> Controller Watch -> Rollout Reconcile -> Controller Actions"
              />

              <Card className="gap-3 py-4">
                <CardHeader className="px-4 pb-1">
                  <CardTitle className="text-base sm:text-lg">Trigger 规则</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                  {triggerRules.map((rule) => (
                    <article key={rule.id} className="rounded-lg border p-3">
                      <h4 className="text-sm font-semibold sm:text-base">{rule.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">触发条件（Trigger）: {rule.trigger}</p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                        监听来源（ObservedBy）: {rule.observedBy.join(" / ")}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm">执行动作（Action）: {rule.action}</p>
                      <div className="mt-2">
                        <SourceLinks refs={rule.sourceRefs} />
                      </div>
                    </article>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edge" className="space-y-4">
              <RolloutFlowDiagram
                model={edgeCaseDiagramModel}
                title="Edge Case Decision Diagram"
                description="Rollback / Continuous Release / HPA Compatibility / Pause vs Disabled 的决策入口。"
              />
              <Card className="gap-3 py-4">
                <CardHeader className="px-4 pb-1">
                  <CardTitle className="text-base sm:text-lg">Edge Case 处理</CardTitle>
                  <CardDescription>Rollback、Continuous Release、HPA Compatibility、Pause vs Disabled</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                  {edgeCaseRules.map((rule) => (
                    <article key={rule.id} className="rounded-lg border p-3">
                      <h4 className="text-sm font-semibold sm:text-base">{rule.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">场景（Scenario）: {rule.scenario}</p>
                      <p className="mt-1 text-xs sm:text-sm">行为（Behavior）: {rule.behavior}</p>
                      <div className="mt-2 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground sm:text-sm">
                        {rule.keyOps.map((item) => (
                          <p key={`${rule.id}-${item}`}>- {item}</p>
                        ))}
                      </div>
                      <div className="mt-2">
                        <SourceLinks refs={rule.sourceRefs} />
                      </div>
                    </article>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="live" className="space-y-4">
              <Card className="gap-3 py-4">
                <CardHeader className="px-4 pb-1">
                  <CardTitle className="text-base sm:text-lg">实时 Rollout 选择</CardTitle>
                  <CardDescription>从当前命名空间对象中选择一个 Rollout 进行实况映射。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                  {isListLoading ? (
                    <output aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在加载 Rollout 列表…
                    </output>
                  ) : allRollouts.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      当前命名空间没有 Rollout 资源，无法进行实时映射。
                    </div>
                  ) : (
                    <>
                      <Select value={resolvedSelectedKey || undefined} onValueChange={setSelectedKey}>
                        <SelectTrigger id="live-rollout-select" aria-label="选择 Rollout 对象" className="w-full sm:w-[420px]">
                          <SelectValue placeholder="选择一个 Rollout…" />
                        </SelectTrigger>
                        <SelectContent>
                          {allRollouts.map((rollout) => (
                            <SelectItem key={rolloutKey(rollout)} value={rolloutKey(rollout)}>
                              {rollout.namespace}/{rollout.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant={watchState.fallbackPolling ? "outline" : "secondary"}>
                          {watchModeLabel}
                        </Badge>
                        {watchState.lastError && watchState.fallbackPolling && (
                          <span className="text-muted-foreground">{watchState.lastError}</span>
                        )}
                      </div>

                      {!!selectedName && (
                        <>
                          {rolloutSpecText ? (
                            <Collapsible open={specExpanded} onOpenChange={setSpecExpanded}>
                              <div className="mb-1 mt-1 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <Badge variant="outline" className="gap-1">
                                    <Code2 className="h-3 w-3" />
                                    Rollout Spec（YAML）
                                  </Badge>
                                  <Badge variant="outline">workload: {detail?.workloadRefKind}/{detail?.workloadRef}</Badge>
                                  <Badge variant="outline">steps: {detail?.steps.length ?? 0}</Badge>
                                  <Badge variant="outline">paused: {String(detail?.paused ?? false)}</Badge>
                                  <Badge variant="outline">disabled: {String(detail?.disabled ?? false)}</Badge>
                                </div>
                                <CollapsibleTrigger asChild>
                                  <Button variant="outline" size="sm" className="gap-1.5">
                                    {specExpanded ? "收起 Spec YAML" : "展开 Spec YAML"}
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", specExpanded && "rotate-180")} />
                                  </Button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent>
                                <YamlHighlightedBlock yaml={rolloutSpecText} />
                              </CollapsibleContent>
                            </Collapsible>
                          ) : (
                            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                              当前没有可展示的 spec 数据。
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <RolloutResourceTopologyDiagram
                strategy={explainerStrategy}
                detail={detail}
                snapshot={liveSnapshot}
                desiredWorkloadReplicas={desiredWorkloadReplicas}
                actualStablePods={livePodCounts.stablePods}
                actualCanaryPods={livePodCounts.canaryPods}
                title="Live K8s 资源拓扑图"
                description="针对当前选中 Rollout，按真实副本数与阶段状态展示资源关系。"
                sourceHint={watchSourceHint}
              />

              {selectedName && (
                <>
                  <Card className="gap-3 py-4">
                    <CardHeader className="px-4 pb-1">
                      <CardTitle className="text-base sm:text-lg">当前快照</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 px-4 text-xs sm:grid-cols-2 sm:text-sm">
                      <div className="rounded-md border p-2">Phase: {detail?.phase || "-"}</div>
                      <div className="rounded-md border p-2">Strategy: {explainerStrategy === "abtest" ? "A/B" : "Canary"}</div>
                      <div className="rounded-md border p-2">
                        Step: {detail ? `${detail.displayStep}/${detail.totalSteps || "-"}` : "-"}
                      </div>
                      <div className="rounded-md border p-2">StepState: {liveSnapshot?.currentStepState || "-"}</div>
                      <div className="rounded-md border p-2">Stable Pods（实时）: {livePodCounts.stablePods}</div>
                      <div className="rounded-md border p-2">Canary Pods（实时）: {livePodCounts.canaryPods}</div>
                      <div className="rounded-md border p-2">Stable Revision: {detail?.stableRevisionHash || "-"}</div>
                      <div className="rounded-md border p-2">Canary Revision: {detail?.canaryRevisionHash || "-"}</div>
                      <div className="rounded-md border p-2">Revision Groups: {revisions.length}</div>
                      <div className="rounded-md border p-2">
                        Loading: {isDetailLoading ? "true" : "false"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gap-3 py-4">
                    <CardHeader className="px-4 pb-1">
                      <CardTitle className="text-base sm:text-lg">推断中的 Controller Actions</CardTitle>
                      <CardDescription>
                        依据实时状态映射到 {explainerStrategy === "abtest" ? "A/B" : "Canary"} 解释模型中的阶段。
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4">
                      {currentMappedStep ? (
                        <FlowStepCard
                          step={currentMappedStep}
                          active
                          index={Math.max(
                            0,
                            liveStepCatalog.findIndex((step) => step.id === currentMappedStep.id)
                          )}
                        />
                      ) : (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          当前状态暂无法映射到已定义步骤，请检查 Rollout 状态字段或等待控制器推进。
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-base sm:text-lg">说明与边界</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 text-xs text-muted-foreground sm:text-sm">
              <p>- 页面基于官方文档与开源控制器源码整理规则，并用当前集群状态进行实时映射。</p>
              <p>- 当前实时展示不直接比对 Service/Ingress/HTTPRoute 的实时对象 diff，而是给出“可能正在执行的控制器动作”。</p>
              <p>- 若你需要更细粒度对象级实况，可在后端补充聚合接口后扩展此页面。</p>
              <div className="flex items-center gap-2 text-xs">
                <Network className="h-3.5 w-3.5" />
                主要依据：openkruise.io 文档 + github.com/openkruise/rollouts
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

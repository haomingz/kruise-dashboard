"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Activity,
  ArrowLeft,
  GitBranch,
  ListChecks,
  Loader2,
  Network,
  Radar,
  Route,
} from "lucide-react"
import { MainNav } from "@/components/main-nav"
import { NamespaceSelector } from "@/components/namespace-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { transformRolloutDetail, transformRolloutList } from "@/lib/rollout-utils"
import { config } from "@/lib/config"
import { cn } from "@/lib/utils"

function rolloutKey(rollout: { namespace: string; name: string }): string {
  return `${rollout.namespace}/${rollout.name}`
}

function OperationItem({ op }: Readonly<{ op: K8sResourceOp }>) {
  return (
    <li className="rounded-md border bg-muted/20 p-2 text-xs sm:text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{op.resourceKind}</Badge>
        <Badge variant="secondary">{op.operation}</Badge>
      </div>
      <p className="mt-1 text-muted-foreground">{op.description}</p>
      <div className="mt-2 space-y-1">
        {op.fieldPaths.map((fieldPath) => (
          <p key={`${op.resourceKind}-${op.operation}-${fieldPath}`} className="font-mono text-[11px] text-muted-foreground">
            {fieldPath}
          </p>
        ))}
      </div>
      {op.details && op.details.length > 0 && (
        <div className="mt-2 rounded-md bg-background/70 p-2">
          {op.details.map((detail) => (
            <p key={`${op.resourceKind}-${detail}`} className="text-[11px] text-muted-foreground">
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
  return (
    <article
      className={cn(
        "rounded-xl border p-3 sm:p-4",
        active ? "border-blue-400 bg-blue-50/70" : "bg-card"
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant={active ? "default" : "outline"}>#{index + 1}</Badge>
        <h4 className="text-sm font-semibold sm:text-base">{step.title}</h4>
      </div>
      <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{step.summary}</p>
      <p className="mt-2 text-xs sm:text-sm">
        <span className="font-medium">触发（Trigger）: </span>
        {step.trigger}
      </p>
      <ul className="mt-2 space-y-2">
        {step.ops.map((op) => (
          <OperationItem key={`${step.id}-${op.resourceKind}-${op.operation}-${op.description}`} op={op} />
        ))}
      </ul>
      {step.notes.length > 0 && (
        <div className="mt-2 rounded-md bg-muted/30 p-2 text-xs text-muted-foreground sm:text-sm">
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
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
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

function TriggerOverview() {
  const nodes = [
    "用户变更 Workload / Rollout",
    "Mutating Webhook patch Workload",
    "Controller Watch 入队",
    "Rollout Reconcile",
    "执行 BatchRelease / TrafficRouting",
  ]

  return (
    <div className="grid gap-2 md:grid-cols-5">
      {nodes.map((node, index) => (
        <div key={node} className="rounded-lg border bg-card p-3 text-xs sm:text-sm">
          <div className="font-medium">{node}</div>
          {index < nodes.length - 1 && <div className="mt-2 text-muted-foreground">→</div>}
        </div>
      ))}
    </div>
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

  const [selectedKey, setSelectedKey] = useState("")

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

  const watchEnabled = config.rolloutWatchEnabled && selectedName.length > 0
  const watchState = useRolloutsWatch({
    namespace: selectedNamespace,
    name: selectedName,
    enabled: watchEnabled,
  })
  const refreshInterval = watchState.fallbackPolling ? 10000 : 0

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

  const explainerStrategy = useMemo(() => inferExplainerStrategy(detail), [detail])
  const liveSnapshot = useMemo(() => buildLiveRolloutSnapshot(detail), [detail])
  const currentMappedStep = useMemo(() => mapSnapshotToExplainerStep(liveSnapshot), [liveSnapshot])
  const liveStepCatalog = useMemo(() => getExplainerSteps(explainerStrategy), [explainerStrategy])
  const revisions = (podsData?.revisions as unknown[]) || []

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

          <Tabs defaultValue="canary" className="min-w-0">
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
              <FlowRail
                title="Canary 状态机"
                description="StepInit -> StepUpgrade -> StepTrafficRouting -> StepMetricsAnalysis -> StepPaused -> StepReady -> Completed"
                steps={canaryExplainerSteps}
                activeStepId={currentMappedStep?.id}
              />
            </TabsContent>

            <TabsContent value="abtest" className="space-y-4">
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
                activeStepId={currentMappedStep?.id}
              />
            </TabsContent>

            <TabsContent value="trigger" className="space-y-4">
              <Card className="gap-3 py-4">
                <CardHeader className="px-4 pb-1">
                  <CardTitle className="text-base sm:text-lg">Trigger 链路总览</CardTitle>
                  <CardDescription>{"用户动作 -> Webhook -> Watch 入队 -> Reconcile -> rollout actions"}</CardDescription>
                </CardHeader>
                <CardContent className="px-4">
                  <TriggerOverview />
                </CardContent>
              </Card>

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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在加载 Rollout 列表...
                    </div>
                  ) : allRollouts.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      当前命名空间没有 Rollout 资源，无法进行实时映射。
                    </div>
                  ) : (
                    <>
                      <Select value={resolvedSelectedKey || undefined} onValueChange={setSelectedKey}>
                        <SelectTrigger className="w-full sm:w-[420px]">
                          <SelectValue placeholder="选择一个 Rollout" />
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
                          {watchEnabled
                            ? watchState.fallbackPolling
                              ? "Polling fallback（降级轮询）"
                              : "Watch stream（实时流）"
                            : "Watch disabled（未启用）"}
                        </Badge>
                        {watchState.lastError && watchState.fallbackPolling && (
                          <span className="text-muted-foreground">{watchState.lastError}</span>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

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
                      <div className="rounded-md border p-2">Stable Replicas: {detail?.stableReplicas ?? "-"}</div>
                      <div className="rounded-md border p-2">Canary Replicas: {detail?.canaryReplicas ?? "-"}</div>
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
                        <>
                          <FlowStepCard
                            step={currentMappedStep}
                            active
                            index={Math.max(
                              0,
                              liveStepCatalog.findIndex((step) => step.id === currentMappedStep.id)
                            )}
                          />
                        </>
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

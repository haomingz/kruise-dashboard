"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { RolloutStepsPipeline } from "@/components/rollout-steps-pipeline"
import { PodStatusGrid, PodStatusGridSimple } from "@/components/rollout-pod-status"
import { RolloutRevisions } from "@/components/rollout-revisions"
import { RolloutContainers } from "@/components/rollout-containers"
import { RolloutAnalysisModal } from "@/components/rollout-analysis-modal"
import { RolloutStatusIcon, RolloutStrategyBadge } from "@/components/rollout-status"
import { MainNav } from "@/components/main-nav"
import { NamespaceSelector } from "@/components/namespace-selector"
import { transformRolloutDetail } from "@/lib/rollout-utils"
import { config } from "@/lib/config"
import { useRollout, useRolloutPods } from "@/hooks/use-rollouts"
import { useRolloutsWatch } from "@/hooks/use-rollouts-watch"
import {
  promoteRollout,
  approveRollout,
  pauseRollout,
  restartRollout,
  resumeRollout,
  enableRollout,
  disableRollout,
  retryRollout,
  rollbackRollout,
} from "@/api/rollout"
import type { RevisionInfo, ContainerInfo } from "@/api/rollout"
import {
  ArrowLeft,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  XCircle,
  RotateCw,
  ArrowUpCircle,
  BarChart3,
  Loader2,
  Server,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState, useCallback } from "react"
import { useSWRConfig } from "swr"

type ActionType = "restart" | "retry" | "pause" | "resume" | "promote" | "approve" | "enable" | "disable" | "rollback"

export function RolloutDetailEnhanced() {
  const params = useParams()
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const namespace = (Array.isArray(params.namespace) ? params.namespace[0] : params.namespace) || "default"
  const name = (Array.isArray(params.name) ? params.name[0] : params.name) || ""

  const watchState = useRolloutsWatch({
    namespace,
    name,
    enabled: config.rolloutWatchEnabled,
  })
  const refreshInterval = watchState.fallbackPolling ? 10000 : 0

  const { data: rawRolloutData, error: fetchError, isLoading } = useRollout(namespace, name, {
    refreshInterval,
  })
  const { data: podsData } = useRolloutPods(namespace, name, {
    refreshInterval,
  })

  const [actionLoading, setActionLoading] = useState<ActionType | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)

  const rollout = useMemo(() => {
    if (!rawRolloutData) return null
    return transformRolloutDetail(rawRolloutData as Record<string, unknown>)
  }, [rawRolloutData])

  const pods = useMemo(() => {
    return (podsData?.pods as Record<string, unknown>[]) || []
  }, [podsData])

  const revisions = useMemo(() => {
    return (podsData?.revisions as RevisionInfo[]) || []
  }, [podsData])

  const containers = useMemo(() => {
    return (podsData?.containers as ContainerInfo[]) || []
  }, [podsData])

  const handleAction = useCallback(
    async (action: ActionType, fn: () => Promise<void>) => {
      setActionLoading(action)
      setActionError(null)
      try {
        await fn()
        mutate(`rollout-${namespace}-${name}`)
        mutate(`rollout-pods-${namespace}-${name}`)
      } catch (error) {
        const message =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Action failed"
            : "Action failed"
        setActionError(message)
      } finally {
        setActionLoading(null)
      }
    },
    [mutate, namespace, name]
  )

  if (isLoading) {
    return (
      <div className="flex h-dvh flex-col bg-muted/40">
        <header className="shrink-0 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4 sm:pl-6 sm:pr-6">
            <MainNav className="min-w-0 flex-1" />
            <NamespaceSelector />
          </div>
        </header>
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading rollout details...</span>
        </div>
      </div>
    )
  }

  if (fetchError || !rollout) {
    return (
      <div className="flex h-dvh flex-col bg-muted/40">
        <header className="shrink-0 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4 sm:pl-6 sm:pr-6">
            <MainNav className="min-w-0 flex-1" />
            <NamespaceSelector />
          </div>
        </header>
        <div className="flex-1 flex flex-col justify-center items-center gap-4">
          <p className="text-red-500">Failed to load rollout details</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    )
  }

  const phase = rollout.phase.toLowerCase()
  const isDisabled = rollout.disabled || phase === "disabled"
  const canPause = !isDisabled && phase === "progressing"
  const canResume = !isDisabled && (phase === "paused" || rollout.paused)
  const canPromote = !isDisabled && (phase === "paused" || phase === "progressing")
  const canApprove = !isDisabled && (phase === "paused" || phase === "progressing")
  const canDisable = !isDisabled
  const canEnable = isDisabled
  const canRetry = !isDisabled && (phase === "paused" || phase === "progressing" || phase === "degraded")
  const rollbackSupported = rollout.workloadRefKind.toLowerCase() === "deployment"
  const rollbackDisabledReason = "当前仅支持 Deployment 回滚"

  return (
    <div className="flex h-dvh flex-col bg-muted/40 overflow-hidden">
      <header className="shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 sm:pl-6 sm:pr-6">
          <MainNav className="min-w-0 flex-1" />
          <NamespaceSelector />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-w-0 space-y-3 p-3 sm:p-4 max-w-7xl mx-auto">
          {/* Title row with actions on the right */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => router.push("/rollouts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold truncate">{rollout.name}</h1>
            <RolloutStatusIcon status={rollout.phase} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{rollout.namespace} / {rollout.phase}</span>
            <Badge variant={watchState.fallbackPolling ? "outline" : "secondary"} className="text-[10px]">
              {watchState.fallbackPolling ? "Polling" : "Watch"}
            </Badge>

            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <ActionButton
                label="RESTART"
                icon={RefreshCw}
                loading={actionLoading === "restart"}
                disabled={actionLoading !== null}
                confirmTitle="Restart Rollout?"
                confirmDescription={`This will restart the rollout "${rollout.name}".`}
                onConfirm={() => handleAction("restart", () => restartRollout(namespace, name))}
              />
              {canRetry && (
                <ActionButton
                  label="RETRY"
                  icon={RotateCw}
                  loading={actionLoading === "retry"}
                  disabled={actionLoading !== null}
                  confirmTitle="Retry Rollout?"
                  confirmDescription={`This will retry the current step of rollout "${rollout.name}".`}
                  onConfirm={() => handleAction("retry", () => retryRollout(namespace, name))}
                />
              )}
              {canPause && (
                <ActionButton
                  label="PAUSE"
                  icon={PauseCircle}
                  loading={actionLoading === "pause"}
                  disabled={actionLoading !== null}
                  confirmTitle="Pause Rollout?"
                  confirmDescription={`This will pause the rollout "${rollout.name}".`}
                  onConfirm={() => handleAction("pause", () => pauseRollout(namespace, name))}
                />
              )}
              {canResume && (
                <ActionButton
                  label="RESUME"
                  icon={PlayCircle}
                  loading={actionLoading === "resume"}
                  disabled={actionLoading !== null}
                  confirmTitle="Resume Rollout?"
                  confirmDescription={`This will resume the rollout "${rollout.name}".`}
                  onConfirm={() => handleAction("resume", () => resumeRollout(namespace, name))}
                />
              )}
              {canDisable && (
                <ActionButton
                  label="DISABLE"
                  icon={XCircle}
                  loading={actionLoading === "disable"}
                  disabled={actionLoading !== null}
                  confirmTitle="Disable Rollout?"
                  confirmDescription={`This will disable the rollout "${rollout.name}".`}
                  onConfirm={() => handleAction("disable", () => disableRollout(namespace, name))}
                  variant="destructive"
                />
              )}
              {canEnable && (
                <ActionButton
                  label="ENABLE"
                  icon={PlayCircle}
                  loading={actionLoading === "enable"}
                  disabled={actionLoading !== null}
                  confirmTitle="Enable Rollout?"
                  confirmDescription={`This will enable the rollout "${rollout.name}".`}
                  onConfirm={() => handleAction("enable", () => enableRollout(namespace, name))}
                />
              )}
              {canPromote && (
                <ActionButton
                  label="PROMOTE"
                  icon={ArrowUpCircle}
                  loading={actionLoading === "promote"}
                  disabled={actionLoading !== null}
                  confirmTitle="Promote Rollout?"
                  confirmDescription={`This will promote rollout "${rollout.name}" to the next step.`}
                  onConfirm={() => handleAction("promote", () => promoteRollout(namespace, name))}
                />
              )}
              {canApprove && (
                <ActionButton
                  label="PROMOTE-FULL"
                  icon={ArrowUpCircle}
                  loading={actionLoading === "approve"}
                  disabled={actionLoading !== null}
                  confirmTitle="Promote Rollout?"
                  confirmDescription={`This will fully promote the rollout "${rollout.name}".`}
                  onConfirm={() => handleAction("approve", () => approveRollout(namespace, name))}
                />
              )}
              {config.rolloutAnalysisEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setAnalysisOpen(true)}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  ANALYSIS
                </Button>
              )}
            </div>
          </div>
          {watchState.lastError && watchState.fallbackPolling && (
            <div className="text-xs text-muted-foreground">
              Watch unavailable, fallback to polling: {watchState.lastError}
            </div>
          )}
          {actionError && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {actionError}
            </div>
          )}

          {/* Summary + Workload Ref */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <section className="rounded-lg border bg-card p-3 space-y-1.5">
              <h3 className="text-sm font-semibold">Summary</h3>
              <KV label="Strategy"><RolloutStrategyBadge strategy={rollout.strategy} /></KV>
              <KV label="Step">
                <Badge variant="outline" className="tabular-nums">
                  {rollout.isCompleted ? "Completed" : `${rollout.displayStep}/${rollout.totalSteps}`}
                </Badge>
              </KV>
              {rollout.strategy === "Canary" && (
                <>
                  <KV label="Set Weight">
                    <Badge variant="outline" className="tabular-nums">{rollout.trafficPercent}%</Badge>
                  </KV>
                  {rollout.actualWeight !== undefined && (
                    <KV label="Actual Weight">
                      <Badge variant="outline" className="tabular-nums">{rollout.actualWeight}%</Badge>
                    </KV>
                  )}
                </>
              )}
              <KV label="Replicas">
                <span className="text-sm tabular-nums">Stable: {rollout.stableReplicas} / Canary: {rollout.canaryReplicas}</span>
              </KV>
              {rollout.message && (
                <KV label="Message">
                  <span className="text-xs text-muted-foreground truncate max-w-[240px]">{rollout.message}</span>
                </KV>
              )}
            </section>

            <section className="rounded-lg border bg-card p-3 space-y-1.5">
              <h3 className="text-sm font-semibold">Workload Reference</h3>
              <div className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{rollout.workloadRef}</span>
              </div>
              <KV label="Kind"><Badge variant="outline">{rollout.workloadRefKind}</Badge></KV>
              <KV label="Age"><span className="text-sm">{rollout.age}</span></KV>
              {rollout.uid && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">UID:</span>
                  <span className="text-xs font-mono break-all select-all leading-tight">{rollout.uid}</span>
                </div>
              )}
            </section>
          </div>

          {/* Steps + Revisions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <section className="rounded-lg border bg-card p-3">
              <h3 className="text-sm font-semibold mb-2">Steps</h3>
              <RolloutStepsPipeline
                steps={rollout.steps}
                currentStep={rollout.currentStep}
                isCompleted={rollout.isCompleted}
                phase={rollout.phase}
              />
            </section>

            <section className="rounded-lg border bg-card p-3">
              <h3 className="text-sm font-semibold mb-2">
                {revisions.length > 0 ? "Revisions" : "Pods"}
              </h3>
              {revisions.length > 0 ? (
                <RolloutRevisions
                  revisions={revisions}
                  rolloutName={rollout.name}
                  namespace={namespace}
                  rollbackEnabled={config.rollbackEnabled && rollbackSupported}
                  rollbackDisabledReason={rollbackDisabledReason}
                  onRollback={(_revision) =>
                    handleAction("rollback", () => rollbackRollout(namespace, name).then(() => undefined))
                  }
                />
              ) : pods.length > 0 ? (
                <PodStatusGrid pods={pods} />
              ) : (
                <PodStatusGridSimple
                  ready={rollout.stableReplicas + rollout.canaryReplicas}
                  total={rollout.stableReplicas + rollout.canaryReplicas}
                />
              )}
              <div className="text-xs text-muted-foreground mt-1.5">
                Total: {pods.length > 0 ? pods.length : rollout.stableReplicas + rollout.canaryReplicas} pods
              </div>
            </section>
          </div>

          {/* Containers */}
          {containers.length > 0 && (
            <section className="rounded-lg border bg-card p-3">
              <h3 className="text-sm font-semibold mb-2">Containers</h3>
              <RolloutContainers
                containers={containers}
                namespace={namespace}
                rolloutName={name}
                onUpdated={() => {
                  void mutate(`rollout-pods-${namespace}-${name}`)
                }}
              />
            </section>
          )}

          {/* Traffic Routing */}
          {rollout.trafficRoutings && rollout.trafficRoutings.length > 0 && (
            <section className="rounded-lg border bg-card p-3">
              <h3 className="text-sm font-semibold mb-2">Traffic Routing</h3>
              <div className="space-y-2">
                {rollout.trafficRoutings.map((routing) => (
                  <div key={routing.service} className="p-2 border rounded space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Service:</span>
                      <Badge variant="outline">{routing.service}</Badge>
                    </div>
                    {routing.ingress && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">Ingress:</span>
                        <Badge variant="outline">{routing.ingress.name}</Badge>
                        <Badge variant="outline">{routing.ingress.classType}</Badge>
                      </div>
                    )}
                    {routing.gracePeriodSeconds && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">Grace Period:</span>
                        <span className="text-sm">{routing.gracePeriodSeconds}s</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Details */}
          <section className="rounded-lg border bg-card p-3">
            <h3 className="text-sm font-semibold mb-1.5">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <KV label="Name"><span className="text-sm">{rollout.name}</span></KV>
              <KV label="Namespace"><span className="text-sm">{rollout.namespace}</span></KV>
              <KV label="Strategy"><span className="text-sm">{rollout.strategy}</span></KV>
              <KV label="Phase"><span className="text-sm">{rollout.phase}</span></KV>
              <KV label="Age"><span className="text-sm">{rollout.age}</span></KV>
              <KV label="Generation"><span className="text-sm">{rollout.observedGeneration ?? "N/A"}</span></KV>
              {rollout.creationTimestamp && (
                <KV label="Created"><span className="text-sm">{rollout.creationTimestamp}</span></KV>
              )}
            </div>
          </section>
        </div>
      </div>
      {config.rolloutAnalysisEnabled && (
        <RolloutAnalysisModal
          namespace={namespace}
          name={name}
          open={analysisOpen}
          onOpenChange={setAnalysisOpen}
        />
      )}
    </div>
  )
}

/* ---------- Helpers ---------- */

function KV({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function ActionButton({
  label,
  icon: Icon,
  loading,
  disabled,
  confirmTitle,
  confirmDescription,
  onConfirm,
  variant,
}: Readonly<{
  label: string
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  disabled: boolean
  confirmTitle: string
  confirmDescription: string
  onConfirm: () => void
  variant?: "default" | "destructive"
}>) {
  const isDestructive = variant === "destructive"
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            isDestructive
              ? "gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              : "gap-1.5 text-xs"
          }
          disabled={disabled}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={isDestructive ? "bg-red-600 hover:bg-red-700" : undefined}
            onClick={onConfirm}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

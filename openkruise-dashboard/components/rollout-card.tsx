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
import { PodStatusGridSimple } from "@/components/rollout-pod-status"
import { RolloutStatusIcon, RolloutStrategyBadge } from "@/components/rollout-status"
import type { TransformedRollout } from "@/lib/rollout-utils"
import {
  CheckCircle,
  RefreshCw,
  Loader2,
  ArrowUpCircle,
  ChevronRight,
  XCircle,
  RotateCw,
} from "lucide-react"
import Link from "next/link"
import { useState, useCallback } from "react"
import { restartRollout, approveRollout, abortRollout, retryRollout, promoteRollout } from "@/api/rollout"
import { useSWRConfig } from "swr"

type CardAction = "restart" | "retry" | "promote" | "approve" | "abort"

export function RolloutCard({ rollout }: Readonly<{ rollout: TransformedRollout }>) {
  const { mutate } = useSWRConfig()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = useCallback(
    async (action: CardAction, fn: () => Promise<void>) => {
      setActionLoading(action)
      try {
        await fn()
        await mutate(
          (key) =>
            typeof key === "string" &&
            (key.startsWith("all-rollouts-") ||
              key.startsWith("active-rollouts-") ||
              key === `rollout-${rollout.namespace}-${rollout.name}` ||
              key === `rollout-pods-${rollout.namespace}-${rollout.name}`),
          undefined,
          { revalidate: true }
        )
      } catch {
        // error already logged in API layer
      } finally {
        setActionLoading(null)
      }
    },
    [mutate, rollout.namespace, rollout.name]
  )

  const isActive = rollout.phase === "Paused" || rollout.phase === "Progressing"

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <Link
          href={`/rollouts/${rollout.namespace}/${rollout.name}`}
          className="font-semibold text-sm truncate hover:underline flex items-center gap-1"
        >
          {rollout.name}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <RolloutStatusIcon status={rollout.phase} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Strategy + Weight */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Strategy</span>
            <RolloutStrategyBadge strategy={rollout.strategy} />
          </div>
          {rollout.strategy === "Canary" && rollout.trafficPercent > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Weight</span>
              <Badge variant="outline" className="tabular-nums">
                {rollout.trafficPercent}
              </Badge>
            </div>
          )}
        </div>

        {/* Pod section */}
        <div className="space-y-2 border-t pt-2.5">
          {rollout.stableReplicas > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Stable
                  {rollout.isCompleted && (
                    <CheckCircle className="inline h-3 w-3 ml-1 text-green-500" />
                  )}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {rollout.stableReplicas} pod{rollout.stableReplicas === 1 ? "" : "s"}
                </span>
              </div>
              <PodStatusGridSimple
                ready={rollout.stableReplicas}
                total={rollout.stableReplicas}
              />
            </div>
          )}
          {rollout.canaryReplicas > 0 && !rollout.isCompleted && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {rollout.strategy === "Blue-Green" ? "Preview" : "Canary"}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {rollout.canaryReplicas} pod{rollout.canaryReplicas === 1 ? "" : "s"}
                </span>
              </div>
              <PodStatusGridSimple
                ready={rollout.canaryReplicas}
                total={rollout.canaryReplicas}
              />
            </div>
          )}
          {rollout.stableReplicas === 0 && rollout.canaryReplicas === 0 && (
            <div className="text-xs text-muted-foreground">No pods reported</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
        <CardActionBtn
          label="RESTART"
          icon={RefreshCw}
          loading={actionLoading === "restart"}
          disabled={actionLoading !== null}
          confirmTitle="Restart Rollout?"
          confirmDesc={`This will restart the rollout "${rollout.name}".`}
          onConfirm={() => handleAction("restart", () => restartRollout(rollout.namespace, rollout.name))}
        />
        {isActive && (
          <>
            <CardActionBtn
              label="RETRY"
              icon={RotateCw}
              loading={actionLoading === "retry"}
              disabled={actionLoading !== null}
              confirmTitle="Retry Rollout?"
              confirmDesc={`This will retry the current step of rollout "${rollout.name}".`}
              onConfirm={() => handleAction("retry", () => retryRollout(rollout.namespace, rollout.name))}
            />
            <CardActionBtn
              label="ABORT"
              icon={XCircle}
              loading={actionLoading === "abort"}
              disabled={actionLoading !== null}
              confirmTitle="Abort Rollout?"
              confirmDesc={`This will abort the rollout "${rollout.name}" by disabling it.`}
              onConfirm={() => handleAction("abort", () => abortRollout(rollout.namespace, rollout.name))}
            />
            <CardActionBtn
              label="PROMOTE"
              icon={ArrowUpCircle}
              loading={actionLoading === "promote"}
              disabled={actionLoading !== null}
              confirmTitle="Promote Rollout?"
              confirmDesc={`This will promote rollout "${rollout.name}" to the next step.`}
              onConfirm={() => handleAction("promote", () => promoteRollout(rollout.namespace, rollout.name))}
            />
            <CardActionBtn
              label="PROMOTE-FULL"
              icon={ArrowUpCircle}
              loading={actionLoading === "approve"}
              disabled={actionLoading !== null}
              confirmTitle="Promote Rollout?"
              confirmDesc={`This will fully promote the rollout "${rollout.name}", skipping remaining steps.`}
              onConfirm={() => handleAction("approve", () => approveRollout(rollout.namespace, rollout.name))}
            />
          </>
        )}
      </div>
    </div>
  )
}

function CardActionBtn({
  label,
  icon: Icon,
  loading,
  disabled,
  confirmTitle,
  confirmDesc,
  onConfirm,
}: Readonly<{
  label: string
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  disabled: boolean
  confirmTitle: string
  confirmDesc: string
  onConfirm: () => void
}>) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] gap-1 px-2.5"
          disabled={disabled}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

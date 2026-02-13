"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { PodStatusGrid, PodStatusGridSimple } from "@/components/rollout-pod-status"
import type { RevisionInfo } from "@/api/rollout"
import {
  ChevronRight,
  CheckCircle,
  Package,
  Undo2,
} from "lucide-react"
import { cn } from "@/lib/utils"

function getRoleBadge(rev: RevisionInfo) {
  if (rev.isCanary) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] px-1.5 py-0">
        canary
      </Badge>
    )
  }
  if (rev.isStable) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px] px-1.5 py-0">
        stable
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
      old
    </Badge>
  )
}

interface RolloutRevisionsProps {
  revisions: RevisionInfo[]
  rolloutName?: string
  namespace?: string
  onRollback?: (revision: RevisionInfo) => void
  rollbackEnabled?: boolean
  rollbackDisabledReason?: string
}

export function RolloutRevisions({
  revisions,
  onRollback,
  rollbackEnabled = true,
  rollbackDisabledReason,
}: Readonly<RolloutRevisionsProps>) {
  if (!revisions || revisions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No revision data available
      </div>
    )
  }

  // Default: expand canary and stable, collapse old
  const defaultOpen = revisions.reduce<Record<string, boolean>>((acc, rev) => {
    acc[rev.name] = rev.isCanary || rev.isStable
    return acc
  }, {})

  return (
    <div className="space-y-2">
      {revisions.map((rev) => (
        <RevisionItem
          key={rev.name}
          revision={rev}
          defaultOpen={defaultOpen[rev.name] ?? false}
          onRollback={onRollback}
          rollbackEnabled={rollbackEnabled}
          rollbackDisabledReason={rollbackDisabledReason}
        />
      ))}
    </div>
  )
}

function RevisionItem({
  revision,
  defaultOpen,
  onRollback,
  rollbackEnabled,
  rollbackDisabledReason,
}: Readonly<{
  revision: RevisionInfo
  defaultOpen: boolean
  onRollback?: (revision: RevisionInfo) => void
  rollbackEnabled: boolean
  rollbackDisabledReason?: string
}>) {
  const [open, setOpen] = useState(defaultOpen)
  const isOld = !revision.isCanary && !revision.isStable
  const allReady = revision.replicas > 0 && revision.readyReplicas >= revision.replicas
  const pods = revision.pods || []

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          revision.isCanary && "border-blue-200 bg-blue-50/50",
          revision.isStable && "border-green-200 bg-green-50/50",
          isOld && "border-gray-200 bg-gray-50/50",
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50 rounded-t-lg">
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90"
            )}
          />
          <span className="text-sm font-mono truncate flex-1" title={revision.name}>
            {revision.name}
          </span>
          {allReady && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          {getRoleBadge(revision)}
          {revision.revision && (
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              Rev {revision.revision}
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {revision.readyReplicas}/{revision.replicas}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t">
            {/* Pods */}
            <div className="pt-2">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Pods</div>
              {pods.length > 0 ? (
                <PodStatusGrid pods={pods as Record<string, unknown>[]} />
              ) : (
                <PodStatusGridSimple
                  ready={revision.readyReplicas}
                  total={revision.replicas}
                />
              )}
            </div>

            {/* Containers */}
            {revision.containers && revision.containers.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Containers</div>
                <div className="space-y-1">
                  {revision.containers.map((c) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">&rarr;</span>
                      <span className="font-mono text-muted-foreground truncate">{c.image}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rollback button for old revisions */}
            {isOld && onRollback && (
              <div className="pt-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-7"
                      disabled={!rollbackEnabled}
                      title={!rollbackEnabled ? rollbackDisabledReason || "Rollback unavailable" : undefined}
                    >
                      <Undo2 className="h-3 w-3" />
                      ROLLBACK
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rollback to this revision?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will roll back the workload to revision {revision.revision || revision.podTemplateHash}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRollback(revision)}>
                        Rollback
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

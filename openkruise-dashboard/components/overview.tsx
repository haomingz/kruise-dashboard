"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type React from "react"
import { useClusterMetrics } from "../hooks/use-cluster"

interface OverviewProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Overview({ className, ...props }: Readonly<OverviewProps>) {
  const { data: metrics, error, isLoading } = useClusterMetrics()

  // Extract metrics (API returns numbers; storage/network are 0 when not provided by metrics API)
  const cpuUsage = Number(metrics?.cpuUsage) || 0
  const memoryUsage = Number(metrics?.memoryUsage) || 0
  const storageUsage = Number(metrics?.storageUsage) || 0
  const networkUsage = Number(metrics?.networkUsage) || 0
  const nodeCount = metrics?.totalNodes ?? 0
  const readyNodes = metrics?.readyNodes ?? 0
  const podCount = metrics?.totalPods ?? 0
  const runningPods = metrics?.runningPods ?? 0
  const hasStorage = storageUsage > 0
  const hasNetwork = networkUsage > 0

  if (isLoading && !metrics) {
    return (
      <Card className={cn("min-w-0 gap-3 py-4", className)} {...props}>
        <CardHeader className="p-0 px-4 pt-0 pb-1">
          <CardTitle className="text-base sm:text-lg">Cluster Overview</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Loading cluster metrics…</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="space-y-3">
            <div className="motion-safe:animate-pulse space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-14 h-3 bg-muted rounded" />
                  <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full w-[40%] bg-muted-foreground/10 rounded-full" />
                  </div>
                  <div className="w-10 h-3 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("min-w-0 gap-3 py-4", className)} {...props}>
        <CardHeader className="p-0 px-4 pt-0 pb-1">
          <CardTitle className="text-base sm:text-lg">Cluster Overview</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Error loading cluster metrics</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-destructive text-sm">Failed to fetch cluster metrics</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("min-w-0 gap-3 py-4", className)} {...props}>
      <CardHeader className="p-0 px-4 pt-0 pb-1">
        <CardTitle className="text-base sm:text-lg">Cluster Overview</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Resource utilization across your cluster</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-12 sm:w-14 shrink-0 text-right text-xs font-medium text-muted-foreground">CPU</div>
              <div className="relative flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(cpuUsage, 100)}%` }} />
              </div>
              <span className="w-9 sm:w-10 shrink-0 text-right text-xs tabular-nums font-medium">{Math.round(cpuUsage)}%</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-12 sm:w-14 shrink-0 text-right text-xs font-medium text-muted-foreground">Memory</div>
              <div className="relative flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${Math.min(memoryUsage, 100)}%` }} />
              </div>
              <span className="w-9 sm:w-10 shrink-0 text-right text-xs tabular-nums font-medium">{Math.round(memoryUsage)}%</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-12 sm:w-14 shrink-0 text-right text-xs font-medium text-muted-foreground">Storage</div>
              <div className="relative flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: hasStorage ? `${Math.min(storageUsage, 100)}%` : "0%" }} />
              </div>
              <span className="w-9 sm:w-10 shrink-0 text-right text-xs tabular-nums font-medium">{hasStorage ? `${Math.round(storageUsage)}%` : "N/A"}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-12 sm:w-14 shrink-0 text-right text-xs font-medium text-muted-foreground">Network</div>
              <div className="relative flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: hasNetwork ? `${Math.min(networkUsage, 100)}%` : "0%" }} />
              </div>
              <span className="w-9 sm:w-10 shrink-0 text-right text-xs tabular-nums font-medium">{hasNetwork ? `${Math.round(networkUsage)}%` : "N/A"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-2.5">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nodes</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums">{readyNodes}</span>
                <span className="text-xs text-muted-foreground">/ {nodeCount}</span>
              </div>
              <div className="text-xs text-muted-foreground">ready</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pods</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold tabular-nums">{runningPods}</span>
                <span className="text-xs text-muted-foreground">/ {podCount}</span>
              </div>
              <div className="text-xs text-muted-foreground">running</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

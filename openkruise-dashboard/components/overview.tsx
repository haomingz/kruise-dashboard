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

  // Extract metrics with fallback values
  const cpuUsage = metrics?.cpuUsage || 0
  const memoryUsage = metrics?.memoryUsage || 0
  const storageUsage = metrics?.storageUsage || 0
  const networkUsage = metrics?.networkUsage || 0
  const nodeCount = metrics?.totalNodes || 0
  const readyNodes = metrics?.readyNodes || 0
  const podCount = metrics?.totalPods || 0
  const runningPods = metrics?.runningPods || 0

  if (isLoading && !metrics) {
    return (
      <Card className={cn(className)} {...props}>
        <CardHeader>
          <CardTitle>Cluster Overview</CardTitle>
          <CardDescription>Loading cluster metrics…</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="space-y-8">
            <div className="motion-safe:animate-pulse">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center">
                    <div className="mr-2 w-14 h-4 bg-gray-200 rounded"></div>
                    <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div className="flex h-full w-[50%] bg-gray-300" />
                    </div>
                    <span className="ml-2 w-8 h-4 bg-gray-200 rounded"></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn(className)} {...props}>
        <CardHeader>
          <CardTitle>Cluster Overview</CardTitle>
          <CardDescription>Error loading cluster metrics</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="text-red-500 text-sm">Failed to fetch cluster metrics</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader>
        <CardTitle>Cluster Overview</CardTitle>
        <CardDescription>Resource utilization across your Kubernetes cluster</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">CPU</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full bg-primary" style={{ width: `${Math.min(cpuUsage, 100)}%` }} />
              </div>
              <span className="ml-2 text-sm tabular-nums text-muted-foreground">{Math.round(cpuUsage)}%</span>
            </div>
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">Memory</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full bg-primary" style={{ width: `${Math.min(memoryUsage, 100)}%` }} />
              </div>
              <span className="ml-2 text-sm tabular-nums text-muted-foreground">{Math.round(memoryUsage)}%</span>
            </div>
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">Storage</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full bg-primary" style={{ width: `${Math.min(storageUsage, 100)}%` }} />
              </div>
              <span className="ml-2 text-sm tabular-nums text-muted-foreground">{Math.round(storageUsage)}%</span>
            </div>
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">Network</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full bg-primary" style={{ width: `${Math.min(networkUsage, 100)}%` }} />
              </div>
              <span className="ml-2 text-sm tabular-nums text-muted-foreground">{Math.round(networkUsage)}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Nodes</div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Total</div>
                <div className="font-medium tabular-nums">{nodeCount}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Ready</div>
                <div className="font-medium tabular-nums">{readyNodes}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Pods</div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Total</div>
                <div className="font-medium tabular-nums">{podCount}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Running</div>
                <div className="font-medium tabular-nums">{runningPods}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Boxes, Cpu, Database, GitMerge, Loader2, Network, LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { useAllWorkloads } from "../hooks/use-workloads"
import { useActiveRollouts } from "../hooks/use-rollouts"

interface WorkloadStats {
  total: number
  healthy: number
  updating: number
}

interface WorkloadCardConfig {
  key: string
  title: string
  icon: LucideIcon
  getValue: (data: WorkloadData) => number
  getDescription: (data: WorkloadData, formatter: (h: number, u: number, t: string) => string) => string
}

interface WorkloadData {
  clonesets: WorkloadStats
  statefulsets: WorkloadStats
  daemonsets: WorkloadStats
  broadcastjobs: WorkloadStats
  activeRollouts: number
}

const WORKLOAD_CARDS: WorkloadCardConfig[] = [
  {
    key: 'clonesets',
    title: 'CloneSets',
    icon: Boxes,
    getValue: (data) => data.clonesets.total,
    getDescription: (data, formatter) => formatter(data.clonesets.healthy, data.clonesets.updating, 'clonesets'),
  },
  {
    key: 'statefulsets',
    title: 'Advanced StatefulSets',
    icon: Database,
    getValue: (data) => data.statefulsets.total,
    getDescription: (data, formatter) => formatter(data.statefulsets.healthy, data.statefulsets.updating, 'statefulsets'),
  },
  {
    key: 'daemonsets',
    title: 'Advanced DaemonSets',
    icon: Cpu,
    getValue: (data) => data.daemonsets.total,
    getDescription: (data, formatter) => formatter(data.daemonsets.healthy, data.daemonsets.updating, 'daemonsets'),
  },
  {
    key: 'broadcastjobs',
    title: 'BroadcastJobs',
    icon: Network,
    getValue: (data) => data.broadcastjobs.total,
    getDescription: (data, formatter) => formatter(data.broadcastjobs.healthy, data.broadcastjobs.updating, 'broadcastjobs'),
  },
  {
    key: 'rollouts',
    title: 'Active Rollouts',
    icon: GitMerge,
    getValue: (data) => data.activeRollouts,
    getDescription: () => 'Progressive delivery in progress'
  }
]

interface WorkloadCardProps {
  config: WorkloadCardConfig
  data: WorkloadData
  formatStatusText: (healthy: number, updating: number, workloadType: string) => string
}

function WorkloadCard({ config, data, formatStatusText }: Readonly<WorkloadCardProps>) {
  const Icon = config.icon

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{config.getValue(data)}</div>
        <p className="text-xs text-muted-foreground">
          {config.getDescription(data, formatStatusText)}
        </p>
      </CardContent>
    </Card>
  )
}

function calculateWorkloadStats(workloads: Record<string, unknown>[]): WorkloadStats {
  if (!workloads || workloads.length === 0) {
    return { total: 0, healthy: 0, updating: 0 }
  }

  // Filter out error objects returned when CRDs are not installed
  const validWorkloads = workloads.filter((w) => !w.error && w.metadata)
  if (validWorkloads.length === 0) {
    return { total: 0, healthy: 0, updating: 0 }
  }

  let healthy = 0
  let updating = 0

  validWorkloads.forEach((workload: Record<string, unknown>) => {
    const spec = (workload.spec as Record<string, unknown>) || {}
    const status = (workload.status as Record<string, unknown>) || {}

    const desiredReplicas = (spec.replicas as number) || 0
    const readyReplicas = (status.readyReplicas as number) || 0
    const updatedReplicas = (status.updatedReplicas as number) || 0

    const isFullyReady = readyReplicas === desiredReplicas
    const isFullyUpdated = updatedReplicas === desiredReplicas

    if (isFullyReady && isFullyUpdated) {
      healthy++
    } else {
      updating++
    }
  })

  return { total: validWorkloads.length, healthy, updating }
}

export function WorkloadCards() {
  const { data: workloads, isLoading: workloadLoading } = useAllWorkloads()
  const { data: rollouts, isLoading: rolloutLoading } = useActiveRollouts()

  const loading = workloadLoading || rolloutLoading

  const workloadData: WorkloadData | null = useMemo(() => {
    if (!workloads) return null

    return {
      clonesets: calculateWorkloadStats(workloads.clonesets || []),
      statefulsets: calculateWorkloadStats(workloads.statefulsets || []),
      daemonsets: calculateWorkloadStats(workloads.daemonsets || []),
      broadcastjobs: calculateWorkloadStats(workloads.broadcastjobs || []),
      activeRollouts: rollouts?.length || 0
    }
  }, [workloads, rollouts])

  const formatStatusText = (healthy: number, updating: number, workloadType: string): string => {
    if (workloadType === 'broadcastjobs') {
      return `${healthy} completed, ${updating} running`
    }

    if (updating === 0) {
      return `${healthy} healthy`
    }

    return `${healthy} healthy, ${updating} updating`
  }

  if (loading && !workloadData) {
    return (
      <>
        {WORKLOAD_CARDS.map((cardConfig) => (
          <Card key={cardConfig.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-20 bg-gray-200 rounded motion-safe:animate-pulse"></div>
              </CardTitle>
              <>
                <Loader2 className="h-4 w-4 text-muted-foreground motion-safe:animate-spin" aria-label="Loading workload data" />
                <span className="sr-only">Loading…</span>
              </>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-8 bg-gray-200 rounded motion-safe:animate-pulse mb-2"></div>
              <div className="h-3 w-24 bg-gray-200 rounded motion-safe:animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  if (!workloadData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500 text-sm">Failed to load workload data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {WORKLOAD_CARDS.map((cardConfig) => (
        <WorkloadCard
          key={cardConfig.key}
          config={cardConfig}
          data={workloadData}
          formatStatusText={formatStatusText}
        />
      ))}
    </>
  )
}

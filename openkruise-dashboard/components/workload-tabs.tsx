"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateAge } from "@/lib/utils"
import { useMemo } from "react"
import { useAllWorkloads } from "../hooks/use-workloads"
import { TransformedWorkload, WorkloadTable } from "./workload-table"

interface WorkloadState {
  clonesets: TransformedWorkload[]
  statefulsets: TransformedWorkload[]
  daemonsets: TransformedWorkload[]
  sidecars: TransformedWorkload[]
  broadcastjobs: TransformedWorkload[]
  advancedcronjobs: TransformedWorkload[]
}

const INITIAL_STATE: WorkloadState = {
  clonesets: [],
  statefulsets: [],
  daemonsets: [],
  sidecars: [],
  broadcastjobs: [],
  advancedcronjobs: [],
}

// Helper function to determine status from workload
function getWorkloadStatus(workload: Record<string, unknown>): string {
  const spec = (workload.spec as Record<string, unknown>) || {}
  const status = (workload.status as Record<string, unknown>) || {}

  const desiredReplicas = (spec.replicas as number) || 0
  const currentReplicas = (status.replicas as number) || 0
  const readyReplicas = (status.readyReplicas as number) || 0

  if (readyReplicas === desiredReplicas && currentReplicas === desiredReplicas) {
    return 'Healthy'
  } else if (readyReplicas === 0) {
    return 'Failed'
  } else {
    return 'Updating'
  }
}

// Transform Kubernetes workload objects to our interface
function transformWorkloadData(workloads: Record<string, unknown>[], workloadType: string): TransformedWorkload[] {
  if (!Array.isArray(workloads)) return []

  return workloads
    .filter((workload) => !workload.error && workload.metadata)
    .map((workload) => {
    const metadata = (workload.metadata as Record<string, unknown>) || {}
    const spec = (workload.spec as Record<string, unknown>) || {}
    const status = (workload.status as Record<string, unknown>) || {}

    const desiredReplicas = (spec.replicas as number) || 0
    const readyReplicas = (status.readyReplicas as number) || 0
    const image = ((((spec.template as Record<string, unknown>)?.spec as Record<string, unknown>)?.containers as Record<string, unknown>[])?.[0] as Record<string, unknown>)?.image as string || 'N/A'

    return {
      name: (metadata.name as string) || 'Unknown',
      namespace: (metadata.namespace as string) || 'default',
      replicas: `${readyReplicas}/${desiredReplicas}`,
      status: getWorkloadStatus(workload),
      updateStrategy: ((spec.updateStrategy as Record<string, unknown>)?.type as string) || 'In-place',
      age: calculateAge(metadata.creationTimestamp as string),
      image,
      workloadType
    }
  })
}

interface TabConfig {
  key: string
  label: string
  shortLabel: string
  title: string
  description: string
  showImage?: boolean
}

const TAB_CONFIGS: TabConfig[] = [
  { key: 'clonesets', label: 'CloneSets', shortLabel: 'CloneSets', title: 'CloneSets', description: 'Enhanced workload for stateless applications with advanced features' },
  { key: 'statefulsets', label: 'Advanced StatefulSets', shortLabel: 'StatefulSets', title: 'Advanced StatefulSets', description: 'Advanced StatefulSets with enhanced capabilities for stateful applications' },
  { key: 'daemonsets', label: 'Advanced DaemonSets', shortLabel: 'DaemonSets', title: 'Advanced DaemonSets', description: 'Advanced DaemonSets with enhanced node-level workload management' },
  { key: 'sidecars', label: 'SidecarSets', shortLabel: 'Sidecars', title: 'SidecarSets', description: 'Manage sidecar containers across multiple pods with in-place update capabilities' },
  { key: 'broadcastjobs', label: 'BroadcastJobs', shortLabel: 'BCJobs', title: 'BroadcastJobs', description: 'Jobs that run on all or selected nodes in the cluster' },
  { key: 'advancedcronjobs', label: 'Advanced CronJobs', shortLabel: 'CronJobs', title: 'Advanced CronJobs', description: 'Enhanced CronJobs with advanced scheduling and lifecycle management', showImage: false },
]

export function WorkloadTabs() {
  const { data: rawData, error, isLoading } = useAllWorkloads()

  // Transform data in render phase using useMemo
  const workloads: WorkloadState = useMemo(() => {
    if (!rawData) return INITIAL_STATE

    return {
      clonesets: transformWorkloadData(rawData.clonesets || [], 'cloneset'),
      statefulsets: transformWorkloadData(rawData.statefulsets || [], 'statefulset'),
      daemonsets: transformWorkloadData(rawData.daemonsets || [], 'daemonset'),
      sidecars: [],
      broadcastjobs: transformWorkloadData(rawData.broadcastjobs || [], 'broadcastjob'),
      advancedcronjobs: transformWorkloadData(rawData.advancedcronjobs || [], 'advancedcronjob'),
    }
  }, [rawData])

  if (error && !isLoading) {
    return (
      <Card className="gap-2 py-3">
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-red-500 text-sm">Failed to fetch workload data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="clonesets" className="space-y-3 min-w-0">
      <TabsList className="flex-nowrap">
        {TAB_CONFIGS.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} className="shrink-0">
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {' '}(<span className="tabular-nums">{workloads[tab.key as keyof WorkloadState].length}</span>)
          </TabsTrigger>
        ))}
      </TabsList>

      {TAB_CONFIGS.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="space-y-0 min-w-0">
          <Card className="min-w-0 gap-3 py-4">
            <CardHeader className="p-0 px-4 pt-0 pb-1">
              <CardTitle className="text-base sm:text-lg">{tab.title}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{tab.description}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <WorkloadTable
                workloadList={workloads[tab.key as keyof WorkloadState]}
                type={tab.label}
                showImage={tab.showImage}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}

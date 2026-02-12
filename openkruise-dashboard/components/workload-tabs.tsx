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
  title: string
  description: string
  showImage?: boolean
}

const TAB_CONFIGS: TabConfig[] = [
  { key: 'clonesets', label: 'CloneSets', title: 'CloneSets', description: 'Enhanced workload for stateless applications with advanced features' },
  { key: 'statefulsets', label: 'Advanced StatefulSets', title: 'Advanced StatefulSets', description: 'Advanced StatefulSets with enhanced capabilities for stateful applications' },
  { key: 'daemonsets', label: 'Advanced DaemonSets', title: 'Advanced DaemonSets', description: 'Advanced DaemonSets with enhanced node-level workload management' },
  { key: 'sidecars', label: 'SidecarSets', title: 'SidecarSets', description: 'Manage sidecar containers across multiple pods with in-place update capabilities' },
  { key: 'broadcastjobs', label: 'BroadcastJobs', title: 'BroadcastJobs', description: 'Jobs that run on all or selected nodes in the cluster' },
  { key: 'advancedcronjobs', label: 'Advanced CronJobs', title: 'Advanced CronJobs', description: 'Enhanced CronJobs with advanced scheduling and lifecycle management', showImage: false },
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
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500 text-sm">Failed to fetch workload data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="clonesets" className="space-y-4">
      <TabsList>
        {TAB_CONFIGS.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label} (<span className="tabular-nums">{workloads[tab.key as keyof WorkloadState].length}</span>)
          </TabsTrigger>
        ))}
      </TabsList>

      {TAB_CONFIGS.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tab.title}</CardTitle>
              <CardDescription>{tab.description}</CardDescription>
            </CardHeader>
            <CardContent>
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

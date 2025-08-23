"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, Clock, ExternalLink, Loader2, RefreshCw, XCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { listAllWorkloads } from "../api/workload"

// Enhanced workload interface to match API response
interface TransformedWorkload {
  name: string
  namespace: string
  replicas: string
  status: string
  updateStrategy: string
  age: string
  image?: string
  workloadType: string
}

export function WorkloadTabs() {
  const [workloads, setWorkloads] = useState<{
    clonesets: TransformedWorkload[]
    statefulsets: TransformedWorkload[]
    daemonsets: TransformedWorkload[]
    sidecars: TransformedWorkload[]
    broadcastjobs: TransformedWorkload[]
    advancedcronjobs: TransformedWorkload[]
  }>({
    clonesets: [],
    statefulsets: [],
    daemonsets: [],
    sidecars: [],
    broadcastjobs: [],
    advancedcronjobs: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to calculate age from timestamp
  const calculateAge = (creationTimestamp?: string): string => {
    if (!creationTimestamp) return 'Unknown'

    const created = new Date(creationTimestamp)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays > 0) {
      return `${diffDays}d`
    } else if (diffHours > 0) {
      return `${diffHours}h`
    } else {
      return '<1h'
    }
  }

  // Helper function to determine status from workload
  const getWorkloadStatus = (workload: any): string => {
    const spec = workload.spec || {}
    const status = workload.status || {}

    const desiredReplicas = spec.replicas || 0
    const currentReplicas = status.replicas || 0
    const readyReplicas = status.readyReplicas || 0

    if (readyReplicas === desiredReplicas && currentReplicas === desiredReplicas) {
      return 'Healthy'
    } else if (readyReplicas === 0) {
      return 'Failed'
    } else {
      return 'Updating'
    }
  }

  // Transform Kubernetes workload objects to our interface
  const transformWorkloadData = (workloads: any[], workloadType: string): TransformedWorkload[] => {
    if (!Array.isArray(workloads)) return []

    return workloads.map((workload) => {
      const metadata = workload.metadata || {}
      const spec = workload.spec || {}
      const status = workload.status || {}

      const desiredReplicas = spec.replicas || 0
      const readyReplicas = status.readyReplicas || 0
      const image = spec.template?.spec?.containers?.[0]?.image || 'N/A'

      return {
        name: metadata.name || 'Unknown',
        namespace: metadata.namespace || 'default',
        replicas: `${readyReplicas}/${desiredReplicas}`,
        status: getWorkloadStatus(workload),
        updateStrategy: spec.updateStrategy?.type || 'In-place',
        age: calculateAge(metadata.creationTimestamp),
        image,
        workloadType
      }
    })
  }

  useEffect(() => {
    const fetchWorkloads = async () => {
      try {
        setLoading(true)

        const response = await listAllWorkloads('default')

        // Transform the workload data properly
        setWorkloads({
          clonesets: transformWorkloadData(response.clonesets || [], 'cloneset'),
          statefulsets: transformWorkloadData(response.statefulsets || [], 'statefulset'),
          daemonsets: transformWorkloadData(response.daemonsets || [], 'daemonset'),
          sidecars: transformWorkloadData(response.sidecarsets || [], 'sidecarset'),
          broadcastjobs: transformWorkloadData(response.broadcastjobs || [], 'broadcastjob'),
          advancedcronjobs: transformWorkloadData(response.advancedcronjobs || [], 'advancedcronjob')
        })
        setError(null)
      } catch (err) {
        console.error('Error fetching workloads:', err)
        setError('Failed to fetch workload data')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkloads()
    const interval = setInterval(fetchWorkloads, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy':
        return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
      case 'Updating':
        return <RefreshCw className="mr-2 h-4 w-4 text-amber-500 animate-spin" />
      case 'Failed':
        return <XCircle className="mr-2 h-4 w-4 text-red-500" />
      default:
        return <Clock className="mr-2 h-4 w-4 text-amber-500" />
    }
  }

  const renderWorkloadTable = (workloadList: TransformedWorkload[], type: string, showImage: boolean = true) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading {type}...</span>
        </div>
      )
    }

    if (workloadList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {type} found in the default namespace
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Namespace</TableHead>
            <TableHead>Replicas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Update Strategy</TableHead>
            {showImage && <TableHead>Image</TableHead>}
            <TableHead>Age</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workloadList.map((workload, index) => (
            <TableRow key={`${workload.name}-${index}`}>
              <TableCell className="font-medium">
                <Link
                  href={`/workloads/${workload.workloadType}-${workload.namespace}-${workload.name}`}
                  className="text-primary hover:underline"
                >
                  {workload.name}
                </Link>
              </TableCell>
              <TableCell>{workload.namespace}</TableCell>
              <TableCell>{workload.replicas}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {getStatusIcon(workload.status)}
                  {workload.status}
                </div>
              </TableCell>
              <TableCell>{workload.updateStrategy}</TableCell>
              {showImage && <TableCell className="max-w-xs truncate" title={workload.image}>{workload.image}</TableCell>}
              <TableCell>{workload.age}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/workloads/${workload.workloadType}-${workload.namespace}-${workload.name}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }



  if (error && !loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-red-500 text-sm">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="clonesets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="clonesets">CloneSets ({workloads.clonesets.length})</TabsTrigger>
        <TabsTrigger value="statefulsets">Advanced StatefulSets ({workloads.statefulsets.length})</TabsTrigger>
        <TabsTrigger value="daemonsets">Advanced DaemonSets ({workloads.daemonsets.length})</TabsTrigger>
        <TabsTrigger value="sidecars">SidecarSets ({workloads.sidecars.length})</TabsTrigger>
        <TabsTrigger value="broadcastjobs">BroadcastJobs ({workloads.broadcastjobs.length})</TabsTrigger>
        <TabsTrigger value="advancedcronjobs">Advanced CronJobs ({workloads.advancedcronjobs.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="clonesets" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>CloneSets</CardTitle>
            <CardDescription>Enhanced workload for stateless applications with advanced features</CardDescription>
          </CardHeader>
          <CardContent>
            {renderWorkloadTable(workloads.clonesets, 'CloneSets')}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="statefulsets" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced StatefulSets</CardTitle>
            <CardDescription>Advanced StatefulSets with enhanced capabilities for stateful applications</CardDescription>
          </CardHeader>
          <CardContent>
            {renderWorkloadTable(workloads.statefulsets, 'StatefulSets')}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="daemonsets" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced DaemonSets</CardTitle>
            <CardDescription>
              Advanced DaemonSets with enhanced node-level workload management
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderWorkloadTable(workloads.daemonsets, 'DaemonSets')}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sidecars" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>SidecarSets</CardTitle>
            <CardDescription>
              Manage sidecar containers across multiple pods with in-place update capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderWorkloadTable(workloads.sidecars, 'SidecarSets')}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="broadcastjobs" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>BroadcastJobs</CardTitle>
            <CardDescription>
              Jobs that run on all or selected nodes in the cluster
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderWorkloadTable(workloads.broadcastjobs, 'BroadcastJobs')}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="advancedcronjobs" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced CronJobs</CardTitle>
            <CardDescription>
              Enhanced CronJobs with advanced scheduling and lifecycle management
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderWorkloadTable(workloads.advancedcronjobs, 'Advanced CronJobs', false)}
          </CardContent>
        </Card>
      </TabsContent>


    </Tabs>
  )
}
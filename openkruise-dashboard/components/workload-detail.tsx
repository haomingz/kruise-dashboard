"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  Clock,
  Code,
  CpuIcon,
  Edit,
  ExternalLink,
  HardDrive,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Server,
  Trash2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useEffect, useState } from "react"
import { getWorkloadWithPods } from "../api/workload"
import { useParams } from "next/navigation"


interface PodData {
  name: string
  status: string
  restarts: number
  age: string
  ip: string
  node: string
}

export function WorkloadDetail() {
  const params = useParams()
  const workloadId = Array.isArray(params.id) ? params.id.join('-') : params.id || ''

  const [workloadData, setWorkloadData] = useState<any>(null)
  const [podsData, setPodsData] = useState<PodData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Parse workloadId to extract type, namespace, and name
  const parseWorkloadId = (id: string) => {
    const parts = id.split('-')
    if (parts.length < 3) {
      throw new Error('Invalid workload ID format')
    }
    const type = parts[0]
    const namespace = parts[1]
    const name = parts.slice(2).join('-')
    return { type, namespace, name }
  }

  useEffect(() => {
    const fetchWorkloadData = async () => {
      try {
        setLoading(true)
        const { type, namespace, name } = parseWorkloadId(workloadId)
        const response = await getWorkloadWithPods(namespace, type, name)
        setWorkloadData(response.workload)
        
        // Transform pods data
        const transformedPods = (response.pods || []).map((pod: any) => {
          const metadata = pod.metadata || {}
          const status = pod.status || {}
          const spec = pod.spec || {}

          // Calculate restart count
          const containerStatuses = status.containerStatuses || []
          const restartCount = containerStatuses.reduce((total: number, container: any) => {
            return total + (container.restartCount || 0)
          }, 0)

          return {
            name: metadata.name || 'Unknown',
            status: status.phase || 'Unknown',
            restarts: restartCount,
            age: calculateAge(metadata.creationTimestamp),
            ip: status.podIP || 'N/A',
            node: spec.nodeName || 'N/A',
          }
        })
        
        setPodsData(transformedPods)
        setError(null)
      } catch (err) {
        console.error('Error fetching workload data:', err)
        setError('Failed to fetch workload data')
      } finally {
        setLoading(false)
      }
    }

    if (workloadId) {
      fetchWorkloadData()
    }
  }, [workloadId])

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

  // Helper function to determine workload status
  const getWorkloadStatus = () => {
    if (!workloadData || !workloadData.status) {
      return { icon: <RefreshCw className="mr-2 h-5 w-5 text-amber-500 animate-spin" />, text: 'Loading' }
    }

    const spec = workloadData.spec || {}
    const status = workloadData.status || {}

    const desiredReplicas = spec.replicas || 0
    const readyReplicas = status.readyReplicas || 0
    const replicas = status.replicas || 0

    if (readyReplicas === desiredReplicas && replicas === desiredReplicas) {
      return { icon: <CheckCircle className="mr-2 h-5 w-5 text-green-500" />, text: 'Healthy' }
    } else if (readyReplicas === 0) {
      return { icon: <XCircle className="mr-2 h-5 w-5 text-red-500" />, text: 'Failed' }
    } else {
      return { icon: <RefreshCw className="mr-2 h-5 w-5 text-amber-500 animate-spin" />, text: 'Updating' }
    }
  }

  // Helper function to get pod status icon
  const getPodStatusIcon = (status: string) => {
    switch (status) {
      case 'Running':
        return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
      case 'Pending':
        return <Clock className="mr-2 h-4 w-4 text-amber-500" />
      case 'Failed':
        return <XCircle className="mr-2 h-4 w-4 text-red-500" />
      case 'Succeeded':
        return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
      default:
        return <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading workload details...</span>
        </div>
      </div>
    )
  }

  if (error || !workloadData) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-500 text-sm">{error || 'Failed to load workload data'}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const metadata = workloadData.metadata || {}
  const spec = workloadData.spec || {}
  const status = workloadData.status || {}
  const { type } = parseWorkloadId(workloadId)

  const desiredReplicas = spec.replicas || 0
  const readyReplicas = status.readyReplicas || 0
  const workloadStatus = getWorkloadStatus()

  // Get container info for display
  const containers = spec.template?.spec?.containers || []
  const primaryContainer = containers[0] || {}

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {type.charAt(0).toUpperCase() + type.slice(1)}: {metadata.name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Namespace: {metadata.namespace}</span>
            <span>•</span>
            <span>Created {calculateAge(metadata.creationTimestamp)} ago</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Scale
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Code className="mr-2 h-4 w-4" />
                View YAML
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {workloadStatus.icon}
              <span className="font-medium">{workloadStatus.text}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Replicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{readyReplicas}/{desiredReplicas}</span>
              <Badge variant="outline">
                {Math.round((readyReplicas / Math.max(desiredReplicas, 1)) * 100)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Update Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge>{spec.updateStrategy?.type || 'Unknown'}</Badge>
              {spec.updateStrategy?.partition !== undefined && (
                <Badge variant="outline">Partition: {spec.updateStrategy.partition}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pods">Pods ({podsData.length})</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workload Specifications</CardTitle>
              <CardDescription>Basic configuration and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-medium">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="text-sm">{metadata.name}</div>
                      <div className="text-sm text-muted-foreground">Namespace</div>
                      <div className="text-sm">{metadata.namespace}</div>
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div className="text-sm">{metadata.creationTimestamp || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">UID</div>
                      <div className="text-sm">{metadata.uid || 'Unknown'}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 font-medium">Scaling</h3>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Desired Replicas</div>
                      <div className="text-sm">{desiredReplicas}</div>
                      <div className="text-sm text-muted-foreground">Ready Replicas</div>
                      <div className="text-sm">{readyReplicas}</div>
                      <div className="text-sm text-muted-foreground">Current Replicas</div>
                      <div className="text-sm">{status.replicas || 0}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-medium">Update Strategy</h3>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div className="text-sm">
                        <Badge>{spec.updateStrategy?.type || 'Unknown'}</Badge>
                      </div>
                      {spec.updateStrategy?.partition !== undefined && (
                        <>
                          <div className="text-sm text-muted-foreground">Partition</div>
                          <div className="text-sm">{spec.updateStrategy.partition}</div>
                        </>
                      )}
                      {spec.updateStrategy?.maxUnavailable && (
                        <>
                          <div className="text-sm text-muted-foreground">Max Unavailable</div>
                          <div className="text-sm">{spec.updateStrategy.maxUnavailable}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 font-medium">Selector</h3>
                    <div className="rounded-lg border p-3">
                      <div className="mb-2 text-sm text-muted-foreground">Match Labels</div>
                      <div className="flex flex-wrap gap-2">
                        {spec.selector?.matchLabels && Object.entries(spec.selector.matchLabels).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}={value as string}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {primaryContainer && (
            <Card>
              <CardHeader>
                <CardTitle>Container Specifications</CardTitle>
                <CardDescription>Container images and configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <Collapsible className="space-y-2">
                  <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                    <div className="flex items-center space-x-4">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium leading-none">{primaryContainer.name}</p>
                        <p className="text-sm text-muted-foreground">{primaryContainer.image}</p>
                      </div>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        <ChevronDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="space-y-2">
                    {primaryContainer.env && primaryContainer.env.length > 0 && (
                      <div className="rounded-md border px-4 py-3 text-sm">
                        <div className="font-medium">Environment Variables</div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {primaryContainer.env.map((env: any, index: number) => (
                            <>
                              <div key={`key-${index}`} className="text-muted-foreground">{env.name}</div>
                              <div key={`value-${index}`}>{env.value || env.valueFrom ? '[Reference]' : 'N/A'}</div>
                            </>
                          ))}
                        </div>
                      </div>
                    )}
                    {primaryContainer.resources && (
                      <div className="rounded-md border px-4 py-3 text-sm">
                        <div className="font-medium">Resource Requests & Limits</div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <div></div>
                          <div className="text-muted-foreground">Requests</div>
                          <div className="text-muted-foreground">Limits</div>
                          <div className="text-muted-foreground">CPU</div>
                          <div>{primaryContainer.resources.requests?.cpu || 'N/A'}</div>
                          <div>{primaryContainer.resources.limits?.cpu || 'N/A'}</div>
                          <div className="text-muted-foreground">Memory</div>
                          <div>{primaryContainer.resources.requests?.memory || 'N/A'}</div>
                          <div>{primaryContainer.resources.limits?.memory || 'N/A'}</div>
                        </div>
                      </div>
                    )}
                    {primaryContainer.ports && primaryContainer.ports.length > 0 && (
                      <div className="rounded-md border px-4 py-3 text-sm">
                        <div className="font-medium">Ports</div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <div className="text-muted-foreground">Name</div>
                          <div className="text-muted-foreground">Container Port</div>
                          <div className="text-muted-foreground">Protocol</div>
                          {primaryContainer.ports.map((port: any, index: number) => (
                            <>
                              <div key={`name-${index}`}>{port.name || 'N/A'}</div>
                              <div key={`port-${index}`}>{port.containerPort}</div>
                              <div key={`protocol-${index}`}>{port.protocol}</div>
                            </>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Managed Pods</CardTitle>
              <CardDescription>Pods managed by this {type}</CardDescription>
            </CardHeader>
            <CardContent>
              {podsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pods found for this workload
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Restarts</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Node</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {podsData.map((pod, index) => (
                      <TableRow key={`${pod.name}-${index}`}>
                        <TableCell className="font-medium">{pod.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getPodStatusIcon(pod.status)}
                            {pod.status}
                          </div>
                        </TableCell>
                        <TableCell>{pod.restarts}</TableCell>
                        <TableCell>{pod.age}</TableCell>
                        <TableCell>{pod.ip}</TableCell>
                        <TableCell>{pod.node}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yaml" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>YAML Configuration</CardTitle>
              <CardDescription>Raw YAML configuration for this {type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Button variant="outline" size="sm" className="absolute right-2 top-2 z-10">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Editor
                </Button>
                <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted p-4 text-sm">
                  {JSON.stringify(workloadData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
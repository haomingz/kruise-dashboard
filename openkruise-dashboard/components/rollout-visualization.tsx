"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, CheckCircle, ExternalLink, Loader2, RefreshCw, Server, XCircle } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { listAllRollouts } from "../api/rollout"
import { useNamespace } from "../hooks/use-namespace"

interface RolloutStep {
  traffic?: string | number
  replicas?: string | number
  pause?: boolean
}

interface RolloutData {
  name: string
  namespace: string
  strategy: string
  status: string
  phase: string
  currentStep: number
  totalSteps: number
  canaryReplicas: number
  stableReplicas: number
  age: string
  workloadRef: string
  displayStep: number
  isCompleted: boolean
  progressPct: number
  trafficPercent: number
}

export function RolloutVisualization() {
  const { namespace } = useNamespace()
  const [rollouts, setRollouts] = useState<RolloutData[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)

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

  const transformRolloutData = useCallback((rollouts: Record<string, unknown>[]): RolloutData[] => {
    return rollouts.map((rollout) => {
      const metadata = (rollout.metadata as Record<string, unknown>) || {}
      const spec = (rollout.spec as Record<string, unknown>) || {}
      const status = (rollout.status as Record<string, unknown>) || {}
      const canaryStatus = (status.canaryStatus as Record<string, unknown>) || {}

      let strategy = 'Unknown'
      const specStrategy = spec.strategy as Record<string, unknown>
      if (specStrategy?.canary) {
        strategy = 'Canary'
      } else if (specStrategy?.blueGreen) {
        strategy = 'Blue-Green'
      }

      let steps: RolloutStep[] = []
      let totalSteps = 0
      let stepIndex = 0
      let isCompleted = false
      let displayStep = 0
      let progressPct = 0
      let trafficPercent = 0

      if (specStrategy?.canary) {
        const canaryStrategy = specStrategy.canary as Record<string, unknown>
        steps = (canaryStrategy.steps as RolloutStep[]) || []
        totalSteps = steps.length
        stepIndex = (canaryStatus.currentStepIndex as number) || 0
        isCompleted = totalSteps > 0 && stepIndex >= totalSteps
        displayStep = totalSteps === 0 ? 0 : (isCompleted ? totalSteps : stepIndex + 1)
        progressPct = totalSteps === 0 ? 0 : Math.min(100, Math.round((displayStep / totalSteps) * 100))

        if (totalSteps > 0 && stepIndex < steps.length) {
          const currentStep = steps[stepIndex]
          if (currentStep?.traffic) {
            const trafficValue = currentStep.traffic
            if (typeof trafficValue === 'string') {
              trafficPercent = parseInt(trafficValue.replace('%', ''), 10) || 0
            } else if (typeof trafficValue === 'number') {
              trafficPercent = trafficValue
            }
          }
        }

        if (isCompleted) {
          trafficPercent = 100
        }
      } else if (specStrategy?.blueGreen) {
        const blueGreenStrategy = specStrategy.blueGreen as Record<string, unknown>
        steps = (blueGreenStrategy.steps as RolloutStep[]) || []
        totalSteps = steps.length
        const blueGreenStatus = (status.blueGreenStatus as Record<string, unknown>) || {}
        stepIndex = (blueGreenStatus.currentStepIndex as number) || 0
        isCompleted = totalSteps > 0 && stepIndex >= totalSteps
        displayStep = totalSteps === 0 ? 0 : (isCompleted ? totalSteps : stepIndex + 1)
        progressPct = totalSteps === 0 ? 0 : Math.min(100, Math.round((displayStep / totalSteps) * 100))

        if (totalSteps > 0 && stepIndex < steps.length) {
          const currentStep = steps[stepIndex]
          if (currentStep?.traffic) {
            const trafficValue = currentStep.traffic
            if (typeof trafficValue === 'string') {
              trafficPercent = parseInt(trafficValue.replace('%', ''), 10) || 0
            } else if (typeof trafficValue === 'number') {
              trafficPercent = trafficValue
            }
          }
        }
      }

      return {
        name: (metadata.name as string) || 'Unknown',
        namespace: (metadata.namespace as string) || 'default',
        strategy,
        status: (status.phase as string) || 'Unknown',
        phase: (status.phase as string) || 'Unknown',
        currentStep: stepIndex,
        totalSteps,
        canaryReplicas: (canaryStatus.canaryReplicas as number) || 0,
        stableReplicas: (canaryStatus.stableReplicas as number) || 0,
        age: calculateAge(metadata.creationTimestamp as string),
        workloadRef: ((spec.workloadRef as Record<string, unknown>)?.name as string) || 'Unknown',
        displayStep,
        isCompleted,
        progressPct,
        trafficPercent
      }
    })
  }, [])

  useEffect(() => {
    const fetchRollouts = async () => {
      try {
        setLoading(true)
        const response = await listAllRollouts(namespace)
        const transformedData = transformRolloutData(response.rollouts || [])
        setRollouts(transformedData)
        setError(null)
      } catch (err) {
        console.error('Error fetching rollouts:', err)
        setError('Failed to fetch rollout data')
      } finally {
        setLoading(false)
      }
    }

    fetchRollouts()
    const interval = setInterval(fetchRollouts, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [namespace, transformRolloutData])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy':
        return <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
      case 'Progressing':
        return <RefreshCw className="mr-2 h-4 w-4 text-amber-500 animate-spin" />
      case 'Failed':
        return <XCircle className="mr-2 h-4 w-4 text-red-500" />
      default:
        return <CheckCircle className="mr-2 h-4 w-4 text-gray-500" />
    }
  }

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case 'Canary':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Canary</Badge>
      case 'Blue-Green':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Blue-Green</Badge>
      default:
        return <Badge variant="outline">{strategy}</Badge>
    }
  }

  const renderRolloutTable = () => {
    if (loading) {
      return (
        <div className="fex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading rollout visualization" />
          <span className="sr-only">Loading rollout visualization...</span>
          <span className="ml-2">Loading rollouts...</span>
        </div>
      )
    }

    if (rollouts.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No rollouts found in namespace &quot;{namespace}&quot;
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Strategy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Replicas</TableHead>
            <TableHead>Workload</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rollouts.map((rollout, index) => (
            <TableRow key={`${rollout.name}-${index}`}>
              <TableCell className="font-medium">
                <Link
                  href={`/rollouts/${rollout.namespace}/${rollout.name}`}
                  className="text-primary hover:underline"
                >
                  {rollout.name}
                </Link>
              </TableCell>
              <TableCell>{getStrategyBadge(rollout.strategy)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {getStatusIcon(rollout.status)}
                  {rollout.status}
                </div>
              </TableCell>
              <TableCell>
                {rollout.strategy === 'Canary' || rollout.strategy === 'Blue-Green' ? (
                  <div className="flex items-center gap-2">
                    {rollout.isCompleted ? (
                      <span className="text-sm text-green-600 font-medium">Completed</span>
                    ) : (
                      <>
                        <span className="text-sm">
                          {rollout.strategy === 'Blue-Green' ? 'Step' : rollout.strategy === 'Canary' ? 'Step' : 'Batch'} {rollout.displayStep}/{rollout.totalSteps}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${rollout.strategy === 'Blue-Green' ? 'bg-green-600' :
                              rollout.strategy === 'Canary' ? 'bg-blue-600' : 'bg-purple-600'
                              }`}
                            style={{ width: `${rollout.progressPct}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>Canary: {rollout.canaryReplicas}</div>
                  <div>Stable: {rollout.stableReplicas}</div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{rollout.workloadRef}</TableCell>
              <TableCell>{rollout.age}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/rollouts/${rollout.namespace}/${rollout.name}`}>
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

  const canaryRollouts = rollouts.filter(r => r.strategy === 'Canary')
  const blueGreenRollouts = rollouts.filter(r => r.strategy === 'Blue-Green')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollout Visualization</CardTitle>
        <CardDescription>Visual representation of different rollout strategies</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Rollouts ({rollouts.length})</TabsTrigger>
            <TabsTrigger value="canary">Canary ({canaryRollouts.length})</TabsTrigger>
            <TabsTrigger value="bluegreen">Blue-Green ({blueGreenRollouts.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            {renderRolloutTable()}
          </TabsContent>

          <TabsContent value="canary" className="space-y-4">
            {canaryRollouts.length > 0 ? (
              <div className="space-y-4">
                {canaryRollouts.map((rollout, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Canary Deployment</Badge>
                        <span className="text-sm font-medium">{rollout.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Step {rollout.displayStep}/{rollout.totalSteps}</Badge>
                        {getStatusIcon(rollout.status)}
                      </div>
                    </div>
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Traffic Split</span>
                        <span>
                          {100 - rollout.trafficPercent}% stable / {rollout.trafficPercent}% canary
                        </span>
                      </div>
                      <div className="flex h-4 w-full overflow-hidden rounded-full">
                        <div
                          className="flex h-full bg-green-500 items-center justify-center text-[10px] text-white"
                          style={{ width: `${100 - rollout.trafficPercent}%` }}
                        >
                          Stable
                        </div>
                        <div
                          className="flex h-full bg-blue-500 items-center justify-center text-[10px] text-white"
                          style={{ width: `${rollout.trafficPercent}%` }}
                        >
                          Canary
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Replicas — Stable: {rollout.stableReplicas} / Canary: {rollout.canaryReplicas}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No canary rollouts found
              </div>
            )}
          </TabsContent>

          <TabsContent value="bluegreen" className="space-y-4">
            {blueGreenRollouts.length > 0 ? (
              <div className="space-y-4">
                {blueGreenRollouts.map((rollout, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Blue-Green Deployment</Badge>
                        <span className="text-sm font-medium">{rollout.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {rollout.isCompleted ? 'Completed' : `Step ${rollout.displayStep}/${rollout.totalSteps}`}
                        </Badge>
                        {getStatusIcon(rollout.status)}
                      </div>
                    </div>
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Traffic Routing</span>
                        <span>{100 - rollout.trafficPercent}% Blue / {rollout.trafficPercent}% Green</span>
                      </div>
                      <div className="flex h-4 w-full overflow-hidden rounded-full">
                        <div
                          className="flex h-full bg-blue-500 items-center justify-center text-[10px] text-white"
                          style={{ width: `${100 - rollout.trafficPercent}%` }}
                        >
                          Blue (Active)
                        </div>
                        <div
                          className="flex h-full bg-green-500 items-center justify-center text-[10px] text-white"
                          style={{ width: `${rollout.trafficPercent}%` }}
                        >
                          Green
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {rollout.isCompleted ? 'Completed - 100% traffic to Green' : `Step ${rollout.displayStep}/${rollout.totalSteps} - ${rollout.trafficPercent}% traffic to Green`}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium">Blue Environment (Active)</div>
                          <Badge>v1.0</Badge>
                        </div>
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: Math.min(rollout.stableReplicas, 5) }).map((_, i) => (
                              <div
                                key={`blue-${i}`}
                                className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900"
                              >
                                <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium">Green Environment (Ready)</div>
                          <Badge>v1.1</Badge>
                        </div>
                        <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: Math.min(rollout.canaryReplicas, 5) }).map((_, i) => (
                              <div
                                key={`green-${i}`}
                                className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900"
                              >
                                <Server className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-center">
                      <Button className="gap-2" disabled={rollout.isCompleted}>
                        {rollout.isCompleted ? 'Traffic Switched to Green' : 'Switch Traffic to Green'}
                        {!rollout.isCompleted && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No blue-green rollouts found
              </div>
            )}
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  )
}

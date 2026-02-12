"use client"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type TransformedRollout, transformRolloutList } from "@/lib/rollout-utils"
import { ArrowRight, CheckCircle, ExternalLink, Loader2, RefreshCw, Server, XCircle } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { useAllRollouts } from "../hooks/use-rollouts"

function getProgressBarColor(strategy: string): string {
  if (strategy === 'Blue-Green') return 'bg-green-600'
  if (strategy === 'Canary') return 'bg-blue-600'
  return 'bg-purple-600'
}

function StatusIcon({ status }: Readonly<{ status: string }>) {
  switch (status) {
    case 'Healthy':
      return <CheckCircle className="mr-2 h-4 w-4 text-green-500" aria-hidden="true" />
    case 'Progressing':
      return <RefreshCw className="mr-2 h-4 w-4 text-amber-500 motion-safe:animate-spin" aria-hidden="true" />
    case 'Failed':
      return <XCircle className="mr-2 h-4 w-4 text-red-500" aria-hidden="true" />
    default:
      return <CheckCircle className="mr-2 h-4 w-4 text-gray-500" aria-hidden="true" />
  }
}

function StrategyBadge({ strategy }: Readonly<{ strategy: string }>) {
  switch (strategy) {
    case 'Canary':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">Canary</Badge>
    case 'Blue-Green':
      return <Badge variant="outline" className="bg-green-50 text-green-700">Blue-Green</Badge>
    default:
      return <Badge variant="outline">{strategy}</Badge>
  }
}

function RolloutTableRow({ rollout }: Readonly<{ rollout: TransformedRollout }>) {
  const hasProgress = rollout.strategy === 'Canary' || rollout.strategy === 'Blue-Green'

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          href={`/rollouts/${rollout.namespace}/${rollout.name}`}
          className="text-primary hover:underline"
        >
          {rollout.name}
        </Link>
      </TableCell>
      <TableCell><StrategyBadge strategy={rollout.strategy} /></TableCell>
      <TableCell>
        <div className="flex items-center">
          <StatusIcon status={rollout.status} />
          {rollout.status}
        </div>
      </TableCell>
      <TableCell>
        {hasProgress ? (
          <div className="flex items-center gap-2">
            {rollout.isCompleted ? (
              <span className="text-sm text-green-600 font-medium">Completed</span>
            ) : (
              <>
                <span className="text-sm tabular-nums">
                  Step {rollout.displayStep}/{rollout.totalSteps}
                </span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(rollout.strategy)}`}
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
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            View
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

function RolloutTable({ rollouts, loading }: Readonly<{ rollouts: TransformedRollout[]; loading: boolean }>) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 motion-safe:animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading rollout visualization…</span>
        <span className="ml-2">Loading rollouts…</span>
      </div>
    )
  }

  if (rollouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No rollouts found
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
        {rollouts.map((rollout) => (
          <RolloutTableRow key={`${rollout.namespace}-${rollout.name}`} rollout={rollout} />
        ))}
      </TableBody>
    </Table>
  )
}

function CanaryCard({ rollout }: Readonly<{ rollout: TransformedRollout }>) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Canary Deployment</Badge>
          <span className="text-sm font-medium">{rollout.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">Step {rollout.displayStep}/{rollout.totalSteps}</Badge>
          <StatusIcon status={rollout.status} />
        </div>
      </div>
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Traffic Split</span>
          <span className="tabular-nums">
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
          Replicas — Stable: <span className="tabular-nums">{rollout.stableReplicas}</span> / Canary: <span className="tabular-nums">{rollout.canaryReplicas}</span>
        </div>
      </div>
    </div>
  )
}

function BlueGreenCard({ rollout }: Readonly<{ rollout: TransformedRollout }>) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Blue-Green Deployment</Badge>
          <span className="text-sm font-medium">{rollout.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">
            {rollout.isCompleted ? 'Completed' : `Step ${rollout.displayStep}/${rollout.totalSteps}`}
          </Badge>
          <StatusIcon status={rollout.status} />
        </div>
      </div>
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Traffic Routing</span>
          <span className="tabular-nums">{100 - rollout.trafficPercent}% Blue / {rollout.trafficPercent}% Green</span>
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
          {rollout.isCompleted
            ? 'Completed - 100% traffic to Green'
            : `Step ${rollout.displayStep}/${rollout.totalSteps} - ${rollout.trafficPercent}% traffic to Green`}
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
                  key={`blue-${rollout.name}-${i}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900"
                >
                  <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
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
                  key={`green-${rollout.name}-${i}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900"
                >
                  <Server className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center">
        {rollout.isCompleted ? (
          <Button className="gap-2" disabled>
            Traffic Switched to Green
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="gap-2">
                Switch Traffic to Green
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Switch traffic to Green?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will route all traffic from the Blue environment to the Green environment for &quot;{rollout.name}&quot;. Make sure the Green environment is fully ready before proceeding.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Switch Traffic</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

export function RolloutVisualization() {
  const { data: rawData, isLoading: loading } = useAllRollouts()

  const rollouts = useMemo(() => {
    if (!rawData?.rollouts) return []
    return transformRolloutList(rawData.rollouts as Record<string, unknown>[])
  }, [rawData])

  const canaryRollouts = useMemo(() => rollouts.filter(r => r.strategy === 'Canary'), [rollouts])
  const blueGreenRollouts = useMemo(() => rollouts.filter(r => r.strategy === 'Blue-Green'), [rollouts])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollout Visualization</CardTitle>
        <CardDescription>Visual representation of different rollout strategies</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Rollouts (<span className="tabular-nums">{rollouts.length}</span>)</TabsTrigger>
            <TabsTrigger value="canary">Canary (<span className="tabular-nums">{canaryRollouts.length}</span>)</TabsTrigger>
            <TabsTrigger value="bluegreen">Blue-Green (<span className="tabular-nums">{blueGreenRollouts.length}</span>)</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            <RolloutTable rollouts={rollouts} loading={loading} />
          </TabsContent>

          <TabsContent value="canary" className="space-y-4">
            {canaryRollouts.length > 0 ? (
              <div className="space-y-4">
                {canaryRollouts.map((rollout) => (
                  <CanaryCard key={`${rollout.namespace}-${rollout.name}`} rollout={rollout} />
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
                {blueGreenRollouts.map((rollout) => (
                  <BlueGreenCard key={`${rollout.namespace}-${rollout.name}`} rollout={rollout} />
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

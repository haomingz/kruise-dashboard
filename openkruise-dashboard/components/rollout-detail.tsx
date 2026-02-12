"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { transformRolloutDetail } from "@/lib/rollout-utils"
import { ArrowLeft, CheckCircle, Loader2, RefreshCw, Server, XCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useMemo } from "react"
import { useRollout } from "../hooks/use-rollouts"
import type { RolloutStep } from "@/lib/rollout-utils"

function getStepBorderStyle(isCurrentStep: boolean, isCompleted: boolean): string {
    if (isCurrentStep) return 'bg-blue-50 border-blue-200'
    if (isCompleted) return 'bg-green-50 border-green-200'
    return 'bg-gray-50 border-gray-200'
}

function getStepCircleStyle(isCurrentStep: boolean, isCompleted: boolean): string {
    if (isCurrentStep) return 'bg-blue-500 text-white'
    if (isCompleted) return 'bg-green-500 text-white'
    return 'bg-gray-300 text-gray-600'
}

function StepCard({ step, index, currentStep }: Readonly<{ step: RolloutStep; index: number; currentStep: number }>) {
    const isCurrentStep = index === currentStep
    const isCompleted = index < currentStep
    const isPending = index > currentStep

    return (
        <div className={`flex items-center gap-4 p-4 rounded-lg border ${getStepBorderStyle(isCurrentStep, isCompleted)}`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepCircleStyle(isCurrentStep, isCompleted)}`}>
                    {isCompleted ? (
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <span className="text-sm font-medium tabular-nums">{index + 1}</span>
                    )}
                </div>
                <div>
                    <div className="font-medium">Step {index + 1}</div>
                    <div className="text-sm text-muted-foreground">
                        {step.traffic ? `Traffic: ${step.traffic}` : null}
                        {step.replicas ? ` • Replicas: ${step.replicas}` : null}
                        {step.pause ? ' • Pause' : null}
                    </div>
                </div>
            </div>
            <div className="ml-auto">
                {isCurrentStep && <Badge variant="secondary">Current</Badge>}
                {isCompleted && <Badge variant="outline" className="text-green-700">Completed</Badge>}
                {isPending && <Badge variant="outline" className="text-gray-500">Pending</Badge>}
            </div>
        </div>
    )
}

export function RolloutDetail() {
    const params = useParams()
    const router = useRouter()
    const namespace = (Array.isArray(params.namespace) ? params.namespace[0] : params.namespace) || 'default'
    const name = (Array.isArray(params.name) ? params.name[0] : params.name) || ''

    const { data: rawRolloutData, error: fetchError, isLoading: loading } = useRollout(namespace, name)

    const rollout = useMemo(() => {
        if (!rawRolloutData) return null
        return transformRolloutDetail(rawRolloutData as Record<string, unknown>)
    }, [rawRolloutData])

    const error = fetchError ? 'Failed to fetch rollout data' : null

    const getStatusIcon = (status: string) => {
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

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 motion-safe:animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading rollout details…</span>
                <span className="ml-2">Loading rollout details…</span>
            </div>
        )
    }

    if (error || !rollout) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500 mb-4">{error || 'Rollout not found'}</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{rollout.name}</h1>
                        <p className="text-muted-foreground">Rollout in {rollout.namespace} namespace</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getStrategyBadge(rollout.strategy)}
                    {getStatusIcon(rollout.status)}
                    <span className="font-medium">{rollout.status}</span>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="steps">Steps</TabsTrigger>
                    <TabsTrigger value="traffic">Traffic Routing</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Progress Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Current Step</span>
                                        <span className="text-sm tabular-nums">
                                            {rollout.isCompleted ? 'Completed' : `${rollout.displayStep}/${rollout.totalSteps}`}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Progress</span>
                                            <span className="tabular-nums">{rollout.progressPct}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${rollout.strategy === 'Blue-Green' ? 'bg-green-600' : 'bg-blue-600'
                                                    }`}
                                                style={{ width: `${rollout.progressPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Traffic Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Traffic Split</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Current Traffic</span>
                                        <span className="text-sm tabular-nums">{rollout.trafficPercent}%</span>
                                    </div>
                                    <div className="flex h-4 w-full overflow-hidden rounded-full">
                                        <div
                                            className={`flex h-full items-center justify-center text-[10px] text-white ${rollout.strategy === 'Blue-Green' ? 'bg-blue-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${100 - rollout.trafficPercent}%` }}
                                        >
                                            {rollout.strategy === 'Blue-Green' ? 'Blue' : 'Stable'}
                                        </div>
                                        <div
                                            className={`flex h-full items-center justify-center text-[10px] text-white ${rollout.strategy === 'Blue-Green' ? 'bg-green-500' : 'bg-blue-500'
                                                }`}
                                            style={{ width: `${rollout.trafficPercent}%` }}
                                        >
                                            {rollout.strategy === 'Blue-Green' ? 'Green' : 'Canary'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Replicas Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Replicas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Stable</span>
                                        <span className="text-sm font-medium tabular-nums">{rollout.stableReplicas}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">
                                            {rollout.strategy === 'Blue-Green' ? 'Updated' : 'Canary'}
                                        </span>
                                        <span className="text-sm font-medium tabular-nums">{rollout.canaryReplicas}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Workload Reference */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Workload Reference</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <span className="font-medium">{rollout.workloadRef}</span>
                                <Badge variant="outline">Deployment</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="steps" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Rollout Steps</CardTitle>
                            <CardDescription>
                                {rollout.strategy} deployment steps and their current status
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {rollout.steps.map((step, index) => (
                                    <StepCard
                                        key={`step-${step.traffic ?? ''}-${step.replicas ?? ''}-${index}`}
                                        step={step}
                                        index={index}
                                        currentStep={rollout.currentStep}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="traffic" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Traffic Routing Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {rollout.trafficRoutings && rollout.trafficRoutings.length > 0 ? (
                                <div className="space-y-4">
                                    {rollout.trafficRoutings.map((routing) => (
                                        <div key={routing.service} className="p-4 border rounded-lg">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">Service:</span>
                                                    <Badge variant="outline">{routing.service}</Badge>
                                                </div>
                                                {routing.ingress && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Ingress:</span>
                                                        <Badge variant="outline">{routing.ingress.name}</Badge>
                                                        <Badge variant="outline">{routing.ingress.classType}</Badge>
                                                    </div>
                                                )}
                                                {routing.gracePeriodSeconds && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Grace Period:</span>
                                                        <span>{routing.gracePeriodSeconds}s</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No traffic routing configuration found.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Rollout Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Name</span>
                                        <span className="text-sm">{rollout.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Namespace</span>
                                        <span className="text-sm">{rollout.namespace}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Strategy</span>
                                        <span className="text-sm">{rollout.strategy}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Status</span>
                                        <span className="text-sm">{rollout.status}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Age</span>
                                        <span className="text-sm">{rollout.age}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Generation</span>
                                        <span className="text-sm">{rollout.observedGeneration || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">UID</span>
                                        <span className="text-xs font-mono">{rollout.uid?.slice(0, 8)}…</span>
                                    </div>
                                    {rollout.message && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Message</span>
                                            <span className="text-sm text-muted-foreground">{rollout.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

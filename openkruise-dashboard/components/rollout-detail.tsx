"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, CheckCircle, Loader2, RefreshCw, Server, XCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { getRollout } from "../api/rollout"

interface RolloutDetailData {
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
    steps: any[]
    trafficRoutings?: any[]
    message?: string
    observedGeneration?: number
    creationTimestamp?: string
    uid?: string
}

export function RolloutDetail() {
    const params = useParams()
    const router = useRouter()
    const [rollout, setRollout] = useState<RolloutDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const rolloutId = Array.isArray(params.id) ? params.id.join('-') : params.id || ''

    const parseRolloutId = (id: string) => {
        const parts = id.split('-')
        if (parts.length < 3) {
          throw new Error('Invalid rollout ID format')
        }
        const namespace = parts[0]
        const name = parts.slice(1).join('-')
        return { namespace, name }
      }

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

    // Transform rollout data from API response
    const transformRolloutData = (rolloutData: any): RolloutDetailData => {
        const metadata = rolloutData.metadata || {}
        const spec = rolloutData.spec || {}
        const status = rolloutData.status || {}
        const canaryStatus = status.canaryStatus || {}

        // Determine strategy type
        let strategy = 'Unknown'
        if (spec.strategy?.canary) {
            strategy = 'Canary'
        } else if (spec.strategy?.blueGreen) {
            strategy = 'Blue-Green'
        }

        // Calculate step progress and traffic percentages
        let steps = []
        let totalSteps = 0
        let stepIndex = 0
        let isCompleted = false
        let displayStep = 0
        let progressPct = 0
        let trafficPercent = 0

        if (spec.strategy?.canary) {
            steps = spec.strategy.canary.steps || []
            totalSteps = steps.length
            stepIndex = canaryStatus.currentStepIndex || 0
            isCompleted = totalSteps > 0 && stepIndex >= totalSteps
            displayStep = totalSteps === 0 ? 0 : (isCompleted ? totalSteps : stepIndex + 1)
            progressPct = totalSteps === 0 ? 0 : Math.min(100, Math.round((displayStep / totalSteps) * 100))

            if (totalSteps > 0 && stepIndex < steps.length) {
                const currentStep = steps[stepIndex]
                if (currentStep.traffic) {
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
        } else if (spec.strategy?.blueGreen) {
            steps = spec.strategy.blueGreen.steps || []
            totalSteps = steps.length
            const blueGreenStatus = status.blueGreenStatus || {}
            stepIndex = blueGreenStatus.currentStepIndex || 0
            isCompleted = totalSteps > 0 && stepIndex >= totalSteps
            displayStep = totalSteps === 0 ? 0 : (isCompleted ? totalSteps : stepIndex + 1)
            progressPct = totalSteps === 0 ? 0 : Math.min(100, Math.round((displayStep / totalSteps) * 100))

            if (totalSteps > 0 && stepIndex < steps.length) {
                const currentStep = steps[stepIndex]
                if (currentStep.traffic) {
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
            name: metadata.name || 'Unknown',
            namespace: metadata.namespace || 'default',
            strategy,
            status: status.phase || 'Unknown',
            phase: status.phase || 'Unknown',
            currentStep: stepIndex,
            totalSteps,
            canaryReplicas: canaryStatus.canaryReplicas || 0,
            stableReplicas: canaryStatus.stableReplicas || 0,
            age: calculateAge(metadata.creationTimestamp),
            workloadRef: spec.workloadRef?.name || 'Unknown',
            displayStep,
            isCompleted,
            progressPct,
            trafficPercent,
            steps,
            trafficRoutings: spec.strategy?.blueGreen?.trafficRoutings || [],
            message: status.message,
            observedGeneration: status.observedGeneration,
            creationTimestamp: metadata.creationTimestamp,
            uid: metadata.uid
        }
    }

    useEffect(() => {
        const fetchRollout = async () => {
            try {
                setLoading(true)
                const { namespace, name } = parseRolloutId(rolloutId)
                const response = await getRollout(namespace, name)
                const transformedData = transformRolloutData(response)
                setRollout(transformedData)
                setError(null)
            } catch (err) {
                console.error('Error fetching rollout:', err)
                setError('Failed to fetch rollout data')
            } finally {
                setLoading(false)
            }
        }

        if (rolloutId) {
            fetchRollout()
        }
    }, [rolloutId])

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

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading rollout details...</span>
            </div>
        )
    }

    if (error || !rollout) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500 mb-4">{error || 'Rollout not found'}</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
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
                        <ArrowLeft className="mr-2 h-4 w-4" />
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
                                        <span className="text-sm">
                                            {rollout.isCompleted ? 'Completed' : `${rollout.displayStep}/${rollout.totalSteps}`}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Progress</span>
                                            <span>{rollout.progressPct}%</span>
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
                                        <span className="text-sm">{rollout.trafficPercent}%</span>
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
                                        <span className="text-sm font-medium">{rollout.stableReplicas}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">
                                            {rollout.strategy === 'Blue-Green' ? 'Updated' : 'Canary'}
                                        </span>
                                        <span className="text-sm font-medium">{rollout.canaryReplicas}</span>
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
                                <Server className="h-4 w-4 text-muted-foreground" />
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
                                {rollout.steps.map((step, index) => {
                                    const isCurrentStep = index === rollout.currentStep
                                    const isCompleted = index < rollout.currentStep
                                    const isPending = index > rollout.currentStep

                                    return (
                                        <div
                                            key={index}
                                            className={`flex items-center gap-4 p-4 rounded-lg border ${isCurrentStep ? 'bg-blue-50 border-blue-200' :
                                                isCompleted ? 'bg-green-50 border-green-200' :
                                                    'bg-gray-50 border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCurrentStep ? 'bg-blue-500 text-white' :
                                                    isCompleted ? 'bg-green-500 text-white' :
                                                        'bg-gray-300 text-gray-600'
                                                    }`}>
                                                    {isCompleted ? (
                                                        <CheckCircle className="h-4 w-4" />
                                                    ) : (
                                                        <span className="text-sm font-medium">{index + 1}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium">Step {index + 1}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {step.traffic && `Traffic: ${step.traffic}`}
                                                        {step.replicas && ` • Replicas: ${step.replicas}`}
                                                        {step.pause && ' • Pause'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ml-auto">
                                                {isCurrentStep && (
                                                    <Badge variant="secondary">Current</Badge>
                                                )}
                                                {isCompleted && (
                                                    <Badge variant="outline" className="text-green-700">Completed</Badge>
                                                )}
                                                {isPending && (
                                                    <Badge variant="outline" className="text-gray-500">Pending</Badge>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
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
                                    {rollout.trafficRoutings.map((routing, index) => (
                                        <div key={index} className="p-4 border rounded-lg">
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
                                        <span className="text-sm font-mono text-xs">{rollout.uid?.slice(0, 8)}...</span>
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

import { calculateAge } from './utils'

export interface RolloutStep {
  traffic?: string | number
  replicas?: string | number
  pause?: boolean
}

export interface TrafficRouting {
  service?: string
  ingress?: {
    name: string
    classType: string
  }
  gracePeriodSeconds?: number
}

export interface RolloutStepProgress {
  steps: RolloutStep[]
  totalSteps: number
  stepIndex: number
  isCompleted: boolean
  displayStep: number
  progressPct: number
  trafficPercent: number
}

export interface TransformedRollout {
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

export interface TransformedRolloutDetail extends TransformedRollout {
  steps: RolloutStep[]
  trafficRoutings?: TrafficRouting[]
  message?: string
  observedGeneration?: number
  creationTimestamp?: string
  uid?: string
}

/**
 * Parse a traffic value (string like "20%" or number) to a numeric percent.
 */
function parseTrafficPercent(value: string | number): number {
  if (typeof value === 'number') return value
  return Number.parseInt(value.replace('%', ''), 10) || 0
}

/**
 * Calculate display step number from total and current index.
 */
function calcDisplayStep(totalSteps: number, stepIndex: number, isCompleted: boolean): number {
  if (totalSteps === 0) return 0
  return isCompleted ? totalSteps : stepIndex + 1
}

/**
 * Calculate progress percentage.
 */
function calcProgressPct(totalSteps: number, displayStep: number): number {
  if (totalSteps === 0) return 0
  return Math.min(100, Math.round((displayStep / totalSteps) * 100))
}

/**
 * Extract step progress from a strategy block and its status.
 */
function extractStepProgress(
  strategyBlock: Record<string, unknown>,
  statusBlock: Record<string, unknown>,
  isCanary: boolean,
): RolloutStepProgress {
  const steps = (strategyBlock.steps as RolloutStep[]) || []
  const totalSteps = steps.length
  const stepIndex = (statusBlock.currentStepIndex as number) || 0
  const isCompleted = totalSteps > 0 && stepIndex >= totalSteps
  const displayStep = calcDisplayStep(totalSteps, stepIndex, isCompleted)
  const progressPct = calcProgressPct(totalSteps, displayStep)

  let trafficPercent = 0
  if (totalSteps > 0 && stepIndex < steps.length) {
    const currentStep = steps[stepIndex]
    if (currentStep?.traffic) {
      trafficPercent = parseTrafficPercent(currentStep.traffic)
    }
  }
  if (isCanary && isCompleted) {
    trafficPercent = 100
  }

  return { steps, totalSteps, stepIndex, isCompleted, displayStep, progressPct, trafficPercent }
}

/**
 * Determine strategy type from spec.strategy.
 */
function resolveStrategy(specStrategy: Record<string, unknown> | undefined): string {
  if (specStrategy?.canary) return 'Canary'
  if (specStrategy?.blueGreen) return 'Blue-Green'
  return 'Unknown'
}

/**
 * Compute step progress for a rollout's spec and status.
 */
function computeProgress(
  specStrategy: Record<string, unknown> | undefined,
  status: Record<string, unknown>,
): RolloutStepProgress {
  const empty: RolloutStepProgress = {
    steps: [], totalSteps: 0, stepIndex: 0,
    isCompleted: false, displayStep: 0, progressPct: 0, trafficPercent: 0,
  }

  if (specStrategy?.canary) {
    const canaryStatus = (status.canaryStatus as Record<string, unknown>) || {}
    return extractStepProgress(specStrategy.canary as Record<string, unknown>, canaryStatus, true)
  }

  if (specStrategy?.blueGreen) {
    const blueGreenStatus = (status.blueGreenStatus as Record<string, unknown>) || {}
    return extractStepProgress(specStrategy.blueGreen as Record<string, unknown>, blueGreenStatus, false)
  }

  return empty
}

/**
 * Transform a raw Kubernetes rollout object into the list-view shape.
 */
export function transformRollout(rollout: Record<string, unknown>): TransformedRollout {
  const metadata = (rollout.metadata as Record<string, unknown>) || {}
  const spec = (rollout.spec as Record<string, unknown>) || {}
  const status = (rollout.status as Record<string, unknown>) || {}
  const canaryStatus = (status.canaryStatus as Record<string, unknown>) || {}
  const specStrategy = spec.strategy as Record<string, unknown> | undefined

  const strategy = resolveStrategy(specStrategy)
  const progress = computeProgress(specStrategy, status)

  return {
    name: (metadata.name as string) || 'Unknown',
    namespace: (metadata.namespace as string) || 'default',
    strategy,
    status: (status.phase as string) || 'Unknown',
    phase: (status.phase as string) || 'Unknown',
    currentStep: progress.stepIndex,
    totalSteps: progress.totalSteps,
    canaryReplicas: (canaryStatus.canaryReplicas as number) || 0,
    stableReplicas: (canaryStatus.stableReplicas as number) || 0,
    age: calculateAge(metadata.creationTimestamp as string),
    workloadRef: ((spec.workloadRef as Record<string, unknown>)?.name as string) || 'Unknown',
    displayStep: progress.displayStep,
    isCompleted: progress.isCompleted,
    progressPct: progress.progressPct,
    trafficPercent: progress.trafficPercent,
  }
}

/**
 * Transform a raw Kubernetes rollout object into the detail-view shape.
 */
export function transformRolloutDetail(rolloutData: Record<string, unknown>): TransformedRolloutDetail {
  const base = transformRollout(rolloutData)
  const metadata = (rolloutData.metadata as Record<string, unknown>) || {}
  const spec = (rolloutData.spec as Record<string, unknown>) || {}
  const status = (rolloutData.status as Record<string, unknown>) || {}
  const specStrategy = spec.strategy as Record<string, unknown> | undefined

  const progress = computeProgress(specStrategy, status)

  return {
    ...base,
    steps: progress.steps,
    trafficRoutings: ((specStrategy?.blueGreen as Record<string, unknown>)?.trafficRoutings as TrafficRouting[]) || [],
    message: status.message as string,
    observedGeneration: status.observedGeneration as number,
    creationTimestamp: metadata.creationTimestamp as string,
    uid: metadata.uid as string,
  }
}

/**
 * Transform a list of raw rollout objects.
 */
export function transformRolloutList(rollouts: Record<string, unknown>[]): TransformedRollout[] {
  return rollouts.map(transformRollout)
}

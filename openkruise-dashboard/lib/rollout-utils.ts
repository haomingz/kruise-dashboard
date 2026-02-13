import { calculateAge } from './utils'

export interface RolloutStep {
  traffic?: string | number
  replicas?: string | number
  pause?: boolean | { duration?: string | number }
  analysis?: Record<string, unknown>
  experiment?: Record<string, unknown>
  setCanaryScale?: Record<string, unknown>
  setHeaderRoute?: Record<string, unknown>
  setMirrorRoute?: Record<string, unknown>
  plugin?: Record<string, unknown>
  [key: string]: unknown
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
  labels?: Record<string, string>
  strategy: string
  status: string
  phase: string
  currentStep: number
  totalSteps: number
  canaryReplicas: number
  stableReplicas: number
  age: string
  workloadRef: string
  workloadRefKind: string
  displayStep: number
  isCompleted: boolean
  progressPct: number
  trafficPercent: number
  message?: string
  paused?: boolean
}

export interface TransformedRolloutDetail extends TransformedRollout {
  steps: RolloutStep[]
  trafficRoutings?: TrafficRouting[]
  observedGeneration?: number
  creationTimestamp?: string
  uid?: string
  rawCanaryStatus?: Record<string, unknown>
  rawBlueGreenStatus?: Record<string, unknown>
  stableRevisionHash?: string
  canaryRevisionHash?: string
  actualWeight?: number
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

  const workloadRefObj = (spec.workloadRef as Record<string, unknown>) || {}
  const specPaused = spec.paused as boolean | undefined

  return {
    name: (metadata.name as string) || 'Unknown',
    namespace: (metadata.namespace as string) || 'default',
    labels: (metadata.labels as Record<string, string>) || {},
    strategy,
    status: (status.phase as string) || 'Unknown',
    phase: (status.phase as string) || 'Unknown',
    currentStep: progress.stepIndex,
    totalSteps: progress.totalSteps,
    canaryReplicas: (canaryStatus.canaryReplicas as number) || 0,
    stableReplicas: (canaryStatus.stableReplicas as number) || 0,
    age: calculateAge(metadata.creationTimestamp as string),
    workloadRef: (workloadRefObj.name as string) || 'Unknown',
    workloadRefKind: (workloadRefObj.kind as string) || 'Deployment',
    displayStep: progress.displayStep,
    isCompleted: progress.isCompleted,
    progressPct: progress.progressPct,
    trafficPercent: progress.trafficPercent,
    message: (status.message as string) || undefined,
    paused: specPaused ?? false,
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

  const canaryStatus = (status.canaryStatus as Record<string, unknown>) || {}
  const stableRevisionHash = (canaryStatus.stableRevision as string) || undefined
  const canaryRevisionHash = (canaryStatus.canaryRevision as string) || (canaryStatus.podTemplateHash as string) || undefined

  // Compute actual weight from canaryStatus if available
  let actualWeight: number | undefined
  const currentStepState = canaryStatus.currentStepState as string | undefined
  if (currentStepState === 'StepUpgrade' || currentStepState === 'StepPaused') {
    // During rollout, actual weight may differ from set weight
    const weight = canaryStatus.canaryWeight as number | undefined
    if (weight !== undefined) {
      actualWeight = weight
    }
  }

  return {
    ...base,
    steps: progress.steps,
    trafficRoutings: ((specStrategy?.blueGreen as Record<string, unknown>)?.trafficRoutings as TrafficRouting[]) || [],
    observedGeneration: status.observedGeneration as number,
    creationTimestamp: metadata.creationTimestamp as string,
    uid: metadata.uid as string,
    rawCanaryStatus: (status.canaryStatus as Record<string, unknown>) || undefined,
    rawBlueGreenStatus: (status.blueGreenStatus as Record<string, unknown>) || undefined,
    stableRevisionHash,
    canaryRevisionHash,
    actualWeight,
  }
}

/**
 * Transform a list of raw rollout objects.
 */
export function transformRolloutList(rollouts: Record<string, unknown>[]): TransformedRollout[] {
  return rollouts.map(transformRollout)
}

/**
 * Identify step type and produce a human-readable label.
 */
export function getStepTypeLabel(step: RolloutStep): { type: string; label: string } {
  if (step.traffic !== undefined) {
    const raw = String(step.traffic).replace(/%$/, '')
    return { type: 'setWeight', label: `Set Weight: ${raw}%` }
  }
  if (step.analysis !== undefined) {
    return { type: 'analysis', label: 'Analysis' }
  }
  if (step.experiment !== undefined) {
    return { type: 'experiment', label: 'Experiment' }
  }
  if (step.setCanaryScale !== undefined) {
    return { type: 'setCanaryScale', label: 'Set Canary Scale' }
  }
  if (step.setHeaderRoute !== undefined) {
    return { type: 'setHeaderRoute', label: 'Set Header Route' }
  }
  if (step.setMirrorRoute !== undefined) {
    return { type: 'setMirrorRoute', label: 'Set Mirror Route' }
  }
  if (step.plugin !== undefined) {
    return { type: 'plugin', label: 'Plugin' }
  }
  if (step.pause) {
    const pause = step.pause
    if (typeof pause === 'object' && pause !== null && pause.duration !== undefined) {
      return { type: 'pause', label: `Pause: ${pause.duration}` }
    }
    return { type: 'pause', label: 'Pause' }
  }
  if (step.replicas !== undefined) {
    return { type: 'replicas', label: `Replicas: ${step.replicas}` }
  }
  return { type: 'unknown', label: 'Step' }
}

/**
 * Return Tailwind color class name for a given rollout phase.
 */
export function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'Healthy':
    case 'Completed':
      return 'text-green-500'
    case 'Progressing':
      return 'text-blue-500'
    case 'Paused':
      return 'text-orange-500'
    case 'Failed':
    case 'Degraded':
      return 'text-red-500'
    case 'Cancelled':
      return 'text-gray-500'
    default:
      return 'text-gray-400'
  }
}

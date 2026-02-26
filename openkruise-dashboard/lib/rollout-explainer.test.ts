import { describe, expect, it } from "vitest"
import type { TransformedRolloutDetail } from "./rollout-utils"
import {
  buildLiveRolloutSnapshot,
  getExplainerSteps,
  inferExplainerStrategy,
  mapSnapshotToExplainerStep,
  type LiveRolloutSnapshot,
} from "./rollout-explainer"

function createDetail(overrides: Partial<TransformedRolloutDetail>): TransformedRolloutDetail {
  return {
    name: "demo",
    namespace: "default",
    labels: {},
    strategy: "Canary",
    status: "Progressing",
    phase: "Progressing",
    currentStep: 1,
    currentStepIndex: 0,
    totalSteps: 3,
    canaryReplicas: 1,
    stableReplicas: 9,
    age: "1m",
    workloadRef: "workload-demo",
    workloadRefKind: "Deployment",
    displayStep: 1,
    isCompleted: false,
    progressPct: 33,
    trafficPercent: 20,
    paused: false,
    disabled: false,
    steps: [],
    ...overrides,
  }
}

describe("rollout-explainer mapping", () => {
  it("maps StepPaused to paused step", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "canary",
      phase: "Progressing",
      currentStepState: "StepPaused",
      currentStepIndex: 1,
      totalSteps: 3,
      paused: false,
      disabled: false,
    }

    const mapped = mapSnapshotToExplainerStep(snapshot)
    expect(mapped?.stateKey).toBe("step-paused")
  })

  it("maps StepReady to ready step", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "canary",
      phase: "Progressing",
      currentStepState: "StepReady",
      currentStepIndex: 1,
      totalSteps: 3,
      paused: false,
      disabled: false,
    }

    const mapped = mapSnapshotToExplainerStep(snapshot)
    expect(mapped?.stateKey).toBe("step-ready")
  })

  it("maps disabled with higher priority", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "canary",
      phase: "Progressing",
      currentStepState: "StepPaused",
      currentStepIndex: 1,
      totalSteps: 3,
      paused: true,
      disabled: true,
    }

    const mapped = mapSnapshotToExplainerStep(snapshot)
    expect(mapped?.stateKey).toBe("disabled")
  })

  it("maps healthy phase to completed", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "abtest",
      phase: "Healthy",
      currentStepState: "StepReady",
      currentStepIndex: 3,
      totalSteps: 3,
      paused: false,
      disabled: false,
    }

    const mapped = mapSnapshotToExplainerStep(snapshot)
    expect(mapped?.stateKey).toBe("completed")
  })
})

describe("rollout-explainer strategy detection", () => {
  it("detects A/B strategy when steps contain matches", () => {
    const detail = createDetail({
      steps: [{ replicas: "1", matches: [{ headers: [{ name: "user-agent", type: "Exact", value: "pc" }] }] }],
    } as unknown as Partial<TransformedRolloutDetail>)

    expect(inferExplainerStrategy(detail)).toBe("abtest")
  })

  it("returns canary strategy for normal canary steps", () => {
    const detail = createDetail({
      steps: [{ replicas: "20%" }, { replicas: "100%" }],
    })

    expect(inferExplainerStrategy(detail)).toBe("canary")
  })
})

describe("rollout-explainer models", () => {
  it("returns non-empty step models for both strategies", () => {
    expect(getExplainerSteps("canary").length).toBeGreaterThan(0)
    expect(getExplainerSteps("abtest").length).toBeGreaterThan(0)
  })

  it("builds snapshot from transformed detail", () => {
    const detail = createDetail({
      paused: true,
      rawCanaryStatus: { currentStepState: "StepPaused" },
    })

    const snapshot = buildLiveRolloutSnapshot(detail)
    expect(snapshot?.currentStepState).toBe("StepPaused")
    expect(snapshot?.paused).toBe(true)
  })
})

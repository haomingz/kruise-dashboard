import { describe, expect, it } from "vitest"
import {
  buildABTestDiagram,
  buildCanaryDiagram,
  buildLiveDiagram,
} from "./rollout-explainer-diagram"
import type { LiveRolloutSnapshot } from "./rollout-explainer"

function findNodeStatus(
  snapshot: LiveRolloutSnapshot | null,
  nodeId: string,
  strategy: "canary" | "abtest" = "canary"
) {
  const model = strategy === "abtest" ? buildABTestDiagram(snapshot) : buildCanaryDiagram(snapshot)
  return model.nodes.find((node) => node.id === nodeId)?.status
}

describe("rollout-explainer-diagram status mapping", () => {
  it("disabled has higher priority than paused", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "canary",
      phase: "Progressing",
      currentStepState: "StepPaused",
      currentStepIndex: 2,
      totalSteps: 6,
      paused: true,
      disabled: true,
    }

    expect(findNodeStatus(snapshot, "disabled")).toBe("disabled")
    expect(findNodeStatus(snapshot, "step-paused")).toBe("pending")
  })

  it("maps StepPaused to blocked", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "canary",
      phase: "Progressing",
      currentStepState: "StepPaused",
      currentStepIndex: 4,
      totalSteps: 6,
      paused: false,
      disabled: false,
    }

    expect(findNodeStatus(snapshot, "step-paused")).toBe("blocked")
    expect(findNodeStatus(snapshot, "step-upgrade")).toBe("done")
  })

  it("maps Healthy phase to completed node", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "canary",
      phase: "Healthy",
      currentStepState: "StepReady",
      currentStepIndex: 6,
      totalSteps: 6,
      paused: false,
      disabled: false,
    }

    expect(findNodeStatus(snapshot, "completed")).toBe("current")
  })
})

describe("rollout-explainer-diagram model shape", () => {
  it("builds A/B diagram with match routing node", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "abtest",
      phase: "Progressing",
      currentStepState: "StepTrafficRouting",
      currentStepIndex: 3,
      totalSteps: 6,
      paused: false,
      disabled: false,
    }
    const model = buildABTestDiagram(snapshot)

    const matchNode = model.nodes.find((node) => node.id === "ab-match-routing")
    expect(matchNode).toBeDefined()
    expect(matchNode?.status).toBe("current")
  })

  it("builds live diagram and keeps kind as live", () => {
    const model = buildLiveDiagram(null, "canary")
    expect(model.kind).toBe("live")
    expect(model.nodes.length).toBeGreaterThan(0)
  })

  it("builds concrete live diagram from rollout steps", () => {
    const snapshot: LiveRolloutSnapshot = {
      strategy: "canary",
      phase: "Progressing",
      currentStepState: "StepUpgrade",
      currentStepIndex: 2,
      totalSteps: 3,
      paused: false,
      disabled: false,
    }
    const model = buildLiveDiagram(snapshot, "canary", {
      steps: [
        { replicas: "20%" },
        { traffic: "10%" },
        { pause: { duration: 30 } },
      ],
    })

    expect(model.kind).toBe("live")
    expect(model.nodes[0]?.label).toBe("Step 1")
    expect(model.nodes[1]?.subLabel).toContain("Set Weight")
    expect(model.nodes[1]?.status).toBe("current")
  })
})

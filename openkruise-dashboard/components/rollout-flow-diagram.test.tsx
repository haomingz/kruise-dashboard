import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RolloutFlowDiagram } from "./rollout-flow-diagram"
import { buildCanaryDiagram } from "@/lib/rollout-explainer-diagram"
import type { DiagramModel } from "@/lib/rollout-explainer-diagram"

describe("RolloutFlowDiagram", () => {
  it("renders nodes and edges", () => {
    const model = buildCanaryDiagram({
      strategy: "canary",
      phase: "Progressing",
      currentStepState: "StepUpgrade",
      currentStepIndex: 2,
      totalSteps: 6,
      paused: false,
      disabled: false,
    })

    const { container } = render(
      <RolloutFlowDiagram
        model={model}
        title="Canary State Machine Diagram"
        description="demo"
        defaultExpanded
      />
    )

    expect(screen.getByText("Canary State Machine Diagram")).toBeInTheDocument()
    expect(container.querySelectorAll("[data-node-id]").length).toBeGreaterThan(0)
    expect(container.querySelectorAll("[data-edge-id]").length).toBeGreaterThan(0)
    expect(container.querySelector('[data-node-status="current"]')).toBeTruthy()
  })

  it("renders legend entries", () => {
    const model = buildCanaryDiagram(null)
    render(<RolloutFlowDiagram model={model} title="Legend Demo" defaultExpanded />)

    expect(screen.getByText("已完成（done）")).toBeInTheDocument()
    expect(screen.getByText("待执行（pending）")).toBeInTheDocument()
  })

  it("renders empty state when model has no nodes", () => {
    const emptyModel: DiagramModel = {
      kind: "live",
      nodes: [],
      edges: [],
      legend: [],
      viewport: {
        width: 600,
        height: 200,
        minWidth: 600,
      },
    }

    render(<RolloutFlowDiagram model={emptyModel} title="Empty Diagram" defaultExpanded />)
    expect(screen.getByText("当前没有可展示的流程图数据。")).toBeInTheDocument()
  })

  it("is collapsed by default", () => {
    const model = buildCanaryDiagram(null)
    render(<RolloutFlowDiagram model={model} title="Collapsed Diagram" />)

    expect(screen.getByText("展开流程图")).toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "Collapsed Diagram" })).toBeNull()
  })
})

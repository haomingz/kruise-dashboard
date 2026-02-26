import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { buildABTestDiagram, buildCanaryDiagram } from "@/lib/rollout-explainer-diagram"
import { RolloutStateMachineReactFlow } from "./rollout-state-machine-reactflow"

describe("RolloutStateMachineReactFlow", () => {
  it("renders state machine nodes after expand", () => {
    const model = buildCanaryDiagram(null)
    const { container } = render(<RolloutStateMachineReactFlow model={model} title="Canary State Machine Diagram" />)

    expect(screen.getByText("Canary State Machine Diagram")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /展开流程图/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /展开流程图/i }))
    expect(container.querySelectorAll("[data-node-id]").length).toBeGreaterThan(0)
  })

  it("renders A/B source hint text", () => {
    const model = buildABTestDiagram(null)
    render(
      <RolloutStateMachineReactFlow
        model={model}
        title="A/B TrafficRouting Diagram"
        sourceHint="source-check"
      />
    )

    expect(screen.getByText("source-check")).toBeInTheDocument()
  })

  it("supports default expanded", () => {
    const model = buildCanaryDiagram(null)
    render(<RolloutStateMachineReactFlow model={model} title="Canary Diagram" defaultExpanded />)

    expect(screen.getByRole("button", { name: /收起流程图/i })).toBeInTheDocument()
  })

  it("uses static mode legend instead of runtime status legend", () => {
    const model = buildCanaryDiagram(null)
    render(<RolloutStateMachineReactFlow model={model} title="Static Diagram" defaultExpanded staticMode />)

    expect(screen.getByText("实线：主流程")).toBeInTheDocument()
    expect(screen.queryByText("已完成（done）")).toBeNull()
  })
})

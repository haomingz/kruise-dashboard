import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { RolloutResourceTopologyDiagram, buildStageFlowGraph } from "./rollout-resource-topology-diagram"

describe("RolloutResourceTopologyDiagram", () => {
  beforeEach(() => {
    // 每个测试前重置 URL，避免 URL 状态在测试间污染
    window.history.replaceState(null, "", "/")
  })

  it("renders collapsed by default", () => {
    render(<RolloutResourceTopologyDiagram strategy="canary" />)

    expect(screen.getByText("展开资源图")).toBeInTheDocument()
  })

  it("shows stage cards after expand", () => {
    render(<RolloutResourceTopologyDiagram strategy="abtest" />)

    fireEvent.click(screen.getByRole("button", { name: /展开资源图/i }))

    expect(screen.getByText("Step 0: Stable 基线")).toBeInTheDocument()
    expect(screen.getByText("Step 1: A/B Match Routing")).toBeInTheDocument()
    expect(screen.getByText("Step 4: 全量流量切换")).toBeInTheDocument()
  })

  it("switches to react-flow view", () => {
    render(<RolloutResourceTopologyDiagram strategy="canary" />)

    fireEvent.click(screen.getByRole("button", { name: /展开资源图/i }))
    fireEvent.click(screen.getByRole("button", { name: /React Flow 图/i }))

    expect(screen.getByTestId("topology-reactflow-step-0")).toBeInTheDocument()
  })

  it("keeps dedicated canary service when step traffic is 0 without matches", () => {
    const detail = {
      strategy: "Canary",
      phase: "Progressing",
      currentStep: 1,
      currentStepIndex: 0,
      totalSteps: 2,
      canaryReplicas: 1,
      stableReplicas: 9,
      workloadRef: "demo",
      workloadRefKind: "Deployment",
      steps: [
        { replicas: "10%", traffic: "0%" },
        { replicas: "10%", traffic: "10%" },
      ],
      rawSpec: {
        strategy: {
          canary: {
            disableGenerateCanaryService: false,
            trafficRoutings: [
              {
                service: "demo-svc",
                ingress: { name: "demo-ing", classType: "nginx" },
              },
            ],
          },
        },
      },
    } as unknown as Parameters<typeof RolloutResourceTopologyDiagram>[0]["detail"]

    render(<RolloutResourceTopologyDiagram strategy="canary" detail={detail} />)

    fireEvent.click(screen.getByRole("button", { name: /展开资源图/i }))

    const step1Title = screen.getByText("Step 1: 启动 Canary Pod（0% 流量）")
    const card = step1Title.closest("article")
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).getByText("当前阶段已创建 Service/demo-svc-canary，但 canary 路由资源未创建（traffic=0）。")).toBeInTheDocument()
    expect(within(card as HTMLElement).queryByText(/流量按 stable Service endpoints 自然分配/)).not.toBeInTheDocument()
  })

  it("shows endpoint-ratio fallback when canary service generation is disabled", () => {
    const detail = {
      strategy: "Canary",
      phase: "Progressing",
      currentStep: 1,
      currentStepIndex: 0,
      totalSteps: 2,
      canaryReplicas: 1,
      stableReplicas: 9,
      workloadRef: "demo",
      workloadRefKind: "Deployment",
      steps: [
        { replicas: "10%", traffic: "0%" },
        { replicas: "10%", traffic: "10%" },
      ],
      rawSpec: {
        strategy: {
          canary: {
            disableGenerateCanaryService: true,
            trafficRoutings: [
              {
                service: "demo-svc",
                ingress: { name: "demo-ing", classType: "nginx" },
              },
            ],
          },
        },
      },
    } as unknown as Parameters<typeof RolloutResourceTopologyDiagram>[0]["detail"]

    render(<RolloutResourceTopologyDiagram strategy="canary" detail={detail} />)

    fireEvent.click(screen.getByRole("button", { name: /展开资源图/i }))

    const step1Title = screen.getByText("Step 1: 启动 Canary Pod（0% 流量）")
    const card = step1Title.closest("article")
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).getByText("当前阶段未创建 canary 路由资源（无 matches 或 traffic=0）。")).toBeInTheDocument()
    expect(within(card as HTMLElement).getByText(/流量按 stable Service endpoints 自然分配/)).toBeInTheDocument()
  })

  it("shows dedicated canary deployment even when route traffic is 0 in extra workload mode", () => {
    const detail = {
      strategy: "Canary",
      phase: "Progressing",
      currentStep: 1,
      currentStepIndex: 0,
      totalSteps: 1,
      canaryReplicas: 1,
      stableReplicas: 9,
      workloadRef: "demo",
      workloadRefKind: "Deployment",
      enableExtraWorkloadForCanary: true,
      steps: [{ replicas: "1", traffic: "0%" }],
      rawSpec: {
        strategy: {
          canary: {
            enableExtraWorkloadForCanary: true,
            disableGenerateCanaryService: false,
            trafficRoutings: [{ service: "demo-svc" }],
          },
        },
      },
    } as unknown as Parameters<typeof RolloutResourceTopologyDiagram>[0]["detail"]

    render(<RolloutResourceTopologyDiagram strategy="canary" detail={detail} />)

    fireEvent.click(screen.getByRole("button", { name: /展开资源图/i }))
    fireEvent.click(screen.getByRole("button", { name: /React Flow 图/i }))

    expect(screen.getAllByText(/demo-canary/).length).toBeGreaterThan(0)
  })

  it("shows header match rule text for A/B match step", () => {
    const detail = {
      strategy: "Canary",
      phase: "Progressing",
      currentStep: 1,
      currentStepIndex: 0,
      totalSteps: 1,
      canaryReplicas: 1,
      stableReplicas: 9,
      workloadRef: "podinfo",
      workloadRefKind: "Deployment",
      steps: [
        {
          replicas: "10%",
          matches: [
            {
              headers: [{ name: "x-user-group", type: "Exact", value: "beta" }],
            },
          ],
        },
      ],
      rawSpec: {
        strategy: {
          canary: {
            trafficRoutings: [
              {
                service: "podinfo-svc",
                ingress: { name: "podinfo-ing", classType: "nginx" },
              },
            ],
          },
        },
      },
    } as unknown as Parameters<typeof RolloutResourceTopologyDiagram>[0]["detail"]

    render(<RolloutResourceTopologyDiagram strategy="canary" detail={detail} />)
    fireEvent.click(screen.getByRole("button", { name: /展开资源图/i }))

    expect(screen.getAllByText(/header:x-user-group Exact beta/).length).toBeGreaterThan(0)
  })

  it("renders full untruncated match rule text in flow edge data", () => {
    const stage = {
      id: "match-stage",
      order: 1,
      title: "Step 1",
      summary: "match flow",
      status: "current",
      canaryPods: 1,
      stablePods: 9,
      canaryTraffic: 0,
      trafficMode: "match",
      stepSpecSummary: "matches=1",
      stableWorkloadReplicas: 9,
      canaryWorkloadReplicas: 1,
      useExtraCanaryDeployment: true,
      canaryRouteEnabled: true,
      canaryServiceEnabled: true,
      canaryIngressEnabled: true,
      matchRuleSummary: "header:x-very-long-release-channel Exact rollouts-canary-beta-users && query:release-group Exact north-america-users",
      ops: [],
    } satisfies Parameters<typeof buildStageFlowGraph>[0]["stage"]

    const { edges } = buildStageFlowGraph({
      stage,
      stableServiceName: "Service/podinfo-svc",
      canaryServiceName: "Service/podinfo-svc-canary",
      stableRouteName: "Ingress/podinfo-ing",
      canaryRouteName: "Ingress/podinfo-ing-canary",
      routeTypeLabel: "Ingress",
      stableWorkloadName: "Deployment/podinfo",
      canaryWorkloadName: "Deployment/podinfo-canary",
    })

    const labels = edges.map((edge) => ((edge.data as { labelText?: string } | undefined)?.labelText ?? ""))
    expect(
      labels.some((text) =>
        text.includes("header:x-very-long-release-channel Exact rollouts-canary-beta-users && query:release-group Exact north-america-users")
      )
    ).toBe(true)
    expect(labels.some((text) => text.includes("rule-unmatched"))).toBe(true)
  })

  it("keeps no explicit route edge label in flow edge data", () => {
    const stage = {
      id: "no-route-stage",
      order: 1,
      title: "Step 1",
      summary: "no explicit route",
      status: "current",
      canaryPods: 1,
      stablePods: 9,
      canaryTraffic: 0,
      trafficMode: "weight",
      stepSpecSummary: "traffic=0%",
      stableWorkloadReplicas: 9,
      canaryWorkloadReplicas: 0,
      useExtraCanaryDeployment: false,
      canaryRouteEnabled: false,
      canaryServiceEnabled: false,
      canaryIngressEnabled: false,
      ops: [],
    } satisfies Parameters<typeof buildStageFlowGraph>[0]["stage"]

    const { edges } = buildStageFlowGraph({
      stage,
      stableServiceName: "Service/demo-svc",
      canaryServiceName: "Service/demo-svc-canary",
      stableRouteName: "Ingress/demo-ing",
      canaryRouteName: "Ingress/demo-ing-canary",
      routeTypeLabel: "Ingress",
      stableWorkloadName: "Deployment/demo",
      canaryWorkloadName: "Deployment/demo-canary",
    })

    const labels = edges.map((edge) => ((edge.data as { labelText?: string } | undefined)?.labelText ?? ""))
    expect(labels.some((text) => text.includes("no explicit route"))).toBe(true)
  })

  it("uses canary trafficRoutings in abtest mode and shows canary service", () => {
    const detail = {
      strategy: "Canary",
      phase: "Progressing",
      currentStep: 1,
      currentStepIndex: 0,
      totalSteps: 3,
      canaryReplicas: 1,
      stableReplicas: 10,
      workloadRef: "podinfo-backend-prod",
      workloadRefKind: "Deployment",
      enableExtraWorkloadForCanary: true,
      steps: [
        {
          replicas: "1",
          matches: [
            {
              headers: [{ name: "release", type: "Exact", value: "rollouts-canary" }],
            },
          ],
          pause: {},
        },
        { replicas: "50%", pause: { duration: 60 } },
        { replicas: "100%", pause: { duration: 60 } },
      ],
      rawSpec: {
        strategy: {
          canary: {
            enableExtraWorkloadForCanary: true,
            trafficRoutings: [
              {
                service: "podinfo-backend-prod",
                ingress: { name: "podinfo-backend-prod", classType: "nginx" },
              },
            ],
          },
        },
      },
    } as unknown as Parameters<typeof RolloutResourceTopologyDiagram>[0]["detail"]

    render(<RolloutResourceTopologyDiagram strategy="abtest" detail={detail} />)
    fireEvent.click(screen.getByRole("button", { name: /展开资源图/i }))

    expect(screen.getAllByText(/Service\/podinfo-backend-prod-canary/).length).toBeGreaterThan(0)
  })
})

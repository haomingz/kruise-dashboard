import type { RolloutStep, TransformedRolloutDetail } from "./rollout-utils"

export type ExplainerStrategy = "canary" | "abtest"

export type K8sResourceKind =
  | "Rollout"
  | "BatchRelease"
  | "Deployment"
  | "CloneSet"
  | "StatefulSet"
  | "Service"
  | "Ingress"
  | "HTTPRoute"
  | "Pod"

export type K8sResourceOperation = "create" | "patch" | "update" | "delete" | "watch" | "statusPatch"

export interface SourceRef {
  label: string
  url: string
}

export interface K8sResourceOp {
  resourceKind: K8sResourceKind
  operation: K8sResourceOperation
  fieldPaths: string[]
  description: string
  details?: string[]
}

export interface ExplainerStep {
  id: string
  title: string
  stateKey:
    | "step-init"
    | "step-upgrade"
    | "step-traffic-routing"
    | "step-metrics-analysis"
    | "step-paused"
    | "step-ready"
    | "completed"
    | "global-paused"
    | "disabled"
  summary: string
  trigger: string
  ops: K8sResourceOp[]
  notes: string[]
  sourceRefs: SourceRef[]
}

export interface TriggerRule {
  id: string
  title: string
  trigger: string
  observedBy: string[]
  action: string
  sourceRefs: SourceRef[]
}

export interface EdgeCaseRule {
  id: string
  title: string
  scenario: string
  behavior: string
  keyOps: string[]
  sourceRefs: SourceRef[]
}

export interface LiveRolloutSnapshot {
  strategy: ExplainerStrategy
  phase: string
  currentStepState?: string
  currentStepIndex: number
  totalSteps: number
  paused: boolean
  disabled: boolean
}

const DOC_CANARY = "https://openkruise.io/zh/rollouts/user-manuals/strategy-canary-update"
const DOC_AB = "https://openkruise.io/zh/rollouts/user-manuals/strategy-ab-testing"
const DOC_API = "https://openkruise.io/zh/rollouts/user-manuals/api-specifications"
const DOC_BASIC = "https://openkruise.io/zh/rollouts/user-manuals/basic-usage"

const SRC_ROLLOUT_CANARY = "https://github.com/openkruise/rollouts/blob/master/pkg/controller/rollout/rollout_canary.go"
const SRC_ROLLOUT_PROGRESS = "https://github.com/openkruise/rollouts/blob/master/pkg/controller/rollout/rollout_progressing.go"
const SRC_WEBHOOK_WORKLOAD = "https://github.com/openkruise/rollouts/blob/master/pkg/webhook/workload/mutating/workload_update_handler.go"
const SRC_TRAFFIC_MANAGER = "https://github.com/openkruise/rollouts/blob/master/pkg/trafficrouting/manager.go"
const SRC_BATCH_RELEASE = "https://github.com/openkruise/rollouts/blob/master/pkg/controller/rollout/rollout_releaseManager.go"
const SRC_BLUEGREEN_HPA = "https://github.com/openkruise/rollouts/blob/master/pkg/controller/batchrelease/control/bluegreenstyle/hpa/hpa.go"
const SRC_ROLLOUT_STATUS = "https://github.com/openkruise/rollouts/blob/master/pkg/controller/rollout/rollout_status.go"
const SRC_ROLLOUT_EVENT = "https://github.com/openkruise/rollouts/blob/master/pkg/controller/rollout/rollout_event_handler.go"
const SRC_TRAFFIC_INGRESS = "https://github.com/openkruise/rollouts/blob/master/pkg/trafficrouting/network/ingress/ingress.go"
const SRC_TRAFFIC_GATEWAY = "https://github.com/openkruise/rollouts/blob/master/pkg/trafficrouting/network/gateway/gateway.go"
const SRC_LUA_INGRESS_NGINX = "https://github.com/openkruise/rollouts/blob/master/lua_configuration/trafficrouting_ingress/nginx.lua"
const SRC_LUA_INGRESS_MSE = "https://github.com/openkruise/rollouts/blob/master/lua_configuration/trafficrouting_ingress/mse.lua"
const SRC_LUA_INGRESS_ALB = "https://github.com/openkruise/rollouts/blob/master/lua_configuration/trafficrouting_ingress/aliyun-alb.lua"

export const canaryExplainerSteps: ExplainerStep[] = [
  {
    id: "canary-init",
    title: "StepInit: 初始化 Rollout 控制",
    stateKey: "step-init",
    summary: "Mutating Webhook 会标记 Workload 为 in-progressing；Rollout 初始化 status，并准备 BatchRelease/TrafficRouting 上下文。",
    trigger: "检测到有效 Workload revision 变更（PodTemplate 变化或 rollout-id 变化）",
    ops: [
      {
        resourceKind: "Deployment",
        operation: "patch",
        fieldPaths: ["metadata.annotations[rollouts.kruise.io/in-progressing]", "spec.paused"],
        description: "将 Workload 标记为 in-progressing，并把 Deployment 原生 rolling update 置为 paused。",
        details: [
          "metadata.annotations[rollouts.kruise.io/in-progressing] = \"true\"",
          "spec.paused = true（将 update progression 交给 Rollout controller）",
        ],
      },
      {
        resourceKind: "Rollout",
        operation: "update",
        fieldPaths: ["status.phase", "status.canaryStatus.currentStepIndex", "status.canaryStatus.currentStepState"],
        description: "将 status 置为 Progressing，并把 canary state machine 推进到 StepInit。",
        details: [
          "status.phase = Progressing",
          "status.canaryStatus.currentStepState = StepInit",
        ],
      },
      {
        resourceKind: "Service",
        operation: "patch",
        fieldPaths: [
          "spec.selector[<RevisionLabelKey>] = <stableRevision>",
          "<RevisionLabelKey> = pod-template-hash | controller-revision-hash",
        ],
        description: "在 TrafficRouting 场景，将 stable Service selector 收敛到 Stable revision。",
        details: [
          "StrategicMergePatch body: {\"spec\":{\"selector\":{\"<RevisionLabelKey>\":\"<stableRevision>\"}}}",
          "Deployment/CloneSet 通常使用 pod-template-hash；native DaemonSet 使用 controller-revision-hash。",
        ],
      },
    ],
    notes: [
      "配置 canary + trafficRoutings 时，会先 patch Service selector，避免 stable/canary 混流窗口。",
      "enableExtraWorkloadForCanary=true 时，controller 后续会创建额外 canary Deployment。",
    ],
    sourceRefs: [
      { label: "源码: workload mutating webhook", url: SRC_WEBHOOK_WORKLOAD },
      { label: "源码: rollout progressing", url: SRC_ROLLOUT_PROGRESS },
      { label: "文档: 金丝雀发布", url: DOC_CANARY },
    ],
  },
  {
    id: "canary-upgrade",
    title: "StepUpgrade: 执行 Batch 升级",
    stateKey: "step-upgrade",
    summary: "Rollout 通过 BatchRelease 驱动 Workload 升级到当前 batch 目标副本。",
    trigger: "StepInit 完成后，或进入下一 batch",
    ops: [
      {
        resourceKind: "BatchRelease",
        operation: "create",
        fieldPaths: ["spec.releasePlan.batches", "spec.releasePlan.rolloutID", "spec.releasePlan.batchPartition"],
        description: "首次进入升级 batch 时创建 BatchRelease，并绑定 rolloutID + releasePlan。",
        details: [
          "spec.releasePlan.batches 对应 Rollout strategy.canary.steps 的 replicas 计划",
          "spec.releasePlan.rolloutID 关联当前 active release",
        ],
      },
      {
        resourceKind: "BatchRelease",
        operation: "update",
        fieldPaths: ["spec.releasePlan"],
        description: "当 rollout plan hash 或 rolloutID 变化时，更新 BatchRelease spec.releasePlan。",
        details: [
          "Continuous release 或 step jump 会触发 release plan 重算。",
        ],
      },
      {
        resourceKind: "Deployment",
        operation: "create",
        fieldPaths: ["metadata.labels[rollouts.kruise.io/canary-deployment]", "spec.replicas"],
        description: "canary-style 下创建额外 canary Deployment（初始 replicas=0，后续按 batch 扩容）。",
      },
      {
        resourceKind: "Pod",
        operation: "patch",
        fieldPaths: [
          "metadata.labels[rollouts.kruise.io/rollout-id]",
          "metadata.labels[rollouts.kruise.io/rollout-batch-id]",
        ],
        description: "为升级中的 Pod patch rollout/batch labels，用于 batch 观测和筛选。",
      },
    ],
    notes: [
      "只有 BatchRelease 报告 Ready 后，Rollout 才会推进。",
      "建议在 steps.replicas 使用百分比，以兼容 HPA/scaling。",
    ],
    sourceRefs: [
      { label: "源码: rollout canary step upgrade", url: SRC_ROLLOUT_CANARY },
      { label: "源码: runBatchRelease", url: SRC_BATCH_RELEASE },
      { label: "文档: 基本使用/HPA兼容", url: DOC_BASIC },
    ],
  },
  {
    id: "canary-traffic-routing",
    title: "StepTrafficRouting: Patch TrafficRouting 对象",
    stateKey: "step-traffic-routing",
    summary: "根据 steps.traffic 或 steps.matches patch Service/Ingress/HTTPRoute，将权重流量或匹配流量导向 canary。",
    trigger: "当前 BatchRelease batch Ready 后进入",
    ops: [
      {
        resourceKind: "Service",
        operation: "create",
        fieldPaths: [
          "metadata.name = <stableService>-canary",
          "spec.selector[<RevisionLabelKey>] = <canaryRevision>",
        ],
        description: "创建 canary Service（disableGenerateCanaryService=true 时除外），并将 selector 绑定到 canary revision。",
        details: [
          "Controller 会复制 stable Service selector，并覆盖 revision selector key 为 canaryRevision。",
          "onlyTrafficRouting=true 时，canary Service 名可能复用 stable Service 名。",
        ],
      },
      {
        resourceKind: "Service",
        operation: "patch",
        fieldPaths: [
          "stable.spec.selector[<RevisionLabelKey>] = <stableRevision>",
          "canary.spec.selector[<RevisionLabelKey>] = <canaryRevision>",
        ],
        description: "patch stable/canary Service selector，使每个 Service 固定选择对应 revision。",
        details: [
          "stable patch body: {\"spec\":{\"selector\":{\"<RevisionLabelKey>\":\"<stableRevision>\"}}}",
          "canary patch body: {\"spec\":{\"selector\":{\"<RevisionLabelKey>\":\"<canaryRevision>\"}}}",
        ],
      },
      {
        resourceKind: "Ingress",
        operation: "patch",
        fieldPaths: [
          "metadata.annotations[nginx.ingress.kubernetes.io/canary] = \"true\"",
          "metadata.annotations[nginx.ingress.kubernetes.io/canary-weight] = <weight>",
          "metadata.annotations[nginx.ingress.kubernetes.io/canary-by-header|canary-by-cookie|canary-by-query]",
          "metadata.annotations[alb.ingress.kubernetes.io/canary-*]",
        ],
        description: "按 ingress.classType（nginx/mse/aliyun-alb/higress）通过 Lua script patch canary Ingress annotations。",
        details: [
          "Weight-based：设置 canary-weight；并先清空 header/cookie/query 的 canary keys。",
          "A/B match-based：设置 canary-by-header/canary-by-header-value 或 canary-by-cookie；MSE 还支持 canary-by-query。",
          "ALB：使用 alb.ingress.kubernetes.io/canary-weight 与 alb.ingress.kubernetes.io/canary-by-*。",
        ],
      },
      {
        resourceKind: "HTTPRoute",
        operation: "update",
        fieldPaths: [
          "spec.rules[].backendRefs[stable].weight = 100 - canaryWeight",
          "spec.rules[].backendRefs[canary].weight = canaryWeight",
          "spec.rules[].matches[].headers/queryParams (A/B)",
        ],
        description: "Gateway API controller 更新 HTTPRoute rules：Canary 用权重切分，A/B 追加 match rules。",
        details: [
          "Canary weight 模式会插入/更新 canary backendRef，并调整 stable/canary weight。",
          "A/B 模式会生成带 headers/queryParams matches 的 canary rule 与 canary backendRef。",
        ],
      },
    ],
    notes: [
      "A/B testing 本质是在 TrafficRouting 阶段通过 match rules 实现，而不是靠 replicas 计算。",
      "selector/network patch 后会等待 gracePeriodSeconds，避免过早进入下一步。",
    ],
    sourceRefs: [
      { label: "源码: traffic manager", url: SRC_TRAFFIC_MANAGER },
      { label: "源码: ingress provider", url: SRC_TRAFFIC_INGRESS },
      { label: "源码: gateway provider", url: SRC_TRAFFIC_GATEWAY },
      { label: "Lua: nginx ingress annotations", url: SRC_LUA_INGRESS_NGINX },
      { label: "Lua: mse ingress annotations", url: SRC_LUA_INGRESS_MSE },
      { label: "Lua: aliyun-alb ingress annotations", url: SRC_LUA_INGRESS_ALB },
      { label: "文档: A/B 测试", url: DOC_AB },
      { label: "文档: API trafficRoutings", url: DOC_API },
    ],
  },
  {
    id: "canary-metrics-analysis",
    title: "StepMetricsAnalysis: 指标门禁分析",
    stateKey: "step-metrics-analysis",
    summary: "执行 metrics gate 分析。upstream controller 里该函数当前默认直接通过。",
    trigger: "TrafficRouting 验证成功后",
    ops: [
      {
        resourceKind: "Rollout",
        operation: "update",
        fieldPaths: ["status.message", "status.canaryStatus.currentStepState"],
        description: "更新 status message，并将状态从 StepMetricsAnalysis 转到 StepPaused。",
      },
    ],
    notes: [
      "开源 doCanaryMetricsAnalysis 当前是占位实现（返回 true）。",
      "可扩展接入业务 SLO 指标检查。",
    ],
    sourceRefs: [{ label: "源码: doCanaryMetricsAnalysis", url: SRC_ROLLOUT_CANARY }],
  },
  {
    id: "canary-step-paused",
    title: "StepPaused: 等待手动 Approve 或自动恢复",
    stateKey: "step-paused",
    summary: "当前 batch 已 ready 并进入 paused，等待手动 approve 或 pause.duration 超时自动恢复。",
    trigger: "StepMetricsAnalysis 之后进入",
    ops: [
      {
        resourceKind: "Rollout",
        operation: "statusPatch",
        fieldPaths: ["status.canaryStatus.currentStepState"],
        description: "kubectl-kruise approve/promote 会把 currentStepState 从 StepPaused patch 到 StepReady。",
      },
    ],
    notes: [
      "未配置 pause.duration 时必须手动 approval。",
      "可通过 status.currentStepState + currentStepIndex 判断步骤门禁状态。",
    ],
    sourceRefs: [
      { label: "文档: 基本使用 / 手工推进", url: DOC_BASIC },
      { label: "源码: StepPaused 处理", url: SRC_ROLLOUT_CANARY },
    ],
  },
  {
    id: "canary-step-ready",
    title: "StepReady: 进入下一 Batch 或完成",
    stateKey: "step-ready",
    summary: "Step 通过后，controller 会递增 currentStepIndex；最后一步会标记 Completed。",
    trigger: "StepPaused 被手动 approve 或 duration 超时自动恢复",
    ops: [
      {
        resourceKind: "Rollout",
        operation: "update",
        fieldPaths: ["status.canaryStatus.currentStepIndex", "status.canaryStatus.nextStepIndex", "status.canaryStatus.currentStepState"],
        description: "推进 state machine 到下一步 StepInit；最后一步结束时置为 Completed。",
      },
    ],
    notes: ["nextStepIndex 支持显式跳步，controller 会通过 doStepJump 做校验与收敛。"],
    sourceRefs: [
      { label: "源码: doStepJump", url: SRC_ROLLOUT_STATUS },
      { label: "源码: StepReady 处理", url: SRC_ROLLOUT_CANARY },
    ],
  },
  {
    id: "canary-completed",
    title: "Completed + Finalising: 恢复流量并清理资源",
    stateKey: "completed",
    summary: "发布完成（或进入 cancelling/rollback/disabling）后，controller 会恢复 stable 流量并清理临时资源。",
    trigger: "所有步骤完成，或被 cancel/rollback/disable 触发 finalising",
    ops: [
      {
        resourceKind: "Service",
        operation: "patch",
        fieldPaths: ["stable.spec.selector[<RevisionLabelKey>] = null"],
        description: "移除 stable Service 的 revision pin，恢复 selector，让其选择当前 stable pods。",
        details: [
          "StrategicMergePatch body: {\"spec\":{\"selector\":{\"<RevisionLabelKey>\":null}}}",
        ],
      },
      {
        resourceKind: "Ingress",
        operation: "delete",
        fieldPaths: ["metadata.name=<stableIngress>-canary"],
        description: "删除 canary Ingress，恢复到仅 stable Ingress 的路由。",
      },
      {
        resourceKind: "HTTPRoute",
        operation: "update",
        fieldPaths: [
          "spec.rules[].backendRefs remove canary service",
          "spec.rules[].backendRefs[stable].weight = 1",
        ],
        description: "finalize HTTPRoute：移除 canary backendRef，并恢复 stable backendRef weight。",
      },
      {
        resourceKind: "BatchRelease",
        operation: "delete",
        fieldPaths: ["metadata.name=<rollout-name>"],
        description: "删除 BatchRelease，释放 batch 升级控制。",
      },
      {
        resourceKind: "Service",
        operation: "delete",
        fieldPaths: ["metadata.name=<stable>-canary"],
        description: "删除 canary Service（若在 TrafficRouting 阶段生成过）。",
      },
      {
        resourceKind: "Deployment",
        operation: "patch",
        fieldPaths: ["metadata.annotations[rollouts.kruise.io/in-progressing]=null"],
        description: "删除 Workload in-progressing annotation，恢复正常 controller 行为。",
      },
    ],
    notes: [
      "Disable/Delete/Rollback 都会进入 finalising，但 reason 不同。",
      "BlueGreen 与 Canary finalising 顺序不同，但都优先恢复 stable 流量。",
    ],
    sourceRefs: [
      { label: "源码: doCanaryFinalising", url: SRC_ROLLOUT_CANARY },
      { label: "源码: progressing reset/finalising", url: SRC_ROLLOUT_PROGRESS },
    ],
  },
  {
    id: "rollout-global-paused",
    title: "Global Pause（spec.strategy.paused=true）",
    stateKey: "global-paused",
    summary: "Rollout 保留托管关系，但停止步骤推进。",
    trigger: "用户 patch spec.strategy.paused=true",
    ops: [
      {
        resourceKind: "Rollout",
        operation: "patch",
        fieldPaths: ["spec.strategy.paused"],
        description: "切换 global paused 标记。Reconcile reason 切到 Paused；设为 false 后恢复 InRolling。",
      },
    ],
    notes: ["Paused 与 Disabled 不同：不会释放托管，也不会清理路由资源。"],
    sourceRefs: [
      { label: "文档: paused vs disabled", url: DOC_API },
      { label: "源码: handleRolloutPaused", url: SRC_ROLLOUT_PROGRESS },
    ],
  },
  {
    id: "rollout-disabled",
    title: "Disabled（spec.disabled=true）",
    stateKey: "disabled",
    summary: "Rollout 进入 Disabling/Disabled，执行 finalising 并释放托管。",
    trigger: "用户 patch spec.disabled=true",
    ops: [
      {
        resourceKind: "Rollout",
        operation: "patch",
        fieldPaths: ["spec.disabled", "status.phase"],
        description: "Phase 状态流转：Healthy/Progressing -> Disabling -> Disabled。",
      },
      {
        resourceKind: "BatchRelease",
        operation: "delete",
        fieldPaths: ["metadata.name=<rollout-name>"],
        description: "删除 rollout 托管的临时控制资源（如 BatchRelease）。",
      },
    ],
    notes: ["行为上接近删除 rollout，但会保留 CR，便于 troubleshooting/reactivation。"],
    sourceRefs: [
      { label: "文档: 禁用 Rollout", url: DOC_BASIC },
      { label: "源码: reconcileRolloutDisabling", url: SRC_ROLLOUT_STATUS },
    ],
  },
]

export const abTestExplainerSteps: ExplainerStep[] = [
  {
    ...canaryExplainerSteps[0]!,
    id: "ab-init",
    title: "A/B StepInit: 初始化 Rollout 上下文",
    summary: "与 Canary 相同：Webhook 标记 Workload 进入 Rollout 托管，并冻结原生 rolling update。",
  },
  {
    ...canaryExplainerSteps[1]!,
    id: "ab-upgrade",
    title: "A/B StepUpgrade: 先升级小批量 Canary Pod",
    summary: "先升级少量 Pod（例如 1 个），为 A/B 定向流量准备目标 backend。",
  },
  {
    ...canaryExplainerSteps[2]!,
    id: "ab-traffic-routing",
    title: "A/B TrafficRouting: 按匹配规则导流",
    summary: "基于 steps[x].matches（headers/query）定向流量到新版本，其余流量继续走稳定版本。",
    notes: [
      "A/B 与 canary 的核心差异在于匹配式路由，而不仅是权重切分。",
      "后续 batch 可以移除 matches，回到普通 load-balancing 行为。",
    ],
    sourceRefs: [
      { label: "文档: A/B 测试", url: DOC_AB },
      { label: "源码: gateway header routes", url: "https://github.com/openkruise/rollouts/blob/master/pkg/trafficrouting/network/gateway/gateway.go" },
      { label: "源码: ingress annotations patch", url: "https://github.com/openkruise/rollouts/blob/master/pkg/trafficrouting/network/ingress/ingress.go" },
    ],
  },
  {
    ...canaryExplainerSteps[3]!,
    id: "ab-metrics-analysis",
    title: "A/B MetricsAnalysis: 评估实验结果",
  },
  {
    ...canaryExplainerSteps[4]!,
    id: "ab-step-paused",
    title: "A/B StepPaused: 观察并手动 Approve",
  },
  {
    ...canaryExplainerSteps[5]!,
    id: "ab-step-ready",
    title: "A/B StepReady: 推进到下一 Batch",
  },
  {
    ...canaryExplainerSteps[6]!,
    id: "ab-completed",
    title: "A/B Completed: 清理匹配路由并完成收敛",
  },
  {
    ...canaryExplainerSteps[7]!,
    id: "ab-global-paused",
    title: "A/B Global Pause（全局暂停）",
  },
  {
    ...canaryExplainerSteps[8]!,
    id: "ab-disabled",
    title: "A/B Disabled（禁用）",
  },
]

export const triggerRules: TriggerRule[] = [
  {
    id: "trigger-workload-revision",
    title: "Workload Revision 触发",
    trigger: "Workload PodTemplate 变化，或 rollout-id 变化",
    observedBy: ["workload mutating webhook", "rollout controller workload watch"],
    action: "patch in-progressing + workload paused，然后 enqueue reconcile 并进入 Progressing。",
    sourceRefs: [
      { label: "源码: workload webhook", url: SRC_WEBHOOK_WORKLOAD },
      { label: "源码: rollout event handler", url: SRC_ROLLOUT_EVENT },
    ],
  },
  {
    id: "trigger-approve",
    title: "Approve / Promote 触发",
    trigger: "用户在 StepPaused 状态执行 approve/promote",
    observedBy: ["Rollout status.currentStepState"],
    action: "StepPaused -> StepReady -> 下一步 StepInit。",
    sourceRefs: [
      { label: "文档: 基本使用 approve", url: DOC_BASIC },
      { label: "源码: StepPaused/StepReady", url: SRC_ROLLOUT_CANARY },
    ],
  },
  {
    id: "trigger-spec-paused",
    title: "spec.strategy.paused 触发",
    trigger: "patch spec.strategy.paused true/false",
    observedBy: ["rollout reconcile ProgressingReasonPaused branch"],
    action: "暂停 progression；设为 false 后恢复 InRolling。",
    sourceRefs: [{ label: "源码: rollout progressing pause branch", url: SRC_ROLLOUT_PROGRESS }],
  },
  {
    id: "trigger-spec-disabled",
    title: "spec.disabled 触发",
    trigger: "patch spec.disabled true/false",
    observedBy: ["rollout status phase transition checks"],
    action: "进入 Disabling/Disabled 并执行 finalising；disabled=false 后恢复 Healthy。",
    sourceRefs: [{ label: "源码: rollout status disabling branch", url: SRC_ROLLOUT_STATUS }],
  },
  {
    id: "trigger-plan-hash",
    title: "Rollout Plan Hash 触发",
    trigger: "rollout hash != status.subStatus.rolloutHash",
    observedBy: ["isRolloutPlanChanged", "recalculateCanaryStep"],
    action: "重新计算 nextStepIndex，并按 doStepJump 修正状态。",
    sourceRefs: [{ label: "源码: rollout plan changed", url: SRC_ROLLOUT_PROGRESS }],
  },
  {
    id: "trigger-continuous-release",
    title: "Continuous Release 触发",
    trigger: "v1->v2 发布进行中，Workload 又更新到 v3",
    observedBy: ["isContinuousRelease"],
    action: "canary/partition：先 reset 再从第一步重启；bluegreen：返回错误并要求先 rollback。",
    sourceRefs: [
      { label: "源码: handleContinuousRelease", url: SRC_ROLLOUT_PROGRESS },
      { label: "文档: 连续发布说明", url: DOC_BASIC },
    ],
  },
]

export const edgeCaseRules: EdgeCaseRule[] = [
  {
    id: "edge-rollback",
    title: "Rollback（回滚）",
    scenario: "发布失败或业务回退，用户将 Workload spec 改回旧 revision",
    behavior: "Rollout 检测到 rollback 后进入 cancelling/finalising，优先恢复 stable 流量。",
    keyOps: [
      "检测 workload.IsInRollback",
      "切换 progressing reason 到 Cancelling",
      "执行 finalising: route traffic to stable -> release control -> cleanup",
    ],
    sourceRefs: [
      { label: "文档: 如何回滚", url: DOC_BASIC },
      { label: "源码: rollback branches", url: SRC_ROLLOUT_PROGRESS },
    ],
  },
  {
    id: "edge-continuous-release",
    title: "Continuous Release（连续发布）",
    scenario: "当前 rollout 未完成时又提交了新版本",
    behavior: "Canary/Partition 会 reset 后重启；BlueGreen 当前不支持，要求先 rollback。",
    keyOps: [
      "isContinuousRelease 判定 canaryRevision 变化",
      "doProgressingReset 清理旧路由/BatchRelease",
      "状态重置到 ProgressingReasonInitializing",
    ],
    sourceRefs: [{ label: "源码: handleContinuousRelease/doProgressingReset", url: SRC_ROLLOUT_PROGRESS }],
  },
  {
    id: "edge-hpa",
    title: "HPA Compatibility（HPA 兼容）",
    scenario: "rollout 过程中 Workload replicas 发生变化（HPA 或手动缩放）",
    behavior: "Batch controller 检测 replicas changed 后重算 batch progression；建议 steps.replicas 使用百分比。",
    keyOps: [
      "SyncWorkloadInformation 返回 WorkloadReplicasChanged",
      "signalRestartBatch 重置当前批状态再校验",
      "bluegreen style 在控制期会 disable/restore HPA scaleTargetRef",
    ],
    sourceRefs: [
      { label: "文档: HPA 兼容建议", url: DOC_BASIC },
      { label: "源码: batchrelease status scaling handling", url: "https://github.com/openkruise/rollouts/blob/master/pkg/controller/batchrelease/batchrelease_status.go" },
      { label: "源码: bluegreen HPA disable/restore", url: SRC_BLUEGREEN_HPA },
    ],
  },
  {
    id: "edge-paused-disabled",
    title: "Pause vs Disabled（暂停与禁用）",
    scenario: "需要临时冻结发布，或彻底停用 Rollout",
    behavior: "paused 会保留 ownership 并停止 progression；disabled 会触发 cleanup 并释放 ownership。",
    keyOps: [
      "paused: ProgressingReasonPaused",
      "disabled: RolloutPhaseDisabling -> RolloutPhaseDisabled",
      "可重新 patch false 恢复",
    ],
    sourceRefs: [
      { label: "文档: paused/disabled 语义", url: DOC_API },
      { label: "源码: reconcileRolloutDisabling", url: SRC_ROLLOUT_STATUS },
    ],
  },
]

function hasABTestMatches(steps: RolloutStep[]): boolean {
  for (const step of steps) {
    const value = (step as { matches?: unknown }).matches
    if (Array.isArray(value) && value.length > 0) {
      return true
    }
  }
  return false
}

export function inferExplainerStrategy(rollout: Pick<TransformedRolloutDetail, "steps"> | null): ExplainerStrategy {
  if (!rollout) {
    return "canary"
  }
  return hasABTestMatches(rollout.steps) ? "abtest" : "canary"
}

export function getExplainerSteps(strategy: ExplainerStrategy): ExplainerStep[] {
  return strategy === "abtest" ? abTestExplainerSteps : canaryExplainerSteps
}

export function buildLiveRolloutSnapshot(rollout: TransformedRolloutDetail | null): LiveRolloutSnapshot | null {
  if (!rollout) {
    return null
  }

  const canaryStepState = rollout.rawCanaryStatus?.currentStepState
  const blueGreenStepState = rollout.rawBlueGreenStatus?.currentStepState
  const currentStepState =
    (typeof canaryStepState === "string" ? canaryStepState : undefined) ??
    (typeof blueGreenStepState === "string" ? blueGreenStepState : undefined)

  return {
    strategy: inferExplainerStrategy(rollout),
    phase: rollout.phase,
    currentStepState,
    currentStepIndex: rollout.displayStep,
    totalSteps: rollout.totalSteps,
    paused: Boolean(rollout.paused),
    disabled: Boolean(rollout.disabled),
  }
}

function resolveStateKey(snapshot: LiveRolloutSnapshot): ExplainerStep["stateKey"] | null {
  if (snapshot.disabled || snapshot.phase === "Disabled" || snapshot.phase === "Disabling") {
    return "disabled"
  }

  if (snapshot.paused && snapshot.currentStepState !== "StepPaused") {
    return "global-paused"
  }

  if (
    snapshot.currentStepState === "Completed" ||
    snapshot.phase === "Healthy" ||
    snapshot.phase === "Completed"
  ) {
    return "completed"
  }

  switch (snapshot.currentStepState) {
    case "StepInit":
      return "step-init"
    case "StepUpgrade":
      return "step-upgrade"
    case "StepTrafficRouting":
      return "step-traffic-routing"
    case "StepMetricsAnalysis":
      return "step-metrics-analysis"
    case "StepPaused":
      return "step-paused"
    case "StepReady":
      return "step-ready"
    default:
      break
  }

  if (snapshot.phase === "Paused") {
    return "step-paused"
  }

  if (snapshot.phase === "Progressing") {
    return "step-init"
  }

  return null
}

export function mapSnapshotToExplainerStep(snapshot: LiveRolloutSnapshot | null): ExplainerStep | null {
  if (!snapshot) {
    return null
  }

  const stateKey = resolveStateKey(snapshot)
  if (!stateKey) {
    return null
  }

  const steps = getExplainerSteps(snapshot.strategy)
  return steps.find((step) => step.stateKey === stateKey) ?? null
}

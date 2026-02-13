"use client"

import { cn } from "@/lib/utils"
import { type RolloutStep, getStepTypeLabel } from "@/lib/rollout-utils"
import { useState } from "react"
import {
  CheckCircle,
  PauseCircle,
  Scale,
  Server,
  Circle,
  FlaskConical,
  Beaker,
  Route,
  Plug,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"

function getStepIcon(type: string) {
  switch (type) {
    case "setWeight":
      return Scale
    case "pause":
      return PauseCircle
    case "replicas":
      return Server
    case "analysis":
      return FlaskConical
    case "experiment":
      return Beaker
    case "setCanaryScale":
      return Scale
    case "setHeaderRoute":
    case "setMirrorRoute":
      return Route
    case "plugin":
      return Plug
    default:
      return Circle
  }
}

function getStepDetails(step: RolloutStep, type: string): string | null {
  if (type === "analysis" && step.analysis) {
    return JSON.stringify(step.analysis, null, 2)
  }
  if (type === "experiment" && step.experiment) {
    return JSON.stringify(step.experiment, null, 2)
  }
  if (type === "setCanaryScale" && step.setCanaryScale) {
    return JSON.stringify(step.setCanaryScale, null, 2)
  }
  if (type === "setHeaderRoute" && step.setHeaderRoute) {
    return JSON.stringify(step.setHeaderRoute, null, 2)
  }
  if (type === "setMirrorRoute" && step.setMirrorRoute) {
    return JSON.stringify(step.setMirrorRoute, null, 2)
  }
  if (type === "plugin" && step.plugin) {
    return JSON.stringify(step.plugin, null, 2)
  }
  return null
}

interface StepsPipelineProps {
  steps: RolloutStep[]
  currentStep: number
  isCompleted: boolean
  phase: string
}

export function RolloutStepsPipeline({
  steps,
  currentStep,
  isCompleted,
  phase,
}: Readonly<StepsPipelineProps>) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  if (!steps || steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No steps configured
      </div>
    )
  }

  return (
    <div className="relative space-y-0">
      {steps.map((step, index) => {
        const key = `step-${index}`
        const isStepCompleted = isCompleted || index < currentStep
        const isCurrent = !isCompleted && index === currentStep
        const isPending = !isCompleted && index > currentStep
        const isLast = index === steps.length - 1
        const { type, label } = getStepTypeLabel(step)
        const Icon = getStepIcon(type)
        const detail = getStepDetails(step, type)
        const isExpanded = expandedKey === key

        // Determine border & bg colors
        let borderColor = "border-gray-200"
        let bgColor = "bg-gray-50"
        let dotColor = "bg-gray-300 text-gray-500"
        let lineColor = "bg-gray-200"

        if (isStepCompleted) {
          borderColor = "border-green-300"
          bgColor = "bg-green-50"
          dotColor = "bg-green-500 text-white"
          lineColor = "bg-green-300"
        } else if (isCurrent) {
          if (phase === "Paused" && type === "pause") {
            borderColor = "border-orange-400"
            bgColor = "bg-orange-50"
            dotColor = "bg-orange-500 text-white"
          } else {
            borderColor = "border-blue-400"
            bgColor = "bg-blue-50"
            dotColor = "bg-blue-500 text-white"
          }
          lineColor = "bg-gray-200"
        }

        return (
          <div key={key} className="relative flex items-start gap-3">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[13px] top-[30px] w-0.5 bottom-0",
                  isStepCompleted ? lineColor : "bg-gray-200"
                )}
              />
            )}

            {/* Dot / icon */}
            <div
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                dotColor
              )}
            >
              {isStepCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </div>

            {/* Step card */}
            <div
              className={cn(
                "flex-1 rounded-lg border p-3 mb-3 transition-colors",
                borderColor,
                bgColor,
                isPending && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{label}</span>
                <div className="flex items-center gap-1">
                  {isCurrent && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  {isStepCompleted && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {detail && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                    >
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")}
                      />
                    </Button>
                  )}
                </div>
              </div>
              {detail && isExpanded && (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px] leading-snug">
                  {detail}
                </pre>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

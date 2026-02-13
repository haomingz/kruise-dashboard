"use client"

import { cn } from "@/lib/utils"
import { type RolloutStep, getStepTypeLabel } from "@/lib/rollout-utils"
import { CheckCircle, PauseCircle, Scale, Server, Circle } from "lucide-react"

function getStepIcon(type: string) {
  switch (type) {
    case "setWeight":
      return Scale
    case "pause":
      return PauseCircle
    case "replicas":
      return Server
    default:
      return Circle
  }
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
        const isStepCompleted = isCompleted || index < currentStep
        const isCurrent = !isCompleted && index === currentStep
        const isPending = !isCompleted && index > currentStep
        const isLast = index === steps.length - 1
        const { type, label } = getStepTypeLabel(step)
        const Icon = getStepIcon(type)

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
          <div key={`step-${index}`} className="relative flex items-start gap-3">
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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                {isCurrent && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
                {isStepCompleted && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"
import { CheckCircle, AlertCircle, Loader2, HelpCircle } from "lucide-react"

type PodPhase = "Running" | "Succeeded" | "Pending" | "Failed" | "Unknown"

function derivePodPhase(pod: Record<string, unknown>): PodPhase {
  const status = (pod.status as Record<string, unknown>) || {}
  const phase = (status.phase as string) || "Unknown"
  if (phase === "Running" || phase === "Succeeded") return phase as PodPhase
  if (phase === "Pending") return "Pending"
  if (phase === "Failed") return "Failed"
  return "Unknown"
}

function getPodName(pod: Record<string, unknown>): string {
  const metadata = (pod.metadata as Record<string, unknown>) || {}
  return (metadata.name as string) || "unknown"
}

const phaseStyles: Record<PodPhase, string> = {
  Running: "bg-green-500 text-white",
  Succeeded: "bg-green-500 text-white",
  Pending: "bg-amber-400 text-white",
  Failed: "bg-red-500 text-white",
  Unknown: "bg-gray-300 text-gray-600",
}

const phaseIcons: Record<PodPhase, React.ReactNode> = {
  Running: <CheckCircle className="h-3.5 w-3.5" />,
  Succeeded: <CheckCircle className="h-3.5 w-3.5" />,
  Pending: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  Failed: <AlertCircle className="h-3.5 w-3.5" />,
  Unknown: <HelpCircle className="h-3.5 w-3.5" />,
}

export function PodStatusSquare({ pod }: Readonly<{ pod: Record<string, unknown> }>) {
  const phase = derivePodPhase(pod)
  const name = getPodName(pod)

  return (
    <div
      title={`${name} (${phase})`}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center cursor-default",
        phaseStyles[phase]
      )}
    >
      {phaseIcons[phase]}
    </div>
  )
}

export function PodStatusGrid({ pods }: Readonly<{ pods: Record<string, unknown>[] }>) {
  if (!pods || pods.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {pods.map((pod) => {
        const name = getPodName(pod)
        return <PodStatusSquare key={name} pod={pod} />
      })}
    </div>
  )
}

/**
 * Simplified pod grid that renders squares based on counts (no real pod data).
 */
export function PodStatusGridSimple({
  ready,
  total,
}: Readonly<{ ready: number; total: number }>) {
  if (total === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const isReady = i < ready
        return (
          <div
            key={`pod-${i}`}
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center",
              isReady ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
            )}
          >
            {isReady ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : (
              <HelpCircle className="h-3.5 w-3.5" />
            )}
          </div>
        )
      })}
    </div>
  )
}

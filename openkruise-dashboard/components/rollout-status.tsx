"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, RefreshCw, XCircle, PauseCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const SIZE_MAP = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
} as const

export function RolloutStatusIcon({
  status,
  size = "md",
  className,
}: Readonly<{ status: string; size?: "sm" | "md"; className?: string }>) {
  const cls = SIZE_MAP[size]
  switch (status) {
    case "Healthy":
    case "Completed":
      return <CheckCircle className={cn(cls, "text-green-500", className)} />
    case "Progressing":
      return <RefreshCw className={cn(cls, "text-blue-500 animate-spin", className)} />
    case "Paused":
      return <PauseCircle className={cn(cls, "text-orange-500", className)} />
    case "Failed":
    case "Degraded":
      return <XCircle className={cn(cls, "text-red-500", className)} />
    default:
      return <CheckCircle className={cn(cls, "text-gray-400", className)} />
  }
}

export function RolloutStrategyBadge({ strategy }: Readonly<{ strategy: string }>) {
  switch (strategy) {
    case "Canary":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
          Canary
        </Badge>
      )
    case "Blue-Green":
      return (
        <Badge className="bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-100">
          BlueGreen
        </Badge>
      )
    default:
      return <Badge variant="outline">{strategy}</Badge>
  }
}

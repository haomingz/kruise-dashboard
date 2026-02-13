"use client"

import type { ContainerInfo } from "@/api/rollout"
import { Package } from "lucide-react"

interface RolloutContainersProps {
  containers: ContainerInfo[]
}

export function RolloutContainers({ containers }: Readonly<RolloutContainersProps>) {
  if (!containers || containers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        No container info available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {containers.map((c) => (
        <div
          key={c.name}
          className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
        >
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{c.name}</span>
          <span className="text-sm text-muted-foreground">&rarr;</span>
          <span className="text-sm font-mono text-muted-foreground truncate">{c.image}</span>
        </div>
      ))}
    </div>
  )
}

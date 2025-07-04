import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface OverviewProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Overview({ className, ...props }: OverviewProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardHeader>
        <CardTitle>Cluster Overview</CardTitle>
        <CardDescription>Resource utilization across your Kubernetes cluster</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">CPU</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full w-[65%] bg-primary" />
              </div>
              <span className="ml-2 text-sm text-muted-foreground">65%</span>
            </div>
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">Memory</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full w-[78%] bg-primary" />
              </div>
              <span className="ml-2 text-sm text-muted-foreground">78%</span>
            </div>
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">Storage</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full w-[42%] bg-primary" />
              </div>
              <span className="ml-2 text-sm text-muted-foreground">42%</span>
            </div>
            <div className="flex items-center">
              <div className="mr-2 w-14 text-right text-sm font-medium">Network</div>
              <div className="relative flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="flex h-full w-[35%] bg-primary" />
              </div>
              <span className="ml-2 text-sm text-muted-foreground">35%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Nodes</div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Total</div>
                <div className="font-medium">12</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Ready</div>
                <div className="font-medium">12</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Pods</div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Total</div>
                <div className="font-medium">248</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Running</div>
                <div className="font-medium">235</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

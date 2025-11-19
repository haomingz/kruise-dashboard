import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle, Clock, GitMerge, RefreshCw } from "lucide-react"
import type React from "react"

interface RecentActivityProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function RecentActivity({ className, ...props }: RecentActivityProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest events and operations in your cluster</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 rounded-full bg-green-100 p-1 dark:bg-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">CloneSet web-frontend scaled successfully</p>
              <p className="text-sm text-muted-foreground">Replicas: 3 → 5</p>
              <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>2 minutes ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="mt-0.5 rounded-full bg-blue-100 p-1 dark:bg-blue-800">
              <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">In-place update of database-sidecar containers</p>
              <p className="text-sm text-muted-foreground">Updated 12 containers across 6 pods</p>
              <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>15 minutes ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="mt-0.5 rounded-full bg-amber-100 p-1 dark:bg-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">PodUnavailableBudget triggered for api-service</p>
              <p className="text-sm text-muted-foreground">Prevented eviction of 2 pods to maintain availability</p>
              <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>45 minutes ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="mt-0.5 rounded-full bg-green-100 p-1 dark:bg-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">BroadcastJob image-pull completed</p>
              <p className="text-sm text-muted-foreground">Successfully pulled images on all 12 nodes</p>
              <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>1 hour ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="mt-0.5 rounded-full bg-blue-100 p-1 dark:bg-blue-800">
              <GitMerge className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Canary rollout progressed to next batch</p>
              <p className="text-sm text-muted-foreground">frontend-canary traffic split: 70% stable, 30% canary</p>
              <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>30 minutes ago</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

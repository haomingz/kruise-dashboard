"use client"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRolloutAnalysis } from "@/hooks/use-rollout-analysis"
import { Loader2 } from "lucide-react"

interface RolloutAnalysisModalProps {
  namespace: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RolloutAnalysisModal({
  namespace,
  name,
  open,
  onOpenChange,
}: Readonly<RolloutAnalysisModalProps>) {
  const { data, isLoading, error } = useRolloutAnalysis(namespace, name, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Analysis</DialogTitle>
          <DialogDescription>
            Rollout {name} analysis summary and metric runs.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading analysis...
          </div>
        ) : error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to load analysis data.
          </div>
        ) : (
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="mt-1 text-sm font-medium">{data?.source || "placeholder"}</div>
                </div>
                <div className="rounded border p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <Badge variant="outline">{data?.status || "not_configured"}</Badge>
                  </div>
                </div>
              </div>
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground">Summary</div>
                <p className="mt-1 text-sm">{data?.summary || "Analysis source is not configured."}</p>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-2">
              {data?.runs && data.runs.length > 0 ? (
                data.runs.map((run, index) => (
                  <div key={run.id || `${index}-${run.name || "run"}`} className="rounded border p-3">
                    <div className="text-sm font-medium">{run.name || run.id || `Run ${index + 1}`}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {run.status || "unknown"}
                      {run.startedAt ? ` · ${run.startedAt}` : ""}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                  未接入分析数据源
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

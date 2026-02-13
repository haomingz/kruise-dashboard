"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RolloutCard } from "@/components/rollout-card"
import { RolloutStatusIcon, RolloutStrategyBadge } from "@/components/rollout-status"
import { MainNav } from "@/components/main-nav"
import { NamespaceSelector } from "@/components/namespace-selector"
import { type TransformedRollout, transformRolloutList } from "@/lib/rollout-utils"
import { useAllRollouts } from "@/hooks/use-rollouts"
import {
  Loader2,
  LayoutGrid,
  List,
  Search,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

type ViewMode = "grid" | "table"
type StatusFilter = "all" | "Progressing" | "Paused" | "Healthy" | "Failed"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Progressing", label: "Progressing" },
  { value: "Paused", label: "Paused" },
  { value: "Healthy", label: "Healthy" },
  { value: "Failed", label: "Failed" },
]

function matchesStatus(rollout: TransformedRollout, filter: StatusFilter): boolean {
  if (filter === "all") return true
  if (filter === "Healthy") return rollout.phase === "Healthy" || rollout.phase === "Completed"
  if (filter === "Failed") return rollout.phase === "Failed" || rollout.phase === "Degraded"
  return rollout.phase === filter
}

function RolloutsTable({ rollouts }: Readonly<{ rollouts: TransformedRollout[] }>) {
  if (rollouts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No rollouts found
      </div>
    )
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px]">Name</TableHead>
            <TableHead className="hidden sm:table-cell">Strategy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Progress</TableHead>
            <TableHead className="hidden lg:table-cell">Replicas</TableHead>
            <TableHead className="hidden xl:table-cell">Workload</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="text-right w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rollouts.map((rollout) => (
            <TableRow key={`${rollout.namespace}-${rollout.name}`}>
              <TableCell className="font-medium">
                <Link
                  href={`/rollouts/${rollout.namespace}/${rollout.name}`}
                  className="text-primary hover:underline truncate block max-w-[200px]"
                >
                  {rollout.name}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <RolloutStrategyBadge strategy={rollout.strategy} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <RolloutStatusIcon status={rollout.phase} size="sm" />
                  <span className="whitespace-nowrap text-sm">{rollout.phase}</span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {rollout.totalSteps > 0 ? (
                  <div className="flex items-center gap-2">
                    {rollout.isCompleted ? (
                      <span className="text-sm text-green-600 font-medium">Completed</span>
                    ) : (
                      <>
                        <span className="text-sm tabular-nums">
                          {rollout.displayStep}/{rollout.totalSteps}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${rollout.progressPct}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                <div>Stable: {rollout.stableReplicas}</div>
                <div>Canary: {rollout.canaryReplicas}</div>
              </TableCell>
              <TableCell className="hidden xl:table-cell text-sm text-muted-foreground truncate max-w-[120px]">
                {rollout.workloadRef}
              </TableCell>
              <TableCell className="tabular-nums text-sm">{rollout.age}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/rollouts/${rollout.namespace}/${rollout.name}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function RolloutsPage() {
  const { data: rawData, isLoading } = useAllRollouts()
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const allRollouts = useMemo(() => {
    if (!rawData?.rollouts) return []
    return transformRolloutList(rawData.rollouts as Record<string, unknown>[])
  }, [rawData])

  const filteredRollouts = useMemo(() => {
    return allRollouts.filter((r) => {
      if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (!matchesStatus(r, statusFilter)) return false
      return true
    })
  }, [allRollouts, searchQuery, statusFilter])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: allRollouts.length, Progressing: 0, Paused: 0, Healthy: 0, Failed: 0 }
    for (const r of allRollouts) {
      if (matchesStatus(r, "Progressing")) counts.Progressing++
      if (matchesStatus(r, "Paused")) counts.Paused++
      if (matchesStatus(r, "Healthy")) counts.Healthy++
      if (matchesStatus(r, "Failed")) counts.Failed++
    }
    return counts
  }, [allRollouts])

  return (
    <div className="flex h-dvh flex-col bg-muted/40 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 min-h-14 items-center gap-4 px-4 py-2 sm:pl-6 sm:pr-6 sm:py-0 min-w-0">
          <MainNav className="min-w-0 flex-1 shrink" />
          <NamespaceSelector />
        </div>
      </header>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-w-0 space-y-4 p-4 sm:p-6 max-w-7xl mx-auto">
          {/* Title + View Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rollouts</h1>
              <p className="text-sm text-muted-foreground">
                Manage your OpenKruise rollout deployments
              </p>
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-0.5">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 w-8 p-0"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rollouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
                className="text-xs"
              >
                {f.label}
                <span className="ml-1 tabular-nums">({statusCounts[f.value]})</span>
              </Button>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading rollouts...</span>
            </div>
          ) : viewMode === "grid" ? (
            filteredRollouts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                {allRollouts.length === 0
                  ? "No rollouts found in this namespace"
                  : "No rollouts match your search"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRollouts.map((rollout) => (
                  <RolloutCard
                    key={`${rollout.namespace}-${rollout.name}`}
                    rollout={rollout}
                  />
                ))}
              </div>
            )
          ) : (
            <RolloutsTable rollouts={filteredRollouts} />
          )}
        </div>
      </div>
    </div>
  )
}

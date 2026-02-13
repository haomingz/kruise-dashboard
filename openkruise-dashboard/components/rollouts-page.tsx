"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Star,
  AlertTriangle,
  Keyboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RolloutCard } from "@/components/rollout-card"
import { RolloutStatusIcon, RolloutStrategyBadge } from "@/components/rollout-status"
import { MainNav } from "@/components/main-nav"
import { NamespaceSelector } from "@/components/namespace-selector"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type TransformedRollout, transformRolloutList } from "@/lib/rollout-utils"
import { config } from "@/lib/config"
import { cn } from "@/lib/utils"
import { useAllRollouts } from "@/hooks/use-rollouts"
import { useNamespace } from "@/hooks/use-namespace"
import { useRolloutsWatch } from "@/hooks/use-rollouts-watch"

type ViewMode = "grid" | "table"
type StatusFilter = "Progressing" | "Paused" | "Healthy" | "Failed"

const STATUS_FILTERS: StatusFilter[] = ["Progressing", "Paused", "Healthy", "Failed"]
const FAVORITES_STORAGE_KEY = "rollout-favorites-v1"

function rolloutKey(rollout: Pick<TransformedRollout, "namespace" | "name">): string {
  return `${rollout.namespace}/${rollout.name}`
}

function matchesStatus(rollout: TransformedRollout, filter: StatusFilter): boolean {
  if (filter === "Healthy") return rollout.phase === "Healthy" || rollout.phase === "Completed"
  if (filter === "Failed") return rollout.phase === "Failed" || rollout.phase === "Degraded"
  return rollout.phase === filter
}

function isNeedsAttention(rollout: TransformedRollout): boolean {
  return rollout.phase === "Paused" || rollout.phase === "Failed" || rollout.phase === "Degraded"
}

function parseSearchTokens(query: string): string[] {
  return query
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

function matchesToken(rollout: TransformedRollout, token: string): boolean {
  const lower = token.toLowerCase()
  if (lower.includes(":")) {
    const [labelKeyRaw = "", labelValueRaw = ""] = lower.split(":", 2)
    const labelKey = labelKeyRaw.trim()
    const labelValue = labelValueRaw.trim()
    if (!labelKey || !labelValue) return false
    const labels = rollout.labels || {}
    return Object.entries(labels).some(([key, value]) => key.toLowerCase() === labelKey && value.toLowerCase().includes(labelValue))
  }

  return (
    rollout.name.toLowerCase().includes(lower) ||
    rollout.namespace.toLowerCase().includes(lower) ||
    rollout.phase.toLowerCase().includes(lower) ||
    rollout.workloadRef.toLowerCase().includes(lower)
  )
}

function RolloutsTable({
  rollouts,
  favoriteKeys,
  onToggleFavorite,
  selectedRolloutKey,
}: Readonly<{
  rollouts: TransformedRollout[]
  favoriteKeys: Set<string>
  onToggleFavorite: (key: string) => void
  selectedRolloutKey: string | null
}>) {
  if (rollouts.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">No rollouts found</div>
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[52px]">Fav</TableHead>
            <TableHead className="min-w-[140px]">Name</TableHead>
            <TableHead className="hidden sm:table-cell">Strategy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Progress</TableHead>
            <TableHead className="hidden lg:table-cell">Replicas</TableHead>
            <TableHead className="hidden xl:table-cell">Workload</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rollouts.map((rollout) => {
            const key = rolloutKey(rollout)
            return (
              <TableRow
                key={key}
                className={cn(selectedRolloutKey === key && "bg-blue-50/70")}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onToggleFavorite(key)}
                  >
                    <Star className={cn("h-3.5 w-3.5", favoriteKeys.has(key) && "fill-current text-amber-500")} />
                  </Button>
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/rollouts/${rollout.namespace}/${rollout.name}`}
                    className="block max-w-[200px] truncate text-primary hover:underline"
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
                        <span className="text-sm font-medium text-green-600">Completed</span>
                      ) : (
                        <>
                          <span className="tabular-nums text-sm">
                            {rollout.displayStep}/{rollout.totalSteps}
                          </span>
                          <div className="h-2 w-16 rounded-full bg-gray-200">
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
                <TableCell className="hidden text-sm lg:table-cell">
                  <div>Stable: {rollout.stableReplicas}</div>
                  <div>Canary: {rollout.canaryReplicas}</div>
                </TableCell>
                <TableCell className="hidden max-w-[120px] truncate text-sm text-muted-foreground xl:table-cell">
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
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function RolloutsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { namespace } = useNamespace()
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<Set<StatusFilter>>(() => {
    const raw = searchParams.get("status")
    const next = new Set<StatusFilter>()
    if (!raw) return next
    for (const part of raw.split(",")) {
      if (STATUS_FILTERS.includes(part as StatusFilter)) {
        next.add(part as StatusFilter)
      }
    }
    return next
  })
  const [onlyNeedsAttention, setOnlyNeedsAttention] = useState(searchParams.get("needs") === "1")
  const [favoritesOnly, setFavoritesOnly] = useState(searchParams.get("fav") === "1")
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return []
    }
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!saved) {
      return []
    }
    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
    } catch {
      return []
    }
  })

  const watchState = useRolloutsWatch({
    namespace,
    enabled: config.rolloutWatchEnabled,
  })
  const refreshInterval = watchState.fallbackPolling ? 30000 : 0

  const { data: rawData, isLoading } = useAllRollouts(undefined, {
    refreshInterval,
  })

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim())
    }
    if (selectedStatusFilters.size > 0) {
      params.set("status", Array.from(selectedStatusFilters).join(","))
    }
    if (onlyNeedsAttention) {
      params.set("needs", "1")
    }
    if (favoritesOnly) {
      params.set("fav", "1")
    }
    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      const target = nextQuery ? `${pathname}?${nextQuery}` : pathname
      router.replace(target, { scroll: false })
    }
  }, [favoritesOnly, onlyNeedsAttention, pathname, router, searchParams, searchQuery, selectedStatusFilters])

  const allRollouts = useMemo(() => {
    if (!rawData?.rollouts) return []
    return transformRolloutList(rawData.rollouts as Record<string, unknown>[])
  }, [rawData])

  const favoriteKeys = useMemo(() => new Set(favorites), [favorites])

  const filteredRollouts = useMemo(() => {
    const tokens = parseSearchTokens(searchQuery)
    return allRollouts.filter((rollout) => {
      if (favoritesOnly && !favoriteKeys.has(rolloutKey(rollout))) return false
      if (onlyNeedsAttention && !isNeedsAttention(rollout)) return false
      if (selectedStatusFilters.size > 0) {
        let matched = false
        for (const filter of selectedStatusFilters) {
          if (matchesStatus(rollout, filter)) {
            matched = true
            break
          }
        }
        if (!matched) return false
      }
      if (tokens.length > 0) {
        for (const token of tokens) {
          if (!matchesToken(rollout, token)) {
            return false
          }
        }
      }
      return true
    })
  }, [allRollouts, favoriteKeys, favoritesOnly, onlyNeedsAttention, searchQuery, selectedStatusFilters])

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      Progressing: 0,
      Paused: 0,
      Healthy: 0,
      Failed: 0,
    }
    for (const rollout of allRollouts) {
      for (const filter of STATUS_FILTERS) {
        if (matchesStatus(rollout, filter)) {
          counts[filter] += 1
        }
      }
    }
    return counts
  }, [allRollouts])

  const toggleFavorite = useCallback((key: string) => {
    setFavorites((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key)
      }
      return [...current, key]
    })
  }, [])

  const toggleStatusFilter = useCallback((filter: StatusFilter) => {
    setSelectedStatusFilters((current) => {
      const next = new Set(current)
      if (next.has(filter)) {
        next.delete(filter)
      } else {
        next.add(filter)
      }
      return next
    })
  }, [])

  useEffect(() => {
    const isEditableElement = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault()
        setShowShortcutHelp(true)
        return
      }
      if (event.key === "/") {
        if (isEditableElement(event.target)) return
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (event.key === "Escape") {
        setSelectedIndex(-1)
        return
      }
      if (event.key === "ArrowDown") {
        if (filteredRollouts.length === 0) return
        event.preventDefault()
        setSelectedIndex((index) => Math.min(index + 1, filteredRollouts.length - 1))
        return
      }
      if (event.key === "ArrowUp") {
        if (filteredRollouts.length === 0) return
        event.preventDefault()
        setSelectedIndex((index) => Math.max(index - 1, 0))
        return
      }
      if (event.key === "Enter") {
        const currentIndex =
          filteredRollouts.length === 0
            ? -1
            : selectedIndex < 0
              ? 0
              : Math.min(selectedIndex, filteredRollouts.length - 1)
        if (currentIndex < 0 || currentIndex >= filteredRollouts.length) return
        const rollout = filteredRollouts[currentIndex]
        if (!rollout) return
        router.push(`/rollouts/${rollout.namespace}/${rollout.name}`)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [filteredRollouts, router, selectedIndex])

  const normalizedSelectedIndex =
    filteredRollouts.length === 0
      ? -1
      : selectedIndex < 0
        ? 0
        : Math.min(selectedIndex, filteredRollouts.length - 1)

  const selectedRollout =
    normalizedSelectedIndex >= 0 && normalizedSelectedIndex < filteredRollouts.length
      ? filteredRollouts[normalizedSelectedIndex]
      : null
  const selectedRolloutKey = selectedRollout ? rolloutKey(selectedRollout) : null

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/40">
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 min-h-14 items-center gap-4 px-4 py-2 sm:pl-6 sm:pr-6 sm:py-0 min-w-0">
          <MainNav className="min-w-0 flex-1 shrink" />
          <NamespaceSelector />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto min-w-0 max-w-7xl space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rollouts</h1>
              <p className="text-sm text-muted-foreground">Manage your OpenKruise rollout deployments</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setShowShortcutHelp(true)}
              >
                <Keyboard className="h-3.5 w-3.5" />
                Shortcut
              </Button>
              <div className="flex items-center gap-1 rounded-lg border p-0.5">
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={favoritesOnly ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setFavoritesOnly((value) => !value)}
            >
              <Star className="mr-1 h-3.5 w-3.5" />
              Favorites
            </Button>
            <Button
              variant={onlyNeedsAttention ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setOnlyNeedsAttention((value) => !value)}
            >
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              Needs Attention
            </Button>
            <Button
              variant={selectedStatusFilters.size === 0 ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setSelectedStatusFilters(new Set())}
            >
              All Status
            </Button>
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter}
                variant={selectedStatusFilters.has(filter) ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => toggleStatusFilter(filter)}
              >
                {filter}
                <span className="ml-1 tabular-nums">({statusCounts[filter]})</span>
              </Button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search rollouts (supports name,label:value,comma separated)..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("rounded px-1.5 py-0.5", watchState.fallbackPolling ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
              {watchState.fallbackPolling ? "Polling fallback" : "Watch stream"}
            </span>
            {watchState.fallbackPolling && watchState.lastError && (
              <span>{watchState.lastError}</span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading rollouts...</span>
            </div>
          ) : viewMode === "grid" ? (
            filteredRollouts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                {allRollouts.length === 0 ? "No rollouts found in this namespace" : "No rollouts match your filters"}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRollouts.map((rollout) => {
                  const key = rolloutKey(rollout)
                  return (
                    <div
                      key={key}
                      className={cn("relative rounded-xl", selectedRolloutKey === key && "ring-2 ring-blue-400")}
                    >
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 z-10 h-7 w-7"
                        onClick={() => toggleFavorite(key)}
                      >
                        <Star className={cn("h-3.5 w-3.5", favoriteKeys.has(key) && "fill-current text-amber-500")} />
                      </Button>
                      <RolloutCard rollout={rollout} />
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <RolloutsTable
              rollouts={filteredRollouts}
              favoriteKeys={favoriteKeys}
              onToggleFavorite={toggleFavorite}
              selectedRolloutKey={selectedRolloutKey}
            />
          )}
        </div>
      </div>

      <Dialog open={showShortcutHelp} onOpenChange={setShowShortcutHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>Use shortcuts to navigate rollouts faster.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Focus search</span><code>/</code></div>
            <div className="flex items-center justify-between"><span>Move selection</span><code>↑ / ↓</code></div>
            <div className="flex items-center justify-between"><span>Open selected rollout</span><code>Enter</code></div>
            <div className="flex items-center justify-between"><span>Clear selection</span><code>Esc</code></div>
            <div className="flex items-center justify-between"><span>Open shortcut help</span><code>Shift + H</code></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

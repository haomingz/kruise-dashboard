import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { MainNav } from "@/components/main-nav"
import { NamespaceSelector } from "@/components/namespace-selector"
import { Overview } from "@/components/overview"
import { RolloutVisualization } from "@/components/rollout-visualization"
import { WorkloadCards } from "@/components/workload-cards"
import { WorkloadTabs } from "@/components/workload-tabs"

export function DashboardPage() {

  return (
    <div className="flex h-dvh flex-col bg-muted/40 overflow-hidden">
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 min-h-14 items-center gap-4 px-4 py-2 sm:pl-6 sm:pr-6 sm:py-0 min-w-0">
          <MainNav className="min-w-0 flex-1 shrink" />
          <NamespaceSelector />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-w-0 space-y-4 p-3 sm:p-6">
          <DashboardShell>
            <DashboardHeader
              heading="Dashboard"
              text="Monitor and manage your OpenKruise workloads"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 items-start">
              <div className="min-w-0 md:col-span-1 lg:col-span-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <WorkloadCards />
              </div>
              <div className="min-w-0 md:col-span-1 lg:col-span-2">
                <Overview />
              </div>
            </div>
            <WorkloadTabs />
            <RolloutVisualization />
          </DashboardShell>
        </div>
      </div>
    </div>
  )
}

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
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto">
            <NamespaceSelector />
          </div>
        </div>
      </div>
      <div className="flex flex-1">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <DashboardShell>
            <DashboardHeader
              heading="OpenKruise Dashboard"
              text="Monitor and manage your Kubernetes extended components"
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <WorkloadCards />
            </div>
            <Overview />
            <WorkloadTabs />
            <RolloutVisualization />
          </DashboardShell>
        </div>
      </div>
    </div>
  )
}

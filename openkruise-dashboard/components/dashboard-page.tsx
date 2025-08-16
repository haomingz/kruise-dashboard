"use client"

import { useState } from "react"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { MainNav } from "@/components/main-nav"
import { Overview } from "@/components/overview"
import { RecentActivity } from "@/components/recent-activity"
import { RolloutVisualization } from "@/components/rollout-visualization"
import { WorkloadCards } from "@/components/workload-cards"
import { WorkloadTabs } from "@/components/workload-tabs"

export function DashboardPage() {

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
         
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Overview className="lg:col-span-4" />
              <RecentActivity className="lg:col-span-3" />
            </div>
            <WorkloadTabs />
            <RolloutVisualization />
          </DashboardShell>
        </div>
      </div>
    </div>
  )
}

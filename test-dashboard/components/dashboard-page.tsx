"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Overview } from "@/components/overview"
import { RecentActivity } from "@/components/recent-activity"
import { RolloutVisualization } from "@/components/rollout-visualization"
import { WorkloadCards } from "@/components/workload-cards"
import { WorkloadTabs } from "@/components/workload-tabs"
import { Col, Layout, Row } from "antd"

export function DashboardPage() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <DashboardShell>
        <DashboardHeader
          heading="OpenKruise Dashboard"
          text="Monitor and manage your Kubernetes extended components"
        />
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <WorkloadCards />
          </Col>
          <Col span={24}>
            <Row gutter={[24, 24]}>
              <Col span={14}>
                <Overview />
              </Col>
              <Col span={10}>
                <RecentActivity />
              </Col>
            </Row>
          </Col>
        </Row>
        <WorkloadTabs />
        <RolloutVisualization />
      </DashboardShell>
    </Layout>
  )
}

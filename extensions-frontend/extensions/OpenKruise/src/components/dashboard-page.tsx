import { DashboardHeader } from "./dashboard-header"
import { DashboardShell } from "./dashboard-shell"
import { Overview } from "./overview"
import { RecentActivity } from "./recent-activity"
import { RolloutVisualization } from "./rollout-visualization"
import { WorkloadCards } from "./workload-cards"
import { WorkloadTabs } from "./workload-tabs"
import { Col, Layout, Row } from "antd"
import React from "react"
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

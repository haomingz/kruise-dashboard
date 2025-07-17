import { Card, Col, Progress, Row, Typography } from "antd"
import React from "react"

interface OverviewProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Overview({ className, ...props }: OverviewProps) {
  return (
    <Card className={className} {...props} title="Cluster Overview" bordered>
      <Typography.Text type="secondary">
        Resource utilization across your Kubernetes cluster
      </Typography.Text>
      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 32 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>CPU</Col>
            <Col span={16}><Progress percent={65} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">65%</Typography.Text></Col>
          </Row>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>Memory</Col>
            <Col span={16}><Progress percent={78} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">78%</Typography.Text></Col>
          </Row>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>Storage</Col>
            <Col span={16}><Progress percent={42} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">42%</Typography.Text></Col>
          </Row>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>Network</Col>
            <Col span={16}><Progress percent={35} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">35%</Typography.Text></Col>
          </Row>
        </div>
        <Row gutter={24}>
          <Col span={12}>
            <Typography.Text strong>Nodes</Typography.Text>
            <Row justify="space-between">
              <Col>Total</Col>
              <Col><Typography.Text strong>12</Typography.Text></Col>
            </Row>
            <Row justify="space-between">
              <Col>Ready</Col>
              <Col><Typography.Text strong>12</Typography.Text></Col>
            </Row>
          </Col>
          <Col span={12}>
            <Typography.Text strong>Pods</Typography.Text>
            <Row justify="space-between">
              <Col>Total</Col>
              <Col><Typography.Text strong>248</Typography.Text></Col>
            </Row>
            <Row justify="space-between">
              <Col>Running</Col>
              <Col><Typography.Text strong>235</Typography.Text></Col>
            </Row>
          </Col>
        </Row>
      </div>
    </Card>
  )
}

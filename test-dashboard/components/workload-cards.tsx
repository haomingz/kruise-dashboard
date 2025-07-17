import {
  AppstoreOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  NodeIndexOutlined
} from "@ant-design/icons"
import { Card, Col, Row, Typography } from "antd"

export function WorkloadCards() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>CloneSets</Typography.Text>
            <AppstoreOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>24</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>18 healthy, 6 updating</Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>Advanced StatefulSets</Typography.Text>
            <DatabaseOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>12</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>10 healthy, 2 scaling</Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>Advanced DaemonSets</Typography.Text>
            <DatabaseOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>8</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>8 healthy</Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>BroadcastJobs</Typography.Text>
            <DeploymentUnitOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>5</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>3 completed, 2 running</Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>Active Rollouts</Typography.Text>
            <NodeIndexOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>7</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>4 canary, 2 blue-green, 1 A/B test</Typography.Text>
        </Card>
      </Col>
    </Row>
  )
}

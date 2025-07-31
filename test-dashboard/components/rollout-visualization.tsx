import {
  ArrowRightOutlined,
  CheckCircleTwoTone,
  DatabaseOutlined,
  SyncOutlined
} from "@ant-design/icons"
import { Badge, Button, Card, Col, Progress, Row, Space, Tabs, Typography } from "antd"

const { TabPane } = Tabs

export function RolloutVisualization() {
  return (
    <Card title="Rollout Visualization" bordered>
      <Typography.Text type="secondary">
        Visual representation of different rollout strategies
      </Typography.Text>
      <Tabs defaultActiveKey="canary" style={{ marginTop: 16 }}>
        <TabPane tab="Canary" key="canary">
          <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Space>
                <Badge count={null} style={{ backgroundColor: '#fff', border: '1px solid #d9d9d9' }}>
                  <span style={{ padding: '2px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }}>Canary Deployment</span>
                </Badge>
                <Typography.Text>frontend-canary</Typography.Text>
              </Space>
              <Space>
                <Badge count={null} style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff' }}>
                  <span style={{ padding: '2px 8px', border: '1px solid #91d5ff', borderRadius: 4 }}>Batch 2/3</span>
                </Badge>
                <SyncOutlined spin style={{ color: '#faad14', fontSize: 18 }} />
              </Space>
            </Row>
            <div style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>Traffic Split</Col>
                <Col>70% stable / 30% canary</Col>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Col span={17}>
                  <Progress percent={70} showInfo={false} strokeColor="#52c41a" style={{ marginBottom: 0 }} />
                </Col>
                <Col span={7}>
                  <Progress percent={30} showInfo={false} strokeColor="#1890ff" style={{ marginBottom: 0 }} />
                </Col>
              </Row>
            </div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={14}>
                <Typography.Text strong>Stable Version (v1.0)</Typography.Text>
                <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Col key={`stable-${i}`} span={3}>
                      <div style={{ background: '#f6ffed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                        <DatabaseOutlined style={{ color: '#52c41a', fontSize: 22 }} />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
              <Col span={10}>
                <Typography.Text strong>Canary Version (v1.1)</Typography.Text>
                <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Col key={`canary-${i}`} span={8}>
                      <div style={{ background: '#e6f7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                        <DatabaseOutlined style={{ color: '#1890ff', fontSize: 22 }} />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
            <Row justify="end" gutter={8}>
              <Col>
                <Button type="default" size="small">Rollback</Button>
              </Col>
              <Col>
                <Button type="primary" size="small">Proceed to Next Batch</Button>
              </Col>
            </Row>
          </div>
        </TabPane>
        <TabPane tab="Blue-Green" key="bluegreen">
          <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Space>
                <Badge count={null} style={{ backgroundColor: '#fff', border: '1px solid #d9d9d9' }}>
                  <span style={{ padding: '2px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }}>Blue-Green Deployment</span>
                </Badge>
                <Typography.Text>api-bluegreen</Typography.Text>
              </Space>
              <Space>
                <Badge count={null} style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <span style={{ padding: '2px 8px', border: '1px solid #b7eb8f', borderRadius: 4 }}>Ready to Switch</span>
                </Badge>
                <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 18 }} />
              </Space>
            </Row>
            <div style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>Traffic Routing</Col>
                <Col>100% Blue / 0% Green</Col>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Col span={24}>
                  <Progress percent={100} showInfo={false} strokeColor="#1890ff" style={{ marginBottom: 0 }} />
                </Col>
              </Row>
            </div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Space>
                  <Typography.Text strong>Blue Environment (Active)</Typography.Text>
                  <Badge color="#1890ff" text="v1.0" />
                </Space>
                <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Col key={`blue-${i}`} span={4}>
                      <div style={{ background: '#e6f7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                        <DatabaseOutlined style={{ color: '#1890ff', fontSize: 22 }} />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
              <Col span={12}>
                <Space>
                  <Typography.Text strong>Green Environment (Ready)</Typography.Text>
                  <Badge color="#52c41a" text="v1.1" />
                </Space>
                <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Col key={`green-${i}`} span={4}>
                      <div style={{ background: '#f6ffed', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                        <DatabaseOutlined style={{ color: '#52c41a', fontSize: 22 }} />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
            <Row justify="center">
              <Button type="primary" icon={<ArrowRightOutlined />}>
                Switch Traffic to Green
              </Button>
            </Row>
          </div>
        </TabPane>
        <TabPane tab="A/B Testing" key="ab">
          <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Space>
                <Badge count={null} style={{ backgroundColor: '#fff', border: '1px solid #d9d9d9' }}>
                  <span style={{ padding: '2px 8px', border: '1px solid #d9d9d9', borderRadius: 4 }}>A/B Testing</span>
                </Badge>
                <Typography.Text>checkout-ab</Typography.Text>
              </Space>
              <Space>
                <Badge count={null} style={{ backgroundColor: '#f9f0ff', border: '1px solid #d3adf7' }}>
                  <span style={{ padding: '2px 8px', border: '1px solid #d3adf7', borderRadius: 4 }}>Testing</span>
                </Badge>
                <SyncOutlined style={{ color: '#faad14', fontSize: 18 }} />
              </Space>
            </Row>
            <div style={{ marginBottom: 16 }}>
              <Row justify="space-between" align="middle">
                <Col>Traffic Split</Col>
                <Col>50% A / 50% B</Col>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Progress percent={50} showInfo={false} strokeColor="#722ed1" style={{ marginBottom: 0 }} />
                </Col>
                <Col span={12}>
                  <Progress percent={50} showInfo={false} strokeColor="#722ed1" style={{ marginBottom: 0 }} />
                </Col>
              </Row>
            </div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Row justify="space-between">
                  <Col><Typography.Text strong>Version A (Original)</Typography.Text></Col>
                  <Col><Typography.Text type="secondary">Conversion: 3.2%</Typography.Text></Col>
                </Row>
                <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Col key={`a-${i}`} span={6}>
                      <div style={{ background: '#f9f0ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                        <DatabaseOutlined style={{ color: '#722ed1', fontSize: 22 }} />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
              <Col span={12}>
                <Row justify="space-between">
                  <Col><Typography.Text strong>Version B (New)</Typography.Text></Col>
                  <Col><Typography.Text type="secondary">Conversion: 4.1%</Typography.Text></Col>
                </Row>
                <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Col key={`b-${i}`} span={6}>
                      <div style={{ background: '#f9f0ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}>
                        <DatabaseOutlined style={{ color: '#722ed1', fontSize: 22 }} />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
            <Row justify="end" gutter={8}>
              <Col>
                <Button type="default" size="small">End Test</Button>
              </Col>
              <Col>
                <Button type="primary" size="small">Promote Version B</Button>
              </Col>
            </Row>
          </div>
        </TabPane>
      </Tabs>
    </Card>
  )
}

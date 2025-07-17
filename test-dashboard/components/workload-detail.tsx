import {
  ArrowUpOutlined,
  CheckCircleTwoTone,
  CodeOutlined,
  CpuOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileTextOutlined,
  HddOutlined,
  MoreOutlined,
  ReloadOutlined,
  ServerOutlined
} from "@ant-design/icons"
import {
  Badge,
  Button,
  Card,
  Collapse,
  Dropdown,
  Menu,
  Progress,
  Space,
  Table,
  Tabs,
  Typography,
} from "antd"

const { TabPane } = Tabs
const { Panel } = Collapse

export function WorkloadDetail() {
  // Example data for tables (replace with real data as needed)
  const podsData = [
    {
      key: '0',
      name: 'web-frontend-0',
      status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Running</span>,
      restarts: 0,
      age: '2d',
      ip: '10.244.0.15',
      node: 'worker-1',
    },
    {
      key: '1',
      name: 'web-frontend-1',
      status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Running</span>,
      restarts: 0,
      age: '2d',
      ip: '10.244.0.16',
      node: 'worker-1',
    },
    {
      key: '2',
      name: 'web-frontend-2',
      status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Running</span>,
      restarts: 1,
      age: '2d',
      ip: '10.244.0.17',
      node: 'worker-2',
    },
    {
      key: '3',
      name: 'web-frontend-3',
      status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Running</span>,
      restarts: 0,
      age: '2d',
      ip: '10.244.0.18',
      node: 'worker-2',
    },
    {
      key: '4',
      name: 'web-frontend-4',
      status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Running</span>,
      restarts: 0,
      age: '2d',
      ip: '10.244.0.19',
      node: 'worker-3',
    },
  ]
  const podsColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (text: string) => <Typography.Text strong>{text}</Typography.Text> },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Restarts', dataIndex: 'restarts', key: 'restarts' },
    { title: 'Age', dataIndex: 'age', key: 'age' },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
    { title: 'Node', dataIndex: 'node', key: 'node' },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: () => <Button icon={<EllipsisOutlined />} size="small" />,
    },
  ]

  const eventsData = [
    {
      key: '1',
      type: <Badge color="green" text="Normal" />, reason: 'ScalingReplicaSet', age: '2d', from: 'cloneset-controller', message: 'Scaled up replica set web-frontend to 5',
    },
    {
      key: '2',
      type: <Badge color="green" text="Normal" />, reason: 'SuccessfulCreate', age: '2d', from: 'cloneset-controller', message: 'Created pod: web-frontend-0',
    },
    {
      key: '3',
      type: <Badge color="green" text="Normal" />, reason: 'SuccessfulCreate', age: '2d', from: 'cloneset-controller', message: 'Created pod: web-frontend-1',
    },
    {
      key: '4',
      type: <Badge color="green" text="Normal" />, reason: 'SuccessfulCreate', age: '2d', from: 'cloneset-controller', message: 'Created pod: web-frontend-2',
    },
    {
      key: '5',
      type: <Badge color="orange" text="Warning" />, reason: 'FailedScheduling', age: '2d', from: 'default-scheduler', message: '0/3 nodes are available: 3 Insufficient memory',
    },
    {
      key: '6',
      type: <Badge color="green" text="Normal" />, reason: 'SuccessfulCreate', age: '2d', from: 'cloneset-controller', message: 'Created pod: web-frontend-3',
    },
    {
      key: '7',
      type: <Badge color="green" text="Normal" />, reason: 'SuccessfulCreate', age: '2d', from: 'cloneset-controller', message: 'Created pod: web-frontend-4',
    },
  ]
  const eventsColumns = [
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Reason', dataIndex: 'reason', key: 'reason' },
    { title: 'Age', dataIndex: 'age', key: 'age' },
    { title: 'From', dataIndex: 'from', key: 'from' },
    { title: 'Message', dataIndex: 'message', key: 'message', render: (text: string) => <Typography.Text code>{text}</Typography.Text> },
  ]

  const menu = (
    <Menu>
      <Menu.Item icon={<ArrowUpOutlined />}>Scale</Menu.Item>
      <Menu.Item icon={<ReloadOutlined />}>Restart</Menu.Item>
      <Menu.Item icon={<CodeOutlined />}>View YAML</Menu.Item>
      <Menu.Divider />
      <Menu.Item icon={<DeleteOutlined />} danger>Delete</Menu.Item>
    </Menu>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Typography.Title level={3}>CloneSet: web-frontend</Typography.Title>
          <Typography.Text type="secondary">Namespace: default • Created 2 days ago</Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} size="small">Refresh</Button>
          <Button icon={<EditOutlined />} size="small">Edit</Button>
          <Dropdown overlay={menu} placement="bottomRight">
            <Button icon={<MoreOutlined />} size="small" />
          </Dropdown>
        </Space>
      </div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: 24 }}>
        <Card>
          <Card.Meta
            title={<Typography.Text strong>Status</Typography.Text>}
            description={<span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 8 }} />Healthy</span>}
          />
        </Card>
        <Card>
          <Card.Meta
            title={<Typography.Text strong>Replicas</Typography.Text>}
            description={<span style={{ fontSize: 22, fontWeight: 700 }}>5/5 <Badge count="100%" style={{ backgroundColor: '#f0f0f0', color: '#333', marginLeft: 8 }} /></span>}
          />
        </Card>
        <Card>
          <Card.Meta
            title={<Typography.Text strong>Update Strategy</Typography.Text>}
            description={<span><Badge color="blue" text="In-place" /> <Badge color="default" text="Partition: 0" /></span>}
          />
        </Card>
      </div>
      <Tabs defaultActiveKey="overview" type="card">
        <TabPane tab="Overview" key="overview">
          <Card title="Workload Specifications" bordered style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">Basic configuration and settings</Typography.Text>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
              <div>
                <Typography.Title level={5}>Basic Information</Typography.Title>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div><Typography.Text type="secondary">Name</Typography.Text>: web-frontend</div>
                  <div><Typography.Text type="secondary">Namespace</Typography.Text>: default</div>
                  <div><Typography.Text type="secondary">Created</Typography.Text>: 2023-07-15 08:24:31</div>
                  <div><Typography.Text type="secondary">UID</Typography.Text>: a1b2c3d4-e5f6-7890-a1b2-c3d4e5f67890</div>
                </div>
                <Typography.Title level={5}>Scaling</Typography.Title>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                  <div><Typography.Text type="secondary">Replicas</Typography.Text>: 5</div>
                  <div><Typography.Text type="secondary">Min Ready Seconds</Typography.Text>: 10</div>
                  <div><Typography.Text type="secondary">Scale Strategy</Typography.Text>: <Badge color="default" text="Parallel" /></div>
                </div>
              </div>
              <div>
                <Typography.Title level={5}>Update Strategy</Typography.Title>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div><Typography.Text type="secondary">Type</Typography.Text>: <Badge color="blue" text="In-place" /></div>
                  <div><Typography.Text type="secondary">Partition</Typography.Text>: 0</div>
                  <div><Typography.Text type="secondary">Max Unavailable</Typography.Text>: 20%</div>
                  <div><Typography.Text type="secondary">Max Surge</Typography.Text>: 0</div>
                </div>
                <Typography.Title level={5}>Selector</Typography.Title>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                  <Typography.Text type="secondary">Match Labels</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <Badge color="default" text="app=web-frontend" style={{ marginRight: 8 }} />
                    <Badge color="default" text="tier=frontend" style={{ marginRight: 8 }} />
                    <Badge color="default" text="environment=production" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card title="Resource Usage" bordered style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">CPU and memory usage across pods</Typography.Text>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Space>
                  <CpuOutlined style={{ color: '#bfbfbf' }} />
                  <Typography.Text>CPU</Typography.Text>
                </Space>
                <Typography.Text type="secondary">245m / 1000m</Typography.Text>
              </div>
              <Progress percent={24.5} showInfo={false} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px 0' }}>
                <Space>
                  <HddOutlined style={{ color: '#bfbfbf' }} />
                  <Typography.Text>Memory</Typography.Text>
                </Space>
                <Typography.Text type="secondary">512Mi / 2048Mi</Typography.Text>
              </div>
              <Progress percent={25} showInfo={false} />
            </div>
          </Card>
          <Card title="Container Specifications" bordered>
            <Typography.Text type="secondary">Container images and configurations</Typography.Text>
            <Collapse bordered style={{ marginTop: 16 }}>
              <Panel
                header={
                  <Space>
                    <ServerOutlined style={{ color: '#bfbfbf' }} />
                    <Typography.Text strong>web-frontend</Typography.Text>
                    <Typography.Text type="secondary">nginx:1.21.6-alpine</Typography.Text>
                  </Space>
                }
                key="1"
                extra={<DownOutlined />}
              >
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <Typography.Text strong>Environment Variables</Typography.Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <Typography.Text type="secondary">NODE_ENV</Typography.Text>
                    <span>production</span>
                    <Typography.Text type="secondary">API_URL</Typography.Text>
                    <span>https://api.example.com</span>
                    <Typography.Text type="secondary">LOG_LEVEL</Typography.Text>
                    <span>info</span>
                  </div>
                </div>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <Typography.Text strong>Resource Requests & Limits</Typography.Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                    <span></span>
                    <Typography.Text type="secondary">Requests</Typography.Text>
                    <Typography.Text type="secondary">Limits</Typography.Text>
                    <Typography.Text type="secondary">CPU</Typography.Text>
                    <span>200m</span>
                    <span>1000m</span>
                    <Typography.Text type="secondary">Memory</Typography.Text>
                    <span>256Mi</span>
                    <span>2048Mi</span>
                  </div>
                </div>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                  <Typography.Text strong>Ports</Typography.Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                    <Typography.Text type="secondary">Name</Typography.Text>
                    <Typography.Text type="secondary">Container Port</Typography.Text>
                    <Typography.Text type="secondary">Protocol</Typography.Text>
                    <span>http</span>
                    <span>80</span>
                    <span>TCP</span>
                    <span>https</span>
                    <span>443</span>
                    <span>TCP</span>
                  </div>
                </div>
              </Panel>
            </Collapse>
          </Card>
        </TabPane>
        <TabPane tab="Pods" key="pods">
          <Card title="Managed Pods" bordered style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">Pods managed by this CloneSet</Typography.Text>
            <Table
              columns={podsColumns}
              dataSource={podsData}
              pagination={false}
              style={{ marginTop: 16 }}
            />
          </Card>
          <Card title="Pod Details" bordered>
            <div style={{ textAlign: 'center', padding: 32 }}>
              <ServerOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
              <Typography.Title level={5} style={{ marginTop: 16 }}>No pod selected</Typography.Title>
              <Typography.Text type="secondary">Click on a pod in the table above to view its details</Typography.Text>
            </div>
          </Card>
        </TabPane>
        <TabPane tab="Events" key="events">
          <Card title="Recent Events" bordered>
            <Typography.Text type="secondary">Events related to this CloneSet</Typography.Text>
            <Table
              columns={eventsColumns}
              dataSource={eventsData}
              pagination={false}
              style={{ marginTop: 16 }}
            />
          </Card>
        </TabPane>
        <TabPane tab="YAML" key="yaml">
          <Card title="YAML Configuration" bordered>
            <Typography.Text type="secondary">Raw YAML configuration for this CloneSet</Typography.Text>
            <div style={{ position: 'relative', marginTop: 16 }}>
              <Button icon={<FileTextOutlined />} size="small" style={{ position: 'absolute', right: 16, top: 16 }}>
                Open in Editor
              </Button>
              <pre style={{ maxHeight: 600, overflow: 'auto', borderRadius: 8, background: '#f5f5f5', padding: 16, fontSize: 13 }}>
                {`apiVersion: apps.kruise.io/v1alpha1
kind: CloneSet
metadata:
  name: web-frontend
  namespace: default
  labels:
    app: web-frontend
    tier: frontend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-frontend
      tier: frontend
      environment: production
  template:
    metadata:
      labels:
        app: web-frontend
        tier: frontend
        environment: production
    spec:
      containers:
      - name: web-frontend
        image: nginx:1.21.6-alpine
        ports:
        - name: http
          containerPort: 80
          protocol: TCP
        - name: https
          containerPort: 443
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_URL
          value: "https://api.example.com"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 2048Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
  updateStrategy:
    type: InPlaceIfPossible
    maxUnavailable: 20%
    maxSurge: 0
    partition: 0
  minReadySeconds: 10
  scaleStrategy:
    podsToDelete:
    - web-frontend-3`}
              </pre>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  LinkOutlined,
  SyncOutlined
} from "@ant-design/icons"
import React from "react"
import { Button, Card, Table, Tabs, Typography } from "antd"
import Link from "antd/es/typography/Link"

const { TabPane } = Tabs

const clonesetData = [
  {
    key: '1',
    name: 'web-frontend',
    namespace: 'default',
    replicas: '5/5',
    status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Healthy</span>,
    updateStrategy: 'In-place',
    age: '2d',
    link: '/workloads/web-frontend',
  },
  {
    key: '2',
    name: 'api-service',
    namespace: 'backend',
    replicas: '3/3',
    status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Healthy</span>,
    updateStrategy: 'In-place',
    age: '5d',
    link: '/workloads/api-service',
  },
  {
    key: '3',
    name: 'cache-service',
    namespace: 'backend',
    replicas: '2/3',
    status: <span><SyncOutlined spin style={{ color: '#faad14', marginRight: 6 }} />Updating</span>,
    updateStrategy: 'In-place',
    age: '1d',
    link: '/workloads/cache-service',
  },
  {
    key: '4',
    name: 'auth-service',
    namespace: 'security',
    replicas: '2/2',
    status: <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Healthy</span>,
    updateStrategy: 'Recreate',
    age: '7d',
    link: '/workloads/auth-service',
  },
  {
    key: '5',
    name: 'analytics',
    namespace: 'monitoring',
    replicas: '0/2',
    status: <span><CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 6 }} />Failed</span>,
    updateStrategy: 'In-place',
    age: '12h',
    link: '/workloads/analytics',
  },
]

const clonesetColumns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text: string, record: any) => <Link href={record.link}><Typography.Link>{text}</Typography.Link></Link>,
  },
  { title: 'Namespace', dataIndex: 'namespace', key: 'namespace' },
  { title: 'Replicas', dataIndex: 'replicas', key: 'replicas' },
  { title: 'Status', dataIndex: 'status', key: 'status' },
  { title: 'Update Strategy', dataIndex: 'updateStrategy', key: 'updateStrategy' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  {
    title: 'Actions',
    key: 'actions',
    render: (_: any, record: any) => (
      <Button type="link" size="small" icon={<LinkOutlined />} href={record.link}>
        View
      </Button>
    ),
    align: 'right' as const,
  },
]

export function WorkloadTabs() {
  return (
    <Tabs defaultActiveKey="clonesets" style={{ marginTop: 24 }}>
      <TabPane tab="CloneSets" key="clonesets">
        <Card title="CloneSets" bordered>
          <Typography.Text type="secondary">
            Enhanced workload for stateless applications with advanced features
          </Typography.Text>
          <Table
            columns={clonesetColumns}
            dataSource={clonesetData}
            pagination={false}
            style={{ marginTop: 16 }}
          />
        </Card>
      </TabPane>
      {/* Repeat similar structure for other tabs: Advanced StatefulSets, Advanced DaemonSets, SidecarSets, Rollouts */}
    </Tabs>
  )
}

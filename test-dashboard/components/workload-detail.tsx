"use client"
import {
  ArrowUpOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  ExclamationCircleTwoTone,
  FileTextOutlined,
  MoreOutlined,
  ReloadOutlined,
  SyncOutlined
} from "@ant-design/icons"
import {
  Badge,
  Button,
  Card,
  Collapse,
  Dropdown,
  Menu,
  Space,
  Spin,
  Table,
  Tabs,
  Typography
} from "antd"
import React, { useEffect, useState } from "react"
import { getWorkloadWithPods } from "../api/workload"

const { TabPane } = Tabs
const { Panel } = Collapse

interface WorkloadDetailProps {
  workloadId: string
}

export function WorkloadDetail({ workloadId }: WorkloadDetailProps) {
  const [workloadData, setWorkloadData] = useState<any>(null)
  const [podsData, setPodsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Parse workloadId to extract type, namespace, and name
  const parseWorkloadId = (id: string) => {
    const parts = id.split('-')
    if (parts.length < 3) {
      throw new Error('Invalid workload ID format')
    }
    const type = parts[0]
    const namespace = parts[1]
    const name = parts.slice(2).join('-')
    return { type, namespace, name }
  }

  useEffect(() => {
    const fetchWorkloadData = async () => {
      try {
        setLoading(true)
        const { type, namespace, name } = parseWorkloadId(workloadId)
        const response = await getWorkloadWithPods(namespace, type, name)
        setWorkloadData(response.workload)
        setPodsData(response.pods || [])
        setError(null)
      } catch (err) {
        console.error('Error fetching workload data:', err)
        setError('Failed to fetch workload data')
      } finally {
        setLoading(false)
      }
    }

    if (workloadId) {
      fetchWorkloadData()
    }
  }, [workloadId])

  // Helper function to calculate age from timestamp
  const calculateAge = (creationTimestamp: string): string => {
    const created = new Date(creationTimestamp)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays > 0) {
      return `${diffDays}d`
    } else if (diffHours > 0) {
      return `${diffHours}h`
    } else {
      return '<1h'
    }
  }

  // Helper function to determine pod status
  const getPodStatus = (pod: any): React.ReactNode => {
    const status = pod.status || {}
    const phase = status.phase || 'Unknown'

    switch (phase) {
      case 'Running':
        return <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Running</span>
      case 'Pending':
        return <span><SyncOutlined spin style={{ color: '#faad14', marginRight: 6 }} />Pending</span>
      case 'Failed':
        return <span><CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 6 }} />Failed</span>
      case 'Succeeded':
        return <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Succeeded</span>
      default:
        return <span><ExclamationCircleTwoTone twoToneColor="#faad14" style={{ marginRight: 6 }} />{phase}</span>
    }
  }

  // Helper function to determine workload status
  const getWorkloadStatus = (): React.ReactNode => {
    if (!workloadData || !workloadData.status) {
      return <span><SyncOutlined spin style={{ color: '#faad14', marginRight: 8 }} />Loading</span>
    }

    const spec = workloadData.spec || {}
    const status = workloadData.status || {}

    const desiredReplicas = spec.replicas || 0
    const readyReplicas = status.readyReplicas || 0
    const replicas = status.replicas || 0

    if (readyReplicas === desiredReplicas && replicas === desiredReplicas) {
      return <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 8 }} />Healthy</span>
    } else if (readyReplicas === 0) {
      return <span><CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 8 }} />Failed</span>
    } else {
      return <span><SyncOutlined spin style={{ color: '#faad14', marginRight: 8 }} />Updating</span>
    }
  }

  // Transform pods data for table
  const transformPodsData = () => {
    return podsData.map((pod, index) => {
      const metadata = pod.metadata || {}
      const status = pod.status || {}
      const spec = pod.spec || {}

      // Calculate restart count
      const containerStatuses = status.containerStatuses || []
      const restartCount = containerStatuses.reduce((total: number, container: any) => {
        return total + (container.restartCount || 0)
      }, 0)

      return {
        key: index.toString(),
        name: metadata.name || 'Unknown',
        status: getPodStatus(pod),
        restarts: restartCount,
        age: metadata.creationTimestamp ? calculateAge(metadata.creationTimestamp) : 'Unknown',
        ip: status.podIP || 'N/A',
        node: spec.nodeName || 'N/A',
      }
    })
  }

  const renderPodName = (text: string) => <Typography.Text strong>{text}</Typography.Text>
  const renderActionButton = () => <Button icon={<EllipsisOutlined />} size="small" />

  const podsColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: renderPodName
    },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Restarts', dataIndex: 'restarts', key: 'restarts' },
    { title: 'Age', dataIndex: 'age', key: 'age' },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
    { title: 'Node', dataIndex: 'node', key: 'node' },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: renderActionButton,
    },
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

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading workload details...</div>
        </div>
      </div>
    )
  }

  if (error || !workloadData) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <Typography.Text type="danger">
          {error || 'Failed to load workload data'}
        </Typography.Text>
      </div>
    )
  }

  const metadata = workloadData.metadata || {}
  const spec = workloadData.spec || {}
  const status = workloadData.status || {}
  const { type } = parseWorkloadId(workloadId)

  const desiredReplicas = spec.replicas || 0
  const readyReplicas = status.readyReplicas || 0
  const replicas = status.replicas || 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Typography.Title level={3}>
            {type.charAt(0).toUpperCase() + type.slice(1)}: {metadata.name}
          </Typography.Title>
          <Typography.Text type="secondary">
            Namespace: {metadata.namespace} • Created {metadata.creationTimestamp ? calculateAge(metadata.creationTimestamp) : 'Unknown'} ago
          </Typography.Text>
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
            description={getWorkloadStatus()}
          />
        </Card>
        <Card>
          <Card.Meta
            title={<Typography.Text strong>Replicas</Typography.Text>}
            description={
              <span style={{ fontSize: 22, fontWeight: 700 }}>
                {readyReplicas}/{desiredReplicas}
                <Badge
                  count={`${Math.round((readyReplicas / Math.max(desiredReplicas, 1)) * 100)}%`}
                  style={{ backgroundColor: '#f0f0f0', color: '#333', marginLeft: 8 }}
                />
              </span>
            }
          />
        </Card>
        <Card>
          <Card.Meta
            title={<Typography.Text strong>Update Strategy</Typography.Text>}
            description={
              <span>
                <Badge color="blue" text={spec.updateStrategy?.type || 'Unknown'} />
                {spec.updateStrategy?.partition !== undefined && (
                  <Badge color="default" text={`Partition: ${spec.updateStrategy.partition}`} style={{ marginLeft: 8 }} />
                )}
              </span>
            }
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
                  <div><Typography.Text type="secondary">Name</Typography.Text>: {metadata.name}</div>
                  <div><Typography.Text type="secondary">Namespace</Typography.Text>: {metadata.namespace}</div>
                  <div><Typography.Text type="secondary">Created</Typography.Text>: {metadata.creationTimestamp}</div>
                  <div><Typography.Text type="secondary">UID</Typography.Text>: {metadata.uid}</div>
                </div>
                <Typography.Title level={5}>Scaling</Typography.Title>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                  <div><Typography.Text type="secondary">Replicas</Typography.Text>: {desiredReplicas}</div>
                  <div><Typography.Text type="secondary">Ready Replicas</Typography.Text>: {readyReplicas}</div>
                  <div><Typography.Text type="secondary">Current Replicas</Typography.Text>: {replicas}</div>
                </div>
              </div>
              <div>
                <Typography.Title level={5}>Update Strategy</Typography.Title>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div><Typography.Text type="secondary">Type</Typography.Text>: <Badge color="blue" text={spec.updateStrategy?.type || 'Unknown'} /></div>
                  {spec.updateStrategy?.partition !== undefined && (
                    <div><Typography.Text type="secondary">Partition</Typography.Text>: {spec.updateStrategy.partition}</div>
                  )}
                  {spec.updateStrategy?.maxUnavailable && (
                    <div><Typography.Text type="secondary">Max Unavailable</Typography.Text>: {spec.updateStrategy.maxUnavailable}</div>
                  )}
                </div>
                <Typography.Title level={5}>Selector</Typography.Title>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                  <Typography.Text type="secondary">Match Labels</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    {spec.selector?.matchLabels && Object.entries(spec.selector.matchLabels).map(([key, value]) => (
                      <Badge key={key} color="default" text={`${key}=${value}`} style={{ marginRight: 8 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabPane>

        <TabPane tab={`Pods (${podsData.length})`} key="pods">
          <Card title="Managed Pods" bordered style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">Pods managed by this {type}</Typography.Text>
            <Table
              columns={podsColumns}
              dataSource={transformPodsData()}
              pagination={podsData.length > 10 ? { pageSize: 10 } : false}
              style={{ marginTop: 16 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="YAML" key="yaml">
          <Card title="YAML Configuration" bordered>
            <Typography.Text type="secondary">Raw YAML configuration for this {type}</Typography.Text>
            <div style={{ position: 'relative', marginTop: 16 }}>
              <Button icon={<FileTextOutlined />} size="small" style={{ position: 'absolute', right: 16, top: 16 }}>
                Open in Editor
              </Button>
              <pre style={{ maxHeight: 600, overflow: 'auto', borderRadius: 8, background: '#f5f5f5', padding: 16, fontSize: 13 }}>
                {JSON.stringify(workloadData, null, 2)}
              </pre>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

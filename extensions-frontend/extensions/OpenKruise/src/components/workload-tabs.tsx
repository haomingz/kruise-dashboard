import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  LinkOutlined,
  SyncOutlined
} from "@ant-design/icons"
import { Button, Card, Spin, Table, Tabs, Typography } from "antd"
import React, { useEffect, useState } from "react"
import { listAllWorkloads } from "../api/workload"

const { TabPane } = Tabs

interface WorkloadItem {
  key: string;
  name: string;
  namespace: string;
  replicas: string;
  status: React.ReactNode;
  updateStrategy: string;
  age: string;
  image?: string;
  link: string;
}

export function WorkloadTabs() {
  const [workloadData, setWorkloadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to calculate age from timestamp
  const calculateAge = (creationTimestamp: string): string => {
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      return '<1h';
    }
  };

  // Helper function to determine status
  const getStatus = (workload: any): React.ReactNode => {
    const spec = workload.spec || {};
    const status = workload.status || {};

    const desiredReplicas = spec.replicas || 0;
    const currentReplicas = status.replicas || 0;
    const readyReplicas = status.readyReplicas || 0;
    const availableReplicas = status.availableReplicas || 0;

    if (readyReplicas === desiredReplicas && currentReplicas === desiredReplicas) {
      return <span><CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 6 }} />Healthy</span>;
    } else if (readyReplicas === 0) {
      return <span><CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 6 }} />Failed</span>;
    } else {
      return <span><SyncOutlined spin style={{ color: '#faad14', marginRight: 6 }} />Updating</span>;
    }
  };

  // Transform Kubernetes workload objects to table data
  const transformWorkloadData = (workloads: any[], workloadType: string): WorkloadItem[] => {
    return workloads.map((workload, index) => {
      const metadata = workload.metadata || {};
      const spec = workload.spec || {};
      const status = workload.status || {};

      const desiredReplicas = spec.replicas || 0;
      const readyReplicas = status.readyReplicas || 0;
      const image = spec.template?.spec?.containers?.[0]?.image || 'N/A';

      return {
        key: `${workloadType}-${index}`,
        name: metadata.name || 'Unknown',
        namespace: metadata.namespace || 'default',
        replicas: `${readyReplicas}/${desiredReplicas}`,
        status: getStatus(workload),
        updateStrategy: spec.updateStrategy?.type || 'Unknown',
        age: metadata.creationTimestamp ? calculateAge(metadata.creationTimestamp) : 'Unknown',
        image,
        link: `/workloads/${metadata.name}`
      };
    });
  };

  useEffect(() => {
    const fetchWorkloadData = async () => {
      try {
        setLoading(true);
        const response = await listAllWorkloads('default');
        setWorkloadData(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching workload data:', err);
        setError('Failed to fetch workload data');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkloadData();
  }, []);

  // Common columns for all workload tables
  const getColumns = (showImage: boolean = true) => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: WorkloadItem) => (
        <Typography.Link>{text}</Typography.Link>
      ),
    },
    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace' },
    { title: 'Replicas', dataIndex: 'replicas', key: 'replicas' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Update Strategy', dataIndex: 'updateStrategy', key: 'updateStrategy' },
    ...(showImage ? [{ title: 'Image', dataIndex: 'image', key: 'image' }] : []),
    { title: 'Age', dataIndex: 'age', key: 'age' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: WorkloadItem) => (
        <Button type="link" size="small" icon={<LinkOutlined />}>
          View
        </Button>
      ),
      align: 'right' as const,
    },
  ];

  if (loading) {
    return (
      <Card style={{ marginTop: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading workload data...</div>
        </div>
      </Card>
    );
  }

  if (error || !workloadData) {
    return (
      <Card style={{ marginTop: 24 }}>
        <Typography.Text type="danger">
          {error || 'Failed to load workload data'}
        </Typography.Text>
      </Card>
    );
  }

  const clonesetData = transformWorkloadData(workloadData.clonesets || [], 'cloneset');
  const statefulsetData = transformWorkloadData(workloadData.statefulsets || [], 'statefulset');
  const daemonsetData = transformWorkloadData(workloadData.daemonsets || [], 'daemonset');
  const broadcastjobData = transformWorkloadData(workloadData.broadcastjobs || [], 'broadcastjob');
  const cronjobData = transformWorkloadData(workloadData.advancedcronjobs || [], 'cronjob');

  return (
    <Tabs defaultActiveKey="clonesets" style={{ marginTop: 24 }}>
      <TabPane tab={`CloneSets (${clonesetData.length})`} key="clonesets">
        <Card title="CloneSets" bordered>
          <Typography.Text type="secondary">
            Enhanced workload for stateless applications with advanced features
          </Typography.Text>
          <Table
            columns={getColumns(true)}
            dataSource={clonesetData}
            pagination={clonesetData.length > 10 ? { pageSize: 10 } : false}
            style={{ marginTop: 16 }}
            size="small"
          />
        </Card>
      </TabPane>

      <TabPane tab={`Advanced StatefulSets (${statefulsetData.length})`} key="statefulsets">
        <Card title="Advanced StatefulSets" bordered>
          <Typography.Text type="secondary">
            Advanced StatefulSets with enhanced capabilities for stateful applications
          </Typography.Text>
          <Table
            columns={getColumns(true)}
            dataSource={statefulsetData}
            pagination={statefulsetData.length > 10 ? { pageSize: 10 } : false}
            style={{ marginTop: 16 }}
            size="small"
          />
        </Card>
      </TabPane>

      <TabPane tab={`Advanced DaemonSets (${daemonsetData.length})`} key="daemonsets">
        <Card title="Advanced DaemonSets" bordered>
          <Typography.Text type="secondary">
            Advanced DaemonSets with enhanced node-level workload management
          </Typography.Text>
          <Table
            columns={getColumns(true)}
            dataSource={daemonsetData}
            pagination={daemonsetData.length > 10 ? { pageSize: 10 } : false}
            style={{ marginTop: 16 }}
            size="small"
          />
        </Card>
      </TabPane>

      <TabPane tab={`BroadcastJobs (${broadcastjobData.length})`} key="broadcastjobs">
        <Card title="BroadcastJobs" bordered>
          <Typography.Text type="secondary">
            Jobs that run on all or selected nodes in the cluster
          </Typography.Text>
          <Table
            columns={getColumns(true)}
            dataSource={broadcastjobData}
            pagination={broadcastjobData.length > 10 ? { pageSize: 10 } : false}
            style={{ marginTop: 16 }}
            size="small"
          />
        </Card>
      </TabPane>

      <TabPane tab={`Advanced CronJobs (${cronjobData.length})`} key="advancedcronjobs">
        <Card title="Advanced CronJobs" bordered>
          <Typography.Text type="secondary">
            Enhanced CronJobs with advanced scheduling and lifecycle management
          </Typography.Text>
          <Table
            columns={getColumns(false)}
            dataSource={cronjobData}
            pagination={cronjobData.length > 10 ? { pageSize: 10 } : false}
            style={{ marginTop: 16 }}
            size="small"
          />
        </Card>
      </TabPane>
    </Tabs>
  )
}

import {
  AppstoreOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  NodeIndexOutlined
} from "@ant-design/icons";
import { Card, Col, Row, Spin, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { listAllWorkloads } from "../api/workload";

interface WorkloadStats {
  total: number;
  healthy: number;
  updating: number;
  other?: number;
}

interface WorkloadData {
  clonesets: WorkloadStats;
  statefulsets: WorkloadStats;
  daemonsets: WorkloadStats;
  broadcastjobs: WorkloadStats;
  advancedcronjobs: WorkloadStats;
}

export function WorkloadCards() {
  const [workloadData, setWorkloadData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateWorkloadStats = (workloads: any[], workloadType: string): WorkloadStats => {
    if (!workloads || workloads.length === 0) {
      return { total: 0, healthy: 0, updating: 0 };
    }

    let healthy = 0;
    let updating = 0;

    workloads.forEach((workload: any) => {
      const spec = workload.spec || {};
      const status = workload.status || {};

      const desiredReplicas = spec.replicas || 0;
      const currentReplicas = status.replicas || 0;
      const readyReplicas = status.readyReplicas || 0;
      const updatedReplicas = status.updatedReplicas || 0;

      // Determine if workload is healthy or updating
      const isFullyReady = readyReplicas === desiredReplicas;
      const isFullyUpdated = updatedReplicas === desiredReplicas;
      const isStable = currentReplicas === desiredReplicas;

      if (isFullyReady && isFullyUpdated && isStable) {
        healthy++;
      } else {
        updating++;
      }
    });

    return {
      total: workloads.length,
      healthy,
      updating
    };
  };

  useEffect(() => {
    const fetchWorkloadData = async () => {
      try {
        setLoading(true);
        const response = await listAllWorkloads('default');

        const stats: WorkloadData = {
          clonesets: calculateWorkloadStats(response.clonesets, 'clonesets'),
          statefulsets: calculateWorkloadStats(response.statefulsets, 'statefulsets'),
          daemonsets: calculateWorkloadStats(response.daemonsets, 'daemonsets'),
          broadcastjobs: calculateWorkloadStats(response.broadcastjobs, 'broadcastjobs'),
          advancedcronjobs: calculateWorkloadStats(response.advancedcronjobs, 'advancedcronjobs')
        };

        console.log(stats)

        setWorkloadData(stats);
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

  const formatStatusText = (healthy: number, updating: number, workloadType: string): string => {
    if (workloadType === 'broadcastjobs') {
      // For broadcast jobs, we might want different terminology
      return `${healthy} completed, ${updating} running`;
    }

    if (updating === 0) {
      return `${healthy} healthy`;
    }

    return `${healthy} healthy, ${updating} updating`;
  };

  if (loading) {
    return (
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Col xs={24} sm={12} md={12} lg={6} xl={6} key={i}>
            <Card>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size="small" />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (error || !workloadData) {
    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Typography.Text type="danger">
              {error || 'Failed to load workload data'}
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>CloneSets</Typography.Text>
            <AppstoreOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{workloadData.clonesets.total}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatStatusText(workloadData.clonesets.healthy, workloadData.clonesets.updating, 'clonesets')}
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>Advanced StatefulSets</Typography.Text>
            <DatabaseOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{workloadData.statefulsets.total}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatStatusText(workloadData.statefulsets.healthy, workloadData.statefulsets.updating, 'statefulsets')}
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>Advanced DaemonSets</Typography.Text>
            <DatabaseOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{workloadData.daemonsets.total}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatStatusText(workloadData.daemonsets.healthy, workloadData.daemonsets.updating, 'daemonsets')}
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>BroadcastJobs</Typography.Text>
            <DeploymentUnitOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{workloadData.broadcastjobs.total}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatStatusText(workloadData.broadcastjobs.healthy, workloadData.broadcastjobs.updating, 'broadcastjobs')}
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={12} lg={6} xl={6}>
        <Card>
          <Row justify="space-between" align="middle">
            <Typography.Text strong>Advanced CronJobs</Typography.Text>
            <NodeIndexOutlined style={{ fontSize: 18, color: '#bfbfbf' }} />
          </Row>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{workloadData.advancedcronjobs.total}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatStatusText(workloadData.advancedcronjobs.healthy, workloadData.advancedcronjobs.updating, 'advancedcronjobs')}
          </Typography.Text>
        </Card>
      </Col>
    </Row>
  )
}

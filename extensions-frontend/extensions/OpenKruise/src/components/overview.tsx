import { Alert, Card, Col, Progress, Row, Spin, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { ClusterMetrics, getClusterMetrics } from "../api";

interface OverviewProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Overview({ className, ...props }: OverviewProps) {
  const [metrics, setMetrics] = useState<ClusterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await getClusterMetrics();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch cluster metrics');
        console.error('Error fetching cluster metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

  }, []);

  if (loading && !metrics) {
    return (
      <Card className={className} {...props} title="Cluster Overview" bordered>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading cluster metrics...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className} {...props} title="Cluster Overview" bordered>
        <Alert
          message="Error Loading Metrics"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  // Extract metrics with fallback values
  const cpuUsage = metrics?.cpuUsage || 0;
  const memoryUsage = metrics?.memoryUsage || 0;
  const storageUsage = metrics?.storageUsage || 0;
  const networkUsage = metrics?.networkUsage || 0;
  const nodeCount = metrics?.nodeCount || 0;
  const readyNodes = metrics?.readyNodes || 0;
  const podCount = metrics?.podCount || 0;
  const runningPods = metrics?.runningPods || 0;

  return (
    <Card className={className} {...props} title="Cluster Overview" bordered>
      <Typography.Text type="secondary">
        Resource utilization across your Kubernetes cluster
      </Typography.Text>
      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 32 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>CPU</Col>
            <Col span={16}><Progress percent={Math.round(cpuUsage)} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">{Math.round(cpuUsage)}%</Typography.Text></Col>
          </Row>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>Memory</Col>
            <Col span={16}><Progress percent={Math.round(memoryUsage)} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">{Math.round(memoryUsage)}%</Typography.Text></Col>
          </Row>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>Storage</Col>
            <Col span={16}><Progress percent={Math.round(storageUsage)} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">{Math.round(storageUsage)}%</Typography.Text></Col>
          </Row>
          <Row gutter={[16, 16]} align="middle">
            <Col span={4} style={{ textAlign: "right", fontWeight: 500 }}>Network</Col>
            <Col span={16}><Progress percent={Math.round(networkUsage)} showInfo={false} /></Col>
            <Col span={4}><Typography.Text type="secondary">{Math.round(networkUsage)}%</Typography.Text></Col>
          </Row>
        </div>
        <Row gutter={24}>
          <Col span={12}>
            <Typography.Text strong>Nodes</Typography.Text>
            <Row justify="space-between">
              <Col>Total</Col>
              <Col><Typography.Text strong>{nodeCount}</Typography.Text></Col>
            </Row>
            <Row justify="space-between">
              <Col>Ready</Col>
              <Col><Typography.Text strong>{readyNodes}</Typography.Text></Col>
            </Row>
          </Col>
          <Col span={12}>
            <Typography.Text strong>Pods</Typography.Text>
            <Row justify="space-between">
              <Col>Total</Col>
              <Col><Typography.Text strong>{podCount}</Typography.Text></Col>
            </Row>
            <Row justify="space-between">
              <Col>Running</Col>
              <Col><Typography.Text strong>{runningPods}</Typography.Text></Col>
            </Row>
          </Col>
        </Row>
      </div>
    </Card>
  )
}

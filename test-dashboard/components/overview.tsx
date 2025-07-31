import { Alert, Card, Col, Progress, Row, Spin, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { ClusterMetrics, getClusterMetrics } from "../api";
import { LoadingOutlined } from '@ant-design/icons';

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
        setError('Failed to fetch cluster metrics. Please check your connection and try again.');
        console.error('Error fetching cluster metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <Card 
        className={className} 
        {...props} 
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            Cluster Overview
          </Typography.Title>
        } 
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Typography.Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
            Loading cluster metrics...
          </Typography.Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        className={className} 
        {...props} 
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            Cluster Overview
          </Typography.Title>
        } 
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
      >
        <Alert
          message="Error Loading Metrics"
          description={error}
          type="error"
          showIcon
          style={{ borderRadius: 8 }}
        />
      </Card>
    );
  }

  // Extract metrics with fallback values
  const cpuUsage = metrics?.cpuUsage || 0;
  const memoryUsage = metrics?.memoryUsage || 0;
  const storageUsage = metrics?.storageUsage || 0;
  const networkUsage = metrics?.networkUsage || 0;
  const nodeCount = metrics?.totalNodes || 0;
  const readyNodes = metrics?.readyNodes || 0;
  const podCount = metrics?.totalPods || 0;
  const runningPods = metrics?.runningPods || 0;

  // Helper function to determine progress color based on usage
  const getProgressColor = (usage: number) => {
    if (usage > 90) return '#ff4d4f'; // red for high usage
    if (usage > 70) return '#faad14'; // orange for medium-high usage
    return '#52c41a'; // green for normal usage
  };

  return (
    <Card 
      className={className} 
      {...props} 
      title={
        <Typography.Title level={4} style={{ margin: 0 }}>
          Cluster Overview
        </Typography.Title>
      } 
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Resource utilization across your Kubernetes cluster
      </Typography.Text>
      
      <div style={{ marginBottom: 32 }}>
        {/* Resource Utilization Section */}
        <Typography.Title level={5} style={{ marginBottom: 16, color: '#444' }}>
          Resource Utilization
        </Typography.Title>
        
        {['CPU', 'Memory', 'Storage', 'Network'].map((resource) => {
          const value = {
            'CPU': cpuUsage,
            'Memory': memoryUsage,
            'Storage': storageUsage,
            'Network': networkUsage
          }[resource];
          
          return (
            <Row gutter={[16, 16]} align="middle" key={resource} style={{ marginBottom: 12 }}>
              <Col span={4} style={{ textAlign: "right" }}>
                <Typography.Text strong>{resource}</Typography.Text>
              </Col>
              <Col span={16}>
                <Progress 
                  percent={Math.round(value)} 
                  strokeColor={getProgressColor(value)}
                  trailColor="#f0f0f0"
                  strokeLinecap="round"
                  showInfo={false} 
                />
              </Col>
              <Col span={4}>
                <Typography.Text 
                  strong 
                  style={{ 
                    color: getProgressColor(value),
                    fontSize: 14
                  }}
                >
                  {Math.round(value)}%
                </Typography.Text>
              </Col>
            </Row>
          );
        })}
      </div>

      {/* Nodes and Pods Summary Section */}
      <Row gutter={24}>
        <Col span={12}>
          <Card 
            bordered={false} 
            style={{ 
              borderRadius: 8,
              background: '#f9f9f9',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Typography.Title level={5} style={{ marginBottom: 16}}>
              Nodes Summary
            </Typography.Title>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Col>
                <Typography.Text type="secondary">Total Nodes</Typography.Text>
              </Col>
              <Col>
                <Typography.Text strong style={{ fontSize: 16 }}>{nodeCount}</Typography.Text>
              </Col>
            </Row>
            <Row justify="space-between">
              <Col>
                <Typography.Text type="secondary">Ready Nodes</Typography.Text>
              </Col>
              <Col>
                <Typography.Text 
                  strong 
                  style={{ 
                    fontSize: 18,
                  }}
                >
                  {readyNodes}
                </Typography.Text>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            bordered={false} 
            style={{ 
              borderRadius: 8,
              background: '#f9f9f9',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Typography.Title level={5} style={{ marginBottom: 16, color: '#444' }}>
              Pods Summary
            </Typography.Title>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Col>
                <Typography.Text type="secondary">Total Pods</Typography.Text>
              </Col>
              <Col>
                <Typography.Text strong style={{ fontSize: 16 }}>{podCount}</Typography.Text>
              </Col>
            </Row>
            <Row justify="space-between">
              <Col>
                <Typography.Text type="secondary">Running Pods</Typography.Text>
              </Col>
              <Col>
                <Typography.Text 
                  strong 
                  style={{ 
                    fontSize: 18,
                  }}
                >
                  {runningPods}
                </Typography.Text>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
import {
  BranchesOutlined,
  CheckCircleTwoTone,
  ClockCircleOutlined,
  ExclamationCircleTwoTone,
  SyncOutlined
} from "@ant-design/icons"
import { Card, Space, Typography } from "antd"
import React from "react"

interface RecentActivityProps extends React.HTMLAttributes<HTMLDivElement> { }

export function RecentActivity({ className, ...props }: RecentActivityProps) {
  return (
    <Card className={className} {...props} title="Recent Activity" bordered>
      <Typography.Text type="secondary">
        Latest events and operations in your cluster
      </Typography.Text>
      <div style={{ marginTop: 24 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space align="start" size="middle">
            <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 20, marginTop: 2 }} />
            <div>
              <Typography.Text strong>CloneSet web-frontend scaled successfully</Typography.Text>
              <br />
              <Typography.Text type="secondary">Replicas: 3 → 5</Typography.Text>
              <br />
              <Space size="small">
                <ClockCircleOutlined style={{ fontSize: 12 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>2 minutes ago</Typography.Text>
              </Space>
            </div>
          </Space>
          <Space align="start" size="middle">
            <SyncOutlined spin style={{ color: "#1890ff", fontSize: 20, marginTop: 2 }} />
            <div>
              <Typography.Text strong>In-place update of database-sidecar containers</Typography.Text>
              <br />
              <Typography.Text type="secondary">Updated 12 containers across 6 pods</Typography.Text>
              <br />
              <Space size="small">
                <ClockCircleOutlined style={{ fontSize: 12 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>15 minutes ago</Typography.Text>
              </Space>
            </div>
          </Space>
          <Space align="start" size="middle">
            <ExclamationCircleTwoTone twoToneColor="#faad14" style={{ fontSize: 20, marginTop: 2 }} />
            <div>
              <Typography.Text strong>PodUnavailableBudget triggered for api-service</Typography.Text>
              <br />
              <Typography.Text type="secondary">Prevented eviction of 2 pods to maintain availability</Typography.Text>
              <br />
              <Space size="small">
                <ClockCircleOutlined style={{ fontSize: 12 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>45 minutes ago</Typography.Text>
              </Space>
            </div>
          </Space>
          <Space align="start" size="middle">
            <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 20, marginTop: 2 }} />
            <div>
              <Typography.Text strong>BroadcastJob image-pull completed</Typography.Text>
              <br />
              <Typography.Text type="secondary">Successfully pulled images on all 12 nodes</Typography.Text>
              <br />
              <Space size="small">
                <ClockCircleOutlined style={{ fontSize: 12 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>1 hour ago</Typography.Text>
              </Space>
            </div>
          </Space>
          <Space align="start" size="middle">
            <BranchesOutlined style={{ color: "#1890ff", fontSize: 20, marginTop: 2 }} />
            <div>
              <Typography.Text strong>Canary rollout progressed to next batch</Typography.Text>
              <br />
              <Typography.Text type="secondary">frontend-canary traffic split: 70% stable, 30% canary</Typography.Text>
              <br />
              <Space size="small">
                <ClockCircleOutlined style={{ fontSize: 12 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>30 minutes ago</Typography.Text>
              </Space>
            </div>
          </Space>
        </Space>
      </div>
    </Card>
  )
}

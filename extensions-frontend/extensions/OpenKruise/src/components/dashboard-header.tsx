import { PlusCircleOutlined } from "@ant-design/icons"
import { Button, Space, Typography } from "antd"
import React from "react"

interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
}

export function DashboardHeader({ heading, text, children }: DashboardHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
      <div style={{ display: "grid", gap: 4 }}>
        <Typography.Title level={1} style={{ margin: 0, fontSize: 32 }}>{heading}</Typography.Title>
        {text && <Typography.Text type="secondary" style={{ fontSize: 18 }}>{text}</Typography.Text>}
      </div>
      <Space>
        <Button type="primary" icon={<PlusCircleOutlined />}>
          Create Resource
        </Button>
      </Space>
      {children}
    </div>
  )
}

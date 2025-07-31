import { Layout } from "antd"
import React from "react"

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> { }

export function DashboardShell({ children, ...props }: DashboardShellProps) {
  return (
    <Layout.Content style={{ padding: 24, minHeight: 280 }} {...props}>
      {children}
    </Layout.Content>
  )
}

import type React from "react"
interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DashboardShell({ children, ...props }: DashboardShellProps) {
  return (
    <div className="grid gap-8" {...props}>
      {children}
    </div>
  )
}

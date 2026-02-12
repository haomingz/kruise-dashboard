import type React from "react"
interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DashboardShell({ children, ...props }: DashboardShellProps) {
  return (
    <div className="grid gap-4 sm:gap-6 min-w-0" {...props}>
      {children}
    </div>
  )
}

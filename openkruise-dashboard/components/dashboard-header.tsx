import type React from "react"

interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
}

export function DashboardHeader({ heading, text, children }: Readonly<DashboardHeaderProps>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
      <div className="grid gap-0.5 min-w-0">
        <h1 className="font-semibold text-xl sm:text-2xl tracking-tight truncate">{heading}</h1>
        {text && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">{text}</p>}
      </div>
      {children != null && <div className="shrink-0">{children}</div>}
    </div>
  )
}

"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Boxes } from "lucide-react"

export function MainNav({ className, ...props }: Readonly<React.HTMLAttributes<HTMLElement>>) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex items-center gap-2 sm:space-x-4 lg:space-x-6 min-w-0", className)} {...props}>
      <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl shrink-0 min-w-0">
        <Boxes className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" aria-hidden="true" />
        <span className="truncate">OpenKruise</span>
      </Link>
      <Link
        href="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary hidden sm:block",
          pathname === "/" ? "text-foreground" : "text-muted-foreground"
        )}
      >
        Dashboard
      </Link>
      <Link
        href="/rollouts"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary hidden sm:block",
          pathname.startsWith("/rollouts") ? "text-foreground" : "text-muted-foreground"
        )}
      >
        Rollouts
      </Link>
    </nav>
  )
}

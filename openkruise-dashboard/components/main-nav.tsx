import type React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Boxes } from "lucide-react"

export function MainNav({ className, ...props }: Readonly<React.HTMLAttributes<HTMLElement>>) {
  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
        <Boxes className="h-6 w-6" aria-hidden="true" />
        <span>OpenKruise</span>
      </Link>
    </nav>
  )
}

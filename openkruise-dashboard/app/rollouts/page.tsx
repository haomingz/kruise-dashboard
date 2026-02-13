import { Suspense } from "react"
import { RolloutsPage } from "@/components/rollouts-page"

export default function RolloutsListPage() {
  return (
    <Suspense>
      <RolloutsPage />
    </Suspense>
  )
}

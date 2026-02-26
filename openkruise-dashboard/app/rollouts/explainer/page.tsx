import { Suspense } from "react"
import { RolloutExplainerPage } from "@/components/rollout-explainer-page"

export default function RolloutsExplainerPageRoute() {
  return (
    <Suspense>
      <RolloutExplainerPage />
    </Suspense>
  )
}

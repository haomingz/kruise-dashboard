"use client"

import useSWR from "swr"
import { getRolloutAnalysis } from "../api/rollout"

const ANALYSIS_REFRESH_INTERVAL = 30000

export function useRolloutAnalysis(namespace: string, name: string, enabled = true) {
  return useSWR(
    enabled && namespace && name ? `rollout-analysis-${namespace}-${name}` : null,
    () => getRolloutAnalysis(namespace, name),
    {
      refreshInterval: ANALYSIS_REFRESH_INTERVAL,
      revalidateOnFocus: false,
    },
  )
}

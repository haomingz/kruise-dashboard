import useSWR from 'swr'
import { getClusterMetrics } from '../api/cluster'

const REFRESH_INTERVAL = 30000

export function useClusterMetrics() {
  return useSWR(
    'cluster-metrics',
    () => getClusterMetrics(),
    { refreshInterval: REFRESH_INTERVAL }
  )
}

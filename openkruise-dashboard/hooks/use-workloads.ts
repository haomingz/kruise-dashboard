import useSWR from 'swr'
import { getWorkloadWithPods, listAllWorkloads } from '../api/workload'
import { useNamespace } from './use-namespace'

const REFRESH_INTERVAL = 30000

export function useAllWorkloads(namespaceOverride?: string) {
  const { namespace: contextNamespace } = useNamespace()
  const ns = namespaceOverride || contextNamespace
  return useSWR(
    `workloads-${ns}`,
    () => listAllWorkloads(ns),
    { refreshInterval: REFRESH_INTERVAL }
  )
}

export function useWorkloadWithPods(namespace: string, type: string, name: string) {
  return useSWR(
    namespace && type && name ? `workload-pods-${namespace}-${type}-${name}` : null,
    () => getWorkloadWithPods(namespace, type, name)
  )
}

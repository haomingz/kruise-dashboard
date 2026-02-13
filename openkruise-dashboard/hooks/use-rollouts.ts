import useSWR from 'swr'
import { getRollout, getRolloutHistory, getRolloutPods, listActiveRollouts, listAllRollouts } from '../api/rollout'
import { useNamespace } from './use-namespace'

const REFRESH_INTERVAL = 30000
const DETAIL_REFRESH_INTERVAL = 10000

interface UseRolloutsOptions {
  refreshInterval?: number
}

export function useActiveRollouts(namespaceOverride?: string, options?: UseRolloutsOptions) {
  const { namespace: contextNamespace } = useNamespace()
  const ns = namespaceOverride || contextNamespace
  return useSWR(
    `active-rollouts-${ns}`,
    () => listActiveRollouts(ns).catch(() => []),
    { refreshInterval: options?.refreshInterval ?? REFRESH_INTERVAL }
  )
}

export function useAllRollouts(namespaceOverride?: string, options?: UseRolloutsOptions) {
  const { namespace: contextNamespace } = useNamespace()
  const ns = namespaceOverride || contextNamespace
  return useSWR(
    `all-rollouts-${ns}`,
    () => listAllRollouts(ns),
    { refreshInterval: options?.refreshInterval ?? REFRESH_INTERVAL }
  )
}

export function useRollout(namespace: string, name: string, options?: UseRolloutsOptions) {
  return useSWR(
    namespace && name ? `rollout-${namespace}-${name}` : null,
    () => getRollout(namespace, name),
    { refreshInterval: options?.refreshInterval ?? DETAIL_REFRESH_INTERVAL }
  )
}

export function useRolloutHistory(namespace: string, name: string) {
  return useSWR(
    namespace && name ? `rollout-history-${namespace}-${name}` : null,
    () => getRolloutHistory(namespace, name),
    { refreshInterval: REFRESH_INTERVAL }
  )
}

export function useRolloutPods(namespace: string, name: string, options?: UseRolloutsOptions) {
  return useSWR(
    namespace && name ? `rollout-pods-${namespace}-${name}` : null,
    () => getRolloutPods(namespace, name),
    { refreshInterval: options?.refreshInterval ?? DETAIL_REFRESH_INTERVAL }
  )
}

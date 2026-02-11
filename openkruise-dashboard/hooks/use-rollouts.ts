import useSWR from 'swr'
import { getRollout, listActiveRollouts } from '../api/rollout'
import { useNamespace } from './use-namespace'

const REFRESH_INTERVAL = 30000

export function useActiveRollouts(namespaceOverride?: string) {
  const { namespace: contextNamespace } = useNamespace()
  const ns = namespaceOverride || contextNamespace
  return useSWR(
    `active-rollouts-${ns}`,
    () => listActiveRollouts(ns).catch(() => []),
    { refreshInterval: REFRESH_INTERVAL }
  )
}

export function useRollout(namespace: string, name: string) {
  return useSWR(
    namespace && name ? `rollout-${namespace}-${name}` : null,
    () => getRollout(namespace, name)
  )
}

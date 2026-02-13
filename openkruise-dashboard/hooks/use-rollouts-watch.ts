"use client"

import { useEffect, useState } from "react"
import { useSWRConfig } from "swr"
import { watchRollout, watchRollouts, type RolloutWatchEvent } from "../api/rollout"

interface UseRolloutsWatchOptions {
  namespace: string
  name?: string
  enabled?: boolean
  onFallback?: () => void
}

interface UseRolloutsWatchState {
  isConnected: boolean
  fallbackPolling: boolean
  failures: number
  lastError: string | null
}

function getRolloutMeta(rollout: Record<string, unknown> | null): { name: string; namespace: string } {
  if (!rollout) {
    return { name: "", namespace: "" }
  }
  const metadata = (rollout.metadata || {}) as Record<string, unknown>
  return {
    name: String(metadata.name || ""),
    namespace: String(metadata.namespace || ""),
  }
}

function upsertRolloutList(
  currentData: unknown,
  event: RolloutWatchEvent,
): { rollouts: Record<string, unknown>[]; total: number; namespace: string } {
  const current = (currentData || {}) as { rollouts?: Record<string, unknown>[]; total?: number; namespace?: string }
  const existingRollouts = [...(current.rollouts || [])]
  if (!event.rollout) {
    return {
      rollouts: existingRollouts,
      total: existingRollouts.length,
      namespace: current.namespace || event.namespace,
    }
  }

  const rolloutMeta = getRolloutMeta(event.rollout)
  const rolloutName = rolloutMeta.name || event.name
  const rolloutNamespace = rolloutMeta.namespace || event.namespace
  const next = existingRollouts.filter((item) => {
    const metadata = (item.metadata || {}) as Record<string, unknown>
    return !(String(metadata.name || "") === rolloutName && String(metadata.namespace || "") === rolloutNamespace)
  })
  next.push(event.rollout)
  return {
    rollouts: next,
    total: next.length,
    namespace: current.namespace || event.namespace,
  }
}

function removeRolloutFromList(
  currentData: unknown,
  event: RolloutWatchEvent,
): { rollouts: Record<string, unknown>[]; total: number; namespace: string } {
  const current = (currentData || {}) as { rollouts?: Record<string, unknown>[]; total?: number; namespace?: string }
  const existingRollouts = [...(current.rollouts || [])]
  const next = existingRollouts.filter((item) => {
    const metadata = (item.metadata || {}) as Record<string, unknown>
    return !(String(metadata.name || "") === event.name && String(metadata.namespace || "") === event.namespace)
  })
  return {
    rollouts: next,
    total: next.length,
    namespace: current.namespace || event.namespace,
  }
}

export function useRolloutsWatch({
  namespace,
  name,
  enabled = true,
  onFallback,
}: Readonly<UseRolloutsWatchOptions>): UseRolloutsWatchState {
  const { mutate } = useSWRConfig()
  const [isConnected, setIsConnected] = useState(false)
  const [connectedTarget, setConnectedTarget] = useState<string | null>(null)
  const [fallbackPolling, setFallbackPolling] = useState(!enabled)
  const [failures, setFailures] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const targetKey = `${namespace}/${name || "*"}`
  const watchDisabled = !enabled || !namespace

  useEffect(() => {
    if (watchDisabled) {
      return
    }

    const handleEvent = (eventType: string, event: RolloutWatchEvent) => {
      if (eventType === "heartbeat") {
        return
      }

      if (event.rollout) {
        const meta = getRolloutMeta(event.rollout)
        const eventName = event.name || meta.name
        const eventNamespace = event.namespace || meta.namespace
        if (eventName) {
          void mutate(`rollout-${eventNamespace}-${eventName}`, event.rollout, false)
          void mutate(`rollout-pods-${eventNamespace}-${eventName}`, undefined, { revalidate: true })
        }
      }

      if (!name) {
        if (eventType === "delete") {
          void mutate(`all-rollouts-${namespace}`, (current: unknown) => removeRolloutFromList(current, event), false)
          return
        }
        if (eventType === "snapshot" || eventType === "upsert") {
          void mutate(`all-rollouts-${namespace}`, (current: unknown) => upsertRolloutList(current, event), false)
        }
      }
    }

    const handleFallback = () => {
      setIsConnected(false)
      setConnectedTarget(null)
      setFallbackPolling(true)
      onFallback?.()
    }

    const client = name
      ? watchRollout(namespace, name, {
          onOpen: () => {
            setConnectedTarget(targetKey)
            setIsConnected(true)
            setFallbackPolling(false)
            setFailures(0)
            setLastError(null)
          },
          onEvent: handleEvent,
          onReconnectAttempt: (attempt) => {
            setConnectedTarget(null)
            setIsConnected(false)
            setFailures(attempt)
          },
          onError: (err) => {
            setLastError(err.message)
          },
          onFallback: () => handleFallback(),
        })
      : watchRollouts(namespace, {
          onOpen: () => {
            setConnectedTarget(targetKey)
            setIsConnected(true)
            setFallbackPolling(false)
            setFailures(0)
            setLastError(null)
          },
          onEvent: handleEvent,
          onReconnectAttempt: (attempt) => {
            setConnectedTarget(null)
            setIsConnected(false)
            setFailures(attempt)
          },
          onError: (err) => {
            setLastError(err.message)
          },
          onFallback: () => handleFallback(),
        })

    return () => {
      client.close()
    }
  }, [watchDisabled, mutate, name, namespace, onFallback, targetKey])

  return {
    isConnected: !watchDisabled && isConnected && connectedTarget === targetKey,
    fallbackPolling: watchDisabled || fallbackPolling || connectedTarget !== targetKey,
    failures,
    lastError,
  }
}

"use client"

import type { RolloutWatchEvent } from "../api/rollout"

export interface RolloutWatchClientHandlers {
  onOpen?: () => void
  onEvent?: (eventType: string, event: RolloutWatchEvent) => void
  onError?: (error: Error) => void
  onReconnectAttempt?: (attempt: number, delayMs: number) => void
  onFallback?: (error: Error) => void
}

export interface RolloutWatchClient {
  close: () => void
}

const WATCH_RETRY_STEPS_MS = [1000, 2000, 5000, 10000] as const
const WATCH_MAX_FAILURES = 5
const WATCH_EVENT_TYPES = ["snapshot", "upsert", "delete", "error", "heartbeat"] as const

function parseWatchEvent(raw: MessageEvent): RolloutWatchEvent | null {
  try {
    return JSON.parse(raw.data) as RolloutWatchEvent
  } catch {
    return null
  }
}

export function createRolloutWatchClient(url: string, handlers: RolloutWatchClientHandlers): RolloutWatchClient {
  let source: EventSource | null = null
  let closed = false
  let failures = 0

  const scheduleReconnect = () => {
    if (closed) {
      return
    }
    if (failures >= WATCH_MAX_FAILURES) {
      handlers.onFallback?.(new Error("watch stream unavailable, fallback to polling"))
      return
    }
    const index = Math.min(failures - 1, WATCH_RETRY_STEPS_MS.length - 1)
    const delayMs: number = WATCH_RETRY_STEPS_MS[index] ?? 10000
    handlers.onReconnectAttempt?.(failures, delayMs)
    window.setTimeout(connect, delayMs)
  }

  const connect = () => {
    if (closed) {
      return
    }

    source = new EventSource(url)

    source.onopen = () => {
      failures = 0
      handlers.onOpen?.()
    }

    for (const eventType of WATCH_EVENT_TYPES) {
      source.addEventListener(eventType, (event) => {
        const parsed = parseWatchEvent(event as MessageEvent)
        if (!parsed) {
          return
        }
        handlers.onEvent?.(eventType, parsed)
        if (eventType === "error") {
          handlers.onError?.(new Error(parsed.message || "watch stream error event"))
        }
      })
    }

    source.onerror = () => {
      if (closed) {
        return
      }
      failures += 1
      handlers.onError?.(new Error(`watch stream disconnected (${failures})`))
      source?.close()
      source = null
      scheduleReconnect()
    }
  }

  connect()

  return {
    close: () => {
      closed = true
      source?.close()
      source = null
    },
  }
}
